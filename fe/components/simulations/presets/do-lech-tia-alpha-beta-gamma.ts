import type { MagneticDeflectionPreset } from "./types";

export const doLechTiaAlphaBetaGamma: MagneticDeflectionPreset = {
  kind: "magnetic-deflection",
  id: "do-lech-tia-alpha-beta-gamma",
  title: "Độ lệch của tia α, β, γ trong từ trường",
  domain: "Điện & Từ",
  grade: 12,
  desc: "Quan sát tia α, β⁻ và γ đi qua từ trường đều: hai tia mang điện cong ngược phía, tia γ đi thẳng.",
  objective: "Liên hệ dấu điện tích, động lượng và cảm ứng từ với hướng cùng độ cong của quỹ đạo bức xạ.",
  sgkRef: "Vật lí 12 — Phóng xạ và lực Lorentz",
  params: [],
  applyParams: () => ({}),
};
