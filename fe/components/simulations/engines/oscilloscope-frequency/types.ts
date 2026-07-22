export type OscilloscopePhase =
  | "idle"
  | "exciting"
  | "vibrating"
  | "propagating"
  | "transducing"
  | "measuring"
  | "complete"
  | "noSignal"
  | "invalidTimebase"
  | "paused";

export type OscilloscopeFrequencyParams = {
  frequency: number;
  sourceAmplitude: number;
  damping: number;
  microphoneDistance: number;
  microphoneGain: number;
  timePerDivision: number;
  voltsPerDivision: number;
  noise: number;
};

export type OscilloscopeEvent = {
  phase: OscilloscopePhase;
  label: string;
  time: number;
};

export type OscilloscopeSample = {
  timeMs: number;
  voltage: number;
};

export type OscilloscopeState = {
  phase: OscilloscopePhase;
  resumePhase: Exclude<OscilloscopePhase, "paused">;
  time: number;
  phaseTime: number;
  envelope: number;
  strikeProgress: number;
  propagationProgress: number;
  acquiredCycles: number;
  sweepProgress: number;
  events: OscilloscopeEvent[];
};

export type OscilloscopeMetrics = {
  phase: OscilloscopePhase;
  time: number;
  sourceFrequency: number;
  measuredFrequency: number | null;
  periodMs: number;
  signalAmplitudeVolts: number;
  signalPercent: number;
  cursorCycles: number;
  cursorDeltaMs: number;
  cursorStartMs: number;
  cursorEndMs: number;
  visibleTimeMs: number;
  acquiredCycles: number;
  samples: OscilloscopeSample[];
  events: OscilloscopeEvent[];
};

export type OscilloscopeCommand = "start" | "pause" | "resume";

export type OscilloscopeStepResult = {
  state: OscilloscopeState;
  completed: boolean;
};

export type OscilloscopeFrequencyScene = Record<string, never>;
