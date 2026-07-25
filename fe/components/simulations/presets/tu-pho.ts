import type { Preset } from "./types";
export const tuPho: Preset = {
 id:"tu-pho", kind:"iron-filings", title:"Từ phổ", domain:"Điện & Từ", grade:12,
 desc:"Quan sát các mạt sắt sắp xếp thành đường sức từ quanh nam châm thẳng.",
 objective:"Nhận biết hình dạng từ phổ và vùng từ trường mạnh quanh hai cực của nam châm thẳng.",
 sgkRef:"Khoa học tự nhiên 9 — Từ trường",
 params:[
  {key:"strength",label:"Độ mạnh nam châm",unit:"đv",min:.5,max:2.5,step:.1,default:1.2},
 ],
 applyParams:p=>({kind:"iron-filings" as const,magnetX:0,magnetY:0,strength:p.strength??1.2}),
 analysis:{landmarks:[{key:"tu-pho",label:"Đường sức từ",description:"Mạt sắt xoay theo hướng của từ trường; nơi mạt sắt dày và rõ hơn là nơi từ trường mạnh.",values:()=>[{label:"Nam châm",value:"Nam châm thẳng"},{label:"Kết luận",value:"Mạt sắt tạo thành từ phổ"}]}]},
};
