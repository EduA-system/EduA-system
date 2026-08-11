import type { Annotation, Scene } from "../engines/mechanics/types";
import type { SceneAnnotation } from "../shared/scene-types";
import type { MechanicsPreset } from "./types";

const RAMP_LENGTH = 5.8;
const LEFT_X = -2.75;
const CLEARANCE = 0.16;

const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

function geometry(alpha: number) {
  const angle = toRadians(alpha);
  const tangent = { x: Math.cos(angle), y: Math.sin(angle) };
  const normal = { x: -Math.sin(angle), y: Math.cos(angle) };
  const start = { x: LEFT_X, y: 0 };
  const end = {
    x: start.x + RAMP_LENGTH * tangent.x,
    y: start.y + RAMP_LENGTH * tangent.y,
  };
  const trackStart = {
    x: start.x + normal.x * CLEARANCE,
    y: start.y + normal.y * CLEARANCE,
  };
  const trackEnd = {
    x: end.x + normal.x * CLEARANCE,
    y: end.y + normal.y * CLEARANCE,
  };
  return { angle, tangent, normal, start, end, trackStart, trackEnd };
}

function vector(direction: { x: number; y: number }, length: number) {
  return { dx: direction.x * length, dy: direction.y * length };
}

function buildScene(params: Record<string, number>): Scene {
  const alpha = params.alpha ?? 25;
  const mass = params.m ?? 2;
  const g = params.g ?? 9.8;
  const ramp = geometry(alpha);
  const position = 2.7;
  const block = {
    x: ramp.trackStart.x + ramp.tangent.x * position,
    y: ramp.trackStart.y + ramp.tangent.y * position,
  };
  const weight = mass * g;
  const normalComponent = weight * Math.cos(ramp.angle);
  const slopeComponent = weight * Math.sin(ramp.angle);
  const scale = 0.82 / Math.max(weight, 1);
  const annotations: Annotation[] = [
    {
      kind: "vector",
      anchor: "vat",
      dx: 0,
      dy: -weight * scale,
      color: "#fb7185",
      label: "P",
      labelPosition: "outside",
      labelSize: 18,
      width: 3,
    },
    {
      kind: "vector",
      anchor: "vat",
      ...vector(ramp.normal, normalComponent * scale),
      color: "#c084fc",
      label: "N",
      labelPosition: "outside",
      labelSize: 18,
      width: 3,
    },
    {
      kind: "vector",
      anchor: "vat",
      ...vector({ x: -ramp.normal.x, y: -ramp.normal.y }, normalComponent * scale),
      color: "#60a5fa",
      label: "P₁",
      labelPosition: "outside",
      labelSize: 17,
      width: 2.5,
    },
    {
      kind: "vector",
      anchor: "vat",
      ...vector({ x: -ramp.tangent.x, y: -ramp.tangent.y }, slopeComponent * scale),
      color: "#fbbf24",
      label: "P₂",
      labelPosition: "outside",
      labelSize: 17,
      width: 2.5,
    },
  ];

  return {
    bodies: [
      {
        id: "vat",
        x: block.x,
        y: block.y,
        vx: 0,
        vy: 0,
        mass,
        radius: 0.22,
        fixed: true,
        visual: {
          shape: "box",
          color: "#14b8a6",
          label: "m",
          angle: -alpha,
          grounded: false,
        },
      },
    ],
    forces: [{ kind: "gravity", g }],
    constraints: [
      {
        kind: "surface",
        x: (ramp.trackStart.x + ramp.trackEnd.x) / 2,
        y: (ramp.trackStart.y + ramp.trackEnd.y) / 2,
        angle: alpha,
        length: RAMP_LENGTH,
        friction: 0,
      },
      {
        kind: "curveTrack",
        body: "vat",
        points: [ramp.trackStart, ramp.trackEnd],
        friction: 0,
        hidden: true,
      },
    ],
    annotations,
    view: { minX: -3.15, maxX: 3.25, minY: 0, maxY: 4.2 },
    groundPadding: 78,
  };
}

function buildAnnotations(params: Record<string, number>): SceneAnnotation[] {
  const alpha = params.alpha ?? 25;
  const ramp = geometry(alpha);
  const middleAngle = ramp.angle / 2;
  return [
    {
      kind: "polygon",
      points: [ramp.start, ramp.end, { x: ramp.end.x, y: 0 }],
      fill: "#334155",
      stroke: "#64748b",
      strokeWidth: 2,
    },
    {
      kind: "arc",
      x: ramp.start.x,
      y: ramp.start.y,
      radius: 0.58,
      startAngle: 0,
      endAngle: alpha,
      color: "#fbbf24",
      strokeWidth: 2.4,
    },
    {
      kind: "label",
      x: ramp.start.x + Math.cos(middleAngle) * 0.38,
      y: ramp.start.y + Math.sin(middleAngle) * 0.38,
      text: `α`,
      color: "#fde68a",
      fontSize: 18,
      align: "center",
      width: 0.45,
    },
  ];
}

export const phanTichLuc: MechanicsPreset = {
  id: "phan-tich-luc",
  title: "Phân tích lực trên mặt phẳng nghiêng",
  domain: "Cơ học",
  grade: 10,
  desc: "Phân tích trọng lực thành hai thành phần song song và vuông góc với mặt phẳng nghiêng.",
  objective: "Nhận biết đúng P, N, P₁, P₂ và kiểm chứng P₁ = P cos α, P₂ = P sin α.",
  sgkRef: "Vật lí 10 — Động lực học",
  startPaused: true,
  params: [
    { key: "alpha", label: "Góc nghiêng α", unit: "°", min: 10, max: 45, step: 1, default: 25 },
    { key: "m", label: "Khối lượng vật m", unit: "kg", min: 0.5, max: 6, step: 0.1, default: 2 },
    { key: "g", label: "Gia tốc trọng trường g", unit: "m/s²", min: 1.6, max: 20, step: 0.1, default: 9.8 },
  ],
  quickPresets: [
    { label: "Dốc thoải", params: { alpha: 15, m: 2, g: 9.8 } },
    { label: "Góc 25°", params: { alpha: 25, m: 2, g: 9.8 } },
    { label: "Dốc cao", params: { alpha: 40, m: 2, g: 9.8 } },
  ],
  applyParams: buildScene,
  annotations: buildAnnotations,
  minimalOverlay: true,
  hideBodyCoordinates: true,
  hideFixedSupportDecoration: true,
  analysis: {
    landmarks: [
      {
        key: "components",
        label: "Các thành phần của trọng lực",
        description: "P₁ vuông góc mặt dốc, P₂ song song và hướng xuống dốc.",
        values: (params) => {
          const alpha = params.alpha ?? 25;
          const weight = (params.m ?? 2) * (params.g ?? 9.8);
          const angle = toRadians(alpha);
          return [
            { label: "P = mg", value: weight.toFixed(2), unit: "N" },
            { label: "P₁ = P cos α", value: (weight * Math.cos(angle)).toFixed(2), unit: "N" },
            { label: "P₂ = P sin α", value: (weight * Math.sin(angle)).toFixed(2), unit: "N" },
          ];
        },
      },
    ],
  },
};
