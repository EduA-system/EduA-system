// Truy vết đường sức điện bằng tích phân số RK4 — KHÔNG dùng polyline/Bézier
// vẽ sẵn. Đường sức là đường cong tiếp tuyến với điện trường tại mọi điểm:
//
//   dr/ds = E / |E|
//
// Xem physics.ts cho công thức điện trường Coulomb chồng chất.

import { totalField, fieldMagnitude, type Charge, type Point, type FieldVector } from "./physics";

export type TraceOptions = {
  stepSize: number; // world unit mỗi bước RK4 (0.008–0.015 theo yêu cầu)
  maxSteps: number; // 1500–3000 theo yêu cầu
  chargeHitRadius: number; // world unit — dừng khi vào bán kính này của MỘT điện tích khác
  domainRadius: number; // world unit tính từ gốc — dừng khi ra khỏi miền
  minFieldMag: number; // dừng khi |E| quá nhỏ (gần điểm triệt tiêu trường)
};

export const DEFAULT_TRACE_OPTIONS: TraceOptions = {
  stepSize: 0.012,
  maxSteps: 3000,
  chargeHitRadius: 0.05,
  // Đường sức xuất phát gần dọc trục nối 2 điện tích, hướng RA XA điện tích
  // kia (gần điểm yên ngựa không ổn định của trường) phải đi vòng RẤT XA
  // trước khi cong lại — domainRadius nhỏ sẽ cắt các đường này giữa chừng
  // (nhìn như "không tới được điện tích âm" dù về mặt vật lý dòng đó VẪN cong
  // lại nếu miền đủ rộng). 6 lần khoảng cách điển hình giữa 2 điện tích cho
  // hầu hết các đường mọc thoải mái mà vẫn dùng hết maxSteps hợp lý.
  domainRadius: 6,
  // CHỈ để tránh mất ổn định số học sát điểm triệt tiêu trường thật (vd trung
  // điểm 2 điện tích dương bằng nhau) — KHÔNG phải ngưỡng "trường yếu" thông
  // thường. Với điện tích cỡ nC cách nhau ~1 world unit, |E| thực tế thường
  // trong khoảng 1–40 (V/m quy ước); một đường sức lưỡng cực có thể đi vòng
  // qua vùng |E| nhỏ hơn nhiều trước khi cong về điện tích âm, nên ngưỡng
  // phải thấp hơn NHIỀU so với thang đó để không cắt đường quá sớm.
  minFieldMag: 1e-2,
};

export type TraceResult = { points: Point[]; terminatedAtCharge: boolean };

/**
 * Truy vết MỘT đường sức bằng RK4, xuất phát từ `start`.
 *
 * `sign`:
 * - `1`  — đi THEO chiều E. Dùng khi seed quanh điện tích DƯƠNG: E tại đó
 *   hướng ra ngoài nên tích phân thuận cho đường "mọc ra" tự nhiên.
 * - `-1` — đi NGƯỢC chiều E. Dùng khi seed quanh điện tích ÂM: E tại đó hướng
 *   VÀO điện tích, tích phân thuận sẽ lao thẳng vào tâm ngay lập tức; tích
 *   phân ngược cho đúng hình dạng "mọc ra ngoài" giống hệt trường hợp dương.
 *   Hướng mũi tên khi vẽ PHẢI lấy từ điện trường THẬT tại điểm đó (totalField),
 *   không suy từ `sign`/tiếp tuyến polyline — xem `pointAtFraction` + renderer.
 *
 * `sourceIndex` = chỉ số điện tích đang seed (bỏ qua khi kiểm tra "chạm điện
 * tích khác" để đường không lập tức dừng ngay tại chính điện tích xuất phát).
 */
export function traceFieldLineRK4(
  start: Point,
  charges: Charge[],
  epsilonR: number,
  sourceIndex: number,
  sign: 1 | -1,
  options: Partial<TraceOptions> = {},
): TraceResult {
  const opts: TraceOptions = { ...DEFAULT_TRACE_OPTIONS, ...options };
  const points: Point[] = [start];
  let p = start;

  const direction = (pt: Point): FieldVector | null => {
    const f = totalField(pt, charges, epsilonR);
    const mag = fieldMagnitude(f);
    if (!Number.isFinite(mag) || mag < opts.minFieldMag) return null; // trường quá nhỏ/không hữu hạn
    return { ex: (sign * f.ex) / mag, ey: (sign * f.ey) / mag };
  };

  const hitsOtherCharge = (pt: Point): boolean => {
    for (let i = 0; i < charges.length; i++) {
      if (i === sourceIndex) continue;
      const c = charges[i]!;
      if (Math.hypot(pt.x - c.x, pt.y - c.y) < opts.chargeHitRadius) return true;
    }
    return false;
  };

  let terminatedAtCharge = false;
  for (let step = 0; step < opts.maxSteps; step++) {
    const k1 = direction(p);
    if (!k1) break;
    const p2 = { x: p.x + (opts.stepSize / 2) * k1.ex, y: p.y + (opts.stepSize / 2) * k1.ey };
    const k2 = direction(p2);
    if (!k2) break;
    const p3 = { x: p.x + (opts.stepSize / 2) * k2.ex, y: p.y + (opts.stepSize / 2) * k2.ey };
    const k3 = direction(p3);
    if (!k3) break;
    const p4 = { x: p.x + opts.stepSize * k3.ex, y: p.y + opts.stepSize * k3.ey };
    const k4 = direction(p4);
    if (!k4) break;

    const next: Point = {
      x: p.x + (opts.stepSize / 6) * (k1.ex + 2 * k2.ex + 2 * k3.ex + k4.ex),
      y: p.y + (opts.stepSize / 6) * (k1.ey + 2 * k2.ey + 2 * k3.ey + k4.ey),
    };
    if (!Number.isFinite(next.x) || !Number.isFinite(next.y)) break;
    // Bước quá nhỏ (kẹt tại một điểm) → dừng, tránh lặp vô ích.
    if (Math.hypot(next.x - p.x, next.y - p.y) < opts.stepSize * 1e-3) break;

    p = next;
    points.push(p);

    if (hitsOtherCharge(p)) {
      terminatedAtCharge = true;
      break;
    }
    if (Math.hypot(p.x, p.y) > opts.domainRadius) break; // ra khỏi miền mô phỏng
  }

  return { points, terminatedAtCharge };
}

/** Sinh seed point quanh MỘT điện tích, cách đều theo góc trên một đường tròn nhỏ. */
export function generateChargeSeeds(charge: Charge, seedRadius: number, count: number): Point[] {
  const seeds: Point[] = [];
  for (let i = 0; i < count; i++) {
    const angle = (2 * Math.PI * i) / count;
    seeds.push({ x: charge.x + seedRadius * Math.cos(angle), y: charge.y + seedRadius * Math.sin(angle) });
  }
  return seeds;
}

export type FieldLine = { points: Point[]; sourceIndex: number; terminatedAtCharge: boolean };

/**
 * Truy vết TOÀN BỘ đường sức cho một hệ điện tích: với mỗi điện tích qi≠0,
 * sinh seed quanh nó (số lượng ∝ |qi|, điện tích lớn hơn nhiều đường sức
 * hơn) rồi truy vết RK4 từng đường. Đây là hàm renderer gọi và CACHE lại —
 * chỉ tính lại khi charges/epsilonR/baseLineCount/chargeVisualRadius đổi.
 */
export function traceAllFieldLines(
  charges: Charge[],
  epsilonR: number,
  baseLineCount: number,
  chargeVisualRadius: number,
  domainRadius: number,
): FieldLine[] {
  const lines: FieldLine[] = [];
  const maxQAbs = Math.max(...charges.map((c) => Math.abs(c.q)), 1e-15);
  const seedRadius = chargeVisualRadius * 1.1;
  const hitRadius = chargeVisualRadius * 1.1;
  for (let i = 0; i < charges.length; i++) {
    const charge = charges[i]!;
    if (Math.abs(charge.q) < 1e-15) continue; // điện tích trung hoà: không sinh đường sức
    const count = Math.max(4, Math.round((baseLineCount * Math.abs(charge.q)) / maxQAbs));
    const sign: 1 | -1 = charge.q > 0 ? 1 : -1;
    for (const seed of generateChargeSeeds(charge, seedRadius, count)) {
      const result = traceFieldLineRK4(seed, charges, epsilonR, i, sign, { chargeHitRadius: hitRadius, domainRadius });
      if (result.points.length > 2) lines.push({ points: result.points, sourceIndex: i, terminatedAtCharge: result.terminatedAtCharge });
    }
  }
  return lines;
}

/** Điểm trên polyline tại phân số `fraction` (0..1) theo CHỈ SỐ mảng — với
 * RK4 tích phân theo tiếp tuyến ĐƠN VỊ, mỗi bước dài ≈ stepSize nên phân số
 * chỉ số xấp xỉ tốt phân số độ dài cung, không cần tính độ dài cung thật. */
export function pointAtFraction(points: Point[], fraction: number): Point {
  if (points.length === 0) return { x: 0, y: 0 };
  const idx = Math.min(points.length - 1, Math.max(0, Math.round(fraction * (points.length - 1))));
  return points[idx]!;
}
