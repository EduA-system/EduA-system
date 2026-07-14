// Module CHẤT LƯU TĨNH — TÁCH HẲN khỏi kernel cơ học 2D.
//
// Áp suất chất lỏng theo độ sâu và bình thông nhau KHÔNG phải chuyển động chất
// điểm (không có lực/ràng buộc/va chạm để tích phân), nên không dùng kernel
// cơ học. Mỗi thí nghiệm ở đây là một "FluidSim": khai báo tham số + một khung
// hình SVG vẽ trạng thái tĩnh tính bằng công thức đại số (p = ρgh, mực cân bằng).
//
// Cố ý dùng lại `PresetParam` (slider) và `LandmarkValue` (bảng phân tích) của
// tầng preset để hub hiển thị nhất quán, nhưng KHÔNG phụ thuộc kernel.

import type { ReactNode } from "react";
import type { PresetParam, Domain, LandmarkValue } from "../presets/types";

export type { Domain } from "../presets/types";

/** Một nhóm giá trị hiển thị ở panel phân tích (tĩnh — không có mốc thời gian). */
export type FluidReading = {
  key: string;
  label: string;
  description: string;
  values: (p: Record<string, number>) => LandmarkValue[];
};

export type FluidSim = {
  id: string;
  title: string;
  domain: Domain;
  grade: 10 | 11 | 12;
  desc: string;
  objective: string;
  sgkRef?: string;
  params: PresetParam[];
  // Khung hình: vẽ trạng thái tĩnh từ tham số. Nhận cả bề rộng/cao khung vẽ để
  // co giãn theo khung chứa. Trả về nội dung SVG (đặt trong <svg> của khung).
  Stage: (props: { params: Record<string, number>; width: number; height: number }) => ReactNode;
  analysis?: { readings: FluidReading[] };
};
