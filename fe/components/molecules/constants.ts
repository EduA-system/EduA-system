// Hằng số hiển thị (màu CPK, bán kính) và hình học liên kết cho mô hình phân tử.

export interface ElementStyle {
  color: string; // màu CPK (hex)
  radiusBall: number; // bán kính quả cầu ở chế độ ball-and-stick (Å, đã thu nhỏ)
  radiusVdw: number; // bán kính van der Waals ở chế độ space-filling (Å)
}

/**
 * Bảng màu CPK + bán kính. Ship sẵn C, H, O, N để dễ mở rộng dù giai đoạn đầu chỉ
 * dùng C và H. C dùng xám đậm (không đen tuyệt đối) để nổi trên nền trắng.
 */
export const ELEMENT_STYLES: Record<string, ElementStyle> = {
  H: { color: '#ffffff', radiusBall: 0.27, radiusVdw: 1.2 },
  C: { color: '#2b2b2b', radiusBall: 0.45, radiusVdw: 1.7 },
  O: { color: '#ff3b30', radiusBall: 0.42, radiusVdw: 1.52 },
  N: { color: '#3050f8', radiusBall: 0.42, radiusVdw: 1.55 },
  S: { color: '#e6c84f', radiusBall: 0.48, radiusVdw: 1.8 },
  P: { color: '#ff8000', radiusBall: 0.48, radiusVdw: 1.8 },
  F: { color: '#90e050', radiusBall: 0.38, radiusVdw: 1.47 },
  Cl: { color: '#1ff01f', radiusBall: 0.5, radiusVdw: 1.75 },
  Br: { color: '#a62929', radiusBall: 0.55, radiusVdw: 1.85 },
  I: { color: '#940094', radiusBall: 0.62, radiusVdw: 1.98 },
};

/** Hoá trị chuẩn — để thêm H lấp đầy: nH = hoá trị − tổng bậc liên kết nặng. */
export const VALENCE: Record<string, number> = {
  C: 4, N: 3, O: 2, S: 2, P: 3, F: 1, Cl: 1, Br: 1, I: 1, H: 1,
};

/** Số cặp electron tự do (điện tử chưa liên kết) — ảnh hưởng số miền lập thể. */
export const LONE_PAIRS: Record<string, number> = {
  C: 0, N: 1, O: 2, S: 2, P: 1, F: 3, Cl: 3, Br: 3, I: 3, H: 0,
};

/** Bán kính cộng hoá trị (Å) — ước lượng độ dài liên kết cho cặp nguyên tố bất kỳ. */
const COVALENT_RADIUS: Record<string, number> = {
  H: 0.31, C: 0.76, N: 0.71, O: 0.66, S: 1.05, P: 1.07,
  F: 0.57, Cl: 1.02, Br: 1.2, I: 1.39,
};

/** Độ dài liên kết giữa hai nguyên tố theo bậc (Å). C–C, C–H giữ giá trị chuẩn. */
export function bondLength(elA: string, elB: string, order: 1 | 2 | 3): number {
  if (elA === 'C' && elB === 'C') return ccBondLength(order);
  if ((elA === 'C' && elB === 'H') || (elA === 'H' && elB === 'C')) return BOND_LEN.CH;
  const rA = COVALENT_RADIUS[elA] ?? 0.75;
  const rB = COVALENT_RADIUS[elB] ?? 0.75;
  const single = rA + rB;
  const factor = order === 3 ? 0.83 : order === 2 ? 0.9 : 1; // co ngắn khi bội
  return single * factor;
}

export const DEFAULT_STYLE: ElementStyle = { color: '#ff1493', radiusBall: 0.4, radiusVdw: 1.5 };

export function elementStyle(element: string): ElementStyle {
  return ELEMENT_STYLES[element] ?? DEFAULT_STYLE;
}

/** Tên tiếng Việt của nguyên tố — dùng cho chú giải. */
export const ELEMENT_NAMES_VI: Record<string, string> = {
  H: 'Hydro',
  C: 'Carbon',
  O: 'Oxi',
  N: 'Nitơ',
  S: 'Lưu huỳnh',
  P: 'Photpho',
  F: 'Flo',
  Cl: 'Clo',
  Br: 'Brom',
  I: 'Iot',
};

export function elementNameVi(element: string): string {
  return ELEMENT_NAMES_VI[element] ?? element;
}

/** Độ dài liên kết (Å) — builder dùng để đặt toạ độ. */
export const BOND_LEN = {
  CC_single: 1.54,
  CC_double: 1.34,
  CC_triple: 1.2,
  CH: 1.09,
} as const;

/** Độ dài liên kết C–C theo bậc. */
export function ccBondLength(order: 1 | 2 | 3): number {
  return order === 3 ? BOND_LEN.CC_triple : order === 2 ? BOND_LEN.CC_double : BOND_LEN.CC_single;
}

// Hằng số dựng hình liên kết.
export const BOND_RADIUS = 0.09; // bán kính trụ
export const MULTI_BOND_OFFSET = 0.16; // khoảng dời các trụ song song của nối đôi/ba
export const BOND_COLOR = '#5b6470'; // màu xám của thanh liên kết


