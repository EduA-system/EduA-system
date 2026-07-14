import type { Preset } from "./types";

function values(p: Record<string, number>) {
  const F1 = p.F1 ?? 200;
  const d1 = p.d1 ?? 1.5;
  const F2 = p.F2 ?? 300;
  const d2 = p.d2 ?? 1;
  const M1 = F1 * d1;
  const M2 = F2 * d2;
  const net = M1 - M2;
  const tolerance = Math.max(1, 0.03 * Math.max(M1, M2));
  const state =
    Math.abs(net) <= tolerance
      ? "Cân bằng"
      : net > 0
        ? "Có xu hướng quay về phía F1"
        : "Có xu hướng quay về phía F2";

  return { F1, d1, F2, d2, M1, M2, net, tolerance, state };
}

export const quyTacMoment: Preset = {
  id: "quy-tac-moment",
  title: "Quy tắc moment lực",
  domain: "Cơ học",
  grade: 10,
  desc: "Khảo sát điều kiện cân bằng của một thanh có trục quay cố định khi chịu hai lực ở hai phía.",
  objective: "Hiểu moment lực M = F.d và điều kiện cân bằng của vật có trục quay cố định: tổng moment theo chiều kim đồng hồ bằng tổng moment ngược chiều kim đồng hồ.",
  sgkRef: "Vật lí 10",
  params: [
    { key: "F1", label: "Lực F1 bên trái", unit: "N", min: 10, max: 500, step: 10, default: 200 },
    { key: "d1", label: "Cánh tay đòn d1", unit: "m", min: 0.2, max: 3, step: 0.1, default: 1.5 },
    { key: "F2", label: "Lực F2 bên phải", unit: "N", min: 10, max: 500, step: 10, default: 300 },
    { key: "d2", label: "Cánh tay đòn d2", unit: "m", min: 0.2, max: 3, step: 0.1, default: 1 },
  ],
  applyParams: (p) => {
    const { F1, d1, F2, d2 } = values(p);
    const y = 2.2;
    return {
      bodies: [
        { id: "truc-quay", x: 0, y, vx: 0, vy: 0, mass: 1, fixed: true, radius: 0.1 },
        {
          id: "F1",
          x: -d1,
          y,
          vx: 0,
          vy: 0,
          mass: Math.max(0.1, F1 / 100),
          radius: 0.16,
          visual: { color: "#60a5fa", label: "F1" },
        },
        {
          id: "F2",
          x: d2,
          y,
          vx: 0,
          vy: 0,
          mass: Math.max(0.1, F2 / 100),
          radius: 0.16,
          visual: { color: "#f472b6", label: "F2" },
        },
      ],
      forces: [],
      constraints: [
        { kind: "rod", a: "truc-quay", b: "F1", length: d1 },
        { kind: "rod", a: "truc-quay", b: "F2", length: d2 },
      ],
    };
  },
  analysis: {
    landmarks: [
      {
        key: "moment-left",
        label: "Moment của F1",
        description: "Moment lực phụ thuộc vào độ lớn lực và khoảng cách từ trục quay đến giá của lực: M1 = F1.d1.",
        atTime: () => 0,
        values: (p) => {
          const { F1, d1, M1 } = values(p);
          return [
            { label: "F1", value: F1.toFixed(0), unit: "N" },
            { label: "d1", value: d1.toFixed(2), unit: "m" },
            { label: "M1 = F1.d1", value: M1.toFixed(2), unit: "N.m" },
          ];
        },
      },
      {
        key: "moment-right",
        label: "Moment của F2",
        description: "Với lực tác dụng ở phía còn lại của trục quay, moment cần được so sánh theo chiều quay đối nhau.",
        atTime: () => 0,
        values: (p) => {
          const { F2, d2, M2 } = values(p);
          return [
            { label: "F2", value: F2.toFixed(0), unit: "N" },
            { label: "d2", value: d2.toFixed(2), unit: "m" },
            { label: "M2 = F2.d2", value: M2.toFixed(2), unit: "N.m" },
          ];
        },
      },
      {
        key: "balance",
        label: "Điều kiện cân bằng",
        description: "Thanh cân bằng khi tổng moment theo một chiều bằng tổng moment theo chiều ngược lại. Với hai lực trong mô phỏng: F1.d1 = F2.d2.",
        atTime: () => 0,
        values: (p) => {
          const { M1, M2, net, state } = values(p);
          return [
            { label: "M1", value: M1.toFixed(2), unit: "N.m" },
            { label: "M2", value: M2.toFixed(2), unit: "N.m" },
            { label: "M1 - M2", value: net.toFixed(2), unit: "N.m" },
            { label: "Kết luận", value: state, unit: "" },
          ];
        },
      },
    ],
  },
};