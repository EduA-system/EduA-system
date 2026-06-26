import type { LineElement, SlideElement } from "../types";
import { CANVAS_W, CANVAS_H } from "../types";

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface Point {
  x: number;
  y: number;
}

export interface Guide {
  type: "x" | "y";
  pos: number;
}

const SNAP_THRESHOLD = 5;

export function computeBoundingBox(elements: SlideElement[]): Rect {
  if (elements.length === 0) {
    return { x: 0, y: 0, w: 0, h: 0 };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const el of elements) {
    minX = Math.min(minX, el.x);
    minY = Math.min(minY, el.y);
    maxX = Math.max(maxX, el.x + el.w);
    maxY = Math.max(maxY, el.y + el.h);
  }

  return {
    x: minX,
    y: minY,
    w: maxX - minX,
    h: maxY - minY,
  };
}

export function applyResize(
  handle: string,
  delta: { dx: number; dy: number },
  original: Rect,
  aspectRatio?: number
): Rect {
  let { x, y, w, h } = original;
  const { dx, dy } = delta;

  switch (handle) {
    case "nw":
      x += dx;
      y += dy;
      w -= dx;
      h -= dy;
      break;
    case "ne":
      y += dy;
      w += dx;
      h -= dy;
      break;
    case "sw":
      x += dx;
      w -= dx;
      h += dy;
      break;
    case "se":
      w += dx;
      h += dy;
      break;
    case "n":
      y += dy;
      h -= dy;
      break;
    case "s":
      h += dy;
      break;
    case "w":
      x += dx;
      w -= dx;
      break;
    case "e":
      w += dx;
      break;
  }

  if (aspectRatio && w > 0 && h > 0) {
    if (handle === "n" || handle === "s") {
      w = h * aspectRatio;
    } else if (handle === "e" || handle === "w") {
      h = w / aspectRatio;
    } else {
      const newAspect = w / h;
      if (newAspect > aspectRatio) {
        w = h * aspectRatio;
      } else {
        h = w / aspectRatio;
      }
    }
  }

  if (w < 10) w = 10;
  if (h < 10) h = 10;

  return { x, y, w, h };
}

export function applyRotation(center: Point, mousePos: Point): number {
  const dx = mousePos.x - center.x;
  const dy = mousePos.y - center.y;
  let angle = (Math.atan2(dy, dx) * 180) / Math.PI;
  if (angle < 0) angle += 360;
  return Math.round(angle);
}

export function getCenter(rect: Rect): Point {
  return {
    x: rect.x + rect.w / 2,
    y: rect.y + rect.h / 2,
  };
}

// Snap mép/giữa của nhóm element đang kéo vào mép/giữa canvas + element khác.
// Trong ngưỡng SNAP_THRESHOLD thì hút và trả guide để vẽ đường đỏ.
export function computeSnap(
  dragged: Rect[],
  others: SlideElement[]
): { snapDx: number; snapDy: number; guides: Guide[] } {
  if (dragged.length === 0) return { snapDx: 0, snapDy: 0, guides: [] };

  const minX = Math.min(...dragged.map((d) => d.x));
  const maxX = Math.max(...dragged.map((d) => d.x + d.w));
  const minY = Math.min(...dragged.map((d) => d.y));
  const maxY = Math.max(...dragged.map((d) => d.y + d.h));
  const xPts = [minX, (minX + maxX) / 2, maxX];
  const yPts = [minY, (minY + maxY) / 2, maxY];
  const xC = [0, CANVAS_W / 2, CANVAS_W, ...others.flatMap((o) => [o.x, o.x + o.w / 2, o.x + o.w])];
  const yC = [0, CANVAS_H / 2, CANVAS_H, ...others.flatMap((o) => [o.y, o.y + o.h / 2, o.y + o.h])];

  let bx = 0,
    bxd = SNAP_THRESHOLD + 1,
    gx = -1;
  let by = 0,
    byd = SNAP_THRESHOLD + 1,
    gy = -1;
  for (const p of xPts)
    for (const c of xC) {
      const d = Math.abs(p - c);
      if (d < bxd) {
        bxd = d;
        bx = c - p;
        gx = c;
      }
    }
  for (const p of yPts)
    for (const c of yC) {
      const d = Math.abs(p - c);
      if (d < byd) {
        byd = d;
        by = c - p;
        gy = c;
      }
    }

  const guides: Guide[] = [];
  if (bxd <= SNAP_THRESHOLD) guides.push({ type: "x", pos: gx });
  if (byd <= SNAP_THRESHOLD) guides.push({ type: "y", pos: gy });
  return {
    snapDx: bxd <= SNAP_THRESHOLD ? bx : 0,
    snapDy: byd <= SNAP_THRESHOLD ? by : 0,
    guides,
  };
}

// (x1,y1)-(x2,y2) → bbox + rotation cho line/arrow (giữ endpoint).
export function elemFromEndpoints(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  el: LineElement
): Partial<LineElement> {
  const cx = (x1 + x2) / 2;
  const cy = (y1 + y2) / 2;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.max(1, Math.sqrt(dx * dx + dy * dy));
  const rotation = (Math.atan2(dy, dx) * 180) / Math.PI;
  return { x: cx - len / 2, y: cy - el.h / 2, w: len, rotation, x1, y1, x2, y2 };
}
