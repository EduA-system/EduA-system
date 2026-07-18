// Kiểu dữ liệu cho mô hình cấu tạo phân tử 3D.
// `Molecule` là hợp đồng (contract) giữa builder và renderer — giai đoạn 2 (AI)
// sẽ trả về cùng shape này nên renderer không phải đổi.

export type Vec3 = [number, number, number];
export type BondOrder = 1 | 2 | 3;

/** Ba dãy đồng đẳng hydrocarbon: ankan / anken / ankin. */
export type Series = 'alkane' | 'alkene' | 'alkyne';

/** Trạng thái lai hoá của một carbon, suy ra từ bậc liên kết C–C cao nhất nối vào. */
export type Hybridization = 'sp3' | 'sp2' | 'sp';

/** Một nguyên tử với toạ độ 3D (đơn vị Ångström, đã căn giữa quanh gốc). */
export interface Atom {
  element: string; // 'C' | 'H' | 'O' | 'N' ...
  position: Vec3;
}

/** Một liên kết giữa hai nguyên tử (index vào mảng atoms). */
export interface Bond {
  a: number;
  b: number;
  order: BondOrder;
}

/** Phân tử đã dựng xong — đầu vào của renderer. */
export interface Molecule {
  atoms: Atom[];
  bonds: Bond[];
}

/**
 * Bộ khung carbon dưới dạng đồ thị (hỗ trợ cả mạch nhánh).
 * Index 0..nC-1 là các carbon; chỉ chứa liên kết C–C (H được builder tự thêm).
 */
export interface CarbonSkeleton {
  nC: number;
  bonds: { a: number; b: number; order: BondOrder }[];
}

/**
 * Bảng liên kết các nguyên tử NẶNG (không H) — định dạng AI trả về ở giai đoạn 2.
 * FE thêm H theo hoá trị và dựng toạ độ 3D qua `buildFromGraph`.
 */
export interface MoleculeGraph {
  name: string;
  atoms: { element: string }[];
  bonds: Bond[];
}

/** Định nghĩa một phân tử trong danh mục. */
export interface MoleculeSpec {
  id: string;
  nameVi: string;
  series: Series;
  formula: string; // Công thức phân tử, vd 'C₄H₁₀'
  condensed: string; // Công thức cấu tạo thu gọn, vd '(CH₃)₃CH'
  skeleton: CarbonSkeleton;
}


