import { describe, expect, it } from "vitest";
import { netForces } from "../engines/mechanics/forces";
import type { Scene } from "../engines/mechanics/types";
import { matNghiengMaSat } from "./mat-nghieng-ma-sat";

function sceneAt(params: Record<string, number>): Scene {
  return matNghiengMaSat.applyParams(params) as Scene;
}

function forceAlongSlope(scene: Scene, alpha: number): number {
  const body = scene.bodies.find((item) => item.id === "vat")!;
  const force = netForces(scene, {
    pos: () => ({ x: body.x, y: body.y }),
    vel: () => ({ x: body.vx, y: body.vy }),
  }).vat!;
  const angle = (alpha * Math.PI) / 180;
  return force.x * Math.cos(angle) + force.y * Math.sin(angle);
}

describe("mặt phẳng nghiêng có ma sát", () => {
  it("ma sát nghỉ tự điều chỉnh để vật cân bằng", () => {
    const scene = sceneAt({ alpha: 25, m: 2, mu: 0.2, Fk: 11.8 });
    expect(forceAlongSlope(scene, 25)).toBeCloseTo(0, 8);
  });

  it("vật trượt xuống khi thành phần trọng lực thắng ma sát", () => {
    const scene = sceneAt({ alpha: 30, m: 2, mu: 0.1, Fk: 0 });
    const expected = -(2 * 9.8 * Math.sin(Math.PI / 6) - 0.1 * 2 * 9.8 * Math.cos(Math.PI / 6));
    expect(forceAlongSlope(scene, 30)).toBeCloseTo(expected, 8);
    expect(scene.annotations?.some((item) => item.kind === "vector" && item.label === "Fₖ")).toBe(false);
  });

  it("khóa vật trong đoạn dốc hữu hạn mà không vẽ ray phụ", () => {
    const scene = sceneAt({ alpha: 25, m: 2, mu: 0.2, Fk: 12 });
    const track = scene.constraints.find((item) => item.kind === "curveTrack");
    expect(track?.kind).toBe("curveTrack");
    if (track?.kind === "curveTrack") expect(track.hidden).toBe(true);
  });
});
