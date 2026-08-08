import {
  SCREEN_DIVISIONS_X,
  SOUND_SPEED,
} from "./constants";
import {
  pauseOscilloscopeState,
  resumeOscilloscopeState,
  transitionOscilloscopePhase,
} from "./state-machine";
import type {
  OscilloscopeCommand,
  OscilloscopeFrequencyParams,
  OscilloscopeMetrics,
  OscilloscopeSample,
  OscilloscopeState,
  OscilloscopeStepResult,
} from "./types";

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));

const smoothStep = (value: number) => {
  const t = clamp(value, 0, 1);
  return t * t * (3 - 2 * t);
};

export function createOscilloscopeState(): OscilloscopeState {
  return {
    phase: "idle",
    resumePhase: "idle",
    time: 0,
    phaseTime: 0,
    envelope: 0,
    strikeProgress: 0,
    propagationProgress: 0,
    acquiredCycles: 0,
    sweepProgress: 0,
    events: [],
  };
}

export function signalAmplitude(
  state: OscilloscopeState,
  params: OscilloscopeFrequencyParams,
): number {
  const source = clamp(params.sourceAmplitude / 100, 0, 1);
  const distance = clamp(params.microphoneDistance, 5, 80);
  const distanceFactor = 1 / (1 + Math.pow(distance / 38, 1.25));
  const gain = clamp(params.microphoneGain / 100, 0, 2);
  return clamp(2.1 * source * distanceFactor * gain * sourceEnvelope(state, params), 0, 4.5);
}

export function sourceEnvelope(
  state: OscilloscopeState,
  params: OscilloscopeFrequencyParams,
): number {
  const elapsed = Math.max(0, state.time - 1.2);
  const dampingDepth = clamp(params.damping / 100, 0, 0.8) * 0.65;
  const steadyFactor = 1 - dampingDepth * (1 - Math.exp(-elapsed / 2.2));
  return clamp(state.envelope * steadyFactor, 0, 1);
}

export function oscilloscopeSignalAt(
  timeSeconds: number,
  amplitudeVolts: number,
  params: OscilloscopeFrequencyParams,
): number {
  const frequency = clamp(params.frequency, 40, 2000);
  const noiseLevel = clamp(params.noise / 100, 0, 0.35);
  const fundamental = Math.sin(Math.PI * 2 * frequency * timeSeconds);
  const harmonic = 0.035 * Math.sin(Math.PI * 2 * frequency * 2 * timeSeconds + 0.7);
  const noise = noiseLevel * (
    0.42 * Math.sin(Math.PI * 2 * 1733 * timeSeconds + 1.1) +
    0.28 * Math.sin(Math.PI * 2 * 2711 * timeSeconds + 2.4)
  );
  return amplitudeVolts * (fundamental + harmonic + noise);
}

export function buildOscilloscopeSamples(
  state: OscilloscopeState,
  params: OscilloscopeFrequencyParams,
  count = 180,
): OscilloscopeSample[] {
  const visibleTimeMs = clamp(params.timePerDivision, 0.1, 5) * SCREEN_DIVISIONS_X;
  const amplitude = signalAmplitude(state, params);
  const startSeconds = Math.max(0, state.time - visibleTimeMs / 1000);
  return Array.from({ length: count }, (_, index) => {
    const ratio = index / Math.max(1, count - 1);
    const timeMs = ratio * visibleTimeMs;
    return {
      timeMs,
      voltage: oscilloscopeSignalAt(startSeconds + timeMs / 1000, amplitude, params),
    };
  });
}

export function cursorMeasurement(params: OscilloscopeFrequencyParams) {
  const frequency = clamp(params.frequency, 40, 2000);
  const periodMs = 1000 / frequency;
  const visibleTimeMs = clamp(params.timePerDivision, 0.1, 5) * SCREEN_DIVISIONS_X;
  const cursorCycles = clamp(Math.floor((visibleTimeMs * 0.8) / periodMs), 0, 6);
  const cursorDeltaMs = cursorCycles * periodMs;
  const cursorStartMs = Math.max(0, (visibleTimeMs - cursorDeltaMs) / 2);
  return {
    periodMs,
    visibleTimeMs,
    cursorCycles,
    cursorDeltaMs,
    cursorStartMs,
    cursorEndMs: cursorStartMs + cursorDeltaMs,
  };
}

export function applyOscilloscopeCommand(
  state: OscilloscopeState,
  command: OscilloscopeCommand,
): OscilloscopeState {
  if (command === "pause") return pauseOscilloscopeState(state);
  if (command === "resume") return resumeOscilloscopeState(state);
  if (state.phase === "paused") return resumeOscilloscopeState(state);
  if (state.phase === "idle" || state.phase === "complete" || state.phase === "noSignal" || state.phase === "invalidTimebase") {
    return transitionOscilloscopePhase(createOscilloscopeState(), "exciting");
  }
  return state;
}

export function stepOscilloscope(
  input: OscilloscopeState,
  params: OscilloscopeFrequencyParams,
  rawDelta: number,
): OscilloscopeStepResult {
  if (input.phase === "idle" || input.phase === "paused" || input.phase === "complete") {
    return { state: input, completed: input.phase === "complete" };
  }
  const dt = clamp(rawDelta, 0, 0.05);
  let state: OscilloscopeState = {
    ...input,
    time: input.time + dt,
    phaseTime: input.phaseTime + dt,
    sweepProgress: (input.sweepProgress + dt * 0.42) % 1,
  };

  if (state.phase === "exciting") {
    const strikeProgress = clamp(state.phaseTime / 1.05, 0, 1);
    const impactProgress = clamp((strikeProgress - 0.42) / 0.24, 0, 1);
    state = {
      ...state,
      strikeProgress,
      envelope: smoothStep(impactProgress),
    };
    if (strikeProgress >= 0.999) state = transitionOscilloscopePhase(state, "vibrating");
  } else if (state.phase === "vibrating") {
    state = { ...state, envelope: 1 };
    if (state.phaseTime > 0.36) state = transitionOscilloscopePhase(state, "propagating");
  } else if (state.phase === "propagating") {
    const physicalDelay = (clamp(params.microphoneDistance, 5, 80) / 100) / SOUND_SPEED;
    const visualDelay = 0.55 + physicalDelay * 45;
    const propagationProgress = smoothStep(state.phaseTime / visualDelay);
    state = { ...state, envelope: 1, propagationProgress };
    if (propagationProgress >= 0.999) state = transitionOscilloscopePhase(state, "transducing");
  } else if (state.phase === "transducing") {
    const amplitude = signalAmplitude(state, params);
    const acquiredCycles = state.acquiredCycles + clamp(params.frequency, 40, 2000) * dt;
    state = { ...state, envelope: 1, propagationProgress: 1, acquiredCycles };
    if (amplitude < 0.035 && state.phaseTime > 0.85) {
      state = transitionOscilloscopePhase(state, "noSignal");
    } else if (cursorMeasurement(params).cursorCycles < 1 && state.phaseTime > 0.85) {
      state = transitionOscilloscopePhase(state, "invalidTimebase");
    } else if (acquiredCycles >= 3 && state.phaseTime > 0.55) {
      state = transitionOscilloscopePhase(state, "measuring");
    }
  } else if (state.phase === "measuring") {
    state = { ...state, envelope: 1, propagationProgress: 1 };
    if (signalAmplitude(state, params) < 0.035) {
      state = transitionOscilloscopePhase(state, "noSignal");
    } else if (cursorMeasurement(params).cursorCycles < 1) {
      state = transitionOscilloscopePhase(state, "invalidTimebase");
    }
  } else if (state.phase === "noSignal") {
    state = {
      ...state,
      envelope: 1,
      propagationProgress: 1,
    };
    if (signalAmplitude(state, params) >= 0.035) {
      state = transitionOscilloscopePhase(
        { ...state, acquiredCycles: 0 },
        cursorMeasurement(params).cursorCycles < 1 ? "invalidTimebase" : "transducing",
      );
    }
  } else if (state.phase === "invalidTimebase") {
    state = { ...state, envelope: 1, propagationProgress: 1 };
    if (signalAmplitude(state, params) < 0.035) {
      state = transitionOscilloscopePhase(state, "noSignal");
    } else if (cursorMeasurement(params).cursorCycles >= 1) {
      state = transitionOscilloscopePhase(
        { ...state, acquiredCycles: 0 },
        "transducing",
      );
    }
  }

  return { state, completed: false };
}

export function oscilloscopeMetrics(
  state: OscilloscopeState,
  params: OscilloscopeFrequencyParams,
): OscilloscopeMetrics {
  const cursor = cursorMeasurement(params);
  const amplitude = signalAmplitude(state, params);
  const measurable =
    amplitude >= 0.035 &&
    cursor.cursorCycles > 0 &&
    (state.phase === "measuring" || state.phase === "complete");
  const noiseBias = clamp(params.noise, 0, 35) * 0.00012;
  return {
    phase: state.phase,
    time: state.time,
    sourceFrequency: params.frequency,
    measuredFrequency: measurable ? params.frequency * (1 + noiseBias) : null,
    periodMs: cursor.periodMs,
    signalAmplitudeVolts: amplitude,
    signalPercent: clamp((amplitude / Math.max(0.01, params.voltsPerDivision * 3.4)) * 100, 0, 100),
    cursorCycles: cursor.cursorCycles,
    cursorDeltaMs: cursor.cursorDeltaMs,
    cursorStartMs: cursor.cursorStartMs,
    cursorEndMs: cursor.cursorEndMs,
    visibleTimeMs: cursor.visibleTimeMs,
    acquiredCycles: state.acquiredCycles,
    samples: buildOscilloscopeSamples(state, params),
    events: state.events,
  };
}
