import type { Preset } from "./types";

export const roiTuDo: Preset = {
  id: "roi-tu-do",
  title: "Rơi tự do",
  domain: "Cơ học",
  grade: 10,
  desc: "Thả một vật từ độ cao h, quan sát rơi nhanh dần đều dưới trọng lực.",
  objective: "Hiểu rơi tự do: gia tốc không đổi g, vận tốc v = g·t, quãng đường s = ½g·t².",
  sgkRef: "Vật lí 10",
  params: [
    { key: "h", label: "Độ cao thả", unit: "m", min: 1, max: 20, step: 0.5, default: 10 },
    { key: "g", label: "Gia tốc trọng trường", unit: "m/s²", min: 1.6, max: 20, step: 0.1, default: 9.8 },
  ],
  applyParams: (p) => ({
    bodies: [{ id: "ball", x: 0, y: p.h ?? 10, vx: 0, vy: 0, mass: 1 }],
    forces: [{ kind: "gravity", g: p.g ?? 9.8 }],
    constraints: [{ kind: "surface", x: 0, y: 0, angle: 0, length: 400, friction: 0.6 }],
  }),
  analysis: {
    landmarks: [
      {
        key: "release",
        label: "Lúc thả",
        description: "Vật đứng yên ở độ cao h — thế năng lớn nhất, động năng = 0.",
        atTime: () => 0,
        values: (p) => [
          { label: "Độ cao h", value: (p.h ?? 10).toFixed(1), unit: "m" },
          { label: "Vận tốc đầu", value: "0", unit: "m/s" },
        ],
      },
      {
        key: "ground",
        label: "Lúc chạm đất",
        description: "Toàn bộ thế năng chuyển thành động năng (bỏ qua sức cản không khí).",
        atTime: (p) => Math.sqrt((2 * (p.h ?? 10)) / (p.g ?? 9.8)),
        values: (p) => {
          const h = p.h ?? 10;
          const g = p.g ?? 9.8;
          return [
            { label: "Thời gian rơi t = √(2h/g)", value: Math.sqrt((2 * h) / g).toFixed(2), unit: "s" },
            { label: "Vận tốc v = √(2gh)", value: Math.sqrt(2 * g * h).toFixed(2), unit: "m/s" },
          ];
        },
      },
    ],
  },
};
