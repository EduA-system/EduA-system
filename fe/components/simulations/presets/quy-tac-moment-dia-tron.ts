import type { Preset } from "./types";

const GRAVITY = 9.8;
const DISK_RADIUS = 1.8;
const DISK_MASS = 6;
const ANGULAR_DAMPING = 8;

function experimentValues(params: Record<string, number>) {
  const m1 = params.m1 ?? 0.4;
  const d1 = params.d1 ?? 0.8;
  const m2 = params.m2 ?? 0.2;
  const d2 = params.d2 ?? 1.6;
  const F1 = m1 * GRAVITY;
  const F2 = m2 * GRAVITY;
  const M1 = F1 * d1;
  const M2 = F2 * d2;
  const netMoment = M2 - M1;
  const balanced = Math.abs(netMoment) < 0.01;

  return { m1, d1, m2, d2, F1, F2, M1, M2, netMoment, balanced };
}

export const quyTacMomentDiaTron: Preset = {
  id: "quy-tac-moment-dia-tron",
  kind: "rotation",
  title: "Quy tắc moment lực — Đĩa tròn",
  domain: "Cơ học",
  grade: 10,
  desc: "Treo hai bộ quả cân vào các rãnh khác nhau của đĩa để khảo sát moment lực và điều kiện cân bằng quay.",
  objective:
    "Quan sát tác dụng làm quay của F₁, F₂ và kiểm chứng điều kiện cân bằng M₁ = M₂, hay F₁d₁ = F₂d₂.",
  sgkRef: "Vật lí 10 — Moment lực và điều kiện cân bằng",
  startPaused: true,
  params: [
    {
      key: "m1",
      label: "m₁ (Khối lượng bên phải)",
      unit: "kg",
      min: 0.1,
      max: 1,
      step: 0.1,
      default: 0.4,
    },
    {
      key: "d1",
      label: "d₁ (Cánh tay đòn F₁)",
      unit: "m",
      min: 0.4,
      max: 1.6,
      step: 0.2,
      default: 0.8,
    },
    {
      key: "m2",
      label: "m₂ (Khối lượng bên trái)",
      unit: "kg",
      min: 0.1,
      max: 1,
      step: 0.1,
      default: 0.2,
    },
    {
      key: "d2",
      label: "d₂ (Cánh tay đòn F₂)",
      unit: "m",
      min: 0.4,
      max: 1.6,
      step: 0.2,
      default: 1.6,
    },
  ],
  quickPresets: [
    { label: "Cân bằng", params: { m1: 0.4, d1: 0.8, m2: 0.2, d2: 1.6 } },
    { label: "F₁ thắng", params: { m1: 0.6, d1: 1.2, m2: 0.2, d2: 1.4 } },
    { label: "F₂ thắng", params: { m1: 0.2, d1: 0.8, m2: 0.5, d2: 1.4 } },
  ],
  applyParams: (params) => {
    const { m1, d1, m2, d2 } = experimentValues(params);
    return {
      kind: "rotation",
      diskRadius: DISK_RADIUS,
      diskMass: DISK_MASS,
      torqueModel: "attachedCords",
      attachmentGeometry: {
        leftAnchorAngle: Math.PI,
        rightAnchorAngle: Math.PI / 3.6,
        leftGuideDistance: 2.6,
        rightGuideDistance: 2,
      },
      gravity: GRAVITY,
      angularDamping: ANGULAR_DAMPING,
      ropeLength: 0.95,
      // Quy ước engine: moment bên trái dương. Trong bộ dụng cụ, bên trái là F₂.
      left: { mass: m2, radius: d2, label: "F₂", color: "#fbbf24" },
      right: { mass: m1, radius: d1, label: "F₁", color: "#38bdf8" },
    };
  },
  analysis: {
    landmarks: [
      {
        key: "force-1",
        label: "Lực F₁ và cánh tay đòn d₁",
        description:
          "Dây bên phải kéo tiếp tuyến với rãnh bán kính d₁. Trọng lượng của bộ quả cân tạo lực F₁ = m₁g và moment M₁ = F₁d₁.",
        atTime: () => 0,
        values: (params) => {
          const { m1, d1, F1, M1 } = experimentValues(params);
          return [
            { label: "m₁", value: m1.toFixed(1), unit: "kg" },
            { label: "F₁ = m₁g", value: F1.toFixed(2), unit: "N" },
            { label: "d₁", value: d1.toFixed(1), unit: "m" },
            { label: "M₁ = F₁d₁", value: M1.toFixed(2), unit: "N·m" },
          ];
        },
      },
      {
        key: "force-2",
        label: "Lực F₂ và cánh tay đòn d₂",
        description:
          "Dây bên trái kéo thẳng đứng tại rãnh bán kính d₂. Lực F₂ = m₂g tạo moment M₂ = F₂d₂ ngược chiều với M₁.",
        atTime: () => 0,
        values: (params) => {
          const { m2, d2, F2, M2 } = experimentValues(params);
          return [
            { label: "m₂", value: m2.toFixed(1), unit: "kg" },
            { label: "F₂ = m₂g", value: F2.toFixed(2), unit: "N" },
            { label: "d₂", value: d2.toFixed(1), unit: "m" },
            { label: "M₂ = F₂d₂", value: M2.toFixed(2), unit: "N·m" },
          ];
        },
      },
      {
        key: "moment-balance",
        label: "So sánh hai moment lực",
        description:
          "Đĩa cân bằng khi tổng moment quanh trục O bằng 0. Nếu hai moment khác nhau, đĩa quay theo chiều của moment lớn hơn.",
        values: (params) => {
          const { M1, M2, netMoment, balanced } = experimentValues(params);
          return [
            { label: "M₁", value: M1.toFixed(2), unit: "N·m" },
            { label: "M₂", value: M2.toFixed(2), unit: "N·m" },
            { label: "ΣM = M₂ − M₁", value: netMoment.toFixed(2), unit: "N·m" },
            {
              label: "Trạng thái",
              value: balanced
                ? "Cân bằng"
                : netMoment > 0
                  ? "F₂ làm đĩa quay ngược chiều kim đồng hồ"
                  : "F₁ làm đĩa quay theo chiều kim đồng hồ",
              unit: "",
            },
          ];
        },
      },
    ],
  },
};
