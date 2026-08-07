import type { TrackPoint } from "../engines/mechanics/types";
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

function offsetTrackForBall(points: TrackPoint[], radius: number): TrackPoint[] {
  return points.map((point, index) => {
    const before = points[Math.max(0, index - 1)]!;
    const after = points[Math.min(points.length - 1, index + 1)]!;
    const dx = after.x - before.x;
    const dy = after.y - before.y;
    const length = Math.hypot(dx, dy) || 1;
    let nx = -dy / length;
    let ny = dx / length;
    if (ny < 0) {
      nx *= -1;
      ny *= -1;
    }
    return { x: point.x + nx * radius, y: point.y + ny * radius };
  });
}

function idealBottomSpeed(height: number, g: number): number {
  return Math.sqrt(Math.max(0, 2 * g * height));
}

export const mangCongGalilei: Preset = {
  id: "mang-cong-galilei",
  title: "Máng cong Galilei",
  domain: "Cơ học",
  grade: 10,
  desc: "Quan sát viên bi đi xuống một nhánh máng và đi lên nhánh đối diện để tìm hiểu quán tính.",
  objective: "Thấy rằng nếu không có hao phí, viên bi có xu hướng trở lại độ cao ban đầu; nhánh đối diện càng thoải thì bi phải đi càng xa, dẫn tới ý tưởng về chuyển động theo quán tính.",
  sgkRef: "Vật lí 10",
  paramGuide:
    "Thả viên bi từ nhánh trái: trọng lực làm bi đi xuống, tăng tốc ở đáy rồi đi lên nhánh phải. Khi không có hao phí, bi có xu hướng đạt lại độ cao ban đầu; nhánh phải càng thoải thì bi phải đi càng xa. Nếu nhánh phải nằm ngang và không có ma sát, bi sẽ tiếp tục chuyển động theo quán tính.",
  params: [
    {
      key: "h",
      label: "Độ cao ban đầu",
      unit: "m",
      min: 0.8,
      max: 4,
      step: 0.1,
      default: 2.6,
      description: "Thả bi càng cao thì thế năng ban đầu càng lớn, nên bi đạt tốc độ ở đáy máng càng cao.",
    },
    {
      key: "angle",
      label: "Độ dốc nhánh phải",
      unit: "°",
      min: 8,
      max: 55,
      step: 1,
      default: 25,
      description: "Nhánh phải càng thoải thì viên bi phải đi quãng đường càng dài để tiến gần độ cao ban đầu.",
    },
    {
      key: "loss",
      label: "Hao phí quy đổi",
      unit: "N·s/m",
      min: 0,
      max: 0.5,
      step: 0.02,
      default: 0,
      description: "Hao phí càng lớn thì cơ năng mất càng nhiều, nên viên bi lên được độ cao thấp hơn ở nhánh phải.",
    },
    {
      key: "g",
      label: "Gia tốc trọng trường",
      unit: "m/s²",
      min: 1.6,
      max: 20,
      step: 0.1,
      default: 9.8,
      description: "g càng lớn thì trọng lực kéo bi xuống mạnh hơn và tốc độ của bi ở đáy máng càng cao.",
    },
  ],
  applyParams: (p) => {
    const h = p.h ?? 2.6;
    const angle = p.angle ?? 25;
    const loss = p.loss ?? 0;
    const g = p.g ?? 9.8;
    const visualTrack = makeTrack(h, angle);
    const ballRadius = 0.18;
    const points = offsetTrackForBall(visualTrack, ballRadius);
    const start = points[0]!;
    return {
      bodies: [
        {
          id: "ball",
          x: start.x,
          y: start.y,
          vx: 0,
          vy: 0,
          mass: 1,
          radius: ballRadius,
          visual: { shape: "metalBall", color: "#fbbf24", label: "bi", metalTone: "brass" },
        },
      ],
      forces: [
        { kind: "gravity", g },
        ...(loss > 0 ? [{ kind: "drag" as const, body: "ball", c: loss }] : []),
      ],
      constraints: [{ kind: "curveTrack", body: "ball", points, friction: 0, appearance: "galileiRamp", visualOffset: ballRadius }],
      view: { minX: -3.9, maxX: Math.max(3.8, rightReach(h, angle) + 0.7), minY: -0.35, maxY: h + 0.75 },
      groundPadding: 72,
      disableDragging: true,
      conserveMechanicalEnergy: loss <= 1e-9,
    };
  },
  trackingLabels: { ball: "Viên bi trên máng cong" },
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
