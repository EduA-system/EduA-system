import { EXPOSURE_SCALE, MAP_HEIGHT, MAP_WIDTH, MATERIALS } from "./constants";
import type { BecquerelParams, ExposureMap } from "./types";

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
export const createExposureMap = (): ExposureMap => ({ width: MAP_WIDTH, height: MAP_HEIGHT, values: new Float32Array(MAP_WIDTH * MAP_HEIGHT) });
export const resetExposureMap = (map: ExposureMap) => map.values.fill(0);
export const materialTransmission = (params: BecquerelParams) => Math.exp(-MATERIALS[Math.round(clamp(params.material, 0, MATERIALS.length - 1))]!.mu * Math.max(0, params.thickness));
export const plateIntensity = (params: BecquerelParams) => params.activity <= 0 ? 0 : 0.012 * params.activity / (params.distance * params.distance + 0.35 * 0.35);

function smoothStep(edge0: number, edge1: number, value: number) { const t = clamp((value - edge0) / (edge1 - edge0), 0, 1); return t * t * (3 - 2 * t); }
function crossCoverage(nx: number, ny: number) { const vertical = (1 - smoothStep(.06, .09, Math.abs(nx))) * (1 - smoothStep(.32, .36, Math.abs(ny))); const horizontal = (1 - smoothStep(.06, .09, Math.abs(ny))) * (1 - smoothStep(.32, .36, Math.abs(nx))); return Math.max(vertical, horizontal); }

export function updateExposureMap(map: ExposureMap, params: BecquerelParams, dt: number, sourceX: number) {
  const base = plateIntensity(params), transmission = materialTransmission(params), sourceRadius = 0.18 + params.sourceSize / 100 * 0.34;
  for (let y = 0; y < map.height; y++) for (let x = 0; x < map.width; x++) {
    const nx = (x + .5) / map.width - .5, ny = (y + .5) / map.height - .5;
    const radial = Math.exp(-((nx - sourceX) ** 2 + ny ** 2) / (sourceRadius * sourceRadius));
    const coverage = params.material > .5 ? crossCoverage(nx, ny) : 0;
    const edge = 1 - coverage * (1 - transmission);
    const spatialNoise = 1 + params.noise / 100 * ((((x * 17 + y * 31) % 23) / 22) - .5);
    const visibleLeak = params.lightCondition > .5 && params.wrapped < .5 ? 0.22 : 0;
    map.values[y * map.width + x] = clamp(map.values[y * map.width + x]! + (base * radial * edge * spatialNoise + visibleLeak) * dt, 0, 1000);
  }
}

export const latentValue = (exposure: number) => 1 - Math.exp(-Math.max(0, exposure) / EXPOSURE_SCALE);
export const developedDarkness = (exposure: number, params: BecquerelParams) => clamp(params.contrast / 100 * (1 - Math.exp(-(params.sensitivity / 100) * Math.max(0, exposure))), 0, 1);
export function meanExposure(map: ExposureMap) { let total = 0; for (const value of map.values) total += value; return total / map.values.length; }
export function previewMap(map: ExposureMap, params: BecquerelParams, developed: boolean) { return Array.from(map.values, (value) => developed ? developedDarkness(value, params) : latentValue(value)); }
