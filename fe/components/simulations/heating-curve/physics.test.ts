import { describe, expect, it } from "vitest";
import { phaseChangeEndTime, sampleHeatingCurve, solidHeatingDuration, temperatureAtTime, totalHeatingTime } from "./physics";
import type { HeatingParams } from "./types";

const params: HeatingParams = {
  initialTemperature: 20,
  meltingPoint: 1538,
  solidHeatingRate: 100,
  phaseChangeDuration: 4,
  liquidHeatingRate: 80,
  liquidHeatingDuration: 6,
  showGuides: true,
  showSamples: false,
  showThermometer: true,
  speed: 1,
};

describe("heating curve physics", () => {
  it("matches the reference phase timings", () => {
    expect(solidHeatingDuration(params)).toBeCloseTo(15.18, 1);
    expect(phaseChangeEndTime(params)).toBeCloseTo(19.18, 1);
    expect(totalHeatingTime(params)).toBeCloseTo(25.18, 1);
  });

  it("holds temperature constant during phase change", () => {
    expect(temperatureAtTime(17, params)).toMatchObject({ temperature: 1538, phase: "phase-change" });
  });

  it("heats the solid and liquid with their configured slopes", () => {
    expect(temperatureAtTime(5, params).temperature).toBe(520);
    expect(temperatureAtTime(20, params).temperature).toBeCloseTo(1603.6, 1);
  });

  it("ends at the final liquid temperature", () => {
    expect(temperatureAtTime(30, params)).toMatchObject({ temperature: 2018, phase: "finished" });
  });

  it("samples a finite, ordered curve", () => {
    const samples = sampleHeatingCurve(params, 0.2);
    expect(samples.length).toBeGreaterThan(50);
    expect(samples.every((sample, index) => index === 0 || sample.time >= samples[index - 1]!.time)).toBe(true);
    expect(samples.every((sample) => Number.isFinite(sample.temperature))).toBe(true);
  });
});
