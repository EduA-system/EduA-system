import type {
  WaterCalorimetryParams,
  WaterCalorimetrySnapshot,
  WaterCalorimetryState,
} from "./water-calorimetry-types";

const ROOM_TEMPERATURE = 25;

export function createWaterCalorimetryState(
  params: WaterCalorimetryParams,
): WaterCalorimetryState {
  return {
    time: 0,
    temperature: params.initialTemperature,
    electricalEnergy: 0,
    heatAbsorbed: 0,
    heatLost: 0,
  };
}

export function snapshotWaterCalorimetry(
  state: WaterCalorimetryState,
  params: WaterCalorimetryParams,
): WaterCalorimetrySnapshot {
  const deltaTemperature = state.temperature - params.initialTemperature;
  const measuredSpecificHeat =
    deltaTemperature > 0.05
      ? state.electricalEnergy /
        (Math.max(0.001, params.waterMass) * deltaTemperature)
      : null;
  return {
    ...state,
    power: params.switchClosed ? params.voltage * params.current : 0,
    deltaTemperature,
    measuredSpecificHeat,
    relativeError:
      measuredSpecificHeat === null
        ? null
        : ((measuredSpecificHeat - params.specificHeat) / params.specificHeat) *
          100,
  };
}

export function stepWaterCalorimetry(
  state: WaterCalorimetryState,
  params: WaterCalorimetryParams,
  dt: number,
) {
  if (!params.switchClosed || state.temperature >= 99.8) return;
  const power = params.voltage * params.current;
  const lossPower =
    params.heatLoss * Math.max(0, state.temperature - ROOM_TEMPERATURE);
  const input = power * dt;
  const lost = Math.min(input, lossPower * dt);
  const absorbed = input - lost;
  state.time += dt;
  state.electricalEnergy += input;
  state.heatLost += lost;
  state.heatAbsorbed += absorbed;
  state.temperature = Math.min(
    99.8,
    state.temperature +
      absorbed / (Math.max(0.001, params.waterMass) * params.specificHeat),
  );
}
