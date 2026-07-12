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

  // ── Tuỳ chọn cho các biến thể dựng trên cùng renderer (vd giao thoa ánh sáng
  // Y-âng) — mặc định KHÔNG set thì renderer vẽ y hệt giao thoa sóng nước. ──

  // Khoảng cách MÀN quan sát tới trung điểm 2 nguồn, đo dọc trục vuông góc với
  // trục nối 2 nguồn (trục chính quang học). Có giá trị → renderer vẽ thêm 1
  // đường MÀN + đánh dấu đúng vị trí vân sáng/tối (giao điểm CHÍNH XÁC của quỹ
  // tích hypebol với màn — không xấp xỉ tuyến tính như công thức SGK i=λD/a).
  screenDistance?: number;
  // Đổi nhãn "CĐ"/"CT" mặc định (sóng cơ) → "VS"/"VT" (vân sáng/vân tối, thuật
  // ngữ quang học) cho phù hợp SGK từng chương dù cùng một công thức vật lý.
  labels?: { maxima: string; minima: string };
  // Khe hẹp tạo nguồn kết hợp — thuần trang trí (tĩnh, không tính vật lý), vẽ
  // thêm 1 nguồn điểm S + rào chắn phía trước 2 khe S1,S2 giống sơ đồ SGK.
  singleSlit?: { x: number; y: number };
};
