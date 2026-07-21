import type { MagneticLoopDynamics, MagneticLoopScene, MagneticLoopState } from "./types";

const EPSILON = 1e-9;

export function loopArea(scene: MagneticLoopScene): number {
  return scene.width * scene.height;
}

/** Mô-men quán tính của khung dây mảnh đối với trục đi qua tâm, song song hai cạnh dài. */
export function loopInertia(scene: MagneticLoopScene): number {
  return (scene.mass * scene.width * scene.width) / 12;
}

/** Cổ góp đổi chiều dòng điện mỗi khi khung đi qua vị trí có sin(alpha) = 0. */
export function commutatedCurrent(scene: MagneticLoopScene, angle: number): number {
  if (Math.abs(scene.current) < EPSILON) return 0;
  const halfTurnSign = Math.sin(angle) >= 0 ? 1 : -1;
  return scene.current * halfTurnSign;
}

export function magneticLoopDynamics(
  scene: MagneticLoopScene,
  state: Pick<MagneticLoopState, "angle" | "angularVelocity">,
): MagneticLoopDynamics {
  const area = loopArea(scene);
  const inertia = Math.max(loopInertia(scene), EPSILON);
  const effectiveCurrent = commutatedCurrent(scene, state.angle);
  const magneticMoment = scene.turns * effectiveCurrent * area;
  const sideForce = scene.turns * Math.abs(scene.current) * scene.height * scene.magneticField;
  // tau = mu x B. Cổ góp làm tau giữ nguyên dấu qua từng nửa vòng.
  const torque = -magneticMoment * scene.magneticField * Math.sin(state.angle);
  const angularAcceleration = (torque - scene.angularDamping * state.angularVelocity) / inertia;
  return { area, inertia, effectiveCurrent, magneticMoment, sideForce, torque, angularAcceleration };
}

export function initialMagneticLoopState(scene: MagneticLoopScene): MagneticLoopState {
  return { angle: scene.initialAngle, angularVelocity: scene.initialAngularVelocity ?? 0 };
}

function derivative(scene: MagneticLoopScene, angle: number, angularVelocity: number) {
  return {
    angle: angularVelocity,
    angularVelocity: magneticLoopDynamics(scene, { angle, angularVelocity }).angularAcceleration,
  };
}

/** Một bước RK4 cho phương trình J.alpha'' = mu x B - c.alpha'. */
export function stepMagneticLoop(
  scene: MagneticLoopScene,
  state: MagneticLoopState,
  dt: number,
): MagneticLoopState {
  if (dt <= 0) return state;
  const h = Math.min(dt, 1 / 240);
  let next = state;
  let remaining = dt;

  while (remaining > EPSILON) {
    const step = Math.min(h, remaining);
    const k1 = derivative(scene, next.angle, next.angularVelocity);
    const k2 = derivative(scene, next.angle + (step * k1.angle) / 2, next.angularVelocity + (step * k1.angularVelocity) / 2);
    const k3 = derivative(scene, next.angle + (step * k2.angle) / 2, next.angularVelocity + (step * k2.angularVelocity) / 2);
    const k4 = derivative(scene, next.angle + step * k3.angle, next.angularVelocity + step * k3.angularVelocity);

    const advancedAngle = next.angle + (step / 6) * (k1.angle + 2 * k2.angle + 2 * k3.angle + k4.angle);
    next = {
      // Giữ góc trong [-pi, pi] để chạy lâu không mất độ chính xác lượng giác.
      angle: Math.atan2(Math.sin(advancedAngle), Math.cos(advancedAngle)),
      angularVelocity:
        next.angularVelocity +
        (step / 6) * (k1.angularVelocity + 2 * k2.angularVelocity + 2 * k3.angularVelocity + k4.angularVelocity),
    };
    remaining -= step;
  }

  return next;
}

export function magneticLoopStateAt(scene: MagneticLoopScene, seconds: number): MagneticLoopState {
  let state = initialMagneticLoopState(scene);
  let elapsed = 0;
  while (elapsed < seconds - EPSILON) {
    const dt = Math.min(1 / 120, seconds - elapsed);
    state = stepMagneticLoop(scene, state, dt);
    elapsed += dt;
  }
  return state;
}
