import type { Preset } from "./types";

export const vaChamDanHoi: Preset = {
  id: "va-cham-dan-hoi",
  title: "Va chạm đàn hồi",
  domain: "Cơ học",
  grade: 10,
  desc: "Hai xe từ hai phía tiến lại, va chạm đàn hồi rồi nảy ra giữa hai tường chắn (e = 1).",
  objective: "Va chạm đàn hồi: bảo toàn động lượng VÀ động năng; quan sát trao đổi vận tốc.",
  sgkRef: "Vật lí 10, Bài 28-30",
  params: [
    { key: "m1", label: "Khối lượng vật 1", unit: "kg", min: 0.5, max: 4, step: 0.1, default: 1 },
    { key: "m2", label: "Khối lượng vật 2", unit: "kg", min: 0.5, max: 4, step: 0.1, default: 2 },
    { key: "v1", label: "Vận tốc ban đầu vật 1", unit: "m/s", min: 0, max: 8, step: 0.5, default: 4 },
    { key: "v2", label: "Vận tốc ban đầu vật 2", unit: "m/s", min: 0, max: 8, step: 0.5, default: 4 },
  ],
  hideBodyCoordinates: true,
  annotations: () => [
    { kind: "velocity", body: "b1", scale: 0.3, maxLength: 1.15, offsetX: -0.12, offsetY: -0.2, color: "#38bdf8", label: "v₁" },
    { kind: "velocity", body: "b2", scale: 0.3, maxLength: 1.15, offsetY: 0.52, color: "#fb923c", label: "v₂" },
  ],
  applyParams: (p) => ({
    restitution: 1, // đàn hồi hoàn toàn
    bodies: [
      {
        id: "b1",
        x: -3.4,
        y: 0,
        vx: p.v1 ?? 4,
        vy: 0,
        mass: p.m1 ?? 1,
        radius: 0.24,
        visual: { shape: "box", color: "#38bdf8", label: "m₁", wheels: true, grounded: true },
      },
      {
        id: "b2",
        x: 3.4,
        y: 0,
        vx: -(p.v2 ?? 4),
        vy: 0,
        mass: p.m2 ?? 2,
        radius: 0.24,
        visual: { shape: "box", color: "#fb923c", label: "m₂", wheels: true, grounded: true },
      },
      {
        id: "wall-left",
        x: -4.35,
        y: 0,
        vx: 0,
        vy: 0,
        mass: 1,
        fixed: true,
        radius: 0.2,
        restitution: 0.35,
        visual: { shape: "wall", color: "#334155", label: "Tường" },
      },
      {
        id: "wall-right",
        x: 4.35,
        y: 0,
        vx: 0,
        vy: 0,
        mass: 1,
        fixed: true,
        radius: 0.2,
        restitution: 0.35,
        visual: { shape: "wall", color: "#334155", label: "Tường" },
      },
    ],
    forces: [
      { kind: "drag", body: "b1", c: 0.12 },
      { kind: "drag", body: "b2", c: 0.12 },
    ], // lực cản rất nhỏ để vận tốc giảm dần sau mỗi lần va chạm
    // mặt nhẵn (ma sát 0) → va chạm thuần theo phương ngang, động lượng x bảo toàn
    constraints: [{ kind: "surface", x: 0, y: 0, angle: 0, length: 400, friction: 0 }],
    view: { minX: -4.9, maxX: 4.9, minY: 0, maxY: 2.1 },
    groundPadding: 80,
  }),
  analysis: {
    landmarks: [
      {
        key: "after",
        label: "Sau va chạm đàn hồi (e = 1)",
        description: "Bảo toàn động lượng và động năng.",
        // Khoảng cách tâm ban đầu 6.8m, va chạm khi cách nhau 0.8m.
        // Hai xe cùng tiến lại nên quãng đường tiếp cận là 6m.
        atTime: (p) => {
          const v1 = p.v1 ?? 4;
          const v2 = p.v2 ?? 4;
          return v1 + v2 > 0 ? 6 / (v1 + v2) + 0.15 : 0;
        },
        values: (p) => {
          const m1 = p.m1 ?? 1;
          const m2 = p.m2 ?? 2;
          const v1 = p.v1 ?? 4;
          const v2 = p.v2 ?? 4;
          const u1 = ((m1 - m2) * v1 - 2 * m2 * v2) / (m1 + m2);
          const u2 = (2 * m1 * v1 + (m2 - m1) * v2) / (m1 + m2);
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
