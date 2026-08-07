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
  // Renderer-only size multiplier; collision radius and physics are unchanged.
  displayScale?: number;
  visual?: {
    shape?: "circle" | "metalBall" | "feather" | "streamlined" | "plate" | "box" | "forceMeter" | "pulley" | "coaster" | "collisionCart" | "pendulumBob" | "pendulumPivot" | "hangingWeight";
    metalTone?: "steel" | "brass";
    wheels?: boolean;
    photogateFlag?: boolean;
    color?: string;
    label?: string;
    reading?: string;
    readingRatio?: number;
    // Optional fixed body marking the moving lower hook of a vertical force
    // meter. The renderer stretches the visible spring exactly to this point.
    forceMeterHookBody?: string;
    orientation?: "horizontal" | "vertical";
    angle?: number;
    collisionSide?: "left" | "right";
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
  // true: lò xo chỉ đẩy khi nén, giãn đến chiều dài tự nhiên thì mất tiếp xúc.
  compressionOnly?: boolean;
  /** Biến thể trình bày, không tham gia tính toán lực. */
  appearance?: "hooke";
};

/** Lực cản môi trường tỉ lệ vận tốc: F = −c·v. Gây dao động tắt dần. */
export type DragForce = { kind: "drag"; body: string; c: number };

/** Lực ngoài không đổi (kéo/đẩy) tác dụng lên một vật. */
export type AppliedForce = { kind: "applied"; body: string; fx: number; fy: number };

/**
 * Lực Coulomb 2D giữa 2 điện tích điểm `a`, `b`: F = ke·q1·q2/r² dọc đường
 * nối hai vật (định luật Coulomb thật, không xấp xỉ). `q1·q2 > 0` (cùng dấu)
 * → ĐẨY NHAU; `q1·q2 < 0` (trái dấu) → HÚT NHAU. `ke` mặc định hằng số
 * Coulomb thật 8.99×10⁹ N·m²/C² — dùng SI nên `q1`, `q2` (đơn vị Coulomb)
 * cần nhập ở thang µC (×10⁻⁶) để ra lực cỡ mN hợp lý so với trọng lực của
 * vật nhẹ (vài gam), đúng thí nghiệm quả cầu nhiễm điện SGK.
 */
export type CoulombForce = {
  kind: "coulomb";
  a: string;
  b: string;
  q1: number; // điện tích vật a (C)
  q2: number; // điện tích vật b (C)
  ke?: number; // hằng số Coulomb (N·m²/C²)
};

export type Force = GravityForce | SpringForce | DragForce | AppliedForce | CoulombForce;
// Giai đoạn 2 (cần mô hình tiếp xúc): friction, contact (phản lực mặt).

// ── Ràng buộc ─────────────────────────────────────────────────────────────────
// Ràng buộc CỨNG, giải bằng phép chiếu vị trí (constraints.ts) SAU mỗi bước
// rk4 — không phải lực, không nằm trong `derivs`.

/** Thanh cứng — giữ khoảng cách |a−b| = `length` chính xác. Cho con lắc đơn. */
export type RodConstraint = {
  kind: "rod";
  a: string;
  b: string;
  length: number;
  /** Biến thể trình bày, không tham gia tính toán vật lý. */
  appearance?: "pendulum";
};

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
  /** Biến thể trình bày, không tham gia tính toán vật lý. */
  appearance?: "rollerCoaster" | "hidden" | "galileiRamp";
  /** Renderer-only: draw track offset from the constraint path along local normal. */
  visualOffset?: number;
  /** Renderer-only: skip drawing the track entirely (apparatus vẽ riêng). */
  hidden?: boolean;
};

/**
 * Dây không dãn đổi hướng 90° qua một ròng rọc cố định. Vật `horizontal` chuyển
 * động ngang về phía ròng rọc bao nhiêu thì vật `vertical` đi xuống bấy nhiêu.
 */
export type RightAngleRopeConstraint = {
  kind: "rightAngleRope";
  horizontal: string;
  vertical: string;
  corner: { x: number; y: number };
  length: number;
};

export type Constraint = RodConstraint | RopeConstraint | SurfaceConstraint | CurveTrackConstraint | RightAngleRopeConstraint;
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
  labelPosition?: "tip" | "outside";
  labelSize?: number;
  width?: number; // độ dày thân mũi tên (px); vắng → renderer dùng mặc định
};

/**
 * Vector hợp lực ĐỘNG cho con lắc đơn — renderer tự tính từ trạng thái thực
 * (trọng lực + lực căng dây) mỗi frame, khác VectorAnnotation (dx/dy chốt sẵn).
 */
export type PendulumResultantAnnotation = {
  kind: "pendulumResultant";
  pivot: string;
  body: string;
  scale?: number;
  maxLength?: number;
  color?: string;
  label?: string;
  showMagnitude?: boolean;
};

/**
 * Vector ĐỘNG minh hoạ một lò xo — độ dài tính lại MỖI FRAME từ trạng thái thực
 * (khác VectorAnnotation có dx/dy chốt sẵn). Trỏ tới spring qua cặp (a, b);
 * renderer đọc k/restLength của CHÍNH spring đó trong scene.forces để tính độ
 * giãn Δℓ = L − restLength và lực đàn hồi Fđh = k·Δℓ. CHỈ để vẽ — kernel bỏ qua.
 * Preset chỉ khai báo "vẽ vector cho lò xo nào + hệ số quy đổi", KHÔNG viết công
 * thức: mọi số liệu renderer đọc từ Scene, đúng triết lý declarative.
 */
export type SpringVectorAnnotation = {
  kind: "springVector";
  a: string; // đầu neo (điểm treo)
  b: string; // đầu tự do (vật)
  // N → world-units (m) để vẽ vector lực đàn hồi. Vắng/0 → không vẽ vector lực.
  forceScale?: number;
  // Hệ số vẽ vector độ giãn Δℓ (m). Vắng/0 → không vẽ vector độ giãn. 1 = đúng mét.
  stretchScale?: number;
  forceColor?: string;
  stretchColor?: string;
  forceLabel?: string; // vd "Fđh"
  stretchLabel?: string; // vd "Δℓ"
};

/**
 * Cặp lực tương tác của cùng một lò xo. Renderer đọc lực Hooke thực theo từng
 * frame và vẽ hai vector bằng nhau, ngược chiều trên hai vật.
 */
export type SpringActionReactionAnnotation = {
  kind: "springActionReaction";
  a: string;
  b: string;
  forceScale: number;
  colorA?: string;
  colorB?: string;
  labelA?: string;
  labelB?: string;
};

/** Đồng hồ đo thời gian từ lúc vật qua cổng 1 đến lúc qua cổng 2. */
export type PhotogateTimerAnnotation = {
  kind: "photogateTimer";
  body: string;
  bodyOffsetX?: number;
  startX: number;
  endX: number;
  at: { x: number; y: number };
  color?: string;
  distance?: number;
  resultAt?: { x: number; y: number };
  resultBottom?: number;
};

/**
 * Hai vector động của chuyển động tròn đều. Preset khai báo độ dài hiển thị,
 * renderer chỉ cập nhật hướng theo vị trí và vận tốc thực ở mỗi frame.
 */
export type CircularMotionVectorsAnnotation = {
  kind: "circularMotionVectors";
  center: string;
  body: string;
  tangentLength: number;
  tensionLength: number;
  tangentColor?: string;
  tensionColor?: string;
  tangentLabel?: string;
  tensionLabel?: string;
  orbitColor?: string;
};

export type Annotation =
  | VectorAnnotation
  | SpringVectorAnnotation
  | SpringActionReactionAnnotation
  | PhotogateTimerAnnotation
  | CircularMotionVectorsAnnotation
  | PendulumResultantAnnotation;

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
  // Bật cho scene bảo toàn cơ năng lý tưởng. Kernel sẽ hiệu chỉnh sai số số học
  // sau bước chiếu ràng buộc để W = Wđ + Wt không trôi theo thời gian.
  conserveMechanicalEnergy?: boolean;
  // Lớp chú thích hình học (vector lực/vận tốc…). CHỈ để vẽ — kernel bỏ qua
  // hoàn toàn. Vắng (đa số preset) → không vẽ gì, hành vi y hệt trước.
  annotations?: Annotation[];
  // Khung nhìn CỐ ĐỊNH (world-units, m) — chỉ để renderer canh camera, kernel bỏ
  // qua. Khai báo khi quỹ đạo KHÔNG bị chặn (vật gia tốc chạy xa): tránh camera
  // tự zoom lại mỗi lần đổi tham số. Vắng → renderer tự đo khung theo quỹ đạo
  // (hành vi mặc định cũ). Renderer vẫn luôn đảm bảo thấy mặt đất y=0.
  view?: { minX: number; maxX: number; minY: number; maxY: number };
  // Optional horizontal display magnification. It changes rendering only;
  // positions, distances, constraints and all physics remain in world units.
  displayScaleX?: number;
  // Restrict horizontal magnification to a focal interval and optionally
  // compress the surrounding apparatus so the full scene remains visible.
  displayScaleXRange?: { startX: number; endX: number; outsideScale?: number };
  // Renderer-only switch for experiments whose apparatus must stay calibrated.
  disableDragging?: boolean;
  // Khoảng cách từ mặt đất tới đáy canvas (px), dùng khi cần tránh lớp điều khiển nổi.
  groundPadding?: number;
  // Khoảng đệm theo tỉ lệ chiều cao canvas; ưu tiên hơn groundPadding khi có.
  groundPaddingRatio?: number;
  // Dịch toàn bộ scene lên theo tỉ lệ chiều cao mà không làm thay đổi scale.
  viewShiftYRatio?: number;
  preferredScale?: number;
};
