import { describe, expect, it } from "vitest";
import {
  calculateHookeValues,
  GRAVITY,
  INITIAL_HOOKE_MOTION,
  maxCompression,
  maxStretch,
  stepHookeMotion,
  type HookeLawParams,
} from "./physics";

const params: HookeLawParams = {
  springConstant: 80,
  mass: 0.2,
  compressionMass: 1,
  naturalLength: 0.24,
};

describe("Hooke law physics", () => {
  it("uses mg/k for the hanging equilibrium extension", () => {
    const values = calculateHookeValues(params, INITIAL_HOOKE_MOTION);
    expect(values.stretchEquilibrium).toBeCloseTo(
      (params.mass * GRAVITY) / params.springConstant,
    );
  });

  it("uses m₂g/k for the compression equilibrium (single mass only)", () => {
    const values = calculateHookeValues(params, INITIAL_HOOKE_MOTION);
    expect(values.compressionEquilibrium).toBeCloseTo(
      Math.min(
        (params.compressionMass * GRAVITY) / params.springConstant,
        maxCompression(params.naturalLength),
      ),
    );
  });

  it("uses the configured natural length for both states", () => {
    const custom = { ...params, naturalLength: 0.3 };
    const values = calculateHookeValues(custom, INITIAL_HOOKE_MOTION);
    expect(values.stretchLength).toBeCloseTo(0.3);
    expect(values.compressionLength).toBeCloseTo(0.3);
  });

  it("converges close to both static equilibrium positions", () => {
    let motion = INITIAL_HOOKE_MOTION;
    for (let index = 0; index < 1200; index += 1) {
      motion = stepHookeMotion(motion, params, 1 / 120);
    }
    const values = calculateHookeValues(params, motion);

    expect(motion.stretch).toBeCloseTo(values.stretchEquilibrium, 3);
    expect(motion.compression).toBeCloseTo(values.compressionEquilibrium, 3);
  });

  it("clamps compression at the spring's maximum compression", () => {
    const heavy: HookeLawParams = {
      ...params,
      compressionMass: 100, // đè quá nặng
    };
    const limit = maxCompression(heavy.naturalLength);
    expect(limit).toBeCloseTo(heavy.naturalLength * 0.4);

    let motion = INITIAL_HOOKE_MOTION;
    for (let index = 0; index < 2400; index += 1) {
      motion = stepHookeMotion(motion, heavy, 1 / 240);
    }
    expect(motion.compression).toBeLessThanOrEqual(limit + 1e-9);
    expect(motion.compression).toBeGreaterThan(0);
  });

  it("keeps the stretch limit wider than the compression limit", () => {
    expect(maxStretch(params.naturalLength)).toBeGreaterThan(
      maxCompression(params.naturalLength),
    );
  });
});
