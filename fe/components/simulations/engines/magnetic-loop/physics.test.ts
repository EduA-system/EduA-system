import { describe, expect, it } from "vitest";
import { initialMagneticLoopState, magneticLoopDynamics, stepMagneticLoop } from "./physics";
import type { MagneticLoopScene } from "./types";

const scene: MagneticLoopScene = {
  kind: "magnetic-loop",
  width: 0.12,
  height: 0.18,
  mass: 0.08,
  turns: 20,
  current: 1.5,
  magneticField: 0.3,
  angularDamping: 0.002,
  initialAngle: Math.PI / 3,
};

describe("magnetic loop physics", () => {
  it("uses F = NIlB and tau = NIAB sin(alpha)", () => {
    const dynamics = magneticLoopDynamics(scene, initialMagneticLoopState(scene));
    expect(dynamics.sideForce).toBeCloseTo(20 * 1.5 * 0.18 * 0.3, 8);
    expect(dynamics.torque).toBeCloseTo(-20 * 1.5 * 0.12 * 0.18 * 0.3 * Math.sin(Math.PI / 3), 8);
  });

  it("accelerates the normal toward the magnetic field", () => {
    const next = stepMagneticLoop(scene, initialMagneticLoopState(scene), 0.01);
    expect(next.angularVelocity).toBeLessThan(0);
    expect(next.angle).toBeLessThan(scene.initialAngle);
  });

  it("reverses current after the frame crosses a half turn", () => {
    const before = magneticLoopDynamics(scene, { angle: 0.2, angularVelocity: -1 });
    const after = magneticLoopDynamics(scene, { angle: -0.2, angularVelocity: -1 });
    expect(before.effectiveCurrent).toBeGreaterThan(0);
    expect(after.effectiveCurrent).toBeLessThan(0);
    expect(before.torque).toBeLessThan(0);
    expect(after.torque).toBeLessThan(0);
  });

  it("passes the aligned position instead of stopping there", () => {
    let state = initialMagneticLoopState(scene);
    let crossedAlignedPosition = false;
    for (let i = 0; i < 600; i += 1) {
      state = stepMagneticLoop(scene, state, 1 / 600);
      if (state.angle < 0) crossedAlignedPosition = true;
    }
    expect(crossedAlignedPosition).toBe(true);
    expect(state.angularVelocity).toBeLessThan(-0.1);
  });

  it("has momentarily zero magnetic torque when n is parallel to B", () => {
    const dynamics = magneticLoopDynamics(scene, { angle: 0, angularVelocity: 0 });
    expect(dynamics.torque).toBeCloseTo(0, 10);
    expect(dynamics.angularAcceleration).toBeCloseTo(0, 10);
  });
});
