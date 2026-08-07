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
};

export type InductionState = {
  needle: number;
  needleVelocity: number;
  previousFlux: number;
  emf: number;
  current: number;
};

export type VariableCurrentInductionScene = {
  kind: "variable-current-induction";
  supplyVoltage: number;
  primaryResistance: number;
  rheostatMaxResistance: number;
  primaryTurns: number;
  secondaryTurns: number;
  coupling: number;
  currentTimeConstant: number;
  meterSensitivity: number;
  meterDamping: number;
};

export type VariableCurrentInductionState = {
  primaryCurrent: number;
  inducedEmf: number;
  needle: number;
  needleVelocity: number;
};
