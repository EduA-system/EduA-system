import type { RotationScene, RotationState, RotationTorques } from "./types";

const EPSILON = 1e-9;

export function diskInertia(scene: RotationScene): number {
  const factor = scene.inertiaModel === "rod" ? 1 / 3 : 1 / 2;
  return factor * scene.diskMass * scene.diskRadius * scene.diskRadius;
}

export function totalInertia(scene: RotationScene): number {
  return diskInertia(scene) + scene.left.mass * scene.left.radius ** 2 + scene.right.mass * scene.right.radius ** 2;
}

export function rotationTorques(scene: RotationScene, theta = 0): RotationTorques {
  // Dây và quả cân cùng quay với đĩa. Cánh tay đòn thực của trọng lực là
  // d·cos(theta): ở theta = 0 đây là đúng d của quy tắc moment lực.
  const leverFactor = Math.cos(theta);
  const left = scene.left.mass * scene.gravity * scene.left.radius * leverFactor;
  const right = scene.right.mass * scene.gravity * scene.right.radius * leverFactor;
  return { left, right, net: left - right, inertia: totalInertia(scene) };
}

export function initialRotationState(scene: RotationScene): RotationState {
  return { theta: scene.initialTheta ?? 0, omega: scene.initialOmega ?? 0, stoppedAtLimit: false };
}

export function angularAcceleration(scene: RotationScene, state: Pick<RotationState, "theta" | "omega">): number {
  const { net, inertia } = rotationTorques(scene, state.theta);
  return (net - scene.angularDamping * state.omega) / Math.max(inertia, EPSILON);
}

function derivative(scene: RotationScene, theta: number, omega: number) {
  return { dTheta: omega, dOmega: angularAcceleration(scene, { theta, omega }) };
}

/** Một bước RK4 cho I.alpha = sum(tau), có chặn hành trình dây. */
export function stepRotation(scene: RotationScene, state: RotationState, dt: number): RotationState {
  if (dt <= 0) return state;

  if (state.stoppedAtLimit) {
    const acceleration = angularAcceleration(scene, state);
    const atMin = scene.minTheta != null && state.theta <= scene.minTheta + EPSILON;
    const atMax = scene.maxTheta != null && state.theta >= scene.maxTheta - EPSILON;
    if ((atMin && acceleration <= 0) || (atMax && acceleration >= 0)) return state;
  }

  const k1 = derivative(scene, state.theta, state.omega);
  const k2 = derivative(scene, state.theta + (dt * k1.dTheta) / 2, state.omega + (dt * k1.dOmega) / 2);
  const k3 = derivative(scene, state.theta + (dt * k2.dTheta) / 2, state.omega + (dt * k2.dOmega) / 2);
  const k4 = derivative(scene, state.theta + dt * k3.dTheta, state.omega + dt * k3.dOmega);

  let theta = state.theta + (dt * (k1.dTheta + 2 * k2.dTheta + 2 * k3.dTheta + k4.dTheta)) / 6;
  let omega = state.omega + (dt * (k1.dOmega + 2 * k2.dOmega + 2 * k3.dOmega + k4.dOmega)) / 6;
  let stoppedAtLimit = false;

  if (scene.minTheta != null && theta <= scene.minTheta) {
    theta = scene.minTheta;
    omega = 0;
    stoppedAtLimit = true;
  }
  if (scene.maxTheta != null && theta >= scene.maxTheta) {
    theta = scene.maxTheta;
    omega = 0;
    stoppedAtLimit = true;
  }
  return { theta, omega, stoppedAtLimit };
}

export function rotationStateAt(scene: RotationScene, seconds: number, step = 1 / 240): RotationState {
  let state = initialRotationState(scene);
  let remaining = Math.max(0, seconds);
  while (remaining > EPSILON && !state.stoppedAtLimit) {
    const dt = Math.min(step, remaining);
    state = stepRotation(scene, state, dt);
    remaining -= dt;
  }
  return state;
}
