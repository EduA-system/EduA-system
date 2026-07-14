import type { TrackPoint } from "../kernel/types";
import type { Preset } from "./types";

function degToRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

function rightReach(height: number, angleDeg: number): number {
  const angle = Math.max(5, Math.min(65, angleDeg));
  return Math.min(14, Math.max(2.2, (2 * height) / Math.tan(degToRad(angle))));
}

function makeTrack(height: number, angleDeg: number): TrackPoint[] {
  const leftSpan = 3.2;
  const reach = rightReach(height, angleDeg);
  const points: TrackPoint[] = [];

  for (let i = 0; i <= 56; i++) {
    const u = i / 56;
    points.push({
      x: -leftSpan * (1 - u),
      y: height * (1 - u) * (1 - u),
    });
  }
  for (let i = 1; i <= 96; i++) {
    const u = i / 96;
    points.push({
      x: reach * u,
      y: height * u * u,
    });
  }

  return points;
}

function idealBottomSpeed(height: number, g: number): number {
  return Math.sqrt(Math.max(0, 2 * g * height));
}

export const mangCongGalilei: Preset = {
  id: "mang-cong-galilei",
  title: "Máng cong Galilei",
  domain: "Cơ học",
  grade: 10,
  desc: "Viên bi trượt trên máng cong để quan sát quán tính và sự bảo toàn độ cao trong trường hợp lí tưởng.",
  objective: "Hiểu rằng nếu bỏ qua ma sát, vật đi lên nhánh bên kia gần bằng độ cao ban đầu; nhánh càng thoải thì vật đi càng xa.",
  sgkRef: "Vật lí 10",
  params: [
    { key: "h", label: "Độ cao ban đầu", unit: "m", min: 0.8, max: 4, step: 0.1, default: 2.6 },
    { key: "angle", label: "Độ dốc nhánh phải", unit: "°", min: 8, max: 55, step: 1, default: 25 },
    { key: "loss", label: "Hao phí quy đổi", unit: "N·s/m", min: 0, max: 0.5, step: 0.02, default: 0 },
    { key: "g", label: "Gia tốc trọng trường", unit: "m/s²", min: 1.6, max: 20, step: 0.1, default: 9.8 },
  ],
  applyParams: (p) => {
    const h = p.h ?? 2.6;
    const angle = p.angle ?? 25;
    const loss = p.loss ?? 0;
    const g = p.g ?? 9.8;
    const points = makeTrack(h, angle);
    const start = points[0]!;
    return {
      bodies: [{ id: "ball", x: start.x, y: start.y, vx: 0, vy: 0, mass: 1, radius: 0.12 }],
      forces: [
        { kind: "gravity", g },
        ...(loss > 0 ? [{ kind: "drag" as const, body: "ball", c: loss }] : []),
      ],
      constraints: [{ kind: "curveTrack", body: "ball", points, friction: 0 }],
    };
  },
  analysis: {
    landmarks: [
      {
        key: "start",
        label: "Thả từ độ cao h",
        description: "Viên bi bắt đầu gần như đứng yên ở một độ cao xác định. Thế năng trọng trường ban đầu là nguồn tạo ra chuyển động.",
        values: (p) => {
          const h = p.h ?? 2.6;
          const g = p.g ?? 9.8;
          return [
            { label: "h", value: h.toFixed(2), unit: "m" },
            { label: "g", value: g.toFixed(2), unit: "m/s²" },
            { label: "v ban đầu", value: "0", unit: "m/s" },
          ];
        },
      },
      {
        key: "bottom",
        label: "Tại đáy máng",
        description: "Trong trường hợp lí tưởng, thế năng giảm chuyển thành động năng; tốc độ ở đáy xấp xỉ v = sqrt(2gh).",
        values: (p) => {
          const h = p.h ?? 2.6;
          const g = p.g ?? 9.8;
          return [
            { label: "v đáy lí tưởng", value: idealBottomSpeed(h, g).toFixed(2), unit: "m/s" },
            { label: "Cơ năng", value: "gần bảo toàn nếu hao phí = 0", unit: "" },
          ];
        },
      },
      {
        key: "right-branch",
        label: "Đi lên nhánh bên kia",
        description: "Nếu bỏ qua hao phí, viên bi sẽ lên gần lại độ cao ban đầu. Khi nhánh phải thoải hơn, vật phải đi xa hơn để đạt cùng độ cao.",
        values: (p) => {
          const h = p.h ?? 2.6;
          const angle = p.angle ?? 25;
          return [
            { label: "Độ dốc nhánh phải", value: angle.toFixed(0), unit: "°" },
            { label: "Quãng ngang tới cùng độ cao", value: rightReach(h, angle).toFixed(2), unit: "m" },
            { label: "Kết luận", value: "nhánh càng thoải, quãng đường càng dài", unit: "" },
          ];
        },
      },
      {
        key: "inertia",
        label: "Ý nghĩa quán tính",
        description: "Giới hạn khi nhánh bên kia gần như nằm ngang: nếu không có ma sát, vật có xu hướng tiếp tục chuyển động thẳng đều.",
        values: (p) => [
          { label: "Hao phí", value: (p.loss ?? 0).toFixed(2), unit: "N·s/m" },
          { label: "Mô hình", value: "chất điểm trượt trên đường ray cong", unit: "" },
        ],
      },
    ],
  },
};