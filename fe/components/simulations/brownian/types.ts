export type BrownianMode = "langevin" | "random-walk";
export type BrownianViewMode = "micro" | "trajectory";
export type BrownianBoundary = "reflect" | "wrap" | "large-field";

export type BrownianParams = {
  temperature: number;
  viscosity: number;
  radius: number;
  mass: number;
  moleculeDensity: number;
  mode: BrownianMode;
  autoDiffusion: boolean;
  diffusion: number;
  boundary: BrownianBoundary;
  showMolecules: boolean;
  showTrajectory: boolean;
  showSamples: boolean;
  showVelocity: boolean;
  showRandomForce: boolean;
  showDragForce: boolean;
  showGrid: boolean;
  showLabel: boolean;
  showRadius: boolean;
  keepFullPath: boolean;
  trailLength: number;
  ensembleRuns: number;
  seed: number;
  speed: number;
};

export type BrownianSample = {
  time: number;
  x: number;
  y: number;
  displacement: number;
  squaredDisplacement: number;
};

export type BrownianSnapshot = BrownianSample & {
  speed: number;
  diffusion: number;
  dragCoefficient: number;
  randomForce: { x: number; y: number };
  dragForce: { x: number; y: number };
};

export type BrownianRuntimeOptions = {
  width: number;
  height: number;
  moleculeCount: number;
  params: BrownianParams;
};
