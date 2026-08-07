export type WaterCalorimetryParams = {
  voltage: number;
  current: number;
  waterMass: number;
  specificHeat: number;
  heatLoss: number;
  initialTemperature: number;
  switchClosed: boolean;
};

export type WaterCalorimetryState = {
  time: number;
  temperature: number;
  electricalEnergy: number;
  heatAbsorbed: number;
  heatLost: number;
};

export type WaterCalorimetrySnapshot = WaterCalorimetryState & {
  power: number;
  deltaTemperature: number;
  measuredSpecificHeat: number | null;
  relativeError: number | null;
};

export type WaterCalorimetryPoint = {
  time: number;
  temperature: number;
  electricalEnergy: number;
};
