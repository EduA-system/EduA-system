import type { Preset } from "./types";

const GRAVITY = 9.8;
const MAX_READING = 50;
const METER_Y = 3.55;
const UNLOADED_HOOK_Y = 2.45;
const MAX_SPRING_EXTENSION = 0.75;
const STRING_LENGTH = 1.1;

function vectorLength(weight: number) {
  return Math.min(1.1, Math.max(0.28, weight * 0.04));
}

function values(p: Record<string, number>) {
  const mass = p.mass ?? 1;
  const weight = mass * GRAVITY;
  const springExtension = Math.min(MAX_SPRING_EXTENSION, (weight / MAX_READING) * MAX_SPRING_EXTENSION);
  const hookY = UNLOADED_HOOK_Y - springExtension;
  return { mass, weight, springExtension, hookY };
}

export const doPTBangLucKe: Preset = {
  id: "do-p-t-bang-luc-ke",
  title: "Đo trọng lượng của vật bằng lực kế",
  domain: "Cơ học",
  grade: 10,
  desc: "Treo một vật vào lực kế, quan sát lực kế đo được lực bao nhiêu",
  objective: "Hiểu lực kế đo lực căng dây. Khi vật treo đứng yên, lực căng cân bằng trọng lực nên số chỉ lực kế T = P = mg.",
  sgkRef: "Vật lí 10 — Bài 17",
  params: [
    { key: "mass", label: "Khối lượng vật", unit: "kg", min: 0.1, max: 5, step: 0.1, default: 1 },
  ],
  applyParams: (p) => {
    const { mass, weight, hookY } = values(p);

    return {
      disableDragging: true,
      bodies: [
        {
          id: "luc-ke",
          x: 0,
          y: METER_Y,
          vx: 0,
          vy: 0,
          mass: 1,
          fixed: true,
          radius: 0.28,
          visual: {
            shape: "forceMeter",
            orientation: "vertical",
            color: "#38bdf8",
            reading: `${weight.toFixed(1)} N`,
            readingRatio: weight / MAX_READING,
            forceMeterHookBody: "moc",
          },
        },
        {
          id: "moc",
          x: 0,
          y: hookY,
          vx: 0,
          vy: 0,
          mass: 1,
          fixed: true,
          radius: 0.04,
          visual: { shape: "circle", color: "rgba(0,0,0,0)" },
        },
        {
          id: "vat",
          x: 0,
          y: hookY - STRING_LENGTH,
          vx: 0,
          vy: 0,
          mass,
          radius: 0.25,
          visual: { shape: "box", color: "#334155", label: "m" },
        },
      ],
      forces: [{ kind: "gravity", g: GRAVITY }],
      constraints: [{ kind: "rod", a: "moc", b: "vat", length: STRING_LENGTH }],
      annotations: [
        { kind: "vector", anchor: "vat", dx: 0, dy: vectorLength(weight), color: "#2563eb", label: "T", labelPosition: "outside" },
        { kind: "vector", anchor: "vat", dx: 0, dy: -vectorLength(weight), color: "#ef4444", label: "P = mg", labelPosition: "outside" },
      ],
      view: { minX: -2, maxX: 2, minY: 0, maxY: 5.4 },
      groundPadding: 120,
    };
  },
  bodyLabels: { vat: "Vật treo" },
  bodyColors: { vat: "#334155" },
  annotations: () => [
    // Thân giá là một polygon liền khối: trụ, tay ngang và ngàm treo không
    // còn các đường viền chồng lên nhau tại khớp chữ L.
    {
      kind: "polygon",
      points: [
        { x: -1.18, y: 0.28 },
        { x: -1.02, y: 0.28 },
        { x: -1.02, y: 4.76 },
        { x: -0.07, y: 4.76 },
        { x: -0.07, y: 4.4 },
        { x: 0.07, y: 4.4 },
        { x: 0.07, y: 4.92 },
        { x: -1.18, y: 4.92 },
      ],
      fill: "#64748b",
      stroke: "#cbd5e1",
      strokeWidth: 1.5,
    },
    // Đế vát và cổ khóa tạo cảm giác trụ được lắp chắc vào chân giá.
    {
      kind: "polygon",
      points: [
        { x: -1.84, y: 0.08 },
        { x: -0.32, y: 0.08 },
        { x: -0.46, y: 0.3 },
        { x: -1.7, y: 0.3 },
      ],
      fill: "#475569",
      stroke: "#94a3b8",
      strokeWidth: 1.5,
    },
    { kind: "rect", x: -1.1, y: 0.29, width: 0.34, height: 0.2, fill: "#475569", stroke: "#94a3b8", strokeWidth: 1.5 },
    // Bản mã gia cường ở góc và khối kẹp tại đầu tay ngang.
    {
      kind: "polygon",
      points: [
        { x: -1.02, y: 4.76 },
        { x: -0.76, y: 4.76 },
        { x: -1.02, y: 4.5 },
      ],
      fill: "#475569",
      stroke: "#94a3b8",
      strokeWidth: 1,
    },
    { kind: "rect", x: 0, y: 4.51, width: 0.24, height: 0.18, fill: "#475569", stroke: "#cbd5e1", strokeWidth: 1.5 },
    { kind: "label", x: -1.82, y: 4.42, text: "Giá treo", color: "#cbd5e1", fontSize: 12 },
  ],
  analysis: {
    landmarks: [
      {
        key: "weight",
        label: "Trọng lượng của vật",
        description: "Trọng lực P là lực Trái Đất tác dụng lên vật, hướng thẳng đứng xuống dưới. Với g = 9,8 m/s², độ lớn P = mg.",
        atTime: () => 0,
        values: (p) => {
          const { mass, weight } = values(p);
          return [
            { label: "m", value: mass.toFixed(2), unit: "kg" },
            { label: "g", value: GRAVITY.toFixed(1), unit: "m/s²" },
            { label: "P = mg", value: weight.toFixed(2), unit: "N" },
          ];
        },
      },
      {
        key: "reading",
        label: "Số chỉ lực kế",
        description: "Lực kế mắc nối tiếp với dây nên số chỉ của lực kế là độ lớn lực căng dây T. Khi vật đứng yên, T = P.",
        values: (p) => {
          const { weight } = values(p);
          return [
            { label: "Số chỉ lực kế T", value: weight.toFixed(2), unit: "N" },
            { label: "Trọng lượng P", value: weight.toFixed(2), unit: "N" },
            { label: "Kết luận", value: "T = P = mg", unit: "" },
          ];
        },
      },
      {
        key: "equilibrium",
        label: "Điều kiện cân bằng",
        description: "Khi vật đứng yên, lực căng dây hướng lên cân bằng với trọng lực hướng xuống: T = P.",
        values: (p) => {
          const { weight } = values(p);
          return [
            { label: "T", value: weight.toFixed(2), unit: "N" },
            { label: "P", value: weight.toFixed(2), unit: "N" },
            { label: "Hợp lực", value: "0", unit: "N" },
          ];
        },
      },
    ],
  },
};
