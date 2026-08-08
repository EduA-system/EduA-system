import type { MagneticScene, MagneticState } from "./types";

const MIN_DISTANCE = 0.35;
const EPSILON = 1e-9;

export function normalizeAngle(angle: number) {
  return Math.atan2(Math.sin(angle), Math.cos(angle));
}

/** Hướng từ trường của lưỡng cực tại vị trí kim. */
export function magneticFieldAngle(scene: MagneticScene, magnet = scene.barMagnet) {
  const dx = scene.compass.x - magnet.x;
  const dy = scene.compass.y - magnet.y;
  const distance = Math.max(Math.hypot(dx, dy), MIN_DISTANCE);
  const rx = dx / distance;
  const ry = dy / distance;
  const mx = Math.cos(magnet.angle);
  const my = Math.sin(magnet.angle);
  const dot = mx * rx + my * ry;
  return Math.atan2(3 * dot * ry - my, 3 * dot * rx - mx);
}

export function magneticTorque(scene: MagneticScene, state: MagneticState, magnet = scene.barMagnet) {
  const dx = scene.compass.x - magnet.x;
  const dy = scene.compass.y - magnet.y;
  const distance = Math.max(Math.hypot(dx, dy), MIN_DISTANCE);
  const fieldStrength = Math.min(18, (magnet.strength * 1.6) / distance ** 3);
  return fieldStrength * Math.sin(normalizeAngle(magneticFieldAngle(scene, magnet) - state.angle));
}

export function initialMagneticState(): MagneticState {
  return { angle: Math.PI / 2, angularVelocity: 0 };
}

export function stepMagnetic(scene: MagneticScene, state: MagneticState, dt: number, magnet = scene.barMagnet): MagneticState {
  if (dt <= 0) return state;
  const acceleration =
    (magneticTorque(scene, state, magnet) - scene.compass.damping * state.angularVelocity) /
    Math.max(scene.compass.inertia, EPSILON);
  const angularVelocity = state.angularVelocity + acceleration * dt;
  return { angle: normalizeAngle(state.angle + angularVelocity * dt), angularVelocity };
}
