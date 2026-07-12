import { describe, it, expect } from "vitest";
import {
  arcPoints,
  barrierSegments,
  circleIntersections,
  distance,
  forwardAngleOf,
  fringeSpacing,
  hyperbolaBranch,
  hyperbolaScreenPoint,
  maxMaximaOrder,
  maxMinimaOrder,
  pathDifference,
  ringRadiiAt,
  screenEndpoints,
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

describe("hyperbolaScreenPoint / screenEndpoints / fringeSpacing (giao thoa ánh sáng Y-âng)", () => {
  // Quy ước quang học: 2 khe đặt DỌC (trục y), màn cách D dọc trục x (trục chính).
  const a = 1; // khoảng cách 2 khe
  const s1 = { id: "S1", x: 0, y: a / 2 };
  const s2 = { id: "S2", x: 0, y: -a / 2 };

  it("vân trung tâm (deltaR=0) nằm đúng trên trục chính (y = 0), tại x = D", () => {
    const D = 20;
    const p = hyperbolaScreenPoint(0, s1, s2, D);
    expect(p).not.toBeNull();
    expect(p!.x).toBeCloseTo(D, 9);
    expect(p!.y).toBeCloseTo(0, 9);
  });

  it("điểm trả về có đúng hiệu đường đi = deltaR", () => {
    const D = 15, deltaR = 0.3;
    const p = hyperbolaScreenPoint(deltaR, s1, s2, D);
    expect(p).not.toBeNull();
    expect(pathDifference(p!, s1, s2)).toBeCloseTo(deltaR, 6);
  });

  it("|deltaR| ≥ a → không có điểm (giống hyperbolaBranch)", () => {
    expect(hyperbolaScreenPoint(a, s1, s2, 20)).toBeNull();
  });

  it("hội tụ về công thức gần đúng SGK y_k ≈ kλD/a khi D ≫ a VÀ hiệu đường đi ≪ a", () => {
    const wavelength = 0.001, D = 5000, k = 1; // D/a và a/(kλ) đều rất lớn
    const p = hyperbolaScreenPoint(k * wavelength, s1, s2, D);
    const approx = fringeSpacing(wavelength, D, a) * k;
    expect(p).not.toBeNull();
    // Vân đo dọc trục y (phương nối 2 khe) — so khớp gần đúng với sai số tương đối nhỏ.
    expect(Math.abs(p!.y)).toBeCloseTo(approx, 3);
  });

  it("fringeSpacing = λD/a", () => {
    expect(fringeSpacing(0.02, 100, 0.5)).toBeCloseTo((0.02 * 100) / 0.5, 9);
  });

  it("screenEndpoints: 2 đầu mút cách trung điểm 2 nguồn đúng screenDistance dọc trục chính, đối xứng qua trục", () => {
    const D = 20, halfSpan = 6;
    const [p0, p1] = screenEndpoints(s1, s2, D, halfSpan);
    expect(p0.x).toBeCloseTo(D, 9);
    expect(p1.x).toBeCloseTo(D, 9);
    expect(Math.abs(p0.y)).toBeCloseTo(halfSpan, 9);
    expect(Math.abs(p1.y)).toBeCloseTo(halfSpan, 9);
    expect(p0.y).toBeCloseTo(-p1.y, 9); // đối xứng 2 phía trục chính
  });
});

describe("forwardAngleOf", () => {
  it("2 khe đặt DỌC (trục y) → hướng ra trước là +x (0 rad)", () => {
    const s1 = { id: "s1", x: 0, y: 0.5 };
    const s2 = { id: "s2", x: 0, y: -0.5 };
    expect(forwardAngleOf(s1, s2)).toBeCloseTo(0, 9);
  });

  it("2 khe đặt NGANG (trục x) → hướng ra trước là +y (π/2 rad)", () => {
    const s1 = { id: "s1", x: -1, y: 0 };
    const s2 = { id: "s2", x: 1, y: 0 };
    expect(forwardAngleOf(s1, s2)).toBeCloseTo(Math.PI / 2, 9);
  });
});

describe("arcPoints", () => {
  const center = { x: 2, y: 3 };
  const radius = 5;

  it("mọi điểm cách center đúng radius (là 1 cung tròn thật)", () => {
    const pts = arcPoints(center, radius, 0);
    for (const p of pts) {
      expect(distance(p, center)).toBeCloseTo(radius, 9);
    }
  });

  it("bán nguyệt (halfSpanAngle mặc định π/2) — điểm đầu/cuối lệch ±90° so với forwardAngle", () => {
    const forwardAngle = 0;
    const pts = arcPoints(center, radius, forwardAngle);
    const first = pts[0]!, last = pts[pts.length - 1]!;
    // forwardAngle=0 → đầu cung ở góc -π/2 (thẳng đứng phía trên/dưới tuỳ quy ước y), cuối ở +π/2.
    expect(first.x - center.x).toBeCloseTo(radius * Math.cos(-Math.PI / 2), 6);
    expect(first.y - center.y).toBeCloseTo(radius * Math.sin(-Math.PI / 2), 6);
    expect(last.x - center.x).toBeCloseTo(radius * Math.cos(Math.PI / 2), 6);
    expect(last.y - center.y).toBeCloseTo(radius * Math.sin(Math.PI / 2), 6);
  });

  it("điểm giữa cung nằm đúng theo forwardAngle (xa center nhất theo hướng đó)", () => {
    const forwardAngle = Math.PI / 4;
    const pts = arcPoints(center, radius, forwardAngle, Math.PI / 2, 40);
    const mid = pts[20]!; // giữa mảng 41 điểm (0..40)
    expect(mid.x - center.x).toBeCloseTo(radius * Math.cos(forwardAngle), 6);
    expect(mid.y - center.y).toBeCloseTo(radius * Math.sin(forwardAngle), 6);
  });

  it("chỉ trải đúng 180° (nửa hình tròn) — không có điểm nào ở phía SAU forwardAngle", () => {
    const forwardAngle = 0;
    const pts = arcPoints(center, radius, forwardAngle);
    for (const p of pts) {
      const localX = p.x - center.x; // theo hướng forwardAngle=0 (+x) — bán nguyệt phải có mọi điểm x≥0 (trừ sai số nổi)
      expect(localX).toBeGreaterThanOrEqual(-1e-9);
    }
  });
});

describe("barrierSegments", () => {
  const a = 1;
  const s1 = { id: "S1", x: 0, y: a / 2 };
  const s2 = { id: "S2", x: 0, y: -a / 2 };

  it("có đúng 3 đoạn (2 khe hở giữa) khi halfSpan đủ rộng", () => {
    const segs = barrierSegments(s1, s2, 3, 0.1);
    expect(segs).toHaveLength(3);
  });

  it("không đoạn nào phủ lên vị trí 2 khe S1, S2 (khe thực sự hở)", () => {
    const gapHalfWidth = 0.1;
    const segs = barrierSegments(s1, s2, 3, gapHalfWidth);
    for (const src of [s1, s2]) {
      for (const [p0, p1] of segs) {
        // Đoạn thẳng dọc trục qua s1,s2 — kiểm tra src có nằm giữa p0,p1 theo y không (x không đổi = 0).
        const within = Math.min(p0.y, p1.y) - 1e-9 <= src.y && src.y <= Math.max(p0.y, p1.y) + 1e-9;
        expect(within).toBe(false);
      }
    }
  });

  it("đoạn giữa 2 khe (nếu tồn tại) nằm đúng giữa, không lấn vào vùng khe", () => {
    const gapHalfWidth = 0.15;
    const segs = barrierSegments(s1, s2, 3, gapHalfWidth);
    const middle = segs.find((seg) => Math.abs(seg[0].y) < a / 2 && Math.abs(seg[1].y) < a / 2);
    expect(middle).toBeDefined();
    expect(Math.max(Math.abs(middle![0].y), Math.abs(middle![1].y))).toBeLessThanOrEqual(a / 2 - gapHalfWidth + 1e-9);
  });

  it("halfSpan không vươn tới mép ngoài 2 khe → chỉ còn đoạn giữa 2 khe, không có đoạn ngoài", () => {
    const segs = barrierSegments(s1, s2, 0.4, 0.05); // halfSpan(0.4) < c+gapHalfWidth(0.55)
    expect(segs).toHaveLength(1);
    const [p0, p1] = segs[0]!;
    expect(Math.max(Math.abs(p0.y), Math.abs(p1.y))).toBeLessThanOrEqual(a / 2);
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
