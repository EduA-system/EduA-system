import type { Preset } from "./types";

function degToRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

function vector(F: number, angle: number) {
  const rad = degToRad(angle);
  return { x: F * Math.cos(rad), y: F * Math.sin(rad) };
}

function values(p: Record<string, number>) {
  const F1 = p.F1 ?? 10;
  const a1 = p.a1 ?? 0;
  const F2 = p.F2 ?? 10;
  const a2 = p.a2 ?? 120;
  const F3 = p.F3 ?? 10;
  const a3 = p.a3 ?? 240;
  const v1 = vector(F1, a1);
  const v2 = vector(F2, a2);
  const v3 = vector(F3, a3);
  const rx = v1.x + v2.x + v3.x;
  const ry = v1.y + v2.y + v3.y;
  const R = Math.hypot(rx, ry);
  const angleR = R < 1e-9 ? 0 : (Math.atan2(ry, rx) * 180) / Math.PI;
  const balanced = R < 0.5;
  return { F1, a1, F2, a2, F3, a3, v1, v2, v3, rx, ry, R, angleR, balanced };
}

function meterBody(id: string, F: number, angle: number, color: string, label: string) {
  const centerY = 3;
  const dist = 2.45;
  const rad = degToRad(angle);
  return {
    id,
    x: dist * Math.cos(rad),
    y: centerY + dist * Math.sin(rad),
    vx: 0,
    vy: 0,
    mass: 1,
    fixed: true,
    radius: 0.24,
    visual: {
      shape: "forceMeter" as const,
      color,
      label,
      reading: `${F.toFixed(0)} N`,
    },
  };
}

export const tongHopLucDongQuy: Preset = {
  id: "tong-hop-luc-dong-quy",
  title: "Tổng hợp lực đồng quy",
  domain: "Cơ học",
  grade: 10,
  desc: "Ba lực kế kéo cùng một vòng tại điểm O để khảo sát cách cộng các vector lực đồng quy.",
  objective: "Hiểu lực đồng quy được tổng hợp bằng phép cộng vector; vật cân bằng khi tổng các thành phần lực theo Ox và Oy đều bằng 0.",
  sgkRef: "Vật lí 10",
  params: [
    { key: "F1", label: "Số chỉ lực kế F1", unit: "N", min: 0, max: 30, step: 1, default: 10 },
    { key: "a1", label: "Góc của F1", unit: "°", min: 0, max: 360, step: 5, default: 0 },
    { key: "F2", label: "Số chỉ lực kế F2", unit: "N", min: 0, max: 30, step: 1, default: 10 },
    { key: "a2", label: "Góc của F2", unit: "°", min: 0, max: 360, step: 5, default: 120 },
    { key: "F3", label: "Số chỉ lực kế F3", unit: "N", min: 0, max: 30, step: 1, default: 10 },
    { key: "a3", label: "Góc của F3", unit: "°", min: 0, max: 360, step: 5, default: 240 },
  ],
  applyParams: (p) => {
    const { F1, a1, F2, a2, F3, a3 } = values(p);
    const centerY = 3;
    const dist = 2.45;
    return {
      bodies: [
        {
          id: "vong-o",
          x: 0,
          y: centerY,
          vx: 0,
          vy: 0,
          mass: 1,
          fixed: true,
          radius: 0.18,
          visual: { shape: "circle", color: "#fbbf24", label: "O" },
        },
        meterBody("luc-ke-1", F1, a1, "#60a5fa", "F1"),
        meterBody("luc-ke-2", F2, a2, "#f472b6", "F2"),
        meterBody("luc-ke-3", F3, a3, "#34d399", "F3"),
      ],
      forces: [],
      constraints: [
        { kind: "rod", a: "vong-o", b: "luc-ke-1", length: dist },
        { kind: "rod", a: "vong-o", b: "luc-ke-2", length: dist },
        { kind: "rod", a: "vong-o", b: "luc-ke-3", length: dist },
      ],
    };
  },
  analysis: {
    landmarks: [
      {
        key: "components",
        label: "Thành phần của từng lực",
        description: "Mỗi lực đồng quy được phân tích theo hai trục: Fx = Fcosα, Fy = Fsinα. Hợp lực là tổng các thành phần tương ứng.",
        atTime: () => 0,
        values: (p) => {
          const { F1, a1, F2, a2, F3, a3, v1, v2, v3 } = values(p);
          return [
            { label: "F1", value: `${F1.toFixed(0)} N, ${a1.toFixed(0)}°`, unit: "" },
            { label: "F1x; F1y", value: `${v1.x.toFixed(2)}; ${v1.y.toFixed(2)}`, unit: "N" },
            { label: "F2", value: `${F2.toFixed(0)} N, ${a2.toFixed(0)}°`, unit: "" },
            { label: "F2x; F2y", value: `${v2.x.toFixed(2)}; ${v2.y.toFixed(2)}`, unit: "N" },
            { label: "F3", value: `${F3.toFixed(0)} N, ${a3.toFixed(0)}°`, unit: "" },
            { label: "F3x; F3y", value: `${v3.x.toFixed(2)}; ${v3.y.toFixed(2)}`, unit: "N" },
          ];
        },
      },
      {
        key: "resultant",
        label: "Hợp lực tại điểm O",
        description: "Các lực có giá đồng quy tại O nên có thể cộng trực tiếp như vector: Rx = ΣFx, Ry = ΣFy, R = √(Rx² + Ry²).",
        atTime: () => 0,
        values: (p) => {
          const { rx, ry, R, angleR } = values(p);
          return [
            { label: "Rx = ΣFx", value: rx.toFixed(2), unit: "N" },
            { label: "Ry = ΣFy", value: ry.toFixed(2), unit: "N" },
            { label: "R", value: R.toFixed(2), unit: "N" },
            { label: "Góc của R", value: angleR.toFixed(1), unit: "°" },
          ];
        },
      },
      {
        key: "equilibrium",
        label: "Điều kiện cân bằng",
        description: "Vòng đứng cân bằng khi hợp lực gần bằng 0, tương đương ΣFx = 0 và ΣFy = 0. Mặc định ba lực bằng nhau và lệch nhau 120° nên cân bằng.",
        atTime: () => 0,
        values: (p) => {
          const { rx, ry, R, balanced } = values(p);
          return [
            { label: "ΣFx", value: rx.toFixed(2), unit: "N" },
            { label: "ΣFy", value: ry.toFixed(2), unit: "N" },
            { label: "|R|", value: R.toFixed(2), unit: "N" },
            { label: "Kết luận", value: balanced ? "Cân bằng" : "Chưa cân bằng", unit: "" },
          ];
        },
      },
    ],
  },
};