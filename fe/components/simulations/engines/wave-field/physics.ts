// Vật lý thuần cho mô hình giao thoa Y-âng ĐẦY ĐỦ — trường sóng thực tính từ
// phương trình sóng và hiệu đường đi thực tế, KHÔNG vẽ vân bằng đường/thanh
// trang trí hay gradient cố định. Không phụ thuộc Canvas/Konva/React.
//
// Hệ toạ độ: x trái→phải, y dưới→trên (quy ước VẬT LÝ — coordinates.ts lo việc
// chuyển sang toạ độ canvas khi vẽ, không trộn 2 hệ ở đây).
// Tâm 2 khe: (xSlits, 0). S1 = (xSlits, −a/2). S2 = (xSlits, +a/2).
// Nguồn khe hẹp S: (xSingleSlit, sourceOffsetY) — sourceOffsetY = 0 → S nằm
// đúng trung trực 2 khe; lệch khỏi 0 → pha tới S1, S2 khác nhau, hệ vân dịch.
//
// ── NHÂN QUẢ (causality) ──
// Sóng không "có mặt" khắp nơi ngay lập tức. Mỗi thành phần sóng (S→S1→P hay
// S→S2→P) chỉ tồn tại tại P khi t ≥ thời điểm nó THỰC SỰ tới P, tính bằng
// tổng quang lộ / tốc độ truyền c = λf. causalEnvelope() là hàm bao mềm cho
// việc này (0 trước khi tới, tăng dần lên 1 trong khoảng fadeDuration).
//
// ── 2 tầng truyền (S → khe → P), KHÔNG gán cố định pha/biên độ cho khe ──
// R_source_i = quang lộ từ S tới khe i (opticalPathToSlit).
// r_i = quang lộ từ khe i tới P.
// L_i = R_source_i + r_i (totalOpticalPath) — quang lộ TOÀN PHẦN, không phải
// r_i đơn thuần — ΔL = L2 − L1 mới là hiệu quang lộ đúng quyết định giao thoa,
// KHÁC Δr = r2 − r1 (chỉ đúng khi R_source_1 = R_source_2, tức S trên trung trực).
// Biên độ tại khe i (nếu bật suy giảm): A_source_i = amplitude/√R_source_i;
// biên độ tới P: A_i = A_source_i/√r_i (2 tầng suy giảm 1/√r, không phải 1).
//
// ── Trường tức thời (instantaneousFieldCausal) vs cường độ ổn định
// (averageIntensityCausal) ──
// u(P,t) = Σ envelope_i(t)·A_i·cos(k·L_i − ωt) — dao động theo t, dùng "chế độ
// trường tức thời"/Propagation mode.
// I(P) = A1² + A2² + 2·A1·A2·cos(kΔL) — cường độ ỔN ĐỊNH (giả sử đã đủ thời
// gian, envelope=1 mọi nơi) — dùng "chế độ cường độ trung bình"/Steady-state.
// averageIntensityWithReveal(P,t) = I(P)·min(envelope1(t), envelope2(t)) —
// cường độ HIỆN DẦN theo thời gian tới (Propagation mode + hiển thị cường độ).
//
// ── Điều kiện cực đại / cực tiểu ──
// ΔL = m·λ (m nguyên) → cùng pha → cực đại (2A)². ΔL = (m+½)·λ → ngược pha →
// cực tiểu (0 nếu A1=A2).
//
// ── Gần đúng khoảng vân ──
// i ≈ λD/a (calculateFringeSpacingApproximation) — chỉ đúng khi D ≫ a (góc nhỏ).
//
// ── PHẠM VI ĐÃ THU GỌN (theo yêu cầu) ──
// KHÔNG triển khai tích phân Huygens rời rạc đầy đủ (chia mỗi khe thành N điểm
// mẫu, mỗi cặp (mẫu, P) tính riêng — "Accurate aperture mode"). Mỗi khe S1, S2
// vẫn là 1 điểm ("Fast mode") nhưng nay KẾ THỪA ĐÚNG pha/biên độ/thời điểm tới
// từ nguồn S (đúng yêu cầu mục 3) — chỉ thiếu hiệu ứng bao nhiễu xạ do bề rộng
// hữu hạn b trong TRƯỜNG GẦN (near-field); bao nhiễu xạ (singleSlitEnvelope)
// vẫn tính đúng và áp cho MÀN + trường gần dưới dạng hệ số nhân theo góc quan
// sát (xem field-grid.ts) — một xấp xỉ hợp lý thay vì tích phân đầy đủ, KHÔNG
// phải sọc/gradient trang trí.
//
// ── Giới hạn mô hình 2D ──
// Sóng trụ 2 chiều (2 nguồn điểm trong mặt phẳng), không phải sóng cầu 3D thật
// (khe là đường dài, không phải điểm) — suy giảm biên độ 1/√r (không phải 1/r
// của sóng cầu) là hệ quả của giả định 2D này.

export type Point = { x: number; y: number };

export type WaveParams = {
  wavelength: number; // λ
  frequency: number; // f (Hz) — v = λf, dùng cho cả trường tức thời LẪN thời điểm tới (nhân quả)
  amplitude: number; // biên độ gốc tại nguồn S
  slitSeparation: number; // a — khoảng cách 2 khe
  slitWidth: number; // b — độ rộng mỗi khe (dùng cho bao nhiễu xạ, xem singleSlitEnvelope)
  screenDistance: number; // D
  sourceOffsetY: number; // vị trí S lệch khỏi trung trực 2 khe (0 = trên trung trực)
  amplitudeDecay: boolean; // bật suy giảm biên độ 1/√r ở CẢ 2 tầng truyền (S→khe VÀ khe→P)
  singleSlitDiffraction: boolean; // bật bao nhiễu xạ khe đơn bề rộng b
};

const EPSILON = 1e-6;

export function waveNumber(wavelength: number): number {
  return (2 * Math.PI) / wavelength;
}

export function angularFrequency(frequency: number): number {
  return 2 * Math.PI * frequency;
}

export function waveSpeed(wavelength: number, frequency: number): number {
  return wavelength * frequency;
}

/** Vị trí 2 khe từ tâm (xSlits, 0) và khoảng cách a — S1 dưới (−a/2), S2 trên (+a/2). */
export function slitPositions(xSlits: number, slitSeparation: number): { s1: Point; s2: Point } {
  return {
    s1: { x: xSlits, y: -slitSeparation / 2 },
    s2: { x: xSlits, y: slitSeparation / 2 },
  };
}

/** Khoảng cách (quang lộ) giữa 2 điểm bất kỳ — dùng cho mọi cặp (nguồn, khe, P). */
export function distanceFromSlit(p: Point, slit: Point): number {
  return Math.hypot(p.x - slit.x, p.y - slit.y);
}

/** R_source_i — quang lộ từ nguồn S tới 1 khe (bí danh distanceFromSlit cho rõ nghĩa). */
export function opticalPathToSlit(source: Point, slit: Point): number {
  return distanceFromSlit(source, slit);
}

/** L_i = R_source_i + r_i — quang lộ TOÀN PHẦN từ S, qua khe, tới P. KHÔNG được nhầm với r_i đơn thuần. */
export function totalOpticalPath(sourceToSlit: number, slitToP: number): number {
  return sourceToSlit + slitToP;
}

/** Hiệu quang lộ ĐÚNG giữa 2 nhánh — ΔL = L2 − L1 (KHÁC Δr = r2 − r1 trừ khi R_source_1 = R_source_2). */
export function pathDifference(l1: number, l2: number): number {
  return l2 - l1;
}

/** Độ lệch pha Δφ = k·ΔL = 2π·ΔL/λ. */
export function phaseDifference(deltaL: number, wavelength: number): number {
  return (2 * Math.PI * deltaL) / wavelength;
}

/**
 * Hàm bao nhân quả — 0 trước khi sóng tới (t ≤ arrivalTime), tăng tuyến tính
 * lên 1 trong khoảng fadeDuration sau đó. Mô phỏng việc "bật nguồn" tại t=0 và
 * mặt sóng cần thời gian hữu hạn để tới một điểm — KHÔNG PHẢI xấp xỉ tuỳ ý.
 */
export function causalEnvelope(t: number, arrivalTime: number, fadeDuration: number): number {
  if (t <= arrivalTime) return 0;
  if (fadeDuration <= 0) return 1;
  return Math.min(1, Math.max(0, (t - arrivalTime) / fadeDuration));
}

/** Thời điểm 1 sóng phát từ `source` tới `target`, biết tốc độ truyền waveSpeedValue. */
export function activationTime(source: Point, target: Point, waveSpeedValue: number): number {
  return distanceFromSlit(source, target) / Math.max(waveSpeedValue, EPSILON);
}

/** Biên độ hiệu dụng tại khoảng cách r kể từ 1 nguồn có biên độ `amplitude` — suy giảm 1/√r nếu bật. */
export function effectiveAmplitude(amplitude: number, r: number, decay: boolean): number {
  if (!decay) return amplitude;
  return amplitude / Math.sqrt(Math.max(r, EPSILON));
}

/** Biên độ tới P, TRUYỀN QUA 2 TẦNG (S→khe rồi khe→P) — 2 lần suy giảm 1/√r nếu bật, không phải 1 lần. */
export function twoStageAmplitude(sourceAmplitude: number, sourceToSlit: number, slitToP: number, decay: boolean): number {
  const atSlit = effectiveAmplitude(sourceAmplitude, sourceToSlit, decay);
  return effectiveAmplitude(atSlit, slitToP, decay);
}

/** Khoảng vân gần đúng i ≈ λD/a — công thức SGK, chỉ đúng khi D ≫ a (góc nhỏ). */
export function calculateFringeSpacingApproximation(wavelength: number, screenDistance: number, slitSeparation: number): number {
  return (wavelength * screenDistance) / slitSeparation;
}

/**
 * Bao nhiễu xạ khe đơn bề rộng b: (sinβ/β)², β = π·b·sinθ/λ. b≤0 hoặc β≈0 → 1
 * (khe lý tưởng, không bao nhiễu xạ).
 */
export function singleSlitEnvelope(theta: number, slitWidth: number, wavelength: number): number {
  if (slitWidth <= 0) return 1;
  const beta = (Math.PI * slitWidth * Math.sin(theta)) / wavelength;
  if (Math.abs(beta) < 1e-6) return 1;
  const s = Math.sin(beta) / beta;
  return s * s;
}

/** Góc quan sát θ tại vị trí y trên màn cách D — CHÍNH XÁC (atan2) hoặc gần đúng góc nhỏ (y/D). */
export function screenAngle(y: number, screenDistance: number, smallAngleApprox: boolean): number {
  if (smallAngleApprox) return y / screenDistance;
  return Math.atan2(y, screenDistance);
}

/** Cường độ trên MÀN theo góc θ (mô hình trường xa/Fraunhofer, ĐỐI XỨNG quanh trục — chỉ dùng để so sánh với công thức SGK). */
export function screenIntensity(theta: number, params: WaveParams, I0 = 1): number {
  const delta = (Math.PI * params.slitSeparation * Math.sin(theta)) / params.wavelength;
  const doubleSlitFactor = Math.cos(delta) ** 2;
  const envelope = params.singleSlitDiffraction ? singleSlitEnvelope(theta, params.slitWidth, params.wavelength) : 1;
  return I0 * envelope * doubleSlitFactor;
}

type TwoBranchGeometry = {
  R1: number; // opticalPathToSlit(source, s1)
  R2: number;
  r1: number; // distanceFromSlit(s1, p)
  r2: number;
  L1: number;
  L2: number;
};

function twoBranchGeometry(p: Point, source: Point, s1: Point, s2: Point): TwoBranchGeometry {
  const R1 = opticalPathToSlit(source, s1);
  const R2 = opticalPathToSlit(source, s2);
  const r1 = distanceFromSlit(s1, p);
  const r2 = distanceFromSlit(s2, p);
  return { R1, R2, r1, r2, L1: totalOpticalPath(R1, r1), L2: totalOpticalPath(R2, r2) };
}

/**
 * Trường tức thời từ 1 NGUỒN ĐIỂM DUY NHẤT — dùng cho vùng giữa khe hẹp S và
 * vách khe kép (Giai đoạn 3: sóng nhiễu xạ từ S lan dần, S1/S2 CHƯA tồn tại
 * ở giai đoạn này nên không dùng mô hình 2 khe cho vùng này).
 */
export function singleSourceField(p: Point, source: Point, t: number, params: WaveParams, fadeDuration?: number): number {
  const k = waveNumber(params.wavelength);
  const omega = angularFrequency(params.frequency);
  const v = waveSpeed(params.wavelength, params.frequency);
  const fade = fadeDuration ?? 1 / Math.max(params.frequency, EPSILON);
  const r = distanceFromSlit(source, p);
  const A = effectiveAmplitude(params.amplitude, r, params.amplitudeDecay);
  const env = causalEnvelope(t, r / v, fade);
  if (env <= 0) return 0;
  return env * A * Math.cos(k * r - omega * t);
}

/** Cường độ ỔN ĐỊNH từ 1 nguồn điểm duy nhất — I = A² (không có giao thoa, chỉ 1 nguồn). */
export function singleSourceIntensity(p: Point, source: Point, params: WaveParams): number {
  const r = distanceFromSlit(source, p);
  const A = effectiveAmplitude(params.amplitude, r, params.amplitudeDecay);
  return A * A;
}

/** Cường độ HIỆN DẦN (Propagation mode) từ 1 nguồn điểm — 0 trước khi tới, tiến dần lên singleSourceIntensity. */
export function singleSourceIntensityWithReveal(p: Point, source: Point, t: number, params: WaveParams, fadeDuration?: number): number {
  const v = waveSpeed(params.wavelength, params.frequency);
  const fade = fadeDuration ?? 1 / Math.max(params.frequency, EPSILON);
  const r = distanceFromSlit(source, p);
  const env = causalEnvelope(t, r / v, fade);
  return env * singleSourceIntensity(p, source, params);
}

/**
 * Trường sóng TỨC THỜI u(P,t) = u1+u2, có NHÂN QUẢ (mỗi nhánh chỉ "sống" sau
 * khi t ≥ thời điểm nó thực sự tới P) và KẾ THỪA đúng pha/biên độ 2 tầng
 * truyền từ nguồn S. fadeDuration mặc định 1 chu kỳ sóng (T = 1/f) — bật
 * nguồn mượt trong khoảng 1 dao động, không phải bật/tắt cứng.
 */
export function instantaneousFieldCausal(
  p: Point,
  source: Point,
  s1: Point,
  s2: Point,
  t: number,
  params: WaveParams,
  fadeDuration?: number,
): number {
  const k = waveNumber(params.wavelength);
  const omega = angularFrequency(params.frequency);
  const v = waveSpeed(params.wavelength, params.frequency);
  const fade = fadeDuration ?? 1 / Math.max(params.frequency, EPSILON);
  const g = twoBranchGeometry(p, source, s1, s2);

  const A1 = twoStageAmplitude(params.amplitude, g.R1, g.r1, params.amplitudeDecay);
  const A2 = twoStageAmplitude(params.amplitude, g.R2, g.r2, params.amplitudeDecay);
  const arrival1 = g.L1 / v, arrival2 = g.L2 / v;
  const env1 = causalEnvelope(t, arrival1, fade);
  const env2 = causalEnvelope(t, arrival2, fade);

  const u1 = env1 * A1 * Math.cos(k * g.L1 - omega * t);
  const u2 = env2 * A2 * Math.cos(k * g.L2 - omega * t);
  return u1 + u2;
}

/**
 * Cường độ ỔN ĐỊNH (Steady-state) — giả sử đã đủ thời gian để sóng tới khắp
 * nơi (KHÔNG có bao nhân quả), tính giải tích trực tiếp từ ΔL thực (không xấp
 * xỉ Δr = r2−r1): I = A1² + A2² + 2·A1·A2·cos(k·ΔL).
 */
export function averageIntensityCausal(p: Point, source: Point, s1: Point, s2: Point, params: WaveParams): number {
  const k = waveNumber(params.wavelength);
  const g = twoBranchGeometry(p, source, s1, s2);
  const A1 = twoStageAmplitude(params.amplitude, g.R1, g.r1, params.amplitudeDecay);
  const A2 = twoStageAmplitude(params.amplitude, g.R2, g.r2, params.amplitudeDecay);
  const deltaL = pathDifference(g.L1, g.L2);
  return A1 * A1 + A2 * A2 + 2 * A1 * A2 * Math.cos(k * deltaL);
}

/**
 * Cường độ HIỆN DẦN theo thời gian (Propagation mode, "chế độ giáo dục" mục
 * 6): bằng cường độ ổn định nhân với bao nhân quả nhỏ nhất trong 2 nhánh — nơi
 * nào chỉ 1 trong 2 sóng vừa tới thì sáng yếu (kiểu 1 khe), nơi nào CẢ HAI đã
 * tới thì mới đủ điều kiện giao thoa đầy đủ; nơi chưa sóng nào tới thì tối hẳn.
 */
export function averageIntensityWithReveal(
  p: Point,
  source: Point,
  s1: Point,
  s2: Point,
  t: number,
  params: WaveParams,
  fadeDuration?: number,
): number {
  const v = waveSpeed(params.wavelength, params.frequency);
  const fade = fadeDuration ?? 1 / Math.max(params.frequency, EPSILON);
  const g = twoBranchGeometry(p, source, s1, s2);
  const env1 = causalEnvelope(t, g.L1 / v, fade);
  const env2 = causalEnvelope(t, g.L2 / v, fade);
  const reveal = Math.min(env1, env2);
  if (reveal <= 0) return 0;
  return reveal * averageIntensityCausal(p, source, s1, s2, params);
}
