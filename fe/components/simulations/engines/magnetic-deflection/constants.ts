import type { MagneticDeflectionParams, RadiationType, Vector2 } from "./types";

export const VIEW_WIDTH = 1000;
export const VIEW_HEIGHT = 620;
export const PARTICLE_START: Vector2 = { x: 205, y: 310 };
export const FIELD_LEFT = 300;
export const SCREEN_X = 875;
export const TRACK_TOP = 92;
export const TRACK_BOTTOM = 528;
export const FIXED_STEP = 1 / 120;
export const MAX_DELTA_TIME = 0.08;

export const DEFAULT_MAGNETIC_DEFLECTION_PARAMS: MagneticDeflectionParams = {
  magneticField: 0.65,
  fieldDirection: 1,
  alphaMomentum: 100,
  betaMomentum: 100,
  beamSpeed: 100,
  sourceActivity: 82,
  trailPersistence: 78,
  fieldRegionWidth: 82,
};

export const RADIATION_COLORS: Record<RadiationType, string> = {
  alpha: "#f59e0b",
  beta: "#22d3ee",
  gamma: "#a3e635",
};

export const RADIATION_LABELS: Record<RadiationType, string> = {
  alpha: "Tia α (+2e)",
  beta: "Tia β⁻ (−e)",
  gamma: "Tia γ (0)",
};

export function fieldRight(params: MagneticDeflectionParams): number {
  const progress = Math.max(0, Math.min(1, (params.fieldRegionWidth - 55) / 45));
  return FIELD_LEFT + 320 + progress * 150;
}
