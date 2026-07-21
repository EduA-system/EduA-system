import type {
  ElectromagneticInductionScene,
  InductionState,
  VariableCurrentInductionScene,
  VariableCurrentInductionState,
} from "./types";

const EPSILON = 1e-6;

export function magneticFlux(scene: ElectromagneticInductionScene, magnetX: number) {
  const distance = magnetX - scene.coilX;
  const softened = distance * distance + scene.coilRadius * scene.coilRadius;
  const field = scene.magnetStrength / Math.pow(softened, 1.5);
  const area = Math.PI * scene.coilRadius * scene.coilRadius;
  return scene.turns * area * field;
}

export function initialInductionState(scene: ElectromagneticInductionScene, magnetX = scene.magnetStartX): InductionState {
  return { needle: 0, needleVelocity: 0, previousFlux: magneticFlux(scene, magnetX), emf: 0, current: 0 };
}

export function stepInduction(scene: ElectromagneticInductionScene, state: InductionState, magnetX: number, dt: number): InductionState {
  if (dt <= EPSILON) return state;
  const flux = magneticFlux(scene, magnetX);
  const emf = -(flux - state.previousFlux) / dt;
  const current = emf / Math.max(scene.resistance, EPSILON);
  const target = Math.max(-1, Math.min(1, current * scene.meterSensitivity));
  const acceleration = 32 * (target - state.needle) - scene.meterDamping * state.needleVelocity;
  const needleVelocity = state.needleVelocity + acceleration * dt;
  const needle = Math.max(-1.05, Math.min(1.05, state.needle + needleVelocity * dt));
  return { needle, needleVelocity, previousFlux: flux, emf, current };
}

export function primaryCircuitCurrent(
  scene: VariableCurrentInductionScene,
  switchClosed: boolean,
  rheostatFraction: number,
) {
  if (!switchClosed) return 0;
  const fraction = Math.max(0, Math.min(1, rheostatFraction));
  const resistance = scene.primaryResistance + fraction * scene.rheostatMaxResistance;
  return scene.supplyVoltage / Math.max(resistance, EPSILON);
}

export function initialVariableCurrentState(): VariableCurrentInductionState {
  return { primaryCurrent: 0, inducedEmf: 0, needle: 0, needleVelocity: 0 };
}

export function stepVariableCurrentInduction(
  scene: VariableCurrentInductionScene,
  state: VariableCurrentInductionState,
  switchClosed: boolean,
  rheostatFraction: number,
  dt: number,
): VariableCurrentInductionState {
  if (dt <= EPSILON) return state;
  const targetCurrent = primaryCircuitCurrent(scene, switchClosed, rheostatFraction);
  const tau = Math.max(scene.currentTimeConstant, EPSILON);
  const alpha = 1 - Math.exp(-dt / tau);
  const primaryCurrent = state.primaryCurrent + (targetCurrent - state.primaryCurrent) * alpha;
  const currentRate = (primaryCurrent - state.primaryCurrent) / dt;
  const mutualInductance = scene.coupling * scene.primaryTurns * scene.secondaryTurns * 1e-6;
  const inducedEmf = -mutualInductance * currentRate;
  const targetNeedle = Math.max(-1, Math.min(1, inducedEmf * scene.meterSensitivity));
  const acceleration = 38 * (targetNeedle - state.needle) - scene.meterDamping * state.needleVelocity;
  const needleVelocity = state.needleVelocity + acceleration * dt;
  const needle = Math.max(-1.05, Math.min(1.05, state.needle + needleVelocity * dt));
  return { primaryCurrent, inducedEmf, needle, needleVelocity };
}
