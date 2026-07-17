// Toán học thuần cho giao thoa sóng nước 2 nguồn kết hợp cùng pha — không phụ
// thuộc Konva/React, kiểm chứng được bằng công thức SGK (giống tinh thần
// công thức closed-form, không chỉ "nhìn ổn").

import type { WaveSource } from "./types";

export type Point = { x: number; y: number };

export function waveSpeed(wavelength: number, frequency: number): number {
  return wavelength * frequency;
}

export function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** Hiệu đường đi r1 − r2 tại điểm (x, y). */
export function pathDifference(p: Point, s1: WaveSource, s2: WaveSource): number {
  return distance(p, s1) - distance(p, s2);
}

// Bậc cực đại lớn nhất còn tồn tại: |kλ| < d (k=d/λ đúng lúc quỹ tích suy biến
// về đúng vị trí nguồn — không còn là đường cong quan sát được).
export function maxMaximaOrder(sourceDistance: number, wavelength: number): number {
  return Math.max(0, Math.floor((sourceDistance - 1e-6) / wavelength));
}

// Thứ tự cực tiểu lớn nhất: (m − 0.5)λ < d, m = 1, 2, 3…
export function maxMinimaOrder(sourceDistance: number, wavelength: number): number {
  return Math.max(0, Math.floor(sourceDistance / wavelength + 0.5 - 1e-6));
}

/**
 * Một nhánh quỹ tích "hiệu đường đi không đổi" (đường hypebol 2 tiêu điểm s1,
 * s2) — dùng chung cho cả cực đại (deltaR = k·λ) và cực tiểu (deltaR =
 * (m−0.5)·λ). deltaR = 0 → suy biến thành đường trung trực (cực đại trung
 * tâm), công thức dưới tự động cho ra đường thẳng vì a = 0.
 */
export function hyperbolaBranch(
  deltaR: number,
  s1: WaveSource,
  s2: WaveSource,
  extent: number,
  samples = 48,
): Point[] {
  const dx = s2.x - s1.x;
  const dy = s2.y - s1.y;
  const d = Math.hypot(dx, dy);
  if (d < 1e-9) return [];
  const c = d / 2;
  const a = Math.abs(deltaR) / 2;
  if (a >= c) return []; // |Δr| phải < khoảng cách 2 nguồn mới có quỹ tích thực

  const b = Math.sqrt(Math.max(c * c - a * a, 1e-12));
  const midX = (s1.x + s2.x) / 2;
  const midY = (s1.y + s2.y) / 2;
  const ux = dx / d, uy = dy / d; // trục qua 2 nguồn
  const vx = -uy, vy = ux; // trục vuông góc
  const sign = deltaR >= 0 ? 1 : -1; // Δr>0 → nhánh gần s2 hơn

  const pts: Point[] = [];
  for (let i = 0; i <= samples; i++) {
    const t = -1 + (2 * i) / samples;
    const yLocal = t * extent;
    const xLocal = sign * a * Math.sqrt(1 + (yLocal * yLocal) / (b * b));
    pts.push({ x: midX + xLocal * ux + yLocal * vx, y: midY + xLocal * uy + yLocal * vy });
  }
  return pts;
}

export type Circle = { x: number; y: number; r: number };

/** Giao điểm 2 đường tròn (0, 1 hoặc 2 điểm). */
export function circleIntersections(c1: Circle, c2: Circle): Point[] {
  const dx = c2.x - c1.x, dy = c2.y - c1.y;
  const d = Math.hypot(dx, dy);
  if (d < 1e-9) return []; // đồng tâm
  if (d > c1.r + c2.r + 1e-9 || d < Math.abs(c1.r - c2.r) - 1e-9) return []; // không giao
  const a = (c1.r * c1.r - c2.r * c2.r + d * d) / (2 * d);
  const h2 = c1.r * c1.r - a * a;
  if (h2 < 0) return [];
  const h = Math.sqrt(Math.max(h2, 0));
  const ux = dx / d, uy = dy / d;
  const vx = -uy, vy = ux;
  const midX = c1.x + a * ux, midY = c1.y + a * uy;
  if (h < 1e-9) return [{ x: midX, y: midY }];
  return [
    { x: midX + h * vx, y: midY + h * vy },
    { x: midX - h * vx, y: midY - h * vy },
  ];
}

/**
 * Bán kính các vòng sóng (đỉnh + đáy) từ một nguồn còn nằm trong fieldRadius
 * tại thời điểm t — chặn số vòng theo fieldRadius/λ, không phụ thuộc t lớn
 * tới đâu (nguồn phát liên tục nên luôn có vô số vòng, chỉ vòng còn trong
 * vùng vẽ mới cần).
 */
export function ringRadiiAt(
  t: number,
  waveSpeedValue: number,
  wavelength: number,
  fieldRadius: number,
): { crest: number[]; trough: number[] } {
  const reach = waveSpeedValue * t;
  const nMax = Math.floor(reach / wavelength);
  const nMin = Math.max(0, Math.ceil((reach - fieldRadius) / wavelength));
  const crest: number[] = [];
  const trough: number[] = [];
  for (let n = nMin; n <= nMax; n++) {
    const rc = reach - n * wavelength;
    if (rc > 0 && rc <= fieldRadius) crest.push(rc);
    const rt = rc - wavelength / 2;
    if (rt > 0 && rt <= fieldRadius) trough.push(rt);
  }
  return { crest, trough };
}

export type InterferencePoint = Point & { kind: "constructive" | "destructive" };

/**
 * Điểm giao nhau giữa các vòng sóng hiện tại của nguồn 1 và nguồn 2 — đỉnh
 * gặp đỉnh hoặc đáy gặp đáy → cùng pha (cực đại, constructive); đỉnh gặp đáy
 * → ngược pha (cực tiểu, destructive). Đây chính là các điểm "vẽ nên" 2 họ
 * đường hypebol theo thời gian.
 */
export function interferencePoints(
  s1: WaveSource,
  s2: WaveSource,
  t: number,
  waveSpeedValue: number,
  wavelength: number,
  fieldRadius: number,
): InterferencePoint[] {
  const { crest, trough } = ringRadiiAt(t, waveSpeedValue, wavelength, fieldRadius);
  const out: InterferencePoint[] = [];
  const addAll = (radiiA: number[], radiiB: number[], kind: InterferencePoint["kind"]) => {
    for (const rA of radiiA) {
      for (const rB of radiiB) {
        for (const p of circleIntersections({ x: s1.x, y: s1.y, r: rA }, { x: s2.x, y: s2.y, r: rB })) {
          if (distance(p, { x: (s1.x + s2.x) / 2, y: (s1.y + s2.y) / 2 }) <= fieldRadius) {
            out.push({ ...p, kind });
          }
        }
      }
    }
  };
  addAll(crest, crest, "constructive");
  addAll(trough, trough, "constructive");
  addAll(crest, trough, "destructive");
  addAll(trough, crest, "destructive");
  return out;
}
