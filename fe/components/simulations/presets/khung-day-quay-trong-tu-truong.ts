import type { Preset } from "./types";

const DEG_TO_RAD = Math.PI / 180;

export const khungDayQuayTrongTuTruong: Preset = {
  id: "khung-day-quay-trong-tu-truong",
  kind: "magnetic-loop",
  title: "Khung dây quay trong từ trường",
  domain: "Điện & Từ",
  grade: 11,
  desc: "Quan sát ngẫu lực từ và cổ góp làm khung dây MNPQ quay liên tục quanh trục OO′.",
  objective: "Xác định hai lực từ trên MN, QP và quan sát cổ góp đảo dòng sau mỗi nửa vòng.",
  sgkRef: "Vật lí 11 - Lực từ tác dụng lên khung dây có dòng điện",
  startPaused: true,
  params: [
    { key: "magneticField", label: "Cảm ứng từ", unit: "T", min: 0, max: 0.8, step: 0.01, default: 0.3 },
    { key: "current", label: "Dòng điện (dấu chỉ chiều)", unit: "A", min: -4, max: 4, step: 0.1, default: 1.5 },
    { key: "turns", label: "Số vòng dây", unit: "vòng", min: 1, max: 50, step: 1, default: 20 },
    { key: "widthCm", label: "Chiều rộng khung", unit: "cm", min: 6, max: 24, step: 1, default: 12 },
    { key: "heightCm", label: "Chiều cao khung", unit: "cm", min: 10, max: 30, step: 1, default: 18 },
    { key: "massG", label: "Khối lượng khung", unit: "g", min: 30, max: 200, step: 5, default: 80 },
    { key: "initialAngleDeg", label: "Góc α ban đầu", unit: "°", min: 10, max: 170, step: 1, default: 58 },
    { key: "dampingMilli", label: "Mô-men cản", unit: "mN·m·s/rad", min: 0, max: 40, step: 1, default: 18 },
  ],
  quickPresets: [
    { label: "Đảo chiều dòng điện", params: { current: -1.5, initialAngleDeg: 58 } },
    { label: "Mô-men lớn", params: { current: 3, magneticField: 0.6, turns: 35 } },
    { label: "Không có lực từ", params: { magneticField: 0 } },
  ],
  applyParams: (p) => ({
    kind: "magnetic-loop" as const,
    width: (p.widthCm ?? 12) / 100,
    height: (p.heightCm ?? 18) / 100,
    mass: (p.massG ?? 80) / 1000,
    turns: Math.round(p.turns ?? 20),
    current: p.current ?? 1.5,
    magneticField: p.magneticField ?? 0.3,
    angularDamping: (p.dampingMilli ?? 18) / 1000,
    initialAngle: (p.initialAngleDeg ?? 58) * DEG_TO_RAD,
  }),
  analysis: {
    landmarks: [
      {
        key: "luc-tu-hai-canh",
        label: "Hai lực từ trên MN và QP",
        description: "MN và QP song song với trục quay, vuông góc với B. Hai lực cùng độ lớn, ngược chiều và tạo thành ngẫu lực.",
        values: (p) => {
          const force = Math.round(p.turns ?? 20) * Math.abs(p.current ?? 1.5) * ((p.heightCm ?? 18) / 100) * (p.magneticField ?? 0.3);
          return [{ label: "F = NIlB", value: force.toFixed(2), unit: "N" }];
        },
      },
      {
        key: "moment-luc-tu",
        label: "Mô-men lực từ ban đầu",
        description: "Mô-men lớn nhất khi pháp tuyến n vuông góc B và bằng 0 khi n song song B.",
        values: (p) => {
          const area = ((p.widthCm ?? 12) * (p.heightCm ?? 18)) / 10000;
          const alpha = (p.initialAngleDeg ?? 58) * DEG_TO_RAD;
          const torque = Math.round(p.turns ?? 20) * Math.abs(p.current ?? 1.5) * area * (p.magneticField ?? 0.3) * Math.sin(alpha);
          return [{ label: "|τ₀| = NIAB sin α₀", value: torque.toFixed(3), unit: "N·m" }];
        },
      },
    ],
  },
};
