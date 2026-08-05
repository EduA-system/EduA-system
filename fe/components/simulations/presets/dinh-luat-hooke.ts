import type { HookeLawPreset } from "./types";

export const dinhLuatHooke: HookeLawPreset = {
  kind: "hooke-law",
  id: "dinh-luat-hooke",
  title: "Định luật Hooke — Kéo giãn và nén lò xo",
  domain: "Cơ học",
  grade: 10,
  desc: "So sánh độ biến dạng của cùng một lò xo khi thả vật kéo giãn và khi đặt vật nặng lên trên để nén lò xo.",
  objective:
    "Quan sát hướng lực đàn hồi và kiểm chứng trong giới hạn đàn hồi: độ lớn lực đàn hồi tỉ lệ thuận với độ biến dạng của lò xo.",
  sgkRef: "Vật lí 10 — Định luật Hooke",
  startPaused: true,
  params: [
    {
      key: "springConstant",
      label: "k (Độ cứng lò xo)",
      unit: "N/m",
      min: 50,
      max: 160,
      step: 5,
      default: 80,
    },
    {
      key: "mass",
      label: "m (Khối lượng vật treo)",
      unit: "kg",
      min: 0.1,
      max: 0.4,
      step: 0.05,
      default: 0.2,
    },
    {
      key: "compressionMass",
      label: "m₂ (Khối lượng vật đè lò xo)",
      unit: "kg",
      min: 0.1,
      max: 1,
      step: 0.1,
      default: 0.2,
    },
    {
      key: "naturalLength",
      label: "l₀ (Chiều dài tự nhiên của lò xo)",
      unit: "m",
      min: 0.16,
      max: 0.32,
      step: 0.01,
      default: 0.24,
    },
  ],
  applyParams: (params) => ({
    springConstant: params.springConstant ?? 80,
    mass: params.mass ?? 0.2,
    compressionMass: params.compressionMass ?? 1,
    naturalLength: params.naturalLength ?? 0.24,
  }),
};
