export type WaterVaporizationParams = {
  voltage: number;
  current: number;
  waterMass: number;
  latentHeat: number;
  heatLossRatio: number;
  switchClosed: boolean;
};
export type WaterVaporizationState = {
  time: number;
  electricalEnergy: number;
  usefulHeat: number;
  lostHeat: number;
  vaporizedMass: number;
  collectedMass: number;
};
export type WaterVaporizationSnapshot = WaterVaporizationState & {
  power: number;
  remainingWaterMass: number;
  vaporizedRatio: number;
  measuredLatentHeat: number | null;
  relativeError: number | null;
  completed: boolean;
};
export type WaterVaporizationPoint = {
  time: number;
  vaporizedMass: number;
  electricalEnergy: number;
};
