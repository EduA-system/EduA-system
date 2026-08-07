import type { ElectricBellParams } from "./types";

export const CIRCUIT_DT = 1 / 240;
export const CURRENT_RISE_TAU = 0.018;
export const CURRENT_FALL_TAU = 0.012;
export const MINIMUM_GAP_M = 0.0025;
export const MAX_DISPLACEMENT_M = 0.014;
export const MAX_CURRENT_A = 5;
export const MAX_FORCE_N = 8;
export const MAX_VELOCITY_MS = 1.5;
export const MAX_ACCELERATION_MS2 = 100;

export const DEFAULT_ELECTRIC_BELL_PARAMS: ElectricBellParams = {
  voltage: 6,
  coilResistance: 5.5,
  wireResistance: 0.5,
  turns: 420,
  gapMm: 8,
  springConstant: 95,
  massGrams: 38,
  damping: 0.32,
  contactPositionMm: 5.4,
  bellDistanceMm: 6.2,
  magneticCoefficient: 0.000018,
  forceCoefficient: 1.45e-9,
  coilLength: 0.045,
  polarity: 1,
  masterSwitchClosed: false,
  showCurrent: true,
  showField: true,
  showLabels: true,
};
