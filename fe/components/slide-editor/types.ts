// Schema element/slide nội bộ của Slide Editor (canvas 960×540).
// Bước 1 chỉ dùng để render read-only; field lấy đủ theo
// designs/slide-editor/state-management.md §5 để không phải sửa lại ở bước sau.

export const CANVAS_W = 960;
export const CANVAS_H = 540;

export type ElementType = "text" | "shape" | "image";

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
}

export interface TextElement extends ElementBase {
  type: "text";
  text: string;
  fontSize: number;
  bold: boolean;
  italic: boolean;
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
}

export interface ImageElement extends ElementBase {
  type: "image";
  src: string;
  fit: "cover" | "contain" | "fill";
  borderRadius: number;
}

export type SlideElement = TextElement | ShapeElement | ImageElement;

export interface Slide {
  id: string;
  bg: string;
  elements: SlideElement[];
  aiPrompt?: string;
}
