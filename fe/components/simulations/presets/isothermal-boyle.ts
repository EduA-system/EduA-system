import type { IsothermalBoylePreset } from "./types";

export const isothermalBoyle: IsothermalBoylePreset = {
  kind: "isothermal-boyle",
  id: "isothermal-boyle",
  title: "Quá trình đẳng nhiệt",
  domain: "Nhiệt & Khí",
  grade: 10,
  desc: "Quan sát mối liên hệ giữa áp suất và thể tích của khí khi nhiệt độ được giữ không đổi.",
  objective: "Quan sát khí trong xi lanh: khi V giảm thì P tăng, khi V tăng thì P giảm và pV luôn gần như không đổi.",
  sgkRef: "Vật lí 10 — Nhiệt học",
  params: [],
  applyParams: () => ({}),
};
