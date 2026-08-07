import { describe, expect, it } from "vitest";
import { computeBodyPositionsAtTime } from "../engines/mechanics/sim-time";
import type { Scene } from "../engines/mechanics/types";
import { ongNewton } from "./ong-newton-khong-khi";

describe("Ống Newton so sánh hai môi trường", () => {
  it("dựng hai cặp vật nhưng chỉ áp lực cản cho ống không khí", () => {
    const scene = ongNewton.applyParams({ h: 9, g: 9.8, mBall: 0.05, mFeather: 0.003, airScale: 1 }) as Scene;
    expect(scene.bodies).toHaveLength(4);
    expect(scene.bodies.filter((body) => body.visual?.shape === "feather")).toHaveLength(2);
    expect(scene.forces.filter((force) => force.kind === "drag").map((force) => force.body).sort()).toEqual([
      "khong-khi-long-chim",
      "khong-khi-vien-bi",
    ]);
  });

  it("cho hai vật chân không rơi cùng nhau còn lông chim trong không khí rơi chậm hơn", () => {
    const scene = ongNewton.applyParams({ h: 9, g: 9.8, mBall: 0.05, mFeather: 0.003, airScale: 1 }) as Scene;
    const positions = computeBodyPositionsAtTime(scene, 1);
    expect(positions["chan-khong-vien-bi"]?.y).toBeCloseTo(positions["chan-khong-long-chim"]?.y ?? 0, 6);
    expect(positions["khong-khi-long-chim"]?.y).toBeGreaterThan(positions["khong-khi-vien-bi"]?.y ?? 0);
  });
});
