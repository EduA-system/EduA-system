// Schema element/slide nội bộ của Slide Editor (canvas 960×540).
// Model có kiểu (discriminated union). Các field nâng cao để optional để giữ
// tương thích ngược với slide đã lưu (localStorage / JSON cũ).

import type { Molecule, RenderMode } from "@/components/molecules/types";

export const CANVAS_W = 960;
export const CANVAS_H = 540;

export type ElementType =
  | "text"
  | "latex"
  | "shape"
  | "image"
  | "line"
  | "arrow"
  | "poly"
  | "draw"
  | "simulation";

// Kiểu đầu mút line/arrow (marker SVG).
export type LineMarker =
  | "arrow"
  | "bar"
  | "square"
  | "circle"
  | "diamond"
  | "square-open"
  | "circle-open";

export type TextTransform =
  | "none"
  | "uppercase"
  | "lowercase"
  | "capitalize"
  | "capitalize-words";

export type ListStyle = "none" | "bullet" | "numbered";

export type DashStyle = "solid" | "dashed" | "dotted" | "fine";

interface ElementBase {
  id: string;
  type: ElementType;
  x: number;
  y: number;
  w: number;
  h: number;
  rotation: number;
  zIndex: number;
  opacity: number;
  locked: boolean;
  // Layers panel
  hidden?: boolean;
  // Group / Ungroup
  groupId?: string;
  /** Stable semantic slot created by slide-design step 2. */
  contentSlot?: string;
}

export interface TextElement extends ElementBase {
  type: "text";
  text: string;
  fontSize: number;
  bold: boolean;
  italic: boolean;
  color: string;
  align: "left" | "center" | "right";
  // mở rộng
  fontFamily?: string;
  underline?: boolean;
  strikethrough?: boolean;
  lineHeight?: number;
  letterSpacing?: number;
  textTransform?: TextTransform;
  textShadow?: string;
  textBg?: string;
  listStyle?: ListStyle;
}

/** A display-math block rendered with KaTeX. The value excludes $ delimiters. */
export interface LatexElement extends ElementBase {
  type: "latex";
  latex: string;
  fontSize: number;
  color: string;
  align: "left" | "center" | "right";
}

export interface ShapeElement extends ElementBase {
  type: "shape";
  shape: "rect" | "ellipse";
  fill: string;
  stroke: string;
  strokeW: number;
  borderRadius: number;
  dashStyle?: DashStyle;
}

export interface ImageElement extends ElementBase {
  type: "image";
  src: string;
  fit: "cover" | "contain" | "fill";
  borderRadius: number;
  // mở rộng
  flipH?: boolean;
  flipV?: boolean;
  brightness?: number; // %, mặc định 100
  contrast?: number; // %, mặc định 100
  /** AI-generated English prompt retained while this image is still a placeholder. */
  imagePrompt?: string;
}

export interface LineElement extends ElementBase {
  type: "line" | "arrow";
  stroke: string;
  strokeW: number;
  dashStyle: DashStyle;
  arrowHead: "end" | "both" | "none";
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  // mở rộng: marker tùy biến 2 đầu (ưu tiên hơn arrowHead khi được đặt)
  lineMarkerStart?: LineMarker;
  lineMarkerEnd?: LineMarker;
}

// Hình SVG dựng sẵn từ thư viện (type "poly").
export interface PolyElement extends ElementBase {
  type: "poly";
  svgPath: string;
  svgViewBox: string;
  shapeId: string;
  fill: string;
  stroke: string;
  strokeW: number;
  strokeLinecap?: "butt" | "round" | "square";
  strokeLinejoin?: "miter" | "round" | "bevel";
  borderRadius?: number;
  dashStyle?: DashStyle;
  // text overlay (optional)
  text?: string;
  fontSize?: number;
  bold?: boolean;
  italic?: boolean;
  color?: string;
  align?: "left" | "center" | "right";
  fontFamily?: string;
}

// Nét vẽ tay tự do (type "draw"). points là chuỗi SVG path ("M x y L x y …")
// theo toạ độ canvas; element luôn phủ toàn canvas (x=0,y=0,w=CW,h=CH).
export interface DrawElement extends ElementBase {
  type: "draw";
  points: string;
  drawTool: "brush" | "pencil" | "eraser";
  stroke: string;
  strokeW: number;
}

// Element nhúng một mô phỏng tương tác (click-to-simulate khi trình chiếu).
// Ba họ: phân tử 3D, bảng tuần hoàn, và thí nghiệm vật lý chạy qua Sandpack.
export type PeriodicSimulationPayload = {
  mode: "element" | "table";
  elementSymbols: string[];
  focus?: string;
};

export interface MoleculeSimulationElement extends ElementBase {
  type: "simulation";
  kind: "molecule";
  molecule: Molecule;
  mode: RenderMode;
  rotating: boolean;
}

export interface PeriodicSimulationElement extends ElementBase {
  type: "simulation";
  kind: "periodic-element" | "periodic-table";
  periodic: PeriodicSimulationPayload;
}

/**
 * Thí nghiệm vật lý từ `components/simulations/`, chạy bằng Sandpack.
 *
 * CHỈ lưu định danh, không lưu mã nguồn: file thật đọc từ đĩa qua
 * `/api/sandbox-experiment` lúc kích hoạt. Nhờ vậy deck không phình theo cây
 * phụ thuộc của thí nghiệm, và sửa `components/simulations/` là slide đã lưu
 * cũng chạy theo bản mới thay vì đóng băng tại thời điểm lưu.
 */
export interface SandboxSimulationElement extends ElementBase {
  type: "simulation";
  kind: "sandbox";
  /** Tên file preset (không đuôi) — khớp `ExperimentSummary.id`, dùng để gọi API. */
  experimentId: string;
  /**
   * `id` mà preset TỰ khai báo — khác tên file ở 13 preset (vd `brownian.ts`
   * khai `brownian-pollen`). Ảnh thu nhỏ khoá theo giá trị này.
   */
  presetId: string;
  /** Denormalize để poster hiện tên mà không phải gọi API. */
  title: string;
}

export type SimulationElement =
  | MoleculeSimulationElement
  | PeriodicSimulationElement
  | SandboxSimulationElement;

export type SlideElement =
  | TextElement
  | LatexElement
  | ShapeElement
  | ImageElement
  | LineElement
  | PolyElement
  | DrawElement
  | SimulationElement;

// Patch dùng cho update: intersection (đã bỏ `type` để tránh literal xung đột →
// never) cho phép vá field riêng của từng loại. Partial<SlideElement> chỉ cho
// phép field chung nên không dùng được. Không dùng để vá `type`.
type BaseElementPatch = Partial<
  Omit<TextElement, "type"> &
    Omit<LatexElement, "type"> &
    Omit<ShapeElement, "type"> &
    Omit<ImageElement, "type"> &
    Omit<LineElement, "type"> &
    Omit<PolyElement, "type"> &
    Omit<DrawElement, "type">
>;

export type ElementPatch =
  | (BaseElementPatch & Partial<Omit<MoleculeSimulationElement, "type">>)
  | (BaseElementPatch & Partial<Omit<PeriodicSimulationElement, "type">>)
  | (BaseElementPatch & Partial<Omit<SandboxSimulationElement, "type">>);

export type AlignDir = "left" | "right" | "top" | "bottom" | "cx" | "cy";

export type SlideGenerationStatus = "pending" | "framing" | "ready" | "failed";

export interface Slide {
  id: string;
  bg: string;
  elements: SlideElement[];
  aiPrompt?: string;
  generationStatus?: SlideGenerationStatus;
  /** Error returned while generating this specific slide, shown on its canvas. */
  generationError?: string;
}

export function isSlideLockedForGeneration(slide: Slide | undefined): boolean {
  return slide?.generationStatus === "pending" || slide?.generationStatus === "framing";
}
