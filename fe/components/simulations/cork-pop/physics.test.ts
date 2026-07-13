import { describe, expect, it } from "vitest";
import { calculateForce, calculatePressureKpa, CorkPopRuntime, holdingForce } from "./physics";
import type { CorkPopParams } from "./types";

const params: CorkPopParams = {
  heatPower: 50,
  corkTightness: 55,
  gasAmount: 60,
  initialTemperature: 25,
  corkMass: 15,
  showMolecules: true,
  showVelocityVectors: false,
  showCorkForce: false,
  showCorkTrail: true,
  showLabels: true,
  mode: "micro",
  speed: 1,
};

describe("cork pop physics", () => {
  it("pressure and force increase with temperature", () => {
    const cool = calculatePressureKpa(298, params);
    const hot = calculatePressureKpa(500, params);
    expect(hot).toBeGreaterThan(cool);
    expect(calculateForce(hot)).toBeGreaterThan(calculateForce(cool));
  });

  it("starts below the holding threshold", () => {
    const runtime = new CorkPopRuntime(params);
    const snapshot = runtime.snapshot();
    expect(snapshot.popped).toBe(false);
    expect(snapshot.force).toBeLessThan(holdingForce(params) + (params.corkMass / 1000) * 9.81);
  });

  it("pops after receiving enough heat and accumulates work", () => {
    const runtime = new CorkPopRuntime(params);
    let snapshot = runtime.snapshot();
    for (let i = 0; i < 2400 && !snapshot.popped; i += 1) snapshot = runtime.step(1 / 120);
    expect(snapshot.popped).toBe(true);
    const workAtPop = snapshot.work;
    for (let i = 0; i < 120; i += 1) snapshot = runtime.step(1 / 120);
    expect(snapshot.work).toBeGreaterThanOrEqual(workAtPop);
    expect(snapshot.corkPosition).toBeGreaterThan(0);
  });

  it("keeps values finite after a long run", () => {
    const runtime = new CorkPopRuntime(params);
    let snapshot = runtime.snapshot();
    for (let i = 0; i < 6000; i += 1) snapshot = runtime.step(1 / 120);
    expect(Object.values(snapshot).every((value) => typeof value !== "number" || Number.isFinite(value))).toBe(true);
  });
});
