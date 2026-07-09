import type { Preset } from "./types";

export const conLacDon: Preset = {
  id: "con-lac-don",
  title: "Con lắc đơn",
  domain: "Dao động & Sóng",
  grade: 11,
  desc: "Con lắc dao động quanh vị trí cân bằng, khảo sát chu kỳ theo chiều dài dây.",
  objective: "Quan sát dao động điều hoà và ảnh hưởng của chiều dài, trọng trường tới chu kỳ T = 2π√(L/g).",
  sgkRef: "Vật lí 11",
  params: [
    { key: "L", label: "Chiều dài dây", unit: "m", min: 0.4, max: 3, step: 0.1, default: 1.6 },
    { key: "angle", label: "Biên độ góc", unit: "°", min: 5, max: 75, step: 1, default: 40 },
    { key: "g", label: "Gia tốc trọng trường", unit: "m/s²", min: 1.6, max: 20, step: 0.1, default: 9.8 },
  ],
  applyParams: (p) => {
    const L = p.L ?? 1.6;
    const th = ((p.angle ?? 40) * Math.PI) / 180;
    const px = 0, py = 3;
    return {
      bodies: [
        { id: "pivot", x: px, y: py, vx: 0, vy: 0, mass: 1, fixed: true },
        { id: "bob", x: px + L * Math.sin(th), y: py - L * Math.cos(th), vx: 0, vy: 0, mass: 1 },
      ],
      forces: [{ kind: "gravity", g: p.g ?? 9.8 }],
      constraints: [{ kind: "rod", a: "pivot", b: "bob", length: L }],
    };
  },
  analysis: {
    landmarks: [
      {
        key: "extreme-start",
        label: "Biên ban đầu",
        description: "Vị trí thả — góc lệch cực đại, tốc độ = 0, thế năng lớn nhất.",
        atTime: () => 0,
        values: (p) => [
          { label: "Biên độ góc", value: (p.angle ?? 40).toFixed(0), unit: "°" },
          { label: "Tốc độ", value: "0", unit: "m/s" },
        ],
      },
      {
        key: "equilibrium",
        label: "Vị trí cân bằng (đáy)",
        description: "Dây thẳng đứng, sau 1/4 chu kỳ — thế năng thấp nhất, tốc độ lớn nhất.",
        atTime: (p) => {
          const L = p.L ?? 1.6;
          const g = p.g ?? 9.8;
          return (2 * Math.PI * Math.sqrt(L / g)) / 4;
        },
        values: (p) => {
          const L = p.L ?? 1.6;
          const g = p.g ?? 9.8;
          const th = ((p.angle ?? 40) * Math.PI) / 180;
          const vmax = Math.sqrt(2 * g * L * (1 - Math.cos(th)));
          return [
            { label: "Tốc độ cực đại", value: vmax.toFixed(2), unit: "m/s" },
            { label: "Li độ góc", value: "0", unit: "°" },
          ];
        },
      },
      {
        key: "extreme-far",
        label: "Biên đối diện",
        description: "Sau nửa chu kỳ — vật sang hẳn phía bên kia, tốc độ lại về 0.",
        atTime: (p) => {
          const L = p.L ?? 1.6;
          const g = p.g ?? 9.8;
          return (2 * Math.PI * Math.sqrt(L / g)) / 2;
        },
        values: (p) => {
          const L = p.L ?? 1.6;
          const g = p.g ?? 9.8;
          return [
            { label: "Biên độ góc", value: (p.angle ?? 40).toFixed(0), unit: "°" },
            { label: "Chu kỳ T", value: (2 * Math.PI * Math.sqrt(L / g)).toFixed(2), unit: "s" },
          ];
        },
      },
    ],
  },
};
