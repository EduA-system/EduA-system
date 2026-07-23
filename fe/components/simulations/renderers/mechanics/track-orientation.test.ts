import { describe, expect, it } from "vitest";
import { screenAngleAtClosestTrackSegment } from "./track-orientation";

describe("screenAngleAtClosestTrackSegment", () => {
  const track = [
    { x: -1, y: 1 },
    { x: 0, y: 0 },
    { x: 1, y: 0 },
  ];

  it("uses the local slope while the body is on the incline", () => {
    expect(screenAngleAtClosestTrackSegment(track, -0.5, 0.5)).toBeCloseTo(45, 6);
  });

  it("is horizontal for a stopped body at the end of a horizontal runout", () => {
    expect(screenAngleAtClosestTrackSegment(track, 1, 0)).toBeCloseTo(0, 6);
  });

  it("returns no angle when the track has no valid segment", () => {
    expect(screenAngleAtClosestTrackSegment([{ x: 0, y: 0 }], 0, 0)).toBeNull();
  });
});
