import type { Annotation, Scene } from "../engines/mechanics/types";
import type { SceneAnnotation } from "../shared/scene-types";
import type { MechanicsPreset } from "./types";

const DEFAULT_GRAVITY = 9.8;
const PIVOT_X = 0;
const PIVOT_Y = 2.9;

export type SimplePendulumValues = {
  length: number;
  mass: number;
  gravity: number;
  initialAngleDegrees: number;
  initialAngleRadians: number;
  omega: number;
  period: number;
  frequency: number;
  maximumHeight: number;
  maximumSpeed: number;
  mechanicalEnergy: number;
};

export function calculateSimplePendulumValues(
  params: Record<string, number>,
): SimplePendulumValues {
  const length = params.L ?? 1.8;
  const mass = params.m ?? 0.5;
  const gravity = params.g ?? DEFAULT_GRAVITY;
  const initialAngleDegrees = params.angle ?? 25;
  const initialAngleRadians = (initialAngleDegrees * Math.PI) / 180;
  const omega = Math.sqrt(gravity / length);
  const period = (2 * Math.PI) / omega;
  const maximumHeight = length * (1 - Math.cos(initialAngleRadians));

  return {
    length,
    mass,
    gravity,
    initialAngleDegrees,
    initialAngleRadians,
    omega,
    period,
    frequency: 1 / period,
    maximumHeight,
    maximumSpeed: Math.sqrt(2 * gravity * maximumHeight),
    mechanicalEnergy: mass * gravity * maximumHeight,
  };
}

function pendulumPoint(length: number, angle: number) {
  return {
    x: PIVOT_X + length * Math.sin(angle),
    y: PIVOT_Y - length * Math.cos(angle),
  };
}

function circlePolygon(
  x: number,
  y: number,
  radius: number,
): { x: number; y: number }[] {
  return Array.from({ length: 24 }, (_, index) => {
    const angle = (index / 24) * Math.PI * 2;
    return {
      x: x + radius * Math.cos(angle),
      y: y + radius * Math.sin(angle),
    };
  });
}

export function buildSimplePendulumAnnotations(
  params: Record<string, number>,
): SceneAnnotation[] {
  const value = calculateSimplePendulumValues(params);
  const angle = value.initialAngleRadians;
  const right = pendulumPoint(value.length, angle);
  const left = pendulumPoint(value.length, -angle);
  const bottom = pendulumPoint(value.length, 0);
  const angleDegrees = value.initialAngleDegrees;

  return [
    {
      kind: "rect",
      x: PIVOT_X,
      y: PIVOT_Y + 0.22,
      width: 1.45,
      height: 0.12,
      fill: "#dbe4ee",
      stroke: "#64748b",
      strokeWidth: 2,
    },
    {
      kind: "rect",
      x: PIVOT_X,
      y: PIVOT_Y + 0.08,
      width: 0.055,
      height: 0.2,
      fill: "#94a3b8",
      stroke: "#cbd5e1",
      strokeWidth: 1,
    },
    {
      kind: "rect",
      x: PIVOT_X,
      y: (PIVOT_Y + bottom.y) / 2,
      width: 0.018,
      height: value.length,
      fill: "#64748b",
      stroke: "#64748b",
      strokeWidth: 0,
    },
    {
      kind: "arc",
      x: PIVOT_X,
      y: PIVOT_Y,
      radius: value.length,
      startAngle: -90 - angleDegrees,
      endAngle: -90 + angleDegrees,
      color: "#94a3b8",
      strokeWidth: 3,
    },
    {
      kind: "polygon",
      points: circlePolygon(bottom.x, bottom.y, 0.065),
      fill: "#cbd5e1",
      stroke: "#f8fafc",
      strokeWidth: 1,
    },
    {
      kind: "label",
      x: left.x - 0.18,
      y: left.y + 0.18,
      text: "B′",
      color: "#fbbf24",
      fontSize: 18,
      align: "center",
      width: 0.45,
    },
    {
      kind: "label",
      x: bottom.x,
      y: bottom.y - 0.2,
      text: "O",
      color: "#e2e8f0",
      fontSize: 18,
      align: "center",
      width: 0.35,
    },
    {
      kind: "label",
      x: right.x + 0.16,
      y: right.y + 0.18,
      text: "B",
      color: "#fb7185",
      fontSize: 18,
      align: "center",
      width: 0.35,
    },
    {
      kind: "label",
      x: right.x / 2 - 0.18,
      y: (PIVOT_Y + right.y) / 2,
      text: `ℓ = ${value.length.toFixed(2)} m`,
      color: "#bae6fd",
      fontSize: 14,
      align: "center",
      width: 0.82,
    },
  ];
}

export function buildSimplePendulumScene(
  params: Record<string, number>,
): Scene {
  const value = calculateSimplePendulumValues(params);
  const start = pendulumPoint(value.length, value.initialAngleRadians);
  const annotations: Annotation[] = [
    {
      kind: "vector",
      anchor: "bob",
      dx: 0,
      dy: -0.62,
      color: "#fb7185",
      label: "P",
      labelPosition: "tip",
      labelSize: 16,
      width: 3,
    },
    {
      kind: "pendulumResultant",
      pivot: "pivot",
      body: "bob",
      scale: 0.2,
      maxLength: 0.82,
      color: "#38bdf8",
      label: "Fhợp",
      showMagnitude: true,
    },
  ];

  return {
    bodies: [
      {
        id: "pivot",
        x: PIVOT_X,
        y: PIVOT_Y,
        vx: 0,
        vy: 0,
        mass: 1,
        radius: 0.06,
        fixed: true,
        visual: { shape: "pendulumPivot", color: "#cbd5e1", label: "" },
      },
      {
        id: "bob",
        x: start.x,
        y: start.y,
        vx: 0,
        vy: 0,
        mass: value.mass,
        radius: 0.18,
        visual: { shape: "pendulumBob", color: "#f59e0b", label: "" },
      },
    ],
    forces: [{ kind: "gravity", g: value.gravity }],
    constraints: [
      {
        kind: "rod",
        a: "pivot",
        b: "bob",
        length: value.length,
        appearance: "pendulum",
      },
    ],
    annotations,
    view: { minX: -3.05, maxX: 3.05, minY: -0.35, maxY: 4.2 },
    groundPadding: 58,
  };
}

export const conLacDon: MechanicsPreset = {
  id: "con-lac-don",
  title: "Dao động con lắc đơn",
  domain: "Dao động & Sóng",
  grade: 11,
  desc: "Kéo quả nặng lệch khỏi vị trí cân bằng rồi thả, quan sát con lắc chuyển động trên một cung tròn.",
  objective:
    "Xác định vị trí biên B, B′, vị trí cân bằng O và kiểm chứng chu kì gần đúng T = 2π√(ℓ/g) khi góc lệch nhỏ.",
  sgkRef: "Vật lí 11 — Dao động điều hòa của con lắc đơn",
  startPaused: true,
  params: [
    { key: "L", label: "Chiều dài dây ℓ", unit: "m", min: 1, max: 2.4, step: 0.05, default: 1.8 },
    { key: "m", label: "Khối lượng quả nặng", unit: "kg", min: 0.2, max: 1.2, step: 0.05, default: 0.5 },
    { key: "angle", label: "Góc lệch ban đầu", unit: "°", min: 5, max: 35, step: 1, default: 25 },
    { key: "g", label: "Gia tốc trọng trường", unit: "m/s²", min: 1.6, max: 20, step: 0.1, default: 9.8 },
  ],
  quickPresets: [
    { label: "Góc nhỏ", params: { L: 1.8, m: 0.5, angle: 10, g: 9.8 } },
    { label: "Mặc định", params: { L: 1.8, m: 0.5, angle: 25, g: 9.8 } },
    { label: "Dây dài", params: { L: 2.3, m: 0.5, angle: 22, g: 9.8 } },
  ],
  applyParams: buildSimplePendulumScene,
  annotations: (params) => [
    ...buildSimplePendulumAnnotations(params),
    {
      kind: "velocity",
      body: "bob",
      scale: 0.32,
      maxLength: 0.75,
      offsetY: 0.12,
      color: "#34d399",
      label: "v",
      labelSize: 13,
      showMagnitude: true,
    },
  ],
  bodyLabels: { bob: "D" },
  minimalOverlay: true,
  hideBodyCoordinates: true,
  hideFixedSupportDecoration: true,
  lockPan: true,
  analysis: {
    landmarks: [
      {
        key: "right-extreme",
        label: "Biên phải B",
        description: "Quả nặng được thả từ biên phải: vận tốc bằng 0, thế năng cực đại.",
        atTime: () => 0,
        values: (params) => {
          const value = calculateSimplePendulumValues(params);
          return [
            { label: "Góc lệch ban đầu", value: value.initialAngleDegrees.toFixed(0), unit: "°" },
            { label: "Độ cao so với O", value: value.maximumHeight.toFixed(3), unit: "m" },
            { label: "Vận tốc", value: "0.00", unit: "m/s" },
            { label: "Cơ năng", value: value.mechanicalEnergy.toFixed(3), unit: "J" },
          ];
        },
      },
      {
        key: "equilibrium-left",
        label: "Qua vị trí cân bằng O",
        description: "Thế năng nhỏ nhất và tốc độ đạt cực đại theo chiều sang trái.",
        atTime: (params) => calculateSimplePendulumValues(params).period / 4,
        values: (params) => {
          const value = calculateSimplePendulumValues(params);
          return [
            { label: "Độ cao", value: "0.000", unit: "m" },
            { label: "Tốc độ cực đại", value: value.maximumSpeed.toFixed(2), unit: "m/s" },
            { label: "Chu kì", value: value.period.toFixed(3), unit: "s" },
          ];
        },
      },
      {
        key: "left-extreme",
        label: "Biên trái B′",
        description: "Quả nặng tới biên đối diện rồi đổi chiều; vận tốc tức thời bằng 0.",
        atTime: (params) => calculateSimplePendulumValues(params).period / 2,
        values: (params) => {
          const value = calculateSimplePendulumValues(params);
          return [
            { label: "Li độ góc", value: (-value.initialAngleDegrees).toFixed(0), unit: "°" },
            { label: "Vận tốc", value: "0.00", unit: "m/s" },
            { label: "Cơ năng", value: value.mechanicalEnergy.toFixed(3), unit: "J" },
          ];
        },
      },
      {
        key: "period",
        label: "Chu kì dao động",
        description: "Ở góc lệch nhỏ, chu kì phụ thuộc chiều dài dây và gia tốc trọng trường, không phụ thuộc khối lượng.",
        values: (params) => {
          const value = calculateSimplePendulumValues(params);
          return [
            { label: "Chu kì T", value: value.period.toFixed(3), unit: "s" },
            { label: "Tần số f", value: value.frequency.toFixed(3), unit: "Hz" },
            { label: "Tần số góc", value: value.omega.toFixed(3), unit: "rad/s" },
          ];
        },
      },
    ],
  },
};
