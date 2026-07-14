import { describe, it, expect } from "vitest";
import { computeIntensityGrid, computeInstantaneousFieldGrid, maxAbs, type ZoneGeometry } from "./field-grid";
import { fitViewport } from "./coordinates";
import { slitPositions, waveSpeed, type Point, type WaveParams } from "./physics";

const params: WaveParams = {
  wavelength: 20,
  frequency: 1,
  amplitude: 1,
  slitSeparation: 80,
  slitWidth: 0,
  screenDistance: 350,
  sourceOffsetY: 0,
  amplitudeDecay: false,
  singleSlitDiffraction: false,
};

const xSingleSlit = -140;
const xSlits = 0;
const source: Point = { x: xSingleSlit, y: 0 };
const { s1, s2 } = slitPositions(xSlits, params.slitSeparation);
const geo: ZoneGeometry = { source, s1, s2, xSingleSlit, xSlits };

describe("computeIntensityGrid — Steady-state", () => {
  const vp = fitViewport(320, 240, xSingleSlit - 40, xSlits + 400, -200, 200);

  it("kích thước lưới đúng cols×rows yêu cầu", () => {
    const grid = computeIntensityGrid(40, 30, vp, geo, params, null);
    expect(grid.cols).toBe(40);
    expect(grid.rows).toBe(30);
    expect(grid.values.length).toBe(40 * 30);
  });

  it("mọi ô x < xSingleSlit đều = 0 (trước rào chắn nguồn, chưa mô hình hoá)", () => {
    const grid = computeIntensityGrid(40, 30, vp, geo, params, null);
    for (let row = 0; row < grid.rows; row++) {
      expect(grid.values[row * grid.cols + 0]).toBe(0);
    }
  });

  it("có ô cường độ > 0 ở vùng sau khe kép (giao thoa Steady-state xảy ra)", () => {
    const grid = computeIntensityGrid(40, 30, vp, geo, params, null);
    expect(Math.max(...grid.values)).toBeGreaterThan(0);
  });
});

describe("computeIntensityGrid — Propagation mode (test 1, 5: tối tại t nhỏ)", () => {
  const vp = fitViewport(320, 240, xSingleSlit - 40, xSlits + 400, -200, 200);

  it("test 1: tại t ≈ 0, TOÀN BỘ lưới = 0 (chưa có sóng ở đâu cả, kể cả sát nguồn)", () => {
    const grid = computeIntensityGrid(30, 20, vp, geo, params, { t: 0.001 });
    for (const v of grid.values) expect(v).toBe(0);
  });

  it("sau khi đủ thời gian dài, Propagation mode hội tụ về Steady-state", () => {
    const v = waveSpeed(params.wavelength, params.frequency);
    // đủ thời gian để sóng đi hết toàn bộ chiều rộng lưới + biên độ envelope hoàn tất.
    const farEnoughT = (Math.hypot(800, 400) / v) + 20;
    const propagated = computeIntensityGrid(30, 20, vp, geo, params, { t: farEnoughT });
    const steady = computeIntensityGrid(30, 20, vp, geo, params, null);
    for (let i = 0; i < propagated.values.length; i++) {
      expect(propagated.values[i]).toBeCloseTo(steady.values[i]!, 3);
    }
  });
});

describe("computeInstantaneousFieldGrid", () => {
  const vp = fitViewport(320, 240, xSingleSlit - 40, xSlits + 400, -200, 200);

  it("test 1: tại t ≈ 0, toàn bộ trường tức thời = 0", () => {
    const grid = computeInstantaneousFieldGrid(30, 20, vp, geo, 0.001, params);
    for (const v of grid.values) expect(Math.abs(v)).toBeLessThan(1e-9);
  });

  it("kích thước lưới đúng yêu cầu", () => {
    const grid = computeInstantaneousFieldGrid(30, 20, vp, geo, 5, params);
    expect(grid.values.length).toBe(30 * 20);
  });
});

describe("maxAbs", () => {
  it("trả về giá trị tuyệt đối lớn nhất trong mảng", () => {
    expect(maxAbs(new Float32Array([-3, 1, 2.5, -0.1]))).toBeCloseTo(3, 5);
  });
  it("mảng toàn 0 → trả về giá trị dương nhỏ (tránh chia 0), không phải 0", () => {
    expect(maxAbs(new Float32Array([0, 0, 0]))).toBeGreaterThan(0);
  });
});
