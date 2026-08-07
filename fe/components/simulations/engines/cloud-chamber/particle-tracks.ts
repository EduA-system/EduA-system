import { ALPHA_START, CHAMBER_BOUNDS } from "./constants";
import type { CloudChamberParams, ParticleTrack, ParticleType, Vector2 } from "./types";

const normalize = (vector: Vector2): Vector2 => {
  const length = Math.hypot(vector.x, vector.y) || 1;
  return { x: vector.x / length, y: vector.y / length };
};

function rangeToBounds(start: Vector2, direction: Vector2): number {
  const candidates = [
    direction.x > 0 ? (CHAMBER_BOUNDS.right - start.x) / direction.x : Number.POSITIVE_INFINITY,
    direction.x < 0 ? (CHAMBER_BOUNDS.left - start.x) / direction.x : Number.POSITIVE_INFINITY,
    direction.y > 0 ? (CHAMBER_BOUNDS.bottom - start.y) / direction.y : Number.POSITIVE_INFINITY,
    direction.y < 0 ? (CHAMBER_BOUNDS.top - start.y) / direction.y : Number.POSITIVE_INFINITY,
  ].filter((value) => Number.isFinite(value) && value >= 0);
  return Math.max(0, Math.min(...candidates));
}

function makeTrack(options: {
  id: string;
  particleType: ParticleType;
  start: Vector2;
  direction: Vector2;
  velocity: number;
  energy: number;
  range: number;
  ionizationDensity: number;
  width: number;
  opacity: number;
  seed: number;
  parentTrackId: string | null;
}): ParticleTrack {
  const direction = normalize(options.direction);
  const safeRange = Math.max(0, Math.min(options.range, rangeToBounds(options.start, direction)));
  return {
    id: options.id,
    particleType: options.particleType,
    startPosition: { ...options.start },
    position: { ...options.start },
    direction,
    velocity: Math.max(0, options.velocity),
    energy: Math.max(0, options.energy),
    initialEnergy: Math.max(0, options.energy),
    remainingRange: safeRange,
    initialRange: safeRange,
    ionizationDensity: Math.max(0, options.ionizationDensity),
    width: Math.max(0.5, options.width),
    opacity: Math.min(1, Math.max(0, options.opacity)),
    dropletSeed: options.seed,
    active: safeRange > 0,
    parentTrackId: options.parentTrackId,
    distanceTraveled: 0,
    points: [{ ...options.start }],
  };
}

export function createAlphaTrack(params: CloudChamberParams, seed: number): ParticleTrack {
  const angle = ((seed % 7) - 3) * 0.0028;
  const energyFactor = Math.max(0.35, params.alphaEnergy / 72);
  return makeTrack({
    id: `alpha-${seed}`,
    particleType: "alpha",
    start: ALPHA_START,
    direction: { x: Math.cos(angle), y: Math.sin(angle) },
    velocity: 172 * Math.sqrt(energyFactor),
    energy: params.alphaEnergy,
    range: 310 + 180 * energyFactor,
    ionizationDensity: 0.8 + params.airDensity / 55,
    width: 2.3 + params.airDensity / 85,
    opacity: Math.min(1, 0.42 + params.chamberSensitivity / 145),
    seed: seed * 97 + 17,
    parentTrackId: null,
  });
}

export function createProductTracks(
  collisionPoint: Vector2,
  alphaTrack: ParticleTrack,
  seed: number,
): [ParticleTrack, ParticleTrack] {
  const protonAngle = -0.68 - (seed % 3) * 0.018;
  const oxygenAngle = 0.3 + (seed % 4) * 0.018;
  const energyFactor = Math.max(0.45, Math.min(1.4, alphaTrack.initialEnergy / 72));
  const proton = makeTrack({
    id: `proton-${seed}`,
    particleType: "proton",
    start: collisionPoint,
    direction: { x: Math.cos(protonAngle), y: Math.sin(protonAngle) },
    velocity: 196,
    energy: alphaTrack.initialEnergy * 0.58,
    range: 130 + 170 * energyFactor,
    ionizationDensity: 0.48 + alphaTrack.ionizationDensity * 0.18,
    width: 1.55,
    opacity: 0.84,
    seed: seed * 101 + 31,
    parentTrackId: alphaTrack.id,
  });
  const oxygen = makeTrack({
    id: `oxygen17-${seed}`,
    particleType: "oxygen17",
    start: collisionPoint,
    direction: { x: Math.cos(oxygenAngle), y: Math.sin(oxygenAngle) },
    velocity: 76,
    energy: alphaTrack.initialEnergy * 0.28,
    range: 52 + 62 * energyFactor,
    ionizationDensity: 1.85 + alphaTrack.ionizationDensity * 0.38,
    width: 4.15,
    opacity: 0.98,
    seed: seed * 103 + 47,
    parentTrackId: alphaTrack.id,
  });
  return [proton, oxygen];
}

export function moveTrack(track: ParticleTrack, dt: number, distanceLimit?: number): ParticleTrack {
  if (!track.active || dt <= 0) return track;
  const requested = track.velocity * dt;
  const allowed = Math.max(0, Math.min(requested, track.remainingRange, distanceLimit ?? Number.POSITIVE_INFINITY));
  const position = {
    x: track.position.x + track.direction.x * allowed,
    y: track.position.y + track.direction.y * allowed,
  };
  const remainingRange = Math.max(0, track.remainingRange - allowed);
  const distanceTraveled = track.distanceTraveled + allowed;
  const energyRatio = track.initialRange > 0 ? remainingRange / track.initialRange : 0;
  const active = allowed >= requested - 1e-6 && remainingRange > 1e-4;
  const shouldStorePoint =
    track.points.length === 1 ||
    Math.hypot(position.x - track.points.at(-1)!.x, position.y - track.points.at(-1)!.y) >= 5 ||
    !active;
  return {
    ...track,
    position,
    remainingRange,
    distanceTraveled,
    energy: Math.max(0, track.initialEnergy * energyRatio),
    active,
    points: shouldStorePoint ? [...track.points, position] : track.points,
  };
}

export function createCollisionPoint(alpha: ParticleTrack, seed: number): Vector2 {
  const energyProgress = Math.max(0, Math.min(1, (alpha.initialEnergy - 35) / 65));
  const x = 430 + energyProgress * 118 + (seed % 5) * 5;
  const distance = Math.max(0, (x - alpha.startPosition.x) / Math.max(alpha.direction.x, 0.1));
  return {
    x: alpha.startPosition.x + alpha.direction.x * distance,
    y: alpha.startPosition.y + alpha.direction.y * distance,
  };
}
