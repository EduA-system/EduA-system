import type { PendulumResonancePreset } from "./types";

export const congHuongConLac: PendulumResonancePreset = {
  kind: "pendulum-resonance",
  id: "cong-huong-con-lac",
  title: "Cộng hưởng 5 con lắc trên thanh treo chung",
  domain: "Dao động & Sóng",
  grade: 12,
  desc: "Quan sát năng lượng truyền qua thanh treo chung và hiện tượng cộng hưởng giữa các con lắc có tần số riêng gần nhau.",
  objective: "Một con lắc dao động làm thanh treo rung rất nhẹ; con lắc có tần số riêng gần nguồn sẽ nhận năng lượng mạnh hơn.",
  sgkRef: "Vật lí 12 — Dao động cưỡng bức và hiện tượng cộng hưởng",
  params: [],
  applyParams: () => ({}),
};
