import type { Preset } from "./types";

export const nemXien: Preset = {
  id: "nem-xien",
  title: "Chuyển động ném xiên",
  domain: "Cơ học",
  grade: 10,
  desc: "Ném một vật lên cao theo phương xiên góc và quan sát quỹ đạo rơi",
  objective: "Ném một vật lên cao theo phương xiên góc và quan sát quỹ đạo rơi",
  sgkRef: "Vật lí 10",
  params: [
    { key: "v0", label: "Vận tốc đầu", unit: "m/s", min: 5, max: 40, step: 1, default: 22 },
    { key: "angle", label: "Góc ném", unit: "°", min: 10, max: 80, step: 1, default: 55 },
    { key: "g", label: "Gia tốc trọng trường", unit: "m/s²", min: 1.6, max: 20, step: 0.1, default: 9.8 },
  ],
  applyParams: (p) => {
    const v0 = p.v0 ?? 22;
    const ang = ((p.angle ?? 55) * Math.PI) / 180;
    return {
      bodies: [{ id: "ball", x: 0, y: 0.2, vx: v0 * Math.cos(ang), vy: v0 * Math.sin(ang), mass: 1 }],
      forces: [{ kind: "gravity", g: p.g ?? 9.8 }],
      // mặt đất có ma sát → vật chạm đất rồi dừng (không trượt vô tận)
      constraints: [{ kind: "surface", x: 30, y: 0, angle: 0, length: 400, friction: 0.6 }],
    };
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
            { label: "vₓ = v₀cosθ", value: (v0 * Math.cos(ang)).toFixed(2), unit: "m/s" },
            { label: "v_y = v₀sinθ", value: (v0 * Math.sin(ang)).toFixed(2), unit: "m/s" },
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
        description: "Chạm đất — tầm xa R.",
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
            { label: "Tầm xa R = v₀²sin(2θ)/g", value: ((v0 * v0 * Math.sin(2 * ang)) / g).toFixed(2), unit: "m" },
            { label: "Thời gian bay", value: ((2 * v0 * Math.sin(ang)) / g).toFixed(2), unit: "s" },
          ];
        },
      },
    ],
  },
};
