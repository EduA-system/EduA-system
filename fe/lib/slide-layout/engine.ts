import { grid, inside, inset, splitHorizontal, splitVertical } from "./geometry";
import { blockText, capacity, slotNearCapacity } from "./metrics";
import { fnv1a, mulberry32 } from "./random";
import type {
  ComparisonContentBlock,
  ContentBlock,
  LayoutSlot,
  LayoutStructure,
  Rect,
  SlideLayoutInput,
  SlideLayoutResult,
  TableContentBlock,
} from "./types";

type Candidate = Pick<SlideLayoutResult, "topology" | "structures" | "slots" | "warnings" | "score">;

const fontByToken: Record<string, number> = {
  "text-hero": 34,
  "text-body": 18,
  "text-caption": 14,
  "text-formula": 28,
  "text-cell": 13,
};

function makeSlot(
  block: ContentBlock,
  rect: Rect,
  zone: LayoutSlot["zone"],
  sourceText = blockText(block),
  sourcePartId?: string,
  token = zone === "hero" ? "text-hero" : zone === "formula" ? "text-formula" : zone === "caption" ? "text-caption" : "text-body",
): LayoutSlot {
  const limits = capacity(rect, fontByToken[token] ?? 18);
  return {
    id: `slot:${block.id}${sourcePartId ? `:${sourcePartId}` : ""}`,
    sourceBlockId: block.id,
    sourcePartId,
    sourceText,
    zone,
    kind: block.kind === "visual" ? "image" : "text",
    rect,
    ...limits,
    contentHint: `${block.semanticType}; ${block.priority}; ${block.required ? "required" : "optional"}`,
    defaultStyleToken: token,
    zIndex: 30,
  };
}

function structure(id: string, kind: LayoutStructure["kind"], rect: Rect, token = "surface-card", extra?: Partial<LayoutStructure>): LayoutStructure {
  return { id, kind, rect, styleToken: token, zIndex: 10, ...extra };
}

function titleAndBody(input: SlideLayoutInput): { title: ContentBlock; rest: ContentBlock[]; titleRect: Rect; body: Rect; bounds: Rect } {
  const top = input.headerMode === "hidden" ? 32 : Math.max(72, input.bodyTop);
  const bounds = { x: 40, y: top, w: 880, h: 540 - top - 32 };
  const title = input.blocks[0];
  const titleHeight = input.slideType === "intro" || input.slideType === "section" ? 112 : 62;
  const [titleRect, body] = splitVertical(bounds, titleHeight / bounds.h, 18);
  return { title, rest: input.blocks.slice(1), titleRect, body, bounds };
}

function genericSlots(blocks: ContentBlock[], rect: Rect, vertical: boolean): { slots: LayoutSlot[]; structures: LayoutStructure[] } {
  if (!blocks.length) return { slots: [], structures: [] };
  const cells = vertical ? grid(rect, blocks.length, 1, 14) : grid(rect, 1, blocks.length, 14);
  return {
    slots: blocks.map((block, index) => makeSlot(block, inset(cells[index], 12), block.kind === "visual" ? "aside" : block.kind === "formula" ? "formula" : "body")),
    structures: cells.map((cell, index) => structure(`card:${blocks[index].id}`, "card", cell)),
  };
}

function tableSlots(block: ComparisonContentBlock | TableContentBlock, rect: Rect): { slots: LayoutSlot[]; structures: LayoutStructure[] } {
  const isComparison = block.kind === "comparison";
  const columns = isComparison ? block.items : block.columns;
  const rowCount = isComparison ? block.criteria.length : block.rows.length;
  const totalRows = rowCount + 1;
  const totalColumns = columns.length + (isComparison ? 1 : 0);
  const cells = grid(rect, totalRows, totalColumns, 0);
  const slots: LayoutSlot[] = [];
  if (isComparison) {
    slots.push(makeSlot(block, inset(cells[0], 6), "caption", "Tiêu chí", "corner", "text-cell"));
    block.items.forEach((item, column) => slots.push(makeSlot(block, inset(cells[column + 1], 6), "caption", item.label, `item:${item.id}`, "text-cell")));
    block.criteria.forEach((criterion, row) => {
      slots.push(makeSlot(block, inset(cells[(row + 1) * totalColumns], 6), "caption", criterion.label, `criterion:${criterion.id}`, "text-cell"));
      block.items.forEach((item, column) => {
        slots.push(makeSlot(block, inset(cells[(row + 1) * totalColumns + column + 1], 6), "body", block.values[row]?.[column] ?? "", `cell:${criterion.id}:${item.id}`, "text-cell"));
      });
    });
  } else {
    block.columns.forEach((column, index) => slots.push(makeSlot(block, inset(cells[index], 6), "caption", column.label, `column:${column.id}`, "text-cell")));
    block.rows.forEach((row, rowIndex) => row.cells.forEach((text, columnIndex) => {
      slots.push(makeSlot(block, inset(cells[(rowIndex + 1) * totalColumns + columnIndex], 6), "body", text, `cell:${row.id}:${block.columns[columnIndex]?.id ?? columnIndex}`, "text-cell"));
    }));
  }
  return {
    slots,
    structures: [structure(`grid:${block.id}`, "table-grid", rect, "surface-table", { rows: totalRows, columns: totalColumns })],
  };
}

function comparisonPanels(block: ComparisonContentBlock, rect: Rect): { slots: LayoutSlot[]; structures: LayoutStructure[] } {
  const panels = grid(rect, 1, block.items.length, 16);
  const slots: LayoutSlot[] = [];
  block.items.forEach((item, index) => {
    const values = block.criteria.map((criterion, row) => `${criterion.label}: ${block.values[row]?.[index] ?? ""}`).join("\n");
    const [head, body] = splitVertical(inset(panels[index], 12), 0.22, 8);
    slots.push(makeSlot(block, head, "caption", item.label, `item:${item.id}`, "text-caption"));
    slots.push(makeSlot(block, body, "body", values, `panel:${item.id}`));
  });
  return { slots, structures: panels.map((panel, index) => structure(`panel:${block.id}:${index}`, "panel", panel)) };
}

function compositeSlots(block: ContentBlock, rect: Rect, orientation: "horizontal" | "vertical"): { slots: LayoutSlot[]; structures: LayoutStructure[] } {
  if (block.kind === "comparison") {
    const cells = (block.criteria.length + 1) * (block.items.length + 1);
    const canTableFit = rect.w / (block.items.length + 1) >= 90 && rect.h / (block.criteria.length + 1) >= 34 && cells <= 36;
    const table = block.preferredPresentation === "table" || (block.preferredPresentation === "auto" && canTableFit);
    return table && canTableFit ? tableSlots(block, rect) : comparisonPanels(block, rect);
  }
  if (block.kind === "table") return tableSlots(block, rect);
  if (block.kind === "sequence") {
    const cells = orientation === "horizontal" ? grid(rect, 1, block.steps.length, 14) : grid(rect, block.steps.length, 1, 12);
    return {
      slots: block.steps.map((step, index) => makeSlot(block, inset(cells[index], 10), "body", `${step.label ? `${step.label}\n` : ""}${step.text}`, `step:${step.id}`)),
      structures: cells.map((cell, index) => structure(`step:${block.id}:${index}`, "card", cell, "surface-step")),
    };
  }
  if (block.kind === "quiz") {
    const [question, details] = splitVertical(rect, block.choices?.length ? 0.38 : 0.62, 12);
    const slots = [makeSlot(block, question, "body", block.question, "question")];
    if (block.choices?.length) slots.push(makeSlot(block, details, "body", block.choices.join("\n"), "choices"));
    if (block.answer) slots.push(makeSlot(block, { x: details.x, y: details.y + details.h - 36, w: details.w, h: 36 }, "caption", block.answer, "answer", "text-caption"));
    return { slots, structures: [structure(`quiz:${block.id}`, "card", rect, "surface-question")] };
  }
  if (block.kind === "formula") {
    const [formula, explanation] = splitVertical(rect, block.explanation ? 0.58 : 1, block.explanation ? 12 : 0);
    const slots = [makeSlot(block, formula, "formula", block.expression, "expression")];
    if (block.explanation) slots.push(makeSlot(block, explanation, "body", block.explanation, "explanation"));
    return { slots, structures: [structure(`formula:${block.id}`, "card", rect, "surface-formula")] };
  }
  return { slots: [makeSlot(block, rect, block.kind === "visual" ? "aside" : "body")], structures: [] };
}

function buildCandidate(input: SlideLayoutInput, seed: number, index: number): Candidate {
  const random = mulberry32((seed + Math.imul(index + 1, 0x9e3779b1)) >>> 0);
  const { title, rest, titleRect, body, bounds } = titleAndBody(input);
  const structures: LayoutStructure[] = [];
  const slots: LayoutSlot[] = [makeSlot(title, titleRect, "hero", blockText(title))];
  const horizontal = random() >= 0.5;
  const ratio = 0.42 + random() * 0.16;
  let topology = "stack";

  if (input.slideType === "intro" || input.slideType === "section") {
    topology = horizontal ? "hero-left" : "hero-centered";
    slots[0].rect = horizontal ? { x: bounds.x + 24, y: bounds.y + 70, w: Math.round(bounds.w * 0.66), h: 130 } : { x: bounds.x + 90, y: bounds.y + 100, w: bounds.w - 180, h: 130 };
    const contentRect = { x: slots[0].rect.x, y: slots[0].rect.y + 150, w: slots[0].rect.w, h: Math.max(80, bounds.y + bounds.h - slots[0].rect.y - 150) };
    const generic = genericSlots(rest, contentRect, true);
    slots.push(...generic.slots); structures.push(...generic.structures);
  } else if (input.slideType === "text-image" || input.slideType === "experiment" || rest.some((block) => block.kind === "visual")) {
    topology = horizontal ? "split-left" : "split-right";
    const [left, right] = splitHorizontal(body, ratio, 20);
    const visual = rest.find((block) => block.kind === "visual");
    const text = rest.filter((block) => block !== visual);
    const visualRect = horizontal ? right : left;
    const textRect = horizontal ? left : right;
    if (visual) slots.push(makeSlot(visual, visualRect, "aside"));
    const generic = genericSlots(text, textRect, true);
    slots.push(...generic.slots); structures.push(...generic.structures);
    if (visual) structures.push(structure(`visual:${visual.id}`, "panel", visualRect, "surface-visual"));
  } else if (input.slideType === "comparison" || input.slideType === "table") {
    const block = rest.find((item) => item.kind === "comparison" || item.kind === "table");
    topology = block?.kind === "comparison" && block.preferredPresentation === "panels" ? "comparison-panels" : "comparison-auto";
    if (block) {
      const composite = compositeSlots(block, body, horizontal ? "horizontal" : "vertical");
      slots.push(...composite.slots); structures.push(...composite.structures);
    }
    const remaining = rest.filter((item) => item !== block);
    if (remaining.length) {
      const extra = genericSlots(remaining, { x: body.x, y: body.y + body.h - 64, w: body.w, h: 64 }, false);
      slots.push(...extra.slots); structures.push(...extra.structures);
    }
  } else if (input.slideType === "process") {
    topology = horizontal ? "process-horizontal" : "process-vertical";
    const sequence = rest.find((block) => block.kind === "sequence");
    if (sequence) {
      const composite = compositeSlots(sequence, body, horizontal ? "horizontal" : "vertical");
      slots.push(...composite.slots); structures.push(...composite.structures);
    }
  } else if (input.slideType === "formula") {
    topology = horizontal ? "formula-split" : "formula-spotlight";
    const formula = rest.find((block) => block.kind === "formula");
    if (formula) {
      const target = horizontal ? splitHorizontal(body, 0.62, 18)[0] : inset(body, 34);
      const composite = compositeSlots(formula, target, "vertical");
      slots.push(...composite.slots); structures.push(...composite.structures);
    }
    const other = rest.filter((block) => block !== formula);
    if (other.length) {
      const target = horizontal ? splitHorizontal(body, 0.62, 18)[1] : { x: body.x + 80, y: body.y + body.h - 82, w: body.w - 160, h: 82 };
      const generic = genericSlots(other, target, true); slots.push(...generic.slots); structures.push(...generic.structures);
    }
  } else if (input.slideType === "exercise" || input.slideType === "quiz") {
    topology = horizontal ? "question-card" : "question-stack";
    const quiz = rest.find((block) => block.kind === "quiz");
    if (quiz) {
      const composite = compositeSlots(quiz, inset(body, 12), "vertical"); slots.push(...composite.slots); structures.push(...composite.structures);
    }
  } else {
    topology = input.slideType === "summary" ? (horizontal ? "summary-cards" : "summary-stack") : (horizontal ? "concept-columns" : "concept-stack");
    const generic = genericSlots(rest, body, !horizontal);
    slots.push(...generic.slots); structures.push(...generic.structures);
  }

  const requiredIds = new Set(input.blocks.filter((block) => block.required).map((block) => block.id));
  const represented = new Set(slots.map((slot) => slot.sourceBlockId));
  const valid = [...requiredIds].every((id) => represented.has(id))
    && slots.every((slot) => inside(slot.rect, bounds) && slot.rect.w >= (slot.kind === "image" ? 120 : 42) && slot.rect.h >= 24)
    && structures.every((item) => inside(item.rect, bounds));
  const area = slots.reduce((sum, slot) => sum + slot.rect.w * slot.rect.h, 0);
  const coverage = Math.min(100, (area / (bounds.w * bounds.h)) * 100);
  const near = slots.filter(slotNearCapacity).length;
  const semantic = input.slideType === "experiment"
    ? slots.some((slot) => slot.kind === "image" && slot.rect.w >= body.w * 0.3) ? 100 : 35
    : 92;
  const score = {
    readability: Math.max(0, 100 - near * 12),
    contentFit: valid ? Math.max(45, 100 - near * 15) : 0,
    visualBalance: 75 + Math.round(20 * (1 - Math.abs(0.5 - ratio))),
    spaceCoverage: coverage,
    semanticMatch: semantic,
    variety: Math.round(random() * 100),
    total: 0,
  };
  score.total = valid ? Math.round(score.readability * 0.24 + score.contentFit * 0.25 + score.visualBalance * 0.14 + score.spaceCoverage * 0.12 + score.semanticMatch * 0.2 + score.variety * 0.05) : -1;
  return {
    topology, structures, slots, score,
    warnings: [
      ...(input.density === "dense" ? [{ code: "DENSE_CONTENT" as const, message: "Nội dung dày; ngân sách chữ chỉ là gợi ý." }] : []),
      ...slots.filter(slotNearCapacity).map((slot) => ({ code: "TEXT_NEAR_CAPACITY" as const, message: "Nội dung nguồn gần sức chứa ước lượng.", blockId: slot.sourceBlockId })),
    ],
  };
}

export function generateSlideLayout(input: SlideLayoutInput): SlideLayoutResult {
  const seed = fnv1a(`${input.deckSeed}|${input.slideId}|${input.runNonce}|${input.algorithmVersion}`);
  const candidates = Array.from({ length: 12 }, (_, index) => buildCandidate(input, seed, index));
  let best = candidates.reduce((current, candidate) => candidate.score.total > current.score.total ? candidate : current);
  const { bounds } = titleAndBody(input);
  if (best.score.total < 0) {
    const { title, rest, titleRect, body } = titleAndBody(input);
    const columns = Math.max(1, Math.ceil(Math.sqrt(rest.length)));
    const rows = Math.max(1, Math.ceil(rest.length / columns));
    const cells = grid(body, rows, columns, 10);
    const structures = rest.map((block, index) => structure(`fallback:${block.id}`, "card", cells[index], "surface-card"));
    const slots = [makeSlot(title, titleRect, "hero"), ...rest.map((block, index) => makeSlot(block, inset(cells[index], 8), block.kind === "visual" ? "aside" : block.kind === "formula" ? "formula" : "body"))];
    best = {
      topology: "dynamic-grid-fallback",
      structures,
      slots,
      score: { total: 40, readability: 45, contentFit: 45, visualBalance: 55, spaceCoverage: 70, semanticMatch: 40, variety: 20 },
      warnings: [{ code: "FALLBACK_TOPOLOGY", message: "Các candidate chính không đạt constraint; đã dùng lưới động." }],
    };
  }
  return {
    schemaVersion: 1,
    slideId: input.slideId,
    algorithmVersion: input.algorithmVersion,
    seed,
    family: input.slideType,
    topology: best.topology,
    headerMode: input.headerMode,
    contentBounds: bounds,
    structures: best.structures,
    slots: best.slots,
    score: best.score,
    warnings: best.warnings,
  };
}
