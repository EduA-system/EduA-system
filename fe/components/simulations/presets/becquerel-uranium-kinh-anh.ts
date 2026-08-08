import type { Preset } from "./types";

export const becquerelUraniumKinhAnh: Preset = {
  id: "becquerel-uranium-lam-den-kinh-anh",
  title: "Becquerel: Uranium làm đen kính ảnh",
  domain: "Hạt nhân", grade: 12,
  desc: "Tái hiện toàn bộ quá trình Becquerel phát hiện uranium tự phát bức xạ làm đen kính ảnh trong bóng tối.",
  objective: "Phân biệt bức xạ uranium với ánh sáng và quan sát ảnh ẩn chỉ hiện rõ sau khi tráng.",
  sgkRef: "Vật lí 12 — Hiện tượng phóng xạ",
  params: [], applyParams: () => ({ bodies: [], forces: [], constraints: [] }),
};
