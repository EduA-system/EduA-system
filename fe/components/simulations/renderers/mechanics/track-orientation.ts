import type { TrackPoint } from "../../engines/mechanics/types";

/**
 * Returns the Konva angle of the track segment closest to a body position.
 *
 * World coordinates point upward on y while Konva points downward, so the
 * tangent's y component is inverted when converting it to a display angle.
 */
export function screenAngleAtClosestTrackSegment(
  points: TrackPoint[],
  x: number,
  y: number,
): number | null {
  let closestDistanceSquared = Number.POSITIVE_INFINITY;
  let closestAngle: number | null = null;

  for (let index = 0; index < points.length - 1; index++) {
    const start = points[index]!;
    const end = points[index + 1]!;
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const lengthSquared = dx * dx + dy * dy;
    if (lengthSquared < 1e-12) continue;

    const rawT = ((x - start.x) * dx + (y - start.y) * dy) / lengthSquared;
    const t = Math.max(0, Math.min(1, rawT));
    const closestX = start.x + dx * t;
    const closestY = start.y + dy * t;
    const distanceX = x - closestX;
    const distanceY = y - closestY;
    const distanceSquared = distanceX * distanceX + distanceY * distanceY;

    if (distanceSquared < closestDistanceSquared) {
      closestDistanceSquared = distanceSquared;
      closestAngle = (Math.atan2(-dy, dx) * 180) / Math.PI;
    }
  }

  return closestAngle;
}
