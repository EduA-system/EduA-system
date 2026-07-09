import type { Preset } from "./types";

export const matNghiengMaSat: Preset = {
  id: "mat-nghieng-ma-sat",
  title: "Mặt phẳng nghiêng + ma sát",
  domain: "Cơ học",
  grade: 10,
  desc: "Vật trượt trên mặt phẳng nghiêng, khảo sát ảnh hưởng của góc nghiêng và hệ số ma sát.",
  objective: "Phân tích lực trên mặt nghiêng: thành phần trọng lực kéo xuống vs ma sát giữ lại.",
  sgkRef: "Vật lí 10",
  params: [
    { key: "angle", label: "Góc nghiêng", unit: "°", min: 5, max: 60, step: 1, default: 30 },
    { key: "friction", label: "Hệ số ma sát", unit: "", min: 0, max: 1, step: 0.05, default: 0.3 },
    { key: "g", label: "Gia tốc trọng trường", unit: "m/s²", min: 1.6, max: 20, step: 0.1, default: 9.8 },
  ],
  applyParams: (p) => {
    const deg = p.angle ?? 30;
    const rad = (deg * Math.PI) / 180;
    const d = 2.5; // khoảng cách đặt vật lên cao theo mặt nghiêng
    const eps = 0.05; // nhô nhẹ trên mặt để vật rơi xuống tựa vào mặt
    const tx = Math.cos(rad), ty = Math.sin(rad); // tiếp tuyến mặt (lên dốc)
    const nx = -Math.sin(rad), ny = Math.cos(rad); // pháp tuyến hướng lên
    return {
      bodies: [
        { id: "block", x: d * tx + eps * nx, y: d * ty + eps * ny, vx: 0, vy: 0, mass: 1 },
      ],
      forces: [{ kind: "gravity", g: p.g ?? 9.8 }],
      constraints: [
        { kind: "surface", x: 0, y: 0, angle: deg, length: 10, friction: p.friction ?? 0.3 },
      ],
    };
  },
  analysis: {
    landmarks: [
      {
        key: "condition",
        label: "Điều kiện trượt & lực (lúc thả)",
        description: "So sánh thành phần trọng lực dọc mặt với ma sát nghỉ cực đại.",
        atTime: () => 0,
        values: (p) => {
          const th = ((p.angle ?? 30) * Math.PI) / 180;
          const mu = p.friction ?? 0.3;
          const g = p.g ?? 9.8;
          const gsin = g * Math.sin(th);
          const gmucos = mu * g * Math.cos(th);
          const slides = Math.tan(th) > mu;
          return [
            { label: "g·sinθ (kéo xuống)", value: gsin.toFixed(2), unit: "m/s²" },
            { label: "μg·cosθ (ma sát)", value: gmucos.toFixed(2), unit: "m/s²" },
            { label: "tanθ / μ", value: `${Math.tan(th).toFixed(2)} / ${mu.toFixed(2)}`, unit: "" },
            { label: "Trạng thái", value: slides ? "Trượt xuống" : "Đứng yên", unit: "" },
          ];
        },
      },
      {
        key: "after",
        label: "Sau 1.5 giây",
        description: "Nếu trượt: chuyển động nhanh dần đều dọc mặt nghiêng với a = g(sinθ − μcosθ).",
        atTime: () => 1.5,
        values: (p) => {
          const th = ((p.angle ?? 30) * Math.PI) / 180;
          const mu = p.friction ?? 0.3;
          const g = p.g ?? 9.8;
          const a = Math.max(0, g * (Math.sin(th) - mu * Math.cos(th)));
          return [
            { label: "Vận tốc dự đoán v = a·t", value: (a * 1.5).toFixed(2), unit: "m/s" },
            { label: "Quãng đường dọc dốc", value: (0.5 * a * 1.5 * 1.5).toFixed(2), unit: "m" },
          ];
        },
      },
    ],
  },
};
