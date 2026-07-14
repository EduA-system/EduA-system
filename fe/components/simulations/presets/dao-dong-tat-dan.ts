import type { Preset } from "./types";

export const daoDongTatDan: Preset = {
  id: "dao-dong-tat-dan",
  title: "Dao động tắt dần",
  domain: "Dao động & Sóng",
  grade: 11,
  desc: "Lò xo ngang dao động trong môi trường có lực cản, biên độ giảm dần theo thời gian.",
  objective: "Hiểu dao động tắt dần: lực cản tỉ lệ vận tốc làm cơ năng giảm, biên độ tắt dần.",
  sgkRef: "Vật lí 11",
  params: [
    { key: "k", label: "Độ cứng lò xo", unit: "N/m", min: 5, max: 80, step: 1, default: 30 },
    { key: "m", label: "Khối lượng", unit: "kg", min: 0.2, max: 3, step: 0.1, default: 1 },
    { key: "c", label: "Hệ số cản", unit: "N·s/m", min: 0, max: 3, step: 0.1, default: 0.6 },
    { key: "A", label: "Biên độ đầu", unit: "m", min: 0.1, max: 1.2, step: 0.05, default: 0.7 },
  ],
  applyParams: (p) => {
    const k = p.k ?? 30, m = p.m ?? 1, c = p.c ?? 0.6, A = p.A ?? 0.7;
    const rest = 1; // chiều dài tự nhiên
    return {
      bodies: [
        { id: "anchor", x: 0, y: 0, vx: 0, vy: 0, mass: 1, fixed: true },
        { id: "bob", x: rest + A, y: 0, vx: 0, vy: 0, mass: m }, // kéo giãn A theo trục x
      ],
      forces: [
        { kind: "spring", a: "anchor", b: "bob", k, restLength: rest, damping: 0 },
        { kind: "drag", body: "bob", c }, // lực cản môi trường → tắt dần
      ],
      constraints: [],
    };
  },
  analysis: {
    landmarks: [
      {
        key: "start",
        label: "Biên ban đầu",
        description: "Lúc thả — biên độ A, tốc độ = 0.",
        atTime: () => 0,
        values: (p) => {
          const k = p.k ?? 30;
          const m = p.m ?? 1;
          const c = p.c ?? 0.6;
          const omega0 = Math.sqrt(k / m);
          const gamma = c / (2 * m);
          const wd2 = omega0 * omega0 - gamma * gamma;
          return [
            { label: "Tần số riêng ω₀", value: omega0.toFixed(2), unit: "rad/s" },
            { label: "Tần số tắt dần ω_d", value: wd2 > 0 ? Math.sqrt(wd2).toFixed(2) : "—", unit: "rad/s" },
          ];
        },
      },
      {
        key: "decay",
        label: "Sau 3 chu kỳ",
        description: "Biên độ giảm dần theo hàm mũ.",
        atTime: (p) => {
          const k = p.k ?? 30;
          const m = p.m ?? 1;
          const c = p.c ?? 0.6;
          const omega0 = Math.sqrt(k / m);
          const gamma = c / (2 * m);
          const wd2 = omega0 * omega0 - gamma * gamma;
          const T = wd2 > 0 ? (2 * Math.PI) / Math.sqrt(wd2) : (2 * Math.PI) / omega0;
          return 3 * T;
        },
        values: (p) => {
          const k = p.k ?? 30;
          const m = p.m ?? 1;
          const c = p.c ?? 0.6;
          const A = p.A ?? 0.7;
          const gamma = c / (2 * m);
          const omega0 = Math.sqrt(k / m);
          const wd2 = omega0 * omega0 - gamma * gamma;
          const T = wd2 > 0 ? (2 * Math.PI) / Math.sqrt(wd2) : (2 * Math.PI) / omega0;
          const t3 = 3 * T;
          return [
            { label: "Hệ số tắt γ = c/2m", value: gamma.toFixed(3), unit: "1/s" },
            { label: "Biên độ dự đoán A(3T)", value: (A * Math.exp(-gamma * t3) * 100).toFixed(1), unit: "cm" },
          ];
        },
      },
    ],
  },
};
