import type { WaterSurfaceWaveParams } from "./types";

export const VIEW_WIDTH = 1000;
export const VIEW_HEIGHT = 620;
export const PROBE_DISTANCE_CM = 30;
export const MAX_FIELD_RADIUS_CM = 52;

export const DEFAULT_WATER_SURFACE_WAVE_PARAMS: WaterSurfaceWaveParams = {
  frequency: 2,
  amplitude: 1.3,
  waveSpeed: 14,
  damping: 18,
  waterLevel: 70,
  sourceDiameter: 2.4,
  surfaceClarity: 78,
};
