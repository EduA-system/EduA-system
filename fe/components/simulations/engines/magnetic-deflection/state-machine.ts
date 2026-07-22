import type {
  MagneticDeflectionEvent,
  MagneticDeflectionPhase,
  MagneticDeflectionState,
} from "./types";

export const MAGNETIC_PHASE_LABELS: Record<MagneticDeflectionPhase, string> = {
  idle: "Sẵn sàng",
  emitting: "Nguồn đang phát α, β và γ",
  traversing: "Các tia đang đi qua từ trường",
  impacting: "Các tia đang tới màn quan sát",
  complete: "Đã ghi nhận độ lệch",
  paused: "Tạm dừng",
};

export function transitionMagneticPhase(
  state: MagneticDeflectionState,
  phase: Exclude<MagneticDeflectionPhase, "paused">,
): MagneticDeflectionState {
  const event: MagneticDeflectionEvent = {
    phase,
    label: MAGNETIC_PHASE_LABELS[phase],
    time: state.time,
  };
  return {
    ...state,
    phase,
    resumePhase: phase,
    phaseTime: 0,
    events: phase === "idle" ? [] : [...state.events, event],
  };
}

export function pauseMagneticState(state: MagneticDeflectionState): MagneticDeflectionState {
  if (state.phase === "idle" || state.phase === "complete" || state.phase === "paused") return state;
  return { ...state, resumePhase: state.phase, phase: "paused" };
}

export function resumeMagneticState(state: MagneticDeflectionState): MagneticDeflectionState {
  return state.phase === "paused" ? { ...state, phase: state.resumePhase } : state;
}
