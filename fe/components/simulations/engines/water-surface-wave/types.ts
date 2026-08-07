export type WaterWavePhase =
  | "idle"
  | "starting"
  | "emitting"
  | "propagating"
  | "reachedProbe"
  | "steady"
  | "paused";

export type WaterSurfaceWaveParams = {
  frequency: number;
  amplitude: number;
  waveSpeed: number;
  damping: number;
  waterLevel: number;
  sourceDiameter: number;
  surfaceClarity: number;
};

export type WaterWaveEvent = {
  phase: WaterWavePhase;
  label: string;
  time: number;
};

export type WaterWaveHistoryPoint = {
  time: number;
  sourceDisplacement: number;
  probeDisplacement: number;
  frontRadius: number;
};

export type WaterWaveState = {
  phase: WaterWavePhase;
  resumePhase: Exclude<WaterWavePhase, "paused">;
  time: number;
  phaseTime: number;
  envelope: number;
  frontRadius: number;
  emittedCycles: number;
  history: WaterWaveHistoryPoint[];
  events: WaterWaveEvent[];
};

export type WaterWaveMetrics = {
  phase: WaterWavePhase;
  time: number;
  frequency: number;
  period: number;
  wavelength: number;
  waveSpeed: number;
  sourceDisplacement: number;
  probeDisplacement: number;
  probeDistance: number;
  travelTimeToProbe: number;
  frontRadius: number;
  emittedCycles: number;
  visibleCrests: number;
  history: WaterWaveHistoryPoint[];
  events: WaterWaveEvent[];
};

export type WaterWaveCommand = "start" | "pause" | "resume";

export type WaterWaveStepResult = {
  state: WaterWaveState;
  completed: boolean;
};

export type WaterSurfaceWaveScene = Record<string, never>;
