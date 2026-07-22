import type { EmfParams, EmfSnapshot } from "./emf-measurement-types";
export function emfMeasurement(params: EmfParams, time = 0): EmfSnapshot {
  const external = Math.max(
      0.1,
      params.loadResistance + params.protectiveResistance,
    ),
    current = params.switchClosed
      ? params.emf / Math.max(0.1, external + params.internalResistance)
      : 0,
    terminalVoltage = params.emf - current * params.internalResistance;
  return {
    time,
    current,
    terminalVoltage,
    externalVoltage: current * external,
    calculatedEmf: terminalVoltage + current * params.internalResistance,
    loadPower: current * current * params.loadResistance,
  };
}
