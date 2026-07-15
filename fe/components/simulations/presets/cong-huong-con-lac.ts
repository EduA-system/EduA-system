import type { Preset } from "./types";

// Cộng hưởng qua GHÉP LÒ XO giữa các con lắc — không dùng thanh treo cứng chung
// (engines/mechanics chưa có vật rắn quay/mô-men lực, xem engines/mechanics/types.ts) nên không mô
// phỏng được con lắc Barton kiểu "thanh ngang" kinh điển. Thay vào đó: 3 con lắc
// đơn treo độc lập (rod riêng từng cái), ghép năng lượng qua 2 lò xo YẾU nối
// bob1↔bob2 và bob2↔bob3. Khi L trùng nhau (cùng tần số riêng ω=√(g/L)), năng
// lượng truyền qua lại giữa hai con lắc lân cận theo nhịp phách (beat) — đúng
// hiện tượng cộng hưởng: truyền năng lượng cực đại chỉ khi tần số khớp nhau.
// restLength của lò xo tính từ VỊ TRÍ TREO THẲNG ĐỨNG (anchor + (0,−L)), không
// phải vị trí lệch ban đầu → lò xo không có lực khi hệ đứng yên, chỉ ghép dao động.

export const congHuongConLac: Preset = {
  id: "cong-huong-con-lac",
  title: "Cộng hưởng con lắc ghép",
  domain: "Dao động & Sóng",
  grade: 11,
  desc: "Ba con lắc đơn treo cạnh nhau, ghép nhẹ bằng lò xo; con lắc nào cùng chiều dài với con lắc bị kéo lệch sẽ nhận năng lượng mạnh nhất.",
  objective: "Quan sát hiện tượng cộng hưởng: năng lượng truyền mạnh nhất sang con lắc lân cận có cùng tần số riêng (cùng chiều dài L); con lắc lệch tần số hầu như không nhận năng lượng.",
  sgkRef: "Vật lí 11 — Dao động cưỡng bức. Hiện tượng cộng hưởng",
  params: [
    { key: "L1", label: "Chiều dài con lắc 1 (bị kéo lệch)", unit: "m", min: 0.4, max: 3, step: 0.1, default: 1.2 },
    { key: "L2", label: "Chiều dài con lắc 2 (bên cạnh)", unit: "m", min: 0.4, max: 3, step: 0.1, default: 1.2 },
    { key: "L3", label: "Chiều dài con lắc 3 (đối chứng)", unit: "m", min: 0.4, max: 3, step: 0.1, default: 0.7 },
    { key: "angle0", label: "Góc lệch ban đầu (con lắc 1)", unit: "°", min: 5, max: 45, step: 1, default: 25 },
    { key: "k", label: "Độ cứng lò xo ghép", unit: "N/m", min: 0.5, max: 5, step: 0.1, default: 1.5 },
    { key: "g", label: "Gia tốc trọng trường", unit: "m/s²", min: 1.6, max: 20, step: 0.1, default: 9.8 },
  ],
  applyParams: (p) => {
    const L1 = p.L1 ?? 1.2;
    const L2 = p.L2 ?? 1.2;
    const L3 = p.L3 ?? 0.7;
    const th0 = ((p.angle0 ?? 25) * Math.PI) / 180;
    const k = p.k ?? 1.5;
    const g = p.g ?? 9.8;

    const py = 3; // độ cao hàng trục treo
    const dx = 3.2; // khoảng cách ngang giữa các trục treo — dãn rộng để 3 con lắc tách rời rõ khi đung đưa
    const x1 = -dx, x2 = 0, x3 = dx;

    // restLength lò xo = khoảng cách giữa hai VỊ TRÍ TREO THẲNG ĐỨNG (nghỉ),
    // KHÔNG phải vị trí lệch ban đầu của bob1 → lò xo không có lực lúc đứng yên.
    const rest12 = Math.hypot(x2 - x1, L1 - L2);
    const rest23 = Math.hypot(x3 - x2, L2 - L3);

    return {
      bodies: [
        { id: "anchor1", x: x1, y: py, vx: 0, vy: 0, mass: 1, fixed: true },
        { id: "anchor2", x: x2, y: py, vx: 0, vy: 0, mass: 1, fixed: true },
        { id: "anchor3", x: x3, y: py, vx: 0, vy: 0, mass: 1, fixed: true },
        // bob1: con lắc bị kéo lệch góc th0 ban đầu — nguồn dao động.
        { id: "bob1", x: x1 + L1 * Math.sin(th0), y: py - L1 * Math.cos(th0), vx: 0, vy: 0, mass: 1 },
        // bob2, bob3: treo thẳng đứng, đứng yên ban đầu — nhận năng lượng qua lò xo.
        { id: "bob2", x: x2, y: py - L2, vx: 0, vy: 0, mass: 1 },
        { id: "bob3", x: x3, y: py - L3, vx: 0, vy: 0, mass: 1 },
      ],
      forces: [
        { kind: "gravity", g },
        { kind: "spring", a: "bob1", b: "bob2", k, restLength: rest12, damping: 0 },
        { kind: "spring", a: "bob2", b: "bob3", k, restLength: rest23, damping: 0 },
      ],
      constraints: [
        { kind: "rod", a: "anchor1", b: "bob1", length: L1 },
        { kind: "rod", a: "anchor2", b: "bob2", length: L2 },
        { kind: "rod", a: "anchor3", b: "bob3", length: L3 },
      ],
    };
  },
  // Đánh số cố định dưới mỗi con lắc — dễ phân biệt khi cả 3 cùng đung đưa,
  // giống quy ước sơ đồ Barton kinh điển (1)(2)(3)…
  bodyLabels: { bob1: "1", bob2: "2", bob3: "3" },
  analysis: {
    landmarks: [
      {
        key: "resonance",
        label: "Điều kiện cộng hưởng (lúc thả)",
        description: "Truyền năng lượng khi tần số khớp nhau.",
        atTime: () => 0,
        values: (p) => {
          const L1 = p.L1 ?? 1.2;
          const L2 = p.L2 ?? 1.2;
          const L3 = p.L3 ?? 0.7;
          const g = p.g ?? 9.8;
          return [
            { label: "ω₁ con lắc 1", value: Math.sqrt(g / L1).toFixed(2), unit: "rad/s" },
            { label: "ω₂ con lắc 2", value: Math.sqrt(g / L2).toFixed(2), unit: "rad/s" },
            { label: "ω₃ con lắc 3", value: Math.sqrt(g / L3).toFixed(2), unit: "rad/s" },
          ];
        },
      },
      {
        key: "beat-peak",
        label: "Đỉnh truyền năng lượng (khi L₁=L₂)",
        description: "Năng lượng dồn sang con lắc 2.",
        atTime: (p) => {
          const L1 = p.L1 ?? 1.2;
          const g = p.g ?? 9.8;
          const k = p.k ?? 1.5;
          const w1 = Math.sqrt(g / L1);
          const wa = Math.sqrt(g / L1 + 2 * k);
          const tBeat = Math.abs(wa - w1) > 1e-9 ? (2 * Math.PI) / (wa - w1) : 0;
          return tBeat / 2;
        },
        values: (p) => {
          const L1 = p.L1 ?? 1.2;
          const g = p.g ?? 9.8;
          const k = p.k ?? 1.5;
          const w1 = Math.sqrt(g / L1);
          const wa = Math.sqrt(g / L1 + 2 * k);
          const tBeat = Math.abs(wa - w1) > 1e-9 ? (2 * Math.PI) / (wa - w1) : Infinity;
          return [
            { label: "Nhịp phách T_beat", value: Number.isFinite(tBeat) ? tBeat.toFixed(1) : "—", unit: "s" },
            { label: "Thời điểm đỉnh T_beat/2", value: Number.isFinite(tBeat) ? (tBeat / 2).toFixed(1) : "—", unit: "s" },
          ];
        },
      },
    ],
  },
};
