export type VaParams = {
  voltage: number;
  resistorOhms: number;
  lampColdResistance: number;
  temperatureCoefficient: number;
  thermalMass: number;
  heatLoss: number;
  switchClosed: boolean;
};
export type VaState = {
  time: number;
  lampTemperature: number;
  lampResistance: number;
  resistorCurrent: number;
  lampCurrent: number;
  lampPower: number;
};
export type VaSnapshot = VaState;
export type VaPoint = {
  voltage: number;
  resistorCurrent: number;
  lampCurrent: number;
};
