import type { Annotation, Scene } from "../engines/mechanics/types";
import type { SceneAnnotation } from "../shared/scene-types";
import type { MechanicsPreset } from "./types";

const G = 9.8;
const RAMP_LENGTH = 6.2;
const LEFT_BASE_X = -2.8;
const BLOCK_CLEARANCE = 0.16;

const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

function calculate(params: Record<string, number>) {
  const alpha = params.alpha ?? 25;
  const m = params.m ?? 2;
  const mu = params.mu ?? 0.2;
  const Fk = params.Fk ?? 12;
  const angle = toRadians(alpha);
  const P = m * G;
  const P1 = P * Math.cos(angle);
  const P2 = P * Math.sin(angle);
  const N = P1;
  const FmsMax = mu * N;
  const drive = Fk - P2;
  const frictionSign = drive > 0 ? -1 : drive < 0 ? 1 : 0;
  const Fms = Math.min(FmsMax, Math.abs(drive));
  const along = drive + frictionSign * Fms;
  return { alpha, m, mu, Fk, angle, P, P1, P2, N, FmsMax, Fms, frictionSign, along };
}

function rampGeometry(alpha: number) {
  const angle = toRadians(alpha);
  const tangent = { x: Math.cos(angle), y: Math.sin(angle) };
  const normal = { x: -Math.sin(angle), y: Math.cos(angle) };
  const visualStart = { x: LEFT_BASE_X, y: 0 };
  const visualEnd = {
    x: LEFT_BASE_X + RAMP_LENGTH * tangent.x,
    y: RAMP_LENGTH * tangent.y,
  };
  const surfaceStart = {
    x: visualStart.x + normal.x * BLOCK_CLEARANCE,
    y: visualStart.y + normal.y * BLOCK_CLEARANCE,
  };
  const surfaceEnd = {
    x: visualEnd.x + normal.x * BLOCK_CLEARANCE,
    y: visualEnd.y + normal.y * BLOCK_CLEARANCE,
  };
  const surfaceCenter = {
    x: (surfaceStart.x + surfaceEnd.x) / 2,
    y: (surfaceStart.y + surfaceEnd.y) / 2,
  };
  return { tangent, normal, visualStart, visualEnd, surfaceStart, surfaceEnd, surfaceCenter };
}

function vectorLength(force: number, reference: number, scale = 1) {
  return Math.max(0.22, Math.min(1.35, 0.28 + force / Math.max(reference, 1) * 0.86)) * scale;
}

function vector(direction: { x: number; y: number }, force: number, reference: number, scale = 1) {
  const length = vectorLength(force, reference, scale);
  return { dx: direction.x * length, dy: direction.y * length };
}

function buildScene(params: Record<string, number>): Scene {
  const current = calculate(params);
  const ramp = rampGeometry(current.alpha);
  const travel = 2.9;
  const block = {
    x: ramp.surfaceStart.x + ramp.tangent.x * travel,
    y: ramp.surfaceStart.y + ramp.tangent.y * travel,
  };
  const frictionDirection = {
    x: ramp.tangent.x * current.frictionSign,
    y: ramp.tangent.y * current.frictionSign,
  };
  const annotations: Annotation[] = [
    {
      kind: "vector",
      anchor: "vat",
      ...vector({ x: 0, y: -1 }, current.P, current.P, 0.72),
      color: "#f8fafc",
      label: "P",
      labelPosition: "outside",
      labelSize: 18,
      width: 3,
    },
    {
      kind: "vector",
      anchor: "vat",
      ...vector(ramp.normal, current.N, current.P, 0.72),
      color: "#c084fc",
      label: "N",
      labelPosition: "outside",
      labelSize: 18,
      width: 3,
    },
    ...(current.Fk > 1e-6 ? [{
      kind: "vector" as const,
      anchor: "vat",
      ...vector(ramp.tangent, current.Fk, current.P),
      color: "#22d3ee",
      label: "Fₖ",
      labelPosition: "outside" as const,
      labelSize: 18,
      width: 3,
    }] : []),
    ...(current.Fms > 1e-6 ? [{
      kind: "vector" as const,
      anchor: "vat",
      ...vector(frictionDirection, current.Fms, current.P),
      color: "#f43f5e",
      label: "Fₘₛ",
      labelPosition: "outside" as const,
      labelSize: 18,
      width: 3,
    }] : []),
    {
      kind: "vector",
      anchor: "vat",
      ...vector({ x: -ramp.normal.x, y: -ramp.normal.y }, current.P1, current.P, 0.72),
      color: "#60a5fa",
      label: "P₁",
      labelPosition: "outside",
      labelSize: 17,
      width: 2,
    },
  ];

  return {
    bodies: [{
      id: "vat",
      x: block.x,
      y: block.y,
      vx: 0,
      vy: 0,
      mass: current.m,
      radius: 0.22,
      visual: { shape: "box", color: "#f97316", label: "m", angle: -current.alpha },
    }],
    forces: [
      { kind: "gravity", g: G },
      ...(current.Fk > 1e-6 ? [{
        kind: "applied" as const,
        body: "vat",
        fx: current.Fk * ramp.tangent.x,
        fy: current.Fk * ramp.tangent.y,
      }] : []),
      ...(current.Fms > 1e-6 ? [{
        kind: "applied" as const,
        body: "vat",
        fx: current.Fms * frictionDirection.x,
        fy: current.Fms * frictionDirection.y,
      }] : []),
    ],
    constraints: [
      {
        kind: "surface",
        x: ramp.surfaceCenter.x,
        y: ramp.surfaceCenter.y,
        angle: current.alpha,
        length: RAMP_LENGTH,
        friction: 0,
      },
      {
        kind: "curveTrack",
        body: "vat",
        points: [ramp.surfaceStart, ramp.surfaceEnd],
        friction: 0,
        hidden: true,
      },
    ],
    annotations,
    view: { minX: -3.2, maxX: 3.55, minY: 0, maxY: 4.55 },
    groundPadding: 78,
  };
}

function buildAnnotations(params: Record<string, number>): SceneAnnotation[] {
  const current = calculate(params);
  const ramp = rampGeometry(current.alpha);
  const halfAngle = current.angle / 2;
  return [
    {
      kind: "polygon",
      points: [
        ramp.visualStart,
        ramp.visualEnd,
        { x: ramp.visualEnd.x, y: 0 },
        { x: ramp.visualStart.x, y: 0 },
      ],
      fill: "#334155",
      stroke: "#64748b",
      strokeWidth: 2,
    },
    {
      kind: "arc",
      x: ramp.visualStart.x,
      y: ramp.visualStart.y,
      radius: 0.62,
      startAngle: 0,
      endAngle: current.alpha,
      color: "#fbbf24",
      strokeWidth: 2.5,
    },
    {
      kind: "label",
      x: ramp.visualStart.x + Math.cos(halfAngle) * 0.4,
      y: ramp.visualStart.y + Math.sin(halfAngle) * 0.4,
      text: `α = ${current.alpha.toFixed(0)}°`,
      color: "#fbbf24",
      fontSize: 17,
      align: "center",
      width: 0.9,
    },
    {
      kind: "velocity",
      body: "vat",
      scale: 0.28,
      maxLength: 1.15,
      offsetX: ramp.normal.x * 0.16,
      offsetY: ramp.normal.y * 0.16,
      color: "#a3e635",
      label: "v",
      labelSize: 17,
      showMagnitude: true,
      holdLast: true,
    },
  ];
}

export const matNghiengMaSat: MechanicsPreset = {
  id: "mat-nghieng-ma-sat",
  title: "Mặt phẳng nghiêng + ma sát",
  domain: "Cơ học",
  grade: 10,
  desc: "Quan sát vật trên mặt phẳng nghiêng và xác định vai trò của lực ma sát, lực pháp tuyến và lực kéo.",
  objective: "Đọc đúng P, N, Fₘₛ, Fₖ và kiểm chứng điều kiện đứng yên hoặc trượt của vật trên mặt dốc.",
  sgkRef: "Vật lí 10 — Động lực học",
  startPaused: true,
  params: [
    { key: "alpha", label: "Góc nghiêng α", unit: "°", min: 10, max: 45, step: 1, default: 25 },
    { key: "m", label: "Khối lượng vật m", unit: "kg", min: 0.5, max: 6, step: 0.1, default: 2 },
    { key: "mu", label: "Hệ số ma sát μ", unit: "", min: 0, max: 0.8, step: 0.05, default: 0.2 },
    { key: "Fk", label: "Lực kéo Fₖ", unit: "N", min: 0, max: 30, step: 0.5, default: 12 },
  ],
  quickPresets: [
    { label: "Mặt dốc nhẵn", params: { alpha: 25, m: 2, mu: 0, Fk: 12 } },
    { label: "Có ma sát", params: { alpha: 25, m: 2, mu: 0.2, Fk: 12 } },
    { label: "Kéo cân bằng", params: { alpha: 25, m: 2, mu: 0.2, Fk: 11.8 } },
    { label: "Vật trượt xuống", params: { alpha: 30, m: 2, mu: 0.1, Fk: 0 } },
  ],
  applyParams: buildScene,
  annotations: buildAnnotations,
  minimalOverlay: true,
  hideBodyCoordinates: true,
  hideFixedSupportDecoration: true,
  analysis: {
    landmarks: [
      {
        key: "forces",
        label: "Các lực trên vật",
        description: "N = P cos α; thành phần trọng lực dọc dốc là P sin α.",
        values: (p) => {
          const value = calculate(p);
          return [
            { label: "Trọng lực P", value: value.P.toFixed(2), unit: "N" },
            { label: "Pháp tuyến N", value: value.N.toFixed(2), unit: "N" },
            { label: "Thành phần dọc dốc", value: value.P2.toFixed(2), unit: "N" },
          ];
        },
      },
      {
        key: "friction",
        label: "Ma sát và lực kéo",
        description: "Ma sát nghỉ tự điều chỉnh đến giới hạn μN; khi vật trượt, ma sát đạt giới hạn.",
        values: (p) => {
          const value = calculate(p);
          return [
            { label: "Giới hạn ma sát μN", value: value.FmsMax.toFixed(2), unit: "N" },
            { label: "Lực ma sát thực tế", value: value.Fms.toFixed(2), unit: "N" },
            { label: "Hợp lực dọc dốc", value: value.along.toFixed(2), unit: "N" },
          ];
        },
      },
    ],
  },
};
