export type Vector2 = { x: number; y: number };

export type RutherfordScatteringPhase =
  | "idle"
  | "ready"
  | "emitting"
  | "approachingFoil"
  | "scattering"
  | "travelingToScreen"
  | "scintillation"
  | "observing"
  | "completed"
  | "paused"
  | "resetting";

export type ScatteringCategory = "straight" | "small" | "large" | "backscatter";

export type RutherfordScatteringParams = {
  alphaEnergy: number;
  foilThickness: number;
  atomicNumber: number;
  sourceIntensity: number;
  emissionRate: number;
  beamWidth: number;
  detectorSensitivity: number;
  flashLifetime: number;
  trailPersistence: number;
};

export type RutherfordScatteringScene = RutherfordScatteringParams;

export type GoldNucleus = {
  id: string;
  position: Vector2;
  baseY: number;
  phase: number;
  pulse: number;
};

export type ScatteringParticle = {
  id: string;
  position: Vector2;
  direction: Vector2;
  velocity: number;
  energy: number;
  active: boolean;
  opacity: number;
  hasScattered: boolean;
  hasReachedScreen: boolean;
  impactParameter: number | null;
  scatteringAngle: number | null;
  category: ScatteringCategory | null;
  targetNucleusId: string | null;
  trail: Vector2[];
};

export type Scintillation = {
  id: string;
  position: Vector2;
  age: number;
  lifetime: number;
  category: ScatteringCategory;
};

export type ScatteringCounters = {
  emitted: number;
  straight: number;
  smallAngle: number;
  largeAngle: number;
  backscattered: number;
  detected: number;
};

export type AngleObservation = {
  time: number;
  angle: number;
  impactParameter: number;
  category: ScatteringCategory;
  detected: boolean;
};

export type ScatteringEvent = {
  time: number;
  phase: RutherfordScatteringPhase;
  label: string;
};

export type RutherfordScatteringState = {
  phase: RutherfordScatteringPhase;
  phaseBeforePause: RutherfordScatteringPhase;
  elapsed: number;
  phaseTime: number;
  particles: ScatteringParticle[];
  nuclei: GoldNucleus[];
  flashes: Scintillation[];
  counters: ScatteringCounters;
  observations: AngleObservation[];
  events: ScatteringEvent[];
  continuousEmission: boolean;
  singleEmissionRequested: boolean;
  emissionAccumulator: number;
  sourcePulse: number;
  foilPulse: number;
  detectorPulse: number;
  randomSeed: number;
  nextId: number;
};

export type RutherfordScatteringMetrics = {
  phase: RutherfordScatteringPhase;
  elapsed: number;
  counters: ScatteringCounters;
  observations: AngleObservation[];
  events: ScatteringEvent[];
  currentEnergy: number;
  latestAngle: number | null;
  latestImpactParameter: number | null;
  meanAngle: number;
  detectionRate: number;
};

export type RutherfordScatteringCommand = "start" | "pause" | "resume" | "emitOne" | "reset";
