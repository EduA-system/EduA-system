import { MAX_FRAME_DT } from "./constants";
import { developedDarkness, materialTransmission, meanExposure, plateIntensity, updateExposureMap } from "./exposure-map";
import type { BecquerelMetrics, BecquerelParams, BecquerelPhase, BecquerelState, ExposureMap } from "./types";

export function createBecquerelState(params: BecquerelParams): BecquerelState { return { phase: "introduction", resumePhase: "introduction", time: 0, phaseStartedAt: 0, exposureElapsed: 0, developProgress: 0, wrapped: params.wrapped >= .5, hasUranium: params.activity > 0, sourceX: 0 }; }
export function stepBecquerel(state: BecquerelState, params: BecquerelParams, map: ExposureMap, rawDt: number): BecquerelState {
  if (state.phase === "paused" || state.phase === "completed") return state;
  const dt = Math.min(Math.max(rawDt, 0), MAX_FRAME_DT), next = { ...state, time: state.time + dt };
  const phaseAge = next.time - state.phaseStartedAt;
  const automaticNext: Partial<Record<BecquerelPhase, BecquerelPhase>> = { preparingPlate: "wrappingPlate", wrappingPlate: "placingMetalObject", placingMetalObject: "placingUranium", placingUranium: "configuringExposure", configuringExposure: "exposing" };
  if (automaticNext[state.phase] && phaseAge >= (state.phase === "configuringExposure" ? .8 : 1.15)) { next.phase = automaticNext[state.phase]!; next.phaseStartedAt = next.time; }
  if (state.phase === "exposing") { updateExposureMap(map, params, dt, state.sourceX); next.exposureElapsed += dt; if (next.exposureElapsed >= params.exposureTime) { next.exposureElapsed = params.exposureTime; next.phase = "exposureComplete"; } }
  if (state.phase === "developing") { next.developProgress = Math.min(1, state.developProgress + dt / 3); if (next.developProgress >= 1) next.phase = "result"; }
  return next;
}
export function becquerelMetrics(state: BecquerelState, params: BecquerelParams, map: ExposureMap): BecquerelMetrics {
  const mean = meanExposure(map), developed = ["result", "comparison", "completed"].includes(state.phase);
  return { phase: state.phase, time: state.time, exposureElapsed: state.exposureElapsed, progress: Math.min(1, state.exposureElapsed / Math.max(.1, params.exposureTime)), intensityAtPlate: plateIntensity(params), transmission: materialTransmission(params), meanExposure: mean, predictedDarkness: developedDarkness(mean, params), latentReady: mean > .08, developed, lightLeak: params.lightCondition > .5 && params.wrapped < .5, developProgress: state.developProgress };
}
