import type { Preset } from "./types";

const GRAVITY = 9.8;
const TRACK_Y = 0.55;
const TRACK_VISUAL_Y = 0.28;
const GATE_1_X = -0.25;
const GATE_DISTANCE = 0.5;
const GATE_2_X = GATE_1_X + GATE_DISTANCE;
// The flag is mounted 0.1 m behind the cart centre, so this places it
// immediately beside photogate 1 at the start of the measurement.
const CART_START_X = GATE_1_X + 0.1;
const TIMER_START_X = CART_START_X;
const TIMER_END_X = CART_START_X + GATE_DISTANCE;
const HANGER_START_Y = -0.35;
const PULLEY = { x: 3.25, y: TRACK_Y };
const ROPE_LENGTH = (PULLEY.x - CART_START_X) + (PULLEY.y - HANGER_START_Y);

function values(p: Record<string, number>) {
  const force = p.F ?? 1;
  const totalMass = p.m ?? 0.5;
  const hangerMass = force / GRAVITY;
  const cartMass = totalMass - hangerMass;
  const acceleration = force / totalMass;
  const measurementTime = Math.sqrt((2 * GATE_DISTANCE) / acceleration);
  const gate2Speed = acceleration * measurementTime;
  return {
    force,
    totalMass,
    hangerMass,
    cartMass,
    acceleration,
    measurementTime,
    gate2Speed,
  };
}

export const dinhLuat2Newton: Preset = {
  id: "dinh-luat-2-newton",
  title: "Định luật II Newton",
  domain: "Cơ học",
  grade: 10,
  desc: "Đo gia tốc của hệ xe trượt và quả nặng bằng hai cổng quang điện",
  objective: "Kiểm chứng gia tốc tỉ lệ thuận với lực kéo và tỉ lệ nghịch với khối lượng của hệ",
  sgkRef: "Vật lí 10 - Thí nghiệm minh họa định luật II Newton",
  startPaused: true,
  params: [
    { key: "F", label: "Lực kéo", unit: "N", min: 1, max: 3, step: 1, default: 1 },
    { key: "m", label: "Khối lượng M + m", unit: "kg", min: 0.3, max: 0.5, step: 0.1, default: 0.5 },
  ],
  quickPresets: [
    { label: "1 N / 0,3 kg", params: { F: 1, m: 0.3 } },
    { label: "1 N / 0,4 kg", params: { F: 1, m: 0.4 } },
    { label: "1 N / 0,5 kg", params: { F: 1, m: 0.5 } },
    { label: "2 N / 0,5 kg", params: { F: 2, m: 0.5 } },
    { label: "3 N / 0,5 kg", params: { F: 3, m: 0.5 } },
  ],
  applyParams: (p) => {
    const { force, hangerMass, cartMass } = values(p);
    return {
      bodies: [
        {
          id: "cart",
          x: CART_START_X,
          y: TRACK_Y,
          vx: 0,
          vy: 0,
          mass: cartMass,
          radius: 0.22,
          visual: {
            shape: "box",
            color: "#60a5fa",
            label: "Xe trượt",
            wheels: true,
            photogateFlag: true,
          },
        },
        {
          id: "hanger",
          x: PULLEY.x,
          y: HANGER_START_Y,
          vx: 0,
          vy: 0,
          mass: hangerMass,
          radius: 0.18,
          visual: { shape: "box", color: "#f59e0b", label: "Quả nặng" },
        },
        {
          id: "pulley",
          x: PULLEY.x,
          y: PULLEY.y,
          vx: 0,
          vy: 0,
          mass: 1,
          fixed: true,
          radius: 0.2,
          visual: { shape: "pulley" },
        },
      ],
      forces: [{ kind: "gravity", g: GRAVITY }],
      constraints: [
        {
          kind: "curveTrack",
          body: "cart",
          points: [
            { x: -4, y: TRACK_Y },
            { x: PULLEY.x, y: TRACK_Y },
          ],
          friction: 0,
        },
        {
          kind: "rightAngleRope",
          horizontal: "cart",
          vertical: "hanger",
          corner: PULLEY,
          length: ROPE_LENGTH,
        },
      ],
      annotations: [
        {
          kind: "vector",
          anchor: "hanger",
          dx: 0,
          dy: -0.62,
          color: "#fbbf24",
          label: `F = ${force.toFixed(1)} N`,
          labelPosition: "outside",
          width: 2.5,
        },
        {
          kind: "photogateTimer",
          body: "cart",
          startX: TIMER_START_X,
          endX: TIMER_END_X,
          at: { x: -0.35, y: -1.02 },
          color: "#86efac",
        },
      ],
      view: { minX: -4, maxX: 4.25, minY: -1.8, maxY: 2.4 },
      // Raise the complete apparatus into the visual centre and reserve a
      // clear lower strip for the shared zoom controls.
      groundPadding: 230,
    };
  },
  annotations: () => [
    // Máng trượt đệm khí.
    { kind: "rect", x: -0.2, y: TRACK_VISUAL_Y, width: 7.3, height: 0.2, fill: "#334155", stroke: "#cbd5e1", strokeWidth: 2 },
    { kind: "rect", x: -0.2, y: TRACK_VISUAL_Y + 0.075, width: 7.08, height: 0.035, fill: "#dbeafe", stroke: "#dbeafe", strokeWidth: 0 },
    { kind: "rect", x: -2.8, y: 0.02, width: 0.18, height: 0.48, fill: "#475569", stroke: "#94a3b8", strokeWidth: 1.5 },
    { kind: "rect", x: 2.35, y: 0.02, width: 0.18, height: 0.48, fill: "#475569", stroke: "#94a3b8", strokeWidth: 1.5 },

    // Hai cổng quang điện cách nhau 0,5 m.
    { kind: "rect", x: GATE_1_X, y: 1.05, width: 0.11, height: 1.45, fill: "#64748b", stroke: "#cbd5e1", strokeWidth: 1.5 },
    { kind: "rect", x: GATE_1_X, y: 1.72, width: 0.36, height: 0.15, fill: "#2563eb", stroke: "#93c5fd", strokeWidth: 1.5 },
    { kind: "label", x: GATE_1_X - 0.72, y: 1.98, text: "Cổng 1", color: "#bfdbfe", fontSize: 12 },
    { kind: "rect", x: GATE_2_X, y: 1.05, width: 0.11, height: 1.45, fill: "#64748b", stroke: "#cbd5e1", strokeWidth: 1.5 },
    { kind: "rect", x: GATE_2_X, y: 1.72, width: 0.36, height: 0.15, fill: "#2563eb", stroke: "#93c5fd", strokeWidth: 1.5 },
    { kind: "label", x: GATE_2_X + 0.08, y: 1.98, text: "Cổng 2", color: "#bfdbfe", fontSize: 12 },
    { kind: "rect", x: (GATE_1_X + GATE_2_X) / 2, y: 1.44, width: GATE_DISTANCE, height: 0.025, fill: "#7dd3fc", stroke: "#7dd3fc", strokeWidth: 0 },
    { kind: "label", x: GATE_1_X - 0.22, y: 1.57, text: "s = 0,50 m", color: "#7dd3fc", fontSize: 11 },

    // Giá ròng rọc và bộ đo thời gian hiện số.
    { kind: "rect", x: PULLEY.x, y: 0.08, width: 0.16, height: 0.8, fill: "#475569", stroke: "#94a3b8", strokeWidth: 1.5 },
    { kind: "rect", x: 0, y: -1.08, width: 2.15, height: 0.68, fill: "#111827", stroke: "#94a3b8", strokeWidth: 2 },
    { kind: "rect", x: -0.35, y: -1.02, width: 0.82, height: 0.28, fill: "#0f3d2e", stroke: "#34d399", strokeWidth: 1.5 },
    { kind: "label", x: 0.2, y: -0.97, text: "Bộ đo thời gian", color: "#cbd5e1", fontSize: 11 },
    { kind: "curve", x1: GATE_1_X, y1: 0.32, cx1: GATE_1_X, cy1: -0.25, cx2: -0.8, cy2: -0.52, x2: -0.55, y2: -0.75, color: "#60a5fa", strokeWidth: 1.5 },
    { kind: "curve", x1: GATE_2_X, y1: 0.32, cx1: GATE_2_X, cy1: -0.35, cx2: 0.65, cy2: -0.52, x2: 0.55, y2: -0.75, color: "#f59e0b", strokeWidth: 1.5 },
  ],
  bodyLabels: {
    cart: "Xe trượt",
    hanger: "Quả nặng",
  },
  minimalOverlay: true,
  analysis: {
    landmarks: [
      {
        key: "release",
        label: "Lúc thả xe",
        description: "Tấm chắn sáng được đặt sát cổng quang điện 1, nên vận tốc ban đầu của xe được xem bằng 0 và đồng hồ bắt đầu đếm ngay khi thả xe.",
        atTime: () => 0,
        values: (p) => {
          const { force, totalMass, hangerMass, acceleration } = values(p);
          return [
            { label: "Lực kéo F", value: force.toFixed(2), unit: "N" },
            { label: "Khối lượng quả nặng", value: hangerMass.toFixed(3), unit: "kg" },
            { label: "Khối lượng của hệ", value: totalMass.toFixed(2), unit: "kg" },
            { label: "Gia tốc lý thuyết F/m", value: acceleration.toFixed(2), unit: "m/s²" },
          ];
        },
      },
      {
        key: "gate-2",
        label: "Qua cổng quang điện 2",
        description: "Đồng hồ bắt đầu đếm tại cổng 1 và tự dừng khi tấm chắn sáng qua cổng 2. Với v₀ = 0 và s = 0,5 m, gia tốc được tính theo a = 2s/t².",
        atTime: (p) => values(p).measurementTime,
        values: (p) => {
          const { measurementTime, gate2Speed, acceleration } = values(p);
          return [
            { label: "Khoảng cách s", value: GATE_DISTANCE.toFixed(2), unit: "m" },
            { label: "Thời gian đồng hồ đo", value: measurementTime.toFixed(3), unit: "s" },
            { label: "Vận tốc tại cổng 2", value: gate2Speed.toFixed(2), unit: "m/s" },
            { label: "Gia tốc đo được", value: ((2 * GATE_DISTANCE) / measurementTime ** 2).toFixed(2), unit: "m/s²" },
            { label: "Gia tốc lý thuyết", value: acceleration.toFixed(2), unit: "m/s²" },
          ];
        },
      },
      {
        key: "force-mass-relation",
        label: "Quan hệ F, m và a",
        description: "Giữ khối lượng không đổi thì gia tốc tăng theo lực. Giữ lực không đổi thì gia tốc giảm khi khối lượng tăng.",
        values: (p) => {
          const { force, totalMass, acceleration } = values(p);
          return [
            { label: "F", value: force.toFixed(2), unit: "N" },
            { label: "m hệ", value: totalMass.toFixed(2), unit: "kg" },
            { label: "a = F/m", value: acceleration.toFixed(2), unit: "m/s²" },
          ];
        },
      },
    ],
  },
};
