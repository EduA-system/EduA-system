import type { CoulombTorsionBalancePreset } from "./types";

export const canXoanCoulomb: CoulombTorsionBalancePreset = {
  id: "can-xoan-coulomb",
  kind: "coulomb-torsion-balance",
  title: "Cân xoắn Coulomb – Đo lực tĩnh điện",
  domain: "Điện & Từ",
  grade: 11,
  desc: "Tích điện hai quả cầu, quan sát thanh treo xoắn và dùng góc cân bằng để khảo sát lực Coulomb theo điện tích và khoảng cách.",
  objective: "Quan sát cách lực điện làm quay thanh cân, cách dây bạc tạo mô-men phục hồi và kiểm chứng F ∝ |q₁q₂|/r².",
  sgkRef: "Vật lí 11 — Điện tích. Định luật Coulomb",
  params: [],
  applyParams: () => ({}),
};
