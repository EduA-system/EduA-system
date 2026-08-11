import { firstTimeBodyReachesX } from "../engines/mechanics/sim-time";
import type { Scene, TrackPoint } from "../engines/mechanics/types";
import type { SceneAnnotation } from "../shared/scene-types";
import type { Preset } from "./types";

// ── Đường ray tàu lượn ───────────────────────────────────────────────────────
// Track giống sơ đồ SGK: đoạn ngang trái (mốc thế năng 0) → dốc lên đỉnh lớn A
// → dốc xuống đáy C (trũng rộng) → dốc lên đỉnh nhỏ E → dốc xuống đoạn ngang phải.
// Mỗi nhánh dùng y = H·sin²(θ) với θ 0→π: đạo hàm = 0 ở ĐẦU và CUỐI nhánh nên
// đường ray TRÒN TRỊA, mượt như sóng sin — không gồ ghề, không nhọn.
const G = 9.8; // gia tốc trọng trường cố định
const H_TOP = 2.5; // độ cao đỉnh lớn A
const H_PEAK = 1.5; // độ cao đỉnh nhỏ E
const SPAN_LEFT = -7.5;
const SPAN_RIGHT = 7.5;

// ── Toạ độ ngang các điểm đặc biệt trên track ────────────────────────────────
const X_END_FLAT_LEFT = SPAN_LEFT + 1.6; // hết đoạn ngang trái, bắt đầu dốc lên A
const X_TOP_A = -2.9; // đỉnh lớn A
// Đáy C gồm một đoạn NGANG THẲNG DÀI (mốc Wđ max) giữa hai dốc: tàu chạy thẳng
// một đoạn trước khi leo dốc thứ 2.
const X_BOTTOM_START = -1.5; // hết dốc xuống, vào đoạn ngang đáy
const X_BOTTOM_END = 1.5; // hết đoạn ngang đáy, bắt đầu dốc lên E
const X_TOP_E = 2.9; // đỉnh nhỏ E
const X_END_FLAT_RIGHT = SPAN_RIGHT - 1.6; // bắt đầu đoạn ngang phải

/** Dựng một nhánh sin²: y đi từ 0→H (θ 0→π/2) hoặc H→0 (θ π/2→π). */
function sinBranch(
  xFrom: number,
  xTo: number,
  thetaFrom: number,
  thetaTo: number,
  height: number,
  samples: number,
): TrackPoint[] {
  const out: TrackPoint[] = [];
  for (let i = 0; i <= samples; i++) {
    const t = i / samples;
    const x = xFrom + (xTo - xFrom) * t;
    const theta = thetaFrom + (thetaTo - thetaFrom) * t;
    out.push({ x, y: height * Math.sin(theta) * Math.sin(theta) });
  }
  return out;
}

function makeTrack(): TrackPoint[] {
  const points: TrackPoint[] = [];
  // Đoạn ngang trái.
  for (let i = 0; i <= 20; i++) {
    points.push({
      x: SPAN_LEFT + ((X_END_FLAT_LEFT - SPAN_LEFT) * i) / 20,
      y: 0,
    });
  }
  // Dốc lên đỉnh A: θ 0 → π/2.
  points.push(
    ...sinBranch(X_END_FLAT_LEFT, X_TOP_A, 0, Math.PI / 2, H_TOP, 48).slice(1),
  );
  // Dốc xuống: θ π/2 → π, dừng tại X_BOTTOM_START (đầu đoạn ngang đáy).
  points.push(
    ...sinBranch(X_TOP_A, X_BOTTOM_START, Math.PI / 2, Math.PI, H_TOP, 64).slice(1),
  );
  // Đoạn NGANG THẲNG DÀI ở đáy (Wđ max) — tàu chạy thẳng trước khi leo dốc 2.
  for (let i = 1; i <= 40; i++) {
    points.push({
      x: X_BOTTOM_START + ((X_BOTTOM_END - X_BOTTOM_START) * i) / 40,
      y: 0,
    });
  }
  // Dốc lên đỉnh nhỏ E: θ 0 → π/2, bắt đầu từ X_BOTTOM_END.
  points.push(
    ...sinBranch(X_BOTTOM_END, X_TOP_E, 0, Math.PI / 2, H_PEAK, 48).slice(1),
  );
  // Dốc xuống đoạn ngang phải: θ π/2 → π.
  points.push(
    ...sinBranch(X_TOP_E, X_END_FLAT_RIGHT, Math.PI / 2, Math.PI, H_PEAK, 48).slice(
      1,
    ),
  );
  // Đoạn ngang phải.
  for (let i = 1; i <= 20; i++) {
    points.push({
      x: X_END_FLAT_RIGHT + ((SPAN_RIGHT - X_END_FLAT_RIGHT) * i) / 20,
      y: 0,
    });
  }
  return points;
}

/** Nội suy điểm trên track theo hoành độ x. */
function pointAt(points: TrackPoint[], x: number): TrackPoint {
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]!;
    const b = points[i]!;
    if (a.x <= x && x <= b.x) {
      const t = (x - a.x) / (b.x - a.x || 1);
      return { x, y: a.y + (b.y - a.y) * t };
    }
  }
  const last = points[points.length - 1]!;
  return { x, y: last.y };
}

/** Cơ năng ban đầu W = ½mv² (thả từ đoạn ngang trái, Wt = 0). */
function initialEnergy(m: number, v: number): number {
  return 0.5 * m * v * v;
}

/** Tốc độ tại độ cao y theo bảo toàn cơ năng: v² = v₀² − 2g·y. */
function speedAt(y: number, m: number, v: number): number {
  const w = initialEnergy(m, v) - m * G * y;
  return Math.sqrt(Math.max(0, (2 * w) / m));
}

function values(p: Record<string, number>) {
  const m = p.m ?? 1;
  // v₀ mặc định = 7.2 m/s: tàu lên tới gần đỉnh A, chậm dần gần như dừng (v → 0)
  // ở vùng đỉnh, một nhịp rồi mới trượt xuống.
  const v = p.v ?? 7.2;
  const W0 = initialEnergy(m, v);
  return { m, v, W0 };
}

/** Vẽ một chấm tròn đánh dấu mốc tại (x, y) trong world-units. */
function markDot(x: number, y: number, color: string): SceneAnnotation {
  // Chấm TO + viền trắng dày để đè lên vệt quỹ đạo đỏ của tàu, dễ nhìn.
  const r = 0.23;
  const points = Array.from({ length: 16 }, (_, i) => {
    const a = (i / 16) * 2 * Math.PI;
    return { x: x + r * Math.cos(a), y: y + r * Math.sin(a) };
  });
  return {
    kind: "polygon",
    points,
    fill: color,
    stroke: "#f8fafc",
    strokeWidth: 0.1,
    opacity: 1,
  };
}

/** Dựng các chú thích tĩnh (mốc, nhãn năng lượng). */
function buildAnnotations(): SceneAnnotation[] {
  const points = makeTrack();

  // ── Các mốc ────────────────────────────────────────────────────────────────
  const S = pointAt(points, -6.6); // đoạn ngang trái — Wt = 0 (điểm thả)
  const A = pointAt(points, X_TOP_A); // đỉnh lớn — Wt max
  const B = pointAt(points, X_TOP_A / 2); // dốc xuống — Wt → Wđ
  const C = pointAt(points, (X_BOTTOM_START + X_BOTTOM_END) / 2); // giữa đoạn ngang đáy — Wđ max
  const D = pointAt(points, X_TOP_E / 2); // dốc lên — Wđ → Wt
  const E = pointAt(points, X_TOP_E); // đỉnh nhỏ — Wt lớn

  // Nhãn năng lượng tại mốc — KHÔNG ô nền đen, chỉ chữ sáng đặt phía trên mốc
  // (tránh đè chữ cái mốc A–E nằm bên phải chấm).
  const energyBadge = (
    x: number,
    y: number,
    text: string,
    color: string,
    offsetX: number,
    offsetY: number,
  ): SceneAnnotation[] => [
    {
      kind: "label",
      x: x + offsetX,
      y: y + offsetY,
      text,
      color,
      fontSize: 13,
      fontStyle: "bold",
    },
  ];

  return [
    // Chấm đánh dấu mốc.
    markDot(S.x, S.y, "#94a3b8"),
    markDot(A.x, A.y, "#fbbf24"),
    markDot(B.x, B.y, "#38bdf8"),
    markDot(C.x, C.y, "#34d399"),
    markDot(D.x, D.y, "#38bdf8"),
    markDot(E.x, E.y, "#fbbf24"),
    // Chữ mốc đặt giữa chấm tròn: tiết kiệm diện tích và không va vào ghi chú.
    { kind: "label", x: S.x, y: S.y, text: "S", color: "#f8fafc", fontSize: 13, fontStyle: "bold", align: "center", width: 0.52 },
    { kind: "label", x: A.x, y: A.y, text: "A", color: "#78350f", fontSize: 13, fontStyle: "bold", align: "center", width: 0.52 },
    { kind: "label", x: B.x, y: B.y, text: "B", color: "#082f49", fontSize: 13, fontStyle: "bold", align: "center", width: 0.52 },
    { kind: "label", x: C.x, y: C.y, text: "C", color: "#064e3b", fontSize: 13, fontStyle: "bold", align: "center", width: 0.52 },
    { kind: "label", x: D.x, y: D.y, text: "D", color: "#082f49", fontSize: 13, fontStyle: "bold", align: "center", width: 0.52 },
    { kind: "label", x: E.x, y: E.y, text: "E", color: "#78350f", fontSize: 13, fontStyle: "bold", align: "center", width: 0.52 },
    // Nhãn năng lượng tại các mốc chính.
    ...energyBadge(S.x, S.y, "Wt = 0", "#cbd5e1", -0.7, 0.65),
    ...energyBadge(A.x, A.y, "Wt max", "#fbbf24", -0.65, 0.72),
    ...energyBadge(C.x, C.y, "Wđ max", "#34d399", -0.15, 0.62),
    ...energyBadge(E.x, E.y, "Wt lớn", "#fbbf24", -0.65, 0.7),
    // Nhãn chuyển hoá ở dốc xuống / dốc lên — KHÔNG ô đen, chữ sát mốc B/D.
    {
      kind: "label",
      x: B.x - 0.2,
      y: B.y + 0.72,
      text: "Wt > Wđ",
      color: "#7dd3fc",
      fontSize: 13,
      fontStyle: "bold",
    },
    {
      kind: "label",
      x: D.x - 0.2,
      y: D.y + 0.72,
      text: "Wđ > Wt",
      color: "#6ee7b7",
      fontSize: 13,
      fontStyle: "bold",
    },
    // Ghi chú bảo toàn cơ năng dưới đáy.
    {
      kind: "label",
      x: C.x - 0.9,
      y: C.y + 1.25,
      text: "W = Wđ + Wt = const",
      color: "#a5f3fc",
      fontSize: 13,
      fontStyle: "bold",
    },
  ];
}

function buildScene(p: Record<string, number>): Scene {
  const { m, v } = values(p);
  const points = makeTrack();
  const start = pointAt(points, -6.6);

  return {
    bodies: [
      {
        id: "train",
        x: start.x,
        y: start.y,
        vx: v,
        vy: 0,
        mass: m,
        radius: 0.36,
        visual: { shape: "coaster", color: "#f43f5e", label: "m" },
      },
    ],
    forces: [{ kind: "gravity", g: G }],
    constraints: [
      { kind: "curveTrack", body: "train", points, friction: 0, appearance: "rollerCoaster" },
    ],
    // Khung nhìn cố định bao trọn track + vùng nhãn phía trên.
    view: {
      minX: SPAN_LEFT - 1.2,
      maxX: SPAN_RIGHT + 1.2,
      minY: -1.2,
      maxY: H_TOP + 1.7,
    },
    groundPadding: 40,
  };
}

export const dongNangTheNang: Preset = {
  id: "dong-nang-the-nang",
  title: "Tàu lượn: chuyển hoá động năng / thế năng",
  domain: "Cơ học",
  grade: 10,
  desc: "Tàu lượn phóng từ đoạn ngang lên đỉnh lớn, lao xuống đáy rồi lên đỉnh nhỏ — theo dõi sự chuyển hoá liên tục giữa thế năng và động năng tại từng mốc.",
  objective:
    "Quan sát Wđ = ½mv² và Wt = mgh chuyển hoá qua lại: tại đỉnh Wt lớn nhất (v = 0), tại đáy Wđ lớn nhất (Wt = 0). Bỏ qua ma sát nên cơ năng W = Wđ + Wt được bảo toàn.",
  sgkRef: "Vật lí 10, Bài 25",
  startPaused: true,
  params: [
    // v₀ = 7.2 m/s: tàu lên gần đỉnh A, chậm dần gần như dừng ở đỉnh rồi trượt
    // xuống (ngưỡng √(2gh) ≈ 7.0 + bù hao phí số).
    { key: "v", label: "Vận tốc ban đầu v₀", unit: "m/s", min: 5, max: 8, step: 0.1, default: 7.2 },
  ],
  applyParams: buildScene,
  annotations: () => buildAnnotations(),
  bodyTrails: {
    train: { color: "#f43f5e", width: 3.5, dash: [2, 6] },
  },
  bodyLabels: { train: "m" },
  analysis: {
    landmarks: [
      {
        key: "start",
        label: "Mốc S — Đoạn ngang trái",
        description: "Tàu xuất phát trên đoạn ngang với vận tốc v₀: thế năng bằng 0 (chọn mốc), toàn bộ cơ năng là động năng Wđ = ½mv₀².",
        atTime: () => 0,
        values: (p) => {
          const { v, W0 } = values(p);
          return [
            { label: "Vận tốc v₀", value: v.toFixed(2), unit: "m/s" },
            { label: "Thế năng Wt", value: "0", unit: "J" },
            { label: "Động năng Wđ = ½mv₀²", value: W0.toFixed(2), unit: "J" },
          ];
        },
      },
      {
        key: "peakA",
        label: "Mốc A — Đỉnh lớn",
        description: "Tại đỉnh cao nhất, thế năng cực đại Wt = mgh; vận tốc giảm còn tối thiểu. Nếu v₀ = √(2gh) thì tàu dừng hẳn ở đỉnh.",
        atTime: (p) => firstTimeBodyReachesX(buildScene(p), "train", X_TOP_A),
        values: (p) => {
          const { m, v } = values(p);
          const y = H_TOP;
          const Wt = m * G * y;
          const vAt = speedAt(y, m, v);
          const Wd = 0.5 * m * vAt * vAt;
          return [
            { label: "Độ cao y", value: y.toFixed(2), unit: "m" },
            { label: "Thế năng Wt = mgh", value: Wt.toFixed(2), unit: "J" },
            { label: "Động năng Wđ", value: Wd.toFixed(2), unit: "J" },
            { label: "Tốc độ v", value: vAt.toFixed(2), unit: "m/s" },
          ];
        },
      },
      {
        key: "descent",
        label: "Mốc B — Dốc xuống",
        description: "Tàu trượt xuống: độ cao giảm nên Wt giảm, vận tốc tăng nên Wđ tăng — thế năng đang chuyển thành động năng.",
        atTime: (p) => firstTimeBodyReachesX(buildScene(p), "train", X_TOP_A / 2),
        values: (p) => {
          const { m, v } = values(p);
          const y = pointAt(makeTrack(), X_TOP_A / 2).y;
          const Wt = m * G * y;
          const vAt = speedAt(y, m, v);
          const Wd = 0.5 * m * vAt * vAt;
          return [
            { label: "Độ cao y", value: y.toFixed(2), unit: "m" },
            { label: "Thế năng Wt = mgy", value: Wt.toFixed(2), unit: "J" },
            { label: "Động năng Wđ", value: Wd.toFixed(2), unit: "J" },
            { label: "Tốc độ v", value: vAt.toFixed(2), unit: "m/s" },
          ];
        },
      },
      {
        key: "bottom",
        label: "Mốc C — Đáy",
        description: "Tại đáy (h = 0): thế năng triệt tiêu, động năng cực đại. Vận tốc lớn nhất v = √(v₀² + 2g·Δh) với Δh là độ chênh từ đỉnh A.",
        atTime: (p) => firstTimeBodyReachesX(buildScene(p), "train", 0),
        values: (p) => {
          const { m, v } = values(p);
          const vAt = speedAt(0, m, v);
          const Wd = 0.5 * m * vAt * vAt;
          return [
            { label: "Thế năng Wt", value: "0", unit: "J" },
            { label: "Động năng Wđ", value: Wd.toFixed(2), unit: "J" },
            { label: "Tốc độ v", value: vAt.toFixed(2), unit: "m/s" },
          ];
        },
      },
      {
        key: "ascent",
        label: "Mốc D — Dốc lên",
        description: "Tàu trượt lên: vận tốc giảm nên Wđ giảm, độ cao tăng nên Wt tăng — động năng đang chuyển thành thế năng.",
        atTime: (p) => firstTimeBodyReachesX(buildScene(p), "train", X_TOP_E / 2),
        values: (p) => {
          const { m, v } = values(p);
          const y = pointAt(makeTrack(), X_TOP_E / 2).y;
          const Wt = m * G * y;
          const vAt = speedAt(y, m, v);
          const Wd = 0.5 * m * vAt * vAt;
          return [
            { label: "Độ cao y", value: y.toFixed(2), unit: "m" },
            { label: "Thế năng Wt = mgy", value: Wt.toFixed(2), unit: "J" },
            { label: "Động năng Wđ", value: Wd.toFixed(2), unit: "J" },
            { label: "Tốc độ v", value: vAt.toFixed(2), unit: "m/s" },
          ];
        },
      },
      {
        key: "peakE",
        label: "Mốc E — Đỉnh nhỏ",
        description: "Tàu lên đỉnh nhỏ (thấp hơn đỉnh lớn): thế năng tăng lại nhưng chưa bằng lúc ở A, vận tốc vẫn còn. Sau đó đổ xuống đoạn ngang phải.",
        atTime: (p) => firstTimeBodyReachesX(buildScene(p), "train", X_TOP_E),
        values: (p) => {
          const { m, v } = values(p);
          const y = H_PEAK;
          const Wt = m * G * y;
          const vAt = speedAt(y, m, v);
          const Wd = 0.5 * m * vAt * vAt;
          return [
            { label: "Độ cao y", value: y.toFixed(2), unit: "m" },
            { label: "Thế năng Wt = mgh", value: Wt.toFixed(2), unit: "J" },
            { label: "Động năng Wđ", value: Wd.toFixed(2), unit: "J" },
            { label: "Tốc độ v", value: vAt.toFixed(2), unit: "m/s" },
          ];
        },
      },
      {
        key: "conservation",
        label: "Bảo toàn cơ năng",
        description: "Vì bỏ qua ma sát, cơ năng W = Wđ + Wt không đổi tại mọi mốc (bằng ½mv₀²). Tàu lên tới đúng độ cao ứng với v₀, dừng lại rồi trượt xuống.",
        values: (p) => {
          const { W0 } = values(p);
          return [
            { label: "Cơ năng W = ½mv₀²", value: W0.toFixed(2), unit: "J" },
            {
              label: "Kết luận",
              value: "Cơ năng bảo toàn (W = const)",
              unit: "",
            },
          ];
        },
      },
    ],
  },
};
