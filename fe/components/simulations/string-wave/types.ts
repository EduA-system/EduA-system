// Scene cho sóng cơ 1 chiều trên dây (sóng trên dây truyền đi, sóng dừng) —
// cũng là hàm giải tích của (x, t) như wave/types.ts (giao thoa sóng nước),
// KHÔNG dùng kernel ODE. Khác giao thoa nước ở chỗ đây là 1D (dọc theo dây),
// không phải trường 2D từ 2 nguồn điểm.

export type StringWaveMode = "traveling" | "standing";

export type StringWaveScene = {
  kind: "string-wave";
  mode: StringWaveMode;
  length: number; // độ dài hiển thị dọc trục x — traveling: cửa sổ quan sát; standing: chiều dài dây thật (2 đầu cố định)
  amplitude: number; // A
  wavelength: number; // λ
  frequency: number; // f (Hz) — v = λf
  direction?: 1 | -1; // traveling only: +1 truyền sang phải, -1 sang trái
  harmonic?: number; // standing only: số bó sóng k (nguyên) ứng với λ = 2·length/k
};
