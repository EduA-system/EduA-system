import type { Charge } from "./physics";

/** "field-lines": đường sức + mũi tên. "spectrum": hạt điện phổ định hướng theo trường. */
export type DisplayMode = "field-lines" | "spectrum";

export type PointChargeFieldScene = {
  kind: "point-charge-field";
  charges: Charge[]; // luôn đúng 2 phần tử [q1, q2], q tính bằng Coulomb (đổi từ nC)
  epsilonR: number;
  baseLineCount: number; // số đường sức cho điện tích |q| LỚN HƠN; điện tích còn lại tỉ lệ theo |qi|
  displayMode: DisplayMode;
  chargeVisualRadius: number; // world unit — bán kính vẽ điện tích, seed radius, hit radius đều suy từ đây
  domainRadius: number; // world unit tính từ gốc — biên miền truy vết đường sức
};
