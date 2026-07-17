import type { Rect } from "./types";

export const GUTTER = 24;

export function inset(rect: Rect, amount: number): Rect {
  return { x: rect.x + amount, y: rect.y + amount, w: Math.max(0, rect.w - amount * 2), h: Math.max(0, rect.h - amount * 2) };
}

export function splitHorizontal(rect: Rect, ratio: number, gap = GUTTER): [Rect, Rect] {
  const firstWidth = Math.round((rect.w - gap) * ratio);
  return [
    { x: rect.x, y: rect.y, w: firstWidth, h: rect.h },
    { x: rect.x + firstWidth + gap, y: rect.y, w: rect.w - firstWidth - gap, h: rect.h },
  ];
}

export function splitVertical(rect: Rect, ratio: number, gap = GUTTER): [Rect, Rect] {
  const firstHeight = Math.round((rect.h - gap) * ratio);
  return [
    { x: rect.x, y: rect.y, w: rect.w, h: firstHeight },
    { x: rect.x, y: rect.y + firstHeight + gap, w: rect.w, h: rect.h - firstHeight - gap },
  ];
}

export function grid(rect: Rect, rows: number, columns: number, gap = 12): Rect[] {
  const cellWidth = (rect.w - gap * (columns - 1)) / columns;
  const cellHeight = (rect.h - gap * (rows - 1)) / rows;
  return Array.from({ length: rows * columns }, (_, index) => ({
    x: Math.round(rect.x + (index % columns) * (cellWidth + gap)),
    y: Math.round(rect.y + Math.floor(index / columns) * (cellHeight + gap)),
    w: Math.floor(cellWidth),
    h: Math.floor(cellHeight),
  }));
}

export function inside(inner: Rect, outer: Rect): boolean {
  return Number.isFinite(inner.x + inner.y + inner.w + inner.h)
    && inner.w > 0 && inner.h > 0
    && inner.x >= outer.x && inner.y >= outer.y
    && inner.x + inner.w <= outer.x + outer.w
    && inner.y + inner.h <= outer.y + outer.h;
}

