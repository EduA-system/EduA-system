export type TorsionBalancePhase =
  | "idle"
  | "zeroing"
  | "charging"
  | "releasing"
  | "oscillating"
  | "settling"
  | "measuring"
  | "complete"
  | "paused";

export type TorsionBalanceParams = {
  movingCharge: number;
  fixedCharge: number;
  initialSeparation: number;
  torsionConstant: number;
  damping: number;
  armLength: number;
  chargeRetention: number;
  instrumentSensitivity: number;
};

export type TorsionBalanceEvent = {
  phase: TorsionBalancePhase;
  label: string;
  time: number;
};

export type TorsionHistoryPoint = {
  time: number;
  angle: number;
  distance: number;
  force: number;
  electricTorque: number;
  torsionTorque: number;
};

export type TorsionBalanceState = {
  phase: TorsionBalancePhase;
  resumePhase: Exclude<TorsionBalancePhase, "paused">;
  time: number;
  phaseTime: number;
  angle: number;
  angularVelocity: number;
  dialAngle: number;
  chargeProgress: number;
  probeProgress: number;
  releaseProgress: number;
  equilibriumHold: number;
  history: TorsionHistoryPoint[];
  events: TorsionBalanceEvent[];
};

export type TorsionBalanceForces = {
  distance: number;
  force: number;
  forceSigned: number;
  electricTorque: number;
  torsionTorque: number;
  dampingTorque: number;
  netTorque: number;
  movingPosition: { x: number; y: number };
  fixedPosition: { x: number; y: number };
};

export type TorsionBalanceMetrics = {
  phase: TorsionBalancePhase;
  time: number;
  angleDegrees: number;
  angularVelocityDegrees: number;
  twistDegrees: number;
  separationCm: number;
  forceMicroN: number;
  electricTorqueNanoNm: number;
  torsionTorqueNanoNm: number;
  chargePercent: number;
  interaction: "repulsion" | "attraction" | "neutral";
  equilibriumError: number;
  history: TorsionHistoryPoint[];
  events: TorsionBalanceEvent[];
};

export type TorsionBalanceCommand = "start" | "pause" | "resume";

export type TorsionBalanceStepResult = {
  state: TorsionBalanceState;
  completed: boolean;
};

export type CoulombTorsionBalanceScene = Record<string, never>;
