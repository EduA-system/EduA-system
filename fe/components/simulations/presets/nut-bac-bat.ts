import type { Preset } from "./types";

export const nutBacBat: Preset = {
  id: "nut-bac-bat-noi-nang-thanh-cong",
  title: "Nút bấc bật: Nội năng chuyển thành công",
  domain: "Nhiệt & Khí", grade: 10,
  desc: "Đun nóng khí trong ống kín để quan sát nội năng, áp suất và công làm nút bấc bật lên.",
  objective: "Quan sát khí nhận nhiệt, tăng nội năng rồi thực hiện công: ΔU = Q − W.",
  sgkRef: "Vật lí 10 — Nội năng và định luật I nhiệt động lực học",
  params: [], applyParams: () => ({ bodies: [], forces: [], constraints: [] }),
};
