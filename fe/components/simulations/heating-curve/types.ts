export type HeatingPhase = "solid-heating" | "phase-change" | "liquid-heating" | "finished";

export type HeatingParams = {
  initialTemperature: number;
  meltingPoint: number;
  solidHeatingRate: number;
  phaseChangeDuration: number;
  liquidHeatingRate: number;
  liquidHeatingDuration: number;
  showGuides: boolean;
  showSamples: boolean;
  showThermometer: boolean;
  speed: number;
};

export type HeatingPoint = {
  time: number;
  temperature: number;
  phase: HeatingPhase;
};

export type HeatingSnapshot = HeatingPoint & {
  elapsedHeatingTime: number;
};

export type HeatingCurveScene = Record<string, never>;
