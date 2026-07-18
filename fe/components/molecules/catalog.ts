// Danh mục phân tử: ba dãy đồng đẳng C1–C10 + đồng phân mạch nhánh tiêu biểu.

import type { BondOrder, CarbonSkeleton, MoleculeSpec, Series } from './types';

export const SERIES_LABELS: Record<Series, string> = {
  alkane: 'Ankan',
  alkene: 'Anken',
  alkyne: 'Ankin',
};

export const SERIES_ORDER: Series[] = ['alkane', 'alkene', 'alkyne'];

// ── Helpers ─────────────────────────────────────────────────────────────────

const SUBS = '₀₁₂₃₄₅₆₇₈₉';
const sub = (n: number): string =>
  String(n)
    .split('')
    .map((d) => SUBS[Number(d)])
    .join('');

const formula = (nC: number, nH: number): string =>
  (nC === 1 ? 'C' : `C${sub(nC)}`) + (nH === 1 ? 'H' : `H${sub(nH)}`);

/**
 * Bộ khung mạch thẳng n carbon. `unsatPos` (1-based) là carbon đầu của liên kết
 * bội; `unsatOrder` là bậc (2 hoặc 3).
 */
function linearSkeleton(n: number, unsatPos?: number, unsatOrder?: BondOrder): CarbonSkeleton {
  const bonds: CarbonSkeleton['bonds'] = [];
  for (let i = 0; i < n - 1; i++) {
    const order: BondOrder = unsatPos && i === unsatPos - 1 ? (unsatOrder ?? 1) : 1;
    bonds.push({ a: i, b: i + 1, order });
  }
  return { nC: n, bonds };
}

// Công thức cấu tạo thu gọn cho mạch thẳng
function linearCondensed(series: Series, n: number): string {
  if (series === 'alkane') {
    if (n === 1) return 'CH₄';
    if (n === 2) return 'CH₃–CH₃';
    if (n <= 4) return 'CH₃' + '–CH₂'.repeat(n - 2) + '–CH₃';
    return `CH₃(CH₂)${sub(n - 2)}CH₃`;
  }
  if (series === 'alkene') {
    if (n === 2) return 'CH₂=CH₂';
    if (n === 3) return 'CH₂=CH–CH₃';
    if (n === 4) return 'CH₂=CH–CH₂–CH₃';
    return `CH₂=CH(CH₂)${sub(n - 3)}CH₃`;
  }
  if (n === 2) return 'CH≡CH';
  if (n === 3) return 'CH≡C–CH₃';
  if (n === 4) return 'CH≡C–CH₂–CH₃';
  return `CH≡C(CH₂)${sub(n - 3)}CH₃`;
}

// Tên tiếng Việt theo số carbon
const ALKANE_NAMES = ['', 'Metan', 'Etan', 'Propan', 'Butan', 'Pentan', 'Hexan', 'Heptan', 'Octan', 'Nonan', 'Dekan'];
const STEM = ['', '', 'Et', 'Prop', 'But', 'Pent', 'Hex', 'Hept', 'Oct', 'Non', 'Dec'];

function alkeneName(n: number): string {
  if (n === 2) return 'Eten';
  if (n === 3) return 'Propen';
  return `${STEM[n]}-1-en`;
}
function alkyneName(n: number): string {
  if (n === 2) return 'Etin';
  if (n === 3) return 'Propin';
  return `${STEM[n]}-1-in`;
}

function linearSpec(series: Series, n: number): MoleculeSpec {
  const nH = series === 'alkane' ? 2 * n + 2 : series === 'alkene' ? 2 * n : 2 * n - 2;
  const nameVi = series === 'alkane' ? ALKANE_NAMES[n] : series === 'alkene' ? alkeneName(n) : alkyneName(n);
  const skeleton =
    series === 'alkane'
      ? linearSkeleton(n)
      : linearSkeleton(n, 1, series === 'alkene' ? 2 : 3);
  return {
    id: `${series}-${n}`,
    nameVi,
    series,
    formula: formula(n, nH),
    condensed: linearCondensed(series, n),
    skeleton,
  };
}

// ── Đồng phân mạch nhánh tiêu biểu ──────────────────────────────────────────

const ISOMERS: MoleculeSpec[] = [
  {
    id: 'iso-butan',
    nameVi: 'Isobutan',
    series: 'alkane',
    formula: formula(4, 10),
    condensed: '(CH₃)₃CH',
    skeleton: { nC: 4, bonds: [
      { a: 0, b: 1, order: 1 },
      { a: 0, b: 2, order: 1 },
      { a: 0, b: 3, order: 1 },
    ] },
  },
  {
    id: 'iso-pentan',
    nameVi: 'Isopentan',
    series: 'alkane',
    formula: formula(5, 12),
    condensed: '(CH₃)₂CH–CH₂–CH₃',
    skeleton: { nC: 5, bonds: [
      { a: 0, b: 1, order: 1 },
      { a: 1, b: 2, order: 1 },
      { a: 2, b: 3, order: 1 },
      { a: 1, b: 4, order: 1 },
    ] },
  },
  {
    id: 'neo-pentan',
    nameVi: 'Neopentan',
    series: 'alkane',
    formula: formula(5, 12),
    condensed: 'C(CH₃)₄',
    skeleton: { nC: 5, bonds: [
      { a: 0, b: 1, order: 1 },
      { a: 0, b: 2, order: 1 },
      { a: 0, b: 3, order: 1 },
      { a: 0, b: 4, order: 1 },
    ] },
  },
  {
    id: 'but-2-en',
    nameVi: 'But-2-en',
    series: 'alkene',
    formula: formula(4, 8),
    condensed: 'CH₃–CH=CH–CH₃',
    skeleton: linearSkeleton(4, 2, 2),
  },
  {
    id: 'isobutylen',
    nameVi: 'Isobutylen (2-metylpropen)',
    series: 'alkene',
    formula: formula(4, 8),
    condensed: 'CH₂=C(CH₃)₂',
    skeleton: { nC: 4, bonds: [
      { a: 0, b: 1, order: 2 },
      { a: 0, b: 2, order: 1 },
      { a: 0, b: 3, order: 1 },
    ] },
  },
  {
    id: 'but-2-in',
    nameVi: 'But-2-in',
    series: 'alkyne',
    formula: formula(4, 6),
    condensed: 'CH₃–C≡C–CH₃',
    skeleton: linearSkeleton(4, 2, 3),
  },
];

// ── Danh mục đầy đủ ─────────────────────────────────────────────────────────

function buildCatalog(): MoleculeSpec[] {
  const specs: MoleculeSpec[] = [];
  for (let n = 1; n <= 10; n++) specs.push(linearSpec('alkane', n));
  for (let n = 2; n <= 10; n++) specs.push(linearSpec('alkene', n));
  for (let n = 2; n <= 10; n++) specs.push(linearSpec('alkyne', n));
  specs.push(...ISOMERS);
  return specs;
}

export const MOLECULE_CATALOG: MoleculeSpec[] = buildCatalog();

export function specsBySeries(series: Series): MoleculeSpec[] {
  return MOLECULE_CATALOG.filter((s) => s.series === series);
}

export function specById(id: string): MoleculeSpec | undefined {
  return MOLECULE_CATALOG.find((s) => s.id === id);
}

/** Chuẩn hoá để so khớp tiếng Việt: bỏ dấu, đ→d, thường hoá. */
export function normalizeVi(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();
}

// Đổi chỉ số dưới ('C₂H₆') → chữ số thường ('C2H6') để khớp khi gõ công thức.
const deSubscript = (s: string): string =>
  s.replace(/[₀-₉]/g, (d) => String(SUBS.indexOf(d)));

/**
 * Tìm trong danh mục theo tên (bỏ dấu) hoặc công thức. Trả [] nếu query rỗng.
 */
export function searchCatalog(query: string): MoleculeSpec[] {
  const q = normalizeVi(query);
  if (!q) return [];
  const qNoSpace = q.replace(/\s+/g, '');
  return MOLECULE_CATALOG.filter(
    (s) =>
      normalizeVi(s.nameVi).includes(q) ||
      deSubscript(s.formula).toLowerCase().includes(qNoSpace) ||
      s.id.includes(qNoSpace),
  );
}


