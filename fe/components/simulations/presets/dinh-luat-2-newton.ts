import {
  CART_MASS_KG,
  DEFAULT_NEWTON_RACE_PARAMS,
  HUMAN_SUSTAINED_FORCE_LIMIT_N,
  RACE_DISTANCE_M,
  cartRaceState,
  newtonRaceParams,
  raceMetrics,
  raceWinner,
} from "../newton-second-law/physics";
import type { Preset } from "./types";

function finishMoment(values: Record<string, number>): number {
  const metrics = raceMetrics(newtonRaceParams(values));
  const finiteTimes = [metrics.top.finishTime, metrics.bottom.finishTime].filter(Number.isFinite);
  return finiteTimes.length > 0 ? Math.max(...finiteTimes) : 0;
}

export const dinhLuat2Newton: Preset = {
  id: "dinh-luat-2-newton",
  title: "Định luật II Newton — Cuộc đua xe hàng",
  domain: "Cơ học",
  grade: 10,
  desc: "So sánh hai người đẩy xe hàng khác nhau về khối lượng và lực đẩy trên cùng quãng đường.",
  objective: "Khám phá gia tốc tỉ lệ thuận với hợp lực và tỉ lệ nghịch với khối lượng qua cuộc đua hai xe hàng.",
  sgkRef: "Vật lí 10 — Định luật II Newton",
  startPaused: true,
  params: [
    { key: "loadTop", label: "Khối lượng hàng xe A", unit: "kg", min: 1, max: 240, step: 1, default: DEFAULT_NEWTON_RACE_PARAMS.loadTop },
    { key: "forceTop", label: "Lực đẩy xe A", unit: "N", min: 80, max: 320, step: 10, default: DEFAULT_NEWTON_RACE_PARAMS.forceTop },
    { key: "loadBottom", label: "Khối lượng hàng xe B", unit: "kg", min: 1, max: 240, step: 1, default: DEFAULT_NEWTON_RACE_PARAMS.loadBottom },
    { key: "forceBottom", label: "Lực đẩy xe B", unit: "N", min: 80, max: 320, step: 10, default: DEFAULT_NEWTON_RACE_PARAMS.forceBottom },
  ],
  quickPresets: [
    { label: "Cùng lực · khác tải", params: { loadTop: 40, forceTop: 180, loadBottom: 140, forceBottom: 180 } },
    { label: "Cùng tải · khác lực", params: { loadTop: 80, forceTop: 120, loadBottom: 80, forceBottom: 220 } },
    { label: "Đấu cân bằng", params: { loadTop: 40, forceTop: 140, loadBottom: 140, forceBottom: 230 } },
    { label: "Thử vượt giới hạn", params: { loadTop: 60, forceTop: 320, loadBottom: 60, forceBottom: 230 } },
  ],
  // Renderer chuyên biệt dựng toàn bộ hai làn đua. Scene rỗng này chỉ giữ đúng
  // hợp đồng của preset cơ học và không tham gia vẽ hay tích phân.
  applyParams: () => ({
    bodies: [],
    forces: [],
    constraints: [],
    view: { minX: 0, maxX: RACE_DISTANCE_M, minY: 0, maxY: 2 },
  }),
  minimalOverlay: true,
  analysis: {
    landmarks: [
      {
        key: "release",
        label: "Lúc bắt đầu đẩy",
        description: "Hai xe xuất phát cùng vị trí. Khối lượng hệ bằng khối lượng hàng cộng 35 kg của xe.",
        atTime: () => 0,
        values: (values) => {
          const params = newtonRaceParams(values);
          const metrics = raceMetrics(params);
          return [
            { label: "Khối lượng hệ A", value: metrics.top.totalMass.toFixed(0), unit: "kg" },
            { label: "Khối lượng hệ B", value: metrics.bottom.totalMass.toFixed(0), unit: "kg" },
            { label: "Giới hạn lực duy trì", value: HUMAN_SUSTAINED_FORCE_LIMIT_N.toFixed(0), unit: "N/người" },
            { label: "Khối lượng mỗi xe", value: CART_MASS_KG.toFixed(0), unit: "kg" },
          ];
        },
      },
      {
        key: "after-3-seconds",
        label: "Sau 3 giây",
        description: "Với gia tốc không đổi, quãng đường tăng theo s = ½at²; xe có F/m lớn hơn sẽ tiến xa hơn.",
        atTime: () => 3,
        values: (values) => {
          const params = newtonRaceParams(values);
          const metrics = raceMetrics(params);
          const top = cartRaceState(metrics.top, 3);
          const bottom = cartRaceState(metrics.bottom, 3);
          return [
            { label: "Gia tốc xe A", value: top.acceleration.toFixed(2), unit: "m/s²" },
            { label: "Quãng đường xe A", value: top.position.toFixed(2), unit: "m" },
            { label: "Gia tốc xe B", value: bottom.acceleration.toFixed(2), unit: "m/s²" },
            { label: "Quãng đường xe B", value: bottom.position.toFixed(2), unit: "m" },
          ];
        },
      },
      {
        key: "finish",
        label: "Kết quả cuộc đua",
        description: "Hai xe chuyển động khi bỏ qua lực cản. Mô phỏng giới hạn lực đặt vượt 230 N theo một mức tham chiếu đẩy xe duy trì; đây không phải giới hạn an toàn cho mọi người.",
        atTime: finishMoment,
        values: (values) => {
          const params = newtonRaceParams(values);
          const metrics = raceMetrics(params);
          const winner = raceWinner(params);
          return [
            { label: "Lực đẩy xe A", value: metrics.top.appliedForce.toFixed(0), unit: "N" },
            { label: "Thời gian xe A", value: Number.isFinite(metrics.top.finishTime) ? metrics.top.finishTime.toFixed(2) : "Không tới đích", unit: Number.isFinite(metrics.top.finishTime) ? "s" : undefined },
            { label: "Lực đẩy xe B", value: metrics.bottom.appliedForce.toFixed(0), unit: "N" },
            { label: "Thời gian xe B", value: Number.isFinite(metrics.bottom.finishTime) ? metrics.bottom.finishTime.toFixed(2) : "Không tới đích", unit: Number.isFinite(metrics.bottom.finishTime) ? "s" : undefined },
            { label: "Kết quả", value: winner === "top" ? "Xe A thắng" : winner === "bottom" ? "Xe B thắng" : winner === "tie" ? "Gần như hòa" : "Cả hai đứng yên" },
          ];
        },
      },
    ],
  },
};
