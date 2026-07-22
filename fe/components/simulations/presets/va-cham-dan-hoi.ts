import type { Preset } from "./types";

export const vaChamDanHoi: Preset = {
  id: "va-cham-dan-hoi",
  title: "Va chạm đàn hồi",
  domain: "Cơ học",
  grade: 10,
  desc: "Hai xe va chạm trên mặt nhẵn rồi nảy ra, bảo toàn cả động lượng lẫn động năng (e = 1).",
  objective: "Va chạm đàn hồi: bảo toàn động lượng VÀ động năng; quan sát trao đổi vận tốc.",
  sgkRef: "Vật lí 10, Bài 28-30",
  params: [
    { key: "m1", label: "Khối lượng vật 1", unit: "kg", min: 0.5, max: 4, step: 0.1, default: 1 },
    { key: "m2", label: "Khối lượng vật 2", unit: "kg", min: 0.5, max: 4, step: 0.1, default: 2 },
    { key: "v1", label: "Vận tốc vật 1", unit: "m/s", min: 0, max: 8, step: 0.5, default: 4 },
  ],
  applyParams: (p) => ({
    restitution: 1, // đàn hồi hoàn toàn
    bodies: [
      {
        id: "b1",
        x: -3,
        y: 0,
        vx: p.v1 ?? 4,
        vy: 0,
        mass: p.m1 ?? 1,
        radius: 0.4,
        visual: { shape: "collisionCart", color: "#38bdf8", label: "m₁", collisionSide: "right" },
      },
      {
        id: "b2",
        x: 1,
        y: 0,
        vx: 0,
        vy: 0,
        mass: p.m2 ?? 2,
        radius: 0.4,
        visual: { shape: "collisionCart", color: "#38bdf8", label: "m₂", collisionSide: "left" },
      },
    ],
    forces: [{ kind: "gravity", g: 9.8 }], // giữ hai vật nằm trên mặt
    // mặt nhẵn (ma sát 0) → va chạm thuần theo phương ngang, động lượng x bảo toàn
    constraints: [{ kind: "surface", x: 0, y: 0, angle: 0, length: 400, friction: 0 }],
    groundPadding: 120,
  }),
  analysis: {
    landmarks: [
      {
        key: "after",
        label: "Sau va chạm đàn hồi (e = 1)",
        description: "Bảo toàn động lượng và động năng.",
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
          const u1 = ((m1 - m2) / (m1 + m2)) * v1;
          const u2 = ((2 * m1) / (m1 + m2)) * v1;
          return [
            { label: "v₁' vật 1", value: u1.toFixed(2), unit: "m/s" },
            { label: "v₂' vật 2", value: u2.toFixed(2), unit: "m/s" },
            { label: "Động lượng p = m₁v₁", value: (m1 * v1).toFixed(2), unit: "kg·m/s" },
            { label: "Động năng đầu", value: (0.5 * m1 * v1 * v1).toFixed(2), unit: "J" },
          ];
        },
      },
    ],
  },
};
