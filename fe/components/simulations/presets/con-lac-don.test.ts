import { describe, expect, it } from "vitest";
import { readPosition } from "../engines/mechanics/build-derivs";
import { run } from "../engines/mechanics/sim-test-helpers";
import type { Scene } from "../engines/mechanics/types";
import {
  buildSimplePendulumAnnotations,
  calculateSimplePendulumValues,
  conLacDon,
} from "./con-lac-don";

const params = { L: 1.8, m: 0.5, angle: 25, g: 9.8 };

describe("dao động con lắc đơn", () => {
  it("tính đúng chu kì góc nhỏ và không phụ thuộc khối lượng", () => {
    const light = calculateSimplePendulumValues({ ...params, m: 0.2 });
    const heavy = calculateSimplePendulumValues({ ...params, m: 1.1 });
    expect(light.period).toBeCloseTo(2 * Math.PI * Math.sqrt(1.8 / 9.8), 10);
    expect(light.period).toBe(heavy.period);
  });

  it("tính độ cao, vận tốc cực đại và cơ năng từ vị trí biên", () => {
    const value = calculateSimplePendulumValues(params);
    const expectedHeight = params.L * (1 - Math.cos((params.angle * Math.PI) / 180));
    expect(value.maximumHeight).toBeCloseTo(expectedHeight, 10);
    expect(value.maximumSpeed).toBeCloseTo(Math.sqrt(2 * params.g * expectedHeight), 10);
    expect(value.mechanicalEnergy).toBeCloseTo(params.m * params.g * expectedHeight, 10);
  });

  it("dựng đúng dây cứng, quả nặng và trọng lực", () => {
    const scene = conLacDon.applyParams(params) as Scene;
    const rod = scene.constraints.find((constraint) => constraint.kind === "rod");
    const gravity = scene.forces.find((force) => force.kind === "gravity");
    const bob = scene.bodies.find((body) => body.id === "bob");
    expect(rod?.kind).toBe("rod");
    if (rod?.kind === "rod") {
      expect(rod.length).toBe(params.L);
      expect(rod.appearance).toBe("pendulum");
    }
    expect(gravity?.kind).toBe("gravity");
    expect(bob?.visual?.shape).toBe("pendulumBob");
  });

  it("giữ quả nặng đúng chiều dài dây trong quá trình mô phỏng", () => {
    const scene = conLacDon.applyParams(params) as Scene;
    const pivot = scene.bodies.find((body) => body.id === "pivot")!;
    const after = readPosition(run(scene, 1.2).s, "bob");
    expect(Math.hypot(after.x - pivot.x, after.y - pivot.y)).toBeCloseTo(params.L, 5);
  });

  it("đưa quả nặng qua gần O sau một phần tư chu kì", () => {
    const scene = conLacDon.applyParams({ ...params, angle: 10 }) as Scene;
    const value = calculateSimplePendulumValues({ ...params, angle: 10 });
    const atQuarter = readPosition(run(scene, value.period / 4).s, "bob");
    expect(Math.abs(atQuarter.x)).toBeLessThan(0.03);
  });

  it("vẽ đủ cung B′–O–B nhưng không có kí hiệu góc alpha", () => {
    const annotations = buildSimplePendulumAnnotations(params);
    const labels = annotations
      .filter((annotation) => annotation.kind === "label")
      .map((annotation) => annotation.kind === "label" ? annotation.text : "");
    expect(labels).toEqual(expect.arrayContaining(["B′", "O", "B"]));
    expect(labels.some((label) => /alpha|α/i.test(label))).toBe(false);
    expect(labels.some((label) => label.includes("Chiều dương"))).toBe(false);
    expect(annotations.some((annotation) => annotation.kind === "arc")).toBe(true);
  });

  it("khai báo vector hợp lực động và vector vận tốc", () => {
    const scene = conLacDon.applyParams(params) as Scene;
    expect(
      scene.annotations?.some((annotation) => annotation.kind === "pendulumResultant"),
    ).toBe(true);
    expect(
      conLacDon.annotations?.(params).some((annotation) => annotation.kind === "velocity"),
    ).toBe(true);
  });

  it("các mốc phân tích nằm tại biên phải, O và biên trái", () => {
    const landmarks = conLacDon.analysis?.landmarks ?? [];
    const period = calculateSimplePendulumValues(params).period;
    expect(landmarks.slice(0, 3).map((landmark) => landmark.atTime?.(params))).toEqual([
      0,
      period / 4,
      period / 2,
    ]);
  });
});
