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

export const ongNewton: Preset = {
  id: "ong-newton",
  title: "Ống Newton: không khí và chân không",
  domain: "Cơ học",
  grade: 10,
  desc: "So sánh đồng thời chuyển động của viên bi và lông chim trong không khí và trong chân không.",
  objective: "Quan sát trực tiếp ảnh hưởng của lực cản không khí và kiểm chứng các vật rơi cùng gia tốc trong chân không.",
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
    const tubeWidth = Math.max(2.2, h * 0.18);
    const tubeGap = Math.max(0.38, h * 0.035);
    const leftTubeX = -(tubeWidth + tubeGap) / 2;
    const rightTubeX = (tubeWidth + tubeGap) / 2;
    const objectOffset = tubeWidth * 0.23;

    return {
      bodies: [
        { id: "khong-khi-vien-bi", x: leftTubeX - objectOffset, y: h, vx: 0, vy: 0, mass: ballMass(p), radius: 0.18, visual: { shape: "metalBall", label: "viên bi" } },
        { id: "khong-khi-long-chim", x: leftTubeX + objectOffset, y: h, vx: 0, vy: 0, mass: featherMass(p), radius: 0.22, visual: { shape: "feather", label: "lông chim", angle: -48 } },
        { id: "chan-khong-vien-bi", x: rightTubeX - objectOffset, y: h, vx: 0, vy: 0, mass: ballMass(p), radius: 0.18, visual: { shape: "metalBall", label: "viên bi" } },
        { id: "chan-khong-long-chim", x: rightTubeX + objectOffset, y: h, vx: 0, vy: 0, mass: featherMass(p), radius: 0.22, visual: { shape: "feather", label: "lông chim", angle: -48 } },
      ],
      forces: [
        { kind: "gravity", g },
        { kind: "drag", body: "khong-khi-vien-bi", c: BALL_DRAG * airScale },
        { kind: "drag", body: "khong-khi-long-chim", c: FEATHER_DRAG * airScale },
      ],
      constraints: [{ kind: "surface", x: 0, y: 0, angle: 0, length: 400, friction: 0.8 }],
      view: {
        minX: leftTubeX - tubeWidth / 2 - 0.2,
        maxX: rightTubeX + tubeWidth / 2 + 0.2,
        minY: -0.2,
        maxY: h + 0.85,
      },
    };
  },
  annotations: (p) => {
    const h = p.h ?? 9;
    const tubeWidth = Math.max(2.2, h * 0.18);
    const tubeGap = Math.max(0.38, h * 0.035);
    const leftTubeX = -(tubeWidth + tubeGap) / 2;
    const rightTubeX = (tubeWidth + tubeGap) / 2;
    const tubeBottom = -0.1;
    const tubeTop = h + 0.38;
    const tubeHeight = tubeTop - tubeBottom;
    const tubeCenterY = (tubeTop + tubeBottom) / 2;
    const capHeight = Math.max(0.05, h * 0.018);
    const makeTube = (x: number, tint: string) => [
      { kind: "rect" as const, x, y: tubeCenterY, width: tubeWidth, height: tubeHeight, fill: tint, stroke: "rgba(186, 230, 253, 0.78)", strokeWidth: 2.2 },
      { kind: "rect" as const, x, y: tubeCenterY, width: tubeWidth - 0.14, height: tubeHeight - 0.12, fill: "rgba(224, 242, 254, 0.02)", stroke: "rgba(125, 211, 252, 0.22)", strokeWidth: 1 },
      { kind: "rect" as const, x: x - tubeWidth * 0.36, y: tubeCenterY, width: Math.max(0.035, tubeWidth * 0.035), height: tubeHeight - 0.2, fill: "rgba(240, 249, 255, 0.24)", stroke: "rgba(240, 249, 255, 0)", strokeWidth: 0 },
      { kind: "rect" as const, x, y: tubeTop, width: tubeWidth + 0.12, height: capHeight, fill: "rgba(100, 116, 139, 0.84)", stroke: "rgba(226, 232, 240, 0.82)", strokeWidth: 1.4 },
      { kind: "rect" as const, x, y: tubeBottom, width: tubeWidth + 0.12, height: capHeight, fill: "rgba(51, 65, 85, 0.96)", stroke: "rgba(203, 213, 225, 0.72)", strokeWidth: 1.4 },
    ];

    return [
      ...makeTube(leftTubeX, "rgba(251, 191, 36, 0.045)"),
      ...makeTube(rightTubeX, "rgba(125, 211, 252, 0.07)"),
      { kind: "label", x: leftTubeX - tubeWidth * 0.38, y: tubeTop + 0.15, text: "KHÔNG KHÍ", color: "#fbbf24", fontSize: 13, fontStyle: "normal" },
      { kind: "label", x: rightTubeX - tubeWidth * 0.4, y: tubeTop + 0.15, text: "CHÂN KHÔNG", color: "#7dd3fc", fontSize: 13, fontStyle: "normal" },
    ];
  },
  minimalOverlay: true,
  analysis: {
    landmarks: [
      {
        key: "release",
        label: "Lúc thả",
        description: "Bốn vật trong hai ống được thả cùng lúc, cùng độ cao và cùng vận tốc đầu bằng 0.",
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
        description: "Trong chân không hai vật đi cùng nhau; trong không khí lông chim bị hãm rõ rệt.",
        atTime: () => 1,
        values: (p) => {
          const g = p.g ?? 9.8;
          const cBall = dragCoeff(BALL_DRAG, p);
          const cFeather = dragCoeff(FEATHER_DRAG, p);
          return [
            { label: "v bi - không khí", value: downwardSpeed(1, ballMass(p), cBall, g).toFixed(2), unit: "m/s" },
            { label: "v lông - không khí", value: downwardSpeed(1, featherMass(p), cFeather, g).toFixed(2), unit: "m/s" },
            { label: "v cả hai - chân không", value: g.toFixed(2), unit: "m/s" },
            { label: "s cả hai - chân không", value: Math.min(p.h ?? 9, 0.5 * g).toFixed(2), unit: "m" },
          ];
        },
      },
      {
        key: "ball-ground",
        label: "Khi bi trong không khí chạm đáy",
        description: "Hai vật trong chân không đã chạm đáy cùng nhau; lông chim trong không khí vẫn còn ở phía trên.",
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