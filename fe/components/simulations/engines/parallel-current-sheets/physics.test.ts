import { describe, expect, it } from "vitest";
import { currentSheetForce, initialCurrentSheetsState, MIN_SHEET_SEPARATION, stepCurrentSheets } from "./physics";
import type { ParallelCurrentSheetsScene } from "./types";

const scene: ParallelCurrentSheetsScene = {
  kind: "parallel-current-sheets", currentLeft: 20, currentRight: 20,
  length: 1.5, separation: .22, mass: .018, suspensionStiffness: .055, damping: .018,
};

describe("parallel current sheets", () => {
  it("cùng chiều đẩy nhau", () => {
    const force = currentSheetForce(scene, initialCurrentSheetsState());
    expect(force.left).toBeLessThan(0);
    expect(force.right).toBeGreaterThan(0);
  });
  it("ngược chiều hút nhau", () => {
    const force = currentSheetForce({ ...scene, currentRight: -20 }, initialCurrentSheetsState());
    expect(force.left).toBeGreaterThan(0);
    expect(force.right).toBeLessThan(0);
  });
  it("không cho hai tấm xuyên qua nhau khi dòng điện hút rất mạnh", () => {
    const strongAttraction = { ...scene, currentLeft: 40, currentRight: -40, damping: .002 };
    let state = initialCurrentSheetsState();

    for (let frame = 0; frame < 1200; frame += 1) {
      state = stepCurrentSheets(strongAttraction, state, 1 / 30);
      const separation = strongAttraction.separation + state.rightX - state.leftX;
      expect(separation).toBeGreaterThanOrEqual(MIN_SHEET_SEPARATION - 1e-10);
    }
  });
  it("triệt tiêu vận tốc lao vào nhau tại thời điểm tiếp xúc", () => {
    const contactState = { leftX: (scene.separation - MIN_SHEET_SEPARATION) / 2, leftV: 1, rightX: -(scene.separation - MIN_SHEET_SEPARATION) / 2, rightV: -1 };
    const next = stepCurrentSheets({ ...scene, currentRight: -40 }, contactState, 1 / 30);

    expect(next.rightV - next.leftV).toBeGreaterThanOrEqual(0);
    expect(scene.separation + next.rightX - next.leftX).toBeCloseTo(MIN_SHEET_SEPARATION, 10);
  });
});
