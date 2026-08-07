import type { RutherfordScatteringPhase, RutherfordScatteringState } from "./types";

export const SCATTERING_PHASE_LABELS: Record<RutherfordScatteringPhase, string> = {
  idle: "Đang chuẩn bị",
  ready: "Thiết bị sẵn sàng",
  emitting: "Nguồn đang phát hạt α",
  approachingFoil: "Hạt α đang tới lá vàng",
  scattering: "Đang tán xạ tại lá vàng",
  travelingToScreen: "Hạt đang đi tới màn ZnS",
  scintillation: "Màn ZnS vừa phát chớp",
  observing: "Đang quan sát phân bố góc",
  completed: "Đã hoàn thành lượt đo",
  paused: "Đã tạm dừng",
  resetting: "Đang đặt lại",
};

const LOGGED_PHASES = new Set<RutherfordScatteringPhase>([
  "emitting",
  "approachingFoil",
  "scattering",
  "scintillation",
  "completed",
]);

export function transitionScattering(
  state: RutherfordScatteringState,
  next: RutherfordScatteringPhase,
): void {
  if (state.phase === next) return;
  if (next === "paused") state.phaseBeforePause = state.phase;
  state.phase = next;
  state.phaseTime = 0;
  if (!LOGGED_PHASES.has(next)) return;
  state.events.push({ time: state.elapsed, phase: next, label: SCATTERING_PHASE_LABELS[next] });
  if (state.events.length > 36) state.events.shift();
}

export function resumeScattering(state: RutherfordScatteringState): void {
  if (state.phase !== "paused") return;
  state.phase = state.phaseBeforePause === "paused" ? "ready" : state.phaseBeforePause;
  state.phaseTime = 0;
}
