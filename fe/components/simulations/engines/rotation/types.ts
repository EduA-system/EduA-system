// Engine quay phẳng cho các thí nghiệm có trục cố định.
// Quy ước: theta > 0 là ngược chiều kim đồng hồ. Đơn vị SI.

export type RotationSide = {
  mass: number; // kg
  radius: number; // m, cánh tay đòn / bán kính cuốn dây
  label: string;
  color: string;
};

export type RotationScene = {
  kind: "rotation";
  diskRadius: number; // m
  diskMass: number; // kg, đĩa đồng chất
  gravity: number; // m/s²
  angularDamping: number; // N.m.s/rad, mô-men cản ổ trục
  ropeLength: number; // m, chiều dài không đổi của dây treo
  left: RotationSide;
  right: RotationSide;
  initialTheta?: number; // rad
  initialOmega?: number; // rad/s
};

export type RotationState = {
  theta: number; // rad
  omega: number; // rad/s
  stoppedAtLimit: boolean;
};

export type RotationTorques = {
  left: number;
  right: number;
  net: number;
  inertia: number;
};
