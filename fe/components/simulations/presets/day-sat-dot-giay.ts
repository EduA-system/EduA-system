import type { ThermalWirePreset } from "./types";
export const daySatDotGiay: ThermalWirePreset = {
  kind: "thermal-wire",
  id: "tac-dung-nhiet-dong-dien-day-sat-dot-giay",
  title: "Tác dụng nhiệt của dòng điện – Dây sắt đốt cháy giấy",
  domain: "Điện & Từ",
  grade: 10,
  desc: "Quan sát dòng điện làm dây sắt nóng lên và đốt cháy các mảnh giấy.",
  objective:
    "Dòng điện qua dây dẫn tỏa nhiệt; nhiệt lượng đủ lớn làm giấy ám nâu rồi bắt cháy.",
  sgkRef: "Vật lí – Tác dụng nhiệt của dòng điện",
  params: [],
  applyParams: () => ({}),
};
