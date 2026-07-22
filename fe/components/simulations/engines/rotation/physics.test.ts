import { describe, expect, it } from "vitest";
import { angularAcceleration, initialRotationState, rotationStateAt, rotationTorques, stepRotation, totalInertia } from "./physics";
import type { RotationScene } from "./types";

const baseScene: RotationScene = {
  kind: "rotation",
  diskRadius: 1.5,
  diskMass: 8,
  gravity: 9.8,
  angularDamping: 0,
  ropeLength: 0.72,
  left: { mass: 2, radius: 1.5, label: "Vật trái", color: "#60a5fa" },
  right: { mass: 3, radius: 1, label: "Vật phải", color: "#f472b6" },
};

describe("rotation engine", () => {
  it("cân bằng khi hai moment bằng nhau", () => {
    const torques = rotationTorques(baseScene);
    expect(torques.left).toBeCloseTo(29.4);
    expect(torques.right).toBeCloseTo(29.4);
    expect(torques.net).toBeCloseTo(0);
    expect(angularAcceleration(baseScene, initialRotationState(baseScene))).toBeCloseTo(0);
  });

  it("quay ngược chiều kim đồng hồ khi moment trái lớn hơn", () => {
    const scene: RotationScene = { ...baseScene, left: { ...baseScene.left, mass: 3 } };
    expect(rotationTorques(scene).net).toBeGreaterThan(0);
    expect(rotationStateAt(scene, 0.4).theta).toBeGreaterThan(0);
  });

  it("giảm cánh tay đòn về 0 khi dây đã quay thẳng đứng", () => {
    const torques = rotationTorques({ ...baseScene, left: { ...baseScene.left, mass: 3 } }, Math.PI / 2);
    expect(torques.net).toBeCloseTo(0, 8);
  });
  it("tính moment quán tính gồm đĩa và hai quả cân", () => {
    expect(totalInertia(baseScene)).toBeCloseTo(0.5 * 8 * 1.5 ** 2 + 2 * 1.5 ** 2 + 3);
  });

  it("dùng moment quán tính của thanh đồng chất cho bập bênh", () => {
    const scene: RotationScene = { ...baseScene, inertiaModel: "rod" };
    expect(totalInertia(scene)).toBeCloseTo((1 / 3) * 8 * 1.5 ** 2 + 2 * 1.5 ** 2 + 3);
  });

  it("dừng ở giới hạn nhưng có thể quay ngược lại khi moment đổi chiều", () => {
    const maxTheta = Math.PI / 15;
    const leftHeavy: RotationScene = { ...baseScene, left: { ...baseScene.left, mass: 4 }, maxTheta, minTheta: -maxTheta };
    const atLimit = rotationStateAt(leftHeavy, 3);
    expect(atLimit.theta).toBeCloseTo(maxTheta);
    expect(atLimit.stoppedAtLimit).toBe(true);

    const rightHeavy: RotationScene = { ...leftHeavy, left: { ...leftHeavy.left, mass: 1 } };
    const movingAway = stepRotation(rightHeavy, atLimit, 1 / 60);
    expect(movingAway.theta).toBeLessThan(maxTheta);
    expect(movingAway.stoppedAtLimit).toBe(false);
  });
});
