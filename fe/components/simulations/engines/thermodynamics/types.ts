export type CorkPhase = "idle" | "heating" | "nearRelease" | "corkReleased" | "expansion" | "completed" | "paused";

export type ThermalParams = {
  heaterPower: number; corkMass: number; holdForce: number; gasAmount: number;
  initialTemperature: number; atmospherePressure: number; heatLoss: number;
};

export type ThermalState = {
  phase: CorkPhase; resumePhase: Exclude<CorkPhase, "paused">; time: number; temperature: number;
  pressure: number; volume: number; internalEnergy: number; heatIn: number; work: number;
  corkY: number; corkVelocity: number; releaseTime: number | null; releasePressure: number | null;
};

export type ThermalMetrics = ThermalState & {
  deltaPressure: number; pressureForce: number; releaseThreshold: number; deltaInternalEnergy: number;
};

export type ThermalEvent = { key: string; label: string; time: number };
export type ChartPoint = { time: number; temperature: number; pressure: number; heat: number; deltaU: number; work: number };

