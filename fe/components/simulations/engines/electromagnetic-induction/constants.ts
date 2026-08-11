import type { ElectromagneticInductionParams } from "./types";

export const DEFAULT_ELECTROMAGNETIC_INDUCTION_PARAMS: ElectromagneticInductionParams = {
  turns: 100,
  magnetStrength: 1.4,
  resistance: 6,
  coilRadius: 0.38,
  motionAmplitude: 2.2,
  motionFrequency: 0.12,
};

export const INDUCTION_VIEW = {
  width: 1100,
  height: 650,
  coilX: 455,
  coilY: 305,
  pixelsPerUnit: 105,
} as const;

export const MAX_INDUCTION_HISTORY = 240;
export const HISTORY_SAMPLE_INTERVAL = 0.045;
