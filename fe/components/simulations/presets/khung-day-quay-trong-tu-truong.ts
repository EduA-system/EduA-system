import type { Preset } from "./types";

const DEG_TO_RAD = Math.PI / 180;

export const khungDayQuayTrongTuTruong: Preset = {
  id: "khung-day-quay-trong-tu-truong",
  kind: "magnetic-loop",
  title: "Khung dây quay trong từ trường",
  domain: "Điện & Từ",
  grade: 12,
  desc: "Máy phát xoay chiều: khung MNPQ quay giữa hai cực từ, cấp điện cho tải qua vành trượt.",
  objective: "Quan sát từ thông, suất điện động hình sin và hai lực từ cản chuyển động theo định luật Lenz.",
  sgkRef: "Vật lí 11 - Khung dây quay trong từ trường và cảm ứng điện từ",
  startPaused: true,
  params: [
    { key: "magneticField", label: "Cảm ứng từ", unit: "T", min: 0, max: 0.8, step: 0.01, default: 0.3 },
    { key: "speedRpm", label: "Tốc độ quay", unit: "vòng/phút", min: 10, max: 180, step: 5, default: 60 },
    { key: "turns", label: "Số vòng dây", unit: "vòng", min: 5, max: 100, step: 5, default: 30 },
    { key: "widthCm", label: "Chiều rộng khung", unit: "cm", min: 6, max: 24, step: 1, default: 12 },
    { key: "heightCm", label: "Chiều cao khung", unit: "cm", min: 10, max: 30, step: 1, default: 18 },
    { key: "loadResistance", label: "Điện trở tải", unit: "Ω", min: 1, max: 50, step: 1, default: 10 },
    { key: "initialAngleDeg", label: "Góc α ban đầu", unit: "°", min: 0, max: 180, step: 5, default: 25 },
  ],
  quickPresets: [
    { label: "Quay chậm", params: { speedRpm: 25 } },
    { label: "Điện áp lớn", params: { speedRpm: 140, magneticField: 0.6, turns: 80 } },
    { label: "Tải nhẹ", params: { loadResistance: 40 } },
  ],
  applyParams: (p) => ({
    kind: "magnetic-loop" as const,
    width: (p.widthCm ?? 12) / 100,
    height: (p.heightCm ?? 18) / 100,
    mass: 0.08,
    turns: Math.round(p.turns ?? 30),
    current: 0,
    magneticField: p.magneticField ?? 0.3,
    driveAngularVelocity: ((p.speedRpm ?? 60) * 2 * Math.PI) / 60,
    loadResistance: p.loadResistance ?? 10,
    angularDamping: 0,
    initialAngle: (p.initialAngleDeg ?? 25) * DEG_TO_RAD,
  }),
  analysis: {
    landmarks: [
      {
        key: "suat-dien-dong-cuc-dai",
        label: "Suất điện động cực đại",
        description: "Điện áp đạt biên độ khi pháp tuyến n vuông góc B và bằng 0 khi n song song B.",
        values: (p) => {
          const area = ((p.widthCm ?? 12) * (p.heightCm ?? 18)) / 10000;
          const omega = ((p.speedRpm ?? 60) * 2 * Math.PI) / 60;
          const emfMax = Math.round(p.turns ?? 30) * (p.magneticField ?? 0.3) * area * omega;
          return [{ label: "E₀ = NBAω", value: emfMax.toFixed(3), unit: "V" }];
        },
      },
      {
        key: "luc-tu-hai-canh",
        label: "Lực từ trên MN và QP",
        description: "Dòng cảm ứng tạo hai lực từ cùng độ lớn, ngược chiều. Mô-men của chúng chống lại chuyển động quay.",
        values: (p) => {
          const area = ((p.widthCm ?? 12) * (p.heightCm ?? 18)) / 10000;
          const omega = ((p.speedRpm ?? 60) * 2 * Math.PI) / 60;
          const alpha = (p.initialAngleDeg ?? 25) * DEG_TO_RAD;
          const emf = Math.round(p.turns ?? 30) * (p.magneticField ?? 0.3) * area * omega * Math.sin(alpha);
          const current = emf / Math.max(p.loadResistance ?? 10, 1e-9);
          const force = Math.round(p.turns ?? 30) * Math.abs(current) * ((p.heightCm ?? 18) / 100) * (p.magneticField ?? 0.3);
          return [{ label: "F₀ = NI₀lB", value: force.toFixed(3), unit: "N" }];
        },
      },
    ],
  },
};
