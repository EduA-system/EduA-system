import type { Preset } from "./types";

function values(p: Record<string, number>) {
  const m = p.m ?? 1;
  const g = p.g ?? 9.8;
  const extra = p.extra ?? 0;
  const weight = m * g;
  const tension = weight + extra;
  return { m, g, extra, weight, tension };
}

export const doPTBangLucKe: Preset = {
  id: "do-p-t-bang-luc-ke",
  title: "Đo P và T bằng lực kế",
  domain: "Cơ học",
  grade: 10,
  desc: "Treo vật vào lực kế để so sánh trọng lực P và lực căng dây T khi vật cân bằng.",
  objective: "Hiểu lực kế đo lực căng dây; khi vật treo đứng yên, hai lực cân bằng nên T = P = mg.",
  sgkRef: "Vật lí 10",
  params: [
    { key: "m", label: "Khối lượng vật", unit: "kg", min: 0.1, max: 5, step: 0.1, default: 1 },
    { key: "g", label: "Gia tốc trọng trường", unit: "m/s²", min: 1.6, max: 20, step: 0.1, default: 9.8 },
    { key: "extra", label: "Lực kéo thêm xuống", unit: "N", min: 0, max: 20, step: 0.5, default: 0 },
  ],
  applyParams: (p) => {
    const { m, g, extra } = values(p);
    const anchorY = 3;
    const length = 1.8;
    return {
      bodies: [
        { id: "luc-ke", x: 0, y: anchorY, vx: 0, vy: 0, mass: 1, fixed: true },
        { id: "vat", x: 0, y: anchorY - length, vx: 0, vy: 0, mass: m, radius: 0.28 },
      ],
      forces: [
        { kind: "gravity", g },
        ...(extra > 0 ? [{ kind: "applied" as const, body: "vat", fx: 0, fy: -extra }] : []),
      ],
      constraints: [{ kind: "rod", a: "luc-ke", b: "vat", length }],
    };
  },
  analysis: {
    landmarks: [
      {
        key: "weight",
        label: "Trọng lực của vật",
        description: "Trọng lực P là lực Trái Đất tác dụng lên vật, hướng thẳng đứng xuống dưới. Độ lớn P = mg.",
        atTime: () => 0,
        values: (p) => {
          const { m, g, weight } = values(p);
          return [
            { label: "m", value: m.toFixed(2), unit: "kg" },
            { label: "g", value: g.toFixed(2), unit: "m/s²" },
            { label: "P = mg", value: weight.toFixed(2), unit: "N" },
          ];
        },
      },
      {
        key: "tension",
        label: "Số chỉ lực kế",
        description: "Lực kế mắc nối tiếp với dây nên số chỉ của lực kế là độ lớn lực căng dây T.",
        values: (p) => {
          const { weight, tension, extra } = values(p);
          return [
            { label: "T khi chỉ treo vật", value: weight.toFixed(2), unit: "N" },
            { label: "Lực kéo thêm", value: extra.toFixed(2), unit: "N" },
            { label: "Số chỉ lực kế", value: tension.toFixed(2), unit: "N" },
          ];
        },
      },
      {
        key: "equilibrium",
        label: "Điều kiện cân bằng",
        description: "Khi vật đứng yên và không có lực kéo thêm, lực căng dây hướng lên cân bằng với trọng lực hướng xuống: T = P.",
        values: (p) => {
          const { weight, tension, extra } = values(p);
          return [
            { label: "T", value: tension.toFixed(2), unit: "N" },
            { label: "P", value: weight.toFixed(2), unit: "N" },
            { label: "Kết luận", value: extra === 0 ? "T = P" : "T = P + lực kéo thêm", unit: "" },
          ];
        },
      },
    ],
  },
};