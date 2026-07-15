// Bảng màu cho 2 chế độ trường sóng — thuần hàm, không phụ thuộc Canvas.

export type RGB = [number, number, number];

/** Trường tức thời: PHÂN KỲ — âm/dương màu khác nhau, 0 tối hơn cả 2. v ∈ [-1, 1]. */
export function divergingColor(v: number): RGB {
  const t = Math.max(-1, Math.min(1, v));
  if (t >= 0) {
    return [Math.round(15 + t * 240), Math.round(15 + t * 90), Math.round(30 + t * 40)];
  }
  const s = -t;
  return [Math.round(15 + s * 30), Math.round(15 + s * 120), Math.round(30 + s * 220)];
}

/** Cường độ trung bình: tối (I=0) → vàng sáng (I=1). v ∈ [0, 1]. */
export function intensityColor(v: number): RGB {
  const t = Math.max(0, Math.min(1, v));
  return [Math.round(10 + t * 245), Math.round(10 + t * 220), Math.round(20 + t * 80)];
}
