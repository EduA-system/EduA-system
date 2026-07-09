// Một "preset" = một thí nghiệm đã kiểm duyệt: schema tham số + hàm dựng Scene.
// Đây là tầng 2 (khai báo) ở dạng curated — vừa là thư viện kiểu PhET, vừa là
// "bản gốc bất khả xâm phạm" để người dùng chỉnh tham số / (sau này) nhờ AI sửa.
//
// applyParams là NGUỒN DUY NHẤT dựng Scene từ tham số — không bake Scene tĩnh
// (tránh trôi). Mỗi preset tự đọc `p.key ?? default` trong applyParams.

import type { Scene } from "../kernel/types";
import type { ParamDef } from "../param-panel";

export type Domain = "Cơ học" | "Dao động & Sóng" | "Điện & Từ" | "Nhiệt & Khí" | "Hạt nhân";

/** ParamDef của panel + giá trị mặc định cho preset. */
export type PresetParam = ParamDef & { default: number };

export type LandmarkValue = { label: string; value: string; unit?: string };

/**
 * Một "điểm giá trị quan trọng": trạng thái đặc biệt của thí nghiệm (biên, vị
 * trí cân bằng, đỉnh quỹ đạo, lúc va chạm…) — hiển thị giá trị lý thuyết chốt
 * tại đó. Nếu có `atTime`, panel hiện nút "Đi tới" — bấm sẽ tích phân kernel
 * xác định từ trạng thái đầu tới đúng giây đó rồi dừng lại để xem trực tiếp.
 */
export type Landmark = {
  key: string;
  label: string;
  description: string;
  values: (p: Record<string, number>) => LandmarkValue[];
  /** Thời điểm (giây, từ t=0) xảy ra trạng thái này. Bỏ qua nếu không áp dụng. */
  atTime?: (p: Record<string, number>) => number;
};

export type PresetAnalysis = {
  landmarks?: Landmark[];
};

export type Preset = {
  id: string;
  title: string;
  domain: Domain;
  grade: 10 | 11 | 12;
  desc: string; // mô tả ngắn cho thẻ thư viện
  objective: string; // mục tiêu học tập (hiển thị dưới sân khấu)
  sgkRef?: string; // tham chiếu SGK, vd "Vật lí 10 — Bài 7"
  params: PresetParam[];
  applyParams: (p: Record<string, number>) => Scene;
  // Điểm giá trị quan trọng (tuỳ chọn) — panel "Phân tích" còn hiện mốc thời
  // gian chung (1s, 2s…) cho MỌI preset, không phụ thuộc field này.
  analysis?: PresetAnalysis;
};
