import { CORK_EXIT, CROSS_SECTION, GAS_CV, GAS_R, GRAVITY, INITIAL_VOLUME, MAX_DT } from "./constants";
import type { ThermalMetrics, ThermalParams, ThermalState } from "./types";

const finite = (v: number, fallback: number) => Number.isFinite(v) ? v : fallback;
const pressureFor = (n: number, t: number, v: number) => n * GAS_R * t / Math.max(v, 1e-6);

export function createThermalState(p: ThermalParams): ThermalState {
  const u = p.gasAmount * GAS_CV * p.initialTemperature;
  return { phase: "idle", resumePhase: "idle", time: 0, temperature: p.initialTemperature,
    pressure: pressureFor(p.gasAmount, p.initialTemperature, INITIAL_VOLUME), volume: INITIAL_VOLUME,
    internalEnergy: u, heatIn: 0, work: 0, corkY: 0, corkVelocity: 0, releaseTime: null, releasePressure: null };
}

export function metrics(s: ThermalState, p: ThermalParams): ThermalMetrics {
  const deltaPressure = Math.max(0, s.pressure - p.atmospherePressure * 1000);
  return { ...s, deltaPressure, pressureForce: deltaPressure * CROSS_SECTION,
    releaseThreshold: p.holdForce + p.corkMass * GRAVITY,
    deltaInternalEnergy: s.internalEnergy - p.gasAmount * GAS_CV * p.initialTemperature };
}

export function stepThermal(previous: ThermalState, p: ThermalParams, rawDt: number): ThermalState {
  if (previous.phase === "idle" || previous.phase === "paused" || previous.phase === "completed") return previous;
  const s = { ...previous }; let remaining = Math.min(Math.max(rawDt, 0), MAX_DT);
  while (remaining > 0) {
    const dt = Math.min(remaining, 1 / 120); remaining -= dt; s.time += dt;
    const ambient = p.initialTemperature;
    const sealed = s.phase === "heating" || s.phase === "nearRelease";
    const q = sealed
      ? Math.max(0, p.heaterPower - p.heatLoss * Math.max(0, s.temperature - ambient)) * dt
      : 0;
    s.heatIn += q; s.internalEnergy += q;
    const force = Math.max(0, s.pressure - p.atmospherePressure * 1000) * CROSS_SECTION;
    const threshold = p.holdForce + p.corkMass * GRAVITY;
    if (s.phase === "heating" && force > threshold * 0.82) s.phase = "nearRelease";
    if ((s.phase === "heating" || s.phase === "nearRelease") && force > threshold) {
      s.phase = "corkReleased"; s.releaseTime = s.time; s.releasePressure = s.pressure; s.corkVelocity = 0.35;
    }
    if (s.phase === "corkReleased" || s.phase === "expansion") {
      const oldVolume = s.volume;
      const drag = 0.025 * s.corkVelocity * Math.abs(s.corkVelocity);
      const acceleration = Math.max(-GRAVITY, (force - p.corkMass * GRAVITY - drag) / p.corkMass);
      s.corkVelocity = Math.max(0, s.corkVelocity + acceleration * dt);
      s.corkY += s.corkVelocity * dt;
      s.volume = INITIAL_VOLUME + CROSS_SECTION * Math.min(s.corkY, CORK_EXIT);
      const dW = Math.max(0, s.pressure * (s.volume - oldVolume));
      s.work += dW; s.internalEnergy = Math.max(p.gasAmount * GAS_CV * 220, s.internalEnergy - dW);
      if (s.corkY > 0.008) s.phase = "expansion";
      if (s.corkY >= CORK_EXIT && s.time - (s.releaseTime ?? s.time) > 2.8) s.phase = "completed";
    }
    s.temperature = Math.max(220, s.internalEnergy / (p.gasAmount * GAS_CV));
    const idealPressure = pressureFor(p.gasAmount, s.temperature, s.volume);
    const atmosphere = p.atmospherePressure * 1000;
    const secondsSinceRelease = s.releaseTime === null ? 0 : Math.max(0, s.time - s.releaseTime);
    const ventEnvelope = s.releaseTime === null ? 1 : Math.exp(-3.2 * secondsSinceRelease);
    s.pressure = atmosphere + (idealPressure - atmosphere) * ventEnvelope;
  }
  s.temperature = finite(s.temperature, p.initialTemperature); s.pressure = finite(s.pressure, p.atmospherePressure * 1000);
  return s;
}
