import type { RutherfordScatteringParams, ScatteringCategory } from "./types";

export const SCATTERING_VIEW = {
  width: 1000,
  height: 620,
  source: { x: 96, y: 310 },
  foil: { x: 535, y: 310 },
  screenRadius: 200,
} as const;

export const DEFAULT_RUTHERFORD_SCATTERING_PARAMS: RutherfordScatteringParams = {
  alphaEnergy: 82,
  foilThickness: 1,
  atomicNumber: 79,
  sourceIntensity: 78,
  emissionRate: 4.2,
  beamWidth: 28,
  detectorSensitivity: 94,
  flashLifetime: 0.72,
  trailPersistence: 74,
};

export const SCATTERING_COLORS: Record<ScatteringCategory, string> = {
  straight: "#a7f3d0",
  small: "#67e8f9",
  large: "#fbbf24",
  backscatter: "#fb7185",
};

export const CATEGORY_LABELS: Record<ScatteringCategory, string> = {
  straight: "Gần như đi thẳng",
  small: "Lệch góc nhỏ",
  large: "Lệch góc lớn",
  backscatter: "Bật ngược",
};
