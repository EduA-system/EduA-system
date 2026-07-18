import type { HeatingParams, HeatingPhase, HeatingPoint } from "./types";

export const HEATING_DT_MINUTES = 1 / 120;

export function solidHeatingDuration(params: HeatingParams): number {
  return Math.max(0, (params.meltingPoint - params.initialTemperature) / Math.max(0.01, params.solidHeatingRate));
}

export function phaseChangeEndTime(params: HeatingParams): number {
  return solidHeatingDuration(params) + Math.max(0, params.phaseChangeDuration);
}

export function totalHeatingTime(params: HeatingParams): number {
  return phaseChangeEndTime(params) + Math.max(0, params.liquidHeatingDuration);
}

export function temperatureAtTime(time: number, params: HeatingParams): HeatingPoint {
  const t = Math.max(0, time);
  const solidEnd = solidHeatingDuration(params);
  const phaseChangeEnd = phaseChangeEndTime(params);
  const total = totalHeatingTime(params);

  if (t >= total) {
    return { time: total, temperature: params.meltingPoint + params.liquidHeatingRate * params.liquidHeatingDuration, phase: "finished" };
  }
  if (t < solidEnd) {
    return { time: t, temperature: params.initialTemperature + params.solidHeatingRate * t, phase: "solid-heating" };
  }
  if (t < phaseChangeEnd) {
    return { time: t, temperature: params.meltingPoint, phase: "phase-change" };
  }
  return {
    time: t,
    temperature: params.meltingPoint + params.liquidHeatingRate * (t - phaseChangeEnd),
    phase: "liquid-heating",
  };
}

export function sampleHeatingCurve(params: HeatingParams, interval = 0.1): HeatingPoint[] {
  const total = totalHeatingTime(params);
  const points: HeatingPoint[] = [];
  for (let time = 0; time < total; time += Math.max(0.01, interval)) {
    points.push(temperatureAtTime(time, params));
  }
  points.push(temperatureAtTime(total, params));
  return points;
}

export function phaseLabel(phase: HeatingPhase): string {
  if (phase === "solid-heating") return "Đun nóng thỏi sắt";
  if (phase === "phase-change") return "Sắt nóng chảy";
  if (phase === "liquid-heating") return "Đun nóng sắt lỏng";
  return "Kết thúc";
}

export function createHeatingRuntime(params: HeatingParams) {
  let time = 0;
  return {
    get time() {
      return time;
    },
    reset() {
      time = 0;
    },
    step(deltaMinutes: number): HeatingPoint {
      time = Math.min(totalHeatingTime(params), time + Math.max(0, deltaMinutes));
      return temperatureAtTime(time, params);
    },
    snapshot(): HeatingPoint {
      return temperatureAtTime(time, params);
    },
  };
}
