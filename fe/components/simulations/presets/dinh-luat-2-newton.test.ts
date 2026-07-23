import { describe, expect, it } from "vitest";
import { computeBodyPositionsAtTime } from "../engines/mechanics/sim-time";
import type { Scene } from "../engines/mechanics/types";
import type { MechanicsPreset } from "./types";
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
    expect(scene.bodies.find((body) => body.id === "cart")?.visual?.photogateFlag).toBeUndefined();
    expect(scene.annotations?.some((annotation) => annotation.kind === "photogateTimer")).toBe(true);
    expect(scene.groundPadding).toBe(300);
    expect(scene.disableDragging).toBe(true);
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

  it("keeps the measured gate distance at 0.5 m while enlarging the apparatus", () => {
    const scene = dinhLuat2Newton.applyParams({ F: 1, m: 0.5 }) as Scene;
    const timer = scene.annotations?.find((annotation) => annotation.kind === "photogateTimer");
    const staticAnnotations = (dinhLuat2Newton as MechanicsPreset).annotations?.({}) ?? [];
    const gate1 = staticAnnotations.find(
      (annotation) => annotation.kind === "rect" && annotation.width === 0.055,
    );
    const cart = scene.bodies.find((body) => body.id === "cart")!;
    const gateCaps = staticAnnotations.filter(
      (annotation) => annotation.kind === "rect" && annotation.fill === "#2563eb",
    );
    const track = staticAnnotations.find((annotation) => annotation.kind === "rect" && annotation.fill === "#334155");
    const bumper = staticAnnotations.find((annotation) => annotation.kind === "rect" && annotation.fill === "#f97316");

    expect((scene.view?.maxX ?? 0) - (scene.view?.minX ?? 0)).toBeLessThan(5);
    expect(scene.displayScaleX).toBe(3);
    expect(scene.displayScaleXRange?.startX).toBeCloseTo(cart.x, 8);
    expect(scene.displayScaleXRange?.outsideScale).toBe(0.7);
    expect(cart.displayScale).toBe(0.62);
    expect(cart.radius).toBe(0.22);
    if (timer?.kind !== "photogateTimer") throw new Error("Photogate timer is missing");
    if (gate1?.kind !== "rect") throw new Error("Gate 1 is missing");
    if (track?.kind !== "rect") throw new Error("Air track is missing");
    if (bumper?.kind !== "rect") throw new Error("Bumper is missing");
    expect(timer.endX - timer.startX).toBeCloseTo(0.5, 8);
    expect(scene.displayScaleXRange?.endX).toBeCloseTo(bumper.x + bumper.width / 2, 8);
    expect(bumper.y - bumper.height / 2).toBeCloseTo(track.y + track.height / 2, 8);
    expect(timer.bodyOffsetX).toBeCloseTo(0.055, 8);
    expect(gateCaps).toHaveLength(2);
    const gateCap1 = gateCaps[0];
    if (gateCap1?.kind !== "rect") throw new Error("Gate cap is missing");
    expect(gate1.y - gate1.height / 2).toBeCloseTo(track.y + track.height / 2, 8);
    expect(gate1.y + gate1.height / 2).toBeCloseTo(gateCap1.y - gateCap1.height / 2, 8);
    expect(cart.x).toBeLessThan(gate1.x);
    expect(cart.x + (timer.bodyOffsetX ?? 0)).toBeCloseTo(gate1.x - gate1.width / 2, 8);
    expect(timer.startX).toBeCloseTo(gate1.x - gate1.width / 2, 8);
  });

  it("keeps the cart and hanger coupled for F = 3 N and m = 0.3 kg", () => {
    const scene = dinhLuat2Newton.applyParams({ F: 3, m: 0.3 }) as Scene;
    const cart = scene.bodies.find((body) => body.id === "cart")!;
    const hanger = scene.bodies.find((body) => body.id === "hanger")!;
    const initialCartX = cart.x;
    const initialHangerY = hanger.y;

    expect(cart.mass).toBeGreaterThan(0);
    expect(hanger.mass).toBeGreaterThan(0);
    expect(cart.mass + hanger.mass).toBeCloseTo(0.3, 8);
    expect(scene.forces.some((force) => force.kind === "applied")).toBe(true);

    const seconds = 0.15;
    const positions = computeBodyPositionsAtTime(scene, seconds);
    const cartDisplacement = (positions.cart?.x ?? initialCartX) - initialCartX;
    const hangerDisplacement = initialHangerY - (positions.hanger?.y ?? initialHangerY);
    const expected = 0.5 * (3 / 0.3) * seconds * seconds;

    expect(cartDisplacement).toBeCloseTo(expected, 2);
    expect(hangerDisplacement).toBeCloseTo(expected, 2);
    expect(cartDisplacement).toBeCloseTo(hangerDisplacement, 5);
  });

  it("stops the cart at the short bumper after gate 2", () => {
    const scene = dinhLuat2Newton.applyParams({ F: 1, m: 0.5 }) as Scene;
    const track = scene.constraints.find((constraint) => constraint.kind === "curveTrack");
    const timer = scene.annotations?.find((annotation) => annotation.kind === "photogateTimer");
    const bumper = ((dinhLuat2Newton as MechanicsPreset).annotations?.({}) ?? []).find((annotation) => annotation.kind === "rect" && annotation.fill === "#f97316");
    if (track?.kind !== "curveTrack") throw new Error("Cart track is missing");
    if (timer?.kind !== "photogateTimer" || bumper?.kind !== "rect") throw new Error("Stop geometry is missing");
    const stopX = track.points.at(-1)!.x;
    const positions = computeBodyPositionsAtTime(scene, 2);
    expect(positions.cart?.x).toBeCloseTo(stopX, 2);
    expect(stopX + (timer.bodyOffsetX ?? 0)).toBeCloseTo(bumper.x - bumper.width / 2, 8);
  });
});
