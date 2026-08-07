import type { RutherfordNitrogenPreset } from "./types";
import { DEFAULT_RUTHERFORD_PARAMS } from "../engines/rutherford-nitrogen/constants";

export const rutherfordBienDoiHatNhanNito: RutherfordNitrogenPreset = {
  kind: "rutherford-nitrogen",
  id: "rutherford-bien-doi-hat-nhan-nito",
  title: "Rutherford biến đổi hạt nhân nitơ",
  domain: "Hạt nhân",
  grade: 12,
  desc: "Mô phỏng nguồn α, buồng khí, lớp hấp thụ và chớp ZnS trong thí nghiệm Rutherford; giải thích phản ứng ¹⁴₇N + ⁴₂He → ¹⁷₈O + ¹₁H.",
  objective: "Phân biệt điều Rutherford quan sát trực tiếp với mô hình hạt nhân hiện đại, đồng thời giải thích vai trò của lớp hấp thụ và màn ZnS.",
  sgkRef: "Vật lí 12 — Vật lí hạt nhân",
  params: [],
  applyParams: (params) => ({ ...DEFAULT_RUTHERFORD_PARAMS, ...params }),
};
