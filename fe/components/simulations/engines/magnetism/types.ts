export type MagneticScene = {
  kind: "magnetism";
  compass: { x: number; y: number; length: number; inertia: number; damping: number };
  barMagnet: { x: number; y: number; length: number; angle: number; strength: number };
};

export type MagneticState = { angle: number; angularVelocity: number };
