import type { Preset } from "./types";

const GRAVITY = 9.8;
const DISK_RADIUS = 1.5;
const DISK_MASS = 8;
const ANGULAR_DAMPING = 2.4;
const MAX_ROTATION = Math.PI / 2;

function values(p: Record<string, number>) {
  const mLeft = p.mLeft ?? 2;
  const dLeft = p.dLeft ?? 1.2;
  const mRight = p.mRight ?? 3;
  const dRight = p.dRight ?? 0.8;
  const PLeft = mLeft * GRAVITY;
  const PRight = mRight * GRAVITY;
  const MLeft = PLeft * dLeft;
  const MRight = PRight * dRight;
  const netMoment = MLeft - MRight;
  const balanced = Math.abs(netMoment) < 1e-9;
  return { mLeft, dLeft, mRight, dRight, PLeft, PRight, MLeft, MRight, netMoment, balanced };
}

export const quyTacMomentDiaTron: Preset = {
  id: "quy-tac-moment-dia-tron",
  kind: "rotation",
  title: "Quy tắc moment đĩa tròn",
  domain: "Cơ học",
  grade: 10,
  desc: "Treo hai vật vào đĩa tròn và điều chỉnh trọng lượng, cánh tay đòn để quan sát đĩa quay hoặc cân bằng.",
  objective:
    "Hiểu quy tắc moment lực: đĩa cân bằng khi M₁ = M₂, tức P₁·d₁ = P₂·d₂. Khi hai moment không bằng nhau, đĩa quay theo chiều của moment lớn hơn.",
  sgkRef: "Vật lí 10, Bài 21",
  startPaused: true,
  params: [
    { key: "mLeft", label: "Khối lượng vật trái", unit: "kg", min: 0.1, max: 5, step: 0.1, default: 2 },
    { key: "dLeft", label: "Khoảng cách trái d₁", unit: "m", min: 0.2, max: 1.5, step: 0.1, default: 1.2 },
    { key: "mRight", label: "Khối lượng vật phải", unit: "kg", min: 0.1, max: 5, step: 0.1, default: 3 },
    { key: "dRight", label: "Khoảng cách phải d₂", unit: "m", min: 0.2, max: 1.5, step: 0.1, default: 0.8 },
  ],
  quickPresets: [
    { label: "Cân bằng", params: { mLeft: 2, dLeft: 1.2, mRight: 3, dRight: 0.8 } },
    { label: "Trái lớn hơn", params: { mLeft: 3, dLeft: 1.2, mRight: 3, dRight: 0.8 } },
    { label: "Phải lớn hơn", params: { mLeft: 2, dLeft: 0.8, mRight: 3, dRight: 1.2 } },
  ],
  applyParams: (p) => {
    const { mLeft, dLeft, mRight, dRight } = values(p);
    return {
      kind: "rotation",
      diskRadius: DISK_RADIUS,
      diskMass: DISK_MASS,
      gravity: GRAVITY,
      angularDamping: ANGULAR_DAMPING,
      ropeLength: 0.72,
      left: { mass: mLeft, radius: dLeft, label: "Vật trái", color: "#2dd4bf" },
      right: { mass: mRight, radius: dRight, label: "Vật phải", color: "#94a3b8" },
      minTheta: -MAX_ROTATION,
      maxTheta: MAX_ROTATION,
    };
  },
  analysis: {
    landmarks: [
      {
        key: "left-moment",
        label: "Moment bên trái",
        description: "Trọng lượng P₁ = m₁g kéo dây ở bán kính d₁ nên tạo moment M₁ = P₁d₁.",
        atTime: () => 0,
        values: (p) => {
          const { mLeft, dLeft, PLeft, MLeft } = values(p);
          return [
            { label: "m₁", value: mLeft.toFixed(1), unit: "kg" },
            { label: "P₁ = m₁g", value: PLeft.toFixed(2), unit: "N" },
            { label: "d₁", value: dLeft.toFixed(2), unit: "m" },
            { label: "M₁ = P₁d₁", value: MLeft.toFixed(2), unit: "N·m" },
          ];
        },
      },
      {
        key: "right-moment",
        label: "Moment bên phải",
        description: "Tương tự, trọng lượng P₂ tại bán kính d₂ tạo moment ngược chiều M₂ = P₂d₂.",
        atTime: () => 0,
        values: (p) => {
          const { mRight, dRight, PRight, MRight } = values(p);
          return [
            { label: "m₂", value: mRight.toFixed(1), unit: "kg" },
            { label: "P₂ = m₂g", value: PRight.toFixed(2), unit: "N" },
            { label: "d₂", value: dRight.toFixed(2), unit: "m" },
            { label: "M₂ = P₂d₂", value: MRight.toFixed(2), unit: "N·m" },
          ];
        },
      },
      {
        key: "balance",
        label: "Quy tắc moment lực",
        description: "Đĩa đứng yên khi tổng moment bằng 0: M₁ = M₂. Nếu M₁ lớn hơn, bên trái kéo xuống và đĩa quay ngược chiều kim đồng hồ; ngược lại đĩa quay theo chiều kim đồng hồ.",
        values: (p) => {
          const { MLeft, MRight, netMoment, balanced } = values(p);
          return [
            { label: "M₁", value: MLeft.toFixed(2), unit: "N·m" },
            { label: "M₂", value: MRight.toFixed(2), unit: "N·m" },
            { label: "ΣM = M₁ − M₂", value: netMoment.toFixed(2), unit: "N·m" },
            { label: "Kết luận", value: balanced ? "Cân bằng" : netMoment > 0 ? "Quay ngược chiều kim đồng hồ" : "Quay theo chiều kim đồng hồ", unit: "" },
          ];
        },
      },
    ],
  },
};
