import type {
  TorsionBalancePhase,
  TorsionBalanceState,
} from "./types";

export const TORSION_PHASE_LABELS: Record<TorsionBalancePhase, string> = {
  idle: "Sẵn sàng — dụng cụ chưa tích điện",
  zeroing: "Đang chỉnh kim về vạch 0",
  charging: "Đang truyền điện tích cho hai quả cầu",
  releasing: "Đang nhả thanh cân xoắn",
  oscillating: "Thanh đang dao động do lực Coulomb",
  settling: "Dao động đang tắt dần",
  measuring: "Đang đọc góc cân bằng",
  complete: "Đã đo xong",
  paused: "Tạm dừng",
};

export function transitionTorsionPhase(
  state: TorsionBalanceState,
  phase: Exclude<TorsionBalancePhase, "paused">,
): TorsionBalanceState {
  return {
    ...state,
    phase,
    resumePhase: phase,
    phaseTime: 0,
    events:
      phase === "idle"
        ? []
        : [
            ...state.events,
            { phase, label: TORSION_PHASE_LABELS[phase], time: state.time },
          ],
  };
}

export function pauseTorsionState(
  state: TorsionBalanceState,
): TorsionBalanceState {
  if (state.phase === "idle" || state.phase === "complete" || state.phase === "paused") {
    return state;
  }
  return { ...state, resumePhase: state.phase, phase: "paused" };
}

export function resumeTorsionState(
  state: TorsionBalanceState,
): TorsionBalanceState {
  return state.phase === "paused"
    ? { ...state, phase: state.resumePhase }
    : state;
}
