export type CorkPopStatus = "holding" | "near-pop" | "popped";

export type CorkPopParams = {
  heatPower: number;
  corkTightness: number;
  gasAmount: number;
  initialTemperature: number;
  corkMass: number;
  showMolecules: boolean;
  showVelocityVectors: boolean;
  showCorkForce: boolean;
  showCorkTrail: boolean;
  showLabels: boolean;
  mode: "micro" | "energy";
  speed: number;
};

export type CorkPopSnapshot = {
  time: number;
  temperature: number;
  pressure: number;
  internalEnergy: number;
  heatAdded: number;
  work: number;
  force: number;
  corkPosition: number;
  corkVelocity: number;
  status: CorkPopStatus;
  popped: boolean;
};

export type CorkPopScene = Record<string, never>;
