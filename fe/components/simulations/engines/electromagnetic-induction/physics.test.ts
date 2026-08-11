import { describe, expect, it } from "vitest";
import {
  initialInductionState,
  initialVariableCurrentState,
  magneticFlux,
  peakCircuitCurrent,
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
  frequency: 10,
  peakVoltage: 5,
  resistance: 125,
  graphDuration: 0.6,
  visualTimeScale: 0.42,
};

describe("AC current variation with rheostat and switch K", () => {
  it("keeps voltage and current in phase for a purely resistive circuit", () => {
    const state = stepVariableCurrentInduction(
      variableScene,
      initialVariableCurrentState(variableScene),
      true,
      0.025,
    );
    expect(state.voltage).toBeCloseTo(variableScene.peakVoltage, 5);
    expect(state.current).toBeGreaterThan(0);
    expect(state.current * state.resistance).toBeCloseTo(state.voltage, 5);
  });

  it("reduces peak current when the rheostat resistance increases", () => {
    const lowResistance = peakCircuitCurrent({ ...variableScene, resistance: 75 }, true);
    const highResistance = peakCircuitCurrent({ ...variableScene, resistance: 250 }, true);
    expect(highResistance).toBeLessThan(lowResistance);
  });

  it("sets both measured signals to zero when switch K is open", () => {
    const state = stepVariableCurrentInduction(
      variableScene,
      initialVariableCurrentState(variableScene),
      false,
      0.025,
    );
    expect(state.voltage).toBe(0);
    expect(state.current).toBe(0);
  });
});
