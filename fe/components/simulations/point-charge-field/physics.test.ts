import { describe, expect, it } from "vitest";
import { fieldAngle, fieldFromCharge, fieldMagnitude, totalField, totalPotential, type Charge } from "./physics";

describe("point-charge-field physics (Coulomb superposition)", () => {
  it("Test 1: single positive charge — field points radially outward", () => {
    const charge: Charge = { x: 0, y: 0, q: 1e-9 };
    const f = fieldFromCharge({ x: 0.5, y: 0 }, charge);
    expect(f.ex).toBeGreaterThan(0);
    expect(f.ey).toBeCloseTo(0, 9);
  });

  it("Test 2: single negative charge — field points radially inward", () => {
    const charge: Charge = { x: 0, y: 0, q: -1e-9 };
    const f = fieldFromCharge({ x: 0.5, y: 0 }, charge);
    expect(f.ex).toBeLessThan(0);
    expect(f.ey).toBeCloseTo(0, 9);
  });

  it("Test 3: two equal positive charges — E ≈ 0 at midpoint", () => {
    const charges: Charge[] = [
      { x: -0.5, y: 0, q: 1e-9 },
      { x: 0.5, y: 0, q: 1e-9 },
    ];
    expect(fieldMagnitude(totalField({ x: 0, y: 0 }, charges))).toBeLessThan(1e-6);
  });

  it("Test 4: two equal positive charges — V ≠ 0 at midpoint", () => {
    const charges: Charge[] = [
      { x: -0.5, y: 0, q: 1e-9 },
      { x: 0.5, y: 0, q: 1e-9 },
    ];
    expect(totalPotential({ x: 0, y: 0 }, charges)).toBeGreaterThan(0);
  });

  it("Test 5: two equal opposite charges — V ≈ 0 at midpoint", () => {
    const charges: Charge[] = [
      { x: -0.5, y: 0, q: 1e-9 },
      { x: 0.5, y: 0, q: -1e-9 },
    ];
    expect(Math.abs(totalPotential({ x: 0, y: 0 }, charges))).toBeLessThan(1e-6);
  });

  it("Test 6: two equal opposite charges — E ≠ 0 at midpoint, points from + toward −", () => {
    const charges: Charge[] = [
      { x: -0.5, y: 0, q: 1e-9 }, // +, bên trái
      { x: 0.5, y: 0, q: -1e-9 }, // −, bên phải
    ];
    const f = totalField({ x: 0, y: 0 }, charges);
    expect(fieldMagnitude(f)).toBeGreaterThan(1);
    expect(f.ex).toBeGreaterThan(0); // hướng +x: từ + (trái) sang − (phải)
    expect(f.ey).toBeCloseTo(0, 6);
  });

  it("Test 7: doubling both charges doubles the field magnitude at a fixed point", () => {
    const p = { x: 0.3, y: 0.2 };
    const base: Charge[] = [
      { x: -0.5, y: 0, q: 1e-9 },
      { x: 0.5, y: 0, q: -1e-9 },
    ];
    const doubled: Charge[] = [
      { x: -0.5, y: 0, q: 2e-9 },
      { x: 0.5, y: 0, q: -2e-9 },
    ];
    const m1 = fieldMagnitude(totalField(p, base));
    const m2 = fieldMagnitude(totalField(p, doubled));
    expect(m2 / m1).toBeCloseTo(2, 2);
  });

  it("Test 8: doubling distance from a single charge quarters the field (inverse square)", () => {
    const charge: Charge = { x: 0, y: 0, q: 1e-9 };
    const near = fieldMagnitude(fieldFromCharge({ x: 1, y: 0 }, charge, 1, 1e-6));
    const far = fieldMagnitude(fieldFromCharge({ x: 2, y: 0 }, charge, 1, 1e-6));
    expect(near / far).toBeCloseTo(4, 1);
  });

  it("Test 9: field respects mirror symmetry for an equal-charge configuration", () => {
    const charges: Charge[] = [
      { x: -0.5, y: 0, q: 1e-9 },
      { x: 0.5, y: 0, q: 1e-9 },
    ];
    const fA = totalField({ x: 0.3, y: 0.2 }, charges);
    const fB = totalField({ x: -0.3, y: 0.2 }, charges); // gương qua trục Oy
    expect(fB.ex).toBeCloseTo(-fA.ex, 6);
    expect(fB.ey).toBeCloseTo(fA.ey, 6);
  });

  it("fieldAngle follows the atan2(Ey, Ex) convention", () => {
    expect(fieldAngle({ ex: 1, ey: 1 })).toBeCloseTo(Math.PI / 4, 9);
  });

  it("epsilonR scales field and potential down proportionally", () => {
    const charges: Charge[] = [{ x: 0, y: 0, q: 1e-9 }];
    const p = { x: 0.5, y: 0 };
    const f1 = fieldMagnitude(totalField(p, charges, 1));
    const f4 = fieldMagnitude(totalField(p, charges, 4));
    expect(f4).toBeCloseTo(f1 / 4, 6);
  });

  it("softening keeps the field finite exactly at a charge's own location", () => {
    const charge: Charge = { x: 0, y: 0, q: 1e-9 };
    const f = fieldFromCharge({ x: 0, y: 0 }, charge);
    expect(Number.isFinite(f.ex)).toBe(true);
    expect(Number.isFinite(f.ey)).toBe(true);
  });
});
