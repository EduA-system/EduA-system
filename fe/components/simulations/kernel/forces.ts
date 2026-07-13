// Công thức của từng loại lực trong Kernel Cơ học 2D.
// Đây là phần "tính chính xác" — chỉ chứa định luật vật lý, không có state
// plumbing (việc đó ở build-derivs.ts). AI KHÔNG đụng vào file này.

import type { Scene } from "./types";

export type Vec2 = { x: number; y: number };

/** Hằng số Coulomb thật, N·m²/C². */
export const COULOMB_KE = 8.99e9;

/** Cách đọc vị trí / vận tốc một vật từ trạng thái hiện tại của hệ. */
export type Readers = {
  pos: (id: string) => Vec2;
  vel: (id: string) => Vec2;
};

/**
 * Cộng toàn bộ lực tác dụng lên mỗi vật ĐỘNG, trả map id → (Fx, Fy) [N].
 * Vật `fixed` không nhận lực (đứng yên tuyệt đối) nên không có mặt trong map.
 */
export function netForces(scene: Scene, r: Readers): Record<string, Vec2> {
  const F: Record<string, Vec2> = {};
  for (const b of scene.bodies) {
    if (!b.fixed) F[b.id] = { x: 0, y: 0 };
  }
  // Cộng lực vào một vật; tự bỏ qua nếu vật đó fixed (không có trong F).
  const add = (id: string, fx: number, fy: number) => {
    const f = F[id];
    if (f) {
      f.x += fx;
      f.y += fy;
    }
  };

  for (const force of scene.forces) {
    switch (force.kind) {
      case "gravity": {
        // Trọng lực kéo mọi vật động xuống: F = (0, −m·g).
        const g = force.g ?? 9.8;
        for (const b of scene.bodies) {
          if (!b.fixed) add(b.id, 0, -b.mass * g);
        }
        break;
      }
      case "spring": {
        // Hooke 2D: lực dọc đường nối a→b. d = pos(b) − pos(a), L = |d|.
        const pa = r.pos(force.a);
        const pb = r.pos(force.b);
        const dx = pb.x - pa.x;
        const dy = pb.y - pa.y;
        const L = Math.hypot(dx, dy);
        if (L < 1e-9) break; // hai đầu trùng nhau → hướng không xác định, bỏ qua
        const ux = dx / L; // vector đơn vị a→b
        const uy = dy / L;
        // Tốc độ co/giãn = thành phần vận tốc tương đối chiếu lên trục lò xo.
        const va = r.vel(force.a);
        const vb = r.vel(force.b);
        const relRate = (vb.x - va.x) * ux + (vb.y - va.y) * uy;
        const ext = L - force.restLength; // ext > 0: giãn, ext < 0: nén
        const mag = force.k * ext + force.damping * relRate;
        // mag > 0 (giãn) → kéo a về phía b (+u) và b về phía a (−u).
        add(force.a, mag * ux, mag * uy);
        add(force.b, -mag * ux, -mag * uy);
        break;
      }
      case "drag": {
        // Lực cản tỉ lệ vận tốc, ngược chiều chuyển động: F = −c·v.
        const v = r.vel(force.body);
        add(force.body, -force.c * v.x, -force.c * v.y);
        break;
      }
      case "applied": {
        // Lực ngoài không đổi.
        add(force.body, force.fx, force.fy);
        break;
      }
      case "coulomb": {
        // Coulomb: F = ke·q1·q2/r² dọc đường nối a→b (cùng công thức khoảng
        // cách/hướng như spring), nhưng dấu NGƯỢC spring: mag > 0 (cùng dấu
        // điện tích) → ĐẨY (a lùi theo −u, b lùi theo +u); mag < 0 → HÚT.
        const pa = r.pos(force.a);
        const pb = r.pos(force.b);
        const dx = pb.x - pa.x;
        const dy = pb.y - pa.y;
        const rr = Math.hypot(dx, dy);
        if (rr < 1e-9) break; // hai điện tích trùng nhau → hướng không xác định, bỏ qua
        const ux = dx / rr;
        const uy = dy / rr;
        const ke = force.ke ?? COULOMB_KE;
        const mag = (ke * force.q1 * force.q2) / (rr * rr);
        add(force.a, -mag * ux, -mag * uy);
        add(force.b, mag * ux, mag * uy);
        break;
      }
    }
  }
  return F;
}
