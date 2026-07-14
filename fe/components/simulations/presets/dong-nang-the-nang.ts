import type { TrackPoint } from "../kernel/types";
import type { Preset } from "./types";

// Bề rộng nhánh dốc (m) và đoạn chạy ngang sau đáy (m).
const DROP_SPAN = 3.4;
const RUNOUT = 3.4;

/**
 * Ray kiểu tàu lượn CHẠY MỘT LẦN: thả từ đỉnh trái cao `h`, cong xuống đáy
 * (0, 0) theo parabol y = h·u², rồi CHẠY NGANG (y = 0) sang phải tới hết máng.
 * Không có nhánh dốc lên bên kia nên xe không lăn qua lăn lại — chỉ đổ dốc một
 * lần rồi coasting trên đoạn ngang (dừng dần nếu có ma sát).
 */
function makeTrack(h: number): TrackPoint[] {
  const points: TrackPoint[] = [];
  // Nhánh dốc: từ đỉnh (−DROP_SPAN, h) xuống đáy (0, 0).
  for (let i = 0; i <= 60; i++) {
    const u = 1 - i / 60; // 1 ở đỉnh → 0 ở đáy
    points.push({ x: -DROP_SPAN * u, y: h * u * u });
  }
  // Đoạn chạy ngang: từ đáy (0, 0) sang phải tới (RUNOUT, 0).
  for (let i = 1; i <= 40; i++) {
    points.push({ x: RUNOUT * (i / 40), y: 0 });
  }
  return points;
}

function values(p: Record<string, number>) {
  const h = p.h ?? 2.5;
  const m = p.m ?? 1;
  const friction = p.friction ?? 0;
  const g = p.g ?? 9.8;
  const Wt = m * g * h; // thế năng tại đỉnh (cũng là cơ năng ban đầu)
  const vBottom = Math.sqrt(Math.max(0, 2 * g * h)); // tốc độ ở đáy (lí tưởng)
  const WdBottom = 0.5 * m * vBottom * vBottom; // động năng ở đáy = Wt đỉnh (nếu friction=0)
  return { h, m, friction, g, Wt, vBottom, WdBottom };
}

export const dongNangTheNang: Preset = {
  id: "dong-nang-the-nang",
  title: "Tàu lượn — chuyển hoá động năng / thế năng",
  domain: "Cơ học",
  grade: 10,
  desc: "Viên bi lăn trên máng cong hình chữ U, khảo sát sự chuyển hoá qua lại giữa động năng và thế năng.",
  objective:
    "Hiểu Wđ = ½mv² và Wt = mgh chuyển hoá qua lại khi vật chuyển động: tại đỉnh Wt lớn nhất còn Wđ = 0, tại đáy Wđ lớn nhất còn Wt = 0. Khi bỏ qua ma sát, cơ năng W = Wđ + Wt được bảo toàn; có ma sát thì cơ năng giảm dần do hao phí.",
  sgkRef: "Vật lí 10 — Bài 25",
  params: [
    { key: "h", label: "Độ cao thả", unit: "m", min: 0.8, max: 4, step: 0.1, default: 2.5 },
    { key: "m", label: "Khối lượng bi", unit: "kg", min: 0.2, max: 5, step: 0.1, default: 1 },
    { key: "friction", label: "Ma sát ray", unit: "", min: 0, max: 0.3, step: 0.01, default: 0 },
    { key: "g", label: "Gia tốc trọng trường", unit: "m/s²", min: 1.6, max: 20, step: 0.1, default: 9.8 },
  ],
  applyParams: (p) => {
    const { h, m, friction, g } = values(p);
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
          radius: 0.2,
          visual: { shape: "box", color: "#f472b6", label: "xe" },
        },
      ],
      forces: [{ kind: "gravity", g }],
      constraints: [{ kind: "curveTrack", body: "bi", points, friction }],
      // Khung nhìn cố định theo độ cao thả → camera không giật khi kéo slider.
      view: { minX: -DROP_SPAN - 0.6, maxX: RUNOUT + 0.6, minY: 0, maxY: h + 0.6 },
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
          const { h, Wt } = values(p);
          return [
            { label: "Độ cao h", value: h.toFixed(2), unit: "m" },
            { label: "Thế năng Wt = mgh", value: Wt.toFixed(2), unit: "J" },
            { label: "Động năng Wđ", value: "0", unit: "J" },
            { label: "Tốc độ v", value: "0", unit: "m/s" },
          ];
        },
      },
      {
        key: "bottom",
        label: "Xuống tới chân dốc",
        description: "Chọn đoạn ngang làm mốc thế năng (h = 0): thế năng bằng 0, động năng lớn nhất. Nếu bỏ qua ma sát, toàn bộ thế năng đã chuyển thành động năng nên v = √(2gh); sau đó xe chạy đều trên đoạn ngang.",
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
        key: "conservation",
        label: "Bảo toàn cơ năng",
        description: "Khi ma sát = 0, cơ năng W = Wđ + Wt không đổi tại mọi vị trí (bằng mgh ở đỉnh) — xuống tới chân dốc thế năng đã chuyển hết thành động năng, rồi xe chạy đều mãi trên đoạn ngang. Khi có ma sát, cơ năng giảm dần nên xe chạy chậm lại rồi dừng.",
        values: (p) => {
          const { Wt, friction } = values(p);
          return [
            { label: "Cơ năng W = mgh", value: Wt.toFixed(2), unit: "J" },
            { label: "Ma sát ray", value: friction.toFixed(2), unit: "" },
            {
              label: "Kết luận",
              value: friction === 0 ? "Cơ năng bảo toàn (W = const)" : "Cơ năng giảm dần do hao phí",
              unit: "",
            },
          ];
        },
      },
    ],
  },
};
