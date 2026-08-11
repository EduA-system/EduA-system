import { describe, expect, it } from "vitest";
import type { Scene } from "../engines/mechanics/types";
import { doPTBangLucKe } from "./do-p-t-bang-luc-ke";
import type { MechanicsPreset } from "./types";

describe("Đo trọng lượng của vật bằng lực kế", () => {
  it("hiển thị T = P = mg với g = 9,8 m/s²", () => {
    const scene = doPTBangLucKe.applyParams({ mass: 2 }) as Scene;
    const meter = scene.bodies.find((body) => body.id === "luc-ke");
    const hangingBody = scene.bodies.find((body) => body.id === "vat");

    expect(hangingBody?.mass).toBe(2);
    expect(meter?.visual?.reading).toBe("19.6 N");
    expect(meter?.visual?.readingRatio).toBeCloseTo(19.6 / 50);
    expect(meter?.visual?.forceMeterHookBody).toBe("moc");
    expect(meter?.visual?.forceMeterInteractiveBody).toBe("vat");
    expect(meter?.visual?.forceMeterMaxReading).toBe(50);
    expect(scene.forces).toEqual([{ kind: "gravity", g: 9.8 }]);
  });

  it("giữ nguyên chiều dài dây nhưng hạ đầu móc và vật khi khối lượng tăng", () => {
    const lightScene = doPTBangLucKe.applyParams({ mass: 0.5 }) as Scene;
    const heavyScene = doPTBangLucKe.applyParams({ mass: 4 }) as Scene;
    const position = (scene: Scene, id: string) => scene.bodies.find((body) => body.id === id)!.y;

    const lightHookY = position(lightScene, "moc");
    const heavyHookY = position(heavyScene, "moc");
    const lightBodyY = position(lightScene, "vat");
    const heavyBodyY = position(heavyScene, "vat");

    expect(heavyHookY).toBeLessThan(lightHookY);
    expect(heavyBodyY).toBeLessThan(lightBodyY);
    expect(lightHookY - lightBodyY).toBeCloseTo(1.05, 8);
    expect(heavyHookY - heavyBodyY).toBeCloseTo(1.05, 8);
    expect(heavyHookY - heavyBodyY).toBeCloseTo(lightHookY - lightBodyY, 8);
  });

  it("có giá treo hoàn chỉnh và chừa khoảng trống cho ô zoom", () => {
    const scene = doPTBangLucKe.applyParams({ mass: 1 }) as Scene;
    const preset = doPTBangLucKe as MechanicsPreset;
    const standParts = preset.annotations?.({ mass: 1 }) ?? [];
    const polygons = standParts.filter((annotation) => annotation.kind === "polygon");
    const jointBlocks = standParts.filter((annotation) => annotation.kind === "rect");

    expect(polygons).toHaveLength(3);
    expect(jointBlocks).toHaveLength(2);
    expect(scene.groundPadding).toBe(48);
    expect(preset.lockPan).toBe(true);
  });
});
