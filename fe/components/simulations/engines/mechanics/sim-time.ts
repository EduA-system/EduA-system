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

/**
 * Thời điểm đầu tiên tâm vật cắt một hoành độ cho trước. Hàm dùng chính kernel
 * của mô phỏng, nhờ đó mốc thời gian vẫn đúng khi tham số lực hoặc ma sát đổi.
 */
export function firstTimeBodyReachesX(
  scene: Scene,
  bodyId: string,
  targetX: number,
  maxSeconds = 20,
  sub = 1 / 240,
): number {
  const body = scene.bodies.find((candidate) => candidate.id === bodyId);
  if (!body) return 0;

  const kernel = buildKernel(scene);
  let state = kernel.project(kernel.initialState);
  let previous = body.fixed ? { x: body.x, y: body.y } : readPosition(state, bodyId);
  if (Math.abs(previous.x - targetX) < 1e-9) return 0;

  const direction = targetX > previous.x ? 1 : -1;
  const steps = Math.ceil(maxSeconds / sub);
  for (let i = 1; i <= steps; i++) {
    state = stepScene(kernel, state, sub);
    const current = body.fixed ? previous : readPosition(state, bodyId);
    const crossed = direction > 0 ? current.x >= targetX : current.x <= targetX;
    if (crossed) {
      const distance = current.x - previous.x;
      const fraction = Math.abs(distance) < 1e-12 ? 1 : (targetX - previous.x) / distance;
      return ((i - 1) + Math.max(0, Math.min(1, fraction))) * sub;
    }
    previous = current;
  }

  return maxSeconds;
}
