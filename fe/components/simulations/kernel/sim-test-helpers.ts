// Tiện ích cho test kernel (headless — không React/Konva). Không phải file test
// nên vitest không chạy như một suite; chỉ được các *.test.ts import.

import { buildKernel, stepScene, type SceneKernel } from "./build-derivs";
import type { StateVec } from "../shared/ode";
import type { Scene } from "./types";

// dt khớp sub-step của renderer (~1/240 s) → test kiểm đúng cái người dùng thấy.
export const DT = 1 / 240;

/** Khởi tạo kernel + trạng thái đầu đã chiếu ràng buộc. */
export function start(scene: Scene): { k: SceneKernel; s: StateVec } {
  const k = buildKernel(scene);
  return { k, s: k.project(k.initialState) };
}

/** Tích phân `seconds` giây, gọi `onStep(s, t)` sau mỗi bước nếu có. */
export function run(
  scene: Scene,
  seconds: number,
  onStep?: (s: StateVec, t: number) => void,
  dt = DT,
): { k: SceneKernel; s: StateVec } {
  const { k } = start(scene);
  let s = k.project(k.initialState);
  const steps = Math.round(seconds / dt);
  for (let i = 0; i < steps; i++) {
    s = stepScene(k, s, dt);
    onStep?.(s, (i + 1) * dt);
  }
  return { k, s };
}
