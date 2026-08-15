import { PLACEHOLDER_IMAGE } from "@/components/slide-editor/lib/be-mapper";
import { makeLatex, makePeriodicSimulation, makeSandboxSimulation, makeSimulation } from "@/components/slide-editor/lib/factory";
import type { ImageElement, LatexElement, LineElement, ShapeElement, SimulationElement, SlideElement, TextElement } from "@/components/slide-editor/types";
import { MOLECULE_CATALOG } from "@/components/molecules/catalog";
import { blendSurface, contrastingTextColor } from "./contrast";
import type { LayoutSlot, LayoutStructure, Rect, SlideLayoutResult } from "./types";

export type RenderLayoutOptions = {
  palette: string[];
  surfaceColor?: string;
  backgroundColor?: string;
  headerLabel?: string;
  decoIconUrls?: string[];
};

function base(id: string, rect: { x: number; y: number; w: number; h: number }, zIndex: number) {
  return { id, ...rect, rotation: 0, zIndex, opacity: 1, locked: false };
}

function shapeFor(structure: LayoutStructure, palette: string[], surfaceColor?: string): ShapeElement {
  const accent = palette[2] ?? "#d97757";
  const surface = surfaceColor ?? palette[1] ?? "#ffffff";
  const isAccentStructure = structure.kind === "divider" || structure.kind === "rail";
  const fill = isAccentStructure ? accent : surface;
  return {
    ...base(`layout:${structure.id}`, structure.rect, structure.zIndex),
    type: "shape",
    shape: "rect",
    fill,
    stroke: structure.kind === "table-grid" ? accent : `${accent}55`,
    strokeW: structure.kind === "table-grid" ? 1 : 0,
    borderRadius: structure.kind === "rail" ? Math.round(structure.rect.h / 2) : structure.kind === "card" || structure.kind === "panel" ? 16 : 0,
    dashStyle: "solid",
    opacity: isAccentStructure ? 1 : 0.6,
  };
}

function line(id: string, x1: number, y1: number, x2: number, y2: number, color: string, zIndex: number): LineElement {
  return {
    ...base(id, { x: Math.min(x1, x2), y: Math.min(y1, y2), w: Math.abs(x2 - x1), h: Math.abs(y2 - y1) }, zIndex),
    type: "line",
    stroke: color,
    strokeW: 1,
    dashStyle: "solid",
    arrowHead: "none",
    x1,
    y1,
    x2,
    y2,
  };
}

function structureElements(structure: LayoutStructure, palette: string[], surfaceColor?: string): SlideElement[] {
  const elements: SlideElement[] = [shapeFor(structure, palette, surfaceColor)];
  if (structure.kind !== "table-grid" || !structure.rows || !structure.columns) return elements;
  const color = palette[2] ?? "#d97757";
  for (let column = 1; column < structure.columns; column += 1) {
    const x = structure.rect.x + structure.rect.w * column / structure.columns;
    elements.push(line(`layout:${structure.id}:column:${column}`, x, structure.rect.y, x, structure.rect.y + structure.rect.h, color, structure.zIndex + 1));
  }
  for (let row = 1; row < structure.rows; row += 1) {
    const y = structure.rect.y + structure.rect.h * row / structure.rows;
    elements.push(line(`layout:${structure.id}:row:${row}`, structure.rect.x, y, structure.rect.x + structure.rect.w, y, color, structure.zIndex + 1));
  }
  return elements;
}

/**
 * Ô vuông lớn nhất canh giữa rect gốc. Camera của viewer 3D có fov đối xứng nên khung chữ nhật
 * chỉ thêm nền trống hai bên và làm phân tử trông lệch; rect trong `LayoutSlot` giữ nguyên để
 * không đổi kết quả chấm điểm bố cục ở engine.
 */
function squareRect(rect: Rect): Rect {
  const side = Math.min(rect.w, rect.h);
  return {
    x: rect.x + Math.round((rect.w - side) / 2),
    y: rect.y + Math.round((rect.h - side) / 2),
    w: side,
    h: side,
  };
}

function textStyle(slot: LayoutSlot): Pick<TextElement, "fontSize" | "bold" | "italic" | "color" | "align" | "fontFamily" | "lineHeight"> {
  const token = slot.defaultStyleToken;
  return {
    fontSize: token === "text-section-hero" ? 56 : token === "text-section-body" ? 20 : token === "text-hero" ? 30 : token === "text-formula" ? 24 : token === "text-caption" ? 12 : token === "text-cell" ? 11 : 16,
    bold: token === "text-section-hero" || token === "text-hero" || token === "text-formula" || token === "text-caption",
    italic: false,
    color: "#2b2926",
    align: token === "text-section-hero" || token === "text-section-body" || slot.zone === "formula" ? "center" : "left",
    fontFamily: token === "text-section-hero" || token === "text-formula" ? "Newsreader, serif" : "Inter, sans-serif",
    lineHeight: token === "text-section-hero" ? 1.05 : 1.2,
  };
}

function slotElement(slot: LayoutSlot, palette: string[], surfaceColor?: string, backgroundColor?: string): TextElement | LatexElement | ImageElement | SimulationElement {
  if (slot.kind === "image") {
    return {
      ...base(`layout:${slot.id}`, slot.rect, slot.zIndex),
      type: "image",
      contentSlot: slot.id,
      src: PLACEHOLDER_IMAGE,
      fit: "cover",
      borderRadius: 12,
      imagePrompt: slot.sourceText,
    };
  }
  if (slot.kind === "molecule") {
    // Placeholder molecule; Step 3 (runContentFillStep) replaces it with the AI-built structure for `slot.sourceText`.
    return makeSimulation(MOLECULE_CATALOG[0], { ...base(`layout:${slot.id}`, squareRect(slot.rect), slot.zIndex), contentSlot: slot.id });
  }
  if (slot.kind === "periodic") {
    return makePeriodicSimulation(
      { mode: "table", elementSymbols: ["H"], focus: slot.sourceText },
      { ...base(`layout:${slot.id}`, slot.rect, slot.zIndex), contentSlot: slot.id },
    );
  }
  if (slot.kind === "physics") {
    // Placeholder rỗng; Bước 3 (runContentFillStep) phân giải `slot.sourceText`
    // sang một preset thật rồi thay vào đây.
    return makeSandboxSimulation(
      { id: "", presetId: "", title: slot.sourceText },
      { ...base(`layout:${slot.id}`, slot.rect, slot.zIndex), contentSlot: slot.id },
    );
  }
  if (slot.zone === "formula") {
    return makeLatex({
      ...base(`layout:${slot.id}`, slot.rect, slot.zIndex),
      contentSlot: slot.id,
      latex: slot.sourceText,
      fontSize: 24,
      color: contrastingTextColor(blendSurface(surfaceColor ?? palette[1], backgroundColor, 0.6), palette[0]),
      align: "center",
    });
  }
  return {
    ...base(`layout:${slot.id}`, slot.rect, slot.zIndex),
    type: "text",
    contentSlot: slot.id,
    text: slot.sourceText,
    ...textStyle(slot),
    color: contrastingTextColor(
      slot.zone === "hero" ? backgroundColor : blendSurface(surfaceColor ?? palette[1], backgroundColor, 0.6),
      palette[0],
    ),
  };
}

export function renderSlideLayout(result: SlideLayoutResult, options: RenderLayoutOptions): SlideElement[] {
  const elements: SlideElement[] = [];
  for (const structure of result.structures) elements.push(...structureElements(structure, options.palette, options.surfaceColor));
  for (const slot of result.slots) elements.push(slotElement(slot, options.palette, options.surfaceColor, options.backgroundColor));
  if (result.headerMode === "fixed" && options.headerLabel) {
    elements.push({
      ...base(`layout:${result.slideId}:header`, { x: 40, y: 24, w: 880, h: 30 }, 40),
      type: "text",
      contentSlot: "header-1",
      text: options.headerLabel,
      fontSize: 12,
      bold: true,
      italic: false,
      color: contrastingTextColor(options.backgroundColor, options.palette[0]),
      align: "left",
      fontFamily: "Inter, sans-serif",
      lineHeight: 1.2,
    });
  }
  (options.decoIconUrls ?? []).slice(0, 2).forEach((src, index) => elements.push({
    ...base(`layout:${result.slideId}:deco:${index}`, { x: index === 0 ? 12 : 914, y: index === 0 ? 470 : 12, w: 34, h: 34 }, 1),
    type: "image",
    src,
    fit: "contain",
    borderRadius: 0,
    opacity: 0.22,
  }));
  return elements;
}
