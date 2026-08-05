import { describe, expect, it } from "vitest";
import {
  CART_MASS_KG,
  HUMAN_SUSTAINED_FORCE_LIMIT_N,
  RACE_DISTANCE_M,
  cartRaceMetrics,
  cartRaceState,
  newtonRaceParams,
  raceMetrics,
  raceWinner,
} from "../newton-second-law/physics";
import { dinhLuat2Newton } from "./dinh-luat-2-newton";

describe("Thí nghiệm định luật II Newton — cuộc đua xe hàng", () => {
  it("chỉ cho chỉnh khối lượng hàng và lực đẩy của hai xe", () => {
    expect(dinhLuat2Newton.params.map((param) => param.key)).toEqual([
      "loadTop",
      "forceTop",
      "loadBottom",
      "forceBottom",
    ]);
    expect(dinhLuat2Newton.params.find((param) => param.key === "loadTop")).toMatchObject({ min: 1, step: 1 });
    expect(dinhLuat2Newton.params.find((param) => param.key === "loadBottom")).toMatchObject({ min: 1, step: 1 });
    expect(dinhLuat2Newton.quickPresets).toHaveLength(4);
  });

  it("tính gia tốc theo lực đẩy chia tổng khối lượng xe và hàng", () => {
    const metrics = cartRaceMetrics(100, 180);
    const expectedMass = 100 + CART_MASS_KG;
    expect(metrics.totalMass).toBe(expectedMass);
    expect(metrics.netForce).toBe(180);
    expect(metrics.acceleration).toBeCloseTo(180 / expectedMass, 8);
  });

  it("giới hạn lực đẩy duy trì của một người ở 230 N", () => {
    const metrics = cartRaceMetrics(80, 320);
    expect(metrics.appliedForce).toBe(HUMAN_SUSTAINED_FORCE_LIMIT_N);
    expect(metrics.forceLimited).toBe(true);
  });

  it("cho xe nhẹ hơn tăng tốc nhanh hơn khi cùng lực", () => {
    const params = newtonRaceParams({
      loadTop: 70,
      forceTop: 180,
      loadBottom: 210,
      forceBottom: 180,
    });
    const metrics = raceMetrics(params);
    expect(metrics.top.acceleration).toBeGreaterThan(metrics.bottom.acceleration);
    expect(raceWinner(params)).toBe("top");
  });

  it("dừng xe đúng tại vạch đích", () => {
    const metrics = cartRaceMetrics(90, 160);
    const state = cartRaceState(metrics, metrics.finishTime + 1);
    expect(state.position).toBe(RACE_DISTANCE_M);
    expect(state.progress).toBe(1);
    expect(state.velocity).toBe(0);
    expect(state.finished).toBe(true);
  });
});
