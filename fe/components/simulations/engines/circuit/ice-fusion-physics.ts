import type {
  IceFusionParams,
  IceFusionSnapshot,
  IceFusionState,
} from "./ice-fusion-types";

export function createIceFusionState(): IceFusionState {
  return {
    time: 0,
    electricalEnergy: 0,
    usefulHeat: 0,
    lostHeat: 0,
    meltedMass: 0,
    collectedMass: 0,
  };
}

export function stepIceFusion(
  state: IceFusionState,
  params: IceFusionParams,
  dt: number,
) {
  if (!params.switchClosed || state.meltedMass >= params.iceMass) return;
  const input = params.voltage * params.current * dt;
  const useful = input * (1 - params.heatLossRatio);
  const melted = useful / params.latentHeat;
  state.time += dt;
  state.electricalEnergy += input;
  state.usefulHeat += useful;
  state.lostHeat += input - useful;
  state.meltedMass = Math.min(params.iceMass, state.meltedMass + melted);
  // Một độ trễ ngắn mô phỏng nước đi qua lỗ thoát rồi mới vào cốc hứng.
  const drainageRate = Math.max(0.0002, params.iceMass / 18);
  state.collectedMass = Math.min(
    state.meltedMass,
    state.collectedMass + drainageRate * dt,
  );
}

export function snapshotIceFusion(
  state: IceFusionState,
  params: IceFusionParams,
): IceFusionSnapshot {
  const measuredLatentHeat =
    state.collectedMass > 0.0005
      ? state.electricalEnergy / state.collectedMass
      : null;
  return {
    ...state,
    power: params.switchClosed ? params.voltage * params.current : 0,
    remainingIceMass: Math.max(0, params.iceMass - state.meltedMass),
    meltedRatio: Math.min(1, state.meltedMass / params.iceMass),
    measuredLatentHeat,
    relativeError:
      measuredLatentHeat === null
        ? null
        : ((measuredLatentHeat - params.latentHeat) / params.latentHeat) * 100,
    completed: state.meltedMass >= params.iceMass,
  };
}
