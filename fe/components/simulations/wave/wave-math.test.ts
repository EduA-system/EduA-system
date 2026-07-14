import { describe, it, expect } from "vitest";
import {
  circleIntersections,
  distance,
  hyperbolaBranch,
  maxMaximaOrder,
  maxMinimaOrder,
  pathDifference,
  ringRadiiAt,
  waveSpeed,
} from "./wave-math";

describe("waveSpeed", () => {
  it("v = λf", () => {
    expect(waveSpeed(2, 3)).toBeCloseTo(6, 9);
  });
});

describe("circleIntersections", () => {
  it("hai đường tròn bán kính bằng nhau, tâm cách d — giao điểm đúng công thức tam giác cân", () => {
    const r = 5, d = 6;
    const pts = circleIntersections({ x: -d / 2, y: 0, r }, { x: d / 2, y: 0, r });
    expect(pts).toHaveLength(2);
    const h = Math.sqrt(r * r - (d / 2) * (d / 2));
    for (const p of pts) {
      expect(p.x).toBeCloseTo(0, 6);
      expect(Math.abs(p.y)).toBeCloseTo(h, 6);
    }
  });

  it("không giao khi quá xa nhau", () => {
    expect(circleIntersections({ x: 0, y: 0, r: 1 }, { x: 10, y: 0, r: 1 })).toHaveLength(0);
  });

  it("tiếp xúc ngoài → đúng 1 điểm", () => {
    const pts = circleIntersections({ x: 0, y: 0, r: 3 }, { x: 8, y: 0, r: 5 });
    expect(pts).toHaveLength(1);
    expect(pts[0]!.x).toBeCloseTo(3, 6);
    expect(pts[0]!.y).toBeCloseTo(0, 6);
  });
});

describe("hyperbolaBranch", () => {
  const s1 = { id: "s1", x: -4, y: 0 };
  const s2 = { id: "s2", x: 4, y: 0 };

  it("mọi điểm trên nhánh có |r1 - r2| = |deltaR| không đổi", () => {
    const deltaR = 2.5;
    const pts = hyperbolaBranch(deltaR, s1, s2, 10, 40);
    expect(pts.length).toBeGreaterThan(0);
    for (const p of pts) {
      const diff = distance(p, s1) - distance(p, s2);
      expect(diff).toBeCloseTo(deltaR, 4);
    }
  });

  it("deltaR = 0 (cực đại trung tâm) suy biến thành đường trung trực x = 0", () => {
    const pts = hyperbolaBranch(0, s1, s2, 10, 20);
    for (const p of pts) expect(p.x).toBeCloseTo(0, 6);
  });

  it("|deltaR| ≥ khoảng cách 2 nguồn → không có quỹ tích thực", () => {
    expect(hyperbolaBranch(8, s1, s2, 10)).toHaveLength(0);
    expect(hyperbolaBranch(9, s1, s2, 10)).toHaveLength(0);
  });
});

describe("pathDifference", () => {
  it("điểm giữa 2 nguồn có hiệu đường đi bằng 0", () => {
    const s1 = { id: "s1", x: -4, y: 0 };
    const s2 = { id: "s2", x: 4, y: 0 };
    expect(pathDifference({ x: 0, y: 3 }, s1, s2)).toBeCloseTo(0, 9);
  });
});

describe("maxMaximaOrder / maxMinimaOrder", () => {
  it("bậc cực đại lớn nhất = floor(d/λ)", () => {
    expect(maxMaximaOrder(9, 2)).toBe(4); // 9/2 = 4.5
    expect(maxMaximaOrder(8, 2)).toBe(3); // biên đúng 4λ = d → suy biến, không tính
  });

  it("thứ tự cực tiểu lớn nhất theo (m-0.5)λ < d", () => {
    expect(maxMinimaOrder(9, 2)).toBe(4); // (m-0.5)*2 < 9 → m < 5
  });
});

describe("ringRadiiAt", () => {
  it("số vòng đỉnh/đáy còn trong fieldRadius không tăng vô hạn theo t", () => {
    const wavelength = 1.5;
    const fieldRadius = 12;
    const v = 4;
    const { crest: c1 } = ringRadiiAt(3, v, wavelength, fieldRadius);
    const { crest: c2 } = ringRadiiAt(300, v, wavelength, fieldRadius);
    expect(c1.length).toBeLessThanOrEqual(Math.ceil(fieldRadius / wavelength) + 1);
    expect(c2.length).toBeLessThanOrEqual(Math.ceil(fieldRadius / wavelength) + 1);
    for (const r of [...c1, ...c2]) {
      expect(r).toBeGreaterThan(0);
      expect(r).toBeLessThanOrEqual(fieldRadius);
    }
  });
});
