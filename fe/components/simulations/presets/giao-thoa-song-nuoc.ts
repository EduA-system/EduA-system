import type { WavePreset } from "./types";
import { maxMaximaOrder, maxMinimaOrder, waveSpeed } from "../wave/wave-math";

export const giaoThoaSongNuoc: WavePreset = {
  id: "giao-thoa-song-nuoc",
  kind: "wave",
  title: "Giao thoa sóng nước",
  domain: "Dao động & Sóng",
  grade: 11,
  desc: "Hai nguồn kết hợp trên mặt nước tạo các đường cực đại, cực tiểu và điểm giao nhau của 2 sóng tròn.",
  objective:
    "Quan sát vị trí các điểm cực đại (2 sóng cùng pha) và cực tiểu (2 sóng ngược pha) giao thoa — chính là các điểm giao nhau của 2 họ vòng sóng tròn phát ra từ S1, S2.",
  sgkRef: "Vật lí 11",
  params: [
    { key: "d", label: "Khoảng cách 2 nguồn", unit: "cm", min: 4, max: 16, step: 0.5, default: 9 },
    { key: "wavelength", label: "Bước sóng λ", unit: "cm", min: 0.6, max: 3, step: 0.1, default: 1.4 },
    { key: "frequency", label: "Tần số f", unit: "Hz", min: 1, max: 8, step: 0.5, default: 3 },
  ],
  applyParams: (p) => {
    const d = p.d ?? 9;
    const wavelength = p.wavelength ?? 1.4;
    const frequency = p.frequency ?? 3;
    return {
      kind: "wave",
      sources: [
        { id: "S1", x: -d / 2, y: 0 },
        { id: "S2", x: d / 2, y: 0 },
      ],
      wavelength,
      frequency,
      // CỐ ĐỊNH (không nhân theo d) — nếu fieldRadius tỉ lệ theo d thì renderer
      // tự co scale bù lại, kéo slider "khoảng cách 2 nguồn" sẽ KHÔNG thấy S1,
      // S2 tách xa nhau trên màn (cả khung chỉ tự zoom in/out cùng lúc). Cố
      // định để d thực sự điều khiển khoảng cách nhìn thấy được giữa 2 nguồn.
      // Vẫn nới theo λ để bước sóng lớn còn đủ chỗ hiện vài vòng sóng.
      fieldRadius: Math.max(22, wavelength * 6),
    };
  },
  analysis: {
    landmarks: [
      {
        key: "thong-so",
        label: "Thông số truyền sóng",
        description: "Tốc độ truyền sóng v = λf, tính từ bước sóng và tần số đang chọn.",
        values: (p) => [
          { label: "Tốc độ truyền sóng v", value: waveSpeed(p.wavelength ?? 1.4, p.frequency ?? 3).toFixed(2), unit: "cm/s" },
          { label: "Chu kỳ T = 1/f", value: (1 / (p.frequency ?? 3)).toFixed(2), unit: "s" },
        ],
      },
      {
        key: "so-van",
        label: "Số đường giao thoa",
        description: "Số đường cực đại/cực tiểu quan sát được phụ thuộc tỉ số d/λ (khoảng cách 2 nguồn / bước sóng).",
        values: (p) => {
          const d = p.d ?? 9;
          const wavelength = p.wavelength ?? 1.4;
          const kMax = maxMaximaOrder(d, wavelength);
          const mMax = maxMinimaOrder(d, wavelength);
          return [
            { label: "Số đường cực đại", value: `${2 * kMax + 1}`, unit: `(bậc 0..${kMax}, mỗi bên)` },
            { label: "Số đường cực tiểu", value: `${2 * mMax}`, unit: `(thứ 1..${mMax}, mỗi bên)` },
          ];
        },
      },
    ],
  },
};
