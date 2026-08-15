"use client";

import { getSimulationFontFamily } from "@/components/simulations/shared/typography";

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
import type { WaveScene } from "../../engines/wave/types";
import {
  hyperbolaBranch,
  interferencePoints,
  maxMaximaOrder,
  maxMinimaOrder,
  ringRadiiAt,
  waveSpeed,
} from "../../engines/wave/wave-math";
import { attachZoomPan, type ZoomActions } from "../../shared/konva-zoom";
import { ZoomControls } from "../../shared/zoom-controls";
import { useContainerSize } from "../../shared/use-container-size";

const MAX_LABELED_ORDER = 3; // gắn nhãn chữ đầy đủ tối đa tới bậc này cho đỡ rối, vẫn vẽ hết đường thực có
// Lưới vẽ rộng hơn vùng nhìn ban đầu nhiều lần để còn phủ kín khi zoom out
// (lưới vẽ TĨNH một lần, không tính lại theo viewport — xem konva-zoom.ts).
// Đây cũng là "vùng làm việc" pan bị khoá trong đó (xem konva-zoom.ts).
const GRID_EXTENT_FACTOR = 7;

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

    // world→screen: đối xứng quanh trung điểm 2 nguồn (hình vuông cạnh 2·fieldRadius).
    const camMinX = midX - fieldRadius, camMaxX = midX + fieldRadius;
    const camMinY = midY - fieldRadius, camMaxY = midY + fieldRadius;
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
      layer.add(new Konva.Text({ x: toScreen(gx, 0).x + 2, y: toScreen(0, midY).y + 4, text: `${(gx - midX).toFixed(step < 1 ? 1 : 0)}`, fontSize: 10, fill: labelColor, fontFamily: getSimulationFontFamily(), listening: false }));
    }
    for (let gy = Math.ceil(wb / step) * step; gy <= wt; gy += step) {
      if (Math.abs(gy - midY) < 1e-9) continue;
      layer.add(new Konva.Text({ x: toScreen(0, midY).x + 4, y: toScreen(0, gy).y - 6, text: `${(gy - midY).toFixed(step < 1 ? 1 : 0)}`, fontSize: 10, fill: labelColor, fontFamily: getSimulationFontFamily(), listening: false }));
    }
    const o = toScreen(midX, midY);
    layer.add(new Konva.Circle({ x: o.x, y: o.y, radius: 3, fill: "#94a3b8", listening: false }));
    layer.add(new Konva.Text({ x: o.x + 5, y: o.y - 17, text: "O", fontSize: 12, fill: "#94a3b8", fontFamily: getSimulationFontFamily(), listening: false }));

    // ── Zoom (lăn chuột quanh con trỏ, hoặc nút +/−/reset) — chỉ scale + dịch
    // stage, KHÔNG vẽ lại nội dung → mượt, không tốn tính toán lại hypebol/điểm giao. ──
    zoomActionsRef.current = attachZoomPan(stage, { width: W, height: H, onZoomChange: setZoomPct, panExtentFactor: GRID_EXTENT_FACTOR });

    // ── Đường hypebol cực đại (đỏ, nét liền) / cực tiểu (xanh, nét đứt) — tĩnh,
    // không phụ thuộc t, vẽ 1 lần. Nhãn dùng KÝ HIỆU ngắn (CĐ/CT) thay vì chữ
    // đầy đủ cho đỡ rối canvas — giải thích đầy đủ ở bảng chú thích cạnh panel
    // Tham số (xem legend trong page.tsx). ──
    const maximaLabel = "CĐ";
    const minimaLabel = "CT";
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
        const text = new Konva.Text({ text: label, fontSize: 10.5, fontStyle: "normal", fill: color, fontFamily: getSimulationFontFamily(), padding: 3 });
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

    // ── Nhóm động: sóng (đỉnh/đáy) + điểm giao nhau — vẽ lại mỗi khung hình,
    // đường tròn 360° từ mỗi nguồn (không có rào chắn nên sóng lan tự do mọi
    // hướng). ──
    const dynamicGroup = new Konva.Group({ listening: false });
    layer.add(dynamicGroup);
    const crestColor = "#64748b";
    const troughColor = "#475569";
    const ringWidth = 1;
    const ringOpacity = 0.55;

    const addWave = (center: { x: number; y: number }, radius: number, color: string, dash: number[] | undefined, opacity: number) => {
      const sp = toScreen(center.x, center.y);
      dynamicGroup.add(new Konva.Circle({ x: sp.x, y: sp.y, radius: radius * scale, stroke: color, strokeWidth: ringWidth, dash, opacity, listening: false }));
    };

    const drawDynamic = (t: number) => {
      dynamicGroup.destroyChildren();

      for (const src of [s1, s2]) {
        const { crest, trough } = ringRadiiAt(t, v, scene.wavelength, fieldRadius);
        for (const r of crest) addWave(src, r, crestColor, undefined, ringOpacity);
        for (const r of trough) addWave(src, r, troughColor, [3, 3], ringOpacity - 0.05);
      }

      // Điểm giao nhau — nơi 2 vòng sóng hiện tại thật sự cắt nhau (chính là các
      // điểm "vẽ nên" 2 họ đường hypebol tĩnh ở trên theo thời gian).
      const pts = interferencePoints(s1, s2, t, v, scene.wavelength, fieldRadius);
      for (const p of pts) {
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

    // Nguồn sóng + nhãn S1/S2.
    const sourceColor = "#f472b6";
    scene.sources.forEach((src, i) => {
      const sp = toScreen(src.x, src.y);
      layer.add(new Konva.Circle({ x: sp.x, y: sp.y, radius: 6, fill: sourceColor, shadowBlur: 6, shadowColor: "#000", listening: false }));
      layer.add(
        new Konva.Text({
          x: sp.x - 6,
          y: sp.y + 10,
          text: `S${i + 1}`,
          fontSize: 12,
          fontStyle: "normal",
          fill: sourceColor,
          fontFamily: getSimulationFontFamily(),
          listening: false,
        }),
      );
    });

    if (seekToken && markLabel) {
      const badge = new Konva.Label({ x: 14, y: 14, listening: false });
      badge.add(new Konva.Tag({ fill: "#e8724a", cornerRadius: 4 }));
      badge.add(
        new Konva.Text({ text: `t = ${simTime.toFixed(2)}s (${markLabel})`, fontSize: 12, fontStyle: "normal", fill: "#ffffff", fontFamily: getSimulationFontFamily(), padding: 4 }),
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
      />
    </div>
  );
}
