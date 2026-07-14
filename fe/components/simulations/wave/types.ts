// Scene cho thí nghiệm SÓNG TRƯỜNG (field) — khác hẳn kernel Cơ học (kernel/types.ts):
// không có body/force/constraint để tích phân, biên độ là HÀM GIẢI TÍCH của
// (x, y, t) — chồng chập 2 sóng tròn kết hợp phát ra từ 2 nguồn điểm cùng pha.
// Vì vậy không tái dùng kernel ODE — renderer (scene-konva-wave-2d.tsx) tự vẽ
// trực tiếp từ công thức, không có bước "tích phân".

export type WaveSource = { id: string; x: number; y: number };

export type WaveScene = {
  kind: "wave";
  sources: [WaveSource, WaveSource];
  wavelength: number; // λ — khoảng cách 2 đỉnh sóng liên tiếp
  frequency: number; // f (Hz) — tốc độ truyền sóng v = λf, chỉ ảnh hưởng tốc độ hoạt ảnh
  fieldRadius: number; // bán kính vùng vẽ quanh trung điểm 2 nguồn
};
