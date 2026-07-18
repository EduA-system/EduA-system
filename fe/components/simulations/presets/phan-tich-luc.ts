import type { Preset } from "./types";

function degToRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

function values(p: Record<string, number>) {
  const alpha = p.alpha ?? 25;
  const m = p.m ?? 2;
  const g = p.g ?? 9.8;
  const P = m * g;
  const P1 = P * Math.cos(degToRad(alpha));
  const P2 = P * Math.sin(degToRad(alpha));
  return { alpha, m, g, P, P1, P2 };
}

function vectorParts(alpha: number) {
  const theta = -degToRad(alpha);
  const total = 1.45;
  const along = total * Math.sin(degToRad(alpha));
  const normal = total * Math.cos(degToRad(alpha));
  const ux = Math.cos(theta);
  const uy = Math.sin(theta);
  const nx = -Math.sin(theta);
  const ny = Math.cos(theta);

  return {
    p: { dx: 0, dy: -total },
    p2: { dx: ux * along, dy: uy * along },
    p1: { dx: -nx * normal, dy: -ny * normal },
  };
}

export const phanTichLuc: Preset = {
  id: "phan-tich-luc",
  title: "Phân tích lực",
  domain: "Cơ học",
  grade: 10,
  desc: "Quan sát trọng lực được phân tích thành hai lực thành phần",
  objective: "Quan sát trọng lực được phân tích thành hai lực thành phần",
  sgkRef: "Vật lí 10 - phân tích lực",
  params: [
    { key: "alpha", label: "Góc nghiêng", unit: "°", min: 5, max: 50, step: 1, default: 25 },
    { key: "m", label: "Khối lượng vật", unit: "kg", min: 0.5, max: 8, step: 0.1, default: 2 },
    { key: "g", label: "Gia tốc trọng trường", unit: "m/s²", min: 1.6, max: 20, step: 0.1, default: 9.8 },
  ],
  applyParams: (p) => {
    const { alpha, m, g } = values(p);
    const theta = -degToRad(alpha);
    const surface = { kind: "surface" as const, x: 0, y: 1.65, angle: -alpha, length: 8.8, friction: 0.35 };
    const startS = -2.35;
    const block = {
      x: surface.x + startS * Math.cos(theta),
      y: surface.y + startS * Math.sin(theta),
    };
    const vectors = vectorParts(alpha);

    return {
      bodies: [
        {
          id: "vat",
          x: block.x,
          y: block.y,
          vx: 0,
          vy: 0,
          mass: m,
          radius: 0.24,
          visual: { shape: "box", color: "#86efac", label: "vật", angle: alpha },
        },
      ],
      forces: [{ kind: "gravity" as const, g }],
      constraints: [surface],
      annotations: [
        { kind: "vector" as const, anchor: "vat", ...vectors.p, color: "#f8fafc", label: "P", width: 3 },
        { kind: "vector" as const, anchor: "vat", ...vectors.p1, color: "#fbbf24", label: "P1", width: 3 },
        { kind: "vector" as const, anchor: "vat", ...vectors.p2, color: "#60a5fa", label: "P2", width: 3 },
      ],
      view: { minX: -4.7, maxX: 4.9, minY: 0, maxY: 4.4 },
    };
  },
  analysis: {
    landmarks: [
      {
        key: "weight",
        label: "Trọng lực P",
        description: "Trọng lực P luôn hướng thẳng đứng xuống dưới. Khi vật nằm trên mặt phẳng nghiêng, P được phân tích theo hai phương vuông góc: song song và vuông góc với mặt phẳng.",
        atTime: () => 0,
        values: (p) => {
          const { m, g, P } = values(p);
          return [
            { label: "m", value: m.toFixed(2), unit: "kg" },
            { label: "g", value: g.toFixed(2), unit: "m/s²" },
            { label: "P = mg", value: P.toFixed(2), unit: "N" },
          ];
        },
      },
      {
        key: "normal-component",
        label: "Thành phần P1",
        description: "P1 vuông góc với mặt phẳng nghiêng, có tác dụng ép vật vào mặt phẳng. Với góc nghiêng α, độ lớn P1 = Pcosα.",
        values: (p) => {
          const { alpha, P1 } = values(p);
          return [
            { label: "α", value: alpha.toFixed(0), unit: "°" },
            { label: "P1 = Pcosα", value: P1.toFixed(2), unit: "N" },
            { label: "Vai trò", value: "ép vật vào mặt phẳng", unit: "" },
          ];
        },
      },
      {
        key: "parallel-component",
        label: "Thành phần P2",
        description: "P2 song song với mặt phẳng nghiêng, kéo vật trượt xuống dọc mặt phẳng. Với góc nghiêng α, độ lớn P2 = Psinα.",
        values: (p) => {
          const { alpha, P2 } = values(p);
          return [
            { label: "α", value: alpha.toFixed(0), unit: "°" },
            { label: "P2 = Psinα", value: P2.toFixed(2), unit: "N" },
            { label: "Vai trò", value: "kéo vật trượt xuống", unit: "" },
          ];
        },
      },
      {
        key: "angle-effect",
        label: "Ảnh hưởng của góc nghiêng",
        description: "Khi tăng góc nghiêng, thành phần P2 tăng nên vật có xu hướng trượt mạnh hơn; thành phần P1 giảm nên vật ép vào mặt phẳng yếu hơn.",
        values: (p) => {
          const { alpha, P1, P2 } = values(p);
          return [
            { label: "Góc nghiêng", value: alpha.toFixed(0), unit: "°" },
            { label: "P1", value: P1.toFixed(2), unit: "N" },
            { label: "P2", value: P2.toFixed(2), unit: "N" },
          ];
        },
      },
    ],
  },
};