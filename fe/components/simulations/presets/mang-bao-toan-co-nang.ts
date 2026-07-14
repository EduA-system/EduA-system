import type { TrackPoint } from "../kernel/types";
import type { Preset } from "./types";

// Nửa bề rộng máng (m) — hai nhánh đối xứng qua đáy (0, 0).
const SPAN = 3.4;

/**
 * Máng cong đối xứng hình chữ U: thả từ đỉnh trái cao `h` cong xuống đáy (0, 0)
 * rồi cong lên đỉnh phải cao `h`. Mỗi nhánh là parabol y = h·u² (u = khoảng cách
 * ngang chuẩn hoá tới đáy). Vì hai nhánh đối xứng và KHÔNG ma sát, vật lên phía
 * kia đúng bằng độ cao ban đầu rồi quay lại — dao động mãi, minh hoạ cơ năng
 * được bảo toàn.
 */
function makeTrack(h: number): TrackPoint[] {
  const points: TrackPoint[] = [];
  for (let i = 0; i <= 60; i++) {
    const u = 1 - i / 60; // 1 ở đỉnh trái → 0 ở đáy
    points.push({ x: -SPAN * u, y: h * u * u });
  }
  for (let i = 1; i <= 60; i++) {
    const u = i / 60; // 0 ở đáy → 1 ở đỉnh phải
    points.push({ x: SPAN * u, y: h * u * u });
  }
  return points;
}

function values(p: Record<string, number>) {
  const h = p.h ?? 2.5;
  const m = p.m ?? 1;
  const g = p.g ?? 9.8;
  const W = m * g * h; // cơ năng toàn phần (= thế năng ở đỉnh)
  const vBottom = Math.sqrt(Math.max(0, 2 * g * h)); // tốc độ ở đáy
  const WdBottom = 0.5 * m * vBottom * vBottom; // động năng ở đáy = W
  return { h, m, g, W, vBottom, WdBottom };
}

export const mangBaoToanCoNang: Preset = {
  id: "mang-bao-toan-co-nang",
  title: "Máng bảo toàn cơ năng (không ma sát)",
  domain: "Cơ học",
  grade: 10,
  desc: "Viên bi trượt trên máng cong đối xứng không ma sát, lên phía bên kia đúng bằng độ cao ban đầu và dao động mãi.",
  objective:
    "Chứng minh khi bỏ qua ma sát, cơ năng W = Wđ + Wt được bảo toàn: vật lên phía đối diện đúng bằng độ cao ban đầu. Tại đỉnh Wt lớn nhất và Wđ = 0; tại đáy Wđ lớn nhất và Wt = 0; tổng cơ năng luôn không đổi.",
  sgkRef: "Vật lí 10 — Bài 26",
  params: [
    { key: "h", label: "Độ cao thả", unit: "m", min: 0.8, max: 4, step: 0.1, default: 2.5 },
    { key: "m", label: "Khối lượng bi", unit: "kg", min: 0.2, max: 5, step: 0.1, default: 1 },
    { key: "g", label: "Gia tốc trọng trường", unit: "m/s²", min: 1.6, max: 20, step: 0.1, default: 9.8 },
  ],
  applyParams: (p) => {
    const { h, m, g } = values(p);
    const points = makeTrack(h);
    const start = points[0]!;
    return {
      bodies: [
        {
          id: "bi",
          x: start.x,
          y: start.y,
          vx: 0,
          vy: 0,
          mass: m,
          radius: 0.16,
          visual: { shape: "circle", color: "#f472b6", label: "bi" },
        },
      ],
      forces: [{ kind: "gravity", g }],
      // Ma sát KHOÁ CỨNG = 0: đây là điều kiện của bài bảo toàn cơ năng.
      constraints: [{ kind: "curveTrack", body: "bi", points, friction: 0 }],
      // Khung nhìn cố định theo độ cao thả → camera không giật khi kéo slider.
      view: { minX: -SPAN - 0.6, maxX: SPAN + 0.6, minY: 0, maxY: h + 0.6 },
    };
  },
  analysis: {
    landmarks: [
      {
        key: "top",
        label: "Thả từ đỉnh",
        description: "Bi bắt đầu đứng yên ở đỉnh máng: thế năng lớn nhất, động năng bằng 0. Toàn bộ cơ năng ban đầu là thế năng trọng trường.",
        atTime: () => 0,
        values: (p) => {
          const { h, W } = values(p);
          return [
            { label: "Độ cao h", value: h.toFixed(2), unit: "m" },
            { label: "Thế năng Wt = mgh", value: W.toFixed(2), unit: "J" },
            { label: "Động năng Wđ", value: "0", unit: "J" },
            { label: "Tốc độ v", value: "0", unit: "m/s" },
          ];
        },
      },
      {
        key: "bottom",
        label: "Tại đáy máng",
        description: "Chọn đáy làm mốc thế năng (h = 0): thế năng bằng 0, động năng lớn nhất. Vì không ma sát, toàn bộ thế năng đã chuyển thành động năng nên v = √(2gh).",
        values: (p) => {
          const { vBottom, WdBottom } = values(p);
          return [
            { label: "Thế năng Wt", value: "0", unit: "J" },
            { label: "Động năng Wđ = mgh", value: WdBottom.toFixed(2), unit: "J" },
            { label: "Tốc độ v = √(2gh)", value: vBottom.toFixed(2), unit: "m/s" },
          ];
        },
      },
      {
        key: "other-side",
        label: "Lên phía đối diện",
        description: "Không có ma sát nên cơ năng không hao hụt: bi lên nhánh bên kia đúng bằng độ cao ban đầu h, rồi quay lại và dao động mãi. Đây chính là biểu hiện của sự bảo toàn cơ năng.",
        values: (p) => {
          const { h, W } = values(p);
          return [
            { label: "Độ cao đạt được", value: h.toFixed(2), unit: "m" },
            { label: "Cơ năng W = Wđ + Wt", value: W.toFixed(2), unit: "J" },
            { label: "Kết luận", value: "W = const (bảo toàn)", unit: "" },
          ];
        },
      },
    ],
  },
};
