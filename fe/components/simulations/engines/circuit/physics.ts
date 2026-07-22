import {
  CURRENT_FALL_TAU,
  CURRENT_RISE_TAU,
  MAX_ACCELERATION_MS2,
  MAX_CURRENT_A,
  MAX_DISPLACEMENT_M,
  MAX_FORCE_N,
  MAX_VELOCITY_MS,
  MINIMUM_GAP_M,
} from "./constants";
import type {
  ElectricBellEventType,
  ElectricBellParams,
  ElectricBellPhase,
  ElectricBellSnapshot,
  ElectricBellState,
} from "./types";

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, Number.isFinite(value) ? value : 0));
const emit = (state: ElectricBellState, type: ElectricBellEventType) => {
  state.eventSerial += 1;
  state.lastEvent = { id: state.eventSerial, type, time: state.time };
};

export function createElectricBellState(): ElectricBellState {
  return {
    time: 0,
    phase: "idle",
    current: 0,
    fieldRelative: 0,
    magneticForce: 0,
    springForce: 0,
    displacement: 0,
    velocity: 0,
    contactClosed: true,
    strikeCount: 0,
    lastStrikeTime: -10,
    strikeFrequency: 0,
    bellImpulse: 0,
    eventSerial: 0,
    lastEvent: null,
  };
}

function derivePhase(
  state: ElectricBellState,
  params: ElectricBellParams,
): ElectricBellPhase {
  if (!params.masterSwitchClosed) return "idle";
  if (!state.contactClosed)
    return state.current > 0.08
      ? "demagnetizing"
      : state.velocity < 0
        ? "armatureReturning"
        : "circuitOpen";
  if (state.displacement >= params.bellDistanceMm / 1000)
    return "hammerStriking";
  if (state.displacement >= (params.contactPositionMm / 1000) * 0.82)
    return "contactOpening";
  if (state.current < 0.1) return "circuitClosed";
  if (state.fieldRelative < 1.1) return "magnetizing";
  if (state.velocity > 0.01) return "armatureAttracting";
  return "contactClosing";
}

export function stepElectricBell(
  state: ElectricBellState,
  params: ElectricBellParams,
  dt: number,
): ElectricBellState {
  const h = clamp(dt, 1 / 1200, 1 / 60);
  state.time += h;
  const resistance = Math.max(
    0.2,
    params.coilResistance + params.wireResistance,
  );
  const energized = params.masterSwitchClosed && state.contactClosed;
  const targetCurrent = energized
    ? clamp(params.voltage / resistance, 0, MAX_CURRENT_A)
    : 0;
  const tau = energized ? CURRENT_RISE_TAU : CURRENT_FALL_TAU;
  state.current += (targetCurrent - state.current) * (1 - Math.exp(-h / tau));
  state.current = clamp(state.current, 0, MAX_CURRENT_A);

  const signedCurrent = state.current * params.polarity;
  state.fieldRelative = clamp(
    (params.magneticCoefficient * params.turns * signedCurrent) /
      Math.max(0.015, params.coilLength),
    -20,
    20,
  );
  const remainingGap = Math.max(0, params.gapMm / 1000 - state.displacement);
  state.magneticForce = clamp(
    (params.forceCoefficient * (params.turns * state.current) ** 2) /
      (remainingGap + MINIMUM_GAP_M) ** 2,
    0,
    MAX_FORCE_N,
  );
  state.springForce = -Math.max(10, params.springConstant) * state.displacement;
  const mass = Math.max(0.008, params.massGrams / 1000);
  const acceleration = clamp(
    (state.magneticForce +
      state.springForce -
      Math.max(0, params.damping) * state.velocity) /
      mass,
    -MAX_ACCELERATION_MS2,
    MAX_ACCELERATION_MS2,
  );
  state.velocity = clamp(
    state.velocity + acceleration * h,
    -MAX_VELOCITY_MS,
    MAX_VELOCITY_MS,
  );
  state.displacement = clamp(
    state.displacement + state.velocity * h,
    0,
    MAX_DISPLACEMENT_M,
  );
  if (state.displacement <= 0 && state.velocity < 0) state.velocity = 0;

  const openThreshold = clamp(params.contactPositionMm / 1000, 0.0025, 0.011);
  const closeThreshold = Math.max(0.001, openThreshold - 0.0007);
  if (!params.masterSwitchClosed) state.contactClosed = false;
  else if (state.contactClosed && state.displacement >= openThreshold) {
    state.contactClosed = false;
    emit(state, "contact-open");
  } else if (!state.contactClosed && state.displacement <= closeThreshold) {
    state.contactClosed = true;
    emit(state, "contact-close");
  }

  const strikeThreshold = clamp(params.bellDistanceMm / 1000, 0.003, 0.0125);
  if (
    state.displacement >= strikeThreshold &&
    state.velocity > 0.035 &&
    state.time - state.lastStrikeTime > 0.075
  ) {
    const interval = state.time - state.lastStrikeTime;
    state.strikeCount += 1;
    if (state.lastStrikeTime >= 0)
      state.strikeFrequency = clamp(1 / interval, 0, 30);
    state.lastStrikeTime = state.time;
    state.bellImpulse = clamp(Math.abs(state.velocity), 0.15, 1);
    state.velocity *= -0.18;
    emit(state, "strike");
  }
  state.bellImpulse *= Math.exp(-h * 8);
  state.phase = derivePhase(state, params);
  return state;
}

export function electricBellSnapshot(
  state: ElectricBellState,
  params: ElectricBellParams,
): ElectricBellSnapshot {
  return {
    ...state,
    gapCurrentMm: Math.max(0, params.gapMm - state.displacement * 1000),
    currentDirection: params.polarity,
  };
}
