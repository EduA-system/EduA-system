// Thư viện preset cơ học — bản gốc đã kiểm duyệt cho /mo-phong-hub.
// Preset cơ học chạy trên engine mechanics; các preset khác chọn engine theo `kind`.

import type { Preset } from "./types";
import { dinhLuat2Newton } from "./dinh-luat-2-newton";
import { dinhLuat3Newton } from "./dinh-luat-3-newton";
import { lucTuongTacHaiXe } from "./luc-tuong-tac-hai-xe";
import { doPTBangLucKe } from "./do-p-t-bang-luc-ke";
import { quyTacMoment } from "./quy-tac-moment";
import { quyTacMomentDiaTron } from "./quy-tac-moment-dia-tron";
import { tongHopLucDongQuy } from "./tong-hop-luc-dong-quy";
import { phanTichLuc } from "./phan-tich-luc";
import { tongHopHaiLucCungPhuong } from "./tong-hop-hai-luc-cung-phuong";
import { roiTuDo } from "./roi-tu-do";
import { nemXien } from "./nem-xien";
import { nemNgang } from "./nem-ngang";
import { mangCongGalilei } from "./mang-cong-galilei";
import { dongNangTheNang } from "./dong-nang-the-nang";
import { mangBaoToanCoNang } from "./mang-bao-toan-co-nang";
import { conLacDon } from "./con-lac-don";
import { baoToanCoNangConLac } from "./bao-toan-co-nang-con-lac";
import { dinhLuatHooke } from "./dinh-luat-hooke";
import { lucHuongTam } from "./luc-huong-tam";
import { conLacLoXo } from "./con-lac-lo-xo";
import { daoDongTatDan } from "./dao-dong-tat-dan";
import { congHuongConLac } from "./cong-huong-con-lac";
import { matNghiengMaSat } from "./mat-nghieng-ma-sat";
import { vaChamDanHoi } from "./va-cham-dan-hoi";
import { vaChamMem } from "./va-cham-mem";
import { ongNewton } from "./ong-newton-khong-khi";
import { giaoThoaSongNuoc } from "./giao-thoa-song-nuoc";
import { songTrenDay } from "./song-tren-day";
import { songDung } from "./song-dung";
import { giaoThoaAnhSangDayDu } from "./giao-thoa-anh-sang-day-du";
import { nhiemDienDay } from "./nhiem-dien-day";
import { nhiemDienHut } from "./nhiem-dien-hut";
import { dienTruong2BanSongSong } from "./dien-truong-2-ban-song-song";
import { dienPhoHaiDienTich } from "./dien-pho-hai-dien-tich";
import { tuongTacNamChamVaKimNamCham } from "./tuong-tac-nam-cham-va-kim-nam-cham";
import { tuongTacHaiTamKimLoaiMangDongDien } from "./tuong-tac-hai-tam-kim-loai-mang-dong-dien";
import { tuPho } from "./tu-pho";
import { camUngDienTu } from "./cam-ung-dien-tu";
import { bienThienDongDienBangBienTroKhoaK } from "./bien-thien-dong-dien-bang-bien-tro-khoa-k";
import { khungDayQuayTrongTuTruong } from "./khung-day-quay-trong-tu-truong";

export type { Preset, PresetParam, Domain } from "./types";

export const PRESETS: Preset[] = [
  dinhLuat2Newton,
  dinhLuat3Newton,
  lucTuongTacHaiXe,
  doPTBangLucKe,
  quyTacMoment,
  quyTacMomentDiaTron,
  tongHopLucDongQuy,
  phanTichLuc,
  tongHopHaiLucCungPhuong,
  roiTuDo,
  nemXien,
  nemNgang,
  mangCongGalilei,
  dongNangTheNang,
  mangBaoToanCoNang,
  conLacDon,
  baoToanCoNangConLac,
  dinhLuatHooke,
  lucHuongTam,
  conLacLoXo,
  daoDongTatDan,
  congHuongConLac,
  matNghiengMaSat,
  vaChamDanHoi,
  vaChamMem,
  ongNewton,
  giaoThoaSongNuoc,
  songTrenDay,
  songDung,
  giaoThoaAnhSangDayDu,
  nhiemDienDay,
  nhiemDienHut,
  dienTruong2BanSongSong,
  dienPhoHaiDienTich,
  tuongTacNamChamVaKimNamCham,
  tuongTacHaiTamKimLoaiMangDongDien,
  tuPho,
  camUngDienTu,
  bienThienDongDienBangBienTroKhoaK,
  khungDayQuayTrongTuTruong,
];

export function getPreset(id: string): Preset | undefined {
  return PRESETS.find((p) => p.id === id);
}
