import type { BrownianPreset } from "./types";

export const brownianPollen: BrownianPreset = {
  kind: "brownian",
  id: "brownian-pollen",
  title: "Chuyển động Brown của hạt phấn hoa",
  domain: "Nhiệt & Khí",
  grade: 10,
  desc: "Quan sát quỹ đạo hỗn loạn của hạt phấn hoa do va chạm nhiệt của các phân tử nước.",
  objective: "Quan sát chuyển động Brown và liên hệ chuyển động vi mô của phân tử với sự khuếch tán của hạt.",
  sgkRef: "Vật lí 10 — Chuyển động nhiệt",
  params: [],
  applyParams: () => ({}),
};
