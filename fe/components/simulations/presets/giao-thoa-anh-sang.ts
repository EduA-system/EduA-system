import type { WavePreset } from "./types";
import { fringeSpacing, maxMaximaOrder, maxMinimaOrder, waveSpeed } from "../wave/wave-math";

export const giaoThoaAnhSang: WavePreset = {
  id: "giao-thoa-anh-sang",
  kind: "wave",
  title: "Giao thoa ánh sáng (Y-âng)",
  domain: "Quang học",
  grade: 12,
  desc: "Thí nghiệm Y-âng: ánh sáng qua khe hẹp S rồi 2 khe S1, S2 kết hợp, tạo vân sáng — vân tối trên màn.",
  objective:
    "Quan sát hệ vân giao thoa trên màn và mối liên hệ giữa khoảng vân i, bước sóng λ, khoảng cách 2 khe a và khoảng cách tới màn D (i = λD/a).",
  sgkRef: "Vật lí 12",
  params: [
    { key: "a", label: "Khoảng cách 2 khe (a)", unit: "cm", min: 0.8, max: 2.5, step: 0.1, default: 1.4 },
    { key: "wavelength", label: "Bước sóng λ", unit: "cm", min: 0.15, max: 0.5, step: 0.02, default: 0.3 },
    { key: "D", label: "Khoảng cách tới màn (D)", unit: "cm", min: 10, max: 25, step: 1, default: 16 },
    { key: "frequency", label: "Tần số f (tốc độ hoạt hoạ)", unit: "Hz", min: 1, max: 6, step: 0.5, default: 3 },
  ],
  // Quy ước: 2 khe đặt DỌC (trục y, quanh gốc) để trục chính quang học (hướng
  // ra màn) trùng trục x — khớp cách vẽ sơ đồ SGK (khe ngang, màn thẳng đứng
  // phía xa). Không đúng tỉ lệ thật (a thật cỡ mm, λ cỡ nm, D cỡ m) — phóng to
  // có chủ đích để nhìn thấy được hệ vân, giống mọi mô phỏng giao thoa khác.
  applyParams: (p) => {
    const a = p.a ?? 1.4;
    const wavelength = p.wavelength ?? 0.3;
    const D = p.D ?? 16;
    const frequency = p.frequency ?? 3;
    return {
      kind: "wave",
      sources: [
        { id: "S1", x: 0, y: a / 2 },
        { id: "S2", x: 0, y: -a / 2 },
      ],
      wavelength,
      frequency,
      fieldRadius: D + wavelength * 4,
      screenDistance: D,
      labels: { maxima: "VS", minima: "VT" },
      singleSlit: { x: -D * 0.35, y: 0 },
    };
  },
  analysis: {
    landmarks: [
      {
        key: "khoang-van",
        label: "Khoảng vân i = λD/a",
        description: "Khoảng cách giữa 2 vân sáng (hoặc 2 vân tối) liên tiếp — công thức gần đúng, chuẩn khi D ≫ a.",
        values: (p) => {
          const a = p.a ?? 1.4, wavelength = p.wavelength ?? 0.3, D = p.D ?? 16;
          return [
            { label: "Khoảng vân i", value: fringeSpacing(wavelength, D, a).toFixed(3), unit: "cm" },
            { label: "Tốc độ truyền sóng v = λf", value: waveSpeed(wavelength, p.frequency ?? 3).toFixed(2), unit: "cm/s" },
          ];
        },
      },
      {
        key: "so-van",
        label: "Số vân quan sát được",
        description: "Phụ thuộc tỉ số a/λ (khoảng cách 2 khe / bước sóng) — càng lớn càng nhiều vân.",
        values: (p) => {
          const a = p.a ?? 1.4, wavelength = p.wavelength ?? 0.3;
          const kMax = maxMaximaOrder(a, wavelength);
          const mMax = maxMinimaOrder(a, wavelength);
          return [
            { label: "Số vân sáng", value: `${2 * kMax + 1}`, unit: `(bậc 0..${kMax}, mỗi bên)` },
            { label: "Số vân tối", value: `${2 * mMax}`, unit: `(thứ 1..${mMax}, mỗi bên)` },
          ];
        },
      },
    ],
  },
};
