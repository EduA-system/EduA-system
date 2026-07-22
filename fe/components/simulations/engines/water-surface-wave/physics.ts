import {
  MAX_FIELD_RADIUS_CM,
  PROBE_DISTANCE_CM,
} from "./constants";
import {
  pauseWaterWaveState,
  resumeWaterWaveState,
  transitionWaterWavePhase,
} from "./state-machine";
import type {
  WaterSurfaceWaveParams,
  WaterWaveCommand,
  WaterWaveHistoryPoint,
  WaterWaveMetrics,
  WaterWaveState,
  WaterWaveStepResult,
} from "./types";

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));

const smoothStep = (value: number) => {
  const t = clamp(value, 0, 1);
  return t * t * (3 - 2 * t);
};

export function createWaterWaveState(): WaterWaveState {
  return {
    phase: "idle",
    resumePhase: "idle",
    time: 0,
    phaseTime: 0,
    envelope: 0,
    frontRadius: 0,
    emittedCycles: 0,
    history: [],
    events: [],
  };
}

export function waterWavePeriod(params: WaterSurfaceWaveParams): number {
  return 1 / clamp(params.frequency, 0.2, 10);
}

export function waterWavelength(params: WaterSurfaceWaveParams): number {
  return clamp(params.waveSpeed, 2, 40) / clamp(params.frequency, 0.2, 10);
}

export function waterDisplacementAt(
  distanceCm: number,
  time: number,
  envelope: number,
  params: WaterSurfaceWaveParams,
): number {
  const speed = clamp(params.waveSpeed, 2, 40);
  if (distanceCm > speed * time) return 0;
  const frequency = clamp(params.frequency, 0.2, 10);
  const amplitude = clamp(params.amplitude, 0, 3);
  const attenuation = Math.exp(-clamp(params.damping, 0, 80) * 0.0009 * distanceCm);
  const geometricSpread = 1 / Math.sqrt(1 + distanceCm / 16);
  const retardedTime = time - distanceCm / speed;
  return amplitude * envelope * attenuation * geometricSpread * Math.sin(Math.PI * 2 * frequency * retardedTime);
}

export function crestRadii(
  state: WaterWaveState,
  params: WaterSurfaceWaveParams,
): number[] {
  const wavelength = waterWavelength(params);
  const speed = clamp(params.waveSpeed, 2, 40);
  const leadingRadius = Math.min(MAX_FIELD_RADIUS_CM, speed * Math.max(0, state.time - 0.45));
  const phaseRadius = (speed * Math.max(0, state.time - 0.45)) % wavelength;
  const radii: number[] = [];
  for (let radius = phaseRadius; radius <= leadingRadius; radius += wavelength) {
    if (radius > 0.35) radii.push(radius);
  }
  return radii;
}

function appendHistory(
  state: WaterWaveState,
  params: WaterSurfaceWaveParams,
): WaterWaveHistoryPoint[] {
  const previous = state.history[state.history.length - 1];
  if (previous && state.time - previous.time < 0.045) return state.history;
  const point: WaterWaveHistoryPoint = {
    time: state.time,
    sourceDisplacement: waterDisplacementAt(0, state.time, state.envelope, params),
    probeDisplacement: waterDisplacementAt(PROBE_DISTANCE_CM, state.time, state.envelope, params),
    frontRadius: state.frontRadius,
  };
  return [...state.history.slice(-359), point];
}

export function applyWaterWaveCommand(
  state: WaterWaveState,
  command: WaterWaveCommand,
): WaterWaveState {
  if (command === "pause") return pauseWaterWaveState(state);
  if (command === "resume") return resumeWaterWaveState(state);
  if (state.phase === "paused") return resumeWaterWaveState(state);
  if (state.phase === "idle") {
    return transitionWaterWavePhase(createWaterWaveState(), "starting");
  }
  return state;
}

export function stepWaterWave(
  input: WaterWaveState,
  params: WaterSurfaceWaveParams,
  rawDelta: number,
): WaterWaveStepResult {
  if (input.phase === "idle" || input.phase === "paused") {
    return { state: input, completed: false };
  }
  const dt = clamp(rawDelta, 0, 0.05);
  const speed = clamp(params.waveSpeed, 2, 40);
  let state: WaterWaveState = {
    ...input,
    time: input.time + dt,
    phaseTime: input.phaseTime + dt,
  };

  if (state.phase === "starting") {
    const envelope = smoothStep(state.phaseTime / 0.72);
    state = { ...state, envelope };
    if (envelope >= 0.999) state = transitionWaterWavePhase(state, "emitting");
  } else {
    const waveTime = Math.max(0, state.time - 0.45);
    const frontRadius = Math.min(MAX_FIELD_RADIUS_CM, speed * waveTime);
    state = {
      ...state,
      envelope: 1,
      frontRadius,
      emittedCycles: Math.max(0, waveTime * clamp(params.frequency, 0.2, 10)),
    };
    if (state.phase === "emitting" && state.emittedCycles >= 1) {
      state = transitionWaterWavePhase(state, "propagating");
    } else if (state.phase === "propagating" && frontRadius >= PROBE_DISTANCE_CM) {
      state = transitionWaterWavePhase(state, "reachedProbe");
    } else if (state.phase === "reachedProbe" && state.phaseTime >= waterWavePeriod(params)) {
      state = transitionWaterWavePhase(state, "steady");
    }
  }
  state = { ...state, history: appendHistory(state, params) };
  return { state, completed: false };
}

export function waterWaveMetrics(
  state: WaterWaveState,
  params: WaterSurfaceWaveParams,
): WaterWaveMetrics {
  const frequency = clamp(params.frequency, 0.2, 10);
  const speed = clamp(params.waveSpeed, 2, 40);
  return {
    phase: state.phase,
    time: state.time,
    frequency,
    period: 1 / frequency,
    wavelength: speed / frequency,
    waveSpeed: speed,
    sourceDisplacement: waterDisplacementAt(0, state.time, state.envelope, params),
    probeDisplacement: waterDisplacementAt(PROBE_DISTANCE_CM, state.time, state.envelope, params),
    probeDistance: PROBE_DISTANCE_CM,
    travelTimeToProbe: PROBE_DISTANCE_CM / speed,
    frontRadius: state.frontRadius,
    emittedCycles: state.emittedCycles,
    visibleCrests: crestRadii(state, params).length,
    history: state.history,
    events: state.events,
  };
}
