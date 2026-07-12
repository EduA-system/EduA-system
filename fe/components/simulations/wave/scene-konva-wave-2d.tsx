"use client";

// Renderer 2D bằng Konva (imperative) cho GIAO THOA SÓNG NƯỚC — khác kernel Cơ
// học: không tích phân ODE, biên độ/pha là hàm giải tích của (x, y, t) nên
// "thời gian" ở đây chỉ là một số, nhảy tới t bất kỳ là tức thời (không cần
// "tích phân nhanh" như SceneKonva2D).
//
// KHÔNG GIAN: đối xứng quanh trung điểm 2 nguồn (không có "mặt đất" như cảnh
// Cơ học) — lưới phủ kín canvas như SceneKonva2D. Zoom (lăn chuột / nút +−)
// và kéo chỉ scale/dịch STAGE (không gian) — nền là CSS của container, KHÔNG
// phải Konva.Rect, nên khung canvas luôn phủ kín, không bị "trôi" khi zoom.
//
// CONTROLLED: chạy/dừng (`running`) và `resetSignal` do component CHA điều
// khiển, giống SceneKonva2D, để dùng chung toolbar + LandmarksPanel (mốc thời
// gian nhảy-tới hoạt động y hệt vì tại đây "nhảy tới t" không tốn gì cả).

import { useEffect, useRef, useState } from "react";
import Konva from "konva";
import type { WaveScene } from "./types";
import {
  arcPoints,
  barrierSegments,
  forwardAngleOf,
  fringeSpacing,
  hyperbolaBranch,
  hyperbolaScreenPoint,
  interferencePoints,
  maxMaximaOrder,
  maxMinimaOrder,
  ringRadiiAt,
  screenEndpoints,
  waveSpeed,
} from "./wave-math";
import { attachZoomPan, type ZoomActions } from "../shared/konva-zoom";
import { ZoomControls } from "../shared/zoom-controls";
import { useContainerSize } from "../shared/use-container-size";

const MAX_LABELED_ORDER = 3; // gắn nhãn chữ đầy đủ tối đa tới bậc này cho đỡ rối, vẫn vẽ hết đường thực có
// Lưới vẽ rộng hơn vùng nhìn ban đầu nhiều lần để còn phủ kín khi zoom out/pan
// (lưới vẽ TĨNH một lần, không tính lại theo viewport — xem konva-zoom.ts).
const GRID_EXTENT_FACTOR = 5;

type Vec2 = { x: number; y: number };

export function SceneKonvaWave2D({
  scene,
  running,
  resetSignal,
  onRunningChange,
  seekSeconds,
  seekToken,
  markLabel,
  speed = 1,
}: {
  scene: WaveScene;
  running: boolean;
  resetSignal: number;
  onRunningChange: (running: boolean) => void;
  // "Đi tới mốc thời gian t" — ở sóng trường, biên độ là hàm giải tích của t
  // nên nhảy tới t chỉ là gán lại biến, không cần tích phân như cảnh Cơ học.
  seekSeconds?: number;
  seekToken?: number;
  markLabel?: string;
  // Hệ số tốc độ mô phỏng (0.5 = chậm nửa, 2 = nhanh gấp đôi…) — nhân vào tốc
  // độ tiến của thời gian t, không đụng công thức sóng.
  speed?: number;
}) {
  // Đo kích thước THẬT của khung chứa (không cố định 520px) → canvas trải
  // kín toàn bộ không gian cha dành cho, kể cả khi thu/mở sidebar hay resize.
  const { ref: containerRef, size } = useContainerSize<HTMLDivElement>();
  const [zoomPct, setZoomPct] = useState(100);
  const runningRef = useRef(running);
  useEffect(() => {
    runningRef.current = running;
  }, [running]);
  const speedRef = useRef(speed);
  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);

  // Nút zoom nằm ngoài effect dựng cảnh (React JSX) → gọi qua ref vào hàm
  // thao tác trực tiếp trên Konva.Stage, tránh phải dựng lại toàn bộ cảnh.
  const zoomActionsRef = useRef<ZoomActions | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    const { width: w, height: hgt } = size;
    if (!container || !w || !hgt) return;
    const W = w;
    const H = hgt;

    const [s1, s2] = scene.sources;
    const v = waveSpeed(scene.wavelength, scene.frequency);
    const fieldRadius = scene.fieldRadius;
    const midX = (s1.x + s2.x) / 2, midY = (s1.y + s2.y) / 2;

    let simTime = seekToken && seekSeconds != null && seekSeconds >= 0 ? seekSeconds : 0;
    if (seekToken && seekSeconds != null && seekSeconds >= 0) {
      runningRef.current = false;
      onRunningChange(false);
    }

    // world→screen: mặc định đối xứng quanh trung điểm 2 nguồn (hình vuông
    // cạnh 2·fieldRadius, giống giao thoa sóng nước). CÓ MÀN (giao thoa ánh
    // sáng): hộp bao KHÔNG đối xứng — trải lệch hẳn về phía màn (D thường lớn
    // hơn nhiều so với bề rộng vân) — tính hộp bao world thật sự cần hiển thị
    // (khe/nguồn + màn) rồi fit khung nhìn theo đó, thay vì ép vào hình vuông
    // quanh trung điểm sẽ khiến màn dạt ra rìa, đa phần canvas trống trải.
    let camMinX = midX - fieldRadius, camMaxX = midX + fieldRadius;
    let camMinY = midY - fieldRadius, camMaxY = midY + fieldRadius;
    if (scene.screenDistance != null) {
      const dxs = s2.x - s1.x, dys = s2.y - s1.y;
      const dNorm = Math.hypot(dxs, dys) || 1;
      const vAxisX = -dys / dNorm, vAxisY = dxs / dNorm; // trục vuông góc trục nguồn (hướng ra màn)
      const screenPt = { x: midX + vAxisX * scene.screenDistance, y: midY + vAxisY * scene.screenDistance };
      const backPt = scene.singleSlit ?? { x: midX - vAxisX * fieldRadius * 0.15, y: midY - vAxisY * fieldRadius * 0.15 };
      const camMargin = fieldRadius * 0.12;
      camMinX = Math.min(backPt.x, screenPt.x, midX - fieldRadius * 0.3) - camMargin;
      camMaxX = Math.max(backPt.x, screenPt.x, midX + fieldRadius * 0.3) + camMargin;
      camMinY = Math.min(backPt.y, screenPt.y, midY - fieldRadius * 0.3) - camMargin;
      camMaxY = Math.max(backPt.y, screenPt.y, midY + fieldRadius * 0.3) + camMargin;
    }
    const worldW = Math.max(camMaxX - camMinX, 1);
    const worldH = Math.max(camMaxY - camMinY, 1);
    const camCx = (camMinX + camMaxX) / 2, camCy = (camMinY + camMaxY) / 2;
    const pad = 28;
    const scale = Math.min((W - 2 * pad) / worldW, (H - 2 * pad) / worldH);
    const toScreen = (wx: number, wy: number): Vec2 => ({
      x: W / 2 + (wx - camCx) * scale,
      y: H / 2 - (wy - camCy) * scale,
    });
    const toWorld = (sx: number, sy: number): Vec2 => ({ x: camCx + (sx - W / 2) / scale, y: camCy - (sy - H / 2) / scale });

    const stage = new Konva.Stage({ container, width: W, height: H });
    const layer = new Konva.Layer();
    stage.add(layer);

    // ── Lưới toạ độ phủ kín canvas (giống SceneKonva2D) — vẽ rộng hơn khung
    // nhìn ban đầu nhiều lần để vẫn phủ kín khi zoom out / kéo canvas. ──
    const wl = toWorld(0, 0).x, wr = toWorld(W, 0).x;
    const wb = toWorld(0, H).y, wt = toWorld(0, 0).y;
    const step = scale >= 22 ? 1 : scale >= 10 ? 2 : 5;
    const gx0 = camCx - GRID_EXTENT_FACTOR * (wr - wl) / 2, gx1 = camCx + GRID_EXTENT_FACTOR * (wr - wl) / 2;
    const gy0 = camCy - GRID_EXTENT_FACTOR * (wt - wb) / 2, gy1 = camCy + GRID_EXTENT_FACTOR * (wt - wb) / 2;
    for (let gx = Math.ceil(gx0 / step) * step; gx <= gx1; gx += step) {
      const x = toScreen(gx, 0).x;
      layer.add(new Konva.Line({ points: [x, toScreen(0, gy1).y, x, toScreen(0, gy0).y], stroke: "#1e293b", strokeWidth: 1, listening: false }));
    }
    for (let gy = Math.ceil(gy0 / step) * step; gy <= gy1; gy += step) {
      const y = toScreen(0, gy).y;
      layer.add(new Konva.Line({ points: [toScreen(gx0, 0).x, y, toScreen(gx1, 0).x, y], stroke: "#1e293b", strokeWidth: 1, listening: false }));
    }
    // Trục toạ độ qua trung điểm 2 nguồn + nhãn số quanh vùng nhìn ban đầu.
    const axisColor = "#3f4d63", labelColor = "#64748b";
    layer.add(new Konva.Line({ points: [toScreen(gx0, 0).x, toScreen(0, midY).y, toScreen(gx1, 0).x, toScreen(0, midY).y], stroke: axisColor, strokeWidth: 1.5, listening: false }));
    layer.add(new Konva.Line({ points: [toScreen(0, midY).x, toScreen(0, gy1).y, toScreen(0, midY).x, toScreen(0, gy0).y], stroke: axisColor, strokeWidth: 1.5, listening: false }));
    for (let gx = Math.ceil(wl / step) * step; gx <= wr; gx += step) {
      if (Math.abs(gx - midX) < 1e-9) continue;
      layer.add(new Konva.Text({ x: toScreen(gx, 0).x + 2, y: toScreen(0, midY).y + 4, text: `${(gx - midX).toFixed(step < 1 ? 1 : 0)}`, fontSize: 10, fill: labelColor, fontFamily: "monospace", listening: false }));
    }
    for (let gy = Math.ceil(wb / step) * step; gy <= wt; gy += step) {
      if (Math.abs(gy - midY) < 1e-9) continue;
      layer.add(new Konva.Text({ x: toScreen(0, midY).x + 4, y: toScreen(0, gy).y - 6, text: `${(gy - midY).toFixed(step < 1 ? 1 : 0)}`, fontSize: 10, fill: labelColor, fontFamily: "monospace", listening: false }));
    }
    const o = toScreen(midX, midY);
    layer.add(new Konva.Circle({ x: o.x, y: o.y, radius: 3, fill: "#94a3b8", listening: false }));
    layer.add(new Konva.Text({ x: o.x + 5, y: o.y - 17, text: "O", fontSize: 12, fill: "#94a3b8", fontFamily: "monospace", listening: false }));

    // ── Zoom (lăn chuột quanh con trỏ, hoặc nút +/−/reset) — chỉ scale + dịch
    // stage, KHÔNG vẽ lại nội dung → mượt, không tốn tính toán lại hypebol/điểm giao. ──
    zoomActionsRef.current = attachZoomPan(stage, { width: W, height: H, onZoomChange: setZoomPct });

    // ── Đường hypebol cực đại (đỏ, nét liền) / cực tiểu (xanh, nét đứt) — tĩnh,
    // không phụ thuộc t, vẽ 1 lần. Nhãn dùng KÝ HIỆU ngắn (mặc định CĐ/CT sóng
    // cơ; đổi thành VS/VT cho giao thoa ánh sáng qua scene.labels) thay vì chữ
    // đầy đủ cho đỡ rối canvas — giải thích đầy đủ ở bảng chú thích cạnh panel
    // Tham số (xem legend trong page.tsx). ──
    const maximaLabel = scene.labels?.maxima ?? "CĐ";
    const minimaLabel = scene.labels?.minima ?? "CT";
    const sourceDistance = Math.hypot(s2.x - s1.x, s2.y - s1.y);
    const maxOrder = maxMaximaOrder(sourceDistance, scene.wavelength);
    const minOrder = maxMinimaOrder(sourceDistance, scene.wavelength);
    const extent = fieldRadius * 1.3;

    const drawLocus = (deltaR: number, color: string, dash: number[] | undefined, width: number, label: string | null) => {
      const pts = hyperbolaBranch(deltaR, s1, s2, extent, 56);
      if (pts.length === 0) return;
      const screenPts = pts.map((p) => toScreen(p.x, p.y)).flatMap((p) => [p.x, p.y]);
      layer.add(
        new Konva.Line({
          points: screenPts,
          stroke: color,
          strokeWidth: width,
          dash,
          opacity: 0.85,
          lineCap: "round",
          listening: false,
        }),
      );
      if (label) {
        // Gắn nhãn ở đầu ngoài (điểm xa trung điểm nhất trong phần còn nằm trong field)
        // — nhãn ngắn, có nền (Konva.Label+Tag) cho dễ đọc trên nền lưới.
        const inField = pts.filter((p) => Math.hypot(p.x - midX, p.y - midY) <= fieldRadius);
        const outer = inField[inField.length - 1] ?? pts[pts.length - 1]!;
        const sp = toScreen(outer.x, outer.y);
        const onRight = sp.x >= W / 2;
        const badge = new Konva.Label({ x: onRight ? sp.x + 4 : sp.x - 4, y: sp.y - 10, listening: false });
        badge.add(new Konva.Tag({ fill: "#0f172a", stroke: color, strokeWidth: 1, cornerRadius: 3, opacity: 0.9 }));
        const text = new Konva.Text({ text: label, fontSize: 10.5, fontStyle: "bold", fill: color, fontFamily: "monospace", padding: 3 });
        badge.add(text);
        if (!onRight) badge.x(sp.x - 4 - text.width() - 6);
        layer.add(badge);
      }
    };

    // Bậc 0 (trung tâm) — không chia trái/phải vì đối xứng (đường trung trực duy nhất).
    drawLocus(0, "#f87171", undefined, 2.25, `${maximaLabel} 0`);
    for (let k = 1; k <= maxOrder; k++) {
      const label = k <= MAX_LABELED_ORDER ? `${maximaLabel} ${k}` : null;
      drawLocus(k * scene.wavelength, "#f87171", undefined, 1.5, label);
      drawLocus(-k * scene.wavelength, "#f87171", undefined, 1.5, label);
    }
    for (let m = 1; m <= minOrder; m++) {
      const label = m <= MAX_LABELED_ORDER ? `${minimaLabel} ${m}` : null;
      const deltaR = (m - 0.5) * scene.wavelength;
      drawLocus(deltaR, "#60a5fa", [6, 4], 1.5, label);
      drawLocus(-deltaR, "#60a5fa", [6, 4], 1.5, label);
    }

    // ── Giao thoa ánh sáng Y-âng (tuỳ chọn, khi có screenDistance): vẽ CHÙM
    // SÁNG thật (tam giác mờ) để thấy rõ ánh sáng lọt qua khe — không chỉ chấm
    // nguồn trôi nổi — cùng rào chắn CÓ KHE HỞ đúng vị trí S1, S2. Vùng 2 chùm
    // từ S1, S2 chồng lên nhau tự nhiên đậm hơn (2 lớp mờ cộng opacity) đúng
    // như "vùng hai chùm sáng giao nhau" trong sơ đồ SGK. ──
    const dxs = s2.x - s1.x, dys = s2.y - s1.y;
    const dNorm = Math.hypot(dxs, dys) || 1;
    const uAxisX = dxs / dNorm, uAxisY = dys / dNorm; // dọc trục nguồn (qua S1, S2)
    const vAxisX = -dys / dNorm, vAxisY = dxs / dNorm; // hướng ra màn (trục chính quang học)
    const localToWorld = (u: number, vv: number) => ({ x: midX + u * uAxisX + vv * vAxisX, y: midY + u * uAxisY + vv * vAxisY });

    // Bán kính vòng sóng phát ra từ khe hẹp S — chặn ngay tại mặt phẳng chứa
    // S1, S2 (không vẽ tràn qua rào chắn) để rõ ràng "sóng từ S tới đúng khe
    // kép rồi mới tạo sóng mới". null nếu preset không có khe hẹp S.
    let singleSlitCapRadius: number | null = null;

    if (scene.singleSlit) {
      // Chùm sáng từ S toả rộng, chiếu qua rào chắn 1 khe tới đúng vùng chứa S1, S2.
      const sV = (scene.singleSlit.x - midX) * vAxisX + (scene.singleSlit.y - midY) * vAxisY;
      singleSlitCapRadius = Math.abs(sV) * 1.02; // tới sát mặt phẳng khe kép (v=0)
      const barrierV = sV * 0.35; // rào chắn nằm giữa S và mặt phẳng S1,S2
      const half = sourceDistance * 0.9;
      const [edge0, edge1] = [localToWorld(-half, barrierV), localToWorld(half, barrierV)];
      const sSp = toScreen(scene.singleSlit.x, scene.singleSlit.y);
      const e0Sp = toScreen(edge0.x, edge0.y), e1Sp = toScreen(edge1.x, edge1.y);
      layer.add(
        new Konva.Line({ points: [sSp.x, sSp.y, e0Sp.x, e0Sp.y, e1Sp.x, e1Sp.y], closed: true, fill: "#f87171", opacity: 0.14, listening: false }),
      );
      // Rào chắn 1 khe hở chính giữa (trên trục chính quang học) — 2 nửa đối xứng.
      const barrierGap = sourceDistance * 0.22;
      const segments: [{ x: number; y: number }, { x: number; y: number }][] = [
        [localToWorld(-half, barrierV), localToWorld(-barrierGap, barrierV)],
        [localToWorld(barrierGap, barrierV), localToWorld(half, barrierV)],
      ];
      for (const [p0, p1] of segments) {
        const sp0 = toScreen(p0.x, p0.y), sp1 = toScreen(p1.x, p1.y);
        layer.add(new Konva.Line({ points: [sp0.x, sp0.y, sp1.x, sp1.y], stroke: "#334155", strokeWidth: 6, listening: false }));
      }
      layer.add(new Konva.Circle({ x: sSp.x, y: sSp.y, radius: 5, fill: "#facc15", listening: false }));
      layer.add(new Konva.Text({ x: sSp.x - 5, y: sSp.y + 9, text: "S", fontSize: 12, fontStyle: "bold", fill: "#facc15", fontFamily: "monospace", listening: false }));

      // Sóng phẳng (trước khi tới khe hẹp S) — vài đường thẳng song song, thuần
      // trang trí (tĩnh), khép kín chuỗi đầy đủ trong sơ đồ SGK: phẳng → bán
      // nguyệt qua khe hẹp → bán nguyệt qua khe kép → giao thoa.
      const planeHalfHeight = sourceDistance * 1.3;
      const planeSpan = Math.abs(sV) * 0.7;
      const planeCount = Math.max(3, Math.floor(planeSpan / scene.wavelength));
      for (let i = 1; i <= planeCount; i++) {
        const vv = sV - (i * planeSpan) / planeCount;
        const p0 = localToWorld(-planeHalfHeight, vv), p1 = localToWorld(planeHalfHeight, vv);
        const sp0 = toScreen(p0.x, p0.y), sp1 = toScreen(p1.x, p1.y);
        layer.add(new Konva.Line({ points: [sp0.x, sp0.y, sp1.x, sp1.y], stroke: "#f9a8d4", strokeWidth: 1.5, opacity: 0.5, listening: false }));
      }
    }

    if (scene.screenDistance != null) {
      const D = scene.screenDistance;
      const halfSpan = extent;
      const [scr0, scr1] = screenEndpoints(s1, s2, D, halfSpan);

      // Rào chắn khe kép — đúng vị trí S1, S2 (v=0), có 2 khe hở thật sự. Chiều
      // dài tỉ lệ theo khoảng cách 2 khe (không theo cả vùng nhìn) để rào chắn
      // nhìn rõ là "áp sát" S1, S2, không phải một bức tường xa tít tắp.
      const gapHalfWidth = sourceDistance * 0.07;
      for (const [p0, p1] of barrierSegments(s1, s2, sourceDistance * 1.8, gapHalfWidth)) {
        const sp0 = toScreen(p0.x, p0.y), sp1 = toScreen(p1.x, p1.y);
        layer.add(new Konva.Line({ points: [sp0.x, sp0.y, sp1.x, sp1.y], stroke: "#334155", strokeWidth: 6, listening: false }));
      }

      // 2 chùm sáng từ S1, S2 toả ra tới màn — chồng lên nhau tự nhiên đậm hơn
      // ở giữa, chính là "vùng 2 chùm sáng giao nhau" tạo ra vân giao thoa.
      const s1Sp = toScreen(s1.x, s1.y), s2Sp = toScreen(s2.x, s2.y);
      const scrP0 = toScreen(scr0.x, scr0.y), scrP1 = toScreen(scr1.x, scr1.y);
      layer.add(new Konva.Line({ points: [s1Sp.x, s1Sp.y, scrP0.x, scrP0.y, scrP1.x, scrP1.y], closed: true, fill: "#f87171", opacity: 0.13, listening: false }));
      layer.add(new Konva.Line({ points: [s2Sp.x, s2Sp.y, scrP0.x, scrP0.y, scrP1.x, scrP1.y], closed: true, fill: "#f87171", opacity: 0.13, listening: false }));

      layer.add(new Konva.Line({ points: [scrP0.x, scrP0.y, scrP1.x, scrP1.y], stroke: "#e2e8f0", strokeWidth: 3, listening: false }));
      layer.add(
        new Konva.Text({ x: (scrP0.x + scrP1.x) / 2 + 8, y: Math.min(scrP0.y, scrP1.y) - 4, text: "Màn (E)", fontSize: 11, fill: "#e2e8f0", fontFamily: "monospace", listening: false }),
      );

      // Vân sáng vẽ thành DẢI SÁNG (bar) dọc màn — nền canvas tối sẵn đóng vai
      // "vân tối" (không cần vẽ riêng), giống hệt ảnh chụp/sơ đồ SGK.
      const i0 = fringeSpacing(scene.wavelength, D, sourceDistance);
      const barHalf = Math.min(i0 * 0.32, extent * 0.06);
      const markFringe = (deltaR: number, color: string, label: string, bar: boolean) => {
        const p = hyperbolaScreenPoint(deltaR, s1, s2, D);
        if (!p) return;
        const sp = toScreen(p.x, p.y);
        if (bar) {
          const p0 = { x: p.x - barHalf * uAxisX, y: p.y - barHalf * uAxisY };
          const p1 = { x: p.x + barHalf * uAxisX, y: p.y + barHalf * uAxisY };
          const bp0 = toScreen(p0.x, p0.y), bp1 = toScreen(p1.x, p1.y);
          layer.add(new Konva.Line({ points: [bp0.x, bp0.y, bp1.x, bp1.y], stroke: color, strokeWidth: 7, opacity: 0.9, lineCap: "round", listening: false }));
        } else {
          layer.add(new Konva.Circle({ x: sp.x, y: sp.y, radius: 3, fill: color, opacity: 0.7, listening: false }));
        }
        const badge = new Konva.Label({ x: sp.x + 8, y: sp.y - 9, listening: false });
        badge.add(new Konva.Tag({ fill: "#0f172a", stroke: color, strokeWidth: 1, cornerRadius: 3, opacity: 0.9 }));
        badge.add(new Konva.Text({ text: label, fontSize: 10, fontStyle: "bold", fill: color, fontFamily: "monospace", padding: 2 }));
        layer.add(badge);
      };
      markFringe(0, "#fca5a5", `${maximaLabel} 0`, true);
      for (let k = 1; k <= maxOrder; k++) {
        markFringe(k * scene.wavelength, "#fca5a5", `${maximaLabel} ${k}`, true);
        markFringe(-k * scene.wavelength, "#fca5a5", `${maximaLabel} ${k}`, true);
      }
      for (let m = 1; m <= minOrder; m++) {
        const deltaR = (m - 0.5) * scene.wavelength;
        markFringe(deltaR, "#60a5fa", `${minimaLabel} ${m}`, false);
        markFringe(-deltaR, "#60a5fa", `${minimaLabel} ${m}`, false);
      }
    }

    // ── Nhóm động: sóng (đỉnh/đáy) + điểm giao nhau — vẽ lại mỗi khung hình.
    //
    // Giao thoa ánh sáng (có màn): sóng từ khe hẹp S và từ 2 khe S1, S2 vẽ
    // thành CUNG BÁN NGUYỆT (arcPoints, không phải đường tròn 360°) — đúng
    // hiện tượng nhiễu xạ thật: sóng chỉ toả về phía trước sau khi lọt qua
    // khe, không lan ngược ra sau rào chắn nó vừa xuyên qua. Đây chính là
    // chuỗi: S phát sóng bán nguyệt → lan tới khe kép → S1, S2 mỗi cái lại
    // phát sóng bán nguyệt mới → 2 họ bán nguyệt chồng lên nhau tạo giao thoa.
    //
    // Giao thoa sóng nước (không màn): giữ nguyên đường tròn 360° như cũ —
    // không có rào chắn nên sóng lan tự do mọi hướng, không đổi hành vi cũ. ──
    const dynamicGroup = new Konva.Group({ listening: false });
    layer.add(dynamicGroup);
    const isLightSetup = scene.screenDistance != null;
    const crestColor = isLightSetup ? "#f9a8d4" : "#64748b";
    const troughColor = isLightSetup ? "#f0abfc" : "#475569";
    const ringWidth = isLightSetup ? 1.6 : 1;
    const ringOpacity = isLightSetup ? 0.75 : 0.55;
    const forwardAngle = isLightSetup ? forwardAngleOf(s1, s2) : 0;
    const forwardCos = Math.cos(forwardAngle), forwardSin = Math.sin(forwardAngle);

    const addWave = (center: { x: number; y: number }, radius: number, color: string, dash: number[] | undefined, opacity: number) => {
      if (isLightSetup) {
        const pts = arcPoints(center, radius, forwardAngle)
          .map((p) => toScreen(p.x, p.y))
          .flatMap((p) => [p.x, p.y]);
        dynamicGroup.add(new Konva.Line({ points: pts, stroke: color, strokeWidth: ringWidth, dash, opacity, lineCap: "round", listening: false }));
      } else {
        const sp = toScreen(center.x, center.y);
        dynamicGroup.add(new Konva.Circle({ x: sp.x, y: sp.y, radius: radius * scale, stroke: color, strokeWidth: ringWidth, dash, opacity, listening: false }));
      }
    };

    const drawDynamic = (t: number) => {
      dynamicGroup.destroyChildren();

      if (scene.singleSlit && singleSlitCapRadius != null) {
        const { crest, trough } = ringRadiiAt(t, v, scene.wavelength, singleSlitCapRadius);
        for (const r of crest) addWave(scene.singleSlit, r, crestColor, undefined, ringOpacity);
        for (const r of trough) addWave(scene.singleSlit, r, troughColor, [3, 3], ringOpacity - 0.05);
      }

      for (const src of [s1, s2]) {
        const { crest, trough } = ringRadiiAt(t, v, scene.wavelength, fieldRadius);
        for (const r of crest) addWave(src, r, crestColor, undefined, ringOpacity);
        for (const r of trough) addWave(src, r, troughColor, [3, 3], ringOpacity - 0.05);
      }

      // Điểm giao nhau — nơi 2 vòng sóng hiện tại thật sự cắt nhau (chính là các
      // điểm "vẽ nên" 2 họ đường hypebol tĩnh ở trên theo thời gian). Giao thoa
      // ánh sáng: lọc bỏ điểm phía SAU rào chắn (chỉ là hệ quả của việc tính
      // trên đường tròn đầy đủ trong toán, không có thật vì sóng đã bị chặn).
      const pts = interferencePoints(s1, s2, t, v, scene.wavelength, fieldRadius);
      for (const p of pts) {
        if (isLightSetup) {
          const along = (p.x - midX) * forwardCos + (p.y - midY) * forwardSin;
          if (along < 0) continue;
        }
        const sp = toScreen(p.x, p.y);
        dynamicGroup.add(
          new Konva.Circle({
            x: sp.x,
            y: sp.y,
            radius: 3.2,
            fill: p.kind === "constructive" ? "#f87171" : "#60a5fa",
            shadowBlur: 4,
            shadowColor: p.kind === "constructive" ? "#f87171" : "#60a5fa",
            listening: false,
          }),
        );
      }
    };
    drawDynamic(simTime);

    // Nguồn sóng + nhãn S1/S2 — giao thoa ánh sáng: vàng-trắng phát sáng (đúng
    // "nguồn sáng" thay vì chấm hồng chỉ hợp với sóng cơ/sóng nước).
    const sourceColor = isLightSetup ? "#fef08a" : "#f472b6";
    scene.sources.forEach((src, i) => {
      const sp = toScreen(src.x, src.y);
      if (isLightSetup) {
        layer.add(new Konva.Circle({ x: sp.x, y: sp.y, radius: 10, fill: sourceColor, opacity: 0.25, listening: false })); // quầng sáng
      }
      layer.add(new Konva.Circle({ x: sp.x, y: sp.y, radius: 6, fill: sourceColor, shadowBlur: isLightSetup ? 10 : 6, shadowColor: isLightSetup ? sourceColor : "#000", listening: false }));
      layer.add(
        new Konva.Text({
          x: sp.x - 6,
          y: sp.y + 10,
          text: `S${i + 1}`,
          fontSize: 12,
          fontStyle: "bold",
          fill: sourceColor,
          fontFamily: "monospace",
          listening: false,
        }),
      );
    });

    if (seekToken && markLabel) {
      const badge = new Konva.Label({ x: 14, y: 14, listening: false });
      badge.add(new Konva.Tag({ fill: "#e8724a", cornerRadius: 4 }));
      badge.add(
        new Konva.Text({ text: `t = ${simTime.toFixed(2)}s (${markLabel})`, fontSize: 12, fontStyle: "bold", fill: "#ffffff", fontFamily: "monospace", padding: 4 }),
      );
      layer.add(badge);
    }

    const anim = new Konva.Animation((frame) => {
      if (runningRef.current && frame && frame.timeDiff > 0) {
        const dt = Math.min(frame.timeDiff / 1000, 1 / 30) * speedRef.current;
        simTime += dt;
        drawDynamic(simTime);
      }
    }, layer);
    anim.start();

    return () => {
      anim.stop();
      stage.destroy();
    };
  }, [scene, size, resetSignal, seekToken, seekSeconds, markLabel, onRunningChange, containerRef]);

  return (
    <div className="relative h-full w-full overflow-hidden rounded-lg bg-[#0f172a]">
      <div ref={containerRef} className="h-full w-full" />
      <ZoomControls
        percent={zoomPct}
        onZoomIn={() => zoomActionsRef.current?.in()}
        onZoomOut={() => zoomActionsRef.current?.out()}
        onReset={() => zoomActionsRef.current?.reset()}
      />
    </div>
  );
}
