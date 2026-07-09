// Kiểm chứng kernel Cơ học bằng nghiệm giải tích đã biết. Đây là cái biến
// "đúng vật lý" từ niềm tin thành chứng minh được (research/kernel-luc-2d-ke-hoach.md GĐ1).

import { describe, it, expect } from "vitest";
import { readPosition, readVelocity } from "./build-derivs";
import { run } from "./sim-test-helpers";
import type { StateVec } from "../shared/ode";
import type { Scene } from "./types";

describe("Rơi tự do", () => {
  const g = 9.8;
  const scene: Scene = {
    bodies: [{ id: "ball", x: 0, y: 0, vx: 0, vy: 0, mass: 1 }],
    forces: [{ kind: "gravity", g }],
    constraints: [],
  };

  it("vận tốc v = g·t", () => {
    const t = 2;
    const { s } = run(scene, t);
    const vy = readVelocity(s, "ball").y;
    expect(Math.abs(-vy - g * t) / (g * t)).toBeLessThan(0.005);
  });

  it("quãng đường s = ½g·t²", () => {
    const t = 2;
    const { s } = run(scene, t);
    const drop = -readPosition(s, "ball").y; // y đi xuống → âm
    const expected = 0.5 * g * t * t;
    expect(Math.abs(drop - expected) / expected).toBeLessThan(0.005);
  });
});

describe("Ném xiên", () => {
  it("tầm xa R = v₀²·sin(2θ)/g", () => {
    const g = 9.8;
    const v0 = 20;
    const th = (40 * Math.PI) / 180;
    const scene: Scene = {
      bodies: [{ id: "p", x: 0, y: 0, vx: v0 * Math.cos(th), vy: v0 * Math.sin(th), mass: 1 }],
      forces: [{ kind: "gravity", g }],
      constraints: [], // không sàn — đo lúc y cắt 0 bằng nội suy
    };

    // Tích phân tới khi y quay về 0 (sau khi đã bay lên), nội suy x tại y=0.
    let prev = { x: 0, y: 0 };
    let landingX = 0;
    let landed = false;
    run(scene, 5, (s, t) => {
      if (landed) return;
      const p = readPosition(s, "p");
      if (t > 0.1 && p.y <= 0 && prev.y > 0) {
        const frac = prev.y / (prev.y - p.y); // y=0 nằm giữa prev và p
        landingX = prev.x + frac * (p.x - prev.x);
        landed = true;
      }
      prev = p;
    });

    const R = (v0 * v0 * Math.sin(2 * th)) / g;
    expect(landed).toBe(true);
    expect(Math.abs(landingX - R) / R).toBeLessThan(0.01);
  });
});

// Thu thời điểm `valueAt` cắt `center` theo chiều đi LÊN, dùng để đo chu kỳ.
function crossingsUpward(
  scene: Scene,
  seconds: number,
  valueAt: (s: StateVec) => number,
  center: number,
): number[] {
  const times: number[] = [];
  let prev = valueAt(run(scene, 0).s); // trạng thái đầu (chưa bước)
  let prevT = 0;
  run(scene, seconds, (s, t) => {
    const cur = valueAt(s);
    if (prev < center && cur >= center) {
      const frac = (center - prev) / (cur - prev); // nội suy thời điểm cắt
      times.push(prevT + frac * (t - prevT));
    }
    prev = cur;
    prevT = t;
  });
  return times;
}

function avgPeriod(times: number[]): number {
  expect(times.length).toBeGreaterThanOrEqual(2);
  const diffs: number[] = [];
  for (let i = 1; i < times.length; i++) diffs.push(times[i]! - times[i - 1]!);
  return diffs.reduce((a, b) => a + b, 0) / diffs.length;
}

describe("Con lắc đơn (góc nhỏ)", () => {
  it("chu kỳ T ≈ 2π√(L/g)", () => {
    const g = 9.8;
    const L = 1.5;
    const th = (5 * Math.PI) / 180; // 5° → xấp xỉ điều hoà rất tốt
    const px = 0, py = 3;
    const scene: Scene = {
      bodies: [
        { id: "pivot", x: px, y: py, vx: 0, vy: 0, mass: 1, fixed: true },
        { id: "bob", x: px + L * Math.sin(th), y: py - L * Math.cos(th), vx: 0, vy: 0, mass: 1 },
      ],
      forces: [{ kind: "gravity", g }],
      constraints: [{ kind: "rod", a: "pivot", b: "bob", length: L }],
    };
    const times = crossingsUpward(scene, 12, (s) => readPosition(s, "bob").x, px);
    const T = avgPeriod(times);
    const expected = 2 * Math.PI * Math.sqrt(L / g);
    expect(Math.abs(T - expected) / expected).toBeLessThan(0.015);
  });
});

describe("Con lắc lò xo (ngang, không trọng lực)", () => {
  const k = 30, m = 1, A = 0.4, restLength = 1;
  const scene: Scene = {
    bodies: [
      { id: "anchor", x: 0, y: 0, vx: 0, vy: 0, mass: 1, fixed: true },
      { id: "bob", x: restLength + A, y: 0, vx: 0, vy: 0, mass: m }, // kéo giãn A
    ],
    forces: [{ kind: "spring", a: "anchor", b: "bob", k, restLength, damping: 0 }],
    constraints: [],
  };

  it("chu kỳ T ≈ 2π√(m/k)", () => {
    const times = crossingsUpward(scene, 12, (s) => readPosition(s, "bob").x, restLength);
    const T = avgPeriod(times);
    const expected = 2 * Math.PI * Math.sqrt(m / k);
    expect(Math.abs(T - expected) / expected).toBeLessThan(0.01);
  });

  it("cơ năng bảo toàn < 1% qua 10 s", () => {
    const energy = (s: StateVec): number => {
      const p = readPosition(s, "bob");
      const v = readVelocity(s, "bob");
      const ke = 0.5 * m * (v.x * v.x + v.y * v.y);
      const ext = Math.hypot(p.x, p.y) - restLength; // anchor ở gốc
      return ke + 0.5 * k * ext * ext;
    };
    const E0 = energy(run(scene, 0).s);
    let maxDev = 0;
    run(scene, 10, (s) => {
      maxDev = Math.max(maxDev, Math.abs(energy(s) - E0) / E0);
    });
    expect(maxDev).toBeLessThan(0.01);
  });
});

describe("Lực kéo không đổi (định luật II Newton)", () => {
  it("gia tốc a = F/m không đổi → v = (F/m)·t", () => {
    const F = 12;
    const m = 2;
    const scene: Scene = {
      bodies: [{ id: "block", x: 0, y: 0, vx: 0, vy: 0, mass: m }],
      forces: [{ kind: "applied", body: "block", fx: F, fy: 0 }],
      constraints: [],
    };
    const t = 3;
    const { s } = run(scene, t);
    const vx = readVelocity(s, "block").x;
    const expected = (F / m) * t;
    expect(Math.abs(vx - expected) / expected).toBeLessThan(0.005);
  });

  it("khối lượng lớn hơn → gia tốc nhỏ hơn (cùng lực F)", () => {
    const F = 12;
    const scene = (m: number): Scene => ({
      bodies: [{ id: "block", x: 0, y: 0, vx: 0, vy: 0, mass: m }],
      forces: [{ kind: "applied", body: "block", fx: F, fy: 0 }],
      constraints: [],
    });
    const vLight = readVelocity(run(scene(1), 2).s, "block").x;
    const vHeavy = readVelocity(run(scene(3), 2).s, "block").x;
    expect(vLight).toBeGreaterThan(vHeavy);
    expect(Math.abs(vLight / vHeavy - 3) / 3).toBeLessThan(0.005); // tỉ lệ nghịch với m
  });
});

describe("Cộng hưởng con lắc ghép qua lò xo", () => {
  const g = 9.8;
  const L = 1.2;
  const m = 1;
  const k = 2;
  const dx = 2; // khoảng cách 2 trục treo = restLength lò xo khi 2 con lắc cùng L
  const th0 = (6 * Math.PI) / 180; // góc nhỏ, xấp xỉ điều hoà tuyến tính tốt
  const py = 3;
  const anchor1X = -dx / 2;
  const anchor2X = dx / 2;
  const A0 = L * Math.sin(th0); // biên độ ngang ban đầu của con lắc 1

  const scene: Scene = {
    bodies: [
      { id: "p1", x: anchor1X, y: py, vx: 0, vy: 0, mass: 1, fixed: true },
      { id: "p2", x: anchor2X, y: py, vx: 0, vy: 0, mass: 1, fixed: true },
      { id: "bob1", x: anchor1X + L * Math.sin(th0), y: py - L * Math.cos(th0), vx: 0, vy: 0, mass: m },
      { id: "bob2", x: anchor2X, y: py - L, vx: 0, vy: 0, mass: m },
    ],
    forces: [
      { kind: "gravity", g },
      { kind: "spring", a: "bob1", b: "bob2", k, restLength: dx, damping: 0 },
    ],
    constraints: [
      { kind: "rod", a: "p1", b: "bob1", length: L },
      { kind: "rod", a: "p2", b: "bob2", length: L },
    ],
  };

  // Hai con lắc GIỐNG HỆT (cùng L) ghép lò xo yếu → tách 2 mode chuẩn tắc:
  // đối xứng ωs = √(g/L) (lò xo không co giãn nên không ảnh hưởng) và phản
  // đối xứng ωa = √(g/L + 2k/m). Kéo lệch con lắc 1, thả con lắc 2 đứng yên
  // → biên độ mỗi con lắc là tổng/hiệu 2 mode → nhịp phách chu kỳ
  // T_beat = 2π / (ωa − ωs); tại T_beat/2 năng lượng dồn hết sang con lắc 2,
  // tại T_beat quay lại hết con lắc 1 (đúng bản chất cộng hưởng: truyền năng
  // lượng cực đại chỉ khi hai tần số riêng khớp nhau).
  const omegaS = Math.sqrt(g / L);
  const omegaA = Math.sqrt(g / L + (2 * k) / m);
  const tBeat = (2 * Math.PI) / (omegaA - omegaS);
  // Cửa sổ quét quanh mốc thời gian mục tiêu = 1 chu kỳ "sóng mang" trung
  // bình — đủ để bắt được đỉnh/đáy dao động nhanh dù lệch pha thế nào.
  const probe = (2 * Math.PI) / ((omegaA + omegaS) / 2);

  // Quét quanh mốc `target`, trả về biên độ ngang lớn nhất/nhỏ nhất của mỗi
  // bob (so với trục treo của nó) trong cửa sổ quanh mốc đó.
  function scanAround(target: number) {
    let maxX1 = 0, maxX2 = 0, minX1 = Infinity, minX2 = Infinity;
    run(scene, target + probe, (s, t) => {
      if (Math.abs(t - target) > probe) return;
      const x1 = Math.abs(readPosition(s, "bob1").x - anchor1X);
      const x2 = Math.abs(readPosition(s, "bob2").x - anchor2X);
      maxX1 = Math.max(maxX1, x1);
      maxX2 = Math.max(maxX2, x2);
      minX1 = Math.min(minX1, x1);
      minX2 = Math.min(minX2, x2);
    });
    return { maxX1, maxX2, minX1, minX2 };
  }

  it("tại T_beat/2: năng lượng dồn sang con lắc 2, con lắc 1 gần như đứng yên", () => {
    const { maxX2, minX1 } = scanAround(tBeat / 2);
    expect(maxX2).toBeGreaterThan(0.8 * A0);
    expect(minX1).toBeLessThan(0.3 * A0);
  });

  it("tại T_beat: năng lượng quay lại gần hết con lắc 1", () => {
    const { maxX1, minX2 } = scanAround(tBeat);
    expect(maxX1).toBeGreaterThan(0.8 * A0);
    expect(minX2).toBeLessThan(0.3 * A0);
  });
});

// "Đi tới mốc thời gian" (scene-konva-2d.tsx seekSeconds) tích phân xác định
// từ trạng thái đầu bằng CHÍNH stepScene/buildKernel này với sub-step 1/240 —
// các test dưới đây xác nhận công thức atTime() khai báo trong preset thật sự
// trùng trạng thái kernel tại đúng giây đó (không lệch do làm tròn/hội tụ số).
describe("Đi tới mốc thời gian — atTime() khớp trạng thái kernel", () => {
  it("con lắc đơn: tại t = T/4, bob về đúng trục treo (vị trí cân bằng)", () => {
    const g = 9.8;
    const L = 1.6;
    const th = (40 * Math.PI) / 180;
    const px = 0, py = 3;
    const scene: Scene = {
      bodies: [
        { id: "pivot", x: px, y: py, vx: 0, vy: 0, mass: 1, fixed: true },
        { id: "bob", x: px + L * Math.sin(th), y: py - L * Math.cos(th), vx: 0, vy: 0, mass: 1 },
      ],
      forces: [{ kind: "gravity", g }],
      constraints: [{ kind: "rod", a: "pivot", b: "bob", length: L }],
    };
    const T = 2 * Math.PI * Math.sqrt(L / g);
    const { s } = run(scene, T / 4, undefined, 1 / 240); // cùng sub-step renderer dùng khi seek
    const x = readPosition(s, "bob").x;
    expect(Math.abs(x - px)).toBeLessThan(0.05 * L); // gần trục treo
  });

  it("ném xiên: tại t = v₀sinθ/g (đỉnh), vận tốc thẳng đứng ≈ 0", () => {
    const g = 9.8;
    const v0 = 22;
    const th = (55 * Math.PI) / 180;
    const scene: Scene = {
      bodies: [{ id: "p", x: 0, y: 0.2, vx: v0 * Math.cos(th), vy: v0 * Math.sin(th), mass: 1 }],
      forces: [{ kind: "gravity", g }],
      constraints: [],
    };
    const tApex = (v0 * Math.sin(th)) / g;
    const { s } = run(scene, tApex, undefined, 1 / 240);
    expect(Math.abs(readVelocity(s, "p").y)).toBeLessThan(0.05);
  });

  it("ném xiên: tại t = 2v₀sinθ/g (chạm đất), độ cao ≈ độ cao ban đầu", () => {
    const g = 9.8;
    const v0 = 22;
    const th = (55 * Math.PI) / 180;
    const y0 = 0.2;
    const scene: Scene = {
      bodies: [{ id: "p", x: 0, y: y0, vx: v0 * Math.cos(th), vy: v0 * Math.sin(th), mass: 1 }],
      forces: [{ kind: "gravity", g }],
      constraints: [],
    };
    const tLand = (2 * v0 * Math.sin(th)) / g;
    const { s } = run(scene, tLand, undefined, 1 / 240);
    expect(Math.abs(readPosition(s, "p").y - y0)).toBeLessThan(0.1);
  });
});
