export type HeatTransferParams = {
  initialTemperatureA: number;
  massA: number;
  specificHeatA: number;
  initialTemperatureB: number;
  massB: number;
  specificHeatB: number;
  transferCoefficient: number;
  contacted: boolean;
  showMolecules: boolean;
  speed: number;
};

export type HeatTransferPhase = "before-contact" | "transferring" | "equilibrium";

export type HeatTransferSnapshot = {
  time: number;
  temperatureA: number;
  temperatureB: number;
  equilibriumTemperature: number;
  heatCapacityA: number;
  heatCapacityB: number;
  heatFlowRate: number;
  heatLostA: number;
  heatReceivedB: number;
  progress: number;
  phase: HeatTransferPhase;
};

export type HeatTransferScene = Record<string, never>;
