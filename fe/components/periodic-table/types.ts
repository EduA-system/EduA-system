export type ElementCategory =
  | 'alkali-metal'
  | 'alkaline-earth'
  | 'transition-metal'
  | 'post-transition'
  | 'metalloid'
  | 'nonmetal'
  | 'halogen'
  | 'noble-gas'
  | 'lanthanide'
  | 'actinide'
  | 'unknown';

export type ElementBlock = 's' | 'p' | 'd' | 'f';
export type ElementState = 'solid' | 'liquid' | 'gas' | 'unknown';

/** CIAAW standard atomic-weight notation.  A mass number is deliberately not
 * presented as a standard atomic weight for elements without one. */
export type AtomicWeight =
  | { kind: 'value'; value: number }
  | { kind: 'interval'; min: number; max: number }
  | { kind: 'mass-number'; value: number }
  | null;

export interface RepresentativeIsotope {
  massNumber: number;
  neutronCount: number;
  source: 'NIST/CIAAW';
}

export interface Element {
  atomicNumber: number;
  symbol: string;
  name: string;
  nameVi: string;
  atomicWeight: AtomicWeight;
  category: ElementCategory;
  block: ElementBlock;
  period: number;
  group: number | null;
  gridRow: number;
  gridCol: number;
  electronConfig: string;
  protons: number;
  electrons: number;
  meltingPoint: number | null;
  boilingPoint: number | null;
  density: number | null;
  electronegativity: number | null;
  ionizationEnergy: number | null;
  electronAffinity: number | null;
  /** PubChem van der Waals radius, in pm. */
  vanDerWaalsRadius: number | null;
  representativeIsotope: RepresentativeIsotope | null;
  state: ElementState;
}

export type GroupMode = 'category' | 'period' | 'block' | 'state';
export type ColorMode = 'meltingPoint' | 'boilingPoint' | 'density' | 'electronegativity' | 'ionizationEnergy' | 'electronAffinity' | 'vanDerWaalsRadius';
export type DisplayMode = 'group' | 'color';

export interface FilterState {
  meltingPoint: [number, number] | null;
  boilingPoint: [number, number] | null;
  density: [number, number] | null;
  electronegativity: [number, number] | null;
  ionizationEnergy: [number, number] | null;
  electronAffinity: [number, number] | null;
  blocks: Set<ElementBlock>;
  states: Set<ElementState>;
  categories: Set<ElementCategory>;
}

export const CATEGORY_COLORS: Record<ElementCategory, { bg: string; border: string; text: string; label: string }> = {
  'alkali-metal':    { bg: '#fde68a', border: '#f59e0b', text: '#78350f', label: 'Kim loại kiềm' },
  'alkaline-earth':  { bg: '#fed7aa', border: '#fb923c', text: '#7c2d12', label: 'Kim loại kiềm thổ' },
  'transition-metal':{ bg: '#bfdbfe', border: '#60a5fa', text: '#1e3a8a', label: 'Kim loại chuyển tiếp' },
  'post-transition': { bg: '#bbf7d0', border: '#4ade80', text: '#14532d', label: 'Kim loại hậu chuyển tiếp' },
  'metalloid':       { bg: '#d9f99d', border: '#a3e635', text: '#365314', label: 'Á kim' },
  'nonmetal':        { bg: '#fce7f3', border: '#f472b6', text: '#831843', label: 'Phi kim' },
  'halogen':         { bg: '#ede9fe', border: '#a78bfa', text: '#4c1d95', label: 'Halogen' },
  'noble-gas':       { bg: '#cffafe', border: '#22d3ee', text: '#164e63', label: 'Khí hiếm' },
  'lanthanide':      { bg: '#fef9c3', border: '#facc15', text: '#713f12', label: 'Lanthanide' },
  'actinide':        { bg: '#fee2e2', border: '#f87171', text: '#7f1d1d', label: 'Actinide' },
  'unknown':         { bg: '#f3f4f6', border: '#d1d5db', text: '#374151', label: 'Không xác định' },
};

export const BLOCK_COLORS: Record<ElementBlock, { bg: string; border: string; label: string }> = {
  's': { bg: '#fde68a', border: '#f59e0b', label: 'Khối s' },
  'p': { bg: '#bbf7d0', border: '#4ade80', label: 'Khối p' },
  'd': { bg: '#bfdbfe', border: '#60a5fa', label: 'Khối d' },
  'f': { bg: '#ede9fe', border: '#a78bfa', label: 'Khối f' },
};

export const STATE_COLORS: Record<ElementState, { bg: string; border: string; label: string }> = {
  'solid':   { bg: '#e2e8f0', border: '#94a3b8', label: 'Rắn' },
  'liquid':  { bg: '#bfdbfe', border: '#60a5fa', label: 'Lỏng' },
  'gas':     { bg: '#d1fae5', border: '#34d399', label: 'Khí' },
  'unknown': { bg: '#f3f4f6', border: '#d1d5db', label: 'Không xác định' },
};

export const PERIOD_COLORS: Record<number, { bg: string; border: string }> = {
  1: { bg: '#ede9fe', border: '#a78bfa' },
  2: { bg: '#dbeafe', border: '#93c5fd' },
  3: { bg: '#d1fae5', border: '#6ee7b7' },
  4: { bg: '#fef9c3', border: '#fde047' },
  5: { bg: '#fed7aa', border: '#fdba74' },
  6: { bg: '#fecdd3', border: '#fda4af' },
  7: { bg: '#f3f4f6', border: '#d1d5db' },
};

export const COLOR_MODE_LABELS: Record<ColorMode, { label: string; unit: string }> = {
  meltingPoint:     { label: 'Điểm nóng chảy', unit: '°C' },
  boilingPoint:     { label: 'Điểm sôi', unit: '°C' },
  density:          { label: 'Khối lượng riêng', unit: 'g/cm³' },
  electronegativity:{ label: 'Độ âm điện', unit: '' },
  ionizationEnergy: { label: 'Năng lượng ion hóa', unit: 'kJ/mol' },
  electronAffinity: { label: 'Ái lực electron', unit: 'kJ/mol' },
  vanDerWaalsRadius:{ label: 'Bán kính van der Waals', unit: 'pm' },
};

export const GROUP_MODE_LABELS: Record<GroupMode, string> = {
  category:        'Loại nguyên tố',
  period:          'Chu kỳ',
  block:           'Khối',
  state:           'Trạng thái',
};

export function heatmapColor(value: number, min: number, max: number): string {
  if (max === min) return 'hsl(240, 80%, 75%)';
  const t = Math.max(0, Math.min(1, (value - min) / (max - min)));
  const h = t < 0.5 ? 240 - 360 * t : 60 - 120 * (t - 0.5);
  const s = 80 + t * 10;
  const l = 75 - t * 20;
  return `hsl(${h.toFixed(0)}, ${s.toFixed(0)}%, ${l.toFixed(0)}%)`;
}

export const DEFAULT_FILTER_STATE: FilterState = {
  meltingPoint: null,
  boilingPoint: null,
  density: null,
  electronegativity: null,
  ionizationEnergy: null,
  electronAffinity: null,
  blocks: new Set(),
  states: new Set(),
  categories: new Set(),
};
