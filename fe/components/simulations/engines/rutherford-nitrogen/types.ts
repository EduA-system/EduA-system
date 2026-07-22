export type Vec2 = { x: number; y: number };

export type RutherfordPhase =
  | "idle"
  | "loadingGas"
  | "ready"
  | "emittingAlpha"
  | "alphaTraveling"
  | "alphaScattering"
  | "alphaAbsorbed"
  | "nuclearCollision"
  | "productsEmitted"
  | "protonTraveling"
  | "protonPassingAbsorber"
  | "scintillation"
  | "observing"
  | "completed"
  | "paused"
  | "resetting";

export type GasType = "vacuum" | "oxygen" | "carbonDioxide" | "air" | "nitrogen";
export type ParticleType = "alpha" | "proton" | "oxygen17";
export type GasNucleusType = "nitrogen14" | "oxygen16" | "carbon12";
export type ObservationView = "apparatus" | "nuclearExplanation";
export type AbsorberMaterial = "mica" | "aluminum" | "gold";

export type RutherfordParams = {
  gasCode: number;
  gasPressure: number;
  gasDensity: number;
  alphaEnergy: number;
  sourceIntensity: number;
  sourceScreenDistance: number;
  absorberMaterialCode: number;
  absorberThickness: number;
  absorberCoefficient: number;
  flashLifetime: number;
  emissionRate: number;
};

export type RutherfordScene = RutherfordParams;

export type RutherfordParticle = {
  id: string;
  particleType: ParticleType;
  position: Vec2;
  direction: Vec2;
  velocity: number;
  energy: number;
  remainingRange: number;
  radius: number;
  active: boolean;
  opacity: number;
  parentEventId: string;
  hasReacted: boolean;
  hasReachedScreen: boolean;
  trail: Vec2[];
  distanceTraveled: number;
  gasAtEmission: GasType;
  willReact: boolean;
  reactionPoint: Vec2 | null;
  scatterPoint: Vec2 | null;
  targetNucleusId: string | null;
  absorberHandled: boolean;
  hasScattered: boolean;
};

export type NuclearTarget = {
  id: string;
  nucleusType: GasNucleusType;
  position: Vec2;
  basePosition: Vec2;
  displayRadius: number;
  collisionRadius: number;
  driftPhase: number;
  driftSpeed: number;
  driftAmplitude: number;
  pulse: number;
};

export type ScintillationFlash = {
  id: string;
  position: Vec2;
  age: number;
  lifetime: number;
};

export type PhaseEvent = {
  time: number;
  phase: RutherfordPhase;
  label: string;
};

export type GasRunStats = {
  emitted: number;
  absorbed: number;
  collisions: number;
  protonsCreated: number;
  protonsReached: number;
  flashes: number;
};

export type RutherfordCounters = {
  alphasEmitted: number;
  alphasAbsorbed: number;
  nuclearCollisions: number;
  protonsCreated: number;
  protonsReached: number;
  flashes: number;
};

export type TimeSample = {
  time: number;
  emitted: number;
  protonsReached: number;
  flashes: number;
};

export type ReactionRecord = {
  eventId: string;
  gas: GasType;
  point: Vec2;
  time: number;
  protonInitialEnergy: number;
  protonTransmittedEnergy: number | null;
  reachedScreen: boolean;
};

export type PendingReaction = {
  eventId: string;
  gas: GasType;
  point: Vec2;
  alphaEnergy: number;
};

export type RutherfordState = {
  phase: RutherfordPhase;
  phaseBeforePause: RutherfordPhase;
  phaseTime: number;
  elapsed: number;
  currentGas: GasType;
  nuclearTargets: NuclearTarget[];
  particles: RutherfordParticle[];
  flashes: ScintillationFlash[];
  counters: RutherfordCounters;
  gasStats: Record<GasType, GasRunStats>;
  events: PhaseEvent[];
  history: TimeSample[];
  ranges: Record<ParticleType, number[]>;
  reactions: ReactionRecord[];
  pendingReaction: PendingReaction | null;
  continuousEmission: boolean;
  singleEmissionRequested: boolean;
  emissionAccumulator: number;
  emittedInBatch: number;
  reactionPulse: number;
  absorberPulse: number;
  microscopeGlow: number;
  sourcePulse: number;
  randomSeed: number;
  nextParticleId: number;
};

export type RutherfordMetrics = {
  phase: RutherfordPhase;
  elapsed: number;
  currentGas: GasType;
  counters: RutherfordCounters;
  gasStats: Record<GasType, GasRunStats>;
  events: PhaseEvent[];
  history: TimeSample[];
  ranges: Record<ParticleType, number[]>;
  reactions: ReactionRecord[];
  currentEnergy: number;
  absorberThickness: number;
  reactionRate: number;
};

export type RutherfordCommand = "start" | "pause" | "resume" | "emitOne" | "reset";
