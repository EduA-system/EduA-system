export const PENDULUM_COUNT = 5;

export type ResonanceMode = "energy-transfer" | "frequency-comparison" | "forced-drive";

export type PendulumResonanceParams = {
  sourceIndex: number;
  initialAngle: number;
  initialAngularVelocity: number;
  gravity: number;
  lengths: number[];
  masses: number[];
  damping: number[];
  supportMass: number;
  supportStiffness: number;
  supportDamping: number;
  visualSupportScale: number;
  driveEnabled: boolean;
  driveAmplitude: number;
  driveFrequency: number;
  drivePhase: number;
  showTrails: boolean;
  showShadows: boolean;
  showBalance: boolean;
  showLabels: boolean;
  showEnergy: boolean;
  showSupportMotion: boolean;
  perspective: number;
  speed: number;
};

export type PendulumResonanceSnapshot = {
  time: number;
  supportDisplacement: number;
  supportVelocity: number;
  supportAcceleration: number;
  theta: number[];
  angularVelocity: number[];
  amplitudes: number[];
  energies: number[];
  supportEnergy: number;
  totalEnergy: number;
  driveForce: number;
  naturalFrequencies: number[];
};

export type PendulumResonanceScene = Record<string, never>;
