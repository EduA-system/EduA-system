import type { Preset } from "./types";
import { fieldAngle, fieldMagnitude, totalField, totalPotential } from "../engines/point-charge-field/physics";
import type { Charge } from "../engines/point-charge-field/physics";

// "Điện phổ của hai điện tích điểm" — đường sức điện KHÔNG hardcode: mỗi lần
// dựng cảnh chỉ đóng gói vị trí/độ lớn 2 điện tích + tham số hiển thị vào
// PointChargeFieldScene; renderer (scene-canvas-point-charge-field.tsx) mới
// thật sự tính điện trường (engines/point-charge-field, chồng chất Coulomb
// thật) và truy vết đường sức bằng RK4.
// mỗi khi vẽ. Xem 2 file đó cho toàn bộ mô hình vật lý.
//
// q1, q2 nhập theo nC (×1e-9 ra Coulomb thật) — cùng quy ước đổi đơn vị như
// nhiem-dien-hut.ts/nhiem-dien-day.ts đổi µC, chỉ khác thang (nC nhỏ hơn để
// điện trường ở khoảng cách ~1 world unit ra giá trị vừa phải, không cần
// softening lớn bất thường).
//
// Vị trí điện tích (q1x,q1y,q2x,q2y) là THAM SỐ ĐỘC LẬP (không phải suy từ 1
// "khoảng cách") — đây chính là điều cho phép kéo tự do bằng chuột: renderer
// gọi onParamsChange({q1x,...}) khi kéo, applyParams đọc lại đúng 4 giá trị
// đó, không có bước trung gian "suy khoảng cách ngược lại vị trí".
function chargesFromParams(p: Record<string, number>): [Charge, Charge] {
  return [
    { x: p.q1x ?? -0.5, y: p.q1y ?? 0, q: (p.q1 ?? 1) * 1e-9 },
    { x: p.q2x ?? 0.5, y: p.q2y ?? 0, q: (p.q2 ?? -1) * 1e-9 },
  ];
}

export const dienPhoHaiDienTich: Preset = {
  id: "dien-pho-hai-dien-tich",
  title: "Điện phổ của hai điện tích",
  domain: "Điện & Từ",
  grade: 11,
  desc: "Quan sát đường sức điện của hai điện tích điểm cùng dấu, trái dấu và khảo sát điện trường tại từng vị trí.",
  objective:
    "Truy vết đường sức điện thật từ nguyên lý chồng chất Coulomb E = Σ kqᵢrᵢ/|rᵢ|³, phân biệt điện thế V và độ lớn điện trường |E| tại trung điểm hai điện tích.",
  sgkRef: "Vật lí 11 — Đường sức điện",
  kind: "point-charge-field",
  params: [
    { key: "q1", label: "Điện tích q1", unit: "nC", min: -3, max: 3, step: 0.1, default: 1 },
    { key: "q2", label: "Điện tích q2", unit: "nC", min: -3, max: 3, step: 0.1, default: -1 },
    { key: "q1x", label: "Vị trí q1 — x", unit: "m", min: -1.2, max: 1.2, step: 0.01, default: -0.5 },
    { key: "q1y", label: "Vị trí q1 — y", unit: "m", min: -1.2, max: 1.2, step: 0.01, default: 0 },
    { key: "q2x", label: "Vị trí q2 — x", unit: "m", min: -1.2, max: 1.2, step: 0.01, default: 0.5 },
    { key: "q2y", label: "Vị trí q2 — y", unit: "m", min: -1.2, max: 1.2, step: 0.01, default: 0 },
    { key: "epsilonR", label: "Hằng số điện môi tương đối εᵣ", unit: "", min: 1, max: 10, step: 0.5, default: 1 },
    { key: "lineCount", label: "Số đường sức (điện tích lớn hơn)", unit: "", min: 8, max: 48, step: 2, default: 20 },
    { key: "mode", label: "Chế độ hiển thị (0=đường sức, 1=điện phổ hạt)", unit: "", min: 0, max: 1, step: 1, default: 0 },
  ],
  applyParams: (p) => {
    const charges = chargesFromParams(p);
    return {
      kind: "point-charge-field",
      charges,
      epsilonR: p.epsilonR ?? 1,
      baseLineCount: p.lineCount ?? 20,
      displayMode: (p.mode ?? 0) >= 0.5 ? "spectrum" : "field-lines",
      chargeVisualRadius: 0.06,
      domainRadius: 2.2,
    };
  },
  quickPresets: [
    { label: "Trái dấu bằng nhau", params: { q1: 1, q2: -1, q1x: -0.5, q1y: 0, q2x: 0.5, q2y: 0 } },
    { label: "Cùng dương bằng nhau", params: { q1: 1, q2: 1, q1x: -0.5, q1y: 0, q2x: 0.5, q2y: 0 } },
    { label: "Cùng âm bằng nhau", params: { q1: -1, q2: -1, q1x: -0.5, q1y: 0, q2x: 0.5, q2y: 0 } },
    { label: "Trái dấu không bằng nhau", params: { q1: 2, q2: -1, q1x: -0.5, q1y: 0, q2x: 0.5, q2y: 0 } },
    { label: "Cùng dấu không bằng nhau", params: { q1: 2, q2: 1, q1x: -0.5, q1y: 0, q2x: 0.5, q2y: 0 } },
    { label: "Chế độ: đường sức", params: { mode: 0 } },
    { label: "Chế độ: điện phổ hạt", params: { mode: 1 } },
  ],
  analysis: {
    landmarks: [
      {
        key: "trung-diem",
        label: "Tại trung điểm 2 điện tích",
        description:
          "Hai điện tích TRÁI dấu bằng nhau: V ≈ 0 nhưng E ≠ 0 (hướng từ + sang −). Hai điện tích CÙNG dấu bằng nhau: E ≈ 0 nhưng V ≠ 0 — không được nhầm 2 điều kiện này.",
        values: (p) => {
          const charges = chargesFromParams(p);
          const mid = { x: (charges[0].x + charges[1].x) / 2, y: (charges[0].y + charges[1].y) / 2 };
          const epsilonR = p.epsilonR ?? 1;
          const f = totalField(mid, charges, epsilonR);
          const v = totalPotential(mid, charges, epsilonR);
          return [
            { label: "Điện thế V", value: v.toExponential(2), unit: "V" },
            { label: "Độ lớn điện trường |E|", value: fieldMagnitude(f).toExponential(2), unit: "V/m" },
            { label: "Góc điện trường θ = atan2(Ey,Ex)", value: ((fieldAngle(f) * 180) / Math.PI).toFixed(1), unit: "°" },
          ];
        },
      },
    ],
  },
};
