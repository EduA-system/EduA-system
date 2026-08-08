// Thư viện preset cơ học — bản gốc đã kiểm duyệt cho /mo-phong-hub.
// Preset cơ học chạy trên engine mechanics; các preset khác chọn engine theo `kind`.

import type { Preset } from "./types";
import { dinhLuat2Newton } from "./dinh-luat-2-newton";
import { dinhLuat3Newton } from "./dinh-luat-3-newton";
import { doPTBangLucKe } from "./do-p-t-bang-luc-ke";
import { quyTacMoment } from "./quy-tac-moment";
import { quyTacMomentDiaTron } from "./quy-tac-moment-dia-tron";
import { phanTichLuc } from "./phan-tich-luc";
import { tongHopHaiLucCungPhuong } from "./tong-hop-hai-luc-cung-phuong";
import { roiTuDo } from "./roi-tu-do";
import { matNghiengMaSat } from "./mat-nghieng-ma-sat";
import { nemXien } from "./nem-xien";
import { nemNgang } from "./nem-ngang";
import { mangCongGalilei } from "./mang-cong-galilei";
import { dongNangTheNang } from "./dong-nang-the-nang";
import { conLacDon } from "./con-lac-don";
import { baoToanCoNangConLac } from "./bao-toan-co-nang-con-lac";
import { dinhLuatHooke } from "./dinh-luat-hooke";
import { lucHuongTam } from "./luc-huong-tam";
import { conLacLoXo } from "./con-lac-lo-xo";
import { daoDongTatDan } from "./dao-dong-tat-dan";
import { congHuongConLac } from "./cong-huong-con-lac";
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
import { nutBacBat } from "./nut-bac-bat";
import { becquerelUraniumKinhAnh } from "./becquerel-uranium-kinh-anh";
import { brownianPollen } from "./brownian";
import { dunNong } from "./dun-nong";
import { nguyenLyTruyenNhiet } from "./nguyen-ly-truyen-nhiet";
import { isothermalBoyle } from "./isothermal-boyle";
import { isobaricProcess } from "./isobaric-process";
import { buongSuongBlackett } from "./buong-suong-blackett";
import { doLechTiaAlphaBetaGamma } from "./do-lech-tia-alpha-beta-gamma";
import { canXoanCoulomb } from "./can-xoan-coulomb";
import { doTanSoBangDaoDongKi } from "./do-tan-so-bang-dao-dong-ki";
import { songTrenMatNuoc } from "./song-tren-mat-nuoc";
import { rutherfordBienDoiHatNhanNito } from "./rutherford-bien-doi-hat-nhan-nito";
import { tanXaAlphaRutherford } from "./tan-xa-alpha-rutherford";
import { chuongDien } from "./chuong-dien";
import { daySatDotGiay } from "./day-sat-dot-giay";
import { dacTrungVaBongDen } from "./dac-trung-va-bong-den";
import { doSuatDienDongPin } from "./do-suat-dien-dong-pin";
import { doNhietDungRiengCuaNuoc } from "./do-nhiet-dung-rieng-cua-nuoc";
import { doNhietNongChayRiengCuaNuocDa } from "./do-nhiet-nong-chay-rieng-cua-nuoc-da";
import { doNhietHoaHoiRiengCuaNuoc } from "./do-nhiet-hoa-hoi-rieng-cua-nuoc";

export type { Preset, PresetParam, ParamCalculation, Domain } from "./types";

export const PRESETS: Preset[] = [
  dinhLuat2Newton,
  dinhLuat3Newton,
  doPTBangLucKe,
  quyTacMoment,
  quyTacMomentDiaTron,
  phanTichLuc,
  tongHopHaiLucCungPhuong,
  roiTuDo,
  matNghiengMaSat,
  nemXien,
  nemNgang,
  mangCongGalilei,
  dongNangTheNang,
  conLacDon,
  baoToanCoNangConLac,
  dinhLuatHooke,
  lucHuongTam,
  conLacLoXo,
  daoDongTatDan,
  congHuongConLac,
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
  nutBacBat,
  becquerelUraniumKinhAnh,
  brownianPollen,
  dunNong,
  nguyenLyTruyenNhiet,
  isothermalBoyle,
  isobaricProcess,
  buongSuongBlackett,
  doLechTiaAlphaBetaGamma,
  canXoanCoulomb,
  doTanSoBangDaoDongKi,
  songTrenMatNuoc,
  rutherfordBienDoiHatNhanNito,
  tanXaAlphaRutherford,
  chuongDien,
  daySatDotGiay,
  dacTrungVaBongDen,
  doSuatDienDongPin,
  doNhietDungRiengCuaNuoc,
  doNhietNongChayRiengCuaNuocDa,
  doNhietHoaHoiRiengCuaNuoc,
];

export function getPreset(id: string): Preset | undefined {
  return PRESETS.find((p) => p.id === id);
}
