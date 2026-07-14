// Vật lý thuần (không render/canvas) cho "Điện phổ của hai điện tích điểm" —
// chồng chất điện trường Coulomb thật, KHÔNG hardcode hình dạng đường sức.
// Theo đúng quy ước wave-field/physics.ts: hàm nhỏ, thuần, dễ test.
//
// Đơn vị: điện tích tính bằng Coulomb thật (preset đổi từ nC ×1e-9, giống
// kernel/forces.ts đổi µC), vị trí tính bằng world unit (mét). k = ke/epsilonR.

export type Point = { x: number; y: number };
export type Charge = { x: number; y: number; q: number }; // q: Coulomb (đã đổi từ nC)
export type FieldVector = { ex: number; ey: number };

/** Hằng số Coulomb thật, N·m²/C² — giống COULOMB_KE trong kernel/forces.ts. */
export const COULOMB_KE = 8.99e9;

/** Bán kính "softening" mặc định (world unit) — tránh chia cho 0 sát điện tích. */
export const DEFAULT_SOFTENING = 0.015;

/** k hiệu dụng = ke / epsilonR (điện môi tương đối làm giảm điện trường/điện thế). */
export function effectiveK(epsilonR: number): number {
  return COULOMB_KE / Math.max(epsilonR, 1e-6);
}

/**
 * Điện trường do MỘT điện tích điểm tại P (định luật Coulomb, có softening):
 * E = k·q·rVector / (|rVector|² + softening²)^(3/2)
 */
export function fieldFromCharge(p: Point, charge: Charge, epsilonR = 1, softening = DEFAULT_SOFTENING): FieldVector {
  const dx = p.x - charge.x;
  const dy = p.y - charge.y;
  const softDistSq = dx * dx + dy * dy + softening * softening;
  const coeff = (effectiveK(epsilonR) * charge.q) / Math.pow(softDistSq, 1.5);
  return { ex: coeff * dx, ey: coeff * dy };
}

/** Tổng điện trường tại P — CHỒNG CHẤT (cộng vector) trường của mọi điện tích. */
export function totalField(p: Point, charges: Charge[], epsilonR = 1, softening = DEFAULT_SOFTENING): FieldVector {
  let ex = 0;
  let ey = 0;
  for (const c of charges) {
    const f = fieldFromCharge(p, c, epsilonR, softening);
    ex += f.ex;
    ey += f.ey;
  }
  return { ex, ey };
}

/** Điện thế do MỘT điện tích điểm tại P (có softening): V = k·q / sqrt(r² + softening²). */
export function potentialFromCharge(p: Point, charge: Charge, epsilonR = 1, softening = DEFAULT_SOFTENING): number {
  const dx = p.x - charge.x;
  const dy = p.y - charge.y;
  const r = Math.sqrt(dx * dx + dy * dy + softening * softening);
  return (effectiveK(epsilonR) * charge.q) / r;
}

/** Tổng điện thế tại P — CỘNG ĐẠI SỐ (không phải vector) điện thế mọi điện tích. */
export function totalPotential(p: Point, charges: Charge[], epsilonR = 1, softening = DEFAULT_SOFTENING): number {
  let v = 0;
  for (const c of charges) v += potentialFromCharge(p, c, epsilonR, softening);
  return v;
}

export function fieldMagnitude(f: FieldVector): number {
  return Math.hypot(f.ex, f.ey);
}

export function fieldAngle(f: FieldVector): number {
  return Math.atan2(f.ey, f.ex);
}
