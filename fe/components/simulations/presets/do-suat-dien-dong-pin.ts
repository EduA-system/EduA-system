import type { EmfMeasurementPreset } from "./types";
export const doSuatDienDongPin: EmfMeasurementPreset = {
  kind: "emf-measurement",
  id: "do-suat-dien-dong-e-cua-pin",
  title: "Đo suất điện động E của pin",
  domain: "Điện & Từ",
  grade: 11,
  desc: "Đo điện áp không tải và điện áp mạch kín để xác định suất điện động của pin.",
  objective: "Sử dụng ampe kế và vôn kế để kiểm chứng hệ thức E = U + Ir.",
  sgkRef: "Vật lí 11 – Nguồn điện, suất điện động và điện trở trong",
  params: [],
  applyParams: () => ({}),
};
