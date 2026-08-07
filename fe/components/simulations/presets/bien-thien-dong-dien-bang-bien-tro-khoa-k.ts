import type { Preset } from "./types";

export const bienThienDongDienBangBienTroKhoaK: Preset = {
  id: "bien-thien-dong-dien-bang-bien-tro-khoa-k",
  kind: "variable-current-induction",
  title: "Biến thiên dòng điện bằng biến trở/khoá K",
  domain: "Điện & Từ",
  grade: 12,
  desc: "Đóng, ngắt khoá K hoặc dịch chuyển con chạy biến trở để làm biến thiên dòng điện qua nam châm điện và quan sát kim điện kế.",
  objective: "Nhận biết dòng điện cảm ứng xuất hiện trong cuộn dây kín khi dòng điện qua nam châm điện biến thiên.",
  sgkRef: "Vật lí 12 - Thí nghiệm cảm ứng điện từ",
  params: [
    { key: "supplyVoltage", label: "Điện áp nguồn", unit: "V", min: 3, max: 12, step: 1, default: 6 },
    { key: "primaryTurns", label: "Số vòng nam châm điện", unit: "vòng", min: 100, max: 500, step: 20, default: 260 },
    { key: "secondaryTurns", label: "Số vòng cuộn dây kín", unit: "vòng", min: 100, max: 600, step: 20, default: 320 },
    { key: "rheostatMaxResistance", label: "Điện trở lớn nhất", unit: "Ω", min: 5, max: 40, step: 1, default: 24 },
  ],
  quickPresets: [
    { label: "Cảm ứng yếu", params: { supplyVoltage: 3, secondaryTurns: 160 } },
    { label: "Cảm ứng mạnh", params: { supplyVoltage: 9, secondaryTurns: 520 } },
  ],
  applyParams: (p) => ({
    kind: "variable-current-induction" as const,
    supplyVoltage: p.supplyVoltage ?? 6,
    primaryResistance: 4,
    rheostatMaxResistance: p.rheostatMaxResistance ?? 24,
    primaryTurns: p.primaryTurns ?? 260,
    secondaryTurns: p.secondaryTurns ?? 320,
    coupling: 0.09,
    currentTimeConstant: 0.055,
    meterSensitivity: 34,
    meterDamping: 9,
  }),
  analysis: {
    landmarks: [
      {
        key: "induction-condition",
        label: "Điều kiện xuất hiện dòng điện cảm ứng",
        description: "Kim lệch khi đóng, ngắt khoá K hoặc dịch chuyển con chạy. Khi dòng điện sơ cấp ổn định, kim trở về vạch 0.",
        values: (p) => [
          { label: "Điện áp nguồn", value: String(p.supplyVoltage ?? 6), unit: "V" },
          { label: "Số vòng cuộn dây kín", value: String(p.secondaryTurns ?? 320), unit: "vòng" },
        ],
      },
      {
        key: "changed-quantity",
        label: "Đại lượng biến thiên",
        description: "Dòng điện qua nam châm điện thay đổi làm từ trường và từ thông qua cuộn dây kín thay đổi.",
        values: () => [{ label: "Đại lượng gây cảm ứng", value: "Từ thông" }],
      },
    ],
  },
};
