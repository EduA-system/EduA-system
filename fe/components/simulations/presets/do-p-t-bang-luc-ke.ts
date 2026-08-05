import type { Preset } from "./types";

const GRAVITY = 9.8;
const MAX_READING = 50;
const METER_Y = 4.52;
const UNLOADED_HOOK_Y = 3.32;
const MAX_SPRING_EXTENSION = 0.75;
const STRING_LENGTH = 1.05;
const INTERACTIVE_PULL_RANGE = 0.9;

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
            forceMeterInteractiveBody: "vat",
            forceMeterMaxReading: MAX_READING,
            forceMeterPullRange: INTERACTIVE_PULL_RANGE,
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
      view: { minX: -2.5, maxX: 2.5, minY: 0, maxY: 6.25 },
      groundPadding: 48,
    };
  },
  bodyLabels: { vat: "Vật treo" },
  bodyColors: { vat: "#334155" },
  hideBodyCoordinates: true,
  lockPan: true,
  annotations: () => [
    // Thân giá là một polygon liền khối: trụ, tay ngang và ngàm treo không
    // còn các đường viền chồng lên nhau tại khớp chữ L.
    {
      kind: "polygon",
      points: [
        { x: -1.42, y: 0.28 },
        { x: -1.2, y: 0.28 },
        { x: -1.2, y: 5.66 },
        { x: -0.1, y: 5.66 },
        { x: -0.1, y: 5.36 },
        { x: 0.1, y: 5.36 },
        { x: 0.1, y: 5.86 },
        { x: -1.42, y: 5.86 },
      ],
      fill: "#64748b",
      stroke: "#cbd5e1",
      strokeWidth: 1.5,
    },
    // Đế vát và cổ khóa tạo cảm giác trụ được lắp chắc vào chân giá.
    {
      kind: "polygon",
      points: [
        { x: -2.0, y: 0.08 },
        { x: -0.42, y: 0.08 },
        { x: -0.58, y: 0.3 },
        { x: -1.84, y: 0.3 },
      ],
      fill: "#475569",
      stroke: "#94a3b8",
      strokeWidth: 1.5,
    },
    { kind: "rect", x: -1.34, y: 0.29, width: 0.38, height: 0.2, fill: "#475569", stroke: "#94a3b8", strokeWidth: 1.5 },
    // Bản mã gia cường ở góc và khối kẹp tại đầu tay ngang.
    {
      kind: "polygon",
      points: [
        { x: -1.2, y: 5.66 },
        { x: -0.9, y: 5.66 },
        { x: -1.2, y: 5.36 },
      ],
      fill: "#475569",
      stroke: "#94a3b8",
      strokeWidth: 1,
    },
    { kind: "rect", x: 0, y: 5.47, width: 0.26, height: 0.2, fill: "#475569", stroke: "#cbd5e1", strokeWidth: 1.5 },
    { kind: "label", x: -2.0, y: 5.26, text: "Giá treo", color: "#cbd5e1", fontSize: 12 },
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
