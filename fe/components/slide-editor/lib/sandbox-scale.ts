/**
 * Tỉ lệ thu nhỏ cho thí nghiệm sandbox chạy trong khung slide.
 *
 * Giao diện thí nghiệm (`/App.tsx` sinh trong lib/sandbox/react-experiments.ts)
 * dựng cho cả màn hình: cột tham số rộng 320px cố định, kèm mô tả và bảng
 * Tweakpane — cao khoảng 650–700px. Khung sandbox trên slide chỉ cao ~380px
 * (canvas 960×540 trừ tiêu đề), nên cột đó phải cuộn mới xem hết, rất vướng khi
 * trình chiếu.
 *
 * Cách chữa: giữ nguyên DIỆN TÍCH khung, nhưng cho iframe một viewport LOGIC
 * lớn hơn rồi `transform: scale(zoom)` về đúng khung. Thí nghiệm tưởng như đang
 * chạy trong một cửa sổ rộng rãi → không còn thanh cuộn, chỉ nhỏ lại.
 */

/**
 * Viewport logic tối thiểu (px CSS) cần cấp cho thí nghiệm.
 *
 * Chiều cao là ràng buộc thật: cột tham số KHÔNG co theo bề rộng viewport (mô
 * tả xuống dòng theo 320px cố định của cột), nên chỉ nới chiều cao mới hết
 * cuộn. Đo trên preset nhiều tham số (`dong-nang-the-nang`: tiêu đề + hàng nút
 * + đoạn hướng dẫn + 4 slider kèm mô tả) thì cột cao khoảng 800px.
 */
const MIN_VIEWPORT_W = 900;
const MIN_VIEWPORT_H = 820;

/** Sàn tỉ lệ: dưới mức này chữ trong thí nghiệm nhỏ tới mức không đọc nổi. */
const MIN_ZOOM = 0.4;

/**
 * Tỉ lệ hiển thị của thí nghiệm trong khung `width` × `height` (toạ độ canvas).
 * Trả về 1 khi khung đã đủ rộng — không phóng to thí nghiệm bao giờ.
 */
export function sandboxViewZoom(width: number, height: number): number {
  if (!(width > 0) || !(height > 0)) return 1;
  const zoom = Math.min(1, width / MIN_VIEWPORT_W, height / MIN_VIEWPORT_H);
  return Math.max(MIN_ZOOM, Math.round(zoom * 1000) / 1000);
}
