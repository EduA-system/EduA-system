import type { ParallelCurrentSheetsScene, ParallelCurrentSheetsState } from "./types";
const MU_0 = 4 * Math.PI * 1e-7;
const MIN_SEPARATION = 0.05;
export function currentSheetForce(scene: ParallelCurrentSheetsScene, state: ParallelCurrentSheetsState) {
  const distance = Math.max(MIN_SEPARATION, scene.separation + state.rightX - state.leftX);
  const magnitude = (MU_0 * Math.abs(scene.currentLeft * scene.currentRight) * scene.length) / (2 * Math.PI * distance);
  const direction = Math.sign(scene.currentLeft * scene.currentRight);
  return { left: -direction * magnitude, right: direction * magnitude, magnitude, distance };
}
export function initialCurrentSheetsState(): ParallelCurrentSheetsState { return { leftX: 0, leftV: 0, rightX: 0, rightV: 0 }; }
export function stepCurrentSheets(scene: ParallelCurrentSheetsScene, state: ParallelCurrentSheetsState, dt: number): ParallelCurrentSheetsState {
  if (dt <= 0) return state;
  const force = currentSheetForce(scene, state);
  const leftA = (force.left - scene.suspensionStiffness * state.leftX - scene.damping * state.leftV) / scene.mass;
  const rightA = (force.right - scene.suspensionStiffness * state.rightX - scene.damping * state.rightV) / scene.mass;
  const leftV = state.leftV + leftA * dt; const rightV = state.rightV + rightA * dt;
  return { leftX: state.leftX + leftV * dt, leftV, rightX: state.rightX + rightV * dt, rightV };
}
