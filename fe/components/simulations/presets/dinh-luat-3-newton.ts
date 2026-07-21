import type { Preset } from "./types";

const REST_LENGTH = 1.5;
const TRACK_Y = 0.28;

function values(p: Record<string, number>) {
  const mA = p.mA ?? 1;
  const mB = p.mB ?? 1;
  const k = p.k ?? 40;
  const compression = p.compression ?? 0.4;
  return { mA, mB, k, compression, force: k * compression };
}

export const dinhLuat3Newton: Preset = {
  id: "dinh-luat-3-newton",
  title: "Định luật III Newton",
  domain: "Cơ học",
  grade: 10,
  desc: "Quan sát một vật gắn lò xo áp lại gần một vật khác khi thả tay sẽ thấy hai vật đẩy nhau",
  objective: "Lò xo nén tác dụng lên hai vật hai lực cùng độ lớn, ngược chiều và đặt lên hai vật khác nhau.",
  sgkRef: "Vật lí 10 — Định luật III Newton",
  startPaused: true,
  params: [
    { key: "mA", label: "Khối lượng vật A", unit: "kg", min: 0.5, max: 8, step: 0.1, default: 1 },
    { key: "mB", label: "Khối lượng vật B", unit: "kg", min: 0.5, max: 8, step: 0.1, default: 1 },
    { key: "k", label: "Độ cứng lò xo", unit: "N/m", min: 10, max: 80, step: 1, default: 40 },
    { key: "compression", label: "Độ nén ban đầu", unit: "m", min: 0.15, max: 0.6, step: 0.05, default: 0.4 },
  ],
  bodyLabels: { "vat-a": "A", "vat-b": "B" },
  applyParams: (p) => {
    const { mA, mB, k, compression } = values(p);
    const initialLength = REST_LENGTH - compression;
    return {
      bodies: [
        { id: "vat-a", x: -initialLength / 2, y: TRACK_Y, vx: 0, vy: 0, mass: mA, radius: 0.24, visual: { shape: "box", color: "#60a5fa", label: "A", wheels: true } },
        { id: "vat-b", x: initialLength / 2, y: TRACK_Y, vx: 0, vy: 0, mass: mB, radius: 0.24, visual: { shape: "box", color: "#f59e0b", label: "B", wheels: true } },
      ],
      forces: [{ kind: "spring", a: "vat-a", b: "vat-b", k, restLength: REST_LENGTH, damping: 0, compressionOnly: true }],
      constraints: [{ kind: "surface", x: 0, y: 0, angle: 0, length: 400, friction: 0 }],
      annotations: [
        {
          kind: "springActionReaction",
          a: "vat-a",
          b: "vat-b",
          forceScale: 0.03,
          colorA: "#60a5fa",
          colorB: "#f59e0b",
          labelA: "F_B→A",
          labelB: "F_A→B",
        },
      ],
      view: { minX: -5, maxX: 5, minY: 0, maxY: 2.2 },
      // Keep the road and both carts above the shared zoom controls.
      groundPadding: 120,
    };
  },
  analysis: {
    landmarks: [
      {
        key: "compressed-spring",
        label: "Trước khi thả",
        description: "Lò xo đang nén nên sẵn sàng đẩy A sang trái và B sang phải. Hai vật vẫn đứng yên vì mô phỏng đang chờ nút Bắt đầu.",
        atTime: () => 0,
        values: (p) => {
          const { compression, force } = values(p);
          return [
            { label: "Độ nén Δℓ", value: compression.toFixed(2), unit: "m" },
            { label: "Lực đàn hồi k·Δℓ", value: force.toFixed(2), unit: "N" },
            { label: "Vận tốc A, B", value: "0", unit: "m/s" },
          ];
        },
      },
      {
        key: "action-reaction",
        label: "Cặp lực tương tác",
        description: "Khi nhả lò xo, lực B tác dụng lên A và lực A tác dụng lên B luôn bằng nhau về độ lớn, ngược chiều và cùng xuất hiện.",
        values: (p) => {
          const { force } = values(p);
          return [
            { label: "|F_B→A|", value: force.toFixed(2), unit: "N" },
            { label: "|F_A→B|", value: force.toFixed(2), unit: "N" },
            { label: "Quan hệ", value: "F_B→A = −F_A→B", unit: "" },
          ];
        },
      },
      {
        key: "different-accelerations",
        label: "Gia tốc của hai vật",
        description: "Lực tác dụng lên hai vật bằng nhau, nhưng gia tốc có thể khác nhau vì a = F/m. Vật nhẹ hơn tăng tốc nhiều hơn.",
        values: (p) => {
          const { mA, mB, force } = values(p);
          return [
            { label: "|a_A| ban đầu", value: (force / mA).toFixed(2), unit: "m/s²" },
            { label: "|a_B| ban đầu", value: (force / mB).toFixed(2), unit: "m/s²" },
            { label: "Kết luận", value: "Lực bằng nhau không đồng nghĩa gia tốc bằng nhau", unit: "" },
          ];
        },
      },
    ],
  },
};
