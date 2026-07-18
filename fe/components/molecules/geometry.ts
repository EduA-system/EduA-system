// Toán hình học thuần (mảng số) — không phụ thuộc THREE để builder testable và
// khung-agnostic. Trọng tâm: fillValences() sinh các hướng hoá trị lý tưởng.

import type { Vec3, Hybridization } from './types';

// ── Vector helpers ──────────────────────────────────────────────────────────

export const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const scale = (a: Vec3, s: number): Vec3 => [a[0] * s, a[1] * s, a[2] * s];
export const negate = (a: Vec3): Vec3 => [-a[0], -a[1], -a[2]];
export const dot = (a: Vec3, b: Vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const length = (a: Vec3): number => Math.hypot(a[0], a[1], a[2]);

export const cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];

export function normalize(a: Vec3): Vec3 {
  const len = length(a);
  return len < 1e-9 ? [0, 0, 0] : [a[0] / len, a[1] / len, a[2] / len];
}

/** Một vector đơn vị vuông góc với `a`, chọn xác định (tránh suy biến). */
function anyPerp(a: Vec3): Vec3 {
  const ref: Vec3 = Math.abs(a[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0];
  return normalize(cross(a, ref));
}

// Hằng số hình học
const TETRA_COS = -1 / 3; // cos(109.47°)
const TETRA_SIN = Math.sqrt(8) / 3; // sin(109.47°) = 2√2/3
const HALF_TETRA = (54.7356 * Math.PI) / 180; // nửa góc tứ diện
const SIN120 = Math.sqrt(3) / 2;

/** Số hướng sigma tổng theo lai hoá. */
function sigmaCount(h: Hybridization): number {
  return h === 'sp3' ? 4 : h === 'sp2' ? 3 : 2;
}

/**
 * Đặt nguyên tử D liên kết với C bằng toạ độ nội (NeRF / SN-eRF):
 * độ dài C–D = `bond`, góc liên kết B–C–D = `angleDeg`, góc nhị diện
 * A–B–C–D = `torsionDeg`. Dùng để dựng mạch duỗi (anti, dihedral 180°) thay vì
 * cuộn lại. A, B, C là toạ độ ba nguyên tử tham chiếu đã đặt.
 */
export function nerf(A: Vec3, B: Vec3, C: Vec3, bond: number, angleDeg: number, torsionDeg: number): Vec3 {
  const angle = (angleDeg * Math.PI) / 180;
  const tor = (torsionDeg * Math.PI) / 180;
  const bc = normalize(sub(C, B));

  // Carbon sp (góc 180°): D nối thẳng theo hướng B→C.
  if (angleDeg > 179) return add(C, scale(bc, bond));

  // Toạ độ D trong khung cục bộ {bc, nbc, n}.
  const d2: Vec3 = [
    -bond * Math.cos(angle),
    bond * Math.cos(tor) * Math.sin(angle),
    bond * Math.sin(tor) * Math.sin(angle),
  ];

  let n = cross(sub(B, A), bc);
  if (length(n) < 1e-6) n = anyPerp(bc); // A, B, C gần thẳng hàng → khung dự phòng
  n = normalize(n);
  const nbc = cross(n, bc);

  return add(C, add(scale(bc, d2[0]), add(scale(nbc, d2[1]), scale(n, d2[2]))));
}

/** Góc liên kết lý tưởng theo lai hoá (độ). */
export function idealAngle(h: Hybridization): number {
  return h === 'sp3' ? 109.4712 : h === 'sp2' ? 120 : 180;
}

/** Các góc nhị diện so le để rải nhiều nhánh quanh một tâm (slot 0 = anti 180°). */
export function staggerTorsions(h: Hybridization): number[] {
  return h === 'sp3' ? [180, 60, -60] : h === 'sp2' ? [180, 0] : [180];
}

/**
 * Trả về các hướng đơn vị cho những liên kết sigma CÒN LẠI quanh một nguyên tử,
 * cho trước các hướng sigma đã có (`existingDirs`, đơn vị) và lai hoá.
 * Liên kết đôi/ba tính là MỘT hướng sigma.
 */
export function fillValences(existingDirs: Vec3[], hyb: Hybridization): Vec3[] {
  const total = sigmaCount(hyb);
  const need = total - existingDirs.length;
  if (need <= 0) return [];

  // ── sp (thẳng, 180°) ──
  if (hyb === 'sp') {
    if (existingDirs.length === 0) return [[1, 0, 0], [-1, 0, 0]];
    return [normalize(negate(existingDirs[0]))];
  }

  // ── sp2 (tam giác phẳng, 120°, giữ trong mặt phẳng z=0) ──
  if (hyb === 'sp2') {
    if (existingDirs.length === 0) {
      return [
        [1, 0, 0],
        [-0.5, SIN120, 0],
        [-0.5, -SIN120, 0],
      ];
    }
    if (existingDirs.length === 1) {
      const a = existingDirs[0];
      let p = cross([0, 0, 1], a);
      if (length(p) < 1e-6) p = anyPerp(a);
      p = normalize(p);
      return [
        normalize(add(scale(a, -0.5), scale(p, SIN120))),
        normalize(add(scale(a, -0.5), scale(p, -SIN120))),
      ];
    }
    // 2 đã có → 1 hướng còn lại (đối bisector)
    return [normalize(negate(add(existingDirs[0], existingDirs[1])))];
  }

  // ── sp3 (tứ diện, 109.47°) ──
  if (existingDirs.length === 0) {
    return [
      normalize([1, 1, 1]),
      normalize([1, -1, -1]),
      normalize([-1, 1, -1]),
      normalize([-1, -1, 1]),
    ];
  }
  if (existingDirs.length === 1) {
    const a = existingDirs[0];
    const t = anyPerp(a);
    const u = normalize(cross(a, t));
    const dirs: Vec3[] = [];
    for (let k = 0; k < 3; k++) {
      const phi = ((2 * Math.PI) / 3) * k;
      const perp = add(scale(t, Math.cos(phi)), scale(u, Math.sin(phi)));
      dirs.push(normalize(add(scale(a, TETRA_COS), scale(perp, TETRA_SIN))));
    }
    return dirs;
  }
  if (existingDirs.length === 2) {
    const [a, b] = existingDirs;
    const m = normalize(negate(add(a, b)));
    let p = cross(a, b);
    if (length(p) < 1e-6) p = anyPerp(a);
    p = normalize(p);
    const c = Math.cos(HALF_TETRA);
    const s = Math.sin(HALF_TETRA);
    return [
      normalize(add(scale(m, c), scale(p, s))),
      normalize(sub(scale(m, c), scale(p, s))),
    ];
  }
  // 3 đã có → 1 H còn lại
  return [normalize(negate(add(add(existingDirs[0], existingDirs[1]), existingDirs[2])))];
}


