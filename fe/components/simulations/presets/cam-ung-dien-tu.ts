import type { Preset } from "./types";
import { DEFAULT_ELECTROMAGNETIC_INDUCTION_PARAMS } from "../engines/electromagnetic-induction/constants";

export const camUngDienTu: Preset = {
  id: "cam-ung-dien-tu",
  kind: "electromagnetic-induction",
  title: "Cảm ứng điện từ",
  domain: "Điện & Từ",
  grade: 11,
  desc: "Di chuyển nam châm qua cuộn dây để theo dõi từ thông, suất điện động, dòng cảm ứng và chiều chống lại biến thiên từ thông theo Lenz.",
  objective: "Liên hệ chuyển động của nam châm với d(NΦ)/dt, suất điện động Faraday, chiều dòng cảm ứng và số chỉ điện kế.",
  sgkRef: "Vật lí 11 — Cảm ứng điện từ",
  params: [
    { key: "turns", label: "Số vòng dây", unit: "vòng", min: 20, max: 240, step: 10, default: DEFAULT_ELECTROMAGNETIC_INDUCTION_PARAMS.turns },
    { key: "magnetStrength", label: "Độ mạnh nam châm", unit: "tương đối", min: 0.5, max: 2.5, step: 0.1, default: DEFAULT_ELECTROMAGNETIC_INDUCTION_PARAMS.magnetStrength },
    { key: "resistance", label: "Điện trở toàn mạch", unit: "Ω", min: 1, max: 20, step: 0.5, default: DEFAULT_ELECTROMAGNETIC_INDUCTION_PARAMS.resistance },
    { key: "coilRadius", label: "Bán kính cuộn dây", unit: "mô phỏng", min: 0.24, max: 0.58, step: 0.01, default: DEFAULT_ELECTROMAGNETIC_INDUCTION_PARAMS.coilRadius },
    { key: "motionAmplitude", label: "Biên độ chuyển động", unit: "mô phỏng", min: 1.2, max: 2.6, step: 0.1, default: DEFAULT_ELECTROMAGNETIC_INDUCTION_PARAMS.motionAmplitude },
    { key: "motionFrequency", label: "Tần số chuyển động", unit: "Hz", min: 0.04, max: 0.25, step: 0.01, default: DEFAULT_ELECTROMAGNETIC_INDUCTION_PARAMS.motionFrequency },
  ],
  quickPresets: [
    { label: "Chuyển động chậm", params: { motionFrequency: 0.06 } },
    { label: "Chuyển động nhanh", params: { motionFrequency: 0.22 } },
    { label: "Cuộn ít vòng", params: { turns: 40 } },
    { label: "Cuộn nhiều vòng", params: { turns: 200 } },
    { label: "Nam châm yếu", params: { magnetStrength: 0.6 } },
    { label: "Nam châm mạnh", params: { magnetStrength: 2.3 } },
    { label: "Điện trở lớn", params: { resistance: 18 } },
    { label: "Mặc định", params: DEFAULT_ELECTROMAGNETIC_INDUCTION_PARAMS },
  ],
  applyParams: (p) => ({
    kind: "electromagnetic-induction" as const,
    coilX: 0,
    coilY: 0,
    coilRadius: p.coilRadius ?? DEFAULT_ELECTROMAGNETIC_INDUCTION_PARAMS.coilRadius,
    turns: p.turns ?? DEFAULT_ELECTROMAGNETIC_INDUCTION_PARAMS.turns,
    resistance: p.resistance ?? DEFAULT_ELECTROMAGNETIC_INDUCTION_PARAMS.resistance,
    magnetStartX: p.motionAmplitude ?? DEFAULT_ELECTROMAGNETIC_INDUCTION_PARAMS.motionAmplitude,
    magnetStrength: p.magnetStrength ?? DEFAULT_ELECTROMAGNETIC_INDUCTION_PARAMS.magnetStrength,
    meterSensitivity: 0.86,
    meterDamping: 8.5,
    motionAmplitude: p.motionAmplitude ?? DEFAULT_ELECTROMAGNETIC_INDUCTION_PARAMS.motionAmplitude,
    motionFrequency: p.motionFrequency ?? DEFAULT_ELECTROMAGNETIC_INDUCTION_PARAMS.motionFrequency,
    poleOrientation: p.poleOrientation < 0 ? -1 : 1,
    maxMagnetSpeed: 6,
  }),
  analysis: {
    landmarks: [{
      key: "faraday-lenz",
      label: "Định luật Faraday–Lenz",
      description: "Từ thông Φ được tính cho một vòng; tổng liên kết từ thông là NΦ. Suất điện động ε = −d(NΦ)/dt, còn dòng cảm ứng phụ thuộc thêm điện trở toàn mạch.",
      values: (p) => [
        { label: "Số vòng dây N", value: String(p.turns ?? DEFAULT_ELECTROMAGNETIC_INDUCTION_PARAMS.turns), unit: "vòng" },
        { label: "Điện trở R", value: String(p.resistance ?? DEFAULT_ELECTROMAGNETIC_INDUCTION_PARAMS.resistance), unit: "Ω" },
      ],
    }],
  },
};
