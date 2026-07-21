import type { Preset } from "./types";

const DEFAULT_BALL_MASS = 0.05; // kg
const DEFAULT_FEATHER_MASS = 0.003; // kg

function ballMass(p: Record<string, number>): number {
  return p.mBall ?? DEFAULT_BALL_MASS;
}

function featherMass(p: Record<string, number>): number {
  return p.mFeather ?? DEFAULT_FEATHER_MASS;
}

function fallTime(height: number, g: number): number {
  return height > 0 && g > 0 ? Math.sqrt((2 * height) / g) : 0;
}

function fallDistance(t: number, g: number): number {
  return 0.5 * g * t * t;
}

export const ongNewtonChanKhong: Preset = {
  id: "ong-newton-chan-khong",
  title: "Ống Newton trong chân không",
  domain: "Cơ học",
  grade: 10,
  desc: "Thả viên bi và lông chim trong môi trường Chân không để chúng rơi cùng gia tốc",
  objective: "Thả viên bi và lông chim trong môi trường Chân không để chúng rơi cùng gia tốc",
  sgkRef: "Vật lí 10",
  params: [
    { key: "h", label: "Độ cao thả", unit: "m", min: 2, max: 20, step: 0.5, default: 9 },
    { key: "g", label: "Gia tốc trọng trường", unit: "m/s²", min: 1.6, max: 20, step: 0.1, default: 9.8 },
    { key: "mBall", label: "Khối lượng viên bi", unit: "kg", min: 0.01, max: 0.2, step: 0.005, default: DEFAULT_BALL_MASS },
    { key: "mFeather", label: "Khối lượng lông chim", unit: "kg", min: 0.001, max: 0.2, step: 0.001, default: DEFAULT_FEATHER_MASS },
  ],
  applyParams: (p) => {
    const h = p.h ?? 9;
    const g = p.g ?? 9.8;
    return {
      bodies: [
        {
          id: "vien-bi",
          x: -0.45,
          y: h,
          vx: 0,
          vy: 0,
          mass: ballMass(p),
          radius: 0.18,
          visual: { shape: "metalBall", label: "viên bi" },
        },
        {
          id: "long-chim",
          x: 0.45,
          y: h,
          vx: 0,
          vy: 0,
          mass: featherMass(p),
          radius: 0.22,
          visual: { shape: "feather", label: "lông chim", angle: 90 },
        },
      ],
      forces: [{ kind: "gravity", g }],
      constraints: [{ kind: "surface", x: 0, y: 0, angle: 0, length: 400, friction: 0.8 }],
      view: { minX: -Math.max(2.1, h * 0.18) / 2 - 0.18, maxX: Math.max(2.1, h * 0.18) / 2 + 0.18, minY: -0.2, maxY: h + 0.6 },
    };
  },
  annotations: (p) => {
    const h = p.h ?? 9;
    const tubeWidth = Math.max(2.1, h * 0.18);
    const tubeBottom = -0.12;
    const tubeTop = h + 0.42;
    const tubeHeight = tubeTop - tubeBottom;
    const tubeCenterY = (tubeTop + tubeBottom) / 2;
    const capHeight = Math.max(0.05, h * 0.018);

    return [
      { kind: "rect", x: 0, y: tubeCenterY, width: tubeWidth, height: tubeHeight, fill: "rgba(125, 211, 252, 0.07)", stroke: "rgba(186, 230, 253, 0.82)", strokeWidth: 2.4 },
      { kind: "rect", x: 0, y: tubeCenterY, width: tubeWidth - 0.16, height: tubeHeight - 0.12, fill: "rgba(224, 242, 254, 0.025)", stroke: "rgba(125, 211, 252, 0.26)", strokeWidth: 1 },
      { kind: "rect", x: -tubeWidth * 0.36, y: tubeCenterY, width: Math.max(0.035, tubeWidth * 0.035), height: tubeHeight - 0.2, fill: "rgba(240, 249, 255, 0.26)", stroke: "rgba(240, 249, 255, 0)", strokeWidth: 0 },
      { kind: "rect", x: 0, y: tubeTop, width: tubeWidth + 0.14, height: capHeight, fill: "rgba(148, 163, 184, 0.72)", stroke: "rgba(226, 232, 240, 0.88)", strokeWidth: 1.5 },
      { kind: "rect", x: 0, y: tubeBottom, width: tubeWidth + 0.14, height: capHeight, fill: "rgba(71, 85, 105, 0.92)", stroke: "rgba(203, 213, 225, 0.78)", strokeWidth: 1.5 },
    ];
  },
  minimalOverlay: true,
  analysis: {
    landmarks: [
      {
        key: "release",
        label: "Lúc thả",
        description: "Hai vật có khối lượng rất khác nhau nhưng cùng độ cao và cùng vận tốc đầu bằng 0.",
        atTime: () => 0,
        values: (p) => [
          { label: "Độ cao ban đầu", value: (p.h ?? 9).toFixed(1), unit: "m" },
          { label: "Vận tốc đầu", value: "0", unit: "m/s" },
          { label: "Khối lượng viên bi", value: ballMass(p).toFixed(3), unit: "kg" },
          { label: "Khối lượng lông chim", value: featherMass(p).toFixed(3), unit: "kg" },
        ],
      },
      {
        key: "same-acceleration",
        label: "Vì sao khối lượng không ảnh hưởng?",
        description: "Trong chân không chỉ có trọng lực: F = mg, nên a = F/m = g cho cả hai vật.",
        values: (p) => {
          const g = p.g ?? 9.8;
          return [
            { label: "a viên bi", value: g.toFixed(1), unit: "m/s²" },
            { label: "a lông chim", value: g.toFixed(1), unit: "m/s²" },
            { label: "F bi = m·g", value: (ballMass(p) * g).toFixed(3), unit: "N" },
            { label: "F lông = m·g", value: (featherMass(p) * g).toFixed(3), unit: "N" },
          ];
        },
      },
      {
        key: "after-1s",
        label: "Sau 1 giây",
        description: "Không có lực cản, hai vật có cùng vận tốc và đi được cùng quãng đường.",
        atTime: () => 1,
        values: (p) => {
          const g = p.g ?? 9.8;
          const h = p.h ?? 9;
          const s = Math.min(h, fallDistance(1, g));
          return [
            { label: "v viên bi", value: g.toFixed(2), unit: "m/s" },
            { label: "v lông chim", value: g.toFixed(2), unit: "m/s" },
            { label: "s cả hai vật", value: s.toFixed(2), unit: "m" },
            { label: "Chênh lệch", value: "0", unit: "m" },
          ];
        },
      },
      {
        key: "ground",
        label: "Lúc chạm đáy",
        description: "Trong chân không, cả hai vật chạm đáy cùng lúc: t = sqrt(2h/g).",
        atTime: (p) => fallTime(p.h ?? 9, p.g ?? 9.8),
        values: (p) => {
          const h = p.h ?? 9;
          const g = p.g ?? 9.8;
          const t = fallTime(h, g);
          return [
            { label: "Thời gian rơi", value: t.toFixed(2), unit: "s" },
            { label: "Vận tốc chạm đáy", value: Math.sqrt(2 * g * h).toFixed(2), unit: "m/s" },
            { label: "Gia tốc viên bi", value: g.toFixed(1), unit: "m/s²" },
            { label: "Gia tốc lông chim", value: g.toFixed(1), unit: "m/s²" },
          ];
        },
      },
    ],
  },
};