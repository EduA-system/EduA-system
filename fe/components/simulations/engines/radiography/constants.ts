import type { BecquerelParams } from "./types";

export const MAP_WIDTH = 72, MAP_HEIGHT = 48, MAX_FRAME_DT = 1 / 30, EXPOSURE_SCALE = 2.8;
export const MATERIALS = [
  { label: "Không có vật chắn", mu: 0 },
  { label: "Nhôm", mu: 0.16 },
  { label: "Sắt", mu: 0.34 },
  { label: "Chì", mu: 0.68 },
] as const;
export const DEFAULT_BECQUEREL_PARAMS: BecquerelParams = { activity: 72, distance: 3.5, exposureTime: 12, sensitivity: 72, material: 2, thickness: 2.5, lightCondition: 0, contrast: 75, noise: 8, sourceSize: 38, wrapped: 1 };

