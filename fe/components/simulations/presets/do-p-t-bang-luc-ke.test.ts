import { describe, expect, it } from "vitest";
import type { Scene } from "../engines/mechanics/types";
import { doPTBangLucKe } from "./do-p-t-bang-luc-ke";

describe("Đo trọng lượng của vật bằng lực kế", () => {
  it("hiển thị T = P = mg với g = 9,8 m/s²", () => {
    const scene = doPTBangLucKe.applyParams({ mass: 2 }) as Scene;
    const meter = scene.bodies.find((body) => body.id === "luc-ke");
    const hangingBody = scene.bodies.find((body) => body.id === "vat");

    expect(hangingBody?.mass).toBe(2);
    expect(meter?.visual?.reading).toBe("19.6 N");
    expect(meter?.visual?.readingRatio).toBeCloseTo(19.6 / 50);
    expect(scene.forces).toEqual([{ kind: "gravity", g: 9.8 }]);
  });
});
