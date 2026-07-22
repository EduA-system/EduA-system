export type IceFusionParams = {
  voltage: number;
  current: number;
  iceMass: number;
  latentHeat: number;
  heatLossRatio: number;
  switchClosed: boolean;
};

export type IceFusionState = {
  time: number;
  electricalEnergy: number;
  usefulHeat: number;
  lostHeat: number;
  meltedMass: number;
  collectedMass: number;
};

export type IceFusionSnapshot = IceFusionState & {
  power: number;
  remainingIceMass: number;
  meltedRatio: number;
  measuredLatentHeat: number | null;
  relativeError: number | null;
  completed: boolean;
};

export type IceFusionPoint = {
  time: number;
  collectedMass: number;
  electricalEnergy: number;
};
