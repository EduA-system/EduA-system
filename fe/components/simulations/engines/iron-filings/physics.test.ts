import { describe, expect, it } from "vitest";
import { fieldAt } from "./physics";
import type { IronFilingsScene } from "./types";

describe("iron filings field", () => {
  it("bar magnet field points outward from its N pole", () => {
    const scene: IronFilingsScene = { kind: "iron-filings", magnetX: 0, magnetY: 0, strength: 1 };
    const field = fieldAt(scene, 1, 0);
    expect(field.x).toBeGreaterThan(0);
    expect(Math.abs(field.y)).toBeLessThan(1e-8);
  });
});
