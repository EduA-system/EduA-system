import type { Preset } from "./types";

const BASE_DRAG = 0.32; // N.s/m, model tuyến tính F = -c.v trong kernel hiện tại
const SHAPES = [
  { id: "vat-thuon", label: "Vật thuôn", coeff: 0.25, x: -1.4, color: "#60a5fa", shape: "streamlined" as const },
  { id: "vat-cau", label: "Vật cầu", coeff: 1, x: 0, color: "#f472b6", shape: "circle" as const },
  { id: "vat-be", label: "Vật bè", coeff: 2.5, x: 1.4, color: "#fbbf24", shape: "plate" as const },
];

function derive(p: Record<string, number>) {
  const h = p.h ?? 9;
  const m = p.m ?? 0.1;
  const g = p.g ?? 9.8;
  const mediumScale = p.mediumScale ?? 1;
  const areaScale = p.areaScale ?? 1;
  return { h, m, g, mediumScale, areaScale };
}

function dragCoeff(shapeCoeff: number, p: Record<string, number>): number {
  const { mediumScale, areaScale } = derive(p);
  return BASE_DRAG * shapeCoeff * mediumScale * areaScale;
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

export const lucCanChatLuu: Preset = {
  id: "luc-can-chat-luu",
  title: "Chuyển động trong chất lưu",
  domain: "Cơ học",
  grade: 10,
  desc: "Thả các vật có hình dạng khác nhau trong cùng chất lưu để so sánh lực cản và vận tốc giới hạn.",
  objective: "Hiểu lực cản trong chất lưu phụ thuộc vào vận tốc, hình dạng, diện tích cản và độ đặc của môi trường.",
  sgkRef: "Vật lí 10",
  params: [
    { key: "h", label: "Độ cao thả", unit: "m", min: 2, max: 20, step: 0.5, default: 9 },
    { key: "m", label: "Khối lượng mỗi vật", unit: "kg", min: 0.02, max: 0.5, step: 0.01, default: 0.1 },
    { key: "mediumScale", label: "Độ cản của chất lưu", unit: "x", min: 0, max: 3, step: 0.05, default: 1 },
    { key: "areaScale", label: "Diện tích cản", unit: "x", min: 0.4, max: 2.5, step: 0.05, default: 1 },
    { key: "g", label: "Gia tốc trọng trường", unit: "m/s²", min: 1.6, max: 20, step: 0.1, default: 9.8 },
  ],
  applyParams: (p) => {
    const { h, m, g } = derive(p);
    return {
      bodies: SHAPES.map((item) => ({
        id: item.id,
        x: item.x,
        y: h,
        vx: 0,
        vy: 0,
        mass: m,
        radius: 0.22,
        visual: { shape: item.shape, color: item.color, label: item.label },
      })),
      forces: [
        { kind: "gravity", g },
        ...SHAPES.map((item) => ({ kind: "drag" as const, body: item.id, c: dragCoeff(item.coeff, p) })),
      ],
      constraints: [{ kind: "surface", x: 0, y: 0, angle: 0, length: 400, friction: 0.8 }],
    };
  },
  analysis: {
    landmarks: [
      {
        key: "release",
        label: "Lúc thả",
        description: "Ba vật có cùng khối lượng và cùng độ cao, nhưng hình dạng khác nhau nên hệ số cản khác nhau.",
        atTime: () => 0,
        values: (p) => {
          const { h, m, mediumScale, areaScale } = derive(p);
          return [
            { label: "Độ cao h", value: h.toFixed(1), unit: "m" },
            { label: "Khối lượng mỗi vật", value: m.toFixed(2), unit: "kg" },
            { label: "Độ cản chất lưu", value: mediumScale.toFixed(2), unit: "x" },
            { label: "Diện tích cản", value: areaScale.toFixed(2), unit: "x" },
          ];
        },
      },
      {
        key: "drag-coefficients",
        label: "Hệ số cản theo hình dạng",
        description: "Trong mô hình hiện tại, kernel dùng lực cản tuyến tính F_c = -c·v. Vật càng bè thì c càng lớn, nên bị hãm mạnh hơn.",
        values: (p) =>
          SHAPES.map((item) => ({
            label: item.label,
            value: dragCoeff(item.coeff, p).toFixed(3),
            unit: "N·s/m",
          })),
      },
      {
        key: "terminal-speed",
        label: "Vận tốc giới hạn",
        description: "Khi lực cản cân bằng trọng lực, vật tiến tới vận tốc giới hạn vt = mg/c. Hệ số cản càng lớn thì vt càng nhỏ.",
        values: (p) => {
          const { m, g } = derive(p);
          return SHAPES.map((item) => {
            const vt = terminalSpeed(m, dragCoeff(item.coeff, p), g);
            return {
              label: `vt ${item.label}`,
              value: Number.isFinite(vt) ? vt.toFixed(2) : "∞",
              unit: "m/s",
            };
          });
        },
      },
      {
        key: "after-1s",
        label: "Sau 1 giây",
        description: "Vật thuôn rơi nhanh nhất, vật bè rơi chậm nhất vì lực cản lớn hơn ở cùng vận tốc.",
        atTime: () => 1,
        values: (p) => {
          const { m, g } = derive(p);
          return SHAPES.flatMap((item) => {
            const c = dragCoeff(item.coeff, p);
            return [
              { label: `v ${item.label}`, value: downwardSpeed(1, m, c, g).toFixed(2), unit: "m/s" },
              { label: `s ${item.label}`, value: fallDistance(1, m, c, g).toFixed(2), unit: "m" },
            ];
          });
        },
      },
      {
        key: "streamlined-ground",
        label: "Khi vật thuôn chạm đáy",
        description: "Tại thời điểm vật cản nhỏ nhất chạm đáy, các vật cản lớn thường vẫn còn ở cao hơn.",
        atTime: (p) => {
          const { h, m, g } = derive(p);
          return timeToFall(h, m, dragCoeff(SHAPES[0]!.coeff, p), g);
        },
        values: (p) => {
          const { h, m, g } = derive(p);
          const t = timeToFall(h, m, dragCoeff(SHAPES[0]!.coeff, p), g);
          return SHAPES.map((item) => ({
            label: `Độ cao ${item.label}`,
            value: Math.max(0, h - fallDistance(t, m, dragCoeff(item.coeff, p), g)).toFixed(2),
            unit: "m",
          }));
        },
      },
    ],
  },
};