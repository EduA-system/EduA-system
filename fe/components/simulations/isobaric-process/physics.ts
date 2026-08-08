import type { IsobaricParams, IsobaricState } from "./types";

export const CELSIUS_OFFSET = 273.15;
export const REFERENCE_TEMPERATURE_C = 20;
export const REFERENCE_TEMPERATURE_K = REFERENCE_TEMPERATURE_C + CELSIUS_OFFSET;
export const REFERENCE_VOLUME = 4;
export const REFERENCE_PRESSURE = 1;
export const MIN_TEMPERATURE_C = 0;
export const MAX_TEMPERATURE_C = 150;
export const MIN_PRESSURE = 0.7;
export const MAX_PRESSURE = 1.5;
export const MIN_VOLUME = 2.2;
export const MAX_VOLUME = 8.4;

export const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const finite = (value: number, fallback: number) =>
  Number.isFinite(value) ? value : fallback;

export function celsiusToKelvin(temperatureC: number) {
  return finite(temperatureC, REFERENCE_TEMPERATURE_C) + CELSIUS_OFFSET;
}

export function calculateVolume(temperatureC: number, pressure: number) {
  const safeTemperatureC = clamp(
    finite(temperatureC, REFERENCE_TEMPERATURE_C),
    MIN_TEMPERATURE_C,
    MAX_TEMPERATURE_C,
  );
  const safePressure = clamp(
    finite(pressure, REFERENCE_PRESSURE),
    MIN_PRESSURE,
    MAX_PRESSURE,
  );
  return (
    REFERENCE_VOLUME *
    (celsiusToKelvin(safeTemperatureC) / REFERENCE_TEMPERATURE_K) *
    (REFERENCE_PRESSURE / safePressure)
  );
}

export function calculateTemperatureFromVolume(
  volume: number,
  pressure: number,
) {
  const safeVolume = clamp(
    finite(volume, REFERENCE_VOLUME),
    MIN_VOLUME,
    MAX_VOLUME,
  );
  const safePressure = clamp(
    finite(pressure, REFERENCE_PRESSURE),
    MIN_PRESSURE,
    MAX_PRESSURE,
  );
  const temperatureK =
    REFERENCE_TEMPERATURE_K *
    (safeVolume / REFERENCE_VOLUME) *
    (safePressure / REFERENCE_PRESSURE);
  return clamp(
    temperatureK - CELSIUS_OFFSET,
    MIN_TEMPERATURE_C,
    MAX_TEMPERATURE_C,
  );
}

export function calculateState(params: {
  temperatureC: number;
  pressure: number;
}): IsobaricState {
  const temperatureC = clamp(
    finite(params.temperatureC, REFERENCE_TEMPERATURE_C),
    MIN_TEMPERATURE_C,
    MAX_TEMPERATURE_C,
  );
  const pressure = clamp(
    finite(params.pressure, REFERENCE_PRESSURE),
    MIN_PRESSURE,
    MAX_PRESSURE,
  );
  const temperatureK = celsiusToKelvin(temperatureC);
  const volume = calculateVolume(temperatureC, pressure);
  const delta = temperatureC - REFERENCE_TEMPERATURE_C;

  return {
    temperatureC,
    temperatureK,
    pressure,
    volume,
    volumeTemperatureRatio: volume / temperatureK,
    status:
      Math.abs(delta) < 0.5 ? "reference" : delta < 0 ? "cooling" : "heating",
  };
}

export function mapVolumeToHeight(
  volume: number,
  minHeight: number,
  maxHeight: number,
) {
  const ratio =
    (clamp(volume, MIN_VOLUME, MAX_VOLUME) - MIN_VOLUME) /
    (MAX_VOLUME - MIN_VOLUME);
  return minHeight + ratio * (maxHeight - minHeight);
}

export function mapHeightToVolume(
  height: number,
  minHeight: number,
  maxHeight: number,
) {
  const ratio = clamp(
    (height - minHeight) / Math.max(0.001, maxHeight - minHeight),
    0,
    1,
  );
  return MIN_VOLUME + ratio * (MAX_VOLUME - MIN_VOLUME);
}

export function resetIsobaricExperiment(): IsobaricParams {
  return {
    temperatureC: REFERENCE_TEMPERATURE_C,
    comparisonTemperatureC: 100,
    pressure: REFERENCE_PRESSURE,
  };
}
