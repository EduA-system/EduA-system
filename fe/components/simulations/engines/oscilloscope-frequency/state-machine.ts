import type { OscilloscopePhase, OscilloscopeState } from "./types";

export const OSCILLOSCOPE_PHASE_LABELS: Record<OscilloscopePhase, string> = {
  idle: "Sẵn sàng — âm thoa chưa rung",
  exciting: "Búa đang gõ âm thoa",
  vibrating: "Âm thoa bắt đầu dao động",
  propagating: "Sóng âm đang truyền tới micro",
  transducing: "Micro đang biến âm thành tín hiệu điện",
  measuring: "Đang đo và quan sát tín hiệu liên tục",
  complete: "Đã đo được tần số",
  noSignal: "Không đủ tín hiệu để đo",
  invalidTimebase: "TIME/DIV quá nhỏ — chưa thấy đủ một chu kì",
  paused: "Tạm dừng",
};

export function transitionOscilloscopePhase(
  state: OscilloscopeState,
  phase: Exclude<OscilloscopePhase, "paused">,
): OscilloscopeState {
  return {
    ...state,
    phase,
    resumePhase: phase,
    phaseTime: 0,
    events:
      phase === "idle"
        ? []
        : [...state.events, { phase, label: OSCILLOSCOPE_PHASE_LABELS[phase], time: state.time }],
  };
}

export function pauseOscilloscopeState(state: OscilloscopeState): OscilloscopeState {
  if (state.phase === "idle" || state.phase === "complete" || state.phase === "paused") {
    return state;
  }
  return { ...state, resumePhase: state.phase, phase: "paused" };
}

export function resumeOscilloscopeState(state: OscilloscopeState): OscilloscopeState {
  return state.phase === "paused" ? { ...state, phase: state.resumePhase } : state;
}
