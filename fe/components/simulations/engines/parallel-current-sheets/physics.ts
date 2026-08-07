import type { ParallelCurrentSheetsScene, ParallelCurrentSheetsState } from "./types";
const MU_0 = 4 * Math.PI * 1e-7;
const EPSILON = 1e-9;
export const MIN_SHEET_SEPARATION = 0.075;
export function currentSheetForce(scene: ParallelCurrentSheetsScene, state: ParallelCurrentSheetsState) {
  const distance = Math.max(MIN_SHEET_SEPARATION, scene.separation + state.rightX - state.leftX);
  const magnitude = (MU_0 * Math.abs(scene.currentLeft * scene.currentRight) * scene.length) / (2 * Math.PI * distance);
  const direction = Math.sign(scene.currentLeft * scene.currentRight);
  return { left: -direction * magnitude, right: direction * magnitude, magnitude, distance };
}
export function initialCurrentSheetsState(): ParallelCurrentSheetsState { return { leftX: 0, leftV: 0, rightX: 0, rightV: 0 }; }

export function stepCurrentSheets(scene: ParallelCurrentSheetsScene, state: ParallelCurrentSheetsState, dt: number): ParallelCurrentSheetsState {
  if (dt <= 0) return state;
  const force = currentSheetForce(scene, state);
  const mass = Math.max(scene.mass, EPSILON);
  const leftA = (force.left - scene.suspensionStiffness * state.leftX - scene.damping * state.leftV) / mass;
  const rightA = (force.right - scene.suspensionStiffness * state.rightX - scene.damping * state.rightV) / mass;
  let leftV = state.leftV + leftA * dt;
  let rightV = state.rightV + rightA * dt;
  let leftX = state.leftX + leftV * dt;
  let rightX = state.rightX + rightV * dt;

  // Chiếu trạng thái về biên tiếp xúc để hai tấm không xuyên/đổi chỗ khi lực hút lớn.
  const separation = scene.separation + rightX - leftX;
  if (separation < MIN_SHEET_SEPARATION) {
    const correction = (MIN_SHEET_SEPARATION - separation) / 2;
    leftX -= correction;
    rightX += correction;

    // Khi đang lao vào nhau, loại bỏ vận tốc tương đối theo phương va chạm.
    if (rightV - leftV < 0) {
      const sharedVelocity = (leftV + rightV) / 2;
      leftV = sharedVelocity;
      rightV = sharedVelocity;
    }
  }

  return { leftX, leftV, rightX, rightV };
}
