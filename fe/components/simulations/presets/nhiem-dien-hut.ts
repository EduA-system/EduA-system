import type { Preset } from "./types";

// Thí nghiệm kinh điển SGK: 2 quả cầu nhỏ nhiễm điện TRÁI DẤU, treo bằng 2
// sợi dây tại 2 GIÁ TREO RIÊNG BIỆT (khác nhiem-dien-day.ts — đẩy nhau dùng
// CHUNG 1 điểm treo). Mỗi dây là 1 con lắc độc lập (rod riêng, giống
// cong-huong-con-lac.ts), lực Coulomb giữa 2 quả cầu (kernel/forces.ts) kéo
// chúng nghiêng vào giữa so với phương thẳng đứng của chính giá treo nó.

export const nhiemDienHut: Preset = {
  id: "nhiem-dien-hut",
  title: "Nhiễm điện — hút nhau",
  domain: "Điện & Từ",
  grade: 11,
  desc: "Hai quả cầu nhỏ nhiễm điện trái dấu, treo bằng 2 dây tại 2 giá treo riêng biệt — hút nhau, mỗi dây nghiêng vào giữa.",
  objective:
    "Quan sát lực Coulomb F = ke·q1·q2/r² qua góc nghiêng của mỗi dây treo so với phương thẳng đứng của chính giá treo đó.",
  sgkRef: "Vật lí 11 — Điện tích. Định luật Coulomb",
  params: [
    { key: "d", label: "Khoảng cách 2 giá treo", unit: "cm", min: 20, max: 60, step: 1, default: 35 },
    { key: "L", label: "Chiều dài dây treo", unit: "cm", min: 10, max: 40, step: 1, default: 20 },
    { key: "q1", label: "Độ lớn điện tích quả cầu 1", unit: "µC", min: 0.02, max: 1, step: 0.02, default: 0.1 },
    { key: "q2", label: "Độ lớn điện tích quả cầu 2", unit: "µC", min: 0.02, max: 1, step: 0.02, default: 0.1 },
    { key: "m", label: "Khối lượng mỗi quả cầu", unit: "g", min: 0.2, max: 5, step: 0.1, default: 1 },
    { key: "g", label: "Gia tốc trọng trường", unit: "m/s²", min: 1.6, max: 20, step: 0.1, default: 9.8 },
  ],
  applyParams: (p) => {
    const d = (p.d ?? 35) / 100; // cm → m
    const L = (p.L ?? 20) / 100;
    const q1 = (p.q1 ?? 0.1) * 1e-6; // µC → C — độ lớn, luôn áp TRÁI dấu bên dưới
    const q2 = (p.q2 ?? 0.1) * 1e-6;
    const m = (p.m ?? 1) / 1000; // g → kg
    const g = p.g ?? 9.8;
    const py = 1.2;
    const x1 = -d / 2, x2 = d / 2;
    const th0 = 0.1; // lệch nhỏ ban đầu (nghiêng vào giữa) để Coulomb có hướng xác định ngay khi thả
    const ballRadius = 0.015;
    const drag = 0.01; // cản nhẹ — hệ tắt dần về góc nghiêng ổn định thay vì đung đưa mãi
    return {
      bodies: [
        { id: "anchor1", x: x1, y: py, vx: 0, vy: 0, mass: 1, fixed: true },
        { id: "anchor2", x: x2, y: py, vx: 0, vy: 0, mass: 1, fixed: true },
        { id: "bob1", x: x1 + L * Math.sin(th0), y: py - L * Math.cos(th0), vx: 0, vy: 0, mass: m, radius: ballRadius },
        { id: "bob2", x: x2 - L * Math.sin(th0), y: py - L * Math.cos(th0), vx: 0, vy: 0, mass: m, radius: ballRadius },
      ],
      forces: [
        { kind: "gravity", g },
        { kind: "coulomb", a: "bob1", b: "bob2", q1, q2: -q2 },
        { kind: "drag", body: "bob1", c: drag },
        { kind: "drag", body: "bob2", c: drag },
      ],
      constraints: [
        { kind: "rod", a: "anchor1", b: "bob1", length: L },
        { kind: "rod", a: "anchor2", b: "bob2", length: L },
      ],
      // Va chạm không nảy — nếu điện tích đủ mạnh để kéo 2 quả cầu chạm nhau,
      // chúng áp sát rồi dừng hẳn thay vì bật qua lại (lực hút vẫn còn nên nảy
      // đàn hồi sẽ dội qua dội lại mãi).
      restitution: 0,
    };
  },
  bodyLabels: { bob1: "1", bob2: "2" },
  analysis: {
    landmarks: [
      {
        key: "tha-ra",
        label: "Lúc thả ra",
        description: "Lực Coulomb ban đầu, tính từ khoảng cách lúc thả (góc nghiêng nhỏ ban đầu).",
        atTime: () => 0,
        values: (p) => {
          const d = (p.d ?? 35) / 100;
          const L = (p.L ?? 20) / 100;
          const q1 = (p.q1 ?? 0.1) * 1e-6;
          const q2 = (p.q2 ?? 0.1) * 1e-6;
          const r0 = d - 2 * L * Math.sin(0.1);
          const F = (8.99e9 * q1 * q2) / (r0 * r0);
          return [{ label: "Lực Coulomb F = ke·q1q2/r²", value: (F * 1000).toFixed(2), unit: "mN" }];
        },
      },
      {
        key: "on-dinh",
        label: "Trạng thái ổn định (sau khi tắt dần)",
        description: "Nghiêng vào giữa và đứng yên; nếu điện tích đủ mạnh, 2 quả cầu áp sát nhau và dừng lại.",
        atTime: () => 6,
        values: (p) => {
          const d = (p.d ?? 35) / 100;
          const L = (p.L ?? 20) / 100;
          const q1 = (p.q1 ?? 0.1) * 1e-6;
          const q2 = (p.q2 ?? 0.1) * 1e-6;
          const m = (p.m ?? 1) / 1000;
          const g = p.g ?? 9.8;
          // Xấp xỉ góc nhỏ như nhiem-dien-day.ts, coi khoảng cách 2 quả cầu ≈ d
          // (đúng khi độ lệch còn nhỏ so với d) để ước lượng nhanh — không phải
          // nghiệm chính xác của hệ 2 giá treo riêng biệt.
          const F0 = (8.99e9 * q1 * q2) / (d * d);
          const th = Math.atan(F0 / (m * g));
          return [
            { label: "Góc nghiêng ước lượng θ", value: ((th * 180) / Math.PI).toFixed(1), unit: "°" },
            { label: "Độ lệch mỗi quả cầu ≈ L·sinθ", value: (L * Math.sin(th) * 100).toFixed(1), unit: "cm" },
          ];
        },
      },
    ],
  },
};
