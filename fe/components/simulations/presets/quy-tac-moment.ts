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
  desc: "Khảo sát moment lực do trọng lượng hai người trên bập bênh.",
  objective:
    "Hiểu moment lực M = F.d và điều kiện cân bằng M₁ = M₂. Người nặng hơn hoặc ngồi xa trục hơn sẽ tạo moment lớn hơn, nên bập bênh nghiêng về phía đó.",
  sgkRef: "Vật lí 10",
  paramGuide:
    "Thử đổi khối lượng và khoảng cách tới trục để thấy: người nào nặng hơn hoặc ngồi xa trục hơn sẽ tạo moment lớn hơn. Khi hai moment bằng nhau thì bập bênh cân bằng.",
  params: [
    { key: "mLeft", label: "Khối lượng người bên trái", unit: "kg", min: 60, max: 80, step: 1, default: 70, description: "Người bên trái càng nặng thì trọng lượng P = m.g càng lớn, nên moment bên trái càng tăng." },
    { key: "dLeft", label: "Khoảng cách người bên trái", unit: "m", min: 0.8, max: 1.8, step: 0.1, default: 1.5, description: "Ngồi càng xa trục thì moment càng lớn, dù khối lượng không đổi." },
    { key: "mRight", label: "Khối lượng người bên phải", unit: "kg", min: 60, max: 80, step: 1, default: 70, description: "Người bên phải càng nặng thì trọng lượng P = m.g càng lớn, nên moment bên phải càng tăng." },
    { key: "dRight", label: "Khoảng cách người bên phải", unit: "m", min: 0.8, max: 1.8, step: 0.1, default: 1.5, description: "Ngồi càng xa trục thì moment càng lớn, dù khối lượng không đổi." },
    { key: "g", label: "Gia tốc trọng trường", unit: "m/s²", min: 1.6, max: 20, step: 0.1, default: 9.8, description: "Dùng để đổi khối lượng thành trọng lượng P = m.g. Trên Trái Đất, g xấp xỉ 9,8 m/s²." },
  ],
  quickPresets: [
    { label: "Cân bằng", params: { mLeft: 70, dLeft: 1.5, mRight: 70, dRight: 1.5, g: 9.8 } },
    { label: "Bên trái hạ", params: { mLeft: 80, dLeft: 1.5, mRight: 60, dRight: 1.2, g: 9.8 } },
    { label: "Bên phải hạ", params: { mLeft: 60, dLeft: 1.2, mRight: 80, dRight: 1.5, g: 9.8 } },
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
        description: "Moment bên trái quanh trục O bằng trọng lượng nhân với cánh tay đòn: M₁ = P₁.d₁. Ngồi càng xa trục thì moment càng lớn.",
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
        description: "Moment bên phải M₂ = P₂.d₂ gây quay theo chiều ngược với moment bên trái. Người bên phải nặng hơn hoặc ngồi xa hơn thì M₂ tăng.",
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
        description: "Bập bênh cân bằng khi hai moment ngược chiều có độ lớn bằng nhau: m₁.g.d₁ = m₂.g.d₂. Tăng khối lượng hoặc tăng khoảng cách đều làm moment lớn hơn.",
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
