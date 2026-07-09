import type { Preset } from "./types";

export const conLacLoXo: Preset = {
  id: "con-lac-lo-xo",
  title: "Con lắc lò xo",
  domain: "Dao động & Sóng",
  grade: 11,
  desc: "Vật treo vào lò xo thẳng đứng, dao động điều hoà quanh vị trí cân bằng.",
  objective: "Hiểu dao động điều hoà của lò xo: chu kỳ T = 2π√(m/k), độc lập với biên độ.",
  sgkRef: "Vật lí 11",
  params: [
    { key: "m", label: "Khối lượng", unit: "kg", min: 0.2, max: 3, step: 0.1, default: 1 },
    { key: "k", label: "Độ cứng lò xo", unit: "N/m", min: 5, max: 80, step: 1, default: 20 },
    { key: "A", label: "Biên độ", unit: "m", min: 0.1, max: 1, step: 0.05, default: 0.4 },
    { key: "g", label: "Gia tốc trọng trường", unit: "m/s²", min: 0, max: 20, step: 0.1, default: 9.8 },
  ],
  applyParams: (p) => {
    const m = p.m ?? 1, k = p.k ?? 20, A = p.A ?? 0.4, g = p.g ?? 9.8;
    const rest = 1.5; // chiều dài tự nhiên lò xo (m)
    const stretch = (m * g) / k; // độ giãn tĩnh tại vị trí cân bằng
    const anchorY = 3;
    const eqY = anchorY - rest - stretch; // vị trí cân bằng của vật
    return {
      bodies: [
        { id: "anchor", x: 0, y: anchorY, vx: 0, vy: 0, mass: 1, fixed: true },
        { id: "bob", x: 0, y: eqY - A, vx: 0, vy: 0, mass: m }, // thả lệch A xuống dưới VTCB
      ],
      forces: [
        { kind: "gravity", g },
        { kind: "spring", a: "anchor", b: "bob", k, restLength: rest, damping: 0 },
      ],
      constraints: [],
    };
  },
  analysis: {
    landmarks: [
      {
        key: "extreme-start",
        label: "Biên ban đầu (thả lệch xuống)",
        description: "Li độ = −A, tốc độ = 0.",
        atTime: () => 0,
        values: (p) => [
          { label: "Biên độ A", value: ((p.A ?? 0.4) * 100).toFixed(0), unit: "cm" },
          { label: "Tốc độ", value: "0", unit: "m/s" },
        ],
      },
      {
        key: "eq",
        label: "Vị trí cân bằng",
        description: "Tốc độ lớn nhất.",
        atTime: (p) => {
          const m = p.m ?? 1;
          const k = p.k ?? 20;
          return (2 * Math.PI * Math.sqrt(m / k)) / 4;
        },
        values: (p) => {
          const m = p.m ?? 1;
          const k = p.k ?? 20;
          const A = p.A ?? 0.4;
          const g = p.g ?? 9.8;
          const omega = Math.sqrt(k / m);
          return [
            { label: "Giãn tĩnh Δl = mg/k", value: (((m * g) / k) * 100).toFixed(1), unit: "cm" },
            { label: "Tốc độ cực đại v = Aω", value: (A * omega).toFixed(2), unit: "m/s" },
          ];
        },
      },
      {
        key: "extreme-far",
        label: "Biên đối diện (lệch lên)",
        description: "Li độ = +A, gia tốc cực đại.",
        atTime: (p) => {
          const m = p.m ?? 1;
          const k = p.k ?? 20;
          return (2 * Math.PI * Math.sqrt(m / k)) / 2;
        },
        values: (p) => {
          const m = p.m ?? 1;
          const k = p.k ?? 20;
          const A = p.A ?? 0.4;
          const omega = Math.sqrt(k / m);
          return [
            { label: "Gia tốc cực đại ω²A", value: (omega * omega * A).toFixed(2), unit: "m/s²" },
            { label: "Chu kỳ T", value: ((2 * Math.PI) / omega).toFixed(2), unit: "s" },
          ];
        },
      },
    ],
  },
};
