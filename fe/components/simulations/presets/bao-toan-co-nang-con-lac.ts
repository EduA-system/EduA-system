import type { Preset } from "./types";

function values(p: Record<string, number>) {
  const L = p.L ?? 1.2;
  const angleDeg = p.angle ?? 40;
  const m = p.m ?? 0.5;
  const g = p.g ?? 9.8;
  const th = (angleDeg * Math.PI) / 180;
  const hMax = L * (1 - Math.cos(th)); // độ cao của bob so với điểm thấp nhất
  const WtMax = m * g * hMax; // thế năng ở biên (cũng là cơ năng toàn phần)
  const vBottom = Math.sqrt(Math.max(0, 2 * g * hMax)); // tốc độ ở vị trí thấp nhất
  const WdBottom = 0.5 * m * vBottom * vBottom; // động năng ở đáy = Wt biên
  const T = 2 * Math.PI * Math.sqrt(L / g); // chu kỳ (con lắc, gần đúng biên nhỏ)
  return { L, angleDeg, m, g, th, hMax, WtMax, vBottom, WdBottom, T };
}

export const baoToanCoNangConLac: Preset = {
  id: "bao-toan-co-nang-con-lac",
  title: "Bảo toàn cơ năng — con lắc",
  domain: "Dao động & Sóng",
  grade: 10,
  desc: "Con lắc dao động quanh vị trí cân bằng, khảo sát sự chuyển hoá và bảo toàn cơ năng khi chỉ có trọng lực.",
  objective:
    "Chứng minh cơ năng W = Wđ + Wt được bảo toàn khi vật chỉ chịu trọng lực: tại biên Wt lớn nhất còn Wđ = 0, tại vị trí thấp nhất Wđ lớn nhất còn Wt = 0, và tổng cơ năng không đổi trong suốt quá trình dao động.",
  sgkRef: "Vật lí 10 — Bài 26",
  params: [
    { key: "L", label: "Chiều dài dây", unit: "m", min: 0.4, max: 3, step: 0.1, default: 1.2 },
    { key: "angle", label: "Góc thả", unit: "°", min: 5, max: 75, step: 1, default: 40 },
    { key: "m", label: "Khối lượng vật", unit: "kg", min: 0.1, max: 3, step: 0.1, default: 0.5 },
    { key: "g", label: "Gia tốc trọng trường", unit: "m/s²", min: 1.6, max: 20, step: 0.1, default: 9.8 },
  ],
  applyParams: (p) => {
    const { L, m, g, th } = values(p);
    const px = 0, py = 3;
    return {
      bodies: [
        { id: "pivot", x: px, y: py, vx: 0, vy: 0, mass: 1, fixed: true },
        {
          id: "bob",
          x: px + L * Math.sin(th),
          y: py - L * Math.cos(th),
          vx: 0,
          vy: 0,
          mass: m,
          radius: 0.16,
          visual: { shape: "circle", color: "#f472b6", label: "m" },
        },
      ],
      forces: [{ kind: "gravity", g }],
      constraints: [{ kind: "rod", a: "pivot", b: "bob", length: L }],
      // Khung nhìn cố định: bob quét cung bán kính L quanh pivot ở (0, 3).
      view: { minX: -L - 0.4, maxX: L + 0.4, minY: 0, maxY: py + 0.4 },
    };
  },
  analysis: {
    landmarks: [
      {
        key: "extreme",
        label: "Tại biên (góc thả)",
        description: "Vị trí thả — góc lệch cực đại: vật đứng yên nên động năng bằng 0, còn thế năng lớn nhất. Toàn bộ cơ năng lúc này là thế năng.",
        atTime: () => 0,
        values: (p) => {
          const { angleDeg, hMax, WtMax } = values(p);
          return [
            { label: "Góc thả", value: angleDeg.toFixed(0), unit: "°" },
            { label: "Độ cao h = ℓ(1 − cosα)", value: hMax.toFixed(3), unit: "m" },
            { label: "Thế năng Wt = mgh", value: WtMax.toFixed(3), unit: "J" },
            { label: "Động năng Wđ", value: "0", unit: "J" },
          ];
        },
      },
      {
        key: "lowest",
        label: "Vị trí thấp nhất",
        description: "Dây thẳng đứng, sau 1/4 chu kỳ: thế năng bằng 0 (mốc), động năng lớn nhất. Nếu chỉ có trọng lực, toàn bộ thế năng đã chuyển thành động năng nên v = √(2gℓ(1 − cosα)).",
        atTime: (p) => {
          const { T } = values(p);
          return T / 4;
        },
        values: (p) => {
          const { vBottom, WdBottom } = values(p);
          return [
            { label: "Thế năng Wt", value: "0", unit: "J" },
            { label: "Động năng Wđ = mgh", value: WdBottom.toFixed(3), unit: "J" },
            { label: "Tốc độ v = √(2gℓ(1−cosα))", value: vBottom.toFixed(2), unit: "m/s" },
          ];
        },
      },
      {
        key: "conservation",
        label: "Bảo toàn cơ năng",
        description: "Trong suốt dao động, cơ năng W = Wđ + Wt luôn không đổi (bằng thế năng ở biên) vì chỉ có trọng lực sinh công. Động năng và thế năng liên tục chuyển hoá cho nhau nhưng tổng của chúng giữ nguyên.",
        values: (p) => {
          const { WtMax, T } = values(p);
          return [
            { label: "Cơ năng W = mgℓ(1−cosα)", value: WtMax.toFixed(3), unit: "J" },
            { label: "Chu kỳ T = 2π√(ℓ/g)", value: T.toFixed(2), unit: "s" },
            { label: "Kết luận", value: "W = Wđ + Wt = const", unit: "" },
          ];
        },
      },
    ],
  },
};
