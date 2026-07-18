import type { ThermalParams } from "./types";

export const GAS_R = 8.314;
export const GAS_CV = 20.8;
export const GRAVITY = 9.81;
export const INITIAL_VOLUME = 0.001;
export const CROSS_SECTION = 0.001;
export const CORK_EXIT = 0.055;
export const MAX_DT = 1 / 30;
export const DEFAULT_THERMAL_PARAMS: ThermalParams = {
  heaterPower: 12, corkMass: 0.012, holdForce: 20, gasAmount: 0.040,
  initialTemperature: 298, atmospherePressure: 101.3, heatLoss: 0.15,
};

export const PARAM_LIMITS = {
  heaterPower: [10, 45, 1, "W"], corkMass: [5, 35, 1, "g"], holdForce: [8, 35, 1, "N"],
  gasAmount: [0.025, 0.055, 0.001, "mol"], initialTemperature: [285, 320, 1, "K"],
  atmospherePressure: [85, 110, 0.5, "kPa"], heatLoss: [0, 0.6, 0.02, "W/K"],
} as const;
