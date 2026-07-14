// Thư viện thí nghiệm CHẤT LƯU TĨNH — tách khỏi kernel cơ học.
// Thêm sim = thêm 1 file + 1 dòng ở đây.

import type { FluidSim } from "./types";
import { apSuatChatLong } from "./ap-suat-chat-long";
import { binhThongNhau } from "./binh-thong-nhau";

export type { FluidSim, FluidReading, Domain } from "./types";

export const FLUID_SIMS: FluidSim[] = [apSuatChatLong, binhThongNhau];

export function getFluidSim(id: string): FluidSim | undefined {
  return FLUID_SIMS.find((s) => s.id === id);
}
