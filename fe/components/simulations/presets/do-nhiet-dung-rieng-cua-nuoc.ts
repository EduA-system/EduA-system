import type { WaterCalorimetryPreset } from "./types";

export const doNhietDungRiengCuaNuoc: WaterCalorimetryPreset = {
  kind: "water-calorimetry",
  id: "do-nhiet-dung-rieng-c-cua-nuoc",
  title: "Đo nhiệt dung riêng c của nước",
  domain: "Nhiệt & Khí",
  grade: 12,
  desc: "Dùng năng lượng điện của dây nung để xác định nhiệt dung riêng của nước.",
  objective:
    "Đo U, I, thời gian và độ tăng nhiệt độ để tính c = UIt/(mΔT), đồng thời đánh giá sai số do thất thoát nhiệt.",
  sgkRef: "Vật lí 12 – Thực hành đo nhiệt dung riêng của nước",
  params: [],
  applyParams: () => ({}),
};
