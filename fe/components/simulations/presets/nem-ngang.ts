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
  desc: "So sánh một quả cầu được ném ngang và một quả cầu được thả rơi từ cùng độ cao.",
  objective: "Thấy rằng chuyển động ngang không làm thay đổi chuyển động rơi theo phương thẳng đứng: hai quả cầu chạm đất cùng lúc khi bỏ qua sức cản không khí.",
  sgkRef: "Vật lí 10",
  startPaused: true,
  paramGuide:
    "Mô phỏng so sánh quả cầu ném ngang với quả cầu thả rơi từ cùng độ cao. Cả hai có chuyển động thẳng đứng giống nhau nên chạm đất cùng lúc; vận tốc ngang chỉ làm quả cầu ném đi xa hơn theo phương ngang. Hãy thay đổi từng tham số bên dưới để quan sát thời gian rơi và tầm xa.",
  params: [
    {
      key: "h",
      label: "Độ cao ném",
      unit: "m",
      min: 2,
      max: 20,
      step: 0.5,
      default: 8,
      description: "Độ cao càng lớn thì cả hai quả cầu rơi càng lâu; quả cầu ném ngang vì thế đi được xa hơn.",
    },
    {
      key: "v0",
      label: "Vận tốc ngang",
      unit: "m/s",
      min: 2,
      max: 30,
      step: 0.5,
      default: 10,
      description: "Vận tốc ngang càng lớn thì tầm xa càng lớn, nhưng thời gian chạm đất của hai quả cầu không đổi.",
    },
    {
      key: "g",
      label: "Gia tốc trọng trường",
      unit: "m/s²",
      min: 1.6,
      max: 20,
      step: 0.1,
      default: 9.8,
      description: "g càng lớn thì cả hai quả cầu rơi càng nhanh, thời gian bay và tầm xa của quả cầu ném ngang đều giảm.",
    },
  ],
  applyParams: (p) => {
    const h = p.h ?? 8;
    const v0 = p.v0 ?? 10;
    const g = p.g ?? 9.8;
    return {
      bodies: [
        {
          id: "nem-ngang",
          x: 0,
          y: h,
          vx: v0,
          vy: 0,
          mass: 1,
          visual: { shape: "metalBall", metalTone: "brass" },
        },
        {
          id: "roi-tu-do",
          x: -1,
          y: h,
          vx: 0,
          vy: 0,
          mass: 1,
          visual: { shape: "metalBall", metalTone: "steel" },
        },
      ],
      forces: [{ kind: "gravity", g }],
      // Trong toàn bộ miền tham số, friction = 20 đủ triệt tiêu vận tốc ngang
      // ngay ở lần va chạm đầu tiên, nên hai quả cầu dừng tại điểm chạm đất.
      constraints: [{ kind: "surface", x: 0, y: 0, angle: 0, length: 400, friction: 20 }],
      disableDragging: true,
    };
  },
  annotations: (p) => {
    const h = p.h ?? 8;
    const standX = -0.5;
    const topY = h + 0.3;
    return [
      // Tripod feet: a dark under-stroke and a narrower chrome face add depth.
      { kind: "curve", x1: standX, y1: 0.18, cx1: -0.85, cy1: 0.17, cx2: -1.45, cy2: 0.12, x2: -1.9, y2: 0.08, color: "#0f172a", strokeWidth: 9 },
      { kind: "curve", x1: standX, y1: 0.18, cx1: -0.85, cy1: 0.17, cx2: -1.45, cy2: 0.12, x2: -1.9, y2: 0.08, color: "#94a3b8", strokeWidth: 4 },
      { kind: "curve", x1: standX, y1: 0.18, cx1: -0.15, cy1: 0.17, cx2: 0.45, cy2: 0.12, x2: 0.9, y2: 0.08, color: "#0f172a", strokeWidth: 9 },
      { kind: "curve", x1: standX, y1: 0.18, cx1: -0.15, cy1: 0.17, cx2: 0.45, cy2: 0.12, x2: 0.9, y2: 0.08, color: "#94a3b8", strokeWidth: 4 },

      // Upright pole with a slim highlight, similar to a real laboratory stand.
      { kind: "rect", x: standX, y: topY / 2, width: 0.2, height: topY, fill: "#111827", stroke: "#020617", strokeWidth: 2 },
      { kind: "rect", x: standX - 0.025, y: topY / 2, width: 0.07, height: topY - 0.08, fill: "#64748b", stroke: "#cbd5e1", strokeWidth: 1 },
      { kind: "rect", x: standX - 0.045, y: topY / 2, width: 0.018, height: topY - 0.14, fill: "#e2e8f0", stroke: "#e2e8f0", strokeWidth: 0 },
      { kind: "rect", x: standX, y: 0.18, width: 0.42, height: 0.22, fill: "#1e293b", stroke: "#94a3b8", strokeWidth: 2 },

      // Crossbar and the two short holders line both balls up at the same height.
      { kind: "rect", x: standX, y: topY, width: 1.9, height: 0.16, fill: "#334155", stroke: "#cbd5e1", strokeWidth: 2 },
      { kind: "rect", x: standX - 0.02, y: topY + 0.025, width: 1.75, height: 0.035, fill: "#e2e8f0", stroke: "#e2e8f0", strokeWidth: 0 },
      { kind: "rect", x: standX, y: topY, width: 0.38, height: 0.38, fill: "#1e293b", stroke: "#94a3b8", strokeWidth: 2 },
      { kind: "rect", x: -1, y: h + 0.12, width: 0.18, height: 0.35, fill: "#475569", stroke: "#cbd5e1", strokeWidth: 1.5 },
      { kind: "rect", x: 0, y: h + 0.12, width: 0.18, height: 0.35, fill: "#475569", stroke: "#cbd5e1", strokeWidth: 1.5 },
    ];
  },
  trackingLabels: {
    "nem-ngang": "Quả cầu ném ngang",
    "roi-tu-do": "Quả cầu thả rơi",
  },
  bodyTrails: {
    "nem-ngang": { color: "#d6a62b", width: 2.5, dash: [8, 7] },
    "roi-tu-do": { color: "#7dd3fc", width: 2.5, dash: [8, 7] },
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
