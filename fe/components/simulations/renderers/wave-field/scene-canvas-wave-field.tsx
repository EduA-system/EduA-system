"use client";

// Renderer Canvas THUẦN (không Konva) cho GIAO THOA Y-ÂNG ĐẦY ĐỦ — CÓ NHÂN
// QUẢ: sóng cần thời gian truyền tới mới xuất hiện (xem physics.ts). Heatmap
// cần thao tác pixel trực tiếp (ImageData) nên dùng CanvasRenderingContext2D
// thay vì dựng node theo Konva.
//
// BỐ CỤC: 3 mốc quan trọng (rào khe hẹp S, rào khe kép, màn) LUÔN nằm ở tỉ lệ
// cố định (8% / 36% / 76% bề rộng) khi bật "Visual x compression" — tránh màn
// dạt quá xa để lại vùng trống lớn. Nén CHỈ áp dụng ở chế độ Sơ đồ giáo dục
// (vẽ vector, remap từng điểm dễ dàng) — 2 chế độ heatmap (cường độ TB/trường
// tức thời) cần lưới đều để blit ImageData nên vẫn dùng tỉ lệ tuyến tính đều.
//
// NHÂN QUẢ: mọi vùng sáng/tối — heatmap, mặt sóng (cung), dải cường độ trên
// màn, biểu đồ I(y) — chỉ "có" sau khi sóng THỰC SỰ tới đó (causalEnvelope
// trong physics.ts), không vẽ tràn lan ngay từ khung hình đầu.

import { useEffect, useRef, useState } from "react";
import type { WaveFieldScene } from "../../engines/wave-field/types";
import {
  activationTime,
  averageIntensityCausal,
  averageIntensityWithReveal,
  distanceFromSlit,
  opticalPathToSlit,
  pathDifference,
  phaseDifference,
  slitPositions,
  totalOpticalPath,
  waveSpeed,
  type Point,
} from "../../engines/wave-field/physics";
import { buildXSegments, canvasToWorld, compressedX, fitViewport, inverseCompressedX, worldToCanvas, type Viewport, type XSegment } from "../../engines/wave-field/coordinates";
import { apertureFactor, computeIntensityGrid, computeInstantaneousFieldGrid, type FieldGrid, type ZoneGeometry } from "../../engines/wave-field/field-grid";
import { divergingColor, intensityColor } from "../../engines/wave-field/colormap";
import { useContainerSize } from "../../shared/use-container-size";
import { ZoomControls } from "../../shared/zoom-controls";

const GRID_COLS = 160;
const GRID_ROWS = 110;
const CHART_WIDTH = 96; // px dành cho biểu đồ I(y) cạnh màn

type Readout = { R1: number; R2: number; r1: number; r2: number; L1: number; L2: number; deltaL: number; deltaPhi: number; I: number };

function blitGrid(ctx: CanvasRenderingContext2D, grid: FieldGrid, targetWidth: number, targetHeight: number, colorAt: (v: number) => [number, number, number]) {
  const off = document.createElement("canvas");
  off.width = grid.cols;
  off.height = grid.rows;
  const octx = off.getContext("2d");
  if (!octx) return;
  const img = octx.createImageData(grid.cols, grid.rows);
  for (let i = 0; i < grid.values.length; i++) {
    const [r, g, b] = colorAt(grid.values[i]!);
    img.data[i * 4] = r;
    img.data[i * 4 + 1] = g;
    img.data[i * 4 + 2] = b;
    img.data[i * 4 + 3] = 255;
  }
  octx.putImageData(img, 0, 0);
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(off, 0, 0, grid.cols, grid.rows, 0, 0, targetWidth, targetHeight);
}

function drawBarrierBar(ctx: CanvasRenderingContext2D, toScreen: (x: number, y: number) => Point, x: number, halfHeight: number, gaps: [number, number][]) {
  const sorted = [...gaps].sort((a, b) => a[0] - b[0]);
  const bounds: number[] = [-halfHeight];
  for (const [c, hw] of sorted) bounds.push(c - hw, c + hw);
  bounds.push(halfHeight);
  ctx.strokeStyle = "#334155";
  ctx.lineWidth = 6;
  for (let i = 0; i < bounds.length; i += 2) {
    const y0 = bounds[i]!, y1 = bounds[i + 1]!;
    if (y1 <= y0) continue;
    const p0 = toScreen(x, y0), p1 = toScreen(x, y1);
    ctx.beginPath();
    ctx.moveTo(p0.x, p0.y);
    ctx.lineTo(p1.x, p1.y);
    ctx.stroke();
  }
}

function drawBarriers(ctx: CanvasRenderingContext2D, toScreen: (x: number, y: number) => Point, scene: WaveFieldScene, s1: Point, s2: Point, halfHeight: number) {
  const gapSingle = Math.max(scene.wavelength * 0.4, 4);
  drawBarrierBar(ctx, toScreen, scene.xSingleSlit, halfHeight, [[0, gapSingle]]);
  const gapDouble = Math.max(scene.slitWidth, 4) / 2;
  drawBarrierBar(ctx, toScreen, scene.xSlits, halfHeight, [
    [s1.y, gapDouble],
    [s2.y, gapDouble],
  ]);
}

function drawArrowHead(ctx: CanvasRenderingContext2D, tip: Point, from: Point) {
  const angle = Math.atan2(tip.y - from.y, tip.x - from.x);
  const len = 6;
  ctx.beginPath();
  ctx.moveTo(tip.x, tip.y);
  ctx.lineTo(tip.x - len * Math.cos(angle - Math.PI / 6), tip.y - len * Math.sin(angle - Math.PI / 6));
  ctx.moveTo(tip.x, tip.y);
  ctx.lineTo(tip.x - len * Math.cos(angle + Math.PI / 6), tip.y - len * Math.sin(angle + Math.PI / 6));
  ctx.stroke();
}

function drawDoubleArrow(ctx: CanvasRenderingContext2D, p0: Point, p1: Point) {
  ctx.beginPath();
  ctx.moveTo(p0.x, p0.y);
  ctx.lineTo(p1.x, p1.y);
  ctx.stroke();
  drawArrowHead(ctx, p0, p1);
  drawArrowHead(ctx, p1, p0);
}

function drawEducationalLabels(
  ctx: CanvasRenderingContext2D,
  toScreen: (x: number, y: number) => Point,
  scene: WaveFieldScene,
  s1: Point,
  s2: Point,
  yTop: number,
  yBottom: number,
  source: Point,
) {
  const xEdgeLeft = scene.xSingleSlit - Math.max(scene.wavelength * 3, 30);
  const xEdgeRight = scene.xSlits + scene.screenDistance + Math.max(scene.wavelength * 2, 20);

  ctx.strokeStyle = "#3f4d63";
  ctx.setLineDash([5, 4]);
  ctx.lineWidth = 1;
  const axL = toScreen(xEdgeLeft, 0), axR = toScreen(xEdgeRight, 0);
  ctx.beginPath();
  ctx.moveTo(axL.x, axL.y);
  ctx.lineTo(axR.x, axR.y);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.font = "bold 12px monospace";
  const sp = toScreen(scene.xSingleSlit, source.y);
  ctx.fillStyle = "#facc15";
  ctx.fillText("S", sp.x - 16, sp.y + 4);

  const s1p = toScreen(s1.x, s1.y), s2p = toScreen(s2.x, s2.y);
  ctx.fillStyle = "#fef08a";
  ctx.fillText("S1", s1p.x + 8, s1p.y + 4);
  ctx.fillText("S2", s2p.x + 8, s2p.y + 4);

  const op = toScreen(scene.xSlits, 0);
  ctx.fillStyle = "#94a3b8";
  ctx.font = "12px monospace";
  ctx.fillText("O", op.x - 6, op.y - 8);

  ctx.strokeStyle = "#34d399";
  ctx.fillStyle = "#34d399";
  ctx.lineWidth = 1.5;
  const aX = scene.xSlits - Math.max(scene.slitSeparation * 0.25, 14);
  drawDoubleArrow(ctx, toScreen(aX, s2.y), toScreen(aX, s1.y));
  const aLabelP = toScreen(aX, 0);
  ctx.font = "bold 12px monospace";
  ctx.fillText("a", aLabelP.x - 16, aLabelP.y + 4);

  const dY = yBottom + Math.max(scene.slitSeparation * 0.15, 10);
  ctx.strokeStyle = "#60a5fa";
  ctx.fillStyle = "#60a5fa";
  drawDoubleArrow(ctx, toScreen(scene.xSlits, dY), toScreen(scene.xSlits + scene.screenDistance, dY));
  const dMidP = toScreen(scene.xSlits + scene.screenDistance / 2, dY);
  ctx.fillText("D", dMidP.x - 4, dMidP.y - 8);
  void yTop;
}

/**
 * Cung sóng bán nguyệt (forward = +x), CHỈ vẽ phần x ≤ wallX — điểm nào vượt
 * quá tường (bị chặn) thì ngắt đoạn (moveTo lại) thay vì bỏ nguyên cả vòng,
 * để 2 cạnh trên/dưới cung (chưa chạm tường) vẫn tiếp tục hiện ra bình thường
 * thay vì biến mất sớm cùng lúc với phần giữa (điểm đã chạm tường).
 */
function drawSemicircleClippedAtWall(ctx: CanvasRenderingContext2D, toScreen: (x: number, y: number) => Point, center: Point, radius: number, wallX: number) {
  const samples = 40;
  let started = false;
  ctx.beginPath();
  for (let i = 0; i <= samples; i++) {
    const theta = -Math.PI / 2 + (Math.PI * i) / samples; // forward = +x (quy ước cố định của module này)
    const wx = center.x + radius * Math.cos(theta);
    const wy = center.y + radius * Math.sin(theta);
    if (wx <= wallX) {
      const sp = toScreen(wx, wy);
      if (!started) {
        ctx.moveTo(sp.x, sp.y);
        started = true;
      } else {
        ctx.lineTo(sp.x, sp.y);
      }
    } else {
      started = false;
    }
  }
  ctx.stroke();
}

/**
 * Vẽ các đỉnh sóng (cách nhau λ) của 1 nguồn — sóng tiếp tục lan ra (không
 * biến mất giữa chừng), chỉ bị CẮT ĐÚNG TẠI TƯỜNG (wallX, xem hàm trên) chứ
 * không ẩn cả cung theo bán kính như trước (bug cũ: cạnh trên/dưới — vốn
 * chưa chạm tường — cũng bị ẩn sớm cùng lúc với đỉnh cung). `ringSpan` chỉ
 * giới hạn SỐ VÒNG vẽ (hiệu năng), không phải nơi sóng "biến mất".
 */
function drawArcsFrom(ctx: CanvasRenderingContext2D, toScreen: (x: number, y: number) => Point, center: Point, reach: number, wavelength: number, ringSpan: number, wallX: number, color: string) {
  if (reach <= 0) return;
  const nMax = Math.floor(reach / wavelength);
  const nMin = Math.max(0, Math.ceil((reach - ringSpan) / wavelength));
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.4;
  ctx.globalAlpha = 0.7;
  for (let n = nMin; n <= nMax; n++) {
    const radius_n = reach - n * wavelength;
    if (radius_n <= 0 || radius_n > ringSpan) continue;
    drawSemicircleClippedAtWall(ctx, toScreen, center, radius_n, wallX);
  }
  ctx.globalAlpha = 1;
}

/**
 * Mặt sóng CÓ NHÂN QUẢ: S kích hoạt tại t=0 (mốc gốc). S1 kích hoạt tại
 * activationTimeS1 = distance(S,S1)/c — S2 tương tự. KHÔNG dùng chung 1 mốc
 * cho cả 3 nguồn (đúng yêu cầu mục 7). Cung từ S1/S2 bị CHẶN bởi màn (cắt
 * đúng tại đường màn) — không hiện tràn qua bên phải màn.
 */
function drawAnimatedArcs(ctx: CanvasRenderingContext2D, toScreen: (x: number, y: number) => Point, scene: WaveFieldScene, source: Point, s1: Point, s2: Point, t: number, halfHeight: number) {
  const v = waveSpeed(scene.wavelength, scene.frequency);
  const wallSlits = scene.xSlits;
  const ringSpanS = Math.hypot(scene.xSlits - scene.xSingleSlit, halfHeight);
  drawArcsFrom(ctx, toScreen, source, v * t, scene.wavelength, ringSpanS, wallSlits, "#f9a8d4");

  const tS1 = activationTime(source, s1, v);
  const tS2 = activationTime(source, s2, v);
  const wallScreen = scene.xSlits + scene.screenDistance;
  const ringSpanScreen = Math.hypot(scene.screenDistance, halfHeight);
  drawArcsFrom(ctx, toScreen, s1, v * (t - tS1), scene.wavelength, ringSpanScreen, wallScreen, "#f9a8d4");
  drawArcsFrom(ctx, toScreen, s2, v * (t - tS2), scene.wavelength, ringSpanScreen, wallScreen, "#f0abfc");
}

/** Cường độ tại 1 điểm màn — dùng ΔL CHÍNH XÁC (không xấp xỉ theta), nhân bao nhiễu xạ nếu bật. */
function screenIntensityAt(y: number, xScreen: number, source: Point, s1: Point, s2: Point, xSlits: number, scene: WaveFieldScene, t: number | null): number {
  const p: Point = { x: xScreen, y };
  const base = t == null ? averageIntensityCausal(p, source, s1, s2, scene) : averageIntensityWithReveal(p, source, s1, s2, t, scene);
  return base * apertureFactor(p, xSlits, scene);
}

function drawScreenIntensityStrip(
  ctx: CanvasRenderingContext2D,
  toScreen: (x: number, y: number) => Point,
  scene: WaveFieldScene,
  source: Point,
  s1: Point,
  s2: Point,
  yTop: number,
  yBottom: number,
  t: number | null,
) {
  const xScreen = scene.xSlits + scene.screenDistance;
  const pTop = toScreen(xScreen, yTop), pBottom = toScreen(xScreen, yBottom);
  ctx.strokeStyle = "#e2e8f0";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(pTop.x, pTop.y);
  ctx.lineTo(pBottom.x, pBottom.y);
  ctx.stroke();

  const samples = Math.max(60, Math.round(Math.abs(pBottom.y - pTop.y)));
  for (let i = 0; i < samples; i++) {
    const y = yTop + ((yBottom - yTop) * i) / (samples - 1);
    const I = screenIntensityAt(y, xScreen, source, s1, s2, scene.xSlits, scene, t);
    const [r, g, b] = intensityColor(I);
    const sp = toScreen(xScreen, y);
    ctx.strokeStyle = `rgb(${r},${g},${b})`;
    ctx.lineWidth = 9;
    ctx.beginPath();
    ctx.moveTo(sp.x - 5, sp.y);
    ctx.lineTo(sp.x + 5, sp.y);
    ctx.stroke();
  }

  ctx.fillStyle = "#e2e8f0";
  ctx.font = "11px monospace";
  ctx.fillText("Màn (E)", pTop.x + 8, pTop.y + 14);
}

function drawChart(
  ctx: CanvasRenderingContext2D,
  vpY: Viewport,
  scene: WaveFieldScene,
  source: Point,
  s1: Point,
  s2: Point,
  drawWidth: number,
  totalWidth: number,
  height: number,
  pY: number,
  t: number | null,
) {
  const chartX0 = drawWidth + 8;
  const chartW = Math.max(totalWidth - chartX0 - 8, 10);
  ctx.fillStyle = "#1e293b";
  ctx.fillRect(chartX0, 8, chartW, height - 16);
  ctx.strokeStyle = "#334155";
  ctx.lineWidth = 1;
  ctx.strokeRect(chartX0, 8, chartW, height - 16);

  const yTop = canvasToWorld(0, 0, vpY).y;
  const yBottom = canvasToWorld(0, vpY.height, vpY).y;
  const xScreen = scene.xSlits + scene.screenDistance;
  const samples = Math.max(60, Math.round(height));
  ctx.strokeStyle = "#fbbf24";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  for (let i = 0; i < samples; i++) {
    const y = yTop + ((yBottom - yTop) * i) / (samples - 1);
    const I = screenIntensityAt(y, xScreen, source, s1, s2, scene.xSlits, scene, t);
    const py = worldToCanvas(0, y, vpY).y;
    const px = chartX0 + I * chartW * 0.9 + 3;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.stroke();

  const pPy = worldToCanvas(0, pY, vpY).y;
  ctx.strokeStyle = "#e8724a";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(chartX0, pPy);
  ctx.lineTo(chartX0 + chartW, pPy);
  ctx.stroke();
  ctx.fillStyle = "#e8724a";
  ctx.beginPath();
  ctx.arc(chartX0 + 3, pPy, 3, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#8a8178";
  ctx.font = "10px monospace";
  ctx.fillText("I(y)", chartX0 + 4, 20);
}

function drawPAndRays(ctx: CanvasRenderingContext2D, toScreen: (x: number, y: number) => Point, source: Point, s1: Point, s2: Point, p: Point, showRays: boolean) {
  const pp = toScreen(p.x, p.y);
  if (showRays) {
    const s1p = toScreen(s1.x, s1.y), s2p = toScreen(s2.x, s2.y);
    ctx.strokeStyle = "#38bdf8";
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.moveTo(s1p.x, s1p.y);
    ctx.lineTo(pp.x, pp.y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(s2p.x, s2p.y);
    ctx.lineTo(pp.x, pp.y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "#38bdf8";
    ctx.font = "11px monospace";
    ctx.fillText("r1", (s1p.x + pp.x) / 2 + 4, (s1p.y + pp.y) / 2);
    ctx.fillText("r2", (s2p.x + pp.x) / 2 + 4, (s2p.y + pp.y) / 2);
  }
  ctx.fillStyle = "#e8724a";
  ctx.beginPath();
  ctx.arc(pp.x, pp.y, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 11px monospace";
  ctx.fillText("P", pp.x + 8, pp.y - 6);
  void source;
}

export function SceneCanvasWaveField({
  scene,
  running,
  resetSignal,
  onRunningChange,
  seekSeconds,
  seekToken,
  markLabel,
  speed = 1,
  onParamsChange,
}: {
  scene: WaveFieldScene;
  running: boolean;
  resetSignal: number;
  onRunningChange: (running: boolean) => void;
  seekSeconds?: number;
  seekToken?: number;
  markLabel?: string;
  speed?: number;
  // Kéo MÀN trên canvas → cập nhật lại screenDistance (D) ở tham số cha, để
  // ParamPanel/công thức luôn đồng bộ với vị trí kéo tay.
  onParamsChange?: (patch: Record<string, number>) => void;
}) {
  const { ref: containerRef, size } = useContainerSize<HTMLDivElement>();
  const transformRef = useRef<HTMLDivElement>(null);
  const staticRef = useRef<HTMLCanvasElement>(null);
  const dynamicRef = useRef<HTMLCanvasElement>(null);
  const runningRef = useRef(running);
  useEffect(() => {
    runningRef.current = running;
  }, [running]);
  const speedRef = useRef(speed);
  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);
  const onParamsChangeRef = useRef(onParamsChange);
  useEffect(() => {
    onParamsChangeRef.current = onParamsChange;
  }, [onParamsChange]);

  const pYRef = useRef(0);
  const dragTargetRef = useRef<"p" | "screen" | "pan" | null>(null);
  const [readout, setReadout] = useState<Readout | null>(null);

  // Zoom/pan CSS-level (thuần transform trên div bọc 2 canvas) — giống tinh
  // thần konva-zoom.ts (chỉ scale/dịch khung đã vẽ sẵn, không vẽ lại theo
  // zoom) nhưng áp cho Canvas thuần thay vì Konva.Stage. Pan bị khoá trong
  // đúng "vùng làm việc" (xem clampPan bên dưới) — kéo được, không lệch xa.
  const zoomRef = useRef(1);
  const panRef = useRef({ x: 0, y: 0 });
  const [zoomPct, setZoomPct] = useState(100);
  const zoomActionsRef = useRef<{ in: () => void; out: () => void; reset: () => void } | null>(null);

  useEffect(() => {
    pYRef.current = 0;
  }, [resetSignal]);

  useEffect(() => {
    const container = containerRef.current;
    const staticCanvas = staticRef.current;
    const dynamicCanvas = dynamicRef.current;
    const { width: w, height: hgt } = size;
    if (!container || !staticCanvas || !dynamicCanvas || !w || !hgt) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    for (const c of [staticCanvas, dynamicCanvas]) {
      c.width = Math.round(w * dpr);
      c.height = Math.round(hgt * dpr);
      c.style.width = `${w}px`;
      c.style.height = `${hgt}px`;
    }
    const sctx = staticCanvas.getContext("2d");
    const dctx = dynamicCanvas.getContext("2d");
    if (!sctx || !dctx) return;
    sctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    dctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const drawWidth = Math.max(w - CHART_WIDTH, 100);
    const source: Point = { x: scene.xSingleSlit, y: scene.sourceOffsetY };
    const { s1, s2 } = slitPositions(scene.xSlits, scene.slitSeparation);
    const geo: ZoneGeometry = { source, s1, s2, xSingleSlit: scene.xSingleSlit, xSlits: scene.xSlits };
    const xScreen = scene.xSlits + scene.screenDistance;
    const i0 = (scene.wavelength * scene.screenDistance) / scene.slitSeparation;
    // Biên khung nhìn nới rộng hơn (so với sát nội dung) — cho thêm khoảng
    // trống xung quanh để pan/zoom có chỗ khám phá, đồng bộ với các renderer
    // Konva khác (xem GRID_EXTENT_FACTOR trong renderers/wave/scene-konva-wave-2d.tsx…).
    const ySpan = Math.max(scene.slitSeparation * 1.5, i0 * 6);
    const xMax = xScreen + Math.max(40, scene.wavelength * 3);
    const xMin = scene.xSingleSlit - Math.max(55, scene.wavelength * 4);
    const vp = fitViewport(drawWidth, hgt, xMin, xMax, -ySpan, ySpan, 30);

    // ── Bố cục hiển thị: nén trục x (CHỈ ở chế độ Sơ đồ giáo dục — heatmap
    // cần lưới đều để blit ImageData) — 3 mốc luôn ở 8%/36%/76% bề rộng. ──
    const useCompression = scene.visualXCompression && scene.displayMode === "educational";
    const segments: XSegment[] | null = useCompression ? buildXSegments(scene.xSingleSlit, scene.xSlits, xScreen, drawWidth) : null;
    const toScreenX = (x: number): number => (segments ? compressedX(x, segments) : worldToCanvas(x, 0, vp).x);
    const toScreenY = (y: number): number => worldToCanvas(0, y, vp).y;
    const toScreen = (x: number, y: number): Point => ({ x: toScreenX(x), y: toScreenY(y) });

    let simTime = seekToken && seekSeconds != null && seekSeconds >= 0 ? seekSeconds : 0;
    if (seekToken && seekSeconds != null && seekSeconds >= 0) {
      runningRef.current = false;
      onRunningChange(false);
    }

    const ampNorm = 2 * scene.amplitude; // chuẩn hoá CỐ ĐỊNH theo lý thuyết (2A) — tránh singularity 1/√r gần nguồn khi bật suy giảm chi phối chuẩn hoá.
    const yTop = canvasToWorld(0, 0, vp).y;
    const yBottom = canvasToWorld(0, vp.height, vp).y;
    // Rào chắn kéo dài hết chiều cao khung nhìn (thay vì chiều dài cố định nhỏ)
    // — trông như tường thật, và cũng là biên để CẮT sóng khi nó lan tới (xem
    // drawArcsFrom/drawSemicircleClippedAtWall).
    const barrierHalfHeight = Math.max(Math.abs(yTop), Math.abs(yBottom)) * 1.02;

    const drawStatic = () => {
      sctx.fillStyle = "#0f172a";
      sctx.fillRect(0, 0, w, hgt);

      if (scene.displayMode === "average") {
        const grid = computeIntensityGrid(GRID_COLS, GRID_ROWS, vp, geo, scene, null);
        blitGrid(sctx, grid, drawWidth, hgt, (v) => intensityColor(Math.min(1, v / (ampNorm * ampNorm))));
      }

      drawBarriers(sctx, toScreen, scene, s1, s2, barrierHalfHeight);
      if (scene.displayMode === "educational") drawEducationalLabels(sctx, toScreen, scene, s1, s2, yTop, yBottom, source);

      // Propagation mode: màn/biểu đồ đổi theo t nên vẽ ở lớp DYNAMIC (mỗi khung
      // hình); Steady-state: tĩnh, vẽ 1 lần ở đây cho nhẹ.
      if (!scene.propagationMode) {
        drawScreenIntensityStrip(sctx, toScreen, scene, source, s1, s2, yTop, yBottom, null);
        drawChart(sctx, vp, scene, source, s1, s2, drawWidth, w, hgt, pYRef.current, null);
      }
    };

    const drawDynamic = (t: number) => {
      dctx.clearRect(0, 0, w, hgt);

      if (scene.displayMode === "instantaneous") {
        const grid = computeInstantaneousFieldGrid(GRID_COLS, GRID_ROWS, vp, geo, t, scene);
        blitGrid(dctx, grid, drawWidth, hgt, (v) => divergingColor(Math.max(-1, Math.min(1, v / ampNorm))));
      } else if (scene.displayMode === "educational") {
        drawAnimatedArcs(dctx, toScreen, scene, source, s1, s2, t, barrierHalfHeight);
      }

      if (scene.propagationMode) {
        drawScreenIntensityStrip(dctx, toScreen, scene, source, s1, s2, yTop, yBottom, t);
        drawChart(dctx, vp, scene, source, s1, s2, drawWidth, w, hgt, pYRef.current, t);
      }

      const p: Point = { x: xScreen, y: pYRef.current };
      const R1 = opticalPathToSlit(source, s1), R2 = opticalPathToSlit(source, s2);
      const r1 = distanceFromSlit(s1, p), r2 = distanceFromSlit(s2, p);
      const L1 = totalOpticalPath(R1, r1), L2 = totalOpticalPath(R2, r2);
      const deltaL = pathDifference(L1, L2);
      const deltaPhi = phaseDifference(deltaL, scene.wavelength);
      const I = scene.propagationMode ? averageIntensityWithReveal(p, source, s1, s2, t, scene) : averageIntensityCausal(p, source, s1, s2, scene);
      setReadoutThrottled({ R1, R2, r1, r2, L1, L2, deltaL, deltaPhi, I });

      drawPAndRays(dctx, toScreen, source, s1, s2, p, scene.displayMode === "educational");

      if (seekToken && markLabel) {
        dctx.fillStyle = "#e8724a";
        dctx.font = "bold 12px monospace";
        dctx.fillText(`t = ${t.toFixed(2)}s (${markLabel})`, 14, 20);
      }
    };

    let readoutTick = 0;
    const setReadoutThrottled = (r: Readout) => {
      if (readoutTick % 5 === 0) setReadout(r);
      readoutTick++;
    };

    drawStatic();
    drawDynamic(simTime);

    // ── Zoom/pan: transform CSS thuần trên div bọc 2 canvas (transformOrigin
    // 0 0) — KHÔNG vẽ lại nội dung, chỉ scale/dịch khung đã có sẵn, giống
    // konva-zoom.ts. Toạ độ con trỏ đo trên `container` (KHÔNG bị transform)
    // rồi quy đổi ngược về không gian canvas gốc qua panRef/zoomRef. ──
    const transformEl = transformRef.current;
    const applyTransform = () => {
      if (transformEl) transformEl.style.transform = `translate(${panRef.current.x}px, ${panRef.current.y}px) scale(${zoomRef.current})`;
    };
    const minZoom = 0.8, maxZoom = 6; // cho phép zoom out một chút để thấy rộng hơn khung gốc
    // Khoá pan trong đúng "vùng làm việc" = khung nội dung đã fit (không có
    // lề lưới thêm như các renderer Konva) — kéo được, nhưng không lệch xa ra
    // ngoài khung nhìn đã dựng. Ở đúng minZoom (chưa zoom in), không có phần
    // dư để pan (khoảng hợp lệ co về {0,0}) — mở rộng dần khi zoom in.
    const clampPan = (pan: Point, zoom: number): Point => ({
      x: Math.min(0, Math.max(w * (1 - zoom), pan.x)),
      y: Math.min(0, Math.max(hgt * (1 - zoom), pan.y)),
    });
    const applyZoom = (nextZoom: number, focal?: Point) => {
      const clamped = Math.min(maxZoom, Math.max(minZoom, nextZoom));
      const f = focal ?? { x: w / 2, y: hgt / 2 };
      const worldUnderFocal = { x: (f.x - panRef.current.x) / zoomRef.current, y: (f.y - panRef.current.y) / zoomRef.current };
      zoomRef.current = clamped;
      panRef.current = clampPan({ x: f.x - worldUnderFocal.x * clamped, y: f.y - worldUnderFocal.y * clamped }, clamped);
      applyTransform();
      setZoomPct(Math.round(clamped * 100));
    };
    zoomActionsRef.current = {
      in: () => applyZoom(zoomRef.current * 1.3),
      out: () => applyZoom(zoomRef.current / 1.3),
      reset: () => {
        zoomRef.current = 1;
        panRef.current = { x: 0, y: 0 };
        applyTransform();
        setZoomPct(100);
      },
    };
    applyTransform();

    // ── Kéo P (trên màn) hoặc kéo MÀN (đổi D) — phân biệt theo khoảng cách
    // con trỏ tới marker P hiện tại (ưu tiên) so với đường màn; nếu không
    // trúng cái nào thì kéo nền để PAN (đã khoá trong vùng làm việc). ──
    const getPointerCanvas = (evt: PointerEvent): Point => {
      const rect = container.getBoundingClientRect();
      const outer = { x: evt.clientX - rect.left, y: evt.clientY - rect.top };
      return { x: (outer.x - panRef.current.x) / zoomRef.current, y: (outer.y - panRef.current.y) / zoomRef.current };
    };
    const screenScreenX = toScreenX(xScreen);
    const panStart = { x: 0, y: 0, panX: 0, panY: 0 };
    const onPointerDown = (evt: PointerEvent) => {
      const pc = getPointerCanvas(evt);
      const pMarker = toScreen(xScreen, pYRef.current);
      const distToP = Math.hypot(pc.x - pMarker.x, pc.y - pMarker.y);
      dragTargetRef.current = distToP < 16 ? "p" : Math.abs(pc.x - screenScreenX) < 14 ? "screen" : "pan";
      dynamicCanvas.setPointerCapture(evt.pointerId);
      if (dragTargetRef.current === "p") {
        const world = canvasToWorld(pc.x, pc.y, vp);
        pYRef.current = Math.max(-ySpan, Math.min(ySpan, world.y));
        drawStatic();
      } else if (dragTargetRef.current === "pan") {
        panStart.x = evt.clientX;
        panStart.y = evt.clientY;
        panStart.panX = panRef.current.x;
        panStart.panY = panRef.current.y;
      }
    };
    const onPointerMove = (evt: PointerEvent) => {
      if (!dragTargetRef.current) return;
      if (dragTargetRef.current === "pan") {
        panRef.current = clampPan(
          { x: panStart.panX + (evt.clientX - panStart.x), y: panStart.panY + (evt.clientY - panStart.y) },
          zoomRef.current,
        );
        applyTransform();
        return;
      }
      const pc = getPointerCanvas(evt);
      if (dragTargetRef.current === "p") {
        const world = canvasToWorld(pc.x, pc.y, vp);
        pYRef.current = Math.max(-ySpan, Math.min(ySpan, world.y));
        drawStatic();
      } else if (dragTargetRef.current === "screen") {
        const physicalX = segments ? inverseCompressedX(pc.x, segments) : canvasToWorld(pc.x, pc.y, vp).x;
        const newD = Math.max(50, Math.min(2000, physicalX - scene.xSlits));
        onParamsChangeRef.current?.({ screenDistance: newD });
      }
    };
    const onPointerUp = (evt: PointerEvent) => {
      dragTargetRef.current = null;
      dynamicCanvas.releasePointerCapture(evt.pointerId);
    };
    const onWheel = (evt: WheelEvent) => {
      evt.preventDefault();
      const rect = container.getBoundingClientRect();
      const focal = { x: evt.clientX - rect.left, y: evt.clientY - rect.top };
      const factor = 1.08;
      applyZoom(evt.deltaY > 0 ? zoomRef.current / factor : zoomRef.current * factor, focal);
    };
    dynamicCanvas.addEventListener("pointerdown", onPointerDown);
    dynamicCanvas.addEventListener("pointermove", onPointerMove);
    dynamicCanvas.addEventListener("pointerup", onPointerUp);
    dynamicCanvas.addEventListener("wheel", onWheel, { passive: false });

    let raf = 0;
    let lastTime = performance.now();
    const animated = scene.displayMode === "instantaneous" || scene.displayMode === "educational" || scene.propagationMode;
    const loop = (now: number) => {
      const dtReal = Math.min((now - lastTime) / 1000, 1 / 30);
      lastTime = now;
      if (runningRef.current && animated) simTime += dtReal * speedRef.current;
      drawDynamic(simTime);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      dynamicCanvas.removeEventListener("pointerdown", onPointerDown);
      dynamicCanvas.removeEventListener("pointermove", onPointerMove);
      dynamicCanvas.removeEventListener("pointerup", onPointerUp);
      dynamicCanvas.removeEventListener("wheel", onWheel);
    };
  }, [scene, size, resetSignal, seekToken, seekSeconds, markLabel, onRunningChange, containerRef]);

  return (
    <div className="relative h-full w-full overflow-hidden rounded-lg bg-[#0f172a]">
      <div ref={containerRef} className="relative h-full w-full overflow-hidden">
        <div ref={transformRef} className="absolute inset-0" style={{ transformOrigin: "0 0" }}>
          <canvas ref={staticRef} className="absolute inset-0" />
          <canvas ref={dynamicRef} className="absolute inset-0 touch-none" />
        </div>
      </div>
      <ZoomControls
        percent={zoomPct}
        onZoomIn={() => zoomActionsRef.current?.in()}
        onZoomOut={() => zoomActionsRef.current?.out()}
      />
      {readout && (
        <div className="pointer-events-none absolute bottom-3 left-3 space-y-0.5 rounded-[8px] bg-black/50 px-3 py-2 font-mono text-[10.5px] leading-snug text-slate-200">
          <div>R1 = {readout.R1.toFixed(1)} · R2 = {readout.R2.toFixed(1)}</div>
          <div>r1 = {readout.r1.toFixed(1)} · r2 = {readout.r2.toFixed(1)}</div>
          <div>L1 = {readout.L1.toFixed(1)} · L2 = {readout.L2.toFixed(1)}</div>
          <div>
            ΔL = {readout.deltaL.toFixed(2)} · Δφ = {readout.deltaPhi.toFixed(2)} rad
          </div>
          <div>I(P) = {readout.I.toFixed(3)}</div>
        </div>
      )}
    </div>
  );
}
