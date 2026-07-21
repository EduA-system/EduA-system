// Khung dây chữ nhật quay quanh trục cố định đặt vuông góc với từ trường đều.
// Góc alpha là góc giữa pháp tuyến n của khung và vector cảm ứng từ B.

export type MagneticLoopScene = {
  kind: "magnetic-loop";
  width: number; // m
  height: number; // m
  mass: number; // kg
  turns: number;
  current: number; // A; dấu biểu diễn chiều dòng điện
  magneticField: number; // T
  angularDamping: number; // N.m.s/rad
  initialAngle: number; // rad
  initialAngularVelocity?: number; // rad/s
};

export type MagneticLoopState = {
  angle: number;
  angularVelocity: number;
};

export type MagneticLoopDynamics = {
  area: number;
  inertia: number;
  effectiveCurrent: number;
  magneticMoment: number;
  sideForce: number;
  torque: number;
  angularAcceleration: number;
};
