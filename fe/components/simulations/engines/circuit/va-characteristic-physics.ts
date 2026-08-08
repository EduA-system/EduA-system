import type { VaParams, VaPoint, VaState } from "./va-characteristic-types";
const AMBIENT = 25;
const clamp = (v: number, a: number, b: number) =>
  Math.min(b, Math.max(a, Number.isFinite(v) ? v : a));
export function createVaState(params: VaParams): VaState {
  return {
    time: 0,
    lampTemperature: AMBIENT,
    lampResistance: params.lampColdResistance,
    resistorCurrent: 0,
    lampCurrent: 0,
    lampPower: 0,
  };
}
export function stepVa(state: VaState, params: VaParams, dt: number) {
  const h = clamp(dt, 1 / 600, 1 / 30),
    u = params.switchClosed ? params.voltage : 0;
  state.time += h;
  state.lampResistance = Math.max(
    0.2,
    params.lampColdResistance *
      (1 + params.temperatureCoefficient * (state.lampTemperature - AMBIENT)),
  );
  state.resistorCurrent = u / Math.max(0.2, params.resistorOhms);
  state.lampCurrent = u / state.lampResistance;
  state.lampPower =
    state.lampCurrent * state.lampCurrent * state.lampResistance;
  state.lampTemperature = clamp(
    state.lampTemperature +
      ((state.lampPower - params.heatLoss * (state.lampTemperature - AMBIENT)) *
        h) /
        Math.max(0.05, params.thermalMass),
    AMBIENT,
    2800,
  );
  return state;
}
export function steadyVaPoint(voltage: number, params: VaParams): VaPoint {
  let temperature = AMBIENT,
    resistance = params.lampColdResistance;
  for (let i = 0; i < 80; i++) {
    resistance = Math.max(
      0.2,
      params.lampColdResistance *
        (1 + params.temperatureCoefficient * (temperature - AMBIENT)),
    );
    const current = voltage / resistance;
    temperature =
      AMBIENT +
      (current * current * resistance) / Math.max(0.005, params.heatLoss);
  }
  return {
    voltage,
    resistorCurrent: voltage / Math.max(0.2, params.resistorOhms),
    lampCurrent: voltage / resistance,
  };
}
