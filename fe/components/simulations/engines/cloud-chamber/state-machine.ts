import type { CloudChamberEvent, CloudChamberPhase, CloudChamberState } from "./types";

export const PHASE_LABELS: Record<CloudChamberPhase, string> = {
  idle: "Sẵn sàng",
  preparing: "Đang chuẩn bị",
  coolingBase: "Đá khô đang làm lạnh đáy",
  evaporatingIPA: "IPA 99% đang bay hơi",
  supersaturated: "Buồng đã nhạy",
  emittingAlpha: "Đang phát hạt α",
  trackingAlpha: "Hạt α ion hóa không khí",
  normalTrack: "Vệt α thông thường",
  collisionDetected: "Phát hiện va chạm",
  productsTracking: "Đang hình thành hai vệt sản phẩm",
  photographing: "Đang chụp ảnh",
  observationComplete: "Đã chụp ảnh",
  clearing: "Vệt cũ đang tan",
  resetting: "Đang khôi phục buồng",
  paused: "Tạm dừng",
};

export function transitionPhase(
  state: CloudChamberState,
  phase: Exclude<CloudChamberPhase, "paused">,
): CloudChamberState {
  const event: CloudChamberEvent = {
    phase,
    label: PHASE_LABELS[phase],
    time: state.time,
  };
  return {
    ...state,
    phase,
    resumePhase: phase,
    phaseTime: 0,
    events: phase === "idle" ? state.events : [...state.events, event],
  };
}

export function pauseState(state: CloudChamberState): CloudChamberState {
  if (state.phase === "paused" || state.phase === "idle") return state;
  return { ...state, resumePhase: state.phase, phase: "paused" };
}

export function resumeState(state: CloudChamberState): CloudChamberState {
  if (state.phase !== "paused") return state;
  return { ...state, phase: state.resumePhase };
}
