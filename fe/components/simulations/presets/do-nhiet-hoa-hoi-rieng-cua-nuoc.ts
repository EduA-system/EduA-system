import type { WaterVaporizationPreset } from "./types";
export const doNhietHoaHoiRiengCuaNuoc: WaterVaporizationPreset = {
  kind: "water-vaporization",
  id: "do-nhiet-hoa-hoi-rieng-l-cua-nuoc",
  title: "Đo nhiệt hoá hơi riêng L của nước",
  domain: "Nhiệt & Khí",
  grade: 12,
  desc: "Dùng điện năng làm nước sôi hoá hơi và đo khối lượng nước chuyển thể để xác định L.",
  objective:
    "Đo U, I, t và độ giảm khối lượng nước để tính L = UIt/Δm, đồng thời đánh giá hao phí nhiệt.",
  sgkRef: "Vật lí 12 – Thực hành đo nhiệt hoá hơi riêng của nước",
  params: [],
  applyParams: () => ({}),
};
