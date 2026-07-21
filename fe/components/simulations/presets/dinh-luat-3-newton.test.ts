import { describe, expect, it } from "vitest";
import { netForces } from "../engines/mechanics/forces";
import { readVelocity } from "../engines/mechanics/build-derivs";
import { run } from "../engines/mechanics/sim-test-helpers";
import type { Scene } from "../engines/mechanics/types";
import { dinhLuat3Newton } from "./dinh-luat-3-newton";

describe("Định luật III Newton — lò xo nén", () => {
  it("hiển thị hai xe có đủ bánh, sát mặt đường và chừa vùng an toàn cho ô zoom", () => {
    const scene = dinhLuat3Newton.applyParams({ mA: 1, mB: 1, k: 40, compression: 0.4 }) as Scene;
    const carts = scene.bodies.filter((body) => body.id === "vat-a" || body.id === "vat-b");

    expect(carts).toHaveLength(2);
    expect(carts.every((body) => body.visual?.shape === "box" && body.visual.wheels)).toBe(true);
    expect(carts.every((body) => body.y === 0.28)).toBe(true);
    expect(scene.constraints).toContainEqual(expect.objectContaining({ kind: "surface", y: 0 }));
    expect(scene.groundPadding).toBe(120);
  });

  it("tác dụng hai lực bằng nhau và ngược chiều lên A, B", () => {
    const scene = dinhLuat3Newton.applyParams({ mA: 1, mB: 2, k: 40, compression: 0.4 }) as Scene;
    const positions = Object.fromEntries(scene.bodies.map((body) => [body.id, { x: body.x, y: body.y }]));
    const forces = netForces(scene, {
      pos: (id) => positions[id]!,
      vel: () => ({ x: 0, y: 0 }),
    });

    expect(forces["vat-a"]!.x).toBeCloseTo(-16, 8);
    expect(forces["vat-b"]!.x).toBeCloseTo(16, 8);
    expect(forces["vat-a"]!.x + forces["vat-b"]!.x).toBeCloseTo(0, 10);
    expect(forces["vat-a"]!.y + forces["vat-b"]!.y).toBeCloseTo(0, 10);
  });

  it("giữ động lượng hệ xấp xỉ bằng không khi hai vật tách ra", () => {
    const mA = 1;
    const mB = 2;
    const scene = dinhLuat3Newton.applyParams({ mA, mB, k: 40, compression: 0.4 }) as Scene;
    const { s } = run(scene, 0.8, undefined, 1 / 480);
    const vA = readVelocity(s, "vat-a").x;
    const vB = readVelocity(s, "vat-b").x;

    expect(vA).toBeLessThan(0);
    expect(vB).toBeGreaterThan(0);
    expect(mA * vA + mB * vB).toBeCloseTo(0, 5);
  });
});
