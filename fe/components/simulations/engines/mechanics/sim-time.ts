// Tiện ích tính vị trí các vật tại một thời điểm bất kỳ — tích phân xác định
// từ trạng thái đầu (không phụ thuộc frame rate). Dùng chung cho "đi tới mốc
// thời gian" và vẽ tàn ảnh (ghost) của mốc vừa đi qua trên canvas.

import { buildKernel, readPosition, stepScene } from "./build-derivs";
import type { Scene } from "./types";

export type BodyPositions = Record<string, { x: number; y: number }>;

/** Vị trí mọi vật (kể cả fixed) tại `seconds` giây kể từ trạng thái đầu. */
export function computeBodyPositionsAtTime(
  scene: Scene,
  seconds: number,
  sub = 1 / 240,
): BodyPositions {
  const kernel = buildKernel(scene);
  let state = kernel.project(kernel.initialState);
  if (seconds > 0) {
    const steps = Math.round(seconds / sub);
    for (let i = 0; i < steps; i++) state = stepScene(kernel, state, sub);
  }
  const out: BodyPositions = {};
  for (const b of scene.bodies) {
    out[b.id] = b.fixed ? { x: b.x, y: b.y } : readPosition(state, b.id);
  }
  return out;
}
