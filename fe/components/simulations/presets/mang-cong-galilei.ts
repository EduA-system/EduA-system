import { firstTimeBodyReachesX } from "../engines/mechanics/sim-time";
import type { Scene, TrackPoint } from "../engines/mechanics/types";
import type { SceneAnnotation } from "../shared/scene-types";
import type { Preset } from "./types";

const LEFT_X = -6;
const VALLEY_X = -1;
const MIDDLE_FLAT_END_X = 0;
const STEEP_RIGHT_X = 4;
const SHALLOW_RIGHT_X = 7;
const HORIZONTAL_END_X = 30;
const ROW_BASES = [6, 3, 0] as const;
const FIXED_G = 9.8;

function trackForCase(caseIndex: 0 | 1 | 2, height: number): TrackPoint[] {
  const base = ROW_BASES[caseIndex];
  if (caseIndex === 0) {
    return [
      { x: LEFT_X, y: base + height },
      { x: VALLEY_X, y: base },
      { x: STEEP_RIGHT_X, y: base + height },
    ];
  }
  if (caseIndex === 1) {
    return [
      { x: LEFT_X, y: base + height },
      { x: VALLEY_X, y: base },
      { x: MIDDLE_FLAT_END_X, y: base },
      { x: SHALLOW_RIGHT_X, y: base + height },
    ];
  }
  return [
    { x: LEFT_X, y: base + height },
    { x: VALLEY_X, y: base },
    { x: HORIZONTAL_END_X, y: base },
  ];
}

function buildScene(params: Record<string, number>): Scene {
  const height = params.h ?? 1.45;
  const tracks = ([0, 1, 2] as const).map((caseIndex) => trackForCase(caseIndex, height));
  return {
    bodies: tracks.map((track, caseIndex) => ({
      id: `ball-${caseIndex + 1}`,
      x: track[0]!.x,
      y: track[0]!.y,
      vx: 0,
      vy: 0,
      mass: 1,
      radius: 0.14,
      visual: {
        shape: "metalBall" as const,
        color: "#ef4444",
        metalTone: "red" as const,
        label: "",
      },
    })),
    forces: [{ kind: "gravity", g: FIXED_G }],
    constraints: tracks.map((points, caseIndex) => ({
      kind: "curveTrack" as const,
      body: `ball-${caseIndex + 1}`,
      points,
      friction: 0,
      preserveMechanicalEnergy: true,
    })),
    view: { minX: -7.35, maxX: 8.45, minY: 0, maxY: 8.45 },
    groundPadding: 54,
  };
}

function heightGuide(base: number, height: number): SceneAnnotation[] {
  const top = base + height;
  return [
    { kind: "arrow", x1: -6.38, y1: base, x2: -6.38, y2: top, color: "#cbd5e1", arrowAt: 1 },
    { kind: "arrow", x1: -6.38, y1: top, x2: -6.38, y2: base, color: "#cbd5e1", arrowAt: 1 },
    { kind: "label", x: -6.72, y: base + height * 0.5, text: "h", color: "#f8fafc", fontSize: 13 },
  ];
}

function buildAnnotations(params: Record<string, number>): SceneAnnotation[] {
  const height = params.h ?? 1.45;
  const [topBase, middleBase, bottomBase] = ROW_BASES;
  return [
    // Trường hợp 1: hai mặt dốc đối xứng.
    {
      kind: "polygon",
      points: [
        { x: LEFT_X, y: topBase },
        { x: LEFT_X, y: topBase + height },
        { x: VALLEY_X, y: topBase },
      ],
      fill: "#334155",
      stroke: "#94a3b8",
      strokeWidth: 1.4,
    },
    {
      kind: "polygon",
      points: [
        { x: VALLEY_X, y: topBase },
        { x: STEEP_RIGHT_X, y: topBase + height },
        { x: STEEP_RIGHT_X, y: topBase },
      ],
      fill: "#334155",
      stroke: "#94a3b8",
      strokeWidth: 1.4,
    },
    ...heightGuide(topBase, height),
    { kind: "label", x: -5.68, y: topBase + height + 0.28, text: "1 · DỐC – DỐC", color: "#7dd3fc", fontSize: 12 },
    { kind: "label", x: STEEP_RIGHT_X - 1.08, y: topBase + height + 0.2, text: "đạt lại h", color: "#6ee7b7", fontSize: 11 },

    // Trường hợp 2: nhánh phải thoải, cùng độ cao nhưng quãng đường dài hơn.
    {
      kind: "polygon",
      points: [
        { x: LEFT_X, y: middleBase },
        { x: LEFT_X, y: middleBase + height },
        { x: VALLEY_X, y: middleBase },
      ],
      fill: "#334155",
      stroke: "#94a3b8",
      strokeWidth: 1.4,
    },
    {
      kind: "polygon",
      points: [
        { x: MIDDLE_FLAT_END_X, y: middleBase },
        { x: SHALLOW_RIGHT_X, y: middleBase + height },
        { x: SHALLOW_RIGHT_X, y: middleBase },
      ],
      fill: "#334155",
      stroke: "#94a3b8",
      strokeWidth: 1.4,
    },
    ...heightGuide(middleBase, height),
    { kind: "label", x: -5.68, y: middleBase + height + 0.28, text: "2 · DỐC – THOẢI", color: "#fbbf24", fontSize: 12 },
    { kind: "label", x: SHALLOW_RIGHT_X - 1.18, y: middleBase + height + 0.2, text: "xa hơn · vẫn h", color: "#fde68a", fontSize: 11 },

    // Trường hợp 3: nhánh phải nằm ngang, vật chuyển động thẳng đều.
    {
      kind: "polygon",
      points: [
        { x: LEFT_X, y: bottomBase },
        { x: LEFT_X, y: bottomBase + height },
        { x: VALLEY_X, y: bottomBase },
      ],
      fill: "#334155",
      stroke: "#94a3b8",
      strokeWidth: 1.4,
    },
    ...heightGuide(bottomBase, height),
    { kind: "label", x: -5.68, y: bottomBase + height + 0.28, text: "3 · DỐC – NGANG", color: "#c084fc", fontSize: 12 },
    { kind: "arrow", x1: 1.2, y1: bottomBase + 0.3, x2: 3.1, y2: bottomBase + 0.3, color: "#a78bfa", animated: true },
    { kind: "label", x: 3.28, y: bottomBase + 0.3, text: "v = const", color: "#ddd6fe", fontSize: 12 },
    { kind: "velocity", body: "ball-1", scale: 0.14, maxLength: 0.78, offsetY: 0.22, color: "#38bdf8", label: "v₁" },
    { kind: "velocity", body: "ball-2", scale: 0.14, maxLength: 0.78, offsetY: 0.22, color: "#fbbf24", label: "v₂" },
    { kind: "velocity", body: "ball-3", scale: 0.14, maxLength: 0.78, offsetY: 0.22, color: "#c084fc", label: "v₃" },
  ];
}

function bottomSpeed(height: number, g: number): number {
  return Math.sqrt(2 * g * height);
}

export const mangCongGalilei: Preset = {
  id: "mang-cong-galilei",
  title: "Máng nghiêng Galilei — Ba trường hợp",
  domain: "Cơ học",
  grade: 10,
  desc: "So sánh ba máng dốc–dốc, dốc–thoải và dốc–ngang để quan sát bảo toàn cơ năng và quán tính.",
  objective: "Từ cùng độ cao h, viên bi luôn cần đạt lại độ cao ban đầu; khi nhánh phải nằm ngang và không có ma sát, bi tiếp tục chuyển động thẳng đều.",
  sgkRef: "Vật lí 10 - Cơ năng và quán tính",
  startPaused: true,
  params: [
    { key: "h", label: "Độ cao ban đầu h", unit: "m", min: 0.8, max: 1.8, step: 0.05, default: 1.45 },
  ],
  quickPresets: [
    { label: "Độ cao thấp", params: { h: 0.9 } },
    { label: "Độ cao lớn", params: { h: 1.75 } },
  ],
  applyParams: buildScene,
  annotations: buildAnnotations,
  minimalOverlay: true,
  hideBodyCoordinates: true,
  hideFixedSupportDecoration: true,
  analysis: {
    landmarks: [
      {
        key: "release",
        label: "Thả đồng thời từ độ cao h",
        description: "Ba viên bi bắt đầu đứng yên ở cùng độ cao nên có cùng cơ năng ban đầu W = mgh.",
        atTime: () => 0,
        values: (p) => [
          { label: "Độ cao h", value: (p.h ?? 1.45).toFixed(2), unit: "m" },
          { label: "Vận tốc ban đầu", value: "0", unit: "m/s" },
          { label: "Điều kiện", value: "Không ma sát", unit: "" },
        ],
      },
      {
        key: "valley",
        label: "Qua đáy máng",
        description: "Thế năng chuyển thành động năng; cả ba viên bi có cùng tốc độ cực đại tại đáy.",
        atTime: (p) => firstTimeBodyReachesX(buildScene(p), "ball-1", VALLEY_X),
        values: (p) => [
          { label: "Tốc độ cực đại", value: bottomSpeed(p.h ?? 1.45, FIXED_G).toFixed(2), unit: "m/s" },
          { label: "Thế năng tại đáy", value: "0", unit: "J" },
        ],
      },
      {
        key: "same-height",
        label: "Hai nhánh bên phải đạt lại h",
        description: "Nhánh thoải không làm đổi độ cao cực đại; nó chỉ khiến viên bi phải đi xa hơn mới đạt lại h.",
        atTime: (p) => firstTimeBodyReachesX(buildScene(p), "ball-2", SHALLOW_RIGHT_X - 0.01),
        values: () => [
          { label: "Trường hợp 1", value: "Lên gần h", unit: "" },
          { label: "Trường hợp 2", value: "Đi xa hơn rồi lên h", unit: "" },
        ],
      },
      {
        key: "inertia",
        label: "Nhánh phải nằm ngang",
        description: "Không còn độ cao để đổi động năng thành thế năng; vì không ma sát, viên bi giữ nguyên vận tốc và chuyển động thẳng đều.",
        atTime: (p) => firstTimeBodyReachesX(buildScene(p), "ball-3", 3.2),
        values: (p) => [
          { label: "Vận tốc trên đoạn ngang", value: bottomSpeed(p.h ?? 1.45, FIXED_G).toFixed(2), unit: "m/s" },
          { label: "Gia tốc tiếp tuyến", value: "0", unit: "m/s²" },
          { label: "Kết luận", value: "Chuyển động thẳng đều", unit: "" },
        ],
      },
    ],
  },
};
