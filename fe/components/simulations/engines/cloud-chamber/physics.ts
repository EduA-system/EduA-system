import {
  DEFAULT_CLOUD_CHAMBER_PARAMS,
  FIXED_STEP,
  MAX_STEP_DT,
  SENSITIVITY_DURATION,
} from "./constants";
import { createAlphaTrack, createCollisionPoint, createProductTracks, moveTrack } from "./particle-tracks";
import { pauseState, resumeState, transitionPhase } from "./state-machine";
import type {
  CloudChamberCommand,
  CloudChamberMetrics,
  CloudChamberParams,
  CloudChamberState,
  CloudChamberStepResult,
  ObservationMode,
  ParticleTrack,
  TrackSegment,
} from "./types";

const finite = (value: number, fallback: number) => Number.isFinite(value) ? value : fallback;
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, finite(value, min)));
const supersaturationFor = (ipaVapor: number, topTemperature: number, baseTemperature: number) =>
  clamp(
    0.45 + ipaVapor * 0.45 + clamp((topTemperature - baseTemperature) / 100, 0, 1.2) * 0.55,
    0.4,
    1.75,
  );

function chooseBlackettEvent(mode: ObservationMode, params: CloudChamberParams): boolean {
  if (mode === "blackett") return true;
  return Math.random() * 100 < clamp(params.naturalReactionProbability, 0, 100);
}

export function createCloudChamberState(
  params: CloudChamberParams = DEFAULT_CLOUD_CHAMBER_PARAMS,
  mode: ObservationMode = "blackett",
): CloudChamberState {
  return {
    phase: "idle",
    resumePhase: "idle",
    time: 0,
    phaseTime: 0,
    topTemperature: clamp(params.topTemperature, 10, 40),
    baseTemperature: clamp(params.topTemperature, 10, 40),
    ipaVapor: 0,
    supersaturation: 0.45,
    sensitivityWindow: 0,
    backgroundFog: 0,
    flash: 0,
    mode,
    isBlackettEvent: false,
    collisionPoint: null,
    tracks: [],
    events: [],
    counters: { alphasEmitted: 0, tracksObserved: 0, reactionsRecorded: 0 },
    hasPhotographed: false,
    hasCompletedCycle: false,
  };
}

function beginCycle(
  state: CloudChamberState,
  params: CloudChamberParams,
  mode: ObservationMode,
): CloudChamberState {
  const prepared: CloudChamberState = {
    ...state,
    phase: "idle",
    resumePhase: "idle",
    time: 0,
    phaseTime: 0,
    topTemperature: params.topTemperature,
    baseTemperature: params.topTemperature,
    ipaVapor: 0,
    supersaturation: 0.45,
    sensitivityWindow: 0,
    backgroundFog: 0,
    flash: 0,
    mode,
    isBlackettEvent: chooseBlackettEvent(mode, params),
    collisionPoint: null,
    tracks: [],
    events: [],
    hasPhotographed: false,
    hasCompletedCycle: false,
  };
  return transitionPhase(prepared, "preparing");
}

export function applyCloudChamberCommand(
  state: CloudChamberState,
  params: CloudChamberParams,
  mode: ObservationMode,
  command: CloudChamberCommand,
): CloudChamberState {
  if (command === "pause") return pauseState(state);
  if (command === "resume") return resumeState(state);
  if (command === "startCycle" || command === "prepareChamber") {
    if (state.phase === "idle" || state.phase === "observationComplete") {
      return beginCycle(state, params, mode);
    }
    return state;
  }
  if (command === "emitAlpha" && state.phase === "supersaturated") {
    return transitionPhase(state, "emittingAlpha");
  }
  if (
    command === "photograph" &&
    state.tracks.length > 0 &&
    !["idle", "preparing", "coolingBase", "evaporatingIPA", "resetting", "clearing"].includes(state.phase)
  ) {
    return transitionPhase(
      { ...state, tracks: state.tracks.map((track) => ({ ...track, active: false })) },
      "photographing",
    );
  }
  return state;
}

function recordSegment(previous: ParticleTrack, next: ParticleTrack): TrackSegment | null {
  if (Math.hypot(next.position.x - previous.position.x, next.position.y - previous.position.y) < 1e-5) return null;
  return {
    trackId: next.id,
    particleType: next.particleType,
    from: previous.position,
    to: next.position,
    ionizationDensity: next.ionizationDensity,
    width: next.width,
    opacity: next.opacity,
    dropletSeed: next.dropletSeed + Math.round(next.distanceTraveled * 10),
  };
}

function stepOnce(
  input: CloudChamberState,
  params: CloudChamberParams,
  dt: number,
): CloudChamberStepResult {
  if (input.phase === "idle" || input.phase === "paused") {
    return { state: input, segments: [], photographRequested: false, clearDroplets: false, cycleCompleted: false };
  }

  let state: CloudChamberState = {
    ...input,
    time: input.time + dt,
    phaseTime: input.phaseTime + dt,
  };
  const segments: TrackSegment[] = [];
  let photographRequested = false;
  let clearDroplets = false;
  let cycleCompleted = false;

  const targetIpaVapor = clamp(params.ipaAmount / 100, 0.15, 1.1);

  if (state.phase === "preparing" && state.phaseTime >= 0.5) {
    state = transitionPhase(state, "coolingBase");
  } else if (state.phase === "coolingBase") {
    const topTemperature = state.topTemperature + (params.topTemperature - state.topTemperature) * Math.min(1, dt * 1.1);
    const baseTemperature = state.baseTemperature + (params.baseTemperature - state.baseTemperature) * Math.min(1, dt * 1.9);
    const supersaturation = supersaturationFor(state.ipaVapor, topTemperature, baseTemperature);
    state = { ...state, topTemperature, baseTemperature, supersaturation };
    if (Math.abs(baseTemperature - params.baseTemperature) <= 2.5 || state.phaseTime >= 2.25) {
      state = transitionPhase(state, "evaporatingIPA");
    }
  } else if (state.phase === "evaporatingIPA") {
    const ipaVapor = state.ipaVapor + (targetIpaVapor - state.ipaVapor) * Math.min(1, dt * 1.65);
    const supersaturation = supersaturationFor(ipaVapor, state.topTemperature, state.baseTemperature);
    const fogFactor = clamp((supersaturation - 0.82) / 0.55, 0, 1.2);
    const backgroundFog = clamp(params.backgroundFog / 100, 0, 1) * fogFactor;
    state = { ...state, ipaVapor, supersaturation, backgroundFog };
    if (ipaVapor >= targetIpaVapor * 0.94 || state.phaseTime >= 1.9) {
      state = transitionPhase({ ...state, sensitivityWindow: SENSITIVITY_DURATION }, "supersaturated");
    }
  } else if (state.phase === "supersaturated") {
    state = { ...state, sensitivityWindow: Math.max(0, state.sensitivityWindow - dt) };
    if (state.phaseTime >= 0.55) state = transitionPhase(state, "emittingAlpha");
  } else if (state.phase === "emittingAlpha") {
    if (state.tracks.length === 0) {
      const seed = state.counters.alphasEmitted + 1;
      const alpha = createAlphaTrack(params, seed);
      state = {
        ...state,
        tracks: [alpha],
        collisionPoint: state.isBlackettEvent ? createCollisionPoint(alpha, seed) : null,
        counters: { ...state.counters, alphasEmitted: state.counters.alphasEmitted + 1 },
      };
    }
    if (state.phaseTime >= 0.08) state = transitionPhase(state, "trackingAlpha");
  } else if (state.phase === "trackingAlpha") {
    const alpha = state.tracks.find((track) => track.particleType === "alpha");
    if (alpha) {
      const collisionDistance = state.collisionPoint
        ? Math.hypot(state.collisionPoint.x - alpha.position.x, state.collisionPoint.y - alpha.position.y)
        : undefined;
      let nextAlpha = moveTrack(alpha, dt, collisionDistance);
      const reachesCollision = Boolean(
        state.collisionPoint &&
        collisionDistance !== undefined &&
        alpha.velocity * dt >= collisionDistance - 1e-5,
      );
      if (reachesCollision && state.collisionPoint) {
        nextAlpha = {
          ...nextAlpha,
          position: { ...state.collisionPoint },
          active: false,
          remainingRange: 0,
          points: [...nextAlpha.points, { ...state.collisionPoint }],
        };
      }
      const segment = recordSegment(alpha, nextAlpha);
      if (segment) segments.push(segment);
      state = { ...state, tracks: state.tracks.map((track) => track.id === alpha.id ? nextAlpha : track) };
      if (reachesCollision) {
        state = transitionPhase(
          {
            ...state,
            counters: {
              ...state.counters,
              reactionsRecorded: state.counters.reactionsRecorded + 1,
            },
          },
          "collisionDetected",
        );
      } else if (!nextAlpha.active) {
        state = transitionPhase(state, "normalTrack");
      }
    }
  } else if (state.phase === "normalTrack") {
    if (state.phaseTime >= 0.28) state = transitionPhase(state, "photographing");
  } else if (state.phase === "collisionDetected") {
    if (state.phaseTime >= 0.1 && state.collisionPoint && state.tracks.length === 1) {
      const alpha = state.tracks[0]!;
      const products = createProductTracks(state.collisionPoint, alpha, state.counters.alphasEmitted);
      state = transitionPhase({ ...state, tracks: [alpha, ...products] }, "productsTracking");
    }
  } else if (state.phase === "productsTracking") {
    const tracks = state.tracks.map((track) => {
      if (track.particleType === "alpha" || !track.active) return track;
      const next = moveTrack(track, dt);
      const segment = recordSegment(track, next);
      if (segment) segments.push(segment);
      return next;
    });
    state = { ...state, tracks };
    if (tracks.filter((track) => track.particleType !== "alpha").every((track) => !track.active)) {
      state = transitionPhase(state, "photographing");
    }
  } else if (state.phase === "photographing") {
    const flash = state.phaseTime < 0.34 ? Math.sin((state.phaseTime / 0.34) * Math.PI) * 0.22 : 0;
    state = { ...state, flash };
    if (!state.hasPhotographed && state.phaseTime >= 0.18) {
      state = {
        ...state,
        hasPhotographed: true,
        counters: {
          ...state.counters,
          tracksObserved: state.counters.tracksObserved + state.tracks.length,
        },
      };
      photographRequested = true;
    }
    if (state.phaseTime >= 0.68) state = transitionPhase({ ...state, flash: 0 }, "observationComplete");
  } else if (state.phase === "observationComplete") {
    if (state.phaseTime >= 4.2) state = transitionPhase(state, "clearing");
  } else if (state.phase === "clearing") {
    const tracks = state.tracks.map((track) => ({ ...track, opacity: Math.max(0, track.opacity - dt * 0.23) }));
    state = {
      ...state,
      backgroundFog: Math.max(0, state.backgroundFog - dt * 0.08),
      sensitivityWindow: Math.max(0, state.sensitivityWindow - dt),
      tracks,
    };
    if (state.phaseTime >= 2.4) state = transitionPhase(state, "resetting");
  } else if (state.phase === "resetting" && state.phaseTime >= 0.28) {
    clearDroplets = true;
    cycleCompleted = true;
    state = transitionPhase(
      {
        ...state,
        tracks: [],
        collisionPoint: null,
        backgroundFog: 0,
        ipaVapor: 0,
        supersaturation: 0.45,
        baseTemperature: params.topTemperature,
        sensitivityWindow: 0,
        hasCompletedCycle: true,
      },
      "idle",
    );
  }

  if (["emittingAlpha", "trackingAlpha", "normalTrack", "collisionDetected", "productsTracking", "photographing", "observationComplete"].includes(state.phase)) {
    state = { ...state, sensitivityWindow: Math.max(0, state.sensitivityWindow - dt) };
  }
  return { state, segments, photographRequested, clearDroplets, cycleCompleted };
}

export function stepCloudChamber(
  previous: CloudChamberState,
  params: CloudChamberParams,
  rawDt: number,
): CloudChamberStepResult {
  let state = previous;
  let remaining = clamp(rawDt, 0, MAX_STEP_DT);
  const segments: TrackSegment[] = [];
  let photographRequested = false;
  let clearDroplets = false;
  let cycleCompleted = false;
  while (remaining > 1e-8) {
    const dt = Math.min(FIXED_STEP, remaining);
    remaining -= dt;
    const result = stepOnce(state, params, dt);
    state = result.state;
    segments.push(...result.segments);
    photographRequested ||= result.photographRequested;
    clearDroplets ||= result.clearDroplets;
    cycleCompleted ||= result.cycleCompleted;
  }
  return { state, segments, photographRequested, clearDroplets, cycleCompleted };
}

export function cloudChamberMetrics(
  state: CloudChamberState,
  params: CloudChamberParams,
): CloudChamberMetrics {
  const length = (type: ParticleTrack["particleType"]) =>
    state.tracks.find((track) => track.particleType === type)?.distanceTraveled ?? 0;
  return {
    phase: state.phase,
    time: state.time,
    topTemperature: finite(state.topTemperature, params.topTemperature),
    baseTemperature: finite(state.baseTemperature, params.baseTemperature),
    ipaVapor: clamp(state.ipaVapor, 0, 1.2),
    supersaturation: finite(state.supersaturation, 0.45),
    sensitivityWindow: Math.max(0, finite(state.sensitivityWindow, 0)),
    backgroundFog: clamp(state.backgroundFog, 0, 1),
    eventType: state.tracks.length === 0 ? "none" : state.isBlackettEvent ? "blackett" : "normal",
    activeTrackCount: state.tracks.filter((track) => track.active).length,
    alphaEnergy: params.alphaEnergy,
    alphaLength: length("alpha"),
    protonLength: length("proton"),
    oxygenLength: length("oxygen17"),
    counters: { ...state.counters },
  };
}
