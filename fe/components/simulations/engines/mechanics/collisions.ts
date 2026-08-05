// Va chạm tròn–tròn giữa hai vật, giải bằng XUNG LƯỢNG (impulse) — gọi SAU
// projectConstraints trong build-derivs.ts (Pha 3). Cùng shape với
// projectConstraints: sửa trực tiếp `pts` tại chỗ, đọc `invMass`.
//
// Vì sao đặt sau ràng buộc: rod/rope/surface là ràng buộc cứng; va chạm là một
// xung tức thời theo phương pháp tuyến. Giải ràng buộc trước rồi va chạm sau,
// một lần mỗi sub-step (~1/240 s ở renderer) — đủ chính xác cho bài THPT.
//
// Một pha duy nhất (không lặp Gauss-Seidel): cảnh THPT chỉ 2–3 vật va chạm,
// hiếm khi xếp chồng nhiều vật cùng lúc; phần chồng lấn còn sót được sửa ở
// sub-step kế tiếp. Lặp nhiều vòng chỉ thêm rung, không cần.
//
// AI KHÔNG đụng vào file này.

import type { Scene } from "./types";
import type { PointState } from "./constraints";

export type StickyPair = {
  a: string;
  b: string;
  distance: number;
  nx: number;
  ny: number;
};

type BodyLike = Scene["bodies"][number];

function pairKey(a: string, b: string) {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

function massFromInv(inv: number) {
  return inv > 0 ? 1 / inv : Number.POSITIVE_INFINITY;
}

function commonVelocity(pa: PointState, pb: PointState, wA: number, wB: number) {
  if (wA === 0 && wB === 0) return { vx: 0, vy: 0 };
  if (wA === 0) return { vx: pa.vx, vy: pa.vy };
  if (wB === 0) return { vx: pb.vx, vy: pb.vy };
  const mA = massFromInv(wA);
  const mB = massFromInv(wB);
  return {
    vx: (mA * pa.vx + mB * pb.vx) / (mA + mB),
    vy: (mA * pa.vy + mB * pb.vy) / (mA + mB),
  };
}

function enforceStickyPair(pair: StickyPair, pts: Record<string, PointState>, invMass: Record<string, number>) {
  const PA = pts[pair.a];
  const PB = pts[pair.b];
  if (!PA || !PB) return;

  const wA = invMass[pair.a] ?? 0;
  const wB = invMass[pair.b] ?? 0;
  const wSum = wA + wB;
  if (wSum === 0) return;

  const dx = PB.x - PA.x;
  const dy = PB.y - PA.y;
  let dist = Math.hypot(dx, dy);
  let nx = pair.nx;
  let ny = pair.ny;
  if (dist > 1e-9) {
    nx = dx / dist;
    ny = dy / dist;
    pair.nx = nx;
    pair.ny = ny;
  } else {
    dist = 0;
  }

  const correction = pair.distance - dist;
  PA.x -= nx * correction * (wA / wSum);
  PA.y -= ny * correction * (wA / wSum);
  PB.x += nx * correction * (wB / wSum);
  PB.y += ny * correction * (wB / wSum);

  const v = commonVelocity(PA, PB, wA, wB);
  if (wA > 0) {
    PA.vx = v.vx;
    PA.vy = v.vy;
  }
  if (wB > 0) {
    PB.vx = v.vx;
    PB.vy = v.vy;
  }
}

/**
 * Giải mọi va chạm tròn–tròn trong `scene`, sửa trực tiếp `pts`.
 * Chỉ vật có `radius` mới tham gia. `invMass[id]` = 1/m (0 nếu fixed).
 *
 * Với `restitution = 0`, cặp vật sau khi va chạm được đưa vào `stickyPairs` để
 * tiếp tục đi cùng nhau như một vật ghép, đúng nghĩa va chạm mềm hoàn toàn.
 */
export function resolveCollisions(
  scene: Scene,
  pts: Record<string, PointState>,
  invMass: Record<string, number>,
  stickyPairs?: Map<string, StickyPair>,
): void {
  const e = scene.restitution ?? 1; // hệ số đàn hồi: 1 đàn hồi, 0 mềm hoàn toàn (dính)
  const collidable = scene.bodies.filter((b) => b.radius != null);

  for (const pair of stickyPairs?.values() ?? []) {
    enforceStickyPair(pair, pts, invMass);
  }

  for (let i = 0; i < collidable.length; i++) {
    for (let j = i + 1; j < collidable.length; j++) {
      const A = collidable[i]!;
      const B = collidable[j]!;
      const key = pairKey(A.id, B.id);
      if (stickyPairs?.has(key)) continue;
      const pairRestitution = Math.min(e, A.restitution ?? e, B.restitution ?? e);
      resolvePair(pts, invMass, A, B, pairRestitution, stickyPairs, key);
    }
  }
}

function resolvePair(
  pts: Record<string, PointState>,
  invMass: Record<string, number>,
  A: BodyLike,
  B: BodyLike,
  e: number,
  stickyPairs: Map<string, StickyPair> | undefined,
  key: string,
) {
  const wA = invMass[A.id] ?? 0;
  const wB = invMass[B.id] ?? 0;
  const wSum = wA + wB;
  if (wSum === 0) return; // cả hai cố định → không chỉnh được

  const PA = pts[A.id]!;
  const PB = pts[B.id]!;
  const dx = PB.x - PA.x;
  const dy = PB.y - PA.y;
  let dist = Math.hypot(dx, dy);
  const minDist = A.radius! + B.radius!;
  if (dist >= minDist) return; // chưa chạm

  // Pháp tuyến A→B. Trùng tâm → hướng không xác định, tách tạm theo trục x.
  let nx: number, ny: number;
  if (dist < 1e-9) {
    nx = 1;
    ny = 0;
    dist = 0;
  } else {
    nx = dx / dist;
    ny = dy / dist;
  }

  // (1) TÁCH VỊ TRÍ: đẩy hết phần chồng lấn, chia theo khối lượng nghịch
  // (vật nhẹ dịch nhiều, vật cố định w = 0 nên không dịch).
  const overlap = minDist - dist;
  PA.x -= nx * overlap * (wA / wSum);
  PA.y -= ny * overlap * (wA / wSum);
  PB.x += nx * overlap * (wB / wSum);
  PB.y += ny * overlap * (wB / wSum);

  // (2) XUNG VẬN TỐC: chỉ xử lý khi hai vật ĐANG TIẾN LẠI (relVn < 0).
  // relVn = vận tốc của B so với A, chiếu lên pháp tuyến.
  const relVn = (PB.vx - PA.vx) * nx + (PB.vy - PA.vy) * ny;
  if (relVn >= 0) return; // đang tách xa → không tạo xung (tránh bơm năng lượng)

  if (e === 0) {
    const v = commonVelocity(PA, PB, wA, wB);
    if (wA > 0) {
      PA.vx = v.vx;
      PA.vy = v.vy;
    }
    if (wB > 0) {
      PB.vx = v.vx;
      PB.vy = v.vy;
    }
    stickyPairs?.set(key, { a: A.id, b: B.id, distance: minDist, nx, ny });
    return;
  }

  // j = −(1+e)·relVn / (1/mA + 1/mB). A nhận −, B nhận + (đẩy ra xa).
  const jImp = (-(1 + e) * relVn) / wSum;
  PA.vx -= nx * jImp * wA;
  PA.vy -= ny * jImp * wA;
  PB.vx += nx * jImp * wB;
  PB.vy += ny * jImp * wB;
}
