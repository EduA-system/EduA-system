import { describe, expect, it } from "vitest";
import { computeBodyPositionsAtTime } from "../engines/mechanics/sim-time";
import type { Scene } from "../engines/mechanics/types";
import { dinhLuat2Newton } from "./dinh-luat-2-newton";

describe("Thí nghiệm định luật II Newton", () => {
  it("dùng đúng miền khối lượng và năm cấu hình trong bảng 15.1", () => {
    const massParam = dinhLuat2Newton.params.find((param) => param.key === "m");
    expect(massParam).toMatchObject({ min: 0.3, max: 0.5, step: 0.1 });
    expect(dinhLuat2Newton.quickPresets?.map((preset) => preset.params)).toEqual([
      { F: 1, m: 0.3 },
      { F: 1, m: 0.4 },
      { F: 1, m: 0.5 },
      { F: 2, m: 0.5 },
      { F: 3, m: 0.5 },
    ]);
  });

  it("dựng xe, quả nặng và ròng rọc nối bằng dây không dãn", () => {
    const scene = dinhLuat2Newton.applyParams({ F: 1, m: 0.5 }) as Scene;
    expect(scene.bodies.map((body) => body.id)).toEqual(["cart", "hanger", "pulley"]);
    expect(scene.constraints.some((constraint) => constraint.kind === "rightAngleRope")).toBe(true);
    expect(scene.bodies.find((body) => body.id === "cart")?.visual?.photogateFlag).toBe(true);
    expect(scene.annotations?.some((annotation) => annotation.kind === "photogateTimer")).toBe(true);
    expect(scene.groundPadding).toBe(230);
  });

  it("cho gia tốc của xe bằng F chia cho khối lượng toàn hệ", () => {
    const force = 1;
    const totalMass = 0.5;
    const seconds = 0.5;
    const scene = dinhLuat2Newton.applyParams({ F: force, m: totalMass }) as Scene;
    const initialX = scene.bodies.find((body) => body.id === "cart")!.x;
    const positions = computeBodyPositionsAtTime(scene, seconds);
    const displacement = (positions.cart?.x ?? initialX) - initialX;
    const expected = 0.5 * (force / totalMass) * seconds * seconds;
    expect(displacement).toBeCloseTo(expected, 2);
  });

  it("bắt đầu đo tại cổng 1 và dừng đồng hồ tại cổng 2", () => {
    const params = { F: 1, m: 0.5 };
    const release = dinhLuat2Newton.analysis?.landmarks?.find((landmark) => landmark.key === "release");
    const gate2 = dinhLuat2Newton.analysis?.landmarks?.find((landmark) => landmark.key === "gate-2");
    const gate2Time = gate2?.atTime?.(params) ?? 0;
    const measuredAcceleration = gate2?.values(params).find((value) => value.label === "Gia tốc đo được");

    expect(release?.atTime?.(params)).toBe(0);
    expect(gate2Time).toBeGreaterThan(0);
    expect(Number(measuredAcceleration?.value)).toBeCloseTo(2, 2);
  });

  it("cho thời gian lý tưởng theo t = căn bậc hai của (M + m) / F", () => {
    const gate2 = dinhLuat2Newton.analysis?.landmarks?.find((landmark) => landmark.key === "gate-2");
    expect(gate2?.atTime?.({ F: 1, m: 0.5 })).toBeCloseTo(Math.sqrt(0.5), 6);
    expect(gate2?.atTime?.({ F: 3, m: 0.5 })).toBeCloseTo(Math.sqrt(0.5 / 3), 6);
  });
});
