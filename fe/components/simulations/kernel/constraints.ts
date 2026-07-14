// Giải ràng buộc cứng (rod/rope) bằng PHÉP CHIẾU VỊ TRÍ — kiểu Position-Based
// Dynamics. Gọi SAU mỗi bước rk4: kéo các vật về đúng khoảng cách ràng buộc,
// rồi khử thành phần vận tốc dọc theo ràng buộc.
//
// Vì sao chiếu vị trí, không dùng lực phạt (lò xo siêu cứng):
//   - Lực phạt biến rod thành ODE *cứng* (stiff) — rk4 với dt cố định ~16ms
//     dễ phát tán (đúng lớp lỗi "nổ số" mà wish muốn diệt).
//   - Lò xo cứng hữu hạn vẫn giãn nhẹ → con lắc đơn lệch chu kỳ.
//   Phép chiếu cho ràng buộc CỨNG TUYỆT ĐỐI, ổn định ở mọi dt hợp lý.
//
// AI KHÔNG đụng vào file này.

import type { Scene } from "./types";

/** Trạng thái một điểm trong lúc giải ràng buộc (kernel sửa trực tiếp tại chỗ). */
export type PointState = { x: number; y: number; vx: number; vy: number };

// Số vòng lặp Gauss-Seidel: với chuỗi nhiều ràng buộc, mỗi vòng giải tuần tự
// từng cái, lặp lại để hội tụ. Bài THPT chuỗi ngắn → 5 vòng là dư.
const ITERATIONS = 5;

type ClosestTrackPoint = {
  x: number;
  y: number;
  tx: number;
  ty: number;
  t: number;
  segment: number;
  dist2: number;
};

function closestPointOnTrack(points: { x: number; y: number }[], x: number, y: number): ClosestTrackPoint | null {
  let best: ClosestTrackPoint | null = null;
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i]!;
    const b = points[i + 1]!;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len2 = dx * dx + dy * dy;
    if (len2 < 1e-12) continue;
    const rawT = ((x - a.x) * dx + (y - a.y) * dy) / len2;
    const t = Math.max(0, Math.min(1, rawT));
    const qx = a.x + dx * t;
    const qy = a.y + dy * t;
    const distX = x - qx;
    const distY = y - qy;
    const dist2 = distX * distX + distY * distY;
    const len = Math.sqrt(len2);
    const candidate = { x: qx, y: qy, tx: dx / len, ty: dy / len, t, segment: i, dist2 };
    if (!best || candidate.dist2 < best.dist2) best = candidate;
  }
  return best;
}

/**
 * Giải toàn bộ ràng buộc của `scene`, sửa trực tiếp các điểm trong `pts`.
 * `invMass[id]` = 1/m, bằng 0 nếu vật cố định (fixed) — vật cố định không bị
 * phép chiếu làm dịch chuyển.
 */
export function projectConstraints(
  scene: Scene,
  pts: Record<string, PointState>,
  invMass: Record<string, number>,
): void {
  if (scene.constraints.length === 0) return;

  for (let iter = 0; iter < ITERATIONS; iter++) {
    for (const c of scene.constraints) {
      // Mặt phẳng cứng: chặn mọi vật động ở phía trên mặt (va chạm một chiều).
      if (c.kind === "surface") {
        const rad = (c.angle * Math.PI) / 180;
        const nx = -Math.sin(rad); // pháp tuyến hướng lên (phía vật được phép ở)
        const ny = Math.cos(rad);
        const tx = Math.cos(rad); // tiếp tuyến (dọc mặt)
        const ty = Math.sin(rad);
        for (const id in pts) {
          if ((invMass[id] ?? 0) === 0) continue; // bỏ qua vật cố định
          const P = pts[id]!;
          const d = (P.x - c.x) * nx + (P.y - c.y) * ny; // khoảng cách có dấu tới mặt
          if (d >= 0) continue; // vật đang ở phía trên mặt → không chạm
          P.x -= nx * d; // kéo vật lên đúng mặt (d < 0 nên đây là cộng theo +n)
          P.y -= ny * d;
          const vn = P.vx * nx + P.vy * ny;
          if (vn >= 0) continue; // không đâm vào mặt → khỏi xử lý vận tốc
          // Khử thành phần vận tốc đâm vào mặt (vật dừng theo phương pháp tuyến).
          P.vx -= nx * vn;
          P.vy -= ny * vn;
          // Ma sát Coulomb: xung ma sát ≤ μ·|xung pháp tuyến|. Mỗi bước, lực hút
          // dồn |vn| vào mặt → ma sát ghì tiếp tuyến tối đa μ·|vn| → khi nghỉ cho
          // gia tốc hãm đúng bằng μ·g.
          if (c.friction > 0) {
            const vt = P.vx * tx + P.vy * ty;
            const drop = Math.min(Math.abs(vt), c.friction * -vn);
            P.vx -= tx * Math.sign(vt) * drop;
            P.vy -= ty * Math.sign(vt) * drop;
          }
        }
        continue;
      }

      if (c.kind === "curveTrack") {
        const P = pts[c.body];
        if (!P || (invMass[c.body] ?? 0) === 0 || c.points.length < 2) continue;
        const q = closestPointOnTrack(c.points, P.x, P.y);
        if (!q) continue;
        const correction = Math.hypot(q.x - P.x, q.y - P.y);
        let vt = P.vx * q.tx + P.vy * q.ty;
        const atStart = q.segment === 0 && q.t <= 1e-5;
        const atEnd = q.segment === c.points.length - 2 && q.t >= 1 - 1e-5;
        if ((atStart && vt < 0) || (atEnd && vt > 0)) vt = 0;
        const friction = c.friction ?? 0;
        if (friction > 0 && correction > 0) {
          const drop = Math.min(Math.abs(vt), friction * correction);
          vt -= Math.sign(vt) * drop;
        }
        P.x = q.x;
        P.y = q.y;
        P.vx = q.tx * vt;
        P.vy = q.ty * vt;
        continue;
      }
      const A = pts[c.a];
      const B = pts[c.b];
      if (!A || !B) continue; // tham chiếu id không tồn tại — bỏ qua
      const wA = invMass[c.a] ?? 0;
      const wB = invMass[c.b] ?? 0;
      const wSum = wA + wB;
      if (wSum === 0) continue; // cả hai cố định → không thể chỉnh

      const dx = B.x - A.x;
      const dy = B.y - A.y;
      const L = Math.hypot(dx, dy);
      if (L < 1e-9) continue; // trùng điểm → hướng không xác định

      const diff = L - c.length; // > 0: đang căng quá; < 0: đang chùng
      // Dây (rope) chỉ kéo: khi chùng (diff ≤ 0) thì không tác dụng gì.
      if (c.kind === "rope" && diff <= 0) continue;

      const nx = dx / L; // vector đơn vị A→B
      const ny = dy / L;

      // (1) Chỉnh VỊ TRÍ: kéo hai vật về đúng khoảng cách, chia phần dịch
      // chuyển theo khối lượng nghịch (vật nhẹ dịch nhiều, vật nặng dịch ít;
      // vật cố định w = 0 nên không dịch).
      const corrA = (diff * wA) / wSum;
      const corrB = (diff * wB) / wSum;
      A.x += nx * corrA;
      A.y += ny * corrA;
      B.x -= nx * corrB;
      B.y -= ny * corrB;

      // (2) Chỉnh VẬN TỐC: khử thành phần vận tốc tương đối dọc ràng buộc,
      // nếu không hai vật sẽ lại rời nhau ngay bước sau. relVn = vận tốc của
      // B so với A, chiếu lên trục ràng buộc.
      const relVn = (B.vx - A.vx) * nx + (B.vy - A.vy) * ny;
      // Rod khử cả hai chiều. Rope chỉ hãm khi hai vật đang TÁCH XA (relVn>0),
      // không cản lúc chúng tiến lại gần nhau.
      if (c.kind === "rope" && relVn <= 0) continue;
      const jA = (relVn * wA) / wSum;
      const jB = (relVn * wB) / wSum;
      A.vx += nx * jA;
      A.vy += ny * jA;
      B.vx -= nx * jB;
      B.vy -= ny * jB;
    }
  }
}
