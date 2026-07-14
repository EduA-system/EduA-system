import { describe, expect, it } from "vitest";
import { generateChargeSeeds, pointAtFraction, traceAllFieldLines, traceFieldLineRK4 } from "./field-line-tracer";
import { totalField, type Charge } from "./physics";

const CHARGE_RADIUS = 0.06;
const DOMAIN = 6;
const HIT = CHARGE_RADIUS * 1.1;

describe("field-line-tracer (RK4)", () => {
  it("Test 10: no NaN/Infinity anywhere in a traced polyline", () => {
    const charges: Charge[] = [
      { x: -0.5, y: 0, q: 1e-9 },
      { x: 0.5, y: 0, q: -1e-9 },
    ];
    const result = traceFieldLineRK4({ x: -0.5 + HIT, y: 0 }, charges, 1, 0, 1, { chargeHitRadius: HIT, domainRadius: DOMAIN });
    expect(result.points.length).toBeGreaterThan(1);
    for (const p of result.points) {
      expect(Number.isFinite(p.x)).toBe(true);
      expect(Number.isFinite(p.y)).toBe(true);
    }
  });

  it("Test 11: field lines never pass through a charge's exact center", () => {
    const charges: Charge[] = [
      { x: -0.5, y: 0, q: 1e-9 },
      { x: 0.5, y: 0, q: -1e-9 },
    ];
    const lines = traceAllFieldLines(charges, 1, 16, CHARGE_RADIUS, DOMAIN);
    expect(lines.length).toBeGreaterThan(0);
    for (const line of lines) {
      for (const p of line.points) {
        for (const c of charges) {
          expect(Math.hypot(p.x - c.x, p.y - c.y)).toBeGreaterThan(CHARGE_RADIUS * 0.5);
        }
      }
    }
  });

  it("Test 12: the true field at an arrow point matches local E, not the trace-integration sign", () => {
    // Với điện tích ÂM, truy vết dùng sign=-1 (tích phân NGƯỢC E) để đường mọc
    // ra ngoài — nhưng khi VẼ mũi tên phải dùng E THẬT (totalField), không
    // phải "-E". Kiểm tra E thật tại một điểm gần điện tích âm luôn hướng VÀO.
    const charges: Charge[] = [{ x: 0, y: 0, q: -1e-9 }];
    const f = totalField({ x: 0.5, y: 0 }, charges);
    expect(f.ex).toBeLessThan(0); // hướng vào điện tích âm (về phía -x từ điểm đo)
  });

  it("opposite equal charges: most field lines seeded at + actually terminate at −", () => {
    const charges: Charge[] = [
      { x: -0.5, y: 0, q: 1e-9 },
      { x: 0.5, y: 0, q: -1e-9 },
    ];
    const lines = traceAllFieldLines(charges, 1, 16, CHARGE_RADIUS, DOMAIN).filter((l) => l.sourceIndex === 0);
    expect(lines.length).toBeGreaterThan(0);
    const terminated = lines.filter((l) => l.terminatedAtCharge).length;
    expect(terminated / lines.length).toBeGreaterThan(0.8);
  });

  it("same-sign equal charges: no field line connects the two charges directly", () => {
    const charges: Charge[] = [
      { x: -0.5, y: 0, q: 1e-9 },
      { x: 0.5, y: 0, q: 1e-9 },
    ];
    const lines = traceAllFieldLines(charges, 1, 16, CHARGE_RADIUS, DOMAIN);
    expect(lines.length).toBeGreaterThan(0);
    for (const line of lines) expect(line.terminatedAtCharge).toBe(false);
  });

  it("line count is proportional to |q| (q1 = 2× q2 → ~2× as many seeded lines)", () => {
    const charges: Charge[] = [
      { x: -0.5, y: 0, q: 2e-9 },
      { x: 0.5, y: 0, q: -1e-9 },
    ];
    const lines = traceAllFieldLines(charges, 1, 20, CHARGE_RADIUS, DOMAIN);
    const count0 = lines.filter((l) => l.sourceIndex === 0).length;
    const count1 = lines.filter((l) => l.sourceIndex === 1).length;
    expect(count0).toBeGreaterThan(count1 * 1.5);
  });

  it("generateChargeSeeds places points evenly on a circle of the given radius", () => {
    const charge: Charge = { x: 1, y: 2, q: 1e-9 };
    const seeds = generateChargeSeeds(charge, 0.1, 8);
    expect(seeds).toHaveLength(8);
    for (const s of seeds) expect(Math.hypot(s.x - charge.x, s.y - charge.y)).toBeCloseTo(0.1, 6);
  });

  it("pointAtFraction returns the start/end point for fraction 0/1", () => {
    const points = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 2, y: 0 },
    ];
    expect(pointAtFraction(points, 0)).toEqual({ x: 0, y: 0 });
    expect(pointAtFraction(points, 1)).toEqual({ x: 2, y: 0 });
  });

  it("Test 9 (tracer level): field lines from a mirror-symmetric same-sign config are mirror images", () => {
    const charges: Charge[] = [
      { x: -0.5, y: 0, q: 1e-9 },
      { x: 0.5, y: 0, q: 1e-9 },
    ];
    const r1 = traceFieldLineRK4({ x: -0.5 - HIT, y: 0.03 }, charges, 1, 0, 1, { chargeHitRadius: HIT, domainRadius: DOMAIN });
    const r2 = traceFieldLineRK4({ x: 0.5 + HIT, y: 0.03 }, charges, 1, 1, 1, { chargeHitRadius: HIT, domainRadius: DOMAIN });
    const n = Math.min(r1.points.length, r2.points.length, 10);
    expect(n).toBeGreaterThan(2);
    for (let i = 0; i < n; i++) {
      expect(r1.points[i]!.x).toBeCloseTo(-r2.points[i]!.x, 2);
      expect(r1.points[i]!.y).toBeCloseTo(r2.points[i]!.y, 2);
    }
  });
});
