import type { Preset } from "./types";

export const bienThienDongDienBangBienTroKhoaK: Preset = {
  id: "bien-thien-dong-dien-bang-bien-tro-khoa-k",
  kind: "variable-current-induction",
  title: "Biến thiên dòng điện bằng biến trở/khoá K",
  domain: "Điện & Từ",
  grade: 12,
  desc: "Quan sát đồng thời điện áp u(t) và cường độ dòng điện i(t) trong mạch xoay chiều khi đóng khoá K hoặc điều chỉnh biến trở X.",
  objective: "Nhận biết u và i biến thiên điều hoà, cùng pha trong đoạn mạch thuần trở; kiểm chứng biên độ dòng điện giảm khi điện trở tăng.",
  sgkRef: "Vật lí 12 - Dòng điện xoay chiều",
  startPaused: false,
  params: [
    { key: "frequency", label: "Tần số nguồn điện", unit: "Hz", min: 5, max: 20, step: 1, default: 10 },
    { key: "peakVoltage", label: "Điện áp cực đại U₀", unit: "V", min: 2, max: 10, step: 0.5, default: 5 },
    { key: "resistance", label: "Điện trở của biến trở X", unit: "Ω", min: 100, max: 300, step: 5, default: 125 },
  ],
  quickPresets: [
    { label: "Dòng điện lớn", params: { peakVoltage: 6, resistance: 75 } },
    { label: "Dòng điện nhỏ", params: { peakVoltage: 4, resistance: 250 } },
  ],
  applyParams: (p) => {
    const frequency = p.frequency ?? 10;
    return {
      kind: "variable-current-induction" as const,
      frequency,
      peakVoltage: p.peakVoltage ?? 5,
      resistance: p.resistance ?? 125,
      graphDuration: 0.6,
      visualTimeScale: 0.42,
    };
  },
  analysis: {
    landmarks: [
      {
        key: "closed-circuit",
        label: "Khoá K đóng",
        description: "Mạch kín: vôn kế và ampe kế ghi nhận hai đại lượng biến thiên điều hoà cùng tần số và cùng pha.",
        values: (p) => [
          { label: "Tần số f", value: String(p.frequency ?? 10), unit: "Hz" },
          { label: "Chu kì T = 1/f", value: (1 / (p.frequency ?? 10)).toFixed(3), unit: "s" },
          { label: "Điện áp cực đại U₀", value: String(p.peakVoltage ?? 5), unit: "V" },
        ],
      },
      {
        key: "resistance-effect",
        label: "Điều chỉnh biến trở X",
        description: "Khi tăng điện trở, biên độ dòng điện I₀ = U₀/R giảm; dạng và tần số của hai dao động không đổi.",
        values: (p) => [
          { label: "Điện trở của biến trở X", value: String(p.resistance ?? 125), unit: "Ω" },
          { label: "Quan hệ pha", value: "u và i cùng pha", unit: "" },
        ],
      },
    ],
  },
};
