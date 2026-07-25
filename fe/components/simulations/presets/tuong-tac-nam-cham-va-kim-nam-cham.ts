import type { Preset } from "./types";

export const tuongTacNamChamVaKimNamCham: Preset = {
  id: "tuong-tac-nam-cham-va-kim-nam-cham",
  kind: "magnetism",
  title: "Tương tác giữa nam châm và kim nam châm",
  domain: "Điện & Từ",
  grade: 12,
  desc: "Kéo thanh nam châm đến gần để quan sát kim nam châm quay do lực hút, đẩy giữa các cực từ.",
  objective: "Nhận biết: khác cực hút nhau, cùng cực đẩy nhau; kim nam châm luôn quay theo hướng của từ trường.",
  sgkRef: "Khoa học tự nhiên 9 — Nam châm",
  params: [
    { key: "strength", label: "Độ mạnh của thanh nam châm", unit: "đv", min: 0.4, max: 2.5, step: 0.1, default: 1 },
    { key: "damping", label: "Ma sát ở trục quay", unit: "đv", min: 0.4, max: 5, step: 0.1, default: 1.7 },
  ],
  quickPresets: [
    { label: "Từ trường mạnh", params: { strength: 2.1 } },
    { label: "Kim quay chậm", params: { damping: 4.2 } },
  ],
  applyParams: (p) => ({
    kind: "magnetism" as const,
    compass: { x: 0, y: 0, length: 1.55, inertia: 0.52, damping: p.damping ?? 1.7 },
    barMagnet: { x: -3.15, y: 0.25, length: 1.9, angle: Math.PI, strength: p.strength ?? 1 },
  }),
  analysis: {
    landmarks: [{
      key: "quy-tac-cuc-tu",
      label: "Quy tắc tương tác cực từ",
      description: "Đưa đầu N của thanh lại gần đầu S của kim (hoặc S gần N) thì hút nhau. Đưa hai đầu cùng tên lại gần thì đẩy nhau; kim quay để đầu khác cực hướng về thanh.",
      values: () => [{ label: "Khác cực", value: "Hút nhau" }, { label: "Cùng cực", value: "Đẩy nhau" }],
    }],
  },
};
