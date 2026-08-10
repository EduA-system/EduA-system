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
  VisualContentBlock,
} from "./types";

type Candidate = Pick<SlideLayoutResult, "topology" | "structures" | "slots" | "warnings" | "score">;

const fontByToken: Record<string, number> = {
  "text-hero": 30,
  "text-section-hero": 56,
  "text-section-body": 20,
  "text-body": 16,
  "text-caption": 12,
  "text-formula": 24,
  "text-cell": 11,
};

/** Illustrations must remain a legible visual anchor, never a thumbnail-sized card. */
const MIN_VISUAL_WIDTH_RATIO = 0.35;
const MIN_VISUAL_HEIGHT_RATIO = 0.45;

/** Khoảng hở giữa đáy tiêu đề và mép trên sân khấu mô phỏng. */
const PHYSICS_STAGE_GAP = 14;

/** Visual blocks occupy an aside-sized media slot. */
function isVisualLikeKind(kind: ContentBlock["kind"]): boolean {
  return kind === "visual" || kind === "molecule" || kind === "periodic" || kind === "physics";
}

function slotKindFor(kind: ContentBlock["kind"]): LayoutSlot["kind"] {
  if (kind === "visual") return "image";
  if (kind === "molecule") return "molecule";
  if (kind === "periodic") return "periodic";
  if (kind === "physics") return "physics";
  return "text";
}

/** Slot chiếm chỗ như một khối hình, không phải một dòng chữ. */
function isVisualLikeSlot(kind: LayoutSlot["kind"]): boolean {
  return kind === "image" || kind === "molecule" || kind === "periodic" || kind === "physics";
}

/**
 * Slot mô phỏng được phép tràn ra ngoài `contentBounds` — nó là sân khấu chiếm
 * trọn bề ngang canvas, không phải một khối nội dung nằm trong lề slide.
 */
function slotMayBleed(kind: LayoutSlot["kind"]): boolean {
  return kind === "physics";
}

/** Keep illustration crops useful: neither a banner nor a thin portrait strip. */
function balancedImageRect(rect: Rect): Rect {
  const ratio = rect.w / rect.h;
  const minRatio = 0.75;
  const maxRatio = 1.5;
  if (ratio >= minRatio && ratio <= maxRatio) return rect;
  if (ratio > maxRatio) {
    const w = Math.round(rect.h * maxRatio);
    return { ...rect, x: rect.x + Math.round((rect.w - w) / 2), w };
  }
  const h = Math.round(rect.w / minRatio);
  return { ...rect, y: rect.y + Math.round((rect.h - h) / 2), h };
}

function makeSlot(
  block: ContentBlock,
  rect: Rect,
  zone: LayoutSlot["zone"],
  sourceText = blockText(block),
  sourcePartId?: string,
  token = zone === "hero" ? "text-hero" : zone === "formula" ? "text-formula" : zone === "caption" ? "text-caption" : "text-body",
): LayoutSlot {
  // Mô phỏng KHÔNG qua `balancedImageRect`: nó không phải khung cắt ảnh mà là
  // một giao diện ngang (cảnh bên trái, bảng tham số bên phải), ép về gần vuông
  // là bóp mất chỗ của cảnh.
  const fittedRect = isVisualLikeKind(block.kind) && block.kind !== "physics" ? balancedImageRect(rect) : rect;
  const limits = capacity(fittedRect, fontByToken[token] ?? 18);
  return {
    id: `slot:${block.id}${sourcePartId ? `:${sourcePartId}` : ""}`,
    sourceBlockId: block.id,
    sourcePartId,
    sourceText,
    zone,
    kind: slotKindFor(block.kind),
    rect: fittedRect,
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

function genericSlots(
  blocks: ContentBlock[],
  rect: Rect,
  vertical: boolean,
  forcedColumns?: number,
): { slots: LayoutSlot[]; structures: LayoutStructure[] } {
  if (!blocks.length) return { slots: [], structures: [] };
  const columns = forcedColumns ?? (vertical ? 1 : blocks.length);
  const rows = Math.ceil(blocks.length / columns);
  const cells = grid(rect, rows, columns, 14);
  return {
    slots: blocks.map((block, index) => makeSlot(block, inset(cells[index], 12), isVisualLikeKind(block.kind) ? "aside" : block.kind === "formula" ? "formula" : "body")),
    structures: blocks.map((block, index) => structure(`card:${block.id}`, "card", cells[index])),
  };
}

/**
 * Sparse explanatory slides need a visual anchor. The generated block is
 * intentionally optional, so it never replaces source content or affects the
 * outline contract.
 */
function supportingVisualFor(input: SlideLayoutInput, title: ContentBlock, rest: ContentBlock[]): VisualContentBlock | null {
  const ineligibleFamilies = new Set(["intro", "section", "comparison", "table", "process", "formula", "exercise", "quiz"]);
  const textOnly = rest.every((block) => block.kind === "text");
  const bodyText = rest.map(blockText).join(" ").trim();
  if (ineligibleFamilies.has(input.slideType) || !rest.length || rest.length > 2 || !textOnly || bodyText.length > 220) return null;

  return {
    id: `${title.id}:supporting-visual`,
    kind: "visual",
    role: "visual",
    semanticType: "image",
    priority: "supporting",
    required: false,
    description: `Educational illustration for "${blockText(title)}". Context: ${bodyText}`,
    requirement: "optional",
    preferredAspectRatio: "square",
    illustratesBlockId: rest[0].id,
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
    return { slots, structures: [structure(`quiz:${block.id}`, "card", rect, "surface-question")] };
  }
  if (block.kind === "formula") {
    const [formula, explanation] = splitVertical(rect, block.explanation ? 0.58 : 1, block.explanation ? 12 : 0);
    const slots = [makeSlot(block, formula, "formula", block.expression, "expression")];
    if (block.explanation) slots.push(makeSlot(block, explanation, "body", block.explanation, "explanation"));
    return { slots, structures: [structure(`formula:${block.id}`, "card", rect, "surface-formula")] };
  }
  return { slots: [makeSlot(block, rect, isVisualLikeKind(block.kind) ? "aside" : "body")], structures: [] };
}

function buildCandidate(input: SlideLayoutInput, seed: number, index: number): Candidate {
  const random = mulberry32((seed + Math.imul(index + 1, 0x9e3779b1)) >>> 0);
  const { title, rest, titleRect, body, bounds } = titleAndBody(input);
  const autoVisual = supportingVisualFor(input, title, rest);
  const contentBlocks = autoVisual ? [...rest, autoVisual] : rest;
  const structures: LayoutStructure[] = [];
  const slots: LayoutSlot[] = [makeSlot(title, titleRect, "hero", blockText(title))];
  const horizontal = random() >= 0.5;
  const ratio = 0.42 + random() * 0.16;
  let topology = "stack";
  /** Block bị bỏ khỏi bố cục có chủ đích — không tính vào ràng buộc `required`. */
  const omitted = new Set<string>();

  const physics = contentBlocks.find((block) => block.kind === "physics");

  if (physics) {
    /**
     * Slide có thí nghiệm tương tác dành trọn phần thân cho mô phỏng: tiêu đề ở
     * trên, mô phỏng tràn sát mép trái/phải/đáy canvas.
     *
     * Không xếp nó như một ảnh minh hoạ cạnh cột chữ: mỗi experiment trong
     * `components/simulations/` là một giao diện ngang tự đủ (cảnh + bảng tham
     * số + mô tả), vốn dựng cho cả màn hình ở `/mo-phong-vat-ly`. Nhồi vào nửa
     * slide thì bảng tham số nuốt hết chỗ của cảnh.
     *
     * Chữ đi kèm bị bỏ vì lý do tương tự — thí nghiệm đã tự mang tiêu đề và
     * đoạn giải thích bên trong. Prompt outline cũng đã dặn AI đừng sinh thêm;
     * chỗ này chỉ là chốt chặn khi AI vẫn sinh.
     */
    topology = "physics-stage";
    for (const block of contentBlocks) if (block !== physics) omitted.add(block.id);
    const stageTop = titleRect.y + titleRect.h + PHYSICS_STAGE_GAP;
    slots.push(makeSlot(physics, {
      x: 0,
      y: stageTop,
      w: input.canvas.width,
      h: input.canvas.height - stageTop,
    }, "aside"));
  } else if (input.slideType === "intro" || input.slideType === "section") {
    topology = "section-opener-centered";
    const heroRect = { x: bounds.x + 90, y: bounds.y + 130, w: bounds.w - 180, h: 150 };
    slots[0].rect = heroRect;
    slots[0].defaultStyleToken = "text-section-hero";
    const contentTop = heroRect.y + heroRect.h + 18;
    const contentRect = { x: bounds.x + 180, y: contentTop, w: bounds.w - 360, h: Math.max(72, bounds.y + bounds.h - contentTop - 36) };
    const contentCells = grid(contentRect, Math.max(1, contentBlocks.length), 1, 10);
    slots.push(...contentBlocks.map((block, index) => makeSlot(
      block,
      inset(contentCells[index], 8),
      isVisualLikeKind(block.kind) ? "aside" : block.kind === "formula" ? "formula" : "body",
      blockText(block),
      undefined,
      "text-section-body",
    )));
  } else if (input.slideType === "text-image" || input.slideType === "experiment" || contentBlocks.some((block) => isVisualLikeKind(block.kind))) {
    topology = horizontal ? "split-left" : "split-right";
    const [left, right] = splitHorizontal(body, ratio, 20);
    const visual = contentBlocks.find((block) => isVisualLikeKind(block.kind));
    const text = contentBlocks.filter((block) => block !== visual);
    const visualRect = horizontal ? right : left;
    const textRect = horizontal ? left : right;
    if (visual) slots.push(makeSlot(visual, visualRect, "aside"));
    const generic = genericSlots(text, textRect, true);
    slots.push(...generic.slots); structures.push(...generic.structures);
    if (visual) structures.push(structure(`visual:${visual.id}`, "panel", visualRect, "surface-visual"));
  } else if (input.slideType === "comparison" || input.slideType === "table") {
    const block = contentBlocks.find((item) => item.kind === "comparison" || item.kind === "table");
    topology = block?.kind === "comparison" && block.preferredPresentation === "panels" ? "comparison-panels" : "comparison-auto";
    const remaining = contentBlocks.filter((item) => item !== block);
    // Keep any supporting note below the table instead of overlaying its last row.
    const [tableRect, footerRect] = remaining.length
      ? splitVertical(body, (body.h - 64 - 12) / (body.h - 12), 12)
      : [body, null];
    if (block) {
      const composite = compositeSlots(block, tableRect, horizontal ? "horizontal" : "vertical");
      slots.push(...composite.slots); structures.push(...composite.structures);
    }
    if (remaining.length && footerRect) {
      const extra = genericSlots(remaining, footerRect, false);
      slots.push(...extra.slots); structures.push(...extra.structures);
    }
  } else if (input.slideType === "process") {
    topology = horizontal ? "process-horizontal" : "process-vertical";
    const sequence = contentBlocks.find((block) => block.kind === "sequence");
    if (sequence) {
      const composite = compositeSlots(sequence, body, horizontal ? "horizontal" : "vertical");
      slots.push(...composite.slots); structures.push(...composite.structures);
    }
  } else if (input.slideType === "formula") {
    topology = "formula-spotlight";
    const formula = contentBlocks.find((block) => block.kind === "formula");
    if (formula) {
      // Mathematical and chemical expressions need horizontal room. Supporting
      // notes are placed below, never in a narrow side column.
      const target = contentBlocks.length > 1 ? splitVertical(body, 0.54, 16)[0] : inset(body, 34);
      const composite = compositeSlots(formula, target, "vertical");
      slots.push(...composite.slots); structures.push(...composite.structures);
    }
    const other = contentBlocks.filter((block) => block !== formula);
    if (other.length) {
      const [, target] = splitVertical(body, 0.54, 16);
      const generic = genericSlots(other, target, true); slots.push(...generic.slots); structures.push(...generic.structures);
    }
  } else if (input.slideType === "exercise" || input.slideType === "quiz") {
    topology = horizontal ? "question-card" : "question-stack";
    const quiz = contentBlocks.find((block) => block.kind === "quiz");
    if (quiz) {
      const composite = compositeSlots(quiz, inset(body, 12), "vertical"); slots.push(...composite.slots); structures.push(...composite.structures);
    }
  } else {
    topology = input.slideType === "summary" ? (horizontal ? "summary-cards" : "summary-stack") : (horizontal ? "concept-columns" : "concept-stack");
    const textBlockCount = contentBlocks.filter((block) => block.kind === "text").length;
    // Three narrative blocks must never share one row. The AI fills slots after
    // layout generation, so short source text can still become explanatory
    // prose; limiting only currently long source blocks is not sufficient.
    const useTwoColumnGrid = textBlockCount >= 3;
    const generic = genericSlots(contentBlocks, body, !horizontal, useTwoColumnGrid ? 2 : undefined);
    slots.push(...generic.slots); structures.push(...generic.structures);
  }

  const requiredIds = new Set(input.blocks.filter((block) => block.required && !omitted.has(block.id)).map((block) => block.id));
  const represented = new Set(slots.map((slot) => slot.sourceBlockId));
  const visualsAreProminent = slots
    .filter((slot) => isVisualLikeSlot(slot.kind))
    .every((slot) => slot.rect.w >= body.w * MIN_VISUAL_WIDTH_RATIO && slot.rect.h >= body.h * MIN_VISUAL_HEIGHT_RATIO);
  const valid = [...requiredIds].every((id) => represented.has(id))
    && slots.every((slot) => (slotMayBleed(slot.kind) || inside(slot.rect, bounds)) && slot.rect.w >= (isVisualLikeSlot(slot.kind) ? 120 : 42) && slot.rect.h >= 24)
    && visualsAreProminent
    && structures.every((item) => inside(item.rect, bounds));
  const area = slots.reduce((sum, slot) => sum + slot.rect.w * slot.rect.h, 0);
  const coverage = Math.min(100, (area / (bounds.w * bounds.h)) * 100);
  const near = slots.filter(slotNearCapacity).length;
  const semantic = input.slideType === "experiment"
    ? slots.some((slot) => isVisualLikeSlot(slot.kind) && slot.rect.w >= body.w * 0.3) ? 100 : 35
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
    const slots = [makeSlot(title, titleRect, "hero"), ...rest.map((block, index) => makeSlot(block, inset(cells[index], 8), isVisualLikeKind(block.kind) ? "aside" : block.kind === "formula" ? "formula" : "body"))];
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
