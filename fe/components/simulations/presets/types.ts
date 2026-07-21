// Một "preset" = một thí nghiệm đã kiểm duyệt: schema tham số + hàm dựng Scene.
// Đây là tầng 2 (khai báo) ở dạng curated — vừa là thư viện kiểu PhET, vừa là
// "bản gốc bất khả xâm phạm" để người dùng chỉnh tham số / (sau này) nhờ AI sửa.
//
// applyParams là NGUỒN DUY NHẤT dựng Scene từ tham số — không bake Scene tĩnh
// (tránh trôi). Mỗi preset tự đọc `p.key ?? default` trong applyParams.

import type { Scene } from "../engines/mechanics/types";
import type { WaveScene } from "../engines/wave/types";
import type { StringWaveScene } from "../engines/string-wave/types";
import type { WaveFieldScene } from "../engines/wave-field/types";
import type { PointChargeFieldScene } from "../engines/point-charge-field/types";
import type { RotationScene } from "../engines/rotation/types";
import type { MagneticLoopScene } from "../engines/magnetic-loop/types";
import type { MagneticScene } from "../engines/magnetism/types";
import type { ParallelCurrentSheetsScene } from "../engines/parallel-current-sheets/types";
import type { IronFilingsScene } from "../engines/iron-filings/types";
import type {
  ElectromagneticInductionScene,
  VariableCurrentInductionScene,
} from "../engines/electromagnetic-induction/types";
import type { ParamDef } from "../shared/param-panel";
import type { SceneAnnotation } from "../shared/scene-types";

export type Domain = "Cơ học" | "Dao động & Sóng" | "Quang học" | "Điện & Từ" | "Nhiệt & Khí" | "Hạt nhân";

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

type PresetBase = {
  id: string;
  title: string;
  domain: Domain;
  grade: 10 | 11 | 12;
  desc: string; // mô tả ngắn cho thẻ thư viện
  objective: string; // mục tiêu học tập (hiển thị dưới sân khấu)
  sgkRef?: string; // tham chiếu SGK, vd "Vật lí 10 — Bài 7"
  params: PresetParam[];
  // Bắt đầu ở trạng thái dừng để người học chủ động nhả cơ cấu ban đầu.
  startPaused?: boolean;
  // Điểm giá trị quan trọng (tuỳ chọn) — panel "Phân tích" còn hiện mốc thời
  // gian chung (1s, 2s…) cho MỌI preset, không phụ thuộc field này.
  analysis?: PresetAnalysis;
  // Nút bấm nhanh (tuỳ chọn) — set thẳng 1 bộ tham số minh hoạ 1 tình huống rõ
  // ràng (vd "Đẩy nhau" / "Hút nhau"), thay vì bắt người dùng tự dò slider mới
  // ra được. Hiện ngay trên tab Tham số, phía trên các slider.
  quickPresets?: { label: string; params: Record<string, number> }[];
};

/** Preset chạy trên engine mechanics 2D + renderer mechanics. */
export type MechanicsPreset = PresetBase & {
  kind?: "mechanics";
  applyParams: (p: Record<string, number>) => Scene;
  // Nhãn cố định gắn với từng vật (vd đánh số con lắc) — hiện LUÔN trên canvas,
  // bám theo vật khi di chuyển (khác annotations tĩnh), khác markLabel/ghostLabel
  // (chỉ hiện khi xem 1 mốc thời gian). Object tĩnh (đa số preset) hoặc hàm của
  // params khi nhãn cần phản ánh giá trị hiện tại (vd dấu điện tích q).
  bodyLabels?: Record<string, string> | ((p: Record<string, number>) => Record<string, string>);
  // Chú thích trực quan tuỳ chọn (mũi tên trường đều, nhãn +/− bản tụ…) — THUẦN
  // HIỂN THỊ, không ảnh hưởng vật lý. Toạ độ world tĩnh, không bám vật động.
  annotations?: (p: Record<string, number>) => SceneAnnotation[];
  // Màu riêng cho từng vật (id → mã màu) — TĨNH, giống bodyLabels (không phải
  // hàm của params) để tránh tạo reference mới mỗi render.
  bodyColors?: Record<string, string>;
  // Vệt chuyển động được renderer nối dần theo vị trí thật của từng vật.
  bodyTrails?: Record<string, { color?: string; width?: number; dash?: number[] }>;
  // Ký hiệu ngắn đè lên TÂM vật (vd "+"/"−"/"0" dấu điện tích), bám theo vật
  // khi di chuyển — khác bodyLabels (vẽ dưới vật). Object tĩnh hoặc hàm params.
  bodySigns?: Record<string, string> | ((p: Record<string, number>) => Record<string, string>);
  // Ẩn trục toạ độ/nhãn toạ độ debug (KHÔNG ẩn lưới nền) — dùng cho sơ đồ giáo
  // khoa tối giản tự vẽ mọi thứ qua annotations. Xem SceneKonva2D.
  minimalOverlay?: boolean;
  // Tắt thanh treo tự sinh của renderer cho các scene có giá đỡ riêng, như bập bênh.
  hideFixedSupportDecoration?: boolean;
};

/** Preset sóng trường (giao thoa…) — biên độ là hàm giải tích, xem engines/wave. */
export type WavePreset = PresetBase & {
  kind: "wave";
  applyParams: (p: Record<string, number>) => WaveScene;
};

/** Preset sóng cơ 1 chiều trên dây (sóng trên dây, sóng dừng) — xem engines/string-wave. */
export type StringWavePreset = PresetBase & {
  kind: "string-wave";
  applyParams: (p: Record<string, number>) => StringWaveScene;
};

/**
 * Preset giao thoa Y-âng ĐẦY ĐỦ — trường sóng thực tính từ phương trình sóng
 * (không vẽ vân trang trí), xem engines/wave-field.
 */
export type WaveFieldPreset = PresetBase & {
  kind: "wave-field";
  applyParams: (p: Record<string, number>) => WaveFieldScene;
};

/**
 * Preset điện phổ 2 điện tích điểm — chồng chất Coulomb THẬT, đường sức truy
 * vết bằng RK4 (không hardcode hình), xem engines/point-charge-field.
 */
export type PointChargeFieldPreset = PresetBase & {
  kind: "point-charge-field";
  applyParams: (p: Record<string, number>) => PointChargeFieldScene;
};

export type RotationPreset = PresetBase & {
  kind: "rotation";
  applyParams: (p: Record<string, number>) => RotationScene;
};

export type MagneticLoopPreset = PresetBase & {
  kind: "magnetic-loop";
  applyParams: (p: Record<string, number>) => MagneticLoopScene;
};

export type MagneticPreset = PresetBase & {
  kind: "magnetism";
  applyParams: (p: Record<string, number>) => MagneticScene;
};

export type ParallelCurrentSheetsPreset = PresetBase & {
  kind: "parallel-current-sheets";
  applyParams: (p: Record<string, number>) => ParallelCurrentSheetsScene;
};

export type IronFilingsPreset = PresetBase & { kind: "iron-filings"; applyParams: (p: Record<string, number>) => IronFilingsScene; };

export type ElectromagneticInductionPreset = PresetBase & { kind: "electromagnetic-induction"; applyParams: (p: Record<string, number>) => ElectromagneticInductionScene; };

export type VariableCurrentInductionPreset = PresetBase & { kind: "variable-current-induction"; applyParams: (p: Record<string, number>) => VariableCurrentInductionScene; };

export type Preset = MechanicsPreset | WavePreset | StringWavePreset | WaveFieldPreset | PointChargeFieldPreset | RotationPreset | MagneticLoopPreset | MagneticPreset | ParallelCurrentSheetsPreset | IronFilingsPreset | ElectromagneticInductionPreset | VariableCurrentInductionPreset;
