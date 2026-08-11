import {
  HISTORY_SAMPLE_INTERVAL,
  MAX_INDUCTION_HISTORY,
} from "./constants";
import { transitionInduction } from "./state-machine";
import type {
  ElectromagneticInductionMetrics,
  ElectromagneticInductionPhase,
  ElectromagneticInductionScene,
  InductionState,
  VariableCurrentInductionScene,
  VariableCurrentInductionState,
} from "./types";

const EPSILON = 1e-6;
const MAX_DT = 1 / 30;
const FIELD_SCALE_TESLA = 0.018;

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));

function poleOrientation(scene: ElectromagneticInductionScene): 1 | -1 {
  return scene.poleOrientation === -1 ? -1 : 1;
}

/**
 * Educational axial-field profile for a bar magnet. The softened dipole shape
 * keeps the trend finite at the coil centre while retaining the expected rapid
 * falloff with distance. Values are calibrated for visual comparison, not as a
 * measurement model for one particular laboratory magnet.
 */
export function magneticFieldAtCoil(
  scene: ElectromagneticInductionScene,
  magnetX: number,
): number {
  const radius = Math.max(0.08, scene.coilRadius);
  const softened = magnetX * magnetX + radius * radius;
  const profile = Math.pow(radius, 3) / Math.pow(softened, 1.5);
  return poleOrientation(scene) * Math.max(0, scene.magnetStrength) * FIELD_SCALE_TESLA * profile;
}

export function magneticFluxPerTurn(
  scene: ElectromagneticInductionScene,
  magnetX: number,
): number {
  const area = Math.PI * Math.max(0.08, scene.coilRadius) ** 2;
  return magneticFieldAtCoil(scene, magnetX) * area;
}

/** Total flux linkage NΦ through the coil, in educational SI-scaled units. */
export function magneticFlux(
  scene: ElectromagneticInductionScene,
  magnetX: number,
): number {
  return Math.max(1, scene.turns) * magneticFluxPerTurn(scene, magnetX);
}

export function initialInductionState(
  scene: ElectromagneticInductionScene,
  magnetX = scene.magnetStartX,
): InductionState {
  const fluxPerTurn = magneticFluxPerTurn(scene, magnetX);
  const fluxLinkage = Math.max(1, scene.turns) * fluxPerTurn;
  return {
    phase: "idle",
    phaseBeforePause: "idle",
    elapsed: 0,
    magnetX,
    magnetVelocity: 0,
    needle: 0,
    needleVelocity: 0,
    previousFlux: fluxLinkage,
    fluxPerTurn,
    fluxLinkage,
    fluxRate: 0,
    emf: 0,
    current: 0,
    inducedFieldDirection: 0,
    peakEmf: 0,
    peakCurrent: 0,
    history: [{ time: 0, magnetX, fluxLinkage, emf: 0, current: 0 }],
    events: [],
  };
}

function phaseForMotion(
  scene: ElectromagneticInductionScene,
  previousX: number,
  magnetX: number,
  velocity: number,
): ElectromagneticInductionPhase {
  if (Math.abs(velocity) < 0.008) return "stationary";
  const radius = Math.max(0.08, scene.coilRadius);
  if (Math.abs(magnetX) < radius * 0.16) return "centered";
  const approaching = Math.abs(magnetX) < Math.abs(previousX);
  if (!approaching) return "leaving";
  return Math.abs(magnetX) < radius * 1.65 ? "entering" : "approaching";
}

export function stepInduction(
  scene: ElectromagneticInductionScene,
  state: InductionState,
  magnetX: number,
  rawDt: number,
): InductionState {
  if (!Number.isFinite(rawDt) || rawDt <= EPSILON) return state;
  const dt = clamp(rawDt, 1 / 600, MAX_DT);
  const safeX = clamp(magnetX, -4, 4);
  const maxSpeed = Math.max(0.5, scene.maxMagnetSpeed ?? 6);
  const magnetVelocity = clamp((safeX - state.magnetX) / dt, -maxSpeed, maxSpeed);
  const fluxPerTurn = magneticFluxPerTurn(scene, safeX);
  const fluxLinkage = Math.max(1, scene.turns) * fluxPerTurn;
  const fluxRate = (fluxLinkage - state.previousFlux) / dt;
  const emf = -fluxRate;
  const current = emf / Math.max(scene.resistance, EPSILON);
  const targetNeedle = clamp(current * scene.meterSensitivity, -1, 1);
  const acceleration = 34 * (targetNeedle - state.needle) - Math.max(1, scene.meterDamping) * state.needleVelocity;
  const needleVelocity = clamp(state.needleVelocity + acceleration * dt, -7, 7);
  const needle = clamp(state.needle + needleVelocity * dt, -1.05, 1.05);
  const next: InductionState = {
    ...state,
    elapsed: state.elapsed + dt,
    magnetX: safeX,
    magnetVelocity,
    needle,
    needleVelocity,
    previousFlux: fluxLinkage,
    fluxPerTurn,
    fluxLinkage,
    fluxRate,
    emf,
    current,
    inducedFieldDirection: Math.abs(current) < 1e-5 ? 0 : current > 0 ? 1 : -1,
    peakEmf: Math.max(state.peakEmf, Math.abs(emf)),
    peakCurrent: Math.max(state.peakCurrent, Math.abs(current)),
    history: state.history,
    events: state.events,
  };

  transitionInduction(next, phaseForMotion(scene, state.magnetX, safeX, magnetVelocity));
  const latestSample = next.history.at(-1);
  if (!latestSample || next.elapsed - latestSample.time >= HISTORY_SAMPLE_INTERVAL) {
    next.history = [
      ...next.history,
      { time: next.elapsed, magnetX: safeX, fluxLinkage, emf, current },
    ].slice(-MAX_INDUCTION_HISTORY);
  }
  return next;
}

export function inductionMetrics(
  state: InductionState,
): ElectromagneticInductionMetrics {
  return {
    phase: state.phase,
    elapsed: state.elapsed,
    magnetX: state.magnetX,
    magnetVelocity: state.magnetVelocity,
    fluxPerTurn: state.fluxPerTurn,
    fluxLinkage: state.fluxLinkage,
    fluxRate: state.fluxRate,
    emf: state.emf,
    current: state.current,
    needle: state.needle,
    inducedFieldDirection: state.inducedFieldDirection,
    peakEmf: state.peakEmf,
    peakCurrent: state.peakCurrent,
    history: state.history.map((point) => ({ ...point })),
    events: state.events.map((event) => ({ ...event })),
  };
}

export function peakCircuitCurrent(
  scene: VariableCurrentInductionScene,
  switchClosed: boolean,
): number {
  if (!switchClosed) return 0;
  return scene.peakVoltage / Math.max(scene.resistance, EPSILON);
}

export function initialVariableCurrentState(
  scene: VariableCurrentInductionScene,
): VariableCurrentInductionState {
  return { elapsed: 0, voltage: 0, current: 0, resistance: scene.resistance, phase: 0 };
}

export function stepVariableCurrentInduction(
  scene: VariableCurrentInductionScene,
  state: VariableCurrentInductionState,
  switchClosed: boolean,
  rawDt: number,
): VariableCurrentInductionState {
  if (!Number.isFinite(rawDt) || rawDt <= EPSILON) return state;
  const dt = clamp(rawDt, 1 / 600, MAX_DT);
  const elapsed = state.elapsed + dt;
  const phase = (elapsed * scene.frequency) % 1;
  const resistance = scene.resistance;
  const voltage = switchClosed
    ? scene.peakVoltage * Math.sin(Math.PI * 2 * phase)
    : 0;
  const current = voltage / Math.max(resistance, EPSILON);
  return { elapsed, voltage, current, resistance, phase };
}
