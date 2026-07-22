import type { WaterWavePhase, WaterWaveState } from "./types";

export const WATER_WAVE_PHASE_LABELS: Record<WaterWavePhase, string> = {
  idle: "Sẵn sàng — nguồn chưa dao động",
  starting: "Đầu rung đang chạm mặt nước",
  emitting: "Nguồn đang tạo gợn sóng",
  propagating: "Mặt sóng đang lan ra xa",
  reachedProbe: "Sóng vừa truyền tới phao",
  steady: "Sóng đang lan truyền ổn định",
  paused: "Tạm dừng",
};

export function transitionWaterWavePhase(
  state: WaterWaveState,
  phase: Exclude<WaterWavePhase, "paused">,
): WaterWaveState {
  return {
    ...state,
    phase,
    resumePhase: phase,
    phaseTime: 0,
    events:
      phase === "idle"
        ? []
        : [...state.events, { phase, label: WATER_WAVE_PHASE_LABELS[phase], time: state.time }],
  };
}

export function pauseWaterWaveState(state: WaterWaveState): WaterWaveState {
  if (state.phase === "idle" || state.phase === "paused") return state;
  return { ...state, resumePhase: state.phase, phase: "paused" };
}

export function resumeWaterWaveState(state: WaterWaveState): WaterWaveState {
  return state.phase === "paused" ? { ...state, phase: state.resumePhase } : state;
}
