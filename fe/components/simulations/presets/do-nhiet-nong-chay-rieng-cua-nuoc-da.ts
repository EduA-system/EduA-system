import type { IceFusionPreset } from "./types";

export const doNhietNongChayRiengCuaNuocDa: IceFusionPreset = {
  kind: "ice-fusion",
  id: "do-nhiet-nong-chay-rieng-lambda-cua-nuoc-da",
  title: "Đo nhiệt nóng chảy riêng λ của nước đá",
  domain: "Nhiệt & Khí",
  grade: 12,
  desc: "Dùng dây nung làm tan nước đá và cân lượng nước thu được để xác định nhiệt nóng chảy riêng.",
  objective:
    "Đo U, I, t và khối lượng nước đá đã nóng chảy để tính λ = UIt/m, đồng thời đánh giá hao phí nhiệt.",
  sgkRef: "Vật lí 12 – Thực hành đo nhiệt nóng chảy riêng của nước đá",
  params: [],
  applyParams: () => ({}),
};
