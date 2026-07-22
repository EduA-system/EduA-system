import type { ThermalWireParams, ThermalWireState } from "./thermal-wire-types";

const AMBIENT = 25;
const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));
export function createThermalWireState(
  params: ThermalWireParams,
): ThermalWireState {
  return {
    time: 0,
    phase: "idle",
    current: 0,
    temperature: AMBIENT,
    power: 0,
    energy: 0,
    burnProgress: [0, 0, 0],
    wireBroken: false,
  };
}
export function stepThermalWire(
  state: ThermalWireState,
  params: ThermalWireParams,
  dt: number,
): ThermalWireState {
  const h = clamp(dt, 1 / 600, 1 / 30),
    closed = params.masterSwitchClosed;
  state.time += h;
  const targetCurrent = closed
    ? params.voltage / Math.max(0.2, params.resistor + params.wireResistance)
    : 0;
  state.current += (targetCurrent - state.current) * (1 - Math.exp(-h / 0.025));
  state.current = clamp(state.current, 0, 12);
  state.power =
    state.current * state.current * Math.max(0.05, params.wireResistance);
  const heatIn = state.power,
    heatOut = Math.max(0, params.heatLoss) * (state.temperature - AMBIENT);
  state.temperature = clamp(
    state.temperature +
      ((heatIn - heatOut) * h) /
        Math.max(0.02, params.wireMass * params.heatCapacity),
    AMBIENT,
    1100,
  );
  state.energy += heatIn * h;
  for (let index = 0; index < state.burnProgress.length; index += 1) {
    const localThreshold = params.ignitionTemperature + index * 8;
    if (state.temperature > localThreshold)
      state.burnProgress[index] = clamp(
        state.burnProgress[index]! +
          ((state.temperature - localThreshold) / 210) * h,
        0,
        1,
      );
  }
  const meanBurn =
    state.burnProgress.reduce((sum, value) => sum + value, 0) /
    state.burnProgress.length;
  state.wireBroken = false;
  state.phase =
    meanBurn > 0.32
      ? "paper-burning"
      : state.temperature > params.ignitionTemperature * 0.78
        ? "paper-browning"
        : state.temperature > 80
          ? "heating"
          : state.current > 0.03
            ? "current-flowing"
            : "idle";
  return state;
}
