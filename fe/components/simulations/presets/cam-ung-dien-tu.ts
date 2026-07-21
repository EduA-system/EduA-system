import type { Preset } from "./types";

export const camUngDienTu: Preset = {
  id: "cam-ung-dien-tu",
  kind: "electromagnetic-induction",
  title: "Cảm ứng điện từ",
  domain: "Điện & Từ",
  grade: 11,
  desc: "Di chuyển nam châm lại gần hoặc ra xa cuộn dây để quan sát kim điện kế lệch do dòng điện cảm ứng.",
  objective: "Nhận biết dòng điện cảm ứng chỉ xuất hiện khi từ thông qua cuộn dây biến thiên và đổi chiều khi đổi chiều chuyển động.",
  sgkRef: "Vật lí 11 — Cảm ứng điện từ",
  params: [
    { key: "turns", label: "Số vòng dây", unit: "vòng", min: 20, max: 200, step: 10, default: 80 },
    { key: "strength", label: "Độ mạnh nam châm", unit: "đv", min: 0.5, max: 2.5, step: 0.1, default: 1.2 },
    { key: "resistance", label: "Điện trở mạch", unit: "Ω", min: 1, max: 20, step: 1, default: 6 },
  ],
  quickPresets: [
    { label: "Cuộn ít vòng", params: { turns: 40 } },
    { label: "Cuộn nhiều vòng", params: { turns: 160 } },
  ],
  applyParams: (p) => ({
    kind: "electromagnetic-induction" as const,
    coilX: 0,
    coilY: 0,
    coilRadius: 0.42,
    turns: p.turns ?? 80,
    resistance: p.resistance ?? 6,
    magnetStartX: 2.35,
    magnetStrength: p.strength ?? 1.2,
    meterSensitivity: 0.42,
    meterDamping: 8,
  }),
  analysis: {
    landmarks: [{
      key: "faraday-lenz",
      label: "Định luật Faraday–Lenz",
      description: "Suất điện động cảm ứng tỉ lệ với tốc độ biến thiên từ thông. Khi nam châm dừng, từ thông không đổi nên kim trở về vạch 0.",
      values: (p) => [
        { label: "Số vòng dây N", value: String(p.turns ?? 80), unit: "vòng" },
        { label: "Điện trở R", value: String(p.resistance ?? 6), unit: "Ω" },
      ],
    }],
  },
};
