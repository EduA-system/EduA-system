import type { PhaseEvent, RutherfordPhase, RutherfordState } from "./types";

export const RUTHERFORD_PHASE_LABELS: Record<RutherfordPhase, string> = {
  idle: "Đang chuẩn bị",
  loadingGas: "Đang nạp khí",
  ready: "Thiết bị sẵn sàng",
  emittingAlpha: "Đang phát hạt α",
  alphaTraveling: "Hạt α đi qua khí",
  alphaScattering: "Hạt α bị tán xạ",
  alphaAbsorbed: "Hạt α bị hấp thụ",
  nuclearCollision: "Phát hiện phản ứng với nitơ",
  productsEmitted: "Proton và ¹⁷O vừa được tạo",
  protonTraveling: "Proton đang đi tới màn",
  protonPassingAbsorber: "Proton xuyên qua lớp chắn",
  scintillation: "Màn ZnS vừa phát sáng",
  observing: "Đang quan sát kết quả",
  completed: "Đang tổng hợp kết quả",
  paused: "Đã tạm dừng",
  resetting: "Đang đặt lại",
};

const SHOULD_LOG = new Set<RutherfordPhase>([
  "loadingGas",
  "emittingAlpha",
  "alphaTraveling",
  "alphaScattering",
  "alphaAbsorbed",
  "nuclearCollision",
  "productsEmitted",
  "protonPassingAbsorber",
  "scintillation",
  "completed",
]);

export function transitionRutherford(state: RutherfordState, next: RutherfordPhase): void {
  if (state.phase === next) return;
  if (next === "paused") state.phaseBeforePause = state.phase;
  state.phase = next;
  state.phaseTime = 0;
  if (!SHOULD_LOG.has(next)) return;
  const event: PhaseEvent = {
    time: state.elapsed,
    phase: next,
    label: RUTHERFORD_PHASE_LABELS[next],
  };
  state.events.push(event);
  if (state.events.length > 40) state.events.shift();
}

export function resumeRutherford(state: RutherfordState): void {
  if (state.phase !== "paused") return;
  state.phase = state.phaseBeforePause === "paused" ? "ready" : state.phaseBeforePause;
  state.phaseTime = 0;
}
