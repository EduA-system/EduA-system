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
  desc: "Hút hết không khí trong ống Newton để viên bi và lông chim rơi cùng gia tốc.",
  objective: "Hiểu rằng trong chân không, mọi vật rơi như nhau với gia tốc g nếu chỉ chịu trọng lực.",
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
        { id: "vien-bi", x: -0.45, y: h, vx: 0, vy: 0, mass: ballMass(p) },
        { id: "long-chim", x: 0.45, y: h, vx: 0, vy: 0, mass: featherMass(p) },
      ],
      forces: [{ kind: "gravity", g }],
      constraints: [{ kind: "surface", x: 0, y: 0, angle: 0, length: 400, friction: 0.8 }],
    };
  },
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