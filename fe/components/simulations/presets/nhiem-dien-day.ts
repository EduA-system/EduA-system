import type { Preset } from "./types";

// Thí nghiệm kinh điển SGK: 2 quả cầu nhỏ nhiễm điện CÙNG DẤU, treo bằng 2 sợi
// dây tại CÙNG một điểm (giống cong-huong-con-lac.ts: nhiều con lắc rod riêng
// biệt, ở đây 2 rod dùng CHUNG 1 anchor). Lực Coulomb giữa 2 quả cầu
// (kernel/forces.ts) đẩy nhau lệch ra 2 bên, tắt dần về góc cân bằng. Xem
// nhiem-dien-hut.ts cho phiên bản hút nhau (2 giá treo riêng biệt).

export const nhiemDienDay: Preset = {
  id: "nhiem-dien-day",
  title: "Nhiễm điện — đẩy nhau",
  domain: "Điện & Từ",
  grade: 11,
  desc: "Hai quả cầu nhỏ nhiễm điện cùng dấu, treo bằng 2 sợi dây tại cùng 1 điểm — đẩy nhau lệch ra 2 bên.",
  objective:
    "Quan sát lực Coulomb F = ke·q1·q2/r² qua góc lệch cân bằng của 2 quả cầu tích điện cùng dấu.",
  sgkRef: "Vật lí 11 — Điện tích. Định luật Coulomb",
  params: [
    { key: "L", label: "Chiều dài dây treo", unit: "cm", min: 10, max: 40, step: 1, default: 20 },
    { key: "q1", label: "Điện tích quả cầu 1", unit: "µC", min: 0.02, max: 1, step: 0.02, default: 0.15 },
    { key: "q2", label: "Điện tích quả cầu 2", unit: "µC", min: 0.02, max: 1, step: 0.02, default: 0.15 },
    { key: "m", label: "Khối lượng mỗi quả cầu", unit: "g", min: 0.2, max: 5, step: 0.1, default: 1 },
    { key: "g", label: "Gia tốc trọng trường", unit: "m/s²", min: 1.6, max: 20, step: 0.1, default: 9.8 },
  ],
  applyParams: (p) => {
    const L = (p.L ?? 20) / 100; // cm → m
    const q1 = (p.q1 ?? 0.15) * 1e-6; // µC → C
    const q2 = (p.q2 ?? 0.15) * 1e-6; // cùng dấu — luôn đẩy nhau
    const m = (p.m ?? 1) / 1000; // g → kg
    const g = p.g ?? 9.8;
    const px = 0, py = 1.2;
    const th0 = 0.15; // lệch nhỏ ban đầu để Coulomb có hướng xác định ngay khi thả (r0 > 0)
    const ballRadius = 0.015;
    const drag = 0.01; // cản nhẹ — hệ tắt dần về góc cân bằng thay vì đung đưa mãi
    return {
      bodies: [
        { id: "pivot", x: px, y: py, vx: 0, vy: 0, mass: 1, fixed: true },
        { id: "bob1", x: px - L * Math.sin(th0), y: py - L * Math.cos(th0), vx: 0, vy: 0, mass: m, radius: ballRadius },
        { id: "bob2", x: px + L * Math.sin(th0), y: py - L * Math.cos(th0), vx: 0, vy: 0, mass: m, radius: ballRadius },
      ],
      forces: [
        { kind: "gravity", g },
        { kind: "coulomb", a: "bob1", b: "bob2", q1, q2 },
        { kind: "drag", body: "bob1", c: drag },
        { kind: "drag", body: "bob2", c: drag },
      ],
      constraints: [
        { kind: "rod", a: "pivot", b: "bob1", length: L },
        { kind: "rod", a: "pivot", b: "bob2", length: L },
      ],
      restitution: 0,
    };
  },
  bodyLabels: { bob1: "1", bob2: "2" },
  analysis: {
    landmarks: [
      {
        key: "tha-ra",
        label: "Lúc thả ra",
        description: "Lực Coulomb ban đầu, tính từ khoảng cách lúc thả (góc lệch nhỏ ban đầu).",
        atTime: () => 0,
        values: (p) => {
          const L = (p.L ?? 20) / 100;
          const q1 = (p.q1 ?? 0.15) * 1e-6;
          const q2 = (p.q2 ?? 0.15) * 1e-6;
          const r0 = 2 * L * Math.sin(0.15);
          const F = (8.99e9 * q1 * q2) / (r0 * r0);
          return [{ label: "Lực Coulomb F = ke·q1q2/r²", value: (F * 1000).toFixed(2), unit: "mN" }];
        },
      },
      {
        key: "on-dinh",
        label: "Trạng thái ổn định (sau khi tắt dần)",
        description: "Lệch ra và đứng yên ở góc cân bằng θ³ = ke·q²/(4mgL²) (công thức đúng khi θ nhỏ).",
        atTime: () => 6,
        values: (p) => {
          const L = (p.L ?? 20) / 100;
          const q1 = (p.q1 ?? 0.15) * 1e-6;
          const q2 = (p.q2 ?? 0.15) * 1e-6;
          const m = (p.m ?? 1) / 1000;
          const g = p.g ?? 9.8;
          const th = Math.cbrt((8.99e9 * q1 * q2) / (4 * m * g * L * L));
          return [
            { label: "Góc lệch cân bằng θ", value: ((th * 180) / Math.PI).toFixed(1), unit: "°" },
            { label: "Khoảng cách 2 quả cầu", value: (2 * L * Math.sin(th) * 100).toFixed(1), unit: "cm" },
          ];
        },
      },
    ],
  },
};
