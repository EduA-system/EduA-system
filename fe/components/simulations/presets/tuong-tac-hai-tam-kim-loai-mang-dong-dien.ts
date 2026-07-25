import type { Preset } from "./types";
export const tuongTacHaiTamKimLoaiMangDongDien: Preset = {
  id: "tuong-tac-hai-tam-kim-loai-mang-dong-dien", kind: "parallel-current-sheets",
  title: "Tương tác giữa 2 tấm kim loại mang dòng điện", domain: "Điện & Từ", grade: 12,
  desc: "Hai tấm kim loại treo song song chịu lực từ khi có dòng điện chạy qua.",
  objective: "Quan sát lực từ giữa hai dòng điện song song: cùng chiều đẩy nhau, ngược chiều hút nhau.",
  sgkRef: "Vật lí 11 — Từ trường của dòng điện",
  params: [
    { key: "iLeft", label: "Dòng điện tấm trái", unit: "A", min: -40, max: 40, step: 1, default: 25 },
    { key: "iRight", label: "Dòng điện tấm phải", unit: "A", min: -40, max: 40, step: 1, default: 25 },
    { key: "separation", label: "Khoảng cách ban đầu", unit: "cm", min: 12, max: 50, step: 1, default: 22 },
    { key: "damping", label: "Cản dao động", unit: "đv", min: 0.002, max: 0.08, step: 0.002, default: 0.018 },
  ],
  quickPresets: [
    { label: "Cùng chiều — đẩy", params: { iLeft: 25, iRight: 25 } },
    { label: "Ngược chiều — hút", params: { iLeft: 25, iRight: -25 } },
    { label: "Không có dòng điện", params: { iLeft: 0, iRight: 0 } },
  ],
  applyParams: (p) => ({ kind: "parallel-current-sheets" as const, currentLeft: p.iLeft ?? 25, currentRight: p.iRight ?? 25, length: 1.5, separation: (p.separation ?? 22) / 100, mass: 0.018, suspensionStiffness: 0.055, damping: p.damping ?? 0.018 }),
  analysis: { landmarks: [{ key: "quy-tac-dong-dien-song-song", label: "Chiều lực từ", description: "Hai dòng điện song song cùng chiều đẩy nhau; ngược chiều hút nhau.", values: (p) => { const product = (p.iLeft ?? 25) * (p.iRight ?? 25); return [{ label: "Trạng thái", value: product > 0 ? "Đẩy nhau" : product < 0 ? "Hút nhau" : "Không có lực từ" }]; } }] },
};
