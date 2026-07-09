export const STRIP_COUNT = 32;
export const DURATION_MS = 450;
export const LAG_SPREAD = 0.15;
export const BULGE_AMOUNT = 0.12;
export const MIN_SCALE_X = 0.05;
export const MIN_SCALE_Y = 0.1;

export interface GenieRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface GeniePoint {
  x: number;
  y: number;
}

export interface StripTransform {
  translateX: number;
  translateY: number;
  scaleX: number;
  scaleY: number;
  opacity: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/**
 * Progress and geometry for a single horizontal strip of the sidebar snapshot.
 * `progress` is the overall animation progress (0 = resting/expanded shape,
 * 1 = fully collapsed into the target point); callers drive it 0→1 for
 * collapse and 1→0 for the mirrored expand playback.
 */
export function computeStripTransform(input: {
  index: number;
  stripCount: number;
  progress: number;
  sidebarRect: GenieRect;
  targetPoint: GeniePoint;
}): StripTransform {
  const { index, stripCount, progress, sidebarRect, targetPoint } = input;

  const stripCenterX = sidebarRect.left + sidebarRect.width / 2;
  const stripFraction = (index + 0.5) / stripCount;
  const restY = sidebarRect.top + stripFraction * sidebarRect.height;

  const distance =
    sidebarRect.height > 0
      ? clamp(Math.abs(restY - targetPoint.y) / sidebarRect.height, 0, 1)
      : 0;

  const lag = distance * LAG_SPREAD;
  const tStart = lag * 0.5;
  const tEnd = 1 - lag * 0.5;
  const localT = clamp((progress - tStart) / (tEnd - tStart), 0, 1);
  const eased = easeInOutCubic(localT);

  const translateX = eased * (targetPoint.x - stripCenterX);
  const translateY = eased * (targetPoint.y - restY);
  const scaleX = 1 - eased * (1 - MIN_SCALE_X);
  const scaleY =
    1 + BULGE_AMOUNT * Math.sin(Math.PI * eased) * (1 - distance) - eased * (1 - MIN_SCALE_Y);
  const opacity = 1 - eased * eased;

  return { translateX, translateY, scaleX, scaleY, opacity };
}
