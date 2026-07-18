import { describe, expect, it } from "vitest";
import {
  BrownianRuntime,
  calculateDiffusionCoefficient,
  calculateEnsembleMSD,
  createSeededRandom,
  diffusionInMicrometersSquaredPerSecond,
  generateGaussianPair,
} from "./physics";
import type { BrownianParams } from "./types";

const baseParams: BrownianParams = {
  temperature: 298,
  viscosity: 0.89,
  radius: 1.8,
  mass: 2,
  moleculeDensity: 120,
  mode: "langevin",
  autoDiffusion: true,
  diffusion: 0.13,
  boundary: "reflect",
  showMolecules: false,
  showTrajectory: true,
  showSamples: false,
  showVelocity: false,
  showRandomForce: false,
  showDragForce: false,
  showGrid: false,
  showLabel: true,
  showRadius: false,
  keepFullPath: false,
  trailLength: 500,
  ensembleRuns: 50,
  seed: 104729,
  speed: 1,
};

describe("Brownian physics", () => {
  it("replays the same Gaussian sequence from the same seed", () => {
    const a = createSeededRandom(1234);
    const b = createSeededRandom(1234);
    for (let i = 0; i < 20; i += 1) expect(generateGaussianPair(a)).toEqual(generateGaussianPair(b));
  });

  it("Gaussian samples have a mean close to zero", () => {
    const random = createSeededRandom(42);
    let sumX = 0;
    let sumY = 0;
    for (let i = 0; i < 10000; i += 1) {
      const [x, y] = generateGaussianPair(random);
      sumX += x;
      sumY += y;
    }
    expect(sumX / 10000).toBeCloseTo(0, 1);
    expect(sumY / 10000).toBeCloseTo(0, 1);
  });

  it("Einstein-Stokes diffusion increases with temperature", () => {
    const low = calculateDiffusionCoefficient(260, 0.89, 1.8);
    const high = calculateDiffusionCoefficient(320, 0.89, 1.8);
    expect(high).toBeGreaterThan(low);
  });

  it("diffusion decreases when viscosity or radius increases", () => {
    const baseline = calculateDiffusionCoefficient(298, 0.89, 1.8);
    expect(calculateDiffusionCoefficient(298, 1.5, 1.8)).toBeLessThan(baseline);
    expect(calculateDiffusionCoefficient(298, 0.89, 3.2)).toBeLessThan(baseline);
    expect(baseline).toBeGreaterThan(0);
  });

  it("manual diffusion stays non-negative", () => {
    expect(diffusionInMicrometersSquaredPerSecond({ ...baseParams, autoDiffusion: false, diffusion: -4 })).toBe(0);
  });

  it("ensemble MSD follows the two-dimensional 4Dt trend", () => {
    const diffusion = 0.4;
    const curve = calculateEnsembleMSD(diffusion, 8, 100, 77, 0.1);
    const last = curve.at(-1)!;
    expect(last.squaredDisplacement / last.time).toBeCloseTo(4 * diffusion, 0);
  });

  it("a seeded runtime stays finite and reflect boundaries keep the pollen inside", () => {
    const runtime = new BrownianRuntime({ width: 600, height: 400, moleculeCount: 120, params: baseParams });
    for (let i = 0; i < 3000; i += 1) {
      const snapshot = runtime.step(baseParams);
      expect(Number.isFinite(snapshot.x)).toBe(true);
      expect(Number.isFinite(snapshot.y)).toBe(true);
      expect(snapshot.x).toBeGreaterThan(-15e-6);
      expect(snapshot.x).toBeLessThan(15e-6);
      expect(snapshot.y).toBeGreaterThan(-10e-6);
      expect(snapshot.y).toBeLessThan(10e-6);
    }
  });

  it("reset starts a replay from the same initial state", () => {
    const first = new BrownianRuntime({ width: 600, height: 400, moleculeCount: 60, params: baseParams });
    const second = new BrownianRuntime({ width: 600, height: 400, moleculeCount: 60, params: baseParams });
    const firstStep = first.step(baseParams);
    const secondStep = second.step(baseParams);
    expect(firstStep.x).toBe(secondStep.x);
    expect(firstStep.y).toBe(secondStep.y);
  });
});
