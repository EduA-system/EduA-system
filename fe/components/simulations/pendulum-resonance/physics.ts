import { PENDULUM_COUNT, type PendulumResonanceParams, type PendulumResonanceSnapshot } from "./types";

export const PENDULUM_DT = 1 / 120;
const MAX_ANGLE = Math.PI * 0.47;

const finite = (value: number, fallback = 0) => (Number.isFinite(value) ? value : fallback);
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export function naturalFrequencyHz(length: number, gravity: number) {
  return Math.sqrt(Math.max(0.01, gravity) / Math.max(0.08, length)) / (2 * Math.PI);
}

export function calculatePendulumEnergy(mass: number, length: number, gravity: number, angle: number, angularVelocity: number) {
  const kinetic = 0.5 * mass * length * length * angularVelocity * angularVelocity;
  const potential = mass * gravity * length * (1 - Math.cos(angle));
  return Math.max(0, finite(kinetic + potential));
}

export type ProjectedPoint = { x: number; y: number; z: number; scale: number; opacity: number };

export function calculatePerspectiveScale(z: number, perspective: number) {
  return clamp(1 + z * perspective * 0.16, 0.84, 1.16);
}

export function calculateDepthOpacity(z: number, perspective: number) {
  return clamp(0.82 + z * perspective * 0.06, 0.62, 0.98);
}

export function projectWorldToScreen(
  x: number,
  y: number,
  z: number,
  view: { centerX: number; centerY: number; scaleX: number; scaleY: number; perspective: number },
): ProjectedPoint {
  const skewX = view.scaleX * view.perspective * 0.11;
  const skewY = view.scaleY * view.perspective * 0.045;
  return {
    x: view.centerX + view.scaleX * x + skewX * z,
    y: view.centerY - view.scaleY * y - skewY * z,
    z,
    scale: calculatePerspectiveScale(z, view.perspective),
    opacity: calculateDepthOpacity(z, view.perspective),
  };
}

export function sortByDepth<T extends { z: number }>(items: T[]) {
  return [...items].sort((a, b) => a.z - b.z);
}

export class PendulumResonanceRuntime {
  readonly theta = new Float64Array(PENDULUM_COUNT);
  readonly angularVelocity = new Float64Array(PENDULUM_COUNT);
  readonly angularAcceleration = new Float64Array(PENDULUM_COUNT);

  time = 0;
  supportDisplacement = 0;
  supportVelocity = 0;
  supportAcceleration = 0;
  private amplitude = new Float64Array(PENDULUM_COUNT);

  constructor(private readonly params: PendulumResonanceParams) {
    this.reset();
  }

  reset() {
    this.time = 0;
    this.supportDisplacement = 0;
    this.supportVelocity = 0;
    this.supportAcceleration = 0;
    this.theta.fill(0);
    this.angularVelocity.fill(0);
    this.angularAcceleration.fill(0);
    this.amplitude.fill(0);
    const source = clamp(Math.round(this.params.sourceIndex), 0, PENDULUM_COUNT - 1);
    this.theta[source] = clamp((finite(this.params.initialAngle) * Math.PI) / 180, -MAX_ANGLE, MAX_ANGLE);
    this.angularVelocity[source] = finite(this.params.initialAngularVelocity);
  }

  setAngle(index: number, angle: number) {
    if (index < 0 || index >= PENDULUM_COUNT) return;
    this.theta[index] = clamp(angle, -MAX_ANGLE, MAX_ANGLE);
    this.angularVelocity[index] = 0;
    this.angularAcceleration[index] = 0;
  }

  private supportForce() {
    let force = 0;
    for (let i = 0; i < PENDULUM_COUNT; i += 1) {
      const length = Math.max(0.08, this.params.lengths[i] ?? 1);
      const mass = Math.max(0.001, this.params.masses[i] ?? 0.12);
      // Phản lực chỉ đi vào thanh treo, không có hạng tử bob_i -> bob_j.
      force += -mass * length * (this.angularAcceleration[i] * Math.cos(this.theta[i]) - this.angularVelocity[i] * this.angularVelocity[i] * Math.sin(this.theta[i]));
    }
    return finite(force);
  }

  step(dt = PENDULUM_DT): PendulumResonanceSnapshot {
    const h = clamp(finite(dt, PENDULUM_DT), 1 / 600, 1 / 30);
    const supportMass = Math.max(0.05, finite(this.params.supportMass, 0.8));
    const stiffness = Math.max(0, finite(this.params.supportStiffness, 4));
    const supportDamping = Math.max(0, finite(this.params.supportDamping, 0.5));
    const driveFrequency = Math.max(0, finite(this.params.driveFrequency, 0.5));
    const driveForce = this.params.driveEnabled
      ? finite(this.params.driveAmplitude) * Math.cos(2 * Math.PI * driveFrequency * this.time + finite(this.params.drivePhase))
      : 0;

    let supportAcceleration = this.supportAcceleration;
    for (let iteration = 0; iteration < 3; iteration += 1) {
      for (let i = 0; i < PENDULUM_COUNT; i += 1) {
        const length = Math.max(0.08, finite(this.params.lengths[i], 1));
        const damping = Math.max(0, finite(this.params.damping[i]));
        this.angularAcceleration[i] =
          -(finite(this.params.gravity, 9.81) / length) * Math.sin(this.theta[i])
          - damping * this.angularVelocity[i]
          - (supportAcceleration / length) * Math.cos(this.theta[i]);
      }
      const reaction = this.supportForce();
      supportAcceleration = (reaction + driveForce - supportDamping * this.supportVelocity - stiffness * this.supportDisplacement) / supportMass;
      supportAcceleration = clamp(finite(supportAcceleration), -8, 8);
    }

    this.supportAcceleration = supportAcceleration;
    this.supportVelocity = clamp(finite(this.supportVelocity + supportAcceleration * h), -2, 2);
    this.supportDisplacement = clamp(finite(this.supportDisplacement + this.supportVelocity * h), -0.12, 0.12);
    for (let i = 0; i < PENDULUM_COUNT; i += 1) {
      this.angularVelocity[i] = clamp(finite(this.angularVelocity[i] + this.angularAcceleration[i] * h), -12, 12);
      this.theta[i] = clamp(finite(this.theta[i] + this.angularVelocity[i] * h), -MAX_ANGLE, MAX_ANGLE);
      this.amplitude[i] = Math.max(Math.abs(this.theta[i]), this.amplitude[i] * 0.997);
    }
    this.time += h;
    return this.snapshot(driveForce);
  }

  snapshot(driveForce = 0): PendulumResonanceSnapshot {
    const gravity = finite(this.params.gravity, 9.81);
    const energies = Array.from({ length: PENDULUM_COUNT }, (_, i) =>
      calculatePendulumEnergy(
        Math.max(0.001, finite(this.params.masses[i], 0.12)),
        Math.max(0.08, finite(this.params.lengths[i], 1)),
        gravity,
        this.theta[i],
        this.angularVelocity[i],
      ),
    );
    const supportEnergy = Math.max(0, 0.5 * Math.max(0.05, finite(this.params.supportMass, 0.8)) * this.supportVelocity ** 2 + 0.5 * Math.max(0, finite(this.params.supportStiffness, 4)) * this.supportDisplacement ** 2);
    return {
      time: this.time,
      supportDisplacement: this.supportDisplacement,
      supportVelocity: this.supportVelocity,
      supportAcceleration: this.supportAcceleration,
      theta: Array.from(this.theta),
      angularVelocity: Array.from(this.angularVelocity),
      amplitudes: Array.from(this.amplitude),
      energies,
      supportEnergy,
      totalEnergy: energies.reduce((sum, value) => sum + value, supportEnergy),
      driveForce,
      naturalFrequencies: this.params.lengths.map((length) => naturalFrequencyHz(length, gravity)),
    };
  }
}
