import type { StringWavePreset } from "./types";
import { waveSpeed, wavelengthForHarmonicFixedFixed } from "../string-wave/string-wave-math";

export const songDung: StringWavePreset = {
  id: "song-dung",
  kind: "string-wave",
  title: "Sóng dừng",
  domain: "Dao động & Sóng",
  grade: 11,
  desc: "Dây 2 đầu cố định — chồng chập sóng tới và sóng phản xạ tạo nút, bụng cố định theo thời gian.",
  objective: "Quan sát điều kiện sóng dừng 2 đầu cố định L = k·λ/2 và xác định vị trí các nút (N), bụng (B).",
  sgkRef: "Vật lí 11",
  params: [
    { key: "length", label: "Chiều dài dây L", unit: "cm", min: 20, max: 100, step: 1, default: 60 },
    { key: "harmonic", label: "Số bó sóng k", min: 1, max: 6, step: 1, default: 2 },
    { key: "amplitude", label: "Biên độ sóng thành phần A", unit: "cm", min: 0.3, max: 1.5, step: 0.1, default: 0.8 },
    { key: "frequency", label: "Tần số f (tốc độ hoạt hoạ)", unit: "Hz", min: 0.5, max: 4, step: 0.1, default: 1.2 },
  ],
  applyParams: (p) => {
    const length = p.length ?? 60;
    const harmonic = Math.max(1, Math.round(p.harmonic ?? 2));
    const amplitude = p.amplitude ?? 0.8;
    const frequency = p.frequency ?? 1.2;
    return {
      kind: "string-wave",
      mode: "standing",
      length,
      amplitude,
      wavelength: wavelengthForHarmonicFixedFixed(length, harmonic),
      frequency,
      harmonic,
    };
  },
  analysis: {
    landmarks: [
      {
        key: "dieu-kien",
        label: "Điều kiện sóng dừng",
        description: "2 đầu cố định: L = k·λ/2 (k = số bó sóng nguyên) → λ suy ra từ L và k đang chọn.",
        values: (p) => {
          const length = p.length ?? 60;
          const harmonic = Math.max(1, Math.round(p.harmonic ?? 2));
          const wavelength = wavelengthForHarmonicFixedFixed(length, harmonic);
          return [
            { label: "Bước sóng λ = 2L/k", value: wavelength.toFixed(2), unit: "cm" },
            { label: "Tốc độ truyền sóng v = λf", value: waveSpeed(wavelength, p.frequency ?? 1.2).toFixed(2), unit: "cm/s" },
          ];
        },
      },
      {
        key: "so-nut-bung",
        label: "Số nút (N) và bụng (B)",
        description: "Số nút luôn nhiều hơn số bụng đúng 1 (tính cả 2 đầu dây cố định là nút).",
        values: (p) => {
          const harmonic = Math.max(1, Math.round(p.harmonic ?? 2));
          return [
            { label: "Số nút", value: `${harmonic + 1}` },
            { label: "Số bụng", value: `${harmonic}` },
          ];
        },
      },
    ],
  },
};
