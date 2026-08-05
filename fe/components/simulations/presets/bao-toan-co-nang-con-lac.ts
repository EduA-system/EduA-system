import { firstTimeBodyReachesX } from "../engines/mechanics/sim-time";
import type { Scene, TrackPoint } from "../engines/mechanics/types";
import type { SceneAnnotation } from "../shared/scene-types";
import type { Preset } from "./types";

const G = 9.8;
const TRACK_LEFT = -3.2;
const TRACK_RIGHT = 3.2;
const TRACK_BOTTOM = 0.28;
const TRACK_HEIGHT = 2.25;
const TRACK_WIDTH = TRACK_RIGHT - TRACK_LEFT;
const MARK_A_X = -2.92;
// Hai biên A và B phải đối xứng: bỏ qua ma sát, quả cầu leo lại đúng
// độ cao ban đầu rồi mới đổi chiều.
const MARK_B_X = -MARK_A_X;
const MARK_C_X = 0;

function makeUTrack(): TrackPoint[] {
  // Đường cong cần đủ mịn để phép chiếu vận tốc qua các đoạn ray không làm
  // hao hụt cơ năng số, khiến quả cầu dừng trước biên B.
  const segments = 800;
  return Array.from({ length: segments + 1 }, (_, index) => {
    const t = index / segments;
    // Nửa dưới của cung elip: tiếp tuyến gần như đứng ở hai thành và cong
    // tròn vào phía trong, đúng hình máng U thực nghiệm.
    const theta = Math.PI + Math.PI * t;
    return {
      x: TRACK_LEFT + TRACK_WIDTH * t,
      y: TRACK_BOTTOM + TRACK_HEIGHT * (1 + Math.sin(theta)),
    };
  });
}

function pointAtX(points: TrackPoint[], x: number): TrackPoint {
  for (let i = 1; i < points.length; i += 1) {
    const a = points[i - 1]!;
    const b = points[i]!;
    if (a.x <= x && x <= b.x) {
      const t = (x - a.x) / (b.x - a.x || 1);
      return { x, y: a.y + (b.y - a.y) * t };
    }
  }
  return points[points.length - 1]!;
}

function values(p: Record<string, number>) {
  const m = p.m ?? 0.5;
  const h = pointAtX(makeUTrack(), MARK_A_X).y - TRACK_BOTTOM;
  const totalEnergy = m * (p.g ?? G) * h;
  return { m, g: p.g ?? G, h, totalEnergy };
}

function energyAt(x: number, p: Record<string, number>) {
  const { m, g, totalEnergy } = values(p);
  const y = pointAtX(makeUTrack(), x).y;
  const height = Math.max(0, y - TRACK_BOTTOM);
  const potential = m * g * height;
  const kinetic = Math.max(0, totalEnergy - potential);
  return { y, height, potential, kinetic, speed: Math.sqrt((2 * kinetic) / m) };
}

function marker(x: number, y: number, letter: string, fill: string, textColor: string): SceneAnnotation[] {
  const r = 0.16;
  return [
    {
      kind: "polygon",
      points: Array.from({ length: 16 }, (_, i) => {
        const a = (i / 16) * Math.PI * 2;
        return { x: x + r * Math.cos(a), y: y + r * Math.sin(a) };
      }),
      fill,
      stroke: "#f8fafc",
      strokeWidth: 0.06,
    },
    { kind: "label", x, y, text: letter, color: textColor, fontSize: 12, align: "center", width: 0.32 },
  ];
}

function buildAnnotations(): SceneAnnotation[] {
  const points = makeUTrack();
  const A = pointAtX(points, MARK_A_X);
  const B = pointAtX(points, MARK_B_X);
  const C = pointAtX(points, MARK_C_X);
  return [
    ...marker(A.x, A.y, "A", "#fbbf24", "#78350f"),
    ...marker(B.x, B.y, "B", "#38bdf8", "#082f49"),
    ...marker(C.x, C.y, "C", "#34d399", "#064e3b"),
    { kind: "arrow", x1: -3.47, y1: 0, x2: -3.47, y2: A.y, color: "#fbbf24", arrowAt: 1 },
    { kind: "label", x: -3.68, y: A.y * 0.52, text: "h₁", color: "#fde68a", fontSize: 13 },
    { kind: "label", x: A.x + 0.18, y: A.y + 0.36, text: "Wₜ max · Wđ = 0", color: "#fcd34d", fontSize: 12 },
    { kind: "label", x: B.x - 1.12, y: B.y + 0.34, text: "Wₜ max · Wđ = 0", color: "#7dd3fc", fontSize: 12 },
    { kind: "label", x: C.x - 0.46, y: C.y + 0.36, text: "Wđ max · Wₜ = 0", color: "#6ee7b7", fontSize: 12 },
  ];
}

function buildScene(p: Record<string, number>): Scene {
  const { m, g } = values(p);
  const points = makeUTrack();
  const start = pointAtX(points, MARK_A_X);
  return {
    bodies: [
      {
        id: "ball",
        x: start.x,
        y: start.y,
        vx: 0,
        vy: 0,
        mass: m,
        radius: 0.18,
        visual: { shape: "metalBall", color: "#ef4444", metalTone: "red", label: "" },
      },
      { id: "wall-left", x: -3.28, y: 0, vx: 0, vy: 0, mass: 1, fixed: true, visual: { shape: "wall", color: "#334155", wallHeight: 2.55, label: "" } },
      { id: "wall-right", x: 3.28, y: 0, vx: 0, vy: 0, mass: 1, fixed: true, visual: { shape: "wall", color: "#334155", wallHeight: 2.55, label: "" } },
    ],
    forces: [{ kind: "gravity", g }],
    constraints: [
      { kind: "curveTrack", body: "ball", points, friction: 0, preserveMechanicalEnergy: true },
      { kind: "surface", x: 0, y: 0, angle: 0, length: 500, friction: 0 },
    ],
    view: { minX: -4.2, maxX: 4.2, minY: 0, maxY: 3.5 },
    groundPadding: 70,
  };
}

export const baoToanCoNangConLac: Preset = {
  id: "bao-toan-co-nang-con-lac",
  title: "Bảo toàn cơ năng: máng U",
  domain: "Cơ học",
  grade: 10,
  desc: "Quả cầu trượt trong máng U từ độ cao A xuống đáy C rồi leo lên phía B, quan sát sự chuyển hoá thế năng và động năng.",
  objective: "Tại A thế năng cực đại, tại C động năng cực đại; nếu bỏ qua ma sát thì W = Wđ + Wt không đổi trên toàn máng.",
  sgkRef: "Vật lí 10, Bài 26",
  startPaused: true,
  hideFixedSupportDecoration: true,
  params: [
    { key: "m", label: "Khối lượng quả cầu", unit: "kg", min: 0.1, max: 3, step: 0.1, default: 0.5 },
    { key: "g", label: "Gia tốc trọng trường", unit: "m/s²", min: 1.6, max: 20, step: 0.1, default: 9.8 },
  ],
  applyParams: buildScene,
  annotations: () => buildAnnotations(),
  hideBodyCoordinates: true,
  analysis: {
    landmarks: [
      {
        key: "A",
        label: "Mốc A — Biên trái",
        description: "Quả cầu bắt đầu ở độ cao lớn nhất, đứng yên: toàn bộ cơ năng là thế năng.",
        atTime: () => 0,
        values: (p) => {
          const { totalEnergy, h } = values(p);
          return [
            { label: "Độ cao h₁", value: h.toFixed(2), unit: "m" },
            { label: "Thế năng Wt = mgh", value: totalEnergy.toFixed(2), unit: "J" },
            { label: "Động năng Wđ", value: "0", unit: "J" },
            { label: "Cơ năng W", value: totalEnergy.toFixed(2), unit: "J" },
          ];
        },
      },
      {
        key: "B",
        label: "Mốc B — Biên phải",
        description: "Quả cầu leo lại đúng độ cao ban đầu rồi đổi chiều: thế năng cực đại, động năng bằng 0.",
        atTime: (p) => firstTimeBodyReachesX(buildScene(p), "ball", MARK_B_X - 0.002),
        values: (p) => {
          const e = energyAt(MARK_B_X, p);
          return [
            { label: "Độ cao h", value: e.height.toFixed(2), unit: "m" },
            { label: "Thế năng Wt", value: e.potential.toFixed(2), unit: "J" },
            { label: "Động năng Wđ", value: e.kinetic.toFixed(2), unit: "J" },
            { label: "Tốc độ v", value: e.speed.toFixed(2), unit: "m/s" },
          ];
        },
      },
      {
        key: "C",
        label: "Mốc C — Đáy máng",
        description: "Tại đáy chọn h = 0, thế năng bằng 0 và động năng đạt cực đại.",
        atTime: (p) => firstTimeBodyReachesX(buildScene(p), "ball", MARK_C_X),
        values: (p) => {
          const { totalEnergy } = values(p);
          const e = energyAt(MARK_C_X, p);
          return [
            { label: "Thế năng Wt", value: "0", unit: "J" },
            { label: "Động năng Wđ", value: e.kinetic.toFixed(2), unit: "J" },
            { label: "Tốc độ v lớn nhất", value: e.speed.toFixed(2), unit: "m/s" },
            { label: "Cơ năng W", value: totalEnergy.toFixed(2), unit: "J" },
          ];
        },
      },
      {
        key: "conservation",
        label: "Bảo toàn cơ năng",
        description: "Không có ma sát nên cơ năng không đổi: phần giảm của thế năng chuyển đúng thành động năng.",
        values: (p) => {
          const { totalEnergy } = values(p);
          return [
            { label: "W = Wđ + Wt", value: totalEnergy.toFixed(2), unit: "J" },
            { label: "Kết luận", value: "W = const", unit: "" },
          ];
        },
      },
    ],
  },
};
