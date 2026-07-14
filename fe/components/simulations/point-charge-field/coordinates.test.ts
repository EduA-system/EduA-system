import { describe, expect, it } from "vitest";
import { fitViewport, screenToWorld, worldToScreen } from "./coordinates";

describe("point-charge-field coordinates", () => {
  it("worldToScreen → screenToWorld round-trips", () => {
    const vp = { width: 800, height: 600, scale: 200, centerX: 0, centerY: 0 };
    const original = { x: 0.7, y: -0.4 };
    const screen = worldToScreen(original.x, original.y, vp);
    const back = screenToWorld(screen.x, screen.y, vp);
    expect(back.x).toBeCloseTo(original.x, 9);
    expect(back.y).toBeCloseTo(original.y, 9);
  });

  it("world origin maps to viewport center when centerX/centerY are 0", () => {
    const vp = { width: 800, height: 600, scale: 200, centerX: 0, centerY: 0 };
    const s = worldToScreen(0, 0, vp);
    expect(s.x).toBeCloseTo(400, 9);
    expect(s.y).toBeCloseTo(300, 9);
  });

  it("positive world y maps to a SMALLER screen y (y flips: world up, screen down)", () => {
    const vp = { width: 800, height: 600, scale: 200, centerX: 0, centerY: 0 };
    const up = worldToScreen(0, 1, vp);
    const down = worldToScreen(0, -1, vp);
    expect(up.y).toBeLessThan(down.y);
  });

  it("fitViewport centers on the bounding box and fits within padding", () => {
    const vp = fitViewport(1000, 500, -1, 1, -0.5, 0.5, 0.8);
    expect(vp.centerX).toBeCloseTo(0, 9);
    expect(vp.centerY).toBeCloseTo(0, 9);
    // scale giới hạn bởi chiều cao (spanY=1 so với spanX=2, tỉ lệ khung 2:1 khớp đúng 1000:500)
    expect(vp.scale).toBeCloseTo((500 * 0.8) / 1, 6);
  });
});
