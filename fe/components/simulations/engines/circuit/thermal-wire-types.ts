export type ThermalWirePhase =
  | "idle"
  | "current-flowing"
  | "heating"
  | "paper-browning"
  | "paper-burning"
  | "wire-broken";
export type ThermalWireParams = {
  voltage: number;
  resistor: number;
  wireResistance: number;
  wireMass: number;
  heatCapacity: number;
  heatLoss: number;
  ignitionTemperature: number;
  masterSwitchClosed: boolean;
};
export type ThermalWireState = {
  time: number;
  phase: ThermalWirePhase;
  current: number;
  temperature: number;
  power: number;
  energy: number;
  burnProgress: number[];
  wireBroken: boolean;
};
export type ThermalWireSnapshot = ThermalWireState;
export type ThermalWirePoint = {
  time: number;
  current: number;
  temperature: number;
  power: number;
  energy: number;
  burn: number;
};
