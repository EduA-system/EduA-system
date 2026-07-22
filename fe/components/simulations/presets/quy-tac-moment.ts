import type { Preset } from "./types";

const BEAM_HALF_LENGTH = 3.2;
const BEAM_MASS = 8;
const MAX_ANGLE = (12 * Math.PI) / 180;

function values(p: Record<string, number>) {
  const mLeft = p.mLeft ?? 2;
  const dLeft = p.dLeft ?? 1.5;
  const mRight = p.mRight ?? 3;
  const dRight = p.dRight ?? 1;
  const g = p.g ?? 9.8;
  const PLeft = mLeft * g;
  const PRight = mRight * g;
  const MLeft = PLeft * dLeft;
  const MRight = PRight * dRight;
  const net = MLeft - MRight;
  const tolerance = Math.max(0.05, 0.005 * Math.max(MLeft, MRight));
  const balanced = Math.abs(net) <= tolerance;
  const state = balanced
    ? "Cân bằng"
    : net > 0
      ? "Moment bên trái lớn hơn"
      : "Moment bên phải lớn hơn";

  return { mLeft, dLeft, mRight, dRight, g, PLeft, PRight, MLeft, MRight, net, balanced, state };
}

export const quyTacMoment: Preset = {
  id: "quy-tac-moment",
  kind: "rotation",
  title: "Quy tắc moment bập bênh",
  domain: "Cơ học",
  grade: 10,
  desc: "Khảo sát tác dụng làm quay của trọng lực ở hai phía trục bập bênh.",
  objective:
    "Hiểu moment lực M = F.d và điều kiện cân bằng M₁ = M₂. Với mỗi người ngồi trên bập bênh, moment của trọng lực quanh trục là M = m.g.d.",
  sgkRef: "Vật lí 10",
  params: [
    { key: "mLeft", label: "Khối lượng bên trái", unit: "kg", min: 0.1, max: 20, step: 0.1, default: 2 },
    { key: "dLeft", label: "Khoảng cách bên trái", unit: "m", min: 0.2, max: 3, step: 0.1, default: 1.5 },
    { key: "mRight", label: "Khối lượng bên phải", unit: "kg", min: 0.1, max: 20, step: 0.1, default: 3 },
    { key: "dRight", label: "Khoảng cách bên phải", unit: "m", min: 0.2, max: 3, step: 0.1, default: 1 },
    { key: "g", label: "Gia tốc trọng trường", unit: "m/s²", min: 1.6, max: 20, step: 0.1, default: 9.8 },
  ],
  quickPresets: [
    { label: "Cân bằng", params: { mLeft: 2, dLeft: 1.5, mRight: 3, dRight: 1, g: 9.8 } },
    { label: "Bên trái hạ", params: { mLeft: 3, dLeft: 1.5, mRight: 2, dRight: 1, g: 9.8 } },
    { label: "Bên phải hạ", params: { mLeft: 2, dLeft: 1, mRight: 3, dRight: 1.5, g: 9.8 } },
  ],
  applyParams: (p) => {
    const { mLeft, dLeft, mRight, dRight, g } = values(p);
    return {
      kind: "rotation",
      variant: "seesaw",
      diskRadius: BEAM_HALF_LENGTH,
      diskMass: BEAM_MASS,
      inertiaModel: "rod",
      gravity: g,
      angularDamping: 6,
      ropeLength: 0,
      left: { mass: mLeft, radius: dLeft, label: "Bên trái", color: "#2dd4bf" },
      right: { mass: mRight, radius: dRight, label: "Bên phải", color: "#2dd4bf" },
      initialTheta: 0,
      initialOmega: 0,
      minTheta: -MAX_ANGLE,
      maxTheta: MAX_ANGLE,
      visual: {
        personImageSrc: "/simulations/bapbenh/man.png",
        personCrop: { x: 360, y: 89, width: 442, height: 991 },
      },
    };
  },
  analysis: {
    landmarks: [
      {
        key: "weight-left",
        label: "Trọng lượng bên trái",
        description: "Trọng lực hướng thẳng đứng xuống dưới và có độ lớn P₁ = m₁.g.",
        values: (p) => {
          const { mLeft, g, PLeft } = values(p);
          return [
            { label: "m₁", value: mLeft.toFixed(1), unit: "kg" },
            { label: "g", value: g.toFixed(1), unit: "m/s²" },
            { label: "P₁ = m₁.g", value: PLeft.toFixed(2), unit: "N" },
          ];
        },
      },
      {
        key: "moment-left",
        label: "Moment bên trái",
        description: "Moment bên trái quanh trục O bằng trọng lượng nhân với cánh tay đòn: M₁ = P₁.d₁.",
        values: (p) => {
          const { PLeft, dLeft, MLeft } = values(p);
          return [
            { label: "P₁", value: PLeft.toFixed(2), unit: "N" },
            { label: "d₁", value: dLeft.toFixed(2), unit: "m" },
            { label: "M₁ = P₁.d₁", value: MLeft.toFixed(2), unit: "N·m" },
          ];
        },
      },
      {
        key: "moment-right",
        label: "Moment bên phải",
        description: "Moment bên phải M₂ = P₂.d₂ gây quay theo chiều ngược với moment bên trái.",
        values: (p) => {
          const { PRight, dRight, MRight } = values(p);
          return [
            { label: "P₂", value: PRight.toFixed(2), unit: "N" },
            { label: "d₂", value: dRight.toFixed(2), unit: "m" },
            { label: "M₂ = P₂.d₂", value: MRight.toFixed(2), unit: "N·m" },
          ];
        },
      },
      {
        key: "balance",
        label: "Kết luận",
        description: "Bập bênh cân bằng khi hai moment ngược chiều có độ lớn bằng nhau: m₁.g.d₁ = m₂.g.d₂.",
        values: (p) => {
          const { MLeft, MRight, net, state } = values(p);
          return [
            { label: "M₁", value: MLeft.toFixed(2), unit: "N·m" },
            { label: "M₂", value: MRight.toFixed(2), unit: "N·m" },
            { label: "ΣM", value: net.toFixed(2), unit: "N·m" },
            { label: "Trạng thái", value: state },
          ];
        },
      },
    ],
  },
};
