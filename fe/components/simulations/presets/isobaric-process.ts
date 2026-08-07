import type { IsobaricProcessPreset } from "./types";

export const isobaricProcess: IsobaricProcessPreset = {
  kind: "isobaric-process",
  id: "isobaric-process",
  title: "Quá trình đẳng áp p–V",
  domain: "Nhiệt & Khí",
  grade: 10,
  desc: "Gia nhiệt hoặc làm lạnh khí dưới piston có tải để khảo sát quá trình áp suất không đổi.",
  objective:
    "Quan sát piston chuyển động khi nhiệt độ thay đổi: p không đổi, V tỉ lệ thuận với nhiệt độ tuyệt đối và V/T không đổi.",
  sgkRef: "Vật lí 10 — Quá trình đẳng áp",
  params: [],
  applyParams: () => ({}),
};
