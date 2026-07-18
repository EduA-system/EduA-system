// Thư viện preset cơ học — bản gốc đã kiểm duyệt cho /mo-phong-hub.
// Preset cơ học chạy trên engine mechanics; các preset khác chọn engine theo `kind`.

import type { Preset } from "./types";
import { dinhLuat2Newton } from "./dinh-luat-2-newton";
import { roiTuDo } from "./roi-tu-do";
import { nemXien } from "./nem-xien";
import { conLacDon } from "./con-lac-don";
import { conLacLoXo } from "./con-lac-lo-xo";
import { daoDongTatDan } from "./dao-dong-tat-dan";
import { congHuongConLac } from "./cong-huong-con-lac";
import { matNghiengMaSat } from "./mat-nghieng-ma-sat";
import { vaChamDanHoi } from "./va-cham-dan-hoi";
import { vaChamMem } from "./va-cham-mem";
import { giaoThoaSongNuoc } from "./giao-thoa-song-nuoc";
import { songTrenDay } from "./song-tren-day";
import { songDung } from "./song-dung";
import { giaoThoaAnhSangDayDu } from "./giao-thoa-anh-sang-day-du";
import { nhiemDienDay } from "./nhiem-dien-day";
import { nhiemDienHut } from "./nhiem-dien-hut";
import { dienTruong2BanSongSong } from "./dien-truong-2-ban-song-song";
import { dienPhoHaiDienTich } from "./dien-pho-hai-dien-tich";
import { nutBacBat } from "./nut-bac-bat";
import { becquerelUraniumKinhAnh } from "./becquerel-uranium-kinh-anh";

export type { Preset, PresetParam, Domain } from "./types";

export const PRESETS: Preset[] = [
  dinhLuat2Newton,
  roiTuDo,
  nemXien,
  conLacDon,
  conLacLoXo,
  daoDongTatDan,
  congHuongConLac,
  matNghiengMaSat,
  vaChamDanHoi,
  vaChamMem,
  giaoThoaSongNuoc,
  songTrenDay,
  songDung,
  giaoThoaAnhSangDayDu,
  nhiemDienDay,
  nhiemDienHut,
  dienTruong2BanSongSong,
  dienPhoHaiDienTich,
  nutBacBat,
  becquerelUraniumKinhAnh,
];

export function getPreset(id: string): Preset | undefined {
  return PRESETS.find((p) => p.id === id);
}
