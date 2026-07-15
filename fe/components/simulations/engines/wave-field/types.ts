import type { WaveParams } from "./physics";

export type DisplayMode = "educational" | "average" | "instantaneous";

/**
 * Scene cho mô hình giao thoa Y-âng ĐẦY ĐỦ — khác wave/types.ts (giao thoa
 * sóng nước) ở chỗ renderer KHÔNG vẽ đường/thanh trang trí: mọi vùng sáng/tối
 * tính trực tiếp từ physics.ts (averageIntensityCausal/instantaneousFieldCausal/
 * screenIntensity) mỗi khung hình hoặc mỗi lần tham số đổi — CÓ NHÂN QUẢ (sóng
 * cần thời gian truyền tới mới xuất hiện, xem physics.ts).
 */
export type WaveFieldScene = WaveParams & {
  kind: "wave-field";
  xSingleSlit: number; // vị trí khe hẹp S theo x (world) — luôn < xSlits
  xSlits: number; // vị trí khe kép S1,S2 theo x (world) — D đo từ đây
  displayMode: DisplayMode;
  smallAngleApprox: boolean; // θ trên màn: atan2 chính xác (false) hay xấp xỉ y/D (true)
  propagationMode: boolean; // true = sóng lan có nhân quả (Propagation mode); false = trạng thái đã ổn định (Steady-state mode)
  visualXCompression: boolean; // true = nén trục x hiển thị (Auto fit geometry) để màn không dạt quá xa/quá gần — CHỈ áp dụng ở chế độ Sơ đồ giáo dục (xem scene-canvas-wave-field.tsx)
};
