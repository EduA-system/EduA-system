export type EmfParams = {
  emf: number;
  internalResistance: number;
  loadResistance: number;
  protectiveResistance: number;
  switchClosed: boolean;
};
export type EmfSnapshot = {
  time: number;
  current: number;
  terminalVoltage: number;
  externalVoltage: number;
  calculatedEmf: number;
  loadPower: number;
};
export type EmfPoint = {
  time: number;
  current: number;
  voltage: number;
  emf: number;
};
