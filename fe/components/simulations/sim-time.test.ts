// computeBodyPositionsAtTime là nền tảng của "đi tới mốc thời gian" + tàn ảnh
// (ghost) trên canvas — kiểm chứng nó khớp với run() (đã dùng trong các test
// kernel khác) và khớp nghiệm giải tích rơi tự do.

import { describe, it, expect } from "vitest";
import { computeBodyPositionsAtTime } from "./sim-time";
import type { Scene } from "./kernel/types";

describe("computeBodyPositionsAtTime", () => {
  it("khớp nghiệm giải tích rơi tự do: y(t) = h − ½g·t²", () => {
    const g = 9.8;
    const h = 10;
    const t = 1.2;
    const scene: Scene = {
      bodies: [{ id: "ball", x: 0, y: h, vx: 0, vy: 0, mass: 1 }],
      forces: [{ kind: "gravity", g }],
      constraints: [],
    };
    const pos = computeBodyPositionsAtTime(scene, t);
    const expected = h - 0.5 * g * t * t;
    expect(Math.abs(pos["ball"]!.y - expected)).toBeLessThan(0.01);
  });

  it("t = 0 trả về đúng vị trí ban đầu (kể cả vật fixed)", () => {
    // Bob đặt đúng trên đường tròn bán kính = chiều dài rod quanh pivot, để
    // project(initialState) ở t=0 không cần chỉnh vị trí gì (test thuần vị trí đầu).
    const scene: Scene = {
      bodies: [
        { id: "pivot", x: 1, y: 3, vx: 0, vy: 0, mass: 1, fixed: true },
        { id: "bob", x: 1.5, y: 3 - Math.sqrt(0.75), vx: 0, vy: 0, mass: 1 },
      ],
      forces: [{ kind: "gravity", g: 9.8 }],
      constraints: [{ kind: "rod", a: "pivot", b: "bob", length: 1 }],
    };
    const pos = computeBodyPositionsAtTime(scene, 0);
    expect(pos["pivot"]).toEqual({ x: 1, y: 3 });
    expect(pos["bob"]!.x).toBeCloseTo(1.5, 2);
    expect(pos["bob"]!.y).toBeCloseTo(3 - Math.sqrt(0.75), 2);
  });
});
