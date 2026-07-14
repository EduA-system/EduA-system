import type { Preset } from "./types";

function fallTime(height: number, g: number): number {
  return height > 0 && g > 0 ? Math.sqrt((2 * height) / g) : 0;
}

function verticalDrop(t: number, g: number): number {
  return 0.5 * g * t * t;
}

export const nemNgang: Preset = {
  id: "nem-ngang",
  title: "Chuyển động ném ngang",
  domain: "Cơ học",
  grade: 10,
  desc: "Ném một vật theo phương ngang từ độ cao h và so sánh với vật thả rơi cùng lúc.",
  objective: "Hiểu ném ngang là tổng hợp của chuyển động ngang đều và rơi tự do theo phương thẳng đứng.",
  sgkRef: "Vật lí 10",
  params: [
    { key: "h", label: "Độ cao ném", unit: "m", min: 2, max: 20, step: 0.5, default: 8 },
    { key: "v0", label: "Vận tốc ngang", unit: "m/s", min: 2, max: 30, step: 0.5, default: 10 },
    { key: "g", label: "Gia tốc trọng trường", unit: "m/s²", min: 1.6, max: 20, step: 0.1, default: 9.8 },
  ],
  applyParams: (p) => {
    const h = p.h ?? 8;
    const v0 = p.v0 ?? 10;
    const g = p.g ?? 9.8;
    return {
      bodies: [
        { id: "nem-ngang", x: 0, y: h, vx: v0, vy: 0, mass: 1 },
        { id: "roi-tu-do", x: -1, y: h, vx: 0, vy: 0, mass: 1 },
      ],
      forces: [{ kind: "gravity", g }],
      constraints: [{ kind: "surface", x: 0, y: 0, angle: 0, length: 400, friction: 0.6 }],
    };
  },
  analysis: {
    landmarks: [
      {
        key: "launch",
        label: "Lúc bắt đầu",
        description: "Vật ném ngang có vận tốc ban đầu theo phương ngang; vật đối chứng được thả rơi tự do.",
        atTime: () => 0,
        values: (p) => [
          { label: "vₓ vật ném", value: (p.v0 ?? 10).toFixed(1), unit: "m/s" },
          { label: "v_y ban đầu", value: "0", unit: "m/s" },
          { label: "Độ cao h", value: (p.h ?? 8).toFixed(1), unit: "m" },
          { label: "vₓ vật rơi", value: "0", unit: "m/s" },
        ],
      },
      {
        key: "after-1s",
        label: "Sau 1 giây",
        description: "Theo phương ngang vật chuyển động đều, theo phương thẳng đứng vật rơi nhanh dần đều.",
        atTime: () => 1,
        values: (p) => {
          const h = p.h ?? 8;
          const v0 = p.v0 ?? 10;
          const g = p.g ?? 9.8;
          return [
            { label: "x = v₀t", value: v0.toFixed(2), unit: "m" },
            { label: "s_y = ½gt²", value: Math.min(h, verticalDrop(1, g)).toFixed(2), unit: "m" },
            { label: "v_y = gt", value: g.toFixed(2), unit: "m/s" },
            { label: "Chênh lệch độ cao", value: "0", unit: "m" },
          ];
        },
      },
      {
        key: "landing",
        label: "Lúc chạm đất",
        description: "Thời gian rơi chỉ phụ thuộc độ cao h và g; vận tốc ngang chỉ quyết định tầm xa.",
        atTime: (p) => fallTime(p.h ?? 8, p.g ?? 9.8),
        values: (p) => {
          const h = p.h ?? 8;
          const v0 = p.v0 ?? 10;
          const g = p.g ?? 9.8;
          const t = fallTime(h, g);
          return [
            { label: "Thời gian rơi", value: t.toFixed(2), unit: "s" },
            { label: "Tầm xa L = v₀t", value: (v0 * t).toFixed(2), unit: "m" },
            { label: "v_y chạm đất", value: (g * t).toFixed(2), unit: "m/s" },
            { label: "Hai vật chạm đất", value: "cùng lúc", unit: "" },
          ];
        },
      },
    ],
  },
};
