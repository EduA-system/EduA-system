import type { CloudChamberParams, ParticleType, Vector2 } from "./types";

export const CHAMBER_BOUNDS = {
  left: 181,
  right: 811,
  top: 142,
  bottom: 474,
} as const;

export const ALPHA_START: Vector2 = { x: 205, y: 350 };
export const MAX_STEP_DT = 0.08;
export const FIXED_STEP = 1 / 120;
export const SENSITIVITY_DURATION = 6.5;

export const DEFAULT_CLOUD_CHAMBER_PARAMS: CloudChamberParams = {
  topTemperature: 22,
  baseTemperature: -70,
  ipaAmount: 86,
  airDensity: 78,
  alphaEnergy: 72,
  chamberSensitivity: 86,
  trackLifetime: 7,
  naturalReactionProbability: 4,
  backgroundFog: 24,
};

export const PARTICLE_COLORS: Record<ParticleType, string> = {
  alpha: "#fde68a",
  proton: "#67e8f9",
  oxygen17: "#f0abfc",
};

export const PARTICLE_LABELS: Record<ParticleType, string> = {
  alpha: "Hạt α",
  proton: "proton",
  oxygen17: "¹⁷O",
};
