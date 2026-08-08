import { DEFAULT_RUTHERFORD_SCATTERING_PARAMS } from "../engines/rutherford-scattering/constants";
import type { RutherfordScatteringPreset } from "./types";

export const tanXaAlphaRutherford: RutherfordScatteringPreset = {
  kind: "rutherford-scattering",
  id: "tan-xa-alpha-rutherford",
  title: "Tán xạ α Rutherford",
  domain: "Hạt nhân",
  grade: 12,
  desc: "Chiếu chùm hạt α vào lá vàng mỏng, quan sát phân bố góc và các chớp trên màn ZnS để suy ra cấu trúc hạt nhân nguyên tử.",
  objective: "Giải thích vì sao đa số hạt α đi thẳng nhưng một số rất ít lệch góc lớn hoặc bật ngược, từ đó nhận biết hạt nhân nhỏ, đặc và mang điện dương.",
  sgkRef: "Vật lí 12 — Cấu tạo nguyên tử và vật lí hạt nhân",
  params: [],
  applyParams: (params) => ({ ...DEFAULT_RUTHERFORD_SCATTERING_PARAMS, ...params }),
};
