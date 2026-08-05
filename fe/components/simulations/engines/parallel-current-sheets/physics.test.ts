import { describe, expect, it } from "vitest";
import { currentSheetForce, initialCurrentSheetsState } from "./physics";
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
});
