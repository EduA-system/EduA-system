import type { HeatTransferPreset } from "./types";

export const nguyenLyTruyenNhiet: HeatTransferPreset = {
  kind: "heat-transfer",
  id: "nguyen-ly-truyen-nhiet",
  title: "Nguyên lý truyền nhiệt",
  domain: "Nhiệt & Khí",
  grade: 10,
  desc: "Quan sát nhiệt lượng truyền từ vật nóng sang vật lạnh cho đến khi đạt cân bằng nhiệt.",
  objective: "Nhiệt truyền từ vật có nhiệt độ cao sang vật có nhiệt độ thấp; tốc độ giảm dần khi hai nhiệt độ tiến gần nhau.",
  sgkRef: "Vật lí 10 — Năng lượng nhiệt",
  params: [],
  applyParams: () => ({}),
};
