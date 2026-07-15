// Lưới raster (độ phân giải THẤP, renderer sẽ nội suy phóng lên) của trường
// sóng — mọi giá trị tính TRỰC TIẾP từ physics.ts, không có bước "vẽ vân
// trang trí" nào ở đây. NHÂN QUẢ: mỗi ô chỉ khác 0 khi sóng THỰC SỰ đã tới đó
// (xem physics.ts — causalEnvelope), không vẽ tràn khắp nơi ngay từ t=0.
//
// 3 VÙNG vật lý khác nhau theo x (khớp yêu cầu "sóng bị chặn bởi vách"):
//   x < xSingleSlit        → chưa có gì (trước rào chắn nguồn, không mô hình hoá)
//   xSingleSlit ≤ x < xSlits → TRƯỜNG 1 NGUỒN (từ S) — S1, S2 CHƯA tồn tại ở đây
//   x ≥ xSlits              → TRƯỜNG 2 NGUỒN (S1, S2, kế thừa pha/biên độ từ S)

import type { Point, WaveParams } from "./physics";
import {
  averageIntensityCausal,
  averageIntensityWithReveal,
  instantaneousFieldCausal,
  singleSlitEnvelope,
  singleSourceField,
  singleSourceIntensity,
  singleSourceIntensityWithReveal,
} from "./physics";
import type { Viewport } from "./coordinates";
import { canvasToWorld } from "./coordinates";

export type FieldGrid = {
  cols: number;
  rows: number;
  values: Float32Array; // giá trị THÔ chưa chuẩn hoá — cường độ (≥0) hoặc trường tức thời (có dấu)
};

/** Hệ số bao nhiễu xạ gần đúng theo góc từ TÂM khe kép tới điểm P — áp cho vùng trường gần khi bật singleSlitDiffraction (xem physics.ts, mục "PHẠM VI ĐÃ THU GỌN"). Renderer dùng lại hàm này cho MÀN để nhất quán. */
export function apertureFactor(p: Point, xSlits: number, params: WaveParams): number {
  if (!params.singleSlitDiffraction) return 1;
  const theta = Math.atan2(p.y, p.x - xSlits);
  return singleSlitEnvelope(theta, params.slitWidth, params.wavelength);
}

function buildGrid(cols: number, rows: number, vp: Viewport, valueAt: (p: Point) => number): FieldGrid {
  const values = new Float32Array(cols * rows);
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const px = ((col + 0.5) / cols) * vp.width;
      const py = ((row + 0.5) / rows) * vp.height;
      values[row * cols + col] = valueAt(canvasToWorld(px, py, vp));
    }
  }
  return { cols, rows, values };
}

export type ZoneGeometry = { source: Point; s1: Point; s2: Point; xSingleSlit: number; xSlits: number };

/**
 * Cường độ — Steady-state (propagation=null, đã ổn định, không nhân quả) hoặc
 * Propagation mode (propagation={t}, sáng dần theo thời gian tới thật sự).
 */
export function computeIntensityGrid(
  cols: number,
  rows: number,
  vp: Viewport,
  geo: ZoneGeometry,
  params: WaveParams,
  propagation: { t: number } | null,
): FieldGrid {
  return buildGrid(cols, rows, vp, (p) => {
    if (p.x < geo.xSingleSlit) return 0;
    if (p.x < geo.xSlits) {
      const I = propagation
        ? singleSourceIntensityWithReveal(p, geo.source, propagation.t, params)
        : singleSourceIntensity(p, geo.source, params);
      return I;
    }
    const I = propagation
      ? averageIntensityWithReveal(p, geo.source, geo.s1, geo.s2, propagation.t, params)
      : averageIntensityCausal(p, geo.source, geo.s1, geo.s2, params);
    return I * apertureFactor(p, geo.xSlits, params);
  });
}

/** Trường tức thời — LUÔN nhân quả (Propagation mode dùng trực tiếp; Steady-state gọi với t rất lớn để envelope luôn =1). */
export function computeInstantaneousFieldGrid(cols: number, rows: number, vp: Viewport, geo: ZoneGeometry, t: number, params: WaveParams): FieldGrid {
  return buildGrid(cols, rows, vp, (p) => {
    if (p.x < geo.xSingleSlit) return 0;
    if (p.x < geo.xSlits) return singleSourceField(p, geo.source, t, params);
    const u = instantaneousFieldCausal(p, geo.source, geo.s1, geo.s2, t, params);
    return u * Math.sqrt(apertureFactor(p, geo.xSlits, params));
  });
}

/** Giá trị tuyệt đối lớn nhất trong lưới (dùng chuẩn hoá màu nếu cần) — tối thiểu 1e-9 để tránh chia 0. */
export function maxAbs(values: Float32Array): number {
  let m = 1e-9;
  for (let i = 0; i < values.length; i++) m = Math.max(m, Math.abs(values[i]!));
  return m;
}
