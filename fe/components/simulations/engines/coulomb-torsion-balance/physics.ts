import {
  COULOMB_CONSTANT,
  MAX_NEEDLE_ANGLE,
  MIN_NEEDLE_ANGLE,
  SPHERE_DIAMETER_METERS,
} from "./constants";
import {
  pauseTorsionState,
  resumeTorsionState,
  transitionTorsionPhase,
} from "./state-machine";
import type {
  TorsionBalanceCommand,
  TorsionBalanceForces,
  TorsionBalanceMetrics,
  TorsionBalanceParams,
  TorsionBalanceState,
  TorsionBalanceStepResult,
  TorsionHistoryPoint,
} from "./types";

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));

const smoothStep = (value: number) => {
  const t = clamp(value, 0, 1);
  return t * t * (3 - 2 * t);
};

function fixedSphereAngle(params: TorsionBalanceParams): number {
  const arm = Math.max(0.06, params.armLength / 100);
  const distance = clamp(params.initialSeparation / 100, 0.018, arm * 1.75);
  return -2 * Math.asin(clamp(distance / (2 * arm), 0.02, 0.88));
}

export function createTorsionBalanceState(): TorsionBalanceState {
  return {
    phase: "idle",
    resumePhase: "idle",
    time: 0,
    phaseTime: 0,
    angle: -0.08,
    angularVelocity: 0,
    dialAngle: 0,
    chargeProgress: 0,
    probeProgress: 0,
    releaseProgress: 0,
    equilibriumHold: 0,
    history: [],
    events: [],
  };
}

export function calculateTorsionForces(
  state: TorsionBalanceState,
  params: TorsionBalanceParams,
): TorsionBalanceForces {
  const arm = clamp(params.armLength / 100, 0.06, 0.2);
  const fixedAngle = fixedSphereAngle(params);
  const movingPosition = {
    x: arm * Math.cos(state.angle),
    y: arm * Math.sin(state.angle),
  };
  const fixedPosition = {
    x: arm * Math.cos(fixedAngle),
    y: arm * Math.sin(fixedAngle),
  };
  const dx = movingPosition.x - fixedPosition.x;
  const dy = movingPosition.y - fixedPosition.y;
  const rawDistance = Math.hypot(dx, dy);
  const distance = Math.max(SPHERE_DIAMETER_METERS, rawDistance);
  const chargeFade = Math.pow(clamp(params.chargeRetention / 100, 0.2, 1), state.time / 18);
  const q1 = params.movingCharge * 1e-9 * state.chargeProgress * chargeFade;
  const q2 = params.fixedCharge * 1e-9 * state.chargeProgress * chargeFade;
  const product = q1 * q2;
  const forceSigned = product === 0 ? 0 : (COULOMB_CONSTANT * product) / (distance * distance);
  const invDistance = 1 / Math.max(distance, 1e-6);
  const forceX = forceSigned * dx * invDistance;
  const forceY = forceSigned * dy * invDistance;
  const electricTorque = movingPosition.x * forceY - movingPosition.y * forceX;
  const kappa = clamp(params.torsionConstant, 60, 650) * 1e-9;
  const torsionTorque = -kappa * (state.angle - state.dialAngle);
  const dampingCoefficient = (1.6e-8 + clamp(params.damping, 0, 100) * 1.35e-9);
  const dampingTorque = -dampingCoefficient * state.angularVelocity;
  return {
    distance,
    force: Math.abs(forceSigned),
    forceSigned,
    electricTorque,
    torsionTorque,
    dampingTorque,
    netTorque: electricTorque + torsionTorque + dampingTorque,
    movingPosition,
    fixedPosition,
  };
}

function appendHistory(
  state: TorsionBalanceState,
  forces: TorsionBalanceForces,
): TorsionHistoryPoint[] {
  const previous = state.history[state.history.length - 1];
  if (previous && state.time - previous.time < 0.075) return state.history;
  const point: TorsionHistoryPoint = {
    time: state.time,
    angle: (state.angle * 180) / Math.PI,
    distance: forces.distance * 100,
    force: forces.force * 1e6,
    electricTorque: forces.electricTorque * 1e9,
    torsionTorque: forces.torsionTorque * 1e9,
  };
  return [...state.history.slice(-359), point];
}

function integrateNeedle(
  state: TorsionBalanceState,
  params: TorsionBalanceParams,
  dt: number,
): TorsionBalanceState {
  const substeps = Math.max(1, Math.ceil(dt / 0.008));
  const step = dt / substeps;
  let angle = state.angle;
  let angularVelocity = state.angularVelocity;
  for (let index = 0; index < substeps; index += 1) {
    const sample = { ...state, angle, angularVelocity };
    const forces = calculateTorsionForces(sample, params);
    const sensitivity = clamp(params.instrumentSensitivity / 100, 0.35, 1.25);
    const momentOfInertia = 2.4e-8 / sensitivity;
    const angularAcceleration = clamp(forces.netTorque / momentOfInertia, -28, 28);
    angularVelocity = clamp(angularVelocity + angularAcceleration * step, -5, 5);
    const arm = clamp(params.armLength / 100, 0.06, 0.2);
    const contactOffset = 2 * Math.asin(
      clamp(SPHERE_DIAMETER_METERS / (2 * arm), 0.01, 0.5),
    );
    const contactAngle = fixedSphereAngle(params) + contactOffset;
    angle = clamp(
      angle + angularVelocity * step,
      Math.max(MIN_NEEDLE_ANGLE, contactAngle),
      MAX_NEEDLE_ANGLE,
    );
    if (angle <= contactAngle + 1e-5 && angularVelocity < 0) {
      angularVelocity *= -0.08;
    }
    if (angle === MIN_NEEDLE_ANGLE || angle === MAX_NEEDLE_ANGLE) {
      angularVelocity *= -0.16;
    }
  }
  return { ...state, angle, angularVelocity };
}

export function applyTorsionCommand(
  state: TorsionBalanceState,
  command: TorsionBalanceCommand,
): TorsionBalanceState {
  if (command === "pause") return pauseTorsionState(state);
  if (command === "resume") return resumeTorsionState(state);
  if (state.phase === "paused") return resumeTorsionState(state);
  if (state.phase === "idle" || state.phase === "complete") {
    return transitionTorsionPhase(createTorsionBalanceState(), "zeroing");
  }
  return state;
}

export function stepTorsionBalance(
  input: TorsionBalanceState,
  params: TorsionBalanceParams,
  rawDelta: number,
): TorsionBalanceStepResult {
  if (input.phase === "idle" || input.phase === "paused" || input.phase === "complete") {
    return { state: input, completed: input.phase === "complete" };
  }
  const dt = clamp(rawDelta, 0, 0.05);
  let state: TorsionBalanceState = {
    ...input,
    time: input.time + dt,
    phaseTime: input.phaseTime + dt,
  };

  if (state.phase === "zeroing") {
    const amount = smoothStep(state.phaseTime / 0.65);
    state = {
      ...state,
      angle: state.angle * (1 - amount),
      angularVelocity: 0,
      probeProgress: 0,
    };
    if (amount >= 0.999) state = transitionTorsionPhase(state, "charging");
  } else if (state.phase === "charging") {
    const chargeProgress = smoothStep(state.phaseTime / 1.25);
    const probeProgress = Math.sin(Math.PI * clamp(state.phaseTime / 1.25, 0, 1));
    state = { ...state, chargeProgress, probeProgress };
    if (chargeProgress >= 0.999) state = transitionTorsionPhase(state, "releasing");
  } else if (state.phase === "releasing") {
    const releaseProgress = smoothStep(state.phaseTime / 0.42);
    state = { ...state, releaseProgress, probeProgress: 0 };
    if (releaseProgress >= 0.999) state = transitionTorsionPhase(state, "oscillating");
  } else if (state.phase === "oscillating" || state.phase === "settling") {
    state = integrateNeedle(state, params, dt);
    const forces = calculateTorsionForces(state, params);
    const torqueError = Math.abs(forces.electricTorque + forces.torsionTorque);
    const quiet = Math.abs(state.angularVelocity) < 0.018 && torqueError < 2.4e-9;
    state = {
      ...state,
      equilibriumHold: quiet ? state.equilibriumHold + dt : 0,
      history: appendHistory(state, forces),
    };
    if (state.phase === "oscillating" && (state.phaseTime > 1.5 || Math.abs(state.angularVelocity) < 0.09)) {
      state = transitionTorsionPhase(state, "settling");
    } else if (
      state.phase === "settling" &&
      (state.equilibriumHold > 0.55 || state.phaseTime > 10)
    ) {
      state = transitionTorsionPhase(state, "measuring");
    }
  } else if (state.phase === "measuring") {
    const forces = calculateTorsionForces(state, params);
    state = { ...state, history: appendHistory(state, forces) };
    if (state.phaseTime > 0.9) state = transitionTorsionPhase(state, "complete");
  }

  return { state, completed: state.phase === "complete" };
}

export function torsionBalanceMetrics(
  state: TorsionBalanceState,
  params: TorsionBalanceParams,
): TorsionBalanceMetrics {
  const forces = calculateTorsionForces(state, params);
  const product = params.movingCharge * params.fixedCharge;
  return {
    phase: state.phase,
    time: state.time,
    angleDegrees: (state.angle * 180) / Math.PI,
    angularVelocityDegrees: (state.angularVelocity * 180) / Math.PI,
    twistDegrees: ((state.angle - state.dialAngle) * 180) / Math.PI,
    separationCm: forces.distance * 100,
    forceMicroN: forces.force * 1e6,
    electricTorqueNanoNm: forces.electricTorque * 1e9,
    torsionTorqueNanoNm: forces.torsionTorque * 1e9,
    chargePercent: state.chargeProgress * 100,
    interaction: product > 0 ? "repulsion" : product < 0 ? "attraction" : "neutral",
    equilibriumError: Math.abs(forces.electricTorque + forces.torsionTorque) * 1e9,
    history: state.history,
    events: state.events,
  };
}

export function theoreticalForceMicroN(
  q1NanoC: number,
  q2NanoC: number,
  distanceCm: number,
): number {
  const distance = Math.max(0.016, distanceCm / 100);
  return (
    (COULOMB_CONSTANT * Math.abs(q1NanoC * q2NanoC) * 1e-18) /
    (distance * distance) *
    1e6
  );
}
