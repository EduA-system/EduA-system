import type { Preset } from "./types";

function degToRad(deg: number) {
  return (deg * Math.PI) / 180;
}

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
  const tolerance = Math.max(0.5, 0.03 * Math.max(MLeft, MRight));
  const balanced = Math.abs(net) <= tolerance;
  const beamAngle = balanced ? 0 : net > 0 ? 8 : -8;
  const state = balanced ? "Cân bằng" : net > 0 ? "Nghiêng về bên trái" : "Nghiêng về bên phải";

  return {
    mLeft,
    dLeft,
    mRight,
    dRight,
    g,
    PLeft,
    PRight,
    MLeft,
    MRight,
    net,
    balanced,
    beamAngle,
    state,
  };
}

function pointOnBeam(distance: number, beamAngle: number, pivotY: number) {
  const angle = degToRad(beamAngle);
  return {
    x: distance * Math.cos(angle),
    y: pivotY + distance * Math.sin(angle),
  };
}

function pointAboveBeam(distance: number, beamAngle: number, pivotY: number, offset: number) {
  const angle = degToRad(beamAngle);
  const onBeam = pointOnBeam(distance, beamAngle, pivotY);
  return {
    x: onBeam.x - Math.sin(angle) * offset,
    y: onBeam.y + Math.cos(angle) * offset,
  };
}

function massRadius(mass: number) {
  return Math.min(0.36, 0.18 + mass * 0.012);
}

function weightVector(weight: number) {
  return -Math.min(1.1, Math.max(0.45, weight / 45));
}

export const quyTacMoment: Preset = {
  id: "quy-tac-moment",
  title: "Quy tắc moment lực",
  domain: "Cơ học",
  grade: 10,
  desc: "Mô phỏng bập bênh có hai vật ở hai phía trục quay để khảo sát moment lực và điều kiện cân bằng.",
  objective:
    "Hiểu moment lực M = F.d. Với vật đặt trên bập bênh, lực gây quay là trọng lực P = m.g, nên moment quanh trục là M = P.d = m.g.d.",
  sgkRef: "Vật lí 10",
  params: [
    { key: "mLeft", label: "Khối lượng vật trái", unit: "kg", min: 0.1, max: 20, step: 0.1, default: 2 },
    { key: "dLeft", label: "Khoảng cách bên trái", unit: "m", min: 0.2, max: 3, step: 0.1, default: 1.5 },
    { key: "mRight", label: "Khối lượng vật phải", unit: "kg", min: 0.1, max: 20, step: 0.1, default: 3 },
    { key: "dRight", label: "Khoảng cách bên phải", unit: "m", min: 0.2, max: 3, step: 0.1, default: 1 },
    { key: "g", label: "Gia tốc trọng trường", unit: "m/s²", min: 1.6, max: 20, step: 0.1, default: 9.8 },
  ],
  applyParams: (p) => {
    const { mLeft, dLeft, mRight, dRight, PLeft, PRight, beamAngle } = values(p);
    const pivotY = 2.05;
    const leftRadius = massRadius(mLeft);
    const rightRadius = massRadius(mRight);
    const left = pointAboveBeam(-dLeft, beamAngle, pivotY, leftRadius * 0.8 + 0.06);
    const right = pointAboveBeam(dRight, beamAngle, pivotY, rightRadius * 0.8 + 0.06);
    const supportLeft = { x: -0.32, y: 1.25 };
    const supportRight = { x: 0.32, y: 1.25 };

    return {
      bodies: [
        {
          id: "pivot",
          x: 0,
          y: pivotY,
          vx: 0,
          vy: 0,
          mass: 1,
          fixed: true,
          radius: 0.12,
          visual: { shape: "circle", color: "#fbbf24", label: "O" },
        },
        {
          id: "support-left",
          x: supportLeft.x,
          y: supportLeft.y,
          vx: 0,
          vy: 0,
          mass: 1,
          fixed: true,
          radius: 0.08,
          visual: { color: "#475569" },
        },
        {
          id: "support-right",
          x: supportRight.x,
          y: supportRight.y,
          vx: 0,
          vy: 0,
          mass: 1,
          fixed: true,
          radius: 0.08,
          visual: { color: "#475569" },
        },
        {
          id: "left-mass",
          x: left.x,
          y: left.y,
          vx: 0,
          vy: 0,
          mass: mLeft,
          fixed: true,
          radius: leftRadius,
          visual: { shape: "box", color: "#60a5fa", label: "Vật 1", angle: -beamAngle },
        },
        {
          id: "right-mass",
          x: right.x,
          y: right.y,
          vx: 0,
          vy: 0,
          mass: mRight,
          fixed: true,
          radius: rightRadius,
          visual: { shape: "box", color: "#f472b6", label: "Vật 2", angle: -beamAngle },
        },
      ],
      forces: [],
      constraints: [
        { kind: "surface", x: 0, y: pivotY, angle: beamAngle, length: 6.4, friction: 0 },
        { kind: "rod", a: "support-left", b: "pivot", length: 0.9 },
        { kind: "rod", a: "support-right", b: "pivot", length: 0.9 },
      ],
      annotations: [
        {
          kind: "vector",
          anchor: "left-mass",
          dx: 0,
          dy: weightVector(PLeft),
          color: "#93c5fd",
          label: "P1",
          width: 3,
        },
        {
          kind: "vector",
          anchor: "right-mass",
          dx: 0,
          dy: weightVector(PRight),
          color: "#f9a8d4",
          label: "P2",
          width: 3,
        },
      ],
      view: { minX: -3.5, maxX: 3.5, minY: 0.5, maxY: 3.35 },
    };
  },
  analysis: {
    landmarks: [
      {
        key: "weight-left",
        label: "Trọng lượng vật trái",
        description: "Vật tác dụng trọng lực xuống bập bênh. Độ lớn trọng lực được tính bằng P1 = m1.g.",
        atTime: () => 0,
        values: (p) => {
          const { mLeft, g, PLeft } = values(p);
          return [
            { label: "m1", value: mLeft.toFixed(1), unit: "kg" },
            { label: "g", value: g.toFixed(1), unit: "m/s²" },
            { label: "P1 = m1.g", value: PLeft.toFixed(2), unit: "N" },
          ];
        },
      },
      {
        key: "moment-left",
        label: "Moment bên trái",
        description: "Moment của vật trái quanh trục O bằng trọng lượng nhân với cánh tay đòn: M1 = P1.d1.",
        atTime: () => 0,
        values: (p) => {
          const { PLeft, dLeft, MLeft } = values(p);
          return [
            { label: "P1", value: PLeft.toFixed(2), unit: "N" },
            { label: "d1", value: dLeft.toFixed(2), unit: "m" },
            { label: "M1 = P1.d1", value: MLeft.toFixed(2), unit: "N.m" },
          ];
        },
      },
      {
        key: "moment-right",
        label: "Moment bên phải",
        description: "Moment của vật phải quanh trục O được tính tương tự: M2 = P2.d2. Hai moment gây quay theo hai chiều ngược nhau.",
        atTime: () => 0,
        values: (p) => {
          const { PRight, dRight, MRight } = values(p);
          return [
            { label: "P2", value: PRight.toFixed(2), unit: "N" },
            { label: "d2", value: dRight.toFixed(2), unit: "m" },
            { label: "M2 = P2.d2", value: MRight.toFixed(2), unit: "N.m" },
          ];
        },
      },
      {
        key: "balance",
        label: "Kết luận",
        description: "Bập bênh cân bằng khi hai moment đối nhau có độ lớn bằng nhau: m1.g.d1 = m2.g.d2.",
        atTime: () => 0,
        values: (p) => {
          const { MLeft, MRight, net, state } = values(p);
          return [
            { label: "M1", value: MLeft.toFixed(2), unit: "N.m" },
            { label: "M2", value: MRight.toFixed(2), unit: "N.m" },
            { label: "M1 - M2", value: net.toFixed(2), unit: "N.m" },
            { label: "Trạng thái", value: state, unit: "" },
          ];
        },
      },
    ],
  },
};