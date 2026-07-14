import type { Preset } from "./types";

const DEFAULT_BALL_MASS = 0.05; // kg
const BALL_DRAG = 0.005; // N.s/m
const DEFAULT_FEATHER_MASS = 0.003; // kg
const FEATHER_DRAG = 0.08; // N.s/m

function ballMass(p: Record<string, number>): number {
  return p.mBall ?? DEFAULT_BALL_MASS;
}

function featherMass(p: Record<string, number>): number {
  return p.mFeather ?? DEFAULT_FEATHER_MASS;
}

function dragCoeff(base: number, p: Record<string, number>): number {
  return base * (p.airScale ?? 1);
}

function terminalSpeed(mass: number, c: number, g: number): number {
  return c > 0 ? (mass * g) / c : Infinity;
}

function fallDistance(t: number, mass: number, c: number, g: number): number {
  if (c <= 0) return 0.5 * g * t * t;
  const tau = mass / c;
  const vt = terminalSpeed(mass, c, g);
  return vt * (t - tau * (1 - Math.exp(-t / tau)));
}

function downwardSpeed(t: number, mass: number, c: number, g: number): number {
  if (c <= 0) return g * t;
  return terminalSpeed(mass, c, g) * (1 - Math.exp((-c * t) / mass));
}

function timeToFall(height: number, mass: number, c: number, g: number): number {
  if (height <= 0) return 0;
  if (c <= 0) return Math.sqrt((2 * height) / g);

  let lo = 0;
  let hi = Math.max(1, height / Math.max(terminalSpeed(mass, c, g), 0.1) + 2);
  while (fallDistance(hi, mass, c, g) < height) hi *= 2;
  for (let i = 0; i < 48; i++) {
    const mid = (lo + hi) / 2;
    if (fallDistance(mid, mass, c, g) < height) lo = mid;
    else hi = mid;
  }
  return hi;
}

export const ongNewtonKhongKhi: Preset = {
  id: "ong-newton-khong-khi",
  title: "Ống Newton trong không khí",
  domain: "Cơ học",
  grade: 10,
  desc: "Thả viên bi và lông chim trong ống có không khí để thấy lực cản làm vật nhẹ, rộng rơi chậm hơn.",
  objective: "Hiểu rằng trong không khí, các vật rơi khác nhau vì lực cản trên mỗi đơn vị khối lượng khác nhau.",
  sgkRef: "Vật lí 10",
  params: [
    { key: "h", label: "Độ cao thả", unit: "m", min: 2, max: 20, step: 0.5, default: 9 },
    { key: "g", label: "Gia tốc trọng trường", unit: "m/s²", min: 1.6, max: 20, step: 0.1, default: 9.8 },
    { key: "mBall", label: "Khối lượng viên bi", unit: "kg", min: 0.01, max: 0.2, step: 0.005, default: DEFAULT_BALL_MASS },
    { key: "mFeather", label: "Khối lượng lông chim", unit: "kg", min: 0.001, max: 0.2, step: 0.001, default: DEFAULT_FEATHER_MASS },
    { key: "airScale", label: "Mức cản không khí", unit: "x", min: 0, max: 2, step: 0.05, default: 1 },
  ],
  applyParams: (p) => {
    const h = p.h ?? 9;
    const g = p.g ?? 9.8;
    const airScale = p.airScale ?? 1;
    return {
      bodies: [
        { id: "vien-bi", x: -0.45, y: h, vx: 0, vy: 0, mass: ballMass(p) },
        { id: "long-chim", x: 0.45, y: h, vx: 0, vy: 0, mass: featherMass(p) },
      ],
      forces: [
        { kind: "gravity", g },
        { kind: "drag", body: "vien-bi", c: BALL_DRAG * airScale },
        { kind: "drag", body: "long-chim", c: FEATHER_DRAG * airScale },
      ],
      constraints: [{ kind: "surface", x: 0, y: 0, angle: 0, length: 400, friction: 0.8 }],
    };
  },
  analysis: {
    landmarks: [
      {
        key: "release",
        label: "Lúc thả",
        description: "Hai vật được thả cùng lúc, cùng độ cao và cùng vận tốc đầu bằng 0.",
        atTime: () => 0,
        values: (p) => [
          { label: "Độ cao ban đầu", value: (p.h ?? 9).toFixed(1), unit: "m" },
          { label: "Vận tốc đầu", value: "0", unit: "m/s" },
          { label: "Khối lượng viên bi", value: ballMass(p).toFixed(3), unit: "kg" },
          { label: "Khối lượng lông chim", value: featherMass(p).toFixed(3), unit: "kg" },
        ],
      },
      {
        key: "terminal-speed",
        label: "Vận tốc giới hạn trong không khí",
        description: "Khi lực cản cân bằng trọng lực, vật tiến tới vận tốc giới hạn vt = mg/c.",
        values: (p) => {
          const g = p.g ?? 9.8;
          const cBall = dragCoeff(BALL_DRAG, p);
          const cFeather = dragCoeff(FEATHER_DRAG, p);
          return [
            {
              label: "vt viên bi",
              value: Number.isFinite(terminalSpeed(ballMass(p), cBall, g))
                ? terminalSpeed(ballMass(p), cBall, g).toFixed(1)
                : "∞",
              unit: "m/s",
            },
            {
              label: "vt lông chim",
              value: Number.isFinite(terminalSpeed(featherMass(p), cFeather, g))
                ? terminalSpeed(featherMass(p), cFeather, g).toFixed(2)
                : "∞",
              unit: "m/s",
            },
          ];
        },
      },
      {
        key: "after-1s",
        label: "Sau 1 giây",
        description: "Viên bi chịu lực cản nhỏ hơn nhiều, còn lông chim bị lực cản hãm rõ rệt.",
        atTime: () => 1,
        values: (p) => {
          const g = p.g ?? 9.8;
          const cBall = dragCoeff(BALL_DRAG, p);
          const cFeather = dragCoeff(FEATHER_DRAG, p);
          return [
            { label: "v viên bi", value: downwardSpeed(1, ballMass(p), cBall, g).toFixed(2), unit: "m/s" },
            { label: "v lông chim", value: downwardSpeed(1, featherMass(p), cFeather, g).toFixed(2), unit: "m/s" },
            { label: "s viên bi", value: fallDistance(1, ballMass(p), cBall, g).toFixed(2), unit: "m" },
            { label: "s lông chim", value: fallDistance(1, featherMass(p), cFeather, g).toFixed(2), unit: "m" },
          ];
        },
      },
      {
        key: "ball-ground",
        label: "Khi viên bi chạm đáy",
        description: "Nếu hình dạng khác nhau, lông chim có thể vẫn rơi chậm hơn dù chỉnh khối lượng bằng viên bi.",
        atTime: (p) => {
          const h = p.h ?? 9;
          const g = p.g ?? 9.8;
          return timeToFall(h, ballMass(p), dragCoeff(BALL_DRAG, p), g);
        },
        values: (p) => {
          const h = p.h ?? 9;
          const g = p.g ?? 9.8;
          const t = timeToFall(h, ballMass(p), dragCoeff(BALL_DRAG, p), g);
          const featherHeight = Math.max(0, h - fallDistance(t, featherMass(p), dragCoeff(FEATHER_DRAG, p), g));
          return [
            { label: "Thời điểm viên bi", value: t.toFixed(2), unit: "s" },
            { label: "Độ cao lông chim", value: featherHeight.toFixed(2), unit: "m" },
          ];
        },
      },
    ],
  },
};