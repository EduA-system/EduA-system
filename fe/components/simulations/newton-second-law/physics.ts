export const CART_MASS_KG = 35;
export const HUMAN_SUSTAINED_FORCE_LIMIT_N = 230;
export const RACE_DISTANCE_M = 18;

export type NewtonRaceParams = {
  loadTop: number;
  forceTop: number;
  loadBottom: number;
  forceBottom: number;
};

export type CartRaceMetrics = {
  requestedForce: number;
  appliedForce: number;
  forceLimited: boolean;
  loadMass: number;
  totalMass: number;
  netForce: number;
  acceleration: number;
  finishTime: number;
};

export type CartRaceState = CartRaceMetrics & {
  elapsed: number;
  position: number;
  velocity: number;
  progress: number;
  finished: boolean;
  stalled: boolean;
};

export const DEFAULT_NEWTON_RACE_PARAMS: NewtonRaceParams = {
  loadTop: 50,
  forceTop: 160,
  loadBottom: 130,
  forceBottom: 230,
};

function finiteOr(value: number | undefined, fallback: number): number {
  return Number.isFinite(value) ? (value as number) : fallback;
}

export function newtonRaceParams(values: Record<string, number>): NewtonRaceParams {
  return {
    loadTop: finiteOr(values.loadTop, DEFAULT_NEWTON_RACE_PARAMS.loadTop),
    forceTop: finiteOr(values.forceTop, DEFAULT_NEWTON_RACE_PARAMS.forceTop),
    loadBottom: finiteOr(values.loadBottom, DEFAULT_NEWTON_RACE_PARAMS.loadBottom),
    forceBottom: finiteOr(values.forceBottom, DEFAULT_NEWTON_RACE_PARAMS.forceBottom),
  };
}

export function cartRaceMetrics(loadMass: number, requestedForce: number): CartRaceMetrics {
  const safeLoad = Math.max(0, loadMass);
  const totalMass = CART_MASS_KG + safeLoad;
  const safeRequestedForce = Math.max(0, requestedForce);
  const appliedForce = Math.min(safeRequestedForce, HUMAN_SUSTAINED_FORCE_LIMIT_N);
  const netForce = appliedForce;
  const acceleration = netForce / totalMass;
  const finishTime = acceleration > 0
    ? Math.sqrt((2 * RACE_DISTANCE_M) / acceleration)
    : Number.POSITIVE_INFINITY;

  return {
    requestedForce: safeRequestedForce,
    appliedForce,
    forceLimited: safeRequestedForce > HUMAN_SUSTAINED_FORCE_LIMIT_N,
    loadMass: safeLoad,
    totalMass,
    netForce,
    acceleration,
    finishTime,
  };
}

export function cartRaceState(metrics: CartRaceMetrics, elapsed: number): CartRaceState {
  const safeElapsed = Math.max(0, elapsed);
  const rawPosition = 0.5 * metrics.acceleration * safeElapsed * safeElapsed;
  const position = Math.min(RACE_DISTANCE_M, rawPosition);
  const finished = Number.isFinite(metrics.finishTime) && safeElapsed >= metrics.finishTime;
  const stalled = metrics.acceleration <= 0;

  return {
    ...metrics,
    elapsed: safeElapsed,
    position,
    velocity: finished || stalled ? 0 : metrics.acceleration * safeElapsed,
    progress: Math.min(1, position / RACE_DISTANCE_M),
    finished,
    stalled,
  };
}

export function raceMetrics(params: NewtonRaceParams) {
  return {
    top: cartRaceMetrics(params.loadTop, params.forceTop),
    bottom: cartRaceMetrics(params.loadBottom, params.forceBottom),
  };
}

export function raceWinner(params: NewtonRaceParams): "top" | "bottom" | "tie" | "none" {
  const metrics = raceMetrics(params);
  if (!Number.isFinite(metrics.top.finishTime) && !Number.isFinite(metrics.bottom.finishTime)) return "none";
  if (Math.abs(metrics.top.finishTime - metrics.bottom.finishTime) < 0.05) return "tie";
  return metrics.top.finishTime < metrics.bottom.finishTime ? "top" : "bottom";
}
