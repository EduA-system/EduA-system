import type { BrownianBoundary, BrownianParams, BrownianRuntimeOptions, BrownianSample, BrownianSnapshot } from "./types";

export const BOLTZMANN_CONSTANT = 1.380649e-23;
const MICROMETER = 1e-6;
const NANO_KILOGRAM = 1e-9;
const WORLD_HALF_WIDTH = 15 * MICROMETER;
const WORLD_HALF_HEIGHT = 10 * MICROMETER;
const PHYSICS_DT = 1 / 120;

export function createSeededRandom(seed: number): () => number {
  let state = (Math.floor(seed) >>> 0) || 0x6d2b79f5;
  return () => {
    state = Math.imul(state ^ (state >>> 15), state | 1);
    state ^= state + Math.imul(state ^ (state >>> 7), state | 61);
    return ((state ^ (state >>> 14)) >>> 0) / 4294967296;
  };
}

export function generateGaussianPair(random: () => number): [number, number] {
  const u1 = Math.max(random(), Number.EPSILON);
  const u2 = random();
  const radius = Math.sqrt(-2 * Math.log(u1));
  const angle = 2 * Math.PI * u2;
  return [radius * Math.cos(angle), radius * Math.sin(angle)];
}

export function calculateDragCoefficient(viscosityMilliPascalSeconds: number, radiusMicrometers: number): number {
  return 6 * Math.PI * (viscosityMilliPascalSeconds * 1e-3) * (radiusMicrometers * MICROMETER);
}

export function calculateDiffusionCoefficient(
  temperature: number,
  viscosityMilliPascalSeconds: number,
  radiusMicrometers: number,
): number {
  const gamma = calculateDragCoefficient(viscosityMilliPascalSeconds, radiusMicrometers);
  return gamma > 0 ? (BOLTZMANN_CONSTANT * temperature) / gamma : 0;
}

export function diffusionInMicrometersSquaredPerSecond(params: BrownianParams): number {
  return params.autoDiffusion
    ? calculateDiffusionCoefficient(params.temperature, params.viscosity, params.radius) * 1e12
    : Math.max(0, params.diffusion);
}

export function calculateDisplacement(x: number, y: number, x0 = 0, y0 = 0): number {
  return Math.hypot(x - x0, y - y0);
}

export function calculateSquaredDisplacement(x: number, y: number, x0 = 0, y0 = 0): number {
  const dx = x - x0;
  const dy = y - y0;
  return dx * dx + dy * dy;
}

export function updateRandomWalkParticle(
  x: number,
  y: number,
  dt: number,
  diffusion: number,
  gaussian: [number, number],
): { x: number; y: number; vx: number; vy: number; randomForce: { x: number; y: number } } {
  const sigma = Math.sqrt(Math.max(0, 2 * diffusion * dt));
  const dx = sigma * gaussian[0];
  const dy = sigma * gaussian[1];
  return {
    x: x + dx,
    y: y + dy,
    vx: dx / dt,
    vy: dy / dt,
    randomForce: { x: dx / Math.max(dt, 1e-9), y: dy / Math.max(dt, 1e-9) },
  };
}

export function updateLangevinParticle(
  x: number,
  y: number,
  vx: number,
  vy: number,
  dt: number,
  temperature: number,
  viscosityMilliPascalSeconds: number,
  radiusMicrometers: number,
  massNanoKilograms: number,
  random: () => number,
): { x: number; y: number; vx: number; vy: number; randomForce: { x: number; y: number }; dragForce: { x: number; y: number } } {
  const gamma = calculateDragCoefficient(viscosityMilliPascalSeconds, radiusMicrometers);
  const mass = Math.max(massNanoKilograms * NANO_KILOGRAM, 1e-18);
  const tau = Math.max(mass / Math.max(gamma, 1e-24), 1e-7);
  const substeps = Math.min(96, Math.max(1, Math.ceil(dt / Math.min(dt, tau * 0.15))));
  const h = dt / substeps;
  let nextX = x;
  let nextY = y;
  let nextVx = vx;
  let nextVy = vy;
  let randomFx = 0;
  let randomFy = 0;

  for (let i = 0; i < substeps; i += 1) {
    const [nx, ny] = generateGaussianPair(random);
    const noiseAcceleration = Math.sqrt(2 * gamma * BOLTZMANN_CONSTANT * temperature) / mass * Math.sqrt(h);
    const dragAcceleration = gamma / mass;
    randomFx = noiseAcceleration * mass * nx;
    randomFy = noiseAcceleration * mass * ny;
    nextVx += -dragAcceleration * nextVx * h + noiseAcceleration * nx;
    nextVy += -dragAcceleration * nextVy * h + noiseAcceleration * ny;
    nextX += nextVx * h;
    nextY += nextVy * h;
  }

  return {
    x: nextX,
    y: nextY,
    vx: nextVx,
    vy: nextVy,
    randomForce: { x: randomFx, y: randomFy },
    dragForce: { x: -gamma * nextVx, y: -gamma * nextVy },
  };
}

function applyBoundary(
  x: number,
  y: number,
  vx: number,
  vy: number,
  boundary: BrownianBoundary,
  radius: number,
): { x: number; y: number; vx: number; vy: number } {
  if (boundary === "large-field") return { x, y, vx, vy };
  if (boundary === "wrap") {
    const wrappedX = x > WORLD_HALF_WIDTH ? -WORLD_HALF_WIDTH : x < -WORLD_HALF_WIDTH ? WORLD_HALF_WIDTH : x;
    const wrappedY = y > WORLD_HALF_HEIGHT ? -WORLD_HALF_HEIGHT : y < -WORLD_HALF_HEIGHT ? WORLD_HALF_HEIGHT : y;
    return { x: wrappedX, y: wrappedY, vx, vy };
  }

  const minX = -WORLD_HALF_WIDTH + radius;
  const maxX = WORLD_HALF_WIDTH - radius;
  const minY = -WORLD_HALF_HEIGHT + radius;
  const maxY = WORLD_HALF_HEIGHT - radius;
  let nextX = x;
  let nextY = y;
  let nextVx = vx;
  let nextVy = vy;
  if (nextX < minX) { nextX = minX; nextVx = Math.abs(nextVx); }
  if (nextX > maxX) { nextX = maxX; nextVx = -Math.abs(nextVx); }
  if (nextY < minY) { nextY = minY; nextVy = Math.abs(nextVy); }
  if (nextY > maxY) { nextY = maxY; nextVy = -Math.abs(nextVy); }
  return { x: nextX, y: nextY, vx: nextVx, vy: nextVy };
}

export type MoleculeBuffers = {
  x: Float32Array;
  y: Float32Array;
  vx: Float32Array;
  vy: Float32Array;
};

export function createMoleculeBuffers(count: number, random: () => number): MoleculeBuffers {
  const x = new Float32Array(count);
  const y = new Float32Array(count);
  const vx = new Float32Array(count);
  const vy = new Float32Array(count);
  for (let i = 0; i < count; i += 1) {
    x[i] = (random() * 2 - 1) * WORLD_HALF_WIDTH;
    y[i] = (random() * 2 - 1) * WORLD_HALF_HEIGHT;
    const angle = random() * Math.PI * 2;
    const speed = (0.4 + random() * 0.8) * 20 * MICROMETER;
    vx[i] = Math.cos(angle) * speed;
    vy[i] = Math.sin(angle) * speed;
  }
  return { x, y, vx, vy };
}

export function updateMolecules(
  molecules: MoleculeBuffers,
  dt: number,
  temperature: number,
  pollen: { x: number; y: number; vx: number; vy: number },
  pollenRadius: number,
  random: () => number,
): { impulseX: number; impulseY: number } {
  const thermalScale = Math.sqrt(Math.max(temperature, 1) / 298);
  let impulseX = 0;
  let impulseY = 0;
  const moleculeRadius = 0.06 * MICROMETER;
  for (let i = 0; i < molecules.x.length; i += 1) {
    molecules.x[i] += molecules.vx[i]! * dt * thermalScale;
    molecules.y[i] += molecules.vy[i]! * dt * thermalScale;
    if (molecules.x[i]! < -WORLD_HALF_WIDTH || molecules.x[i]! > WORLD_HALF_WIDTH) molecules.vx[i] = -molecules.vx[i]!;
    if (molecules.y[i]! < -WORLD_HALF_HEIGHT || molecules.y[i]! > WORLD_HALF_HEIGHT) molecules.vy[i] = -molecules.vy[i]!;
    molecules.x[i] = Math.max(-WORLD_HALF_WIDTH, Math.min(WORLD_HALF_WIDTH, molecules.x[i]!));
    molecules.y[i] = Math.max(-WORLD_HALF_HEIGHT, Math.min(WORLD_HALF_HEIGHT, molecules.y[i]!));

    const dx = molecules.x[i]! - pollen.x;
    const dy = molecules.y[i]! - pollen.y;
    const distance = Math.hypot(dx, dy) || 1e-12;
    if (distance < pollenRadius + moleculeRadius) {
      const nx = dx / distance;
      const ny = dy / distance;
      const relativeNormal = (molecules.vx[i]! - pollen.vx) * nx + (molecules.vy[i]! - pollen.vy) * ny;
      if (relativeNormal < 0) {
        molecules.vx[i] -= 2 * relativeNormal * nx;
        molecules.vy[i] -= 2 * relativeNormal * ny;
        const smallImpulse = 1.5e-15 * (0.5 + random());
        impulseX += nx * smallImpulse;
        impulseY += ny * smallImpulse;
      }
      molecules.x[i] = pollen.x + nx * (pollenRadius + moleculeRadius);
      molecules.y[i] = pollen.y + ny * (pollenRadius + moleculeRadius);
    }
  }
  return { impulseX, impulseY };
}

export class BrownianRuntime {
  readonly random: () => number;
  readonly molecules: MoleculeBuffers;
  readonly initial = { x: 0, y: 0 };
  readonly pollenRadius: number;
  time = 0;
  x = 0;
  y = 0;
  vx = 0;
  vy = 0;
  randomForce = { x: 0, y: 0 };
  dragForce = { x: 0, y: 0 };

  constructor(options: BrownianRuntimeOptions) {
    this.random = createSeededRandom(options.params.seed);
    this.molecules = createMoleculeBuffers(options.moleculeCount, this.random);
    this.pollenRadius = options.params.radius * MICROMETER;
  }

  step(params: BrownianParams, dt = PHYSICS_DT): BrownianSnapshot {
    const diffusion = diffusionInMicrometersSquaredPerSecond(params) * 1e-12;
    if (params.mode === "random-walk") {
      const gaussian = generateGaussianPair(this.random);
      const next = updateRandomWalkParticle(this.x, this.y, dt, diffusion, gaussian);
      this.x = next.x;
      this.y = next.y;
      this.vx = next.vx;
      this.vy = next.vy;
      this.randomForce = next.randomForce;
      this.dragForce = { x: 0, y: 0 };
    } else {
      const next = updateLangevinParticle(
        this.x,
        this.y,
        this.vx,
        this.vy,
        dt,
        params.temperature,
        params.viscosity,
        params.radius,
        params.mass,
        this.random,
      );
      this.x = next.x;
      this.y = next.y;
      this.vx = next.vx;
      this.vy = next.vy;
      this.randomForce = next.randomForce;
      this.dragForce = next.dragForce;
    }
    const boundary = applyBoundary(this.x, this.y, this.vx, this.vy, params.boundary, this.pollenRadius);
    this.x = boundary.x;
    this.y = boundary.y;
    this.vx = boundary.vx;
    this.vy = boundary.vy;
    if (params.showMolecules) {
      const impulse = updateMolecules(this.molecules, dt, params.temperature, this, this.pollenRadius, this.random);
      this.vx += impulse.impulseX / Math.max(params.mass * NANO_KILOGRAM, 1e-18);
      this.vy += impulse.impulseY / Math.max(params.mass * NANO_KILOGRAM, 1e-18);
    }
    this.time += dt;
    const displacement = calculateDisplacement(this.x, this.y, this.initial.x, this.initial.y);
    return {
      time: this.time,
      x: this.x,
      y: this.y,
      displacement,
      squaredDisplacement: displacement * displacement,
      speed: Math.hypot(this.vx, this.vy),
      diffusion: diffusion * 1e12,
      dragCoefficient: calculateDragCoefficient(params.viscosity, params.radius),
      randomForce: this.randomForce,
      dragForce: this.dragForce,
    };
  }

  reset(options: BrownianRuntimeOptions): void {
    const next = new BrownianRuntime(options);
    this.time = next.time;
    this.x = next.x;
    this.y = next.y;
    this.vx = next.vx;
    this.vy = next.vy;
    this.randomForce = next.randomForce;
    this.dragForce = next.dragForce;
    this.molecules.x.set(next.molecules.x);
    this.molecules.y.set(next.molecules.y);
    this.molecules.vx.set(next.molecules.vx);
    this.molecules.vy.set(next.molecules.vy);
  }
}

export function calculateEnsembleMSD(
  diffusionMicrometersSquaredPerSecond: number,
  duration: number,
  runs: number,
  seed: number,
  interval = 0.1,
): BrownianSample[] {
  const random = createSeededRandom(seed);
  const count = Math.max(1, Math.min(100, Math.round(runs)));
  const points = Math.max(1, Math.floor(duration / interval));
  const sums = new Float64Array(points + 1);
  const dt = interval;
  const diffusion = Math.max(0, diffusionMicrometersSquaredPerSecond);
  for (let run = 0; run < count; run += 1) {
    let x = 0;
    let y = 0;
    sums[0] += 0;
    for (let i = 1; i <= points; i += 1) {
      const [gx, gy] = generateGaussianPair(random);
      const sigma = Math.sqrt(2 * diffusion * dt);
      x += sigma * gx;
      y += sigma * gy;
      sums[i] += x * x + y * y;
    }
  }
  return Array.from({ length: points + 1 }, (_, i) => {
    const time = i * interval;
    const value = sums[i]! / count;
    return { time, x: 0, y: 0, displacement: Math.sqrt(value), squaredDisplacement: value };
  });
}

export function getWorldBounds(): { halfWidth: number; halfHeight: number } {
  return { halfWidth: WORLD_HALF_WIDTH, halfHeight: WORLD_HALF_HEIGHT };
}

export function getPhysicsDt(): number {
  return PHYSICS_DT;
}
