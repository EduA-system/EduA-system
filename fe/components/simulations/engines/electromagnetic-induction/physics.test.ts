import { describe, expect, it } from "vitest";
import {
  initialInductionState,
  initialVariableCurrentState,
  magneticFlux,
  primaryCircuitCurrent,
  stepInduction,
  stepVariableCurrentInduction,
} from "./physics";
import type { ElectromagneticInductionScene, VariableCurrentInductionScene } from "./types";

const scene: ElectromagneticInductionScene = {
  kind: "electromagnetic-induction",
  coilX: 0,
  coilY: 0,
  coilRadius: 0.42,
  turns: 80,
  resistance: 6,
  magnetStartX: 2.35,
  magnetStrength: 1.2,
  meterSensitivity: 0.42,
  meterDamping: 8,
};

describe("electromagnetic induction", () => {
  it("has no emf while the magnet is stationary", () => {
    const state = initialInductionState(scene, 2);
    expect(stepInduction(scene, state, 2, 0.02).emf).toBeCloseTo(0);
  });

  it("has symmetric flux on the two sides of the coil", () => {
    expect(magneticFlux(scene, -0.8)).toBeCloseTo(magneticFlux(scene, 0.8));
  });

  it("reverses emf after the magnet passes through the coil center", () => {
    const before = initialInductionState(scene, 0.8);
    const entering = stepInduction(scene, before, 0, 0.02);
    const leaving = stepInduction(scene, entering, -0.8, 0.02);
    expect(entering.emf).toBeLessThan(0);
    expect(leaving.emf).toBeGreaterThan(0);
  });

  it("increases emf with more turns and decreases current with more resistance", () => {
    const base = stepInduction(scene, initialInductionState(scene, 1.2), 1, 0.02);
    const doubledTurnsScene = { ...scene, turns: 160 };
    const doubled = stepInduction(doubledTurnsScene, initialInductionState(doubledTurnsScene, 1.2), 1, 0.02);
    const doubledResistanceScene = { ...scene, resistance: 12 };
    const resisted = stepInduction(doubledResistanceScene, initialInductionState(doubledResistanceScene, 1.2), 1, 0.02);
    expect(Math.abs(doubled.emf)).toBeCloseTo(Math.abs(base.emf) * 2);
    expect(Math.abs(resisted.current)).toBeCloseTo(Math.abs(base.current) / 2);
  });
});

const variableScene: VariableCurrentInductionScene = {
  kind: "variable-current-induction",
  supplyVoltage: 6,
  primaryResistance: 4,
  rheostatMaxResistance: 24,
  primaryTurns: 260,
  secondaryTurns: 320,
  coupling: 0.09,
  currentTimeConstant: 0.055,
  meterSensitivity: 34,
  meterDamping: 9,
};

describe("variable current induction", () => {
  it("creates opposite induced emf when closing and opening switch K", () => {
    const closing = stepVariableCurrentInduction(variableScene, initialVariableCurrentState(), true, 0.5, 0.02);
    let settled = closing;
    for (let i = 0; i < 80; i += 1) {
      settled = stepVariableCurrentInduction(variableScene, settled, true, 0.5, 0.02);
    }
    const opening = stepVariableCurrentInduction(variableScene, settled, false, 0.5, 0.02);
    expect(closing.inducedEmf).toBeLessThan(0);
    expect(opening.inducedEmf).toBeGreaterThan(0);
  });

  it("reduces primary current when the rheostat resistance increases", () => {
    const lowResistance = primaryCircuitCurrent(variableScene, true, 0.1);
    const highResistance = primaryCircuitCurrent(variableScene, true, 0.9);
    expect(highResistance).toBeLessThan(lowResistance);
  });

  it("returns induced emf to zero after primary current becomes stable", () => {
    let state = initialVariableCurrentState();
    for (let i = 0; i < 120; i += 1) {
      state = stepVariableCurrentInduction(variableScene, state, true, 0.5, 0.02);
    }
    expect(state.inducedEmf).toBeCloseTo(0, 5);
  });
});
