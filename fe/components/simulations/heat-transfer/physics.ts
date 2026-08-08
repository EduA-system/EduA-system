import type { HeatTransferParams, HeatTransferPhase, HeatTransferSnapshot } from "./types";

export const HEAT_TRANSFER_DT = 1 / 120;
const EQUILIBRIUM_TOLERANCE = 0.05;

const finite = (value: number, fallback = 0) => (Number.isFinite(value) ? value : fallback);
const positive = (value: number, fallback: number) => Math.max(0.0001, finite(value, fallback));
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export function calculateHeatCapacity(mass: number, specificHeat: number) {
  return positive(mass, 1) * positive(specificHeat, 1);
}

export function calculateEquilibriumTemperature(
  temperatureA: number,
  capacityA: number,
  temperatureB: number,
  capacityB: number,
) {
  const totalCapacity = positive(capacityA, 1) + positive(capacityB, 1);
  return (positive(capacityA, 1) * finite(temperatureA) + positive(capacityB, 1) * finite(temperatureB)) / totalCapacity;
}

/** Signed heat-flow rate in kJ/s. Positive means A transfers heat to B. */
export function calculateHeatFlowRate(transferCoefficient: number, temperatureA: number, temperatureB: number) {
  return Math.max(0, finite(transferCoefficient)) * (finite(temperatureA) - finite(temperatureB));
}

export function calculateThermometerFill(temperature: number, minTemperature = 0, maxTemperature = 100) {
  return clamp((finite(temperature) - minTemperature) / Math.max(0.001, maxTemperature - minTemperature), 0, 1);
}

export function calculateTransferredHeat(params: HeatTransferParams, temperatureA: number, temperatureB: number) {
  const capacityA = calculateHeatCapacity(params.massA, params.specificHeatA);
  const capacityB = calculateHeatCapacity(params.massB, params.specificHeatB);
  return {
    heatLostA: Math.max(0, capacityA * (params.initialTemperatureA - temperatureA)),
    heatReceivedB: Math.max(0, capacityB * (temperatureB - params.initialTemperatureB)),
  };
}

export function updateTemperatures(
  temperatureA: number,
  temperatureB: number,
  capacityA: number,
  capacityB: number,
  transferCoefficient: number,
  dt: number,
  equilibriumTemperature: number,
) {
  const safeCapacityA = positive(capacityA, 1);
  const safeCapacityB = positive(capacityB, 1);
  const delta = finite(temperatureA) - finite(temperatureB);
  const rate = calculateHeatFlowRate(transferCoefficient, temperatureA, temperatureB);
  const maxTransfer = delta >= 0
    ? Math.max(0, (finite(temperatureA) - equilibriumTemperature) * safeCapacityA)
    : Math.max(0, (finite(temperatureB) - equilibriumTemperature) * safeCapacityB);
  const transfer = Math.min(Math.abs(rate) * clamp(finite(dt, HEAT_TRANSFER_DT), 1 / 600, 1 / 30), maxTransfer);
  const direction = delta >= 0 ? 1 : -1;
  const nextA = finite(temperatureA) - direction * transfer / safeCapacityA;
  const nextB = finite(temperatureB) + direction * transfer / safeCapacityB;
  return Math.abs(nextA - nextB) < EQUILIBRIUM_TOLERANCE
    ? { temperatureA: equilibriumTemperature, temperatureB: equilibriumTemperature }
    : { temperatureA: nextA, temperatureB: nextB };
}

function phaseFor(params: HeatTransferParams, temperatureA: number, temperatureB: number): HeatTransferPhase {
  if (!params.contacted) return "before-contact";
  return Math.abs(temperatureA - temperatureB) < EQUILIBRIUM_TOLERANCE ? "equilibrium" : "transferring";
}

export function temperatureToColor(temperature: number, minTemperature = 0, maxTemperature = 100) {
  const t = clamp((finite(temperature) - minTemperature) / Math.max(0.001, maxTemperature - minTemperature), 0, 1);
  const cold = [96, 165, 250];
  const neutral = [196, 181, 253];
  const hot = [249, 115, 22];
  const from = t < 0.5 ? cold : neutral;
  const to = t < 0.5 ? neutral : hot;
  const local = t < 0.5 ? t * 2 : (t - 0.5) * 2;
  const rgb = from.map((value, index) => Math.round(value + (to[index]! - value) * local));
  return `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
}

export class HeatTransferRuntime {
  time = 0;
  temperatureA: number;
  temperatureB: number;
  private equilibriumTemperature: number;

  constructor(private readonly params: HeatTransferParams) {
    this.temperatureA = finite(params.initialTemperatureA, 80);
    this.temperatureB = finite(params.initialTemperatureB, 20);
    this.equilibriumTemperature = this.calculateEquilibrium();
  }

  private calculateEquilibrium() {
    return calculateEquilibriumTemperature(
      this.params.initialTemperatureA,
      calculateHeatCapacity(this.params.massA, this.params.specificHeatA),
      this.params.initialTemperatureB,
      calculateHeatCapacity(this.params.massB, this.params.specificHeatB),
    );
  }

  reset() {
    this.time = 0;
    this.temperatureA = finite(this.params.initialTemperatureA, 80);
    this.temperatureB = finite(this.params.initialTemperatureB, 20);
    this.equilibriumTemperature = this.calculateEquilibrium();
  }

  step(dt = HEAT_TRANSFER_DT) {
    const h = clamp(finite(dt, HEAT_TRANSFER_DT), 1 / 600, 1 / 30);
    if (this.params.contacted && Math.abs(this.temperatureA - this.temperatureB) >= EQUILIBRIUM_TOLERANCE) {
      const capacityA = calculateHeatCapacity(this.params.massA, this.params.specificHeatA);
      const capacityB = calculateHeatCapacity(this.params.massB, this.params.specificHeatB);
      const next = updateTemperatures(this.temperatureA, this.temperatureB, capacityA, capacityB, this.params.transferCoefficient, h, this.equilibriumTemperature);
      this.temperatureA = next.temperatureA;
      this.temperatureB = next.temperatureB;
      this.time += h;
      if (Math.abs(this.temperatureA - this.temperatureB) < EQUILIBRIUM_TOLERANCE) {
        this.temperatureA = this.equilibriumTemperature;
        this.temperatureB = this.equilibriumTemperature;
      }
    }
    return this.snapshot();
  }

  snapshot(): HeatTransferSnapshot {
    const capacityA = calculateHeatCapacity(this.params.massA, this.params.specificHeatA);
    const capacityB = calculateHeatCapacity(this.params.massB, this.params.specificHeatB);
    const phase = phaseFor(this.params, this.temperatureA, this.temperatureB);
    const transferred = calculateTransferredHeat(this.params, this.temperatureA, this.temperatureB);
    const initialDelta = Math.abs(this.params.initialTemperatureA - this.params.initialTemperatureB);
    const progress = phase === "before-contact" ? 0 : clamp(1 - Math.abs(this.temperatureA - this.temperatureB) / Math.max(0.001, initialDelta), 0, 1);
    return {
      time: this.time,
      temperatureA: finite(this.temperatureA),
      temperatureB: finite(this.temperatureB),
      equilibriumTemperature: finite(this.equilibriumTemperature),
      heatCapacityA: capacityA,
      heatCapacityB: capacityB,
      heatFlowRate: phase === "transferring" ? calculateHeatFlowRate(this.params.transferCoefficient, this.temperatureA, this.temperatureB) : 0,
      heatLostA: transferred.heatLostA,
      heatReceivedB: transferred.heatReceivedB,
      progress,
      phase,
    };
  }
}

export function resetHeatTransfer(runtime: HeatTransferRuntime) {
  runtime.reset();
  return runtime.snapshot();
}
