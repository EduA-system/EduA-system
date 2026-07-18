// Nhúng hình học khoảng cách (distance-geometry / force-field) cho phân tử BẤT KỲ
// tô-pô — kể cả đa vòng ngưng tụ (naphtalen, decalin…). Dùng khi engine tuần tự
// không khép được (số vòng ≥ 2).
//
// Ý tưởng: mỗi liên kết → lò xo về đúng độ dài; mỗi góc (i–j–k) → lò xo cho khoảng
// cách 1-3 (định lý cosin); mỗi cặp không liên kết → đẩy nhẹ nếu quá gần. Tối ưu
// bằng gradient descent nhiều lần khởi tạo, chọn cấu hình "căng" ít nhất.

import type { Bond, Hybridization, Vec3 } from './types';
import { bondLength } from './constants';
import { idealAngle } from './geometry';

// PRNG có seed (mulberry32) → kết quả lặp lại được (không phụ thuộc Math.random).
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Spring {
  i: number;
  j: number;
  target: number;
}

const K_BOND = 1.0;
const K_ANGLE = 0.6;
const K_REPULSE = 1.1;
// Å — ngưỡng đẩy cặp không liên kết. Cặp 1-3 đã bị ràng buộc (loại khỏi đẩy), nên
// cặp không liên kết thật (1-4 trở đi) luôn ≥ ~2.8 Å → đặt sàn 2.6 để chống gập vòng.
const DMIN_NONBONDED = 2.6;
const ITERS = 700;
const RESTARTS = 14;

export function embedDistanceGeometry(elements: string[], bonds: Bond[], hyb: Hybridization[]): Vec3[] {
  const n = elements.length;
  if (n === 0) return [];
  if (n === 1) return [[0, 0, 0]];

  // Kề (kèm bậc) + độ dài liên kết lý tưởng
  const adj: { idx: number; order: 1 | 2 | 3 }[][] = Array.from({ length: n }, () => []);
  const bondLenOf = new Map<string, number>();
  const key = (a: number, b: number) => (a < b ? `${a}-${b}` : `${b}-${a}`);
  for (const { a, b, order } of bonds) {
    adj[a].push({ idx: b, order });
    adj[b].push({ idx: a, order });
    bondLenOf.set(key(a, b), bondLength(elements[a], elements[b], order));
  }

  const springs: Spring[] = [];
  const constrained = new Set<string>();

  // 1-2: lò xo độ dài liên kết
  for (const { a, b } of bonds) {
    springs.push({ i: a, j: b, target: bondLenOf.get(key(a, b))! });
    constrained.add(key(a, b));
  }

  // 1-3: lò xo khoảng cách qua góc (định lý cosin)
  for (let j = 0; j < n; j++) {
    const nbrs = adj[j];
    const theta = (idealAngle(hyb[j]) * Math.PI) / 180;
    for (let p = 0; p < nbrs.length; p++) {
      for (let q = p + 1; q < nbrs.length; q++) {
        const i = nbrs[p].idx;
        const k = nbrs[q].idx;
        const l1 = bondLenOf.get(key(j, i))!;
        const l2 = bondLenOf.get(key(j, k))!;
        const d = Math.sqrt(Math.max(0, l1 * l1 + l2 * l2 - 2 * l1 * l2 * Math.cos(theta)));
        springs.push({ i, j: k, target: d });
        constrained.add(key(i, k));
      }
    }
  }

  // Cặp không liên kết / không 1-3 → đẩy nếu quá gần
  const repulse: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    for (let k = i + 1; k < n; k++) {
      if (!constrained.has(key(i, k))) repulse.push([i, k]);
    }
  }

  const stressOf = (pos: Vec3[]): number => {
    let s = 0;
    for (const sp of springs) {
      const dx = pos[sp.i][0] - pos[sp.j][0];
      const dy = pos[sp.i][1] - pos[sp.j][1];
      const dz = pos[sp.i][2] - pos[sp.j][2];
      const dist = Math.hypot(dx, dy, dz);
      s += (dist - sp.target) ** 2;
    }
    for (const [i, k] of repulse) {
      const dist = Math.hypot(pos[i][0] - pos[k][0], pos[i][1] - pos[k][1], pos[i][2] - pos[k][2]);
      if (dist < DMIN_NONBONDED) s += K_REPULSE * (DMIN_NONBONDED - dist) ** 2;
    }
    return s;
  };

  const relax = (seed: number): Vec3[] => {
    const rnd = mulberry32(seed);
    const spread = Math.cbrt(n) * 1.6;
    const pos: Vec3[] = Array.from({ length: n }, () => [
      (rnd() - 0.5) * spread,
      (rnd() - 0.5) * spread,
      (rnd() - 0.5) * spread,
    ]);

    for (let iter = 0; iter < ITERS; iter++) {
      const force: Vec3[] = Array.from({ length: n }, () => [0, 0, 0]);
      // lò xo (1-2, 1-3)
      for (const sp of springs) {
        let dx = pos[sp.i][0] - pos[sp.j][0];
        let dy = pos[sp.i][1] - pos[sp.j][1];
        let dz = pos[sp.i][2] - pos[sp.j][2];
        const dist = Math.hypot(dx, dy, dz) || 1e-6;
        const k = constrained.has(key(sp.i, sp.j)) && bondLenOf.has(key(sp.i, sp.j)) ? K_BOND : K_ANGLE;
        const f = (-k * (dist - sp.target)) / dist;
        dx *= f;
        dy *= f;
        dz *= f;
        force[sp.i][0] += dx;
        force[sp.i][1] += dy;
        force[sp.i][2] += dz;
        force[sp.j][0] -= dx;
        force[sp.j][1] -= dy;
        force[sp.j][2] -= dz;
      }
      // đẩy cặp không liên kết
      for (const [i, k] of repulse) {
        let dx = pos[i][0] - pos[k][0];
        let dy = pos[i][1] - pos[k][1];
        let dz = pos[i][2] - pos[k][2];
        const dist = Math.hypot(dx, dy, dz) || 1e-6;
        if (dist < DMIN_NONBONDED) {
          const f = (K_REPULSE * (DMIN_NONBONDED - dist)) / dist;
          dx *= f;
          dy *= f;
          dz *= f;
          force[i][0] += dx;
          force[i][1] += dy;
          force[i][2] += dz;
          force[k][0] -= dx;
          force[k][1] -= dy;
          force[k][2] -= dz;
        }
      }
      // di chuyển, bước giảm dần, giới hạn biên độ
      const step = 0.1 * (1 - iter / ITERS) + 0.02;
      for (let a = 0; a < n; a++) {
        for (let c = 0; c < 3; c++) {
          let mv = step * force[a][c];
          if (mv > 0.25) mv = 0.25;
          else if (mv < -0.25) mv = -0.25;
          pos[a][c] += mv;
        }
      }
    }
    return pos;
  };

  let best: Vec3[] | null = null;
  let bestStress = Infinity;
  for (let r = 0; r < RESTARTS; r++) {
    const pos = relax(0x9e3779b9 + r * 0x85ebca6b + n);
    const s = stressOf(pos);
    if (s < bestStress) {
      bestStress = s;
      best = pos;
    }
  }
  return best!;
}


