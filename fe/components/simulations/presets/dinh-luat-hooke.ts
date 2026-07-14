import type { Preset } from "./types";

const REST = 1.5; // chiều dài tự nhiên lò xo (m)
const ANCHOR_Y = 3; // độ cao điểm treo

function values(p: Record<string, number>) {
  const k = p.k ?? 100;
  const m = p.m ?? 0.5;
  const g = p.g ?? 9.8;
  const Fdh = m * g; // tại cân bằng lực đàn hồi cân bằng trọng lực
  const stretch = Fdh / k; // độ giãn Δℓ = mg/k
  return { k, m, g, Fdh, stretch };
}

export const dinhLuatHooke: Preset = {
  id: "dinh-luat-hooke",
  title: "Định luật Hooke — biến dạng lò xo",
  domain: "Cơ học",
  grade: 10,
  desc: "Treo quả cân vào lò xo thẳng đứng, đo độ giãn để khảo sát quan hệ giữa lực đàn hồi và độ biến dạng.",
  objective:
    "Hiểu định luật Hooke: trong giới hạn đàn hồi, lực đàn hồi tỉ lệ thuận với độ biến dạng Fđh = k·|Δℓ|. Tại vị trí cân bằng lực đàn hồi cân bằng trọng lực nên k·Δℓ = mg, từ đó đo được độ cứng k. Mô hình lò xo là tuyến tính lí tưởng — thực tế chỉ đúng trong giới hạn đàn hồi.",
  sgkRef: "Vật lí 10 — Bài 33",
  params: [
    { key: "k", label: "Độ cứng lò xo", unit: "N/m", min: 20, max: 300, step: 5, default: 100 },
    { key: "m", label: "Khối lượng quả cân", unit: "kg", min: 0.1, max: 3, step: 0.1, default: 0.5 },
    { key: "g", label: "Gia tốc trọng trường", unit: "m/s²", min: 1.6, max: 20, step: 0.1, default: 9.8 },
  ],
  applyParams: (p) => {
    const { k, m, g } = values(p);
    // Thả quả cân ngay tại đầu lò xo tự nhiên (chưa giãn) → nó tự rơi và dao
    // động tắt dần quanh vị trí cân bằng Δℓ = mg/k rồi dừng lại để đo. Damping
    // vừa phải để ổn định nhanh mà không phá vật lý (chỉ tắt dần, đúng cân bằng).
    const naturalEndY = ANCHOR_Y - REST;
    return {
      bodies: [
        { id: "moc", x: 0, y: ANCHOR_Y, vx: 0, vy: 0, mass: 1, fixed: true },
        {
          id: "qua-can",
          x: 0,
          y: naturalEndY,
          vx: 0,
          vy: 0,
          mass: m,
          radius: 0.18,
          visual: { shape: "box", color: "#f472b6", label: "m" },
        },
      ],
      forces: [
        { kind: "gravity", g },
        { kind: "spring", a: "moc", b: "qua-can", k, restLength: REST, damping: 3 },
      ],
      constraints: [],
      // Hai vector ĐỘNG bám lò xo — độ dài tính lại mỗi frame theo Δℓ thực (đúng
      // định luật Hooke). Renderer đọc k/restLength của chính spring trên để tính
      // Δℓ và Fđh = k·Δℓ; preset chỉ khai báo hệ số quy đổi để vẽ, không tính hộ.
      //  - stretchScale khuếch đại Δℓ (mg/k cỡ vài cm → nhân lên cho thấy rõ).
      //  - forceScale quy đổi N → m cho mũi tên lực đàn hồi.
      annotations: [
        {
          kind: "springVector",
          a: "moc",
          b: "qua-can",
          stretchScale: 4,
          stretchColor: "#34d399",
          stretchLabel: "Δℓ",
          forceScale: 0.06,
          forceColor: "#f59e0b",
          forceLabel: "Fđh",
        },
      ],
      // Khung nhìn cố định: thấy điểm treo và vị trí giãn sâu nhất (đủ chỗ cho
      // độ giãn lớn khi k nhỏ / m lớn) → camera không giật khi kéo slider.
      view: { minX: -1.6, maxX: 1.6, minY: 0, maxY: ANCHOR_Y + 0.4 },
    };
  },
  analysis: {
    landmarks: [
      {
        key: "natural",
        label: "Lò xo tự nhiên (chưa treo)",
        description: "Khi chưa có lực tác dụng, lò xo giữ chiều dài tự nhiên ℓ₀; độ biến dạng bằng 0 nên lực đàn hồi bằng 0.",
        atTime: () => 0,
        values: () => [
          { label: "Chiều dài tự nhiên ℓ₀", value: (REST * 100).toFixed(0), unit: "cm" },
          { label: "Độ giãn Δℓ", value: "0", unit: "cm" },
          { label: "Lực đàn hồi Fđh", value: "0", unit: "N" },
        ],
      },
      {
        key: "equilibrium",
        label: "Vị trí cân bằng (đã treo cân)",
        description: "Quả cân đứng yên khi lực đàn hồi cân bằng trọng lực: k·Δℓ = mg. Đo độ giãn Δℓ và khối lượng m sẽ tính được độ cứng k = mg/Δℓ.",
        values: (p) => {
          const { k, Fdh, stretch } = values(p);
          return [
            { label: "Độ giãn Δℓ = mg/k", value: (stretch * 100).toFixed(2), unit: "cm" },
            { label: "Lực đàn hồi Fđh = mg", value: Fdh.toFixed(2), unit: "N" },
            { label: "Độ cứng k = Fđh/Δℓ", value: k.toFixed(0), unit: "N/m" },
          ];
        },
      },
      {
        key: "proportional",
        label: "Quan hệ Fđh — Δℓ",
        description: "Định luật Hooke: lực đàn hồi tỉ lệ thuận với độ giãn. Treo quả cân nặng gấp đôi thì lò xo giãn gấp đôi — đồ thị Fđh theo Δℓ là đường thẳng qua gốc toạ độ, hệ số góc chính là k.",
        values: (p) => {
          const { k, stretch } = values(p);
          const stretch2 = (2 * (p.m ?? 0.5) * (p.g ?? 9.8)) / k;
          return [
            { label: "Δℓ khi treo m", value: (stretch * 100).toFixed(2), unit: "cm" },
            { label: "Δℓ khi treo 2m", value: (stretch2 * 100).toFixed(2), unit: "cm" },
            { label: "Tỉ lệ", value: "Δℓ tăng gấp đôi khi F gấp đôi", unit: "" },
          ];
        },
      },
    ],
  },
};
