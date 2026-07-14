// Thư viện preset cơ học — bản gốc đã kiểm duyệt cho /mo-phong-hub.
// Tất cả chạy trên kernel Cơ học 2D (kernel/*.ts). Thêm preset = thêm 1 file + 1 dòng ở đây.

import type { Preset } from "./types";
import { dinhLuat2Newton } from "./dinh-luat-2-newton";
import { lucTuongTacHaiXe } from "./luc-tuong-tac-hai-xe";
import { doPTBangLucKe } from "./do-p-t-bang-luc-ke";
import { quyTacMoment } from "./quy-tac-moment";
import { tongHopLucDongQuy } from "./tong-hop-luc-dong-quy";
import { lucCanChatLuu } from "./luc-can-chat-luu";
import { tongHopHaiLucCungPhuong } from "./tong-hop-hai-luc-cung-phuong";
import { roiTuDo } from "./roi-tu-do";
import { nemXien } from "./nem-xien";
import { nemNgang } from "./nem-ngang";
import { mangCongGalilei } from "./mang-cong-galilei";
import { conLacDon } from "./con-lac-don";
import { conLacLoXo } from "./con-lac-lo-xo";
import { daoDongTatDan } from "./dao-dong-tat-dan";
import { congHuongConLac } from "./cong-huong-con-lac";
import { matNghiengMaSat } from "./mat-nghieng-ma-sat";
import { vaChamDanHoi } from "./va-cham-dan-hoi";
import { vaChamMem } from "./va-cham-mem";
import { ongNewtonKhongKhi } from "./ong-newton-khong-khi";
import { ongNewtonChanKhong } from "./ong-newton-chan-khong";

export type { Preset, PresetParam, Domain } from "./types";

export const PRESETS: Preset[] = [
  dinhLuat2Newton,
  lucTuongTacHaiXe,
  doPTBangLucKe,
  quyTacMoment,
  tongHopLucDongQuy,
  lucCanChatLuu,
  tongHopHaiLucCungPhuong,
  roiTuDo,
  nemXien,
  nemNgang,
  mangCongGalilei,
  conLacDon,
  conLacLoXo,
  daoDongTatDan,
  congHuongConLac,
  matNghiengMaSat,
  vaChamDanHoi,
  vaChamMem,
  ongNewtonKhongKhi,
  ongNewtonChanKhong,
];

export function getPreset(id: string): Preset | undefined {
  return PRESETS.find((p) => p.id === id);
}
