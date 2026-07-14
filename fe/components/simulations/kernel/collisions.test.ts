// Kiểm chứng va chạm tròn–tròn: bảo toàn động lượng (mọi e), bảo toàn động năng
// khi e=1, dính khi e=0, và backward-compat (không radius → không va chạm).

import { describe, it, expect } from "vitest";
import { readVelocity } from "./build-derivs";
import { run } from "./sim-test-helpers";
import type { Scene } from "./types";

// Hai vật trên trục x, không lực, không ràng buộc → va chạm 1D thuần.
function headOn(restitution: number, m1 = 1, m2 = 2, v1 = 4): Scene {
  return {
    bodies: [
      { id: "b1", x: -3, y: 0, vx: v1, vy: 0, mass: m1, radius: 0.4 },
      { id: "b2", x: 1, y: 0, vx: 0, vy: 0, mass: m2, radius: 0.4 },
    ],
    forces: [],
    constraints: [],
    restitution,
  };
}

describe("Bảo toàn động lượng", () => {
  for (const e of [0, 0.5, 1]) {
    it(`Σmv không đổi (e=${e})`, () => {
      const m1 = 1, m2 = 2, v1 = 4;
      const { s } = run(headOn(e, m1, m2, v1), 2);
      const p = m1 * readVelocity(s, "b1").x + m2 * readVelocity(s, "b2").x;
      const p0 = m1 * v1;
      expect(Math.abs(p - p0) / p0).toBeLessThan(0.005);
    });
  }
});

describe("Va chạm đàn hồi (e=1)", () => {
  it("bảo toàn động năng", () => {
    const m1 = 1, m2 = 2, v1 = 4;
    const { s } = run(headOn(1, m1, m2, v1), 2);
    const ke =
      0.5 * m1 * readVelocity(s, "b1").x ** 2 + 0.5 * m2 * readVelocity(s, "b2").x ** 2;
    const ke0 = 0.5 * m1 * v1 ** 2;
    expect(Math.abs(ke - ke0) / ke0).toBeLessThan(0.01);
  });
});

describe("Va chạm mềm (e=0)", () => {
  it("hai vật cùng vận tốc = (m₁v₁+m₂v₂)/(m₁+m₂)", () => {
    const m1 = 1, m2 = 2, v1 = 4;
    const { s } = run(headOn(0, m1, m2, v1), 2);
    const u1 = readVelocity(s, "b1").x;
    const u2 = readVelocity(s, "b2").x;
    expect(Math.abs(u1 - u2)).toBeLessThan(0.05);
    const common = (m1 * v1) / (m1 + m2);
    expect(Math.abs(u1 - common)).toBeLessThan(0.05);
  });
});

describe("Backward-compat: không radius → không va chạm", () => {
  it("hai vật chồng nhau vẫn đi độc lập", () => {
    const scene: Scene = {
      bodies: [
        { id: "a", x: 0, y: 0, vx: 1, vy: 0, mass: 1 }, // không radius
        { id: "b", x: 0.1, y: 0, vx: -1, vy: 0, mass: 1 },
      ],
      forces: [],
      constraints: [],
    };
    const { s } = run(scene, 1);
    // Không lực, không va chạm → vận tốc giữ nguyên y hệt ban đầu.
    expect(readVelocity(s, "a").x).toBe(1);
    expect(readVelocity(s, "b").x).toBe(-1);
  });
});
