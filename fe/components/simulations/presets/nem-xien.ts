import type { Preset } from "./types";

function projectileValues(p: Record<string, number>) {
  const v0 = p.v0 ?? 22;
  const angle = p.angle ?? 55;
  const angleRad = (angle * Math.PI) / 180;
  const g = p.g ?? 9.8;
  const vx0 = v0 * Math.cos(angleRad);
  const vy0 = v0 * Math.sin(angleRad);
  const maxHeight = (v0 ** 2 * Math.sin(angleRad) ** 2) / (2 * g);
  const range = (v0 ** 2 * Math.sin(2 * angleRad)) / g;
  return { v0, angle, angleRad, g, vx0, vy0, maxHeight, range };
}

export const nemXien: Preset = {
  id: "nem-xien",
  title: "Chuyển động ném xiên",
  domain: "Cơ học",
  grade: 10,
  desc: "Ném một vật lên cao theo phương xiên góc và quan sát quỹ đạo parabol, tầm cao và tầm xa.",
  objective: "Hiểu chuyển động ném xiên là sự kết hợp của chuyển động đều theo phương ngang và chuyển động biến đổi đều theo phương thẳng đứng.",
  sgkRef: "Vật lí 10",
  paramGuide:
    "Bỏ qua sức cản không khí và coi điểm ném, điểm rơi ở cùng độ cao: vận tốc đầu v₀ được tách thành v₀cosα theo phương ngang và v₀sinα theo phương thẳng đứng. Hãy thay đổi v₀, góc ném α và g để quan sát quỹ đạo, tầm cao H và tầm xa L.",
  params: [
    {
      key: "v0",
      label: "Vận tốc đầu",
      unit: "m/s",
      min: 5,
      max: 40,
      step: 1,
      default: 22,
      description: "v₀ càng lớn thì vật bay càng cao và xa; H và L đều tỉ lệ với v₀².",
    },
    {
      key: "angle",
      label: "Góc ném α",
      unit: "°",
      min: 10,
      max: 80,
      step: 1,
      default: 55,
      description: "Góc lớn làm quỹ đạo cao hơn; tầm xa lớn nhất ở 45° và bằng nhau với hai góc phụ nhau.",
    },
    {
      key: "g",
      label: "Gia tốc trọng trường",
      unit: "m/s²",
      min: 1.6,
      max: 20,
      step: 0.1,
      default: 9.8,
      description: "g càng lớn thì vật rơi xuống nhanh hơn, nên cả tầm cao H và tầm xa L đều giảm.",
    },
  ],
  paramCalculations: (p) => {
    const { v0, angle, g, maxHeight, range } = projectileValues(p);
    return [
      {
        label: "Tầm cao cực đại H",
        formula: "H = v₀²sin²α / (2g)",
        substitution: `H = ${v0.toFixed(1)}² × sin²(${angle.toFixed(0)}°) / (2 × ${g.toFixed(1)})`,
        value: maxHeight.toFixed(2),
        unit: "m",
      },
      {
        label: "Tầm xa L",
        formula: "L = v₀²sin(2α) / g",
        substitution: `L = ${v0.toFixed(1)}² × sin(2 × ${angle.toFixed(0)}°) / ${g.toFixed(1)}`,
        value: range.toFixed(2),
        unit: "m",
      },
    ];
  },
  applyParams: (p) => {
    const v0 = p.v0 ?? 22;
    const ang = ((p.angle ?? 55) * Math.PI) / 180;
    return {
      bodies: [{ id: "ball", x: 0, y: 0.2, vx: v0 * Math.cos(ang), vy: v0 * Math.sin(ang), mass: 1 }],
      forces: [{ kind: "gravity", g: p.g ?? 9.8 }],
      // Với góc ném nhỏ nhất 10°, friction = 10 đủ triệt tiêu toàn bộ vận tốc
      // tiếp tuyến ngay ở lần va chạm đầu tiên, nên vật dừng tại điểm chạm đất.
      constraints: [{ kind: "surface", x: 30, y: 0, angle: 0, length: 400, friction: 10 }],
    };
  },
  trackingLabels: { ball: "Quả bóng ném xiên" },
  bodyTrails: {
    ball: { color: "#f472b6", width: 2.5, dash: [8, 7] },
  },
  analysis: {
    landmarks: [
      {
        key: "launch",
        label: "Lúc ném",
        description: "Tách vận tốc thành 2 thành phần.",
        atTime: () => 0,
        values: (p) => {
          const v0 = p.v0 ?? 22;
          const ang = ((p.angle ?? 55) * Math.PI) / 180;
          return [
            { label: "vₓ = v₀cosα", value: (v0 * Math.cos(ang)).toFixed(2), unit: "m/s" },
            { label: "v_y = v₀sinα", value: (v0 * Math.sin(ang)).toFixed(2), unit: "m/s" },
          ];
        },
      },
      {
        key: "apex",
        label: "Đỉnh quỹ đạo",
        description: "v_y = 0, độ cao lớn nhất.",
        atTime: (p) => {
          const v0 = p.v0 ?? 22;
          const ang = ((p.angle ?? 55) * Math.PI) / 180;
          return (v0 * Math.sin(ang)) / (p.g ?? 9.8);
        },
        values: (p) => {
          const v0 = p.v0 ?? 22;
          const ang = ((p.angle ?? 55) * Math.PI) / 180;
          const g = p.g ?? 9.8;
          return [
            { label: "Độ cao cực đại H", value: ((v0 * Math.sin(ang)) ** 2 / (2 * g)).toFixed(2), unit: "m" },
            { label: "Thời điểm đỉnh", value: ((v0 * Math.sin(ang)) / g).toFixed(2), unit: "s" },
          ];
        },
      },
      {
        key: "landing",
        label: "Chạm đất & tầm xa",
        description: "Chạm đất — tầm xa L.",
        atTime: (p) => {
          const v0 = p.v0 ?? 22;
          const ang = ((p.angle ?? 55) * Math.PI) / 180;
          return (2 * v0 * Math.sin(ang)) / (p.g ?? 9.8);
        },
        values: (p) => {
          const v0 = p.v0 ?? 22;
          const ang = ((p.angle ?? 55) * Math.PI) / 180;
          const g = p.g ?? 9.8;
          return [
            { label: "Tầm xa L = v₀²sin(2α)/g", value: ((v0 * v0 * Math.sin(2 * ang)) / g).toFixed(2), unit: "m" },
            { label: "Thời gian bay", value: ((2 * v0 * Math.sin(ang)) / g).toFixed(2), unit: "s" },
          ];
        },
      },
    ],
  },
};
