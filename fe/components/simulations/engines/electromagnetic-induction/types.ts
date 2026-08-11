export type ElectromagneticInductionScene = {
  kind: "electromagnetic-induction";
  coilX: number;
  coilY: number;
  coilRadius: number;
  turns: number;
  resistance: number;
  magnetStartX: number;
  magnetStrength: number;
  meterSensitivity: number;
  meterDamping: number;
  motionAmplitude?: number;
  motionFrequency?: number;
  poleOrientation?: 1 | -1;
  maxMagnetSpeed?: number;
};

export type ElectromagneticInductionPhase =
  | "idle"
  | "approaching"
  | "entering"
  | "centered"
  | "leaving"
  | "stationary"
  | "paused";

export type InductionHistoryPoint = {
  time: number;
  magnetX: number;
  fluxLinkage: number;
  emf: number;
  current: number;
};

export type InductionEvent = {
  time: number;
  phase: ElectromagneticInductionPhase;
  label: string;
};

export type InductionState = {
  phase: ElectromagneticInductionPhase;
  phaseBeforePause: ElectromagneticInductionPhase;
  elapsed: number;
  magnetX: number;
  magnetVelocity: number;
  needle: number;
  needleVelocity: number;
  previousFlux: number;
  fluxPerTurn: number;
  fluxLinkage: number;
  fluxRate: number;
  emf: number;
  current: number;
  inducedFieldDirection: -1 | 0 | 1;
  peakEmf: number;
  peakCurrent: number;
  history: InductionHistoryPoint[];
  events: InductionEvent[];
};

export type ElectromagneticInductionParams = {
  turns: number;
  magnetStrength: number;
  resistance: number;
  coilRadius: number;
  motionAmplitude: number;
  motionFrequency: number;
};

export type ElectromagneticInductionMetrics = {
  phase: ElectromagneticInductionPhase;
  elapsed: number;
  magnetX: number;
  magnetVelocity: number;
  fluxPerTurn: number;
  fluxLinkage: number;
  fluxRate: number;
  emf: number;
  current: number;
  needle: number;
  inducedFieldDirection: -1 | 0 | 1;
  peakEmf: number;
  peakCurrent: number;
  history: InductionHistoryPoint[];
  events: InductionEvent[];
};

export type VariableCurrentInductionScene = {
  kind: "variable-current-induction";
  frequency: number;
  peakVoltage: number;
  resistance: number;
  graphDuration: number;
  visualTimeScale: number;
};

export type VariableCurrentInductionState = {
  elapsed: number;
  voltage: number;
  current: number;
  resistance: number;
  phase: number;
};
