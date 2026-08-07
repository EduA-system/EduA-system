export type CloudChamberPhase =
  | "idle"
  | "preparing"
  | "coolingBase"
  | "evaporatingIPA"
  | "supersaturated"
  | "emittingAlpha"
  | "trackingAlpha"
  | "normalTrack"
  | "collisionDetected"
  | "productsTracking"
  | "photographing"
  | "observationComplete"
  | "clearing"
  | "resetting"
  | "paused";

export type ObservationMode = "natural" | "blackett";
export type ParticleType = "alpha" | "proton" | "oxygen17";

export type Vector2 = { x: number; y: number };

export type CloudChamberParams = {
  topTemperature: number;
  baseTemperature: number;
  ipaAmount: number;
  airDensity: number;
  alphaEnergy: number;
  chamberSensitivity: number;
  trackLifetime: number;
  naturalReactionProbability: number;
  backgroundFog: number;
};

export type ParticleTrack = {
  id: string;
  particleType: ParticleType;
  startPosition: Vector2;
  position: Vector2;
  direction: Vector2;
  velocity: number;
  energy: number;
  initialEnergy: number;
  remainingRange: number;
  initialRange: number;
  ionizationDensity: number;
  width: number;
  opacity: number;
  dropletSeed: number;
  active: boolean;
  parentTrackId: string | null;
  distanceTraveled: number;
  points: Vector2[];
};

export type CloudChamberEvent = {
  phase: CloudChamberPhase;
  label: string;
  time: number;
};

export type CloudChamberCounters = {
  alphasEmitted: number;
  tracksObserved: number;
  reactionsRecorded: number;
};

export type CloudChamberState = {
  phase: CloudChamberPhase;
  resumePhase: Exclude<CloudChamberPhase, "paused">;
  time: number;
  phaseTime: number;
  topTemperature: number;
  baseTemperature: number;
  ipaVapor: number;
  supersaturation: number;
  sensitivityWindow: number;
  backgroundFog: number;
  flash: number;
  mode: ObservationMode;
  isBlackettEvent: boolean;
  collisionPoint: Vector2 | null;
  tracks: ParticleTrack[];
  events: CloudChamberEvent[];
  counters: CloudChamberCounters;
  hasPhotographed: boolean;
  hasCompletedCycle: boolean;
};

export type TrackSegment = {
  trackId: string;
  particleType: ParticleType;
  from: Vector2;
  to: Vector2;
  ionizationDensity: number;
  width: number;
  opacity: number;
  dropletSeed: number;
};

export type CloudChamberStepResult = {
  state: CloudChamberState;
  segments: TrackSegment[];
  photographRequested: boolean;
  clearDroplets: boolean;
  cycleCompleted: boolean;
};

export type CloudChamberCommand =
  | "startCycle"
  | "prepareChamber"
  | "emitAlpha"
  | "photograph"
  | "pause"
  | "resume";

export type CloudChamberMetrics = {
  phase: CloudChamberPhase;
  time: number;
  topTemperature: number;
  baseTemperature: number;
  ipaVapor: number;
  supersaturation: number;
  sensitivityWindow: number;
  backgroundFog: number;
  eventType: "none" | "normal" | "blackett";
  activeTrackCount: number;
  alphaEnergy: number;
  alphaLength: number;
  protonLength: number;
  oxygenLength: number;
  counters: CloudChamberCounters;
};

export type ObservationTrack = {
  id: string;
  particleType: ParticleType;
  start: Vector2;
  end: Vector2;
  length: number;
  width: number;
  ionizationDensity: number;
};

export type CloudChamberObservation = {
  eventType: "normal" | "blackett";
  capturedAt: number;
  imageDataUrl: string;
  tracks: ObservationTrack[];
  events: CloudChamberEvent[];
};

export type CloudChamberScene = Record<string, never>;
