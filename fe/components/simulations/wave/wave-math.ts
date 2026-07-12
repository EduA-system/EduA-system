// Toán học thuần cho giao thoa sóng nước 2 nguồn kết hợp cùng pha — không phụ
// thuộc Konva/React, kiểm chứng được bằng công thức SGK (giống tinh thần
// kernel/physics.test.ts: so khớp lời giải closed-form, không chỉ "nhìn ổn").

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

/**
 * Giao điểm CHÍNH XÁC (không xấp xỉ) của quỹ tích hiệu đường đi deltaR với
 * MÀN quan sát — đường thẳng vuông góc trục nối 2 nguồn, cách trung điểm 1
 * khoảng screenDistance dọc trục vuông góc đó (trục chính quang học, hướng từ
 * 2 nguồn ra màn — mô hình Y-âng: 2 khe cách nhau d, màn cách D).
 *
 * Cùng phép biến đổi toạ độ với hyperbolaBranch (yLocal = khoảng cách dọc
 * trục vuông góc), chỉ khác: THAY VÌ quét yLocal để vẽ cả đường cong, ở đây
 * GÁN THẲNG yLocal = screenDistance rồi giải xLocal — cho đúng 1 điểm, chính
 * là vị trí vân trên màn (không phải công thức gần đúng i=λD/a, vốn chỉ là
 * xấp xỉ tuyến tính của chính công thức hypebol này khi D ≫ d).
 */
export function hyperbolaScreenPoint(
  deltaR: number,
  s1: WaveSource,
  s2: WaveSource,
  screenDistance: number,
): Point | null {
  const dx = s2.x - s1.x;
  const dy = s2.y - s1.y;
  const d = Math.hypot(dx, dy);
  if (d < 1e-9) return null;
  const c = d / 2;
  const a = Math.abs(deltaR) / 2;
  if (a >= c) return null;

  const b = Math.sqrt(Math.max(c * c - a * a, 1e-12));
  const midX = (s1.x + s2.x) / 2;
  const midY = (s1.y + s2.y) / 2;
  const ux = dx / d, uy = dy / d;
  const vx = -uy, vy = ux;
  const sign = deltaR >= 0 ? 1 : -1;

  const yLocal = screenDistance;
  const xLocal = sign * a * Math.sqrt(1 + (yLocal * yLocal) / (b * b));
  return { x: midX + xLocal * ux + yLocal * vx, y: midY + xLocal * uy + yLocal * vy };
}

/** 2 đầu mút đoạn MÀN (đường thẳng qua v=screenDistance, xLocal trong [-halfSpan, halfSpan]). */
export function screenEndpoints(s1: WaveSource, s2: WaveSource, screenDistance: number, halfSpan: number): [Point, Point] {
  const dx = s2.x - s1.x, dy = s2.y - s1.y;
  const d = Math.hypot(dx, dy) || 1;
  const midX = (s1.x + s2.x) / 2, midY = (s1.y + s2.y) / 2;
  const ux = dx / d, uy = dy / d;
  const vx = -uy, vy = ux;
  const base = { x: midX + screenDistance * vx, y: midY + screenDistance * vy };
  return [
    { x: base.x - halfSpan * ux, y: base.y - halfSpan * uy },
    { x: base.x + halfSpan * ux, y: base.y + halfSpan * uy },
  ];
}

/** Khoảng vân i = λD/a — công thức SGK, xấp xỉ tuyến tính đúng khi D ≫ a (a = khoảng cách 2 khe). */
export function fringeSpacing(wavelength: number, screenDistance: number, sourceDistance: number): number {
  return (wavelength * screenDistance) / sourceDistance;
}

/**
 * 3 đoạn RÀO CHẮN dọc trục nguồn (S1, S2 là 2 khe hở, mỗi khe rộng
 * 2·gapHalfWidth) — dùng vẽ vách ngăn có khe trong sơ đồ giao thoa ánh sáng
 * Y-âng, để thấy rõ ánh sáng "lọt qua khe" thay vì 2 nguồn trôi nổi giữa
 * không gian. Trả về world points, đoạn nào bị khe "nuốt hết" thì bỏ qua.
 */
export function barrierSegments(
  s1: WaveSource,
  s2: WaveSource,
  halfSpan: number,
  gapHalfWidth: number,
): [Point, Point][] {
  const dx = s2.x - s1.x, dy = s2.y - s1.y;
  const d = Math.hypot(dx, dy) || 1;
  const ux = dx / d, uy = dy / d;
  const midX = (s1.x + s2.x) / 2, midY = (s1.y + s2.y) / 2;
  const c = d / 2;
  const at = (u: number): Point => ({ x: midX + u * ux, y: midY + u * uy });
  const bounds = [-halfSpan, -c - gapHalfWidth, -c + gapHalfWidth, c - gapHalfWidth, c + gapHalfWidth, halfSpan];
  const segments: [Point, Point][] = [];
  if (bounds[0]! < bounds[1]!) segments.push([at(bounds[0]!), at(bounds[1]!)]);
  if (bounds[2]! < bounds[3]!) segments.push([at(bounds[2]!), at(bounds[3]!)]);
  if (bounds[4]! < bounds[5]!) segments.push([at(bounds[4]!), at(bounds[5]!)]);
  return segments;
}

/**
 * Góc (rad) của hướng "ra phía trước" từ 1 khe — trục vuông góc trục nối 2
 * khe, hướng từ khe ra màn (0 = +x). Sóng nhiễu xạ qua khe chỉ lan về hướng
 * này (không lan ngược lại phía sau rào chắn nó vừa xuyên qua).
 */
export function forwardAngleOf(s1: WaveSource, s2: WaveSource): number {
  const dx = s2.x - s1.x, dy = s2.y - s1.y;
  const d = Math.hypot(dx, dy) || 1;
  const vx = -dy / d, vy = dx / d;
  return Math.atan2(vy, vx);
}

/**
 * Các điểm dọc theo 1 CUNG TRÒN quanh center — dùng vẽ sóng nhiễu xạ qua khe
 * hẹp: sau khi qua khe, sóng chỉ lan về PHÍA TRƯỚC (không lan ngược ra sau
 * rào chắn) → chỉ vẽ đúng NỬA hình tròn (bán nguyệt, halfSpanAngle = π/2)
 * hướng forwardAngle, KHÔNG PHẢI đường tròn đầy đủ 360° như trước.
 */
export function arcPoints(
  center: Point,
  radius: number,
  forwardAngle: number,
  halfSpanAngle = Math.PI / 2,
  samples = 32,
): Point[] {
  const pts: Point[] = [];
  for (let i = 0; i <= samples; i++) {
    const theta = forwardAngle - halfSpanAngle + (2 * halfSpanAngle * i) / samples;
    pts.push({ x: center.x + radius * Math.cos(theta), y: center.y + radius * Math.sin(theta) });
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
