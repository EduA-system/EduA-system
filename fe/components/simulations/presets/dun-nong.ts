import type { HeatingCurvePreset } from "./types";

export const dunNong: HeatingCurvePreset = {
  kind: "heating-curve",
  id: "dun-nong-nhiet-do-thoi-gian",
  title: "Đun nóng và đồ thị nhiệt độ - thời gian",
  domain: "Nhiệt & Khí",
  grade: 10,
  desc: "Đun nóng một thỏi sắt trên bếp lửa và theo dõi nhiệt độ thay đổi theo thời gian.",
  objective: "Quan sát thỏi sắt nóng dần, chuyển từ xám sang đỏ khi nhận nhiệt từ ngọn lửa.",
  sgkRef: "Vật lí 10 — Nhiệt học",
  params: [],
  applyParams: () => ({}),
};
