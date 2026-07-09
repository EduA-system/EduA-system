// Biến một `Scene` khai báo (vật + lực + ràng buộc) thành hệ ODE chạy được.
// Đây là "keo dán" của kernel: lo việc đóng/mở gói trạng thái phẳng (StateVec)
// và nối hai pha — LỰC (derivs → rk4) và RÀNG BUỘC (project, sau rk4).
//
// Mô hình hai pha:
//   s_next = project( rk4(s, dt, derivs) )
// derivs chỉ tính lực; project chỉ giải ràng buộc cứng. Xem stepScene() ở cuối.
//
// AI KHÔNG đụng vào file này — AI chỉ tạo ra `Scene` đưa vào đây.

import { rk4, type StateVec } from "../shared/ode";
import { netForces, type Vec2 } from "./forces";
import { projectConstraints, type PointState } from "./constraints";
import { resolveCollisions } from "./collisions";
import type { Scene } from "./types";

/** Một cảnh đã biên dịch thành hệ ODE có thể tích phân từng bước. */
export type SceneKernel = {
  initialState: StateVec;
  /** Đạo hàm trạng thái — CHỈ tính lực. Đưa thẳng vào rk4. */
  derivs: (s: StateVec) => StateVec;
  /** Giải ràng buộc cứng — gọi SAU mỗi bước rk4. */
  project: (s: StateVec) => StateVec;
};

// Mỗi vật động góp 4 khoá vào StateVec phẳng. Dùng ":" làm dấu phân tách —
// id là kebab-case nên không bao giờ chứa ":".
const kX = (id: string) => `${id}:x`;
const kY = (id: string) => `${id}:y`;
const kVX = (id: string) => `${id}:vx`;
const kVY = (id: string) => `${id}:vy`;

/** Biên dịch một Scene thành SceneKernel. */
export function buildKernel(scene: Scene): SceneKernel {
  const dynamic = scene.bodies.filter((b) => !b.fixed);
  // Có vật nào tham gia va chạm không? (quyết định pha 3 có chạy hay không)
  const hasCollidable = scene.bodies.some((b) => b.radius != null);

  // Vị trí bất biến của các vật cố định + khối lượng nghịch của mọi vật.
  const fixedPos: Record<string, Vec2> = {};
  const invMass: Record<string, number> = {};
  for (const b of scene.bodies) {
    if (b.fixed) {
      fixedPos[b.id] = { x: b.x, y: b.y };
      invMass[b.id] = 0; // fixed → không bị lực/phép chiếu làm dịch chuyển
    } else {
      invMass[b.id] = 1 / b.mass;
    }
  }

  // Trạng thái đầu: chỉ vật động mới có khoá trong StateVec.
  const initialState: StateVec = {};
  for (const b of dynamic) {
    initialState[kX(b.id)] = b.x;
    initialState[kY(b.id)] = b.y;
    initialState[kVX(b.id)] = b.vx;
    initialState[kVY(b.id)] = b.vy;
  }

  // Đọc vị trí / vận tốc một vật bất kỳ (fixed hay động) từ một StateVec.
  const posOf = (id: string, s: StateVec): Vec2 =>
    fixedPos[id] ?? { x: s[kX(id)]!, y: s[kY(id)]! };
  const velOf = (id: string, s: StateVec): Vec2 =>
    fixedPos[id] ? { x: 0, y: 0 } : { x: s[kVX(id)]!, y: s[kVY(id)]! };

  // Pha 1 — LỰC: cộng hợp lực rồi áp định luật II Newton a = F/m.
  const derivs = (s: StateVec): StateVec => {
    const F = netForces(scene, {
      pos: (id) => posOf(id, s),
      vel: (id) => velOf(id, s),
    });
    const out: StateVec = {};
    for (const b of dynamic) {
      out[kX(b.id)] = s[kVX(b.id)]!; // dx/dt = vx
      out[kY(b.id)] = s[kVY(b.id)]!; // dy/dt = vy
      out[kVX(b.id)] = F[b.id]!.x / b.mass; // dvx/dt = Fx/m
      out[kVY(b.id)] = F[b.id]!.y / b.mass; // dvy/dt = Fy/m
    }
    return out;
  };

  // Pha 2 — RÀNG BUỘC: chiếu trạng thái về thoả mãn rod/rope.
  // Pha 3 — VA CHẠM: giải xung lượng tròn–tròn (chạy cả khi không có ràng buộc).
  const project = (s: StateVec): StateVec => {
    if (scene.constraints.length === 0 && !hasCollidable) return s;
    // Gom mọi vật (cả fixed) thành các điểm cho bộ giải ràng buộc.
    const pts: Record<string, PointState> = {};
    for (const b of scene.bodies) {
      const p = posOf(b.id, s);
      const v = velOf(b.id, s);
      pts[b.id] = { x: p.x, y: p.y, vx: v.x, vy: v.y };
    }
    projectConstraints(scene, pts, invMass);
    if (hasCollidable) resolveCollisions(scene, pts, invMass);
    // Ghi kết quả trở lại StateVec — chỉ vật động (fixed vẫn đứng yên).
    const out: StateVec = { ...s };
    for (const b of dynamic) {
      const p = pts[b.id]!;
      out[kX(b.id)] = p.x;
      out[kY(b.id)] = p.y;
      out[kVX(b.id)] = p.vx;
      out[kVY(b.id)] = p.vy;
    }
    return out;
  };

  return { initialState, derivs, project };
}

/** Tích phân một bước: rk4 (lực) rồi project (ràng buộc). Renderer gọi hàm này. */
export function stepScene(kernel: SceneKernel, s: StateVec, dt: number): StateVec {
  return kernel.project(rk4(s, dt, kernel.derivs));
}

/** Đọc (x, y) của một vật ĐỘNG từ StateVec — tiện cho renderer. */
export function readPosition(s: StateVec, id: string): Vec2 {
  return { x: s[kX(id)]!, y: s[kY(id)]! };
}

/** Đọc (vx, vy) của một vật ĐỘNG từ StateVec — tiện cho renderer. */
export function readVelocity(s: StateVec, id: string): Vec2 {
  return { x: s[kVX(id)]!, y: s[kVY(id)]! };
}
