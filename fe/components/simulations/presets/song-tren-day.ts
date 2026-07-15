import type { StringWavePreset } from "./types";
import { waveSpeed } from "../engines/string-wave/string-wave-math";

const WINDOW_LENGTH = 60; // cm — cửa sổ quan sát cố định, KHÔNG phụ thuộc tham số nào (tránh bù scale)

export const songTrenDay: StringWavePreset = {
  id: "song-tren-day",
  kind: "string-wave",
  title: "Sóng trên dây",
  domain: "Dao động & Sóng",
  grade: 11,
  desc: "Sóng ngang truyền dọc theo dây dài — quan sát bước sóng, biên độ và chuyển động của một phần tử dây.",
  objective:
    "Phân biệt tốc độ truyền sóng (theo phương ngang, không đổi) với tốc độ dao động của một phần tử dây (theo phương vuông góc, biến thiên điều hoà).",
  sgkRef: "Vật lí 11",
  params: [
    { key: "amplitude", label: "Biên độ A", unit: "cm", min: 0.5, max: 3, step: 0.1, default: 1.5 },
    { key: "wavelength", label: "Bước sóng λ", unit: "cm", min: 4, max: 20, step: 0.5, default: 10 },
    { key: "frequency", label: "Tần số f", unit: "Hz", min: 0.5, max: 4, step: 0.1, default: 1.5 },
    { key: "direction", label: "Chiều truyền (1 = phải, -1 = trái)", min: -1, max: 1, step: 2, default: 1 },
  ],
  applyParams: (p) => {
    const amplitude = p.amplitude ?? 1.5;
    const wavelength = p.wavelength ?? 10;
    const frequency = p.frequency ?? 1.5;
    const direction = (p.direction ?? 1) >= 0 ? 1 : -1;
    return {
      kind: "string-wave",
      mode: "traveling",
      length: WINDOW_LENGTH,
      amplitude,
      wavelength,
      frequency,
      direction,
    };
  },
  analysis: {
    landmarks: [
      {
        key: "thong-so",
        label: "Thông số truyền sóng",
        description: "Tốc độ truyền sóng v = λf — không đổi dọc theo dây, khác tốc độ dao động của từng phần tử.",
        values: (p) => [
          { label: "Tốc độ truyền sóng v", value: waveSpeed(p.wavelength ?? 10, p.frequency ?? 1.5).toFixed(2), unit: "cm/s" },
          { label: "Chu kỳ T = 1/f", value: (1 / (p.frequency ?? 1.5)).toFixed(2), unit: "s" },
        ],
      },
      {
        key: "phan-tu-bien",
        label: "Phần tử dây (chấm vàng)",
        description: "Tốc độ dao động của phần tử dây đạt cực đại khi qua vị trí cân bằng, bằng 0 tại biên — khác hẳn tốc độ truyền sóng v ở trên.",
        values: (p) => [
          { label: "Tốc độ dao động cực đại v_max = ωA", value: (2 * Math.PI * (p.frequency ?? 1.5) * (p.amplitude ?? 1.5)).toFixed(2), unit: "cm/s" },
        ],
      },
    ],
  },
};
