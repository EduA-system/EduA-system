import type { OscilloscopeFrequencyPreset } from "./types";

export const doTanSoBangDaoDongKi: OscilloscopeFrequencyPreset = {
  id: "do-tan-so-bang-dao-dong-ki",
  kind: "oscilloscope-frequency",
  title: "Đo tần số bằng dao động kí",
  domain: "Dao động & Sóng",
  grade: 11,
  desc: "Gõ âm thoa, thu âm bằng micro và đo chu kì của tín hiệu trên màn hình dao động kí để xác định tần số.",
  objective: "Hiểu cách micro biến âm thành tín hiệu điện và xác định tần số bằng công thức T = Δt/N, f = N/Δt.",
  sgkRef: "Vật lí 11 — Sóng âm và thực hành đo tần số",
  params: [],
  applyParams: () => ({}),
};
