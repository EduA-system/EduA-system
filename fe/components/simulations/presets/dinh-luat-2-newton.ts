import type { Preset } from "./types";

// Dùng lực "applied" (F ngoài không đổi) — engines/mechanics đã hỗ trợ (kind "applied" trong
// engines/mechanics/types.ts, cộng lực trong engines/mechanics/forces.ts) nhưng chưa preset nào dùng tới.
// Vật nằm trên mặt sàn (surface, ma sát tuỳ chỉnh) và bị kéo ngang bằng lực không đổi F.

export const dinhLuat2Newton: Preset = {
  id: "dinh-luat-2-newton",
  title: "Định luật II Newton",
  domain: "Cơ học",
  grade: 10,
  desc: "Vật bị kéo bằng lực không đổi trên mặt sàn, khảo sát mối quan hệ giữa lực, khối lượng và gia tốc.",
  objective: "Kiểm chứng định luật II Newton: a = F/m khi mặt nhẵn, hoặc a = (F − μmg)/m khi có ma sát.",
  sgkRef: "Vật lí 10",
  params: [
    { key: "F", label: "Lực kéo", unit: "N", min: 1, max: 30, step: 1, default: 10 },
    { key: "m", label: "Khối lượng", unit: "kg", min: 0.5, max: 5, step: 0.1, default: 1 },
    { key: "friction", label: "Hệ số ma sát", unit: "", min: 0, max: 0.6, step: 0.05, default: 0 },
    { key: "g", label: "Gia tốc trọng trường", unit: "m/s²", min: 1.6, max: 20, step: 0.1, default: 9.8 },
  ],
  applyParams: (p) => {
    const F = p.F ?? 10;
    const m = p.m ?? 1;
    const friction = p.friction ?? 0;
    const g = p.g ?? 9.8;
    const eps = 0.05; // nhô nhẹ trên mặt để vật rơi xuống tựa vào sàn ngay từ đầu
    return {
      bodies: [{ id: "block", x: -4, y: eps, vx: 0, vy: 0, mass: m }],
      forces: [
        { kind: "gravity", g },
        { kind: "applied", body: "block", fx: F, fy: 0 },
      ],
      constraints: [{ kind: "surface", x: 0, y: 0, angle: 0, length: 400, friction }],
    };
  },
  analysis: {
    landmarks: [
      {
        key: "forces",
        label: "Phân tích lực (lúc thả)",
        description: "Hợp lực = F kéo − ma sát.",
        atTime: () => 0,
        values: (p) => {
          const F = p.F ?? 10;
          const m = p.m ?? 1;
          const mu = p.friction ?? 0;
          const g = p.g ?? 9.8;
          const fric = mu * m * g;
          const net = F - fric;
          return [
            { label: "Lực kéo F", value: F.toFixed(1), unit: "N" },
            { label: "Lực ma sát μmg", value: fric.toFixed(2), unit: "N" },
            { label: "Hợp lực", value: net.toFixed(2), unit: "N" },
            { label: "Gia tốc a = F_hl/m", value: (net > 0 ? net / m : 0).toFixed(2), unit: "m/s²" },
          ];
        },
      },
      {
        key: "after2s",
        label: "Sau 2 giây",
        description: "Chuyển động nhanh dần đều.",
        atTime: () => 2,
        values: (p) => {
          const F = p.F ?? 10;
          const m = p.m ?? 1;
          const mu = p.friction ?? 0;
          const g = p.g ?? 9.8;
          const net = F - mu * m * g;
          const a = net > 0 ? net / m : 0;
          return [
            { label: "Vận tốc dự đoán v = a·t", value: (a * 2).toFixed(2), unit: "m/s" },
            { label: "Quãng đường s = ½a·t²", value: (0.5 * a * 4).toFixed(2), unit: "m" },
          ];
        },
      },
    ],
  },
};
