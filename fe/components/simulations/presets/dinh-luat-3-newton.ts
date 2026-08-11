import type { Scene } from "../engines/mechanics/types";
import { collisionOutcome, collisionParams } from "../newton-third-law/collision-physics";
import type { Preset } from "./types";

const APPROACH_DISTANCE_M = 9.88;

function collisionTime(values: Record<string, number>) {
  const params = collisionParams(values);
  return APPROACH_DISTANCE_M / (params.speedA + params.speedB);
}

export const dinhLuat3Newton: Preset = {
  id: "dinh-luat-3-newton",
  title: "Định luật III Newton — Va chạm và phản lực",
  domain: "Cơ học",
  grade: 10,
  desc: "Hai vật chuyển động từ xa, va chạm trực diện và bật ra theo lực–phản lực.",
  objective: "Quan sát lực tiếp xúc xuất hiện đồng thời, bằng nhau và ngược chiều; đối chiếu vận tốc trước và sau va chạm.",
  sgkRef: "Vật lí 10 — Định luật III Newton",
  startPaused: true,
  params: [
    { key: "mA", label: "Khối lượng vật A", unit: "kg", min: 0.5, max: 8, step: 0.1, default: 1 },
    { key: "mB", label: "Khối lượng vật B", unit: "kg", min: 0.5, max: 8, step: 0.1, default: 1 },
    { key: "speedA", label: "Tốc độ ban đầu A", unit: "m/s", min: 0.5, max: 5, step: 0.1, default: 2.2 },
    { key: "speedB", label: "Tốc độ ban đầu B", unit: "m/s", min: 0.5, max: 5, step: 0.1, default: 2.2 },
  ],
  quickPresets: [
    { label: "Va chạm cân bằng", params: { mA: 1, mB: 1, speedA: 2.2, speedB: 2.2 } },
    { label: "B nặng hơn", params: { mA: 1, mB: 2, speedA: 2.2, speedB: 2.2 } },
    { label: "Va chạm mạnh", params: { mA: 1, mB: 1, speedA: 3.2, speedB: 2.8 } },
  ],
  bodyLabels: { "vat-a": "A", "vat-b": "B" },
  applyParams: (values): Scene => {
    const params = collisionParams(values);
    return {
      bodies: [
        { id: "vat-a", x: -APPROACH_DISTANCE_M / 2, y: 0.28, vx: params.speedA, vy: 0, mass: params.mA, radius: 0.24, visual: { shape: "box", color: "#38bdf8", label: "A", wheels: true } },
        { id: "vat-b", x: APPROACH_DISTANCE_M / 2, y: 0.28, vx: -params.speedB, vy: 0, mass: params.mB, radius: 0.24, visual: { shape: "box", color: "#fb923c", label: "B", wheels: true } },
      ],
      forces: [],
      constraints: [{ kind: "surface", x: 0, y: 0, angle: 0, length: 400, friction: 0 }],
      view: { minX: -5, maxX: 5, minY: 0, maxY: 2.2 },
      groundPadding: 120,
    };
  },
  analysis: {
    landmarks: [
      {
        key: "approach",
        label: "Trước va chạm",
        description: "Hai vật còn cách xa nhau nên chưa có lực tiếp xúc giữa A và B.",
        atTime: () => 0,
        values: (values) => {
          const params = collisionParams(values);
          return [
            { label: "Tốc độ A (sang phải)", value: params.speedA.toFixed(2), unit: "m/s" },
            { label: "Tốc độ B (sang trái)", value: params.speedB.toFixed(2), unit: "m/s" },
            { label: "Động lượng hệ", value: (params.mA * params.speedA - params.mB * params.speedB).toFixed(2), unit: "kg·m/s" },
          ];
        },
      },
      {
        key: "impact",
        label: "Đang va chạm",
        description: "Lực A tác dụng lên B và lực B tác dụng lên A xuất hiện cùng lúc, bằng nhau và ngược chiều.",
        atTime: collisionTime,
        values: (values) => {
          const outcome = collisionOutcome(collisionParams(values));
          return [
            { label: "Xung lượng |J|", value: outcome.impulse.toFixed(2), unit: "N·s" },
            { label: "F_B→A", value: outcome.impulse.toFixed(2), unit: "N·s" },
            { label: "F_A→B", value: outcome.impulse.toFixed(2), unit: "N·s" },
            { label: "Quan hệ", value: "F_B→A = −F_A→B" },
          ];
        },
      },
      {
        key: "after-impact",
        label: "Sau va chạm",
        description: "Hai vật bật ra với vận tốc mới; tổng động lượng của hệ được bảo toàn.",
        atTime: (values) => collisionTime(values) + 1.2,
        values: (values) => {
          const outcome = collisionOutcome(collisionParams(values));
          return [
            { label: "Vận tốc sau của A", value: `${Math.abs(outcome.vA).toFixed(2)} ${outcome.vA < 0 ? "←" : "→"}`, unit: "m/s" },
            { label: "Vận tốc sau của B", value: `${Math.abs(outcome.vB).toFixed(2)} ${outcome.vB < 0 ? "←" : "→"}`, unit: "m/s" },
            { label: "p trước = p sau", value: `${outcome.momentumBefore.toFixed(2)} = ${outcome.momentumAfter.toFixed(2)}`, unit: "kg·m/s" },
          ];
        },
      },
    ],
  },
};
