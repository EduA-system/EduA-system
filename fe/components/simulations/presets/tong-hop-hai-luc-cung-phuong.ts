import type { Preset } from "./types";

// Hệ số quy đổi Newton → mét để VẼ vector (renderer chỉ vẽ theo world-units).
// 1 N ↦ 0.04 m: với lực tối đa 20 N mũi tên dài 0.8 m — đủ rõ, không tràn khung.
const N_TO_M = 0.04;

function values(p: Record<string, number>) {
  const F1 = p.F1 ?? 10; // lực bên trái (hướng −x)
  const F2 = p.F2 ?? 10; // lực bên phải (hướng +x)
  const m = p.m ?? 4;
  const net = F2 - F1; // hợp lực theo Ox: >0 sang phải, <0 sang trái
  const R = Math.abs(net);
  const a = net / m; // gia tốc (có dấu) theo định luật II Newton
  const state =
    net === 0 ? "Cân bằng — vật đứng yên" : net > 0 ? "Vật chuyển động sang phải (về phía F₂)" : "Vật chuyển động sang trái (về phía F₁)";
  return { F1, F2, m, net, R, a, state };
}

export const tongHopHaiLucCungPhuong: Preset = {
  id: "tong-hop-hai-luc-cung-phuong",
  title: "Tổng hợp hai lực cùng phương",
  domain: "Cơ học",
  grade: 10,
  desc: "Một vật chịu hai lực cùng phương, ngược chiều. Điều chỉnh độ lớn hai lực để quan sát hợp lực và chuyển động của vật.",
  objective:
    "Hiểu hợp lực của hai lực cùng phương ngược chiều là R = |F₂ − F₁|, hướng về phía lực lớn hơn. Khi hai lực bằng nhau vật cân bằng; khi lệch nhau, hợp lực gây gia tốc theo định luật II Newton a = R/m. Mô hình lí tưởng: bỏ qua trọng lực và ma sát.",
  sgkRef: "Vật lí 10",
  params: [
    { key: "F1", label: "Lực F₁ (sang trái)", unit: "N", min: 0, max: 20, step: 1, default: 10 },
    { key: "F2", label: "Lực F₂ (sang phải)", unit: "N", min: 0, max: 20, step: 1, default: 10 },
    { key: "m", label: "Khối lượng vật", unit: "kg", min: 1, max: 10, step: 0.5, default: 4 },
  ],
  applyParams: (p) => {
    const { F1, F2, m } = values(p);
    const y = 0.6; // vật "lơ lửng" trên đường nền y=0 để vector nằm ngang dễ nhìn
    return {
      bodies: [
        {
          id: "block",
          x: 0,
          y,
          vx: 0,
          vy: 0,
          mass: m,
          radius: 0.24,
          visual: { shape: "box", color: "#f472b6", label: "m" },
        },
      ],
      // Hai lực ngược chiều CÙNG đặt lên vật. Kernel tự cộng dồn thành hợp lực
      // rồi tích phân ra vận tốc/vị trí — preset KHÔNG tự viết công thức động học.
      forces: [
        { kind: "applied", body: "block", fx: -F1, fy: 0 },
        { kind: "applied", body: "block", fx: F2, fy: 0 },
      ],
      constraints: [],
      // Vector minh hoạ hai lực, gốc bám theo vật khi nó di chuyển (chỉ để VẼ).
      annotations: [
        { kind: "vector", anchor: "block", dx: -F1 * N_TO_M, dy: 0, color: "#60a5fa", label: `F₁ = ${F1} N` },
        { kind: "vector", anchor: "block", dx: F2 * N_TO_M, dy: 0, color: "#f59e0b", label: `F₂ = ${F2} N` },
      ],
      // Khung nhìn CỐ ĐỊNH: vật gia tốc chạy xa nên quỹ đạo không bị chặn — khai
      // báo khung để camera KHÔNG tự zoom lại mỗi lần đổi F₁/F₂. Đủ rộng để thấy
      // hai vector (lực tối đa 20 N ↦ 0.8 m) và một đoạn vật trôi ban đầu.
      view: { minX: -3.5, maxX: 3.5, minY: 0, maxY: 2.2 },
    };
  },
  analysis: {
    landmarks: [
      {
        key: "two-forces",
        label: "Hai lực thành phần",
        description: "Hai lực cùng nằm trên phương ngang nhưng ngược chiều nhau: F₁ hướng sang trái, F₂ hướng sang phải.",
        atTime: () => 0,
        values: (p) => {
          const { F1, F2 } = values(p);
          return [
            { label: "F₁ (sang trái)", value: F1.toFixed(0), unit: "N" },
            { label: "F₂ (sang phải)", value: F2.toFixed(0), unit: "N" },
          ];
        },
      },
      {
        key: "resultant",
        label: "Hợp lực",
        description: "Hai lực cùng phương ngược chiều tổng hợp thành một lực duy nhất: R = |F₂ − F₁|, hướng về phía lực lớn hơn. Bằng nhau thì R = 0 (cân bằng).",
        atTime: () => 0,
        values: (p) => {
          const { R, net, state } = values(p);
          return [
            { label: "Hợp lực R = |F₂ − F₁|", value: R.toFixed(1), unit: "N" },
            { label: "Chiều hợp lực", value: net === 0 ? "—" : net > 0 ? "Sang phải" : "Sang trái", unit: "" },
            { label: "Trạng thái", value: state, unit: "" },
          ];
        },
      },
      {
        key: "acceleration",
        label: "Gia tốc (định luật II Newton)",
        description: "Hợp lực khác 0 gây ra gia tốc cùng chiều với hợp lực: a = R/m. Hai lực bằng nhau → hợp lực 0 → gia tốc 0.",
        atTime: () => 0,
        values: (p) => {
          const { R, m, a } = values(p);
          return [
            { label: "Hợp lực R", value: R.toFixed(1), unit: "N" },
            { label: "Khối lượng m", value: m.toFixed(1), unit: "kg" },
            { label: "Gia tốc a = R/m", value: Math.abs(a).toFixed(2), unit: "m/s²" },
          ];
        },
      },
      {
        key: "after2s",
        label: "Sau 2 giây",
        description: "Nếu hợp lực khác 0, vật chuyển động nhanh dần đều từ trạng thái nghỉ: v = a·t và quãng đường s = ½·a·t². Nếu cân bằng, vật vẫn đứng yên.",
        atTime: () => 2,
        values: (p) => {
          const { a } = values(p);
          const t = 2;
          return [
            { label: "Vận tốc v = a·t", value: Math.abs(a * t).toFixed(2), unit: "m/s" },
            { label: "Quãng đường s = ½a·t²", value: Math.abs(0.5 * a * t * t).toFixed(2), unit: "m" },
          ];
        },
      },
    ],
  },
};
