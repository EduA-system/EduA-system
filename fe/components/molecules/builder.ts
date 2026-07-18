// Builder deterministic: đồ thị nguyên tử nặng → Molecule (toạ độ 3D + H tự thêm).
// Không AI. Hỗ trợ phân tử mạch hở VÀ phân tử một vòng (benzen, xiclohexan…).
// Vòng được gieo trước thành đa giác phẳng (vòng 6 no → ghế), phần còn lại mọc ra
// bằng DFS/NeRF như mạch hở.

import type { Atom, Bond, Hybridization, Molecule, MoleculeGraph, MoleculeSpec, Vec3 } from './types';
import { add, fillValences, idealAngle, nerf, normalize, scale, staggerTorsions, sub } from './geometry';
import { bondLength, LONE_PAIRS, VALENCE } from './constants';
import { embedDistanceGeometry } from './embed';

interface Neighbor {
  idx: number;
  order: 1 | 2 | 3;
}

/** Số chu trình độc lập = E − V + số thành phần liên thông. */
function circuitRank(n: number, bonds: Bond[]): number {
  const parent = Array.from({ length: n }, (_, i) => i);
  const find = (x: number): number => {
    while (parent[x] !== x) {
      parent[x] = parent[parent[x]];
      x = parent[x];
    }
    return x;
  };
  let components = n;
  for (const b of bonds) {
    const ra = find(b.a);
    const rb = find(b.b);
    if (ra !== rb) {
      parent[ra] = rb;
      components--;
    }
  }
  return bonds.length - n + components;
}

/** Tìm các nguyên tử trên vòng (graph một chu trình) bằng cách bóc dần lá. */
function findRingOrder(n: number, adj: Neighbor[][]): number[] {
  const deg = adj.map((a) => a.length);
  const removed = new Array(n).fill(false);
  let changed = true;
  while (changed) {
    changed = false;
    for (let i = 0; i < n; i++) {
      if (!removed[i] && deg[i] <= 1) {
        removed[i] = true;
        changed = true;
        for (const nb of adj[i]) if (!removed[nb.idx]) deg[nb.idx]--;
      }
    }
  }
  const ringAtoms: number[] = [];
  for (let i = 0; i < n; i++) if (!removed[i]) ringAtoms.push(i);
  if (ringAtoms.length === 0) return [];

  // Đi vòng quanh chu trình để lấy thứ tự
  const order: number[] = [ringAtoms[0]];
  let prev = -1;
  let cur = ringAtoms[0];
  for (let guard = 0; guard < ringAtoms.length; guard++) {
    const next = adj[cur].find((nb) => !removed[nb.idx] && nb.idx !== prev);
    if (!next || next.idx === order[0]) break;
    order.push(next.idx);
    prev = cur;
    cur = next.idx;
  }
  return order;
}

/**
 * Lõi dựng hình. Trả Molecule đầy đủ (đã thêm H, căn giữa).
 * Hỗ trợ tối đa MỘT vòng; phân tử ≥2 vòng → throw (BE chặn trước, đây là lưới an toàn).
 */
export function layoutMolecule(elements: string[], heavyBonds: Bond[]): Molecule {
  const n = elements.length;

  const adj: Neighbor[][] = Array.from({ length: n }, () => []);
  const sumOrder = new Array(n).fill(0);
  for (const { a, b, order } of heavyBonds) {
    adj[a].push({ idx: b, order });
    adj[b].push({ idx: a, order });
    sumOrder[a] += order;
    sumOrder[b] += order;
  }

  // Lai hoá (theo số miền lập thể) + số H cần thêm
  const hyb: Hybridization[] = new Array(n);
  const hCount = new Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    const el = elements[i];
    const valence = VALENCE[el] ?? 4;
    const h = Math.max(0, valence - sumOrder[i]);
    hCount[i] = h;
    const lp = LONE_PAIRS[el] ?? 0;
    const steric = adj[i].length + h + lp;
    hyb[i] = steric >= 4 ? 'sp3' : steric === 3 ? 'sp2' : 'sp';
  }

  const rank = circuitRank(n, heavyBonds);
  // ≥2 vòng (ngưng tụ) → engine tuần tự không khép được; dùng nhúng hình học khoảng cách.
  const usePolycyclic = rank >= 2;
  const ringOrder = rank === 1 ? findRingOrder(n, adj) : [];

  const pos: (Vec3 | null)[] = new Array(n).fill(null);
  const placedFrom: number[] = new Array(n).fill(-1); // để NeRF lấy "ông" nối mạch

  const lenOf = (a: number, b: number, order: 1 | 2 | 3) => bondLength(elements[a], elements[b], order);

  if (usePolycyclic) {
    const coords = embedDistanceGeometry(elements, heavyBonds, hyb);
    for (let i = 0; i < n; i++) pos[i] = coords[i];
  } else {
  // ── Gieo vòng thành đa giác ──
  if (ringOrder.length >= 3) {
    const k = ringOrder.length;
    let edgeSum = 0;
    for (let j = 0; j < k; j++) {
      const a = ringOrder[j];
      const b = ringOrder[(j + 1) % k];
      const ord = adj[a].find((nb) => nb.idx === b)?.order ?? 1;
      edgeSum += lenOf(a, b, ord);
    }
    const edge = edgeSum / k;
    const radius = edge / (2 * Math.sin(Math.PI / k));
    const chair = k === 6 && ringOrder.every((a) => hyb[a] === 'sp3'); // vòng 6 no → ghế
    for (let j = 0; j < k; j++) {
      const theta = (2 * Math.PI * j) / k;
      const z = chair ? (j % 2 === 0 ? 0.25 : -0.25) : 0;
      pos[ringOrder[j]] = [radius * Math.cos(theta), radius * Math.sin(theta), z];
      placedFrom[ringOrder[j]] = ringOrder[(j + 1) % k];
    }
  }

  // ── Đặt nguyên tử còn lại bằng BFS từ các hạt giống ──
  const placeChildren = (c: number, queue: number[]) => {
    const placedNbrs = adj[c].filter((nb) => pos[nb.idx] !== null);
    const unplaced = adj[c].filter((nb) => pos[nb.idx] === null);
    if (unplaced.length === 0) return;

    const pushChild = (idx: number, p: Vec3) => {
      pos[idx] = p;
      placedFrom[idx] = c;
      queue.push(idx);
    };

    if (placedNbrs.length === 0) {
      // Gốc: hướng lý tưởng từ đầu
      const dirs = fillValences([], hyb[c]);
      unplaced.forEach((nb, i) => pushChild(nb.idx, add(pos[c]!, scale(dirs[i], lenOf(c, nb.idx, nb.order)))));
    } else if (placedNbrs.length === 1) {
      const B = placedFrom[c];
      const A = B >= 0 ? placedFrom[B] : -1;
      if (A >= 0) {
        // NeRF: mạch duỗi (anti) + nhánh so le
        const angle = idealAngle(hyb[c]);
        const tors = staggerTorsions(hyb[c]);
        unplaced.forEach((nb, i) =>
          pushChild(nb.idx, nerf(pos[A]!, pos[B]!, pos[c]!, lenOf(c, nb.idx, nb.order), angle, tors[i % tors.length])),
        );
      } else {
        // Chưa có "ông": hướng lý tưởng từ một liên kết đã có
        const dirB = normalize(sub(pos[placedNbrs[0].idx]!, pos[c]!));
        const dirs = fillValences([dirB], hyb[c]);
        unplaced.forEach((nb, i) => pushChild(nb.idx, add(pos[c]!, scale(dirs[i], lenOf(c, nb.idx, nb.order)))));
      }
    } else {
      // ≥2 liên kết đã có (nguyên tử vòng, điểm rẽ): lấp các hướng còn trống
      const existing = placedNbrs.map((nb) => normalize(sub(pos[nb.idx]!, pos[c]!)));
      const dirs = fillValences(existing, hyb[c]);
      unplaced.forEach((nb, i) => {
        if (i < dirs.length) pushChild(nb.idx, add(pos[c]!, scale(dirs[i], lenOf(c, nb.idx, nb.order))));
      });
    }
  };

  // BFS từ các nguyên tử vòng đã gieo (mọc nhánh/mạch ra ngoài).
  if (ringOrder.length) {
    const queue = [...ringOrder];
    while (queue.length) placeChildren(queue.shift()!, queue);
  }
  // Đặt các nguyên tử còn lại (phân tử mạch hở, hoặc thành phần rời nhau).
  let offset = ringOrder.length ? 6 : 0;
  for (let root = 0; root < n; root++) {
    if (pos[root] !== null) continue;
    pos[root] = [offset, 0, 0];
    placedFrom[root] = -1;
    offset += 6;
    const queue = [root];
    while (queue.length) placeChildren(queue.shift()!, queue);
  }
  } // hết nhánh không-đa-vòng

  // ── bondDirs từ vị trí cuối, rồi thêm H ──
  const atoms: Atom[] = [];
  for (let i = 0; i < n; i++) atoms.push({ element: elements[i], position: pos[i] ?? [0, 0, 0] });
  const bonds: Bond[] = heavyBonds.map((b) => ({ ...b }));

  for (let i = 0; i < n; i++) {
    if (hCount[i] === 0) continue;
    const heavyDirs = adj[i].map((nb) => normalize(sub(pos[nb.idx]!, pos[i]!)));
    const dirs = fillValences(heavyDirs, hyb[i]);
    for (let k = 0; k < hCount[i] && k < dirs.length; k++) {
      const hIdx = atoms.length;
      atoms.push({ element: 'H', position: add(pos[i]!, scale(dirs[k], bondLength(elements[i], 'H', 1))) });
      bonds.push({ a: i, b: hIdx, order: 1 });
    }
  }

  // Căn giữa quanh tâm các nguyên tử nặng
  const centroid: Vec3 = [0, 0, 0];
  for (let i = 0; i < n; i++) {
    centroid[0] += pos[i]![0];
    centroid[1] += pos[i]![1];
    centroid[2] += pos[i]![2];
  }
  const denom = n || 1;
  centroid[0] /= denom;
  centroid[1] /= denom;
  centroid[2] /= denom;
  for (const atom of atoms) {
    atom.position = [atom.position[0] - centroid[0], atom.position[1] - centroid[1], atom.position[2] - centroid[2]];
  }

  return { atoms, bonds };
}

/** Dựng phân tử từ một mục trong danh mục (mọi nguyên tử nặng đều là carbon). */
export function buildMolecule(spec: MoleculeSpec): Molecule {
  const elements = new Array(spec.skeleton.nC).fill('C');
  return layoutMolecule(elements, spec.skeleton.bonds);
}

/** Dựng phân tử từ bảng liên kết do AI trả về (nguyên tử nặng bất kỳ). */
export function buildFromGraph(graph: MoleculeGraph): Molecule {
  return layoutMolecule(
    graph.atoms.map((a) => a.element),
    graph.bonds,
  );
}

const SUBS = '₀₁₂₃₄₅₆₇₈₉';
const subscript = (num: number): string =>
  String(num)
    .split('')
    .map((d) => SUBS[Number(d)])
    .join('');

/** Công thức phân tử theo thứ tự Hill (C, H, rồi chữ cái), dùng cho panel thông tin. */
export function molecularFormula(molecule: Molecule): string {
  const counts: Record<string, number> = {};
  for (const atom of molecule.atoms) counts[atom.element] = (counts[atom.element] ?? 0) + 1;
  const order = Object.keys(counts).sort((a, b) => {
    if (a === 'C') return -1;
    if (b === 'C') return 1;
    if (a === 'H') return -1;
    if (b === 'H') return 1;
    return a.localeCompare(b);
  });
  return order.map((el) => el + (counts[el] > 1 ? subscript(counts[el]) : '')).join('');
}


