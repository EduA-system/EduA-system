import type { CorkPopParams, CorkPopSnapshot, CorkPopStatus } from "./types";

export const CORK_POP_DT = 1 / 120;
export const AMBIENT_TEMPERATURE = 298.15;
export const AMBIENT_PRESSURE_KPA = 101.3;
const GAS_CONSTANT = 8.314;
const GAS_VOLUME = 0.0004;
const MOLES_AT_100_PERCENT = 0.027;
const MOLAR_HEAT_CAPACITY = 20.8;
const CORK_AREA = 1.1e-4;
const MAX_HOLDING_FORCE = 12;
const MAX_MOLECULES = 40;

function seeded(seed: number): number {
  let value = (seed | 0) + 0x6d2b79f5;
  value = Math.imul(value ^ (value >>> 15), value | 1);
  value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
  return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
}

export function gasMoles(params: CorkPopParams): number {
  return MOLES_AT_100_PERCENT * Math.max(0.2, Math.min(1, params.gasAmount / 100));
}

export function holdingForce(params: CorkPopParams): number {
  return 0.35 + (params.corkTightness / 100) * MAX_HOLDING_FORCE;
}

export function calculatePressureKpa(temperature: number, params: CorkPopParams, volume = GAS_VOLUME): number {
  return (gasMoles(params) * GAS_CONSTANT * Math.max(1, temperature) / Math.max(1e-6, volume)) / 1000;
}

export function calculateForce(pressureKpa: number): number {
  return Math.max(0, ((pressureKpa - AMBIENT_PRESSURE_KPA) * 1000) * CORK_AREA);
}

export function calculateInternalEnergy(temperature: number, params: CorkPopParams): number {
  return gasMoles(params) * MOLAR_HEAT_CAPACITY * Math.max(1, temperature);
}

export class CorkPopRuntime {
  time = 0;
  temperature: number;
  internalEnergy: number;
  heatAdded = 0;
  work = 0;
  corkPosition = 0;
  corkVelocity = 0;
  popped = false;
  molecules = {
    x: new Float64Array(MAX_MOLECULES),
    y: new Float64Array(MAX_MOLECULES),
    vx: new Float64Array(MAX_MOLECULES),
    vy: new Float64Array(MAX_MOLECULES),
  };
  private readonly initialEnergy: number;

  constructor(private readonly params: CorkPopParams) {
    this.temperature = Math.max(1, params.initialTemperature + 273.15);
    this.internalEnergy = calculateInternalEnergy(this.temperature, params);
    this.initialEnergy = this.internalEnergy;
    for (let i = 0; i < MAX_MOLECULES; i += 1) {
      this.molecules.x[i] = seeded(i * 17 + 3) * 1.8 - 0.9;
      this.molecules.y[i] = seeded(i * 31 + 9) * 0.72 + 0.08;
      this.molecules.vx[i] = seeded(i * 43 + 2) > 0.5 ? 1 : -1;
      this.molecules.vy[i] = seeded(i * 59 + 7) > 0.5 ? 1 : -1;
    }
  }

  get currentPressure(): number {
    const volume = GAS_VOLUME * (1 + (this.popped ? Math.max(0, this.corkPosition) * 22 : 0));
    return calculatePressureKpa(this.temperature, this.params, volume);
  }

  get currentForce(): number {
    return calculateForce(this.currentPressure);
  }

  reset() {
    this.time = 0;
    this.temperature = Math.max(1, this.params.initialTemperature + 273.15);
    this.internalEnergy = this.initialEnergy;
    this.heatAdded = 0;
    this.work = 0;
    this.corkPosition = 0;
    this.corkVelocity = 0;
    this.popped = false;
  }

  step(dt: number): CorkPopSnapshot {
    const safeDt = Math.min(Math.max(dt, 0), 0.04);
    this.time += safeDt;
    const n = gasMoles(this.params);
    const heatCapacity = n * MOLAR_HEAT_CAPACITY;
    const heatInput = (this.params.heatPower / 100) * 18 * safeDt;
    const cooling = Math.max(0, this.temperature - AMBIENT_TEMPERATURE) * (this.popped ? 0.08 : 0.005) * safeDt;
    this.heatAdded += heatInput;
    this.internalEnergy += heatInput - cooling;
    this.temperature = Math.max(AMBIENT_TEMPERATURE, this.internalEnergy / Math.max(1e-6, heatCapacity));

    let pressure = this.currentPressure;
    let force = this.currentForce;
    const hold = holdingForce(this.params);
    const weight = (this.params.corkMass / 1000) * 9.81;
    if (!this.popped && force > hold + weight) {
      this.popped = true;
      this.corkVelocity = Math.min(2.4, Math.max(0.8, (force - hold - weight) / Math.max(0.001, this.params.corkMass / 1000)) * 0.04);
    }

    if (this.popped) {
      pressure = this.currentPressure;
      force = this.currentForce;
      const acceleration = (force - weight) / Math.max(0.001, this.params.corkMass / 1000);
      this.corkVelocity += acceleration * safeDt;
      this.corkPosition += this.corkVelocity * safeDt;
      if (this.corkPosition > 0.32) {
        this.corkPosition = 0.32;
        this.corkVelocity *= -0.45;
      }
      if (this.corkPosition <= 0 && this.corkVelocity < 0) {
        this.corkPosition = 0;
        this.corkVelocity = 0;
      }
      const displacement = Math.max(0, this.corkVelocity * safeDt);
      const workStep = Math.max(0, force * displacement);
      this.work += workStep;
      this.internalEnergy = Math.max(heatCapacity * 220, this.internalEnergy - workStep * 0.85);
      this.temperature = Math.max(220, this.internalEnergy / Math.max(1e-6, heatCapacity));
      pressure = this.currentPressure;
      force = this.currentForce;
    }

    this.updateMolecules(safeDt);
    const status: CorkPopStatus = this.popped ? "popped" : force > hold + weight * 0.82 ? "near-pop" : "holding";
    return {
      time: this.time,
      temperature: this.temperature,
      pressure,
      internalEnergy: this.internalEnergy - this.initialEnergy,
      heatAdded: this.heatAdded,
      work: this.work,
      force,
      corkPosition: this.corkPosition,
      corkVelocity: this.corkVelocity,
      status,
      popped: this.popped,
    };
  }

  snapshot(): CorkPopSnapshot {
    const force = this.currentForce;
    const hold = holdingForce(this.params);
    const weight = (this.params.corkMass / 1000) * 9.81;
    return {
      time: this.time,
      temperature: this.temperature,
      pressure: this.currentPressure,
      internalEnergy: this.internalEnergy - this.initialEnergy,
      heatAdded: this.heatAdded,
      work: this.work,
      force,
      corkPosition: this.corkPosition,
      corkVelocity: this.corkVelocity,
      status: this.popped ? "popped" : force > hold + weight * 0.82 ? "near-pop" : "holding",
      popped: this.popped,
    };
  }

  private updateMolecules(dt: number) {
    const speed = Math.sqrt(Math.max(0.2, this.temperature / AMBIENT_TEMPERATURE)) * (this.popped ? 1.15 : 0.55);
    const count = Math.round(25 + (this.params.gasAmount / 100) * 15);
    for (let i = 0; i < count; i += 1) {
      this.molecules.x[i] += this.molecules.vx[i]! * speed * dt;
      this.molecules.y[i] += this.molecules.vy[i]! * speed * dt;
      if (this.molecules.x[i]! < -0.9 || this.molecules.x[i]! > 0.9) {
        this.molecules.x[i] = Math.max(-0.9, Math.min(0.9, this.molecules.x[i]!));
        this.molecules.vx[i] *= -1;
      }
      if (this.molecules.y[i]! < 0.06 || this.molecules.y[i]! > 0.78) {
        this.molecules.y[i] = Math.max(0.06, Math.min(0.78, this.molecules.y[i]!));
        this.molecules.vy[i] *= -1;
      }
    }
  }
}
