import type { Preset } from "./types";

// Hệ số quy đổi để VẼ vector (renderer vẽ theo world-units, m).
const V_TO_M = 0.12; // 1 m/s ↦ 0.12 m
const F_TO_M = 0.12; // 1 N ↦ 0.12 m trước khi giới hạn theo bán kính

function values(p: Record<string, number>) {
  const r = p.r ?? 1.2;
  const omega = p.omega ?? 2.5;
  const m = p.m ?? 0.5;
  const v = omega * r; // tốc độ dài (tiếp tuyến)
  const aHt = omega * omega * r; // gia tốc hướng tâm = v²/r = ω²r
  const Fht = m * aHt; // lực hướng tâm = mω²r
  const T = (2 * Math.PI) / omega; // chu kỳ
  return { r, omega, m, v, aHt, Fht, T };
}

export const lucHuongTam: Preset = {
  id: "luc-huong-tam",
  title: "Lực hướng tâm: quay vật trên dây",
  domain: "Cơ học",
  grade: 10,
  desc: "Vật buộc vào dây quay tròn đều trên mặt phẳng ngang (nhìn từ trên), khảo sát lực hướng tâm giữ vật trên quỹ đạo tròn.",
  objective:
    "Hiểu chuyển động tròn đều cần lực hướng tâm hướng vào tâm với độ lớn Fht = mv²/r = mω²r; lực này do dây căng cung cấp. Vận tốc luôn tiếp tuyến quỹ đạo. Nếu dây đứt, vật văng theo phương tiếp tuyến. Bỏ qua trọng lực vì nhìn từ trên xuống.",
  sgkRef: "Vật lí 10, Bài 32",
  minimalOverlay: true,
  params: [
    { key: "r", label: "Bán kính quỹ đạo", unit: "m", min: 0.5, max: 2, step: 0.1, default: 1.2 },
    { key: "omega", label: "Tốc độ góc ω", unit: "rad/s", min: 0.5, max: 5, step: 0.1, default: 2.5 },
    { key: "m", label: "Khối lượng vật", unit: "kg", min: 0.1, max: 2, step: 0.1, default: 0.5 },
  ],
  applyParams: (p) => {
    const { r, v, Fht } = values(p);
    const cx = 0, cy = 2;
    const tangentLength = Math.min(r * 0.68, Math.max(r * 0.4, v * V_TO_M));
    const tensionLength = Math.min(r * 0.72, Math.max(r * 0.42, Fht * F_TO_M));
    // Vật đặt tại (r, 0) so với tâm, vận tốc đầu (0, v) — vuông góc bán kính →
    // rod giữ khoảng cách r, kernel tự sinh chuyển động tròn đều. KHÔNG trọng lực.
    return {
      bodies: [
        { id: "tam", x: cx, y: cy, vx: 0, vy: 0, mass: 1, fixed: true, radius: 0.08, visual: { shape: "pulley", color: "#94a3b8", label: "O" } },
        {
          id: "vat",
          x: cx + r,
          y: cy,
          vx: 0,
          vy: v, // vận tốc tiếp tuyến (vuông góc bán kính)
          mass: p.m ?? 0.5,
          radius: 0.16,
          visual: { shape: "pendulumBob", color: "#2dd4bf", label: "m" },
        },
      ],
      forces: [], // không trọng lực: mặt phẳng ngang nhìn từ trên
      constraints: [{ kind: "rod", a: "tam", b: "vat", length: r }],
      // Vector vận tốc tiếp tuyến và lực căng dọc dây được renderer xoay theo
      // trạng thái thật ở mỗi frame. Độ dài mỗi vector giữ nguyên trong một lượt.
      annotations: [
        {
          kind: "circularMotionVectors",
          center: "tam",
          body: "vat",
          tangentLength,
          tensionLength,
          tangentColor: "#38bdf8",
          tensionColor: "#f59e0b",
          tangentLabel: "v",
          tensionLabel: "T",
          orbitColor: "#475569",
        },
      ],
      // Khung nhìn cố định: quỹ đạo tròn bán kính r quanh tâm (0, 2).
      view: { minX: -r - 0.6, maxX: r + 0.6, minY: 0, maxY: cy + r + 0.6 },
      disableDragging: true,
    };
  },
  analysis: {
    landmarks: [
      {
        key: "speed",
        label: "Tốc độ dài và chu kỳ",
        description: "Trong chuyển động tròn đều, tốc độ dài liên hệ tốc độ góc qua v = ω·r; vật đi hết một vòng trong chu kỳ T = 2π/ω. Vận tốc có độ lớn không đổi nhưng hướng luôn thay đổi (tiếp tuyến quỹ đạo).",
        atTime: () => 0,
        values: (p) => {
          const { v, omega, T } = values(p);
          return [
            { label: "Tốc độ dài v = ωr", value: v.toFixed(2), unit: "m/s" },
            { label: "Tốc độ góc ω", value: omega.toFixed(2), unit: "rad/s" },
            { label: "Chu kỳ T = 2π/ω", value: T.toFixed(2), unit: "s" },
          ];
        },
      },
      {
        key: "centripetal",
        label: "Gia tốc và lực hướng tâm",
        description: "Vì hướng vận tốc luôn đổi nên vật có gia tốc hướng vào tâm aht = v²/r = ω²r. Lực gây ra gia tốc này là lực hướng tâm Fht = m·aht, do dây căng cung cấp và luôn hướng từ vật về tâm.",
        values: (p) => {
          const { aHt, Fht } = values(p);
          return [
            { label: "Gia tốc hướng tâm aht = ω²r", value: aHt.toFixed(2), unit: "m/s²" },
            { label: "Lực hướng tâm Fht = mω²r", value: Fht.toFixed(2), unit: "N" },
          ];
        },
      },
      {
        key: "tangent",
        label: "Nếu dây đứt",
        description: "Lực hướng tâm chỉ đổi hướng vận tốc chứ không sinh công. Nếu dây đứt, lực hướng tâm biến mất: theo quán tính vật chuyển động thẳng đều theo phương tiếp tuyến với quỹ đạo tại điểm đó.",
        values: (p) => {
          const { v } = values(p);
          return [
            { label: "Vận tốc lúc văng", value: v.toFixed(2), unit: "m/s" },
            { label: "Hướng", value: "tiếp tuyến quỹ đạo", unit: "" },
          ];
        },
      },
    ],
  },
};
