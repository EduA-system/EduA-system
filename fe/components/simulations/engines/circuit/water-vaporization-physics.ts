import type {
  WaterVaporizationParams,
  WaterVaporizationSnapshot,
  WaterVaporizationState,
} from "./water-vaporization-types";

export function createWaterVaporizationState(): WaterVaporizationState {
  return {
    time: 0,
    electricalEnergy: 0,
    usefulHeat: 0,
    lostHeat: 0,
    vaporizedMass: 0,
    collectedMass: 0,
  };
}
export function stepWaterVaporization(
  state: WaterVaporizationState,
  params: WaterVaporizationParams,
  dt: number,
) {
  if (!params.switchClosed || state.vaporizedMass >= params.waterMass) return;
  const input = params.voltage * params.current * dt;
  const useful = input * (1 - params.heatLossRatio);
  state.time += dt;
  state.electricalEnergy += input;
  state.usefulHeat += useful;
  state.lostHeat += input - useful;
  state.vaporizedMass = Math.min(
    params.waterMass,
    state.vaporizedMass + useful / params.latentHeat,
  );
  state.collectedMass = Math.min(
    state.vaporizedMass,
    state.collectedMass + Math.max(0.00008, params.waterMass / 24) * dt,
  );
}
export function snapshotWaterVaporization(
  state: WaterVaporizationState,
  params: WaterVaporizationParams,
): WaterVaporizationSnapshot {
  const measuredLatentHeat =
    state.vaporizedMass > 0.0002
      ? state.electricalEnergy / state.vaporizedMass
      : null;
  return {
    ...state,
    power: params.switchClosed ? params.voltage * params.current : 0,
    remainingWaterMass: Math.max(0, params.waterMass - state.vaporizedMass),
    vaporizedRatio: Math.min(1, state.vaporizedMass / params.waterMass),
    measuredLatentHeat,
    relativeError:
      measuredLatentHeat === null
        ? null
        : ((measuredLatentHeat - params.latentHeat) / params.latentHeat) * 100,
    completed: state.vaporizedMass >= params.waterMass,
  };
}
