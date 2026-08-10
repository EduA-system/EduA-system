import type { ContentBlock, LayoutSlot, SlideLayoutInput } from "./types";

export function blockText(block: ContentBlock): string {
  switch (block.kind) {
    case "text": return block.text;
    case "visual": return block.description;
    case "molecule": return block.chemicalRequest;
    case "periodic": return [block.periodicRequest, ...(block.elementSymbols ?? []), block.focus ?? ""].join(" ");
    case "physics": return block.physicsRequest;
    case "comparison": return [
      ...block.items.map((item) => item.label),
      ...block.criteria.map((item) => item.label),
      ...block.values.flat(),
    ].join(" ");
    case "table": return [...block.columns.map((column) => column.label), ...block.rows.flatMap((row) => row.cells)].join(" ");
    case "sequence": return block.steps.map((step) => `${step.label ?? ""} ${step.text}`).join(" ");
    case "formula": return `${block.expression} ${block.explanation ?? ""}`;
    case "quiz": return [block.question, ...(block.choices ?? []), block.answer ?? "", block.explanation ?? ""].join(" ");
  }
}

export function deriveDensity(blocks: ContentBlock[]): SlideLayoutInput["density"] {
  const demand = blocks.reduce((sum, block) => sum + blockText(block).length + (block.kind === "table" || block.kind === "comparison" ? 100 : 0), 0);
  return demand < 180 ? "sparse" : demand > 620 ? "dense" : "normal";
}

export function capacity(rect: { w: number; h: number }, fontSize: number): { maxChars: number; maxLines: number } {
  const maxLines = Math.max(1, Math.floor(rect.h / (fontSize * 1.25)));
  const charsPerLine = Math.max(4, Math.floor(rect.w / (fontSize * 0.56)));
  return { maxLines, maxChars: maxLines * charsPerLine };
}

export function slotNearCapacity(slot: LayoutSlot): boolean {
  return slot.kind === "text" && slot.maxChars > 0 && slot.sourceText.length > slot.maxChars * 0.85;
}

