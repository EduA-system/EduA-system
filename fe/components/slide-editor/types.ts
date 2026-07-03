// Schema element/slide nội bộ của Slide Editor (canvas 960×540).
// Model có kiểu (discriminated union). Các field nâng cao để optional để giữ
// tương thích ngược với slide đã lưu (localStorage / JSON cũ).

export const CANVAS_W = 960;
export const CANVAS_H = 540;

export type ElementType =
  | "text"
  | "shape"
  | "image"
  | "line"
  | "arrow"
  | "poly"
  | "draw";

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

export type SlideElement =
  | TextElement
  | ShapeElement
  | ImageElement
  | LineElement
  | PolyElement
  | DrawElement;

// Patch dùng cho update: intersection (đã bỏ `type` để tránh literal xung đột →
// never) cho phép vá field riêng của từng loại. Partial<SlideElement> chỉ cho
// phép field chung nên không dùng được. Không dùng để vá `type`.
export type ElementPatch = Partial<
  Omit<TextElement, "type"> &
    Omit<ShapeElement, "type"> &
    Omit<ImageElement, "type"> &
    Omit<LineElement, "type"> &
    Omit<PolyElement, "type"> &
    Omit<DrawElement, "type">
>;

export type AlignDir = "left" | "right" | "top" | "bottom" | "cx" | "cy";

export type SlideGenerationStatus = "pending" | "framing" | "ready" | "failed";

export interface Slide {
  id: string;
  bg: string;
  elements: SlideElement[];
  aiPrompt?: string;
  generationStatus?: SlideGenerationStatus;
}

export function isSlideLockedForGeneration(slide: Slide | undefined): boolean {
  return slide?.generationStatus === "pending" || slide?.generationStatus === "framing";
}
