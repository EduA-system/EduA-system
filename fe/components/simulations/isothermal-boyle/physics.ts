import type { BoyleParams, BoyleState } from "./types";

export const REFERENCE_VOLUME = 4;
export const REFERENCE_PRESSURE = 1;
export const REFERENCE_TEMPERATURE = 300;
export const MIN_VOLUME = 1.6;
export const MAX_VOLUME = 6.4;
export const MIN_PRESSURE = 0.5;
export const MAX_PRESSURE = 2.5;
export const MIN_TEMPERATURE = 260;
export const MAX_TEMPERATURE = 360;

export const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const finite = (value: number, fallback: number) => (Number.isFinite(value) ? value : fallback);

export function calculateIsothermalConstant(temperature: number) {
  const safeTemperature = clamp(finite(temperature, REFERENCE_TEMPERATURE), MIN_TEMPERATURE, MAX_TEMPERATURE);
  return REFERENCE_PRESSURE * REFERENCE_VOLUME * (safeTemperature / REFERENCE_TEMPERATURE);
}

export function calculatePressureFromVolume(volume: number, temperature: number) {
  const safeVolume = clamp(finite(volume, REFERENCE_VOLUME), MIN_VOLUME, MAX_VOLUME);
  return calculateIsothermalConstant(temperature) / safeVolume;
}

export function calculateVolumeFromPressure(pressure: number, temperature: number) {
  const safePressure = clamp(finite(pressure, REFERENCE_PRESSURE), MIN_PRESSURE, MAX_PRESSURE);
  return clamp(calculateIsothermalConstant(temperature) / safePressure, MIN_VOLUME, MAX_VOLUME);
}

export function calculateState(params: { volume: number; temperature: number }): BoyleState {
  const volume = clamp(finite(params.volume, REFERENCE_VOLUME), MIN_VOLUME, MAX_VOLUME);
  const temperature = clamp(finite(params.temperature, REFERENCE_TEMPERATURE), MIN_TEMPERATURE, MAX_TEMPERATURE);
  const constant = calculateIsothermalConstant(temperature);
  const pressure = constant / volume;
  const delta = volume - REFERENCE_VOLUME;
  return {
    pressure,
    volume,
    temperature,
    constant,
    status: Math.abs(delta) < 0.04 ? "reference" : delta < 0 ? "compressed" : "expanded",
  };
}

export function clampPistonPosition(y: number, top: number, bottom: number) {
  return clamp(finite(y, (top + bottom) / 2), top, bottom);
}

export function mapVolumeToCylinderHeight(volume: number, minHeight: number, maxHeight: number) {
  const ratio = (clamp(volume, MIN_VOLUME, MAX_VOLUME) - MIN_VOLUME) / (MAX_VOLUME - MIN_VOLUME);
  return minHeight + ratio * (maxHeight - minHeight);
}

export function mapCylinderHeightToVolume(height: number, minHeight: number, maxHeight: number) {
  const ratio = clamp((height - minHeight) / Math.max(0.001, maxHeight - minHeight), 0, 1);
  return MIN_VOLUME + ratio * (MAX_VOLUME - MIN_VOLUME);
}

export function mapPressureToGaugeAngle(pressure: number) {
  const ratio = clamp((pressure - MIN_PRESSURE) / (MAX_PRESSURE - MIN_PRESSURE), 0, 1);
  return -140 + ratio * 280;
}

export function resetIsothermalExperiment(): BoyleParams {
  return {
    volumeA: REFERENCE_VOLUME,
    volumeB: REFERENCE_VOLUME,
    temperature: REFERENCE_TEMPERATURE,
    showMolecules: true,
  };
}
