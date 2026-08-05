import type { Preset } from "./types";

export const vaChamMem: Preset = {
  id: "va-cham-mem",
  title: "Va chạm mềm",
  domain: "Cơ học",
  grade: 10,
  desc: "Một xe chuyển động đâm vào xe đứng yên; hai xe dính lại, bảo toàn động lượng nhưng mất động năng (e = 0).",
  objective: "Va chạm mềm: bảo toàn động lượng nhưng động năng giảm; hai vật dính cùng vận tốc.",
  sgkRef: "Vật lí 10, Bài 28-30",
  params: [
    { key: "m1", label: "Khối lượng vật 1", unit: "kg", min: 0.5, max: 4, step: 0.1, default: 1 },
    { key: "m2", label: "Khối lượng vật 2", unit: "kg", min: 0.5, max: 4, step: 0.1, default: 2 },
    { key: "v1", label: "Vận tốc vật 1", unit: "m/s", min: 0, max: 8, step: 0.5, default: 4 },
  ],
  hideBodyCoordinates: true,
  annotations: () => [
    { kind: "velocity", body: "b1", scale: 0.3, maxLength: 1.15, offsetX: -0.12, offsetY: -0.2, color: "#38bdf8", label: "v₁" },
    { kind: "velocity", body: "b2", scale: 0.3, maxLength: 1.15, offsetY: 0.52, color: "#fb923c", label: "v₂" },
  ],
  applyParams: (p) => ({
    restitution: 0, // va chạm mềm hoàn toàn (dính)
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
        x: 1.1,
        y: 0,
        vx: 0,
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
    ], // lực cản nhỏ; xe m₂ ban đầu đứng yên
    constraints: [{ kind: "surface", x: 0, y: 0, angle: 0, length: 400, friction: 0 }],
    view: { minX: -4.9, maxX: 4.9, minY: 0, maxY: 2.1 },
    groundPadding: 80,
  }),
  analysis: {
    landmarks: [
      {
        key: "after",
        label: "Sau va chạm mềm (e = 0)",
        description: "Dính vào nhau, mất động năng.",
        // Xe m₂ đứng yên tại x = 1.1m; khoảng cách tiếp cận đến lúc chạm là 3.7m.
        atTime: (p) => {
          const v1 = p.v1 ?? 4;
          return v1 > 0 ? 3.7 / v1 + 0.15 : 0;
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
