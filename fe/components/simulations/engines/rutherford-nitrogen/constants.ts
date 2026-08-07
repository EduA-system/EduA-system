import type {
  AbsorberMaterial,
  GasRunStats,
  GasType,
  RutherfordParams,
} from "./types";

export const RUTHERFORD_VIEW = {
  width: 1000,
  height: 620,
  beamY: 308,
  sourceX: 92,
  collimatorX: 190,
  chamberLeft: 232,
  chamberRight: 690,
  chamberTop: 172,
  chamberBottom: 438,
  absorberX: 742,
  screenX: 824,
} as const;

export const DEFAULT_RUTHERFORD_PARAMS: RutherfordParams = {
  gasCode: 4,
  gasPressure: 78,
  gasDensity: 82,
  alphaEnergy: 84,
  sourceIntensity: 76,
  sourceScreenDistance: 82,
  absorberMaterialCode: 1,
  absorberThickness: 1.05,
  absorberCoefficient: 100,
  flashLifetime: 0.7,
  emissionRate: 2.4,
};

export const GAS_LABELS: Record<GasType, string> = {
  vacuum: "Chân không",
  oxygen: "Oxygen O₂",
  carbonDioxide: "Carbon dioxide CO₂",
  air: "Không khí",
  nitrogen: "Nitrogen N₂",
};

export const GAS_SHORT_LABELS: Record<GasType, string> = {
  vacuum: "Chân không",
  oxygen: "O₂",
  carbonDioxide: "CO₂",
  air: "Không khí",
  nitrogen: "N₂",
};

export const GAS_ORDER: GasType[] = ["oxygen", "nitrogen"];

export const MATERIAL_LABELS: Record<AbsorberMaterial, string> = {
  mica: "Mica",
  aluminum: "Nhôm",
  gold: "Vàng",
};

export const GAS_DENSITY_FACTORS: Record<GasType, number> = {
  vacuum: 0,
  oxygen: 1.02,
  carbonDioxide: 1.28,
  air: 1,
  nitrogen: 0.98,
};

export const MATERIAL_ATTENUATION: Record<AbsorberMaterial, number> = {
  mica: 0.72,
  aluminum: 1,
  gold: 1.45,
};

export const EMPTY_GAS_STATS = (): Record<GasType, GasRunStats> => ({
  vacuum: { emitted: 0, absorbed: 0, collisions: 0, protonsCreated: 0, protonsReached: 0, flashes: 0 },
  oxygen: { emitted: 0, absorbed: 0, collisions: 0, protonsCreated: 0, protonsReached: 0, flashes: 0 },
  carbonDioxide: { emitted: 0, absorbed: 0, collisions: 0, protonsCreated: 0, protonsReached: 0, flashes: 0 },
  air: { emitted: 0, absorbed: 0, collisions: 0, protonsCreated: 0, protonsReached: 0, flashes: 0 },
  nitrogen: { emitted: 0, absorbed: 0, collisions: 0, protonsCreated: 0, protonsReached: 0, flashes: 0 },
});

export function gasFromCode(code: number): Extract<GasType, "oxygen" | "nitrogen"> {
  return Math.round(code) === 1 ? "oxygen" : "nitrogen";
}

export function materialFromCode(code: number): AbsorberMaterial {
  if (Math.round(code) === 0) return "mica";
  if (Math.round(code) === 2) return "gold";
  return "aluminum";
}
