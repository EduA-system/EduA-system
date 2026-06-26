import type { Slide, SlideElement } from "@/components/slide-editor/types";

const PLACEHOLDER_IMAGE =
  "data:image/svg+xml," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="320" height="240"><rect width="100%" height="100%" fill="#e2e8f0"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#64748b" font-size="14" font-family="sans-serif">Ảnh minh hoạ</text></svg>',
  );

export type BeSlideBackground = { type: string; value: string };

export type BeSlideElement =
  | {
      type: "text";
      id: string;
      x: number;
      y: number;
      width: number;
      height: number;
      rotation?: number | null;
      zIndex: number;
      locked?: boolean | null;
      html: string;
      fontSize?: number | null;
      color?: string | null;
      align?: string | null;
    }
  | {
      type: "image";
      id: string;
      x: number;
      y: number;
      width: number;
      height: number;
      rotation?: number | null;
      zIndex: number;
      locked?: boolean | null;
      src?: string | null;
      alt?: string | null;
      fit?: string | null;
      imagePrompt?: string | null;
    }
  | {
      type: "shape";
      id: string;
      x: number;
      y: number;
      width: number;
      height: number;
      rotation?: number | null;
      zIndex: number;
      locked?: boolean | null;
      shape?: string | null;
      fill?: string | null;
      stroke?: string | null;
      strokeWidth?: number | null;
      borderRadius?: number | null;
    }
  | { type: "latex" | "embed"; id: string }
  | { type: string; id: string; [key: string]: unknown };

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<[^>]+>/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function mapText(el: Extract<BeSlideElement, { type: "text" }>): TextElement {
  return {
    id: el.id,
    type: "text",
    x: el.x,
    y: el.y,
    w: el.width,
    h: el.height,
    rotation: el.rotation ?? 0,
    zIndex: el.zIndex,
    opacity: 1,
    locked: el.locked ?? false,
    text: stripHtml(el.html ?? ""),
    fontSize: el.fontSize ?? 24,
    bold: false,
    italic: false,
    color: el.color ?? "#1e293b",
    align: (el.align === "center" || el.align === "right" ? el.align : "left") as "left" | "center" | "right",
  };
}

type TextElement = Extract<SlideElement, { type: "text" }>;
type ShapeElement = Extract<SlideElement, { type: "shape" }>;
type ImageElement = Extract<SlideElement, { type: "image" }>;

function mapShape(el: Extract<BeSlideElement, { type: "shape" }>): ShapeElement {
  const isEllipse = el.shape === "ellipse";
  return {
    id: el.id,
    type: "shape",
    shape: isEllipse ? "ellipse" : "rect",
    x: el.x,
    y: el.y,
    w: el.width,
    h: el.height,
    rotation: el.rotation ?? 0,
    zIndex: el.zIndex,
    opacity: 1,
    locked: el.locked ?? false,
    fill: el.fill ?? "transparent",
    stroke: el.stroke ?? "transparent",
    strokeW: el.strokeWidth ?? 0,
    borderRadius: el.borderRadius ?? 0,
  };
}

function mapImage(el: Extract<BeSlideElement, { type: "image" }>): ImageElement {
  const fit = el.fit === "contain" || el.fit === "fill" ? el.fit : "cover";
  return {
    id: el.id,
    type: "image",
    x: el.x,
    y: el.y,
    w: el.width,
    h: el.height,
    rotation: el.rotation ?? 0,
    zIndex: el.zIndex,
    opacity: 1,
    locked: el.locked ?? false,
    src: el.src && el.src.trim() ? el.src : PLACEHOLDER_IMAGE,
    fit,
    borderRadius: 0,
  };
}

export function mapBeElements(elements: BeSlideElement[]): SlideElement[] {
  const out: SlideElement[] = [];
  for (const el of elements) {
    if (el.type === "text" && "html" in el) {
      out.push(mapText(el as Extract<BeSlideElement, { type: "text" }>));
    } else if (el.type === "shape" && "width" in el) {
      out.push(mapShape(el as Extract<BeSlideElement, { type: "shape" }>));
    } else if (el.type === "image" && "width" in el) {
      out.push(mapImage(el as Extract<BeSlideElement, { type: "image" }>));
    }
  }
  return out.sort((a, b) => a.zIndex - b.zIndex);
}

export function mapBeSlide(
  slideId: string,
  title: string,
  elements: BeSlideElement[],
  background: BeSlideBackground | null,
): Slide {
  const bg =
    background?.type === "color" && background.value
      ? background.value
      : "#ffffff";
  return {
    id: slideId,
    bg,
    elements: mapBeElements(elements),
    aiPrompt: title,
  };
}

export function skeletonSlidesFromParts(
  parts: { slides: { id: string; title: string }[] }[],
): Slide[] {
  return parts.flatMap((part) =>
    part.slides.map((sl) => ({
      id: sl.id,
      bg: "#ffffff",
      elements: [],
      aiPrompt: sl.title,
    })),
  );
}
