// ── Kernel Cơ học 2D — Tầng 1 của kiến trúc 3 tầng ───────────────────────────
// Xem: wish/kien-truc-3-tang-mo-phong-vat-ly.md
//      research/thu-vien-kernel-mo-phong-vat-ly.md (Kernel #1 — Cơ học, P0)
//
// ĐÂY LÀ TẦNG 1: dev viết & test một lần, AI KHÔNG bao giờ đụng vào.
// Tính chính xác vật lý sống ở tầng này. AI chỉ KHAI BÁO `Scene` (tầng 2,
// declarative) — chọn loại lực/ràng buộc và điền số, không viết công thức.
//
// Vật lý 2D ĐẦY ĐỦ: vị trí (x, y) và vận tốc (vx, vy) là vector thật — làm được
// dao động ngang, con lắc đơn, lò xo xiên, ném xiên… (mô hình 1D cũ chỉ dao
// động theo trục y nên không phủ được các trường hợp này).
//
// Quy ước: trục x nằm ngang, trục y HƯỚNG LÊN. Đơn vị SI (m, m/s, kg, N, s).

/**
 * Một vật trong cảnh.
 * - `fixed: true`  → mốc cố định (anchor): đứng yên tuyệt đối, 0 bậc tự do.
 * - `fixed` vắng   → vật thường: 2 bậc tự do tịnh tiến.
 * Vật rắn có góc quay (moment lực) là mở rộng giai đoạn 2 — chưa có ở v1.
 */
export type Body = {
  id: string;
  x: number; // vị trí ban đầu (m); với vật fixed đây là vị trí bất biến
  y: number;
  vx: number; // vận tốc ban đầu (m/s) — bỏ qua nếu fixed
  vy: number;
  mass: number; // khối lượng (kg), phải > 0 — bỏ qua nếu fixed
  fixed?: boolean;
  // Bán kính va chạm (m). VẮNG → vật là chất điểm, KHÔNG va chạm vật-vật (giữ
  // nguyên hành vi cũ). Có → tham gia va chạm tròn-tròn (xem collisions.ts).
  radius?: number;
  visual?: {
    shape?: "circle" | "streamlined" | "plate" | "forceMeter";
    color?: string;
    label?: string;
    reading?: string;
    angle?: number;
  };
};

// ── Lực ──────────────────────────────────────────────────────────────────────
// Mỗi loại lực là một công thức trong forces.ts. Hợp lực → gia tốc qua a = F/m.
// Lực được cộng vào `derivs` và đưa thẳng cho rk4.

/** Trọng lực — tác dụng lên MỌI vật động: F = (0, −m·g). `g` mặc định 9.8. */
export type GravityForce = { kind: "gravity"; g?: number };

/**
 * Lò xo Hooke 2D nối vật `a` ↔ `b`. Lực dọc theo đường nối hai vật.
 * `restLength` = chiều dài tự nhiên (m). `damping` = hệ số cản nội tại (gây
 * tắt dần). Lò xo giãn thì kéo hai đầu lại gần nhau, nén thì đẩy ra xa.
 */
export type SpringForce = {
  kind: "spring";
  a: string;
  b: string;
  k: number; // độ cứng (N/m)
  restLength: number;
  damping: number;
};

/** Lực cản môi trường tỉ lệ vận tốc: F = −c·v. Gây dao động tắt dần. */
export type DragForce = { kind: "drag"; body: string; c: number };

/** Lực ngoài không đổi (kéo/đẩy) tác dụng lên một vật. */
export type AppliedForce = { kind: "applied"; body: string; fx: number; fy: number };

export type Force = GravityForce | SpringForce | DragForce | AppliedForce;
// Giai đoạn 2 (cần mô hình tiếp xúc): friction, contact (phản lực mặt).

// ── Ràng buộc ─────────────────────────────────────────────────────────────────
// Ràng buộc CỨNG, giải bằng phép chiếu vị trí (constraints.ts) SAU mỗi bước
// rk4 — không phải lực, không nằm trong `derivs`.

/** Thanh cứng — giữ khoảng cách |a−b| = `length` chính xác. Cho con lắc đơn. */
export type RodConstraint = { kind: "rod"; a: string; b: string; length: number };

/** Dây — chỉ kéo: giới hạn |a−b| ≤ `length`, không đẩy (dây chùng thì tự do). */
export type RopeConstraint = { kind: "rope"; a: string; b: string; length: number };

/**
 * Mặt phẳng cứng (sàn, mặt nghiêng) — chặn MỌI vật động, vật không xuyên qua.
 * Là một đường thẳng đi qua tâm `(x, y)`, nghiêng `angle` độ (0 = nằm ngang);
 * vật bị giữ ở phía trên mặt. `length` chỉ để vẽ, va chạm coi mặt là vô hạn.
 */
export type SurfaceConstraint = {
  kind: "surface";
  x: number;
  y: number;
  angle: number; // độ, 0 = nằm ngang
  length: number;
  friction: number; // hệ số ma sát Coulomb (0 = mặt nhẵn không ma sát)
};

export type TrackPoint = { x: number; y: number };

export type CurveTrackConstraint = {
  kind: "curveTrack";
  body: string;
  points: TrackPoint[];
  friction?: number;
};

export type Constraint = RodConstraint | RopeConstraint | SurfaceConstraint | CurveTrackConstraint;
// Giai đoạn 2: pin (chốt quay), ma sát trên mặt.

// ── Annotation (lớp chú thích hình học) ────────────────────────────────────────
// Annotation CHỈ ĐỂ VẼ — hoàn toàn KHÔNG tham gia tính toán vật lý. buildKernel()
// bỏ qua field này; nó không đi vào netForces/derivs/rk4/projectConstraints. Đây
// là lớp phủ trực quan (vector lực/vận tốc…) mà tầng 2 khai báo trong applyParams,
// tầng 3 (renderer) vẽ ra. KHÔNG được nhét logic/công thức vật lý vào đây.

/**
 * Một vector mũi tên để minh hoạ (lực, vận tốc, thành phần lực…).
 * - Gốc: `anchor` (id một vật — gốc bám theo vật khi nó di chuyển) được ưu tiên;
 *   nếu vắng thì dùng `at` (toạ độ world cố định). Vắng cả hai → gốc tại (0, 0).
 * - `dx`/`dy`: thành phần vector theo WORLD-UNITS (m). Preset TỰ quy đổi từ đại
 *   lượng vật lý (vd Newton) sang mét khi khai báo, để renderer không cần "biết"
 *   đây là lực — giữ renderer thuần hình học.
 */
export type VectorAnnotation = {
  kind: "vector";
  at?: { x: number; y: number };
  anchor?: string;
  dx: number;
  dy: number;
  color?: string;
  label?: string;
  width?: number; // độ dày thân mũi tên (px); vắng → renderer dùng mặc định
};

export type Annotation = VectorAnnotation;

/**
 * Một cảnh mô phỏng = vật + lực + ràng buộc. Đây là thứ AI (tầng 2) khai báo;
 * buildKernel() biến nó thành hệ ODE chạy được.
 */
export type Scene = {
  bodies: Body[];
  forces: Force[];
  constraints: Constraint[];
  // Hệ số đàn hồi e ∈ [0,1] dùng CHUNG cho mọi va chạm trong cảnh. Mặc định 1
  // (va chạm đàn hồi hoàn toàn — bảo toàn động năng). e = 0: va chạm mềm (dính).
  restitution?: number;
  // Lớp chú thích hình học (vector lực/vận tốc…). CHỈ để vẽ — kernel bỏ qua
  // hoàn toàn. Vắng (đa số preset) → không vẽ gì, hành vi y hệt trước.
  annotations?: Annotation[];
};
