import type { Preset } from "./types";

export const vaChamMem: Preset = {
  id: "va-cham-mem",
  title: "Va chạm mềm",
  domain: "Cơ học",
  grade: 10,
  desc: "Hai vật va chạm rồi dính, chuyển động cùng vận tốc — bảo toàn động lượng, mất động năng (e = 0).",
  objective: "Va chạm mềm: bảo toàn động lượng nhưng động năng giảm; hai vật dính cùng vận tốc.",
  sgkRef: "Vật lí 10 — Bài 28–30",
  params: [
    { key: "m1", label: "Khối lượng vật 1", unit: "kg", min: 0.5, max: 4, step: 0.1, default: 1 },
    { key: "m2", label: "Khối lượng vật 2", unit: "kg", min: 0.5, max: 4, step: 0.1, default: 2 },
    { key: "v1", label: "Vận tốc vật 1", unit: "m/s", min: 0, max: 8, step: 0.5, default: 4 },
  ],
  applyParams: (p) => ({
    restitution: 0, // va chạm mềm hoàn toàn (dính)
    bodies: [
      { id: "b1", x: -3, y: 0.4, vx: p.v1 ?? 4, vy: 0, mass: p.m1 ?? 1, radius: 0.4 },
      { id: "b2", x: 1, y: 0.4, vx: 0, vy: 0, mass: p.m2 ?? 2, radius: 0.4 },
    ],
    forces: [{ kind: "gravity", g: 9.8 }],
    constraints: [{ kind: "surface", x: 0, y: 0, angle: 0, length: 400, friction: 0 }],
  }),
  analysis: {
    landmarks: [
      {
        key: "after",
        label: "Sau va chạm mềm (e = 0)",
        description: "Dính vào nhau, mất động năng.",
        // Khoảng cách ban đầu 4m, va chạm khi tâm cách nhau = tổng bán kính 0.8m
        // → quãng đường tiếp cận 3.2m; +0.15s để thấy trạng thái NGAY SAU va chạm.
        atTime: (p) => {
          const v1 = p.v1 ?? 4;
          return v1 > 0 ? 3.2 / v1 + 0.15 : 0;
        },
        values: (p) => {
          const m1 = p.m1 ?? 1;
          const m2 = p.m2 ?? 2;
          const v1 = p.v1 ?? 4;
          const u = (m1 * v1) / (m1 + m2);
          const ke0 = 0.5 * m1 * v1 * v1;
          const ke1 = 0.5 * (m1 + m2) * u * u;
          return [
            { label: "Vận tốc chung v'", value: u.toFixed(2), unit: "m/s" },
            { label: "Động lượng (bảo toàn)", value: (m1 * v1).toFixed(2), unit: "kg·m/s" },
            { label: "Động năng mất", value: (ke0 - ke1).toFixed(2), unit: "J" },
            { label: "% động năng còn lại", value: ((ke1 / ke0) * 100).toFixed(0), unit: "%" },
          ];
        },
      },
    ],
  },
};
