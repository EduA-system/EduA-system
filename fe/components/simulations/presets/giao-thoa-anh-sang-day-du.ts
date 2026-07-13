import type { WaveFieldPreset } from "./types";
import { calculateFringeSpacingApproximation, waveSpeed } from "../wave-field/physics";

const X_SINGLE_SLIT = 0;
const X_SLITS = 140;

export const giaoThoaAnhSangDayDu: WaveFieldPreset = {
  id: "giao-thoa-anh-sang-day-du",
  kind: "wave-field",
  title: "Giao thoa ánh sáng — mô hình sóng đầy đủ",
  domain: "Quang học",
  grade: 12,
  desc: "Trường sóng thực CÓ NHÂN QUẢ: sóng phẳng → khe hẹp S → khe kép S1,S2 (kế thừa pha từ S) → vùng giao thoa lan dần tới màn.",
  objective:
    "Quan sát trực tiếp cường độ I = A1² + A2² + 2A1A2·cos(k·ΔL) tính từ quang lộ thực ΔL = (R_S2+r2) − (R_S1+r1) — không phải vân vẽ sẵn — và thấy sóng cần thời gian truyền tới mới xuất hiện.",
  sgkRef: "Vật lí 12",
  // Rút gọn còn các tham số vật lý cốt lõi — các tuỳ chọn nâng cao (suy giảm
  // biên độ, nhiễu xạ khe đơn, góc nhỏ, chế độ hiển thị…) giữ cố định ở giá
  // trị mặc định hợp lý thay vì phơi hết ra slider cho gọn panel.
  params: [
    { key: "wavelength", label: "Bước sóng λ", unit: "đv", min: 10, max: 40, step: 1, default: 20 },
    { key: "slitSeparation", label: "Khoảng cách 2 khe a", unit: "đv", min: 40, max: 160, step: 5, default: 80 },
    { key: "slitWidth", label: "Độ rộng mỗi khe b", unit: "đv", min: 0, max: 20, step: 1, default: 8 },
    { key: "screenDistance", label: "Khoảng cách tới màn D", unit: "đv", min: 200, max: 500, step: 10, default: 350 },
    { key: "amplitude", label: "Biên độ nguồn", min: 0.5, max: 2, step: 0.1, default: 1 },
    { key: "frequency", label: "Tần số / tốc độ hoạt hoạ", unit: "Hz", min: 0.2, max: 3, step: 0.1, default: 1 },
  ],
  applyParams: (p) => ({
    kind: "wave-field",
    xSingleSlit: X_SINGLE_SLIT,
    xSlits: X_SLITS,
    wavelength: p.wavelength ?? 20,
    frequency: p.frequency ?? 1,
    amplitude: p.amplitude ?? 1,
    slitSeparation: p.slitSeparation ?? 80,
    slitWidth: p.slitWidth ?? 8,
    screenDistance: p.screenDistance ?? 350,
    sourceOffsetY: 0,
    amplitudeDecay: false,
    singleSlitDiffraction: false,
    smallAngleApprox: false,
    propagationMode: true,
    visualXCompression: true,
    displayMode: "educational",
  }),
  quickPresets: [
    { label: "Giao thoa rõ", params: { slitSeparation: 80, wavelength: 20, screenDistance: 350 } },
    { label: "Khe gần nhau", params: { slitSeparation: 40 } },
    { label: "Khe xa nhau", params: { slitSeparation: 150 } },
    { label: "Bước sóng lớn", params: { wavelength: 35 } },
    { label: "Bước sóng nhỏ", params: { wavelength: 12 } },
  ],
  analysis: {
    landmarks: [
      {
        key: "khoang-van",
        label: "Khoảng vân i ≈ λD/a",
        description: "Khoảng cách giữa 2 vân sáng liên tiếp trên màn — công thức gần đúng, chuẩn khi D ≫ a.",
        values: (p) => {
          const wavelength = p.wavelength ?? 20, screenDistance = p.screenDistance ?? 350, slitSeparation = p.slitSeparation ?? 80;
          return [
            { label: "Khoảng vân i", value: calculateFringeSpacingApproximation(wavelength, screenDistance, slitSeparation).toFixed(2), unit: "đv" },
            { label: "Tốc độ truyền sóng v = λf", value: waveSpeed(wavelength, p.frequency ?? 1).toFixed(2), unit: "đv/s" },
          ];
        },
      },
    ],
  },
};
