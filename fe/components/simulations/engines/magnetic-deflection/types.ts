export type RadiationType = "alpha" | "beta" | "gamma";

export type MagneticDeflectionPhase =
  | "idle"
  | "emitting"
  | "traversing"
  | "impacting"
  | "complete"
  | "paused";

export type Vector2 = { x: number; y: number };

export type MagneticDeflectionParams = {
  magneticField: number;
  fieldDirection: number;
  alphaMomentum: number;
  betaMomentum: number;
  beamSpeed: number;
  sourceActivity: number;
  trailPersistence: number;
  fieldRegionWidth: number;
};

export type RadiationParticle = {
  id: string;
  type: RadiationType;
  position: Vector2;
  direction: Vector2;
  speed: number;
  charge: -1 | 0 | 2;
  rigidity: number;
  active: boolean;
  enteredField: boolean;
  exitedField: boolean;
  path: Vector2[];
};

export type ScreenImpact = {
  particleType: RadiationType;
  position: Vector2;
  time: number;
};

export type MagneticDeflectionEvent = {
  phase: MagneticDeflectionPhase;
  label: string;
  time: number;
};

export type MagneticDeflectionState = {
  phase: MagneticDeflectionPhase;
  resumePhase: Exclude<MagneticDeflectionPhase, "paused">;
  time: number;
  phaseTime: number;
  particles: RadiationParticle[];
  impacts: ScreenImpact[];
  events: MagneticDeflectionEvent[];
  emissionPulse: number;
};

export type MagneticDeflectionMetrics = {
  phase: MagneticDeflectionPhase;
  time: number;
  fieldStrength: number;
  fieldDirection: "into" | "out";
  alphaRadius: number;
  betaRadius: number;
  alphaDeflection: number;
  betaDeflection: number;
  gammaDeflection: number;
  alphaForce: number;
  betaForce: number;
  impacts: ScreenImpact[];
  events: MagneticDeflectionEvent[];
  paths: Record<RadiationType, Vector2[]>;
};

export type MagneticDeflectionCommand = "start" | "pause" | "resume";

export type MagneticDeflectionStepResult = {
  state: MagneticDeflectionState;
  completed: boolean;
};

export type MagneticDeflectionScene = Record<string, never>;
