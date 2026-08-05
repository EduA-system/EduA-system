import type {
  ElectromagneticInductionPhase,
  InductionState,
} from "./types";

export const INDUCTION_PHASE_LABELS: Record<ElectromagneticInductionPhase, string> = {
  idle: "Thiết bị sẵn sàng",
  approaching: "Nam châm đang lại gần cuộn dây",
  entering: "Từ thông qua cuộn đang tăng nhanh",
  centered: "Nam châm đi qua tâm cuộn dây",
  leaving: "Nam châm đang rời xa cuộn dây",
  stationary: "Nam châm đứng yên — không có cảm ứng",
  paused: "Đã tạm dừng",
};

const LOGGED_PHASES = new Set<ElectromagneticInductionPhase>([
  "approaching",
  "entering",
  "centered",
  "leaving",
  "stationary",
]);

export function transitionInduction(
  state: InductionState,
  next: ElectromagneticInductionPhase,
): void {
  if (state.phase === next) return;
  if (next === "paused") state.phaseBeforePause = state.phase;
  state.phase = next;
  if (!LOGGED_PHASES.has(next)) return;
  const latest = state.events.at(-1);
  if (latest?.phase === next && state.elapsed - latest.time < 0.35) return;
  state.events.push({ time: state.elapsed, phase: next, label: INDUCTION_PHASE_LABELS[next] });
  if (state.events.length > 28) state.events.shift();
}

export function pauseInduction(state: InductionState): void {
  transitionInduction(state, "paused");
  state.magnetVelocity = 0;
  state.fluxRate = 0;
  state.emf = 0;
  state.current = 0;
  state.inducedFieldDirection = 0;
}
