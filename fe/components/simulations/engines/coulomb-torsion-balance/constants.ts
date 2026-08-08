import type { TorsionBalanceParams } from "./types";

export const COULOMB_CONSTANT = 8.9875517923e9;
export const VIEW_WIDTH = 1000;
export const VIEW_HEIGHT = 620;
export const SPHERE_DIAMETER_METERS = 0.016;

export const DEFAULT_TORSION_BALANCE_PARAMS: TorsionBalanceParams = {
  movingCharge: 0.45,
  fixedCharge: 0.45,
  initialSeparation: 4.8,
  torsionConstant: 260,
  damping: 48,
  armLength: 12,
  chargeRetention: 98,
  instrumentSensitivity: 72,
};

export const MAX_NEEDLE_ANGLE = Math.PI * 0.68;
export const MIN_NEEDLE_ANGLE = -Math.PI * 0.68;
