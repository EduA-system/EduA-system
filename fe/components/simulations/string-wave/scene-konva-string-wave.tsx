"use client";

// Renderer 2D bằng Konva (imperative) cho SÓNG CƠ 1 CHIỀU TRÊN DÂY — dùng
// chung cho 2 preset: "Sóng trên dây" (mode: traveling) và "Sóng dừng" (mode:
// standing). Cùng triết lý với wave/scene-konva-wave-2d.tsx: biên độ là hàm
// giải tích y(x,t), không tích phân ODE, nên "đi tới mốc thời gian t" là tức
// thời. Cùng quy ước zoom/pan/fill-kín-không-gian với 2 renderer kia (xem
// shared/konva-zoom.ts, shared/zoom-controls.tsx, shared/use-container-size.ts).
//
// TRỤC x KHÔNG isotropic với TRỤC y (không giống renderer sóng nước 2D) — vì
// biên độ dây (mm–cm) rất nhỏ so với chiều dài dây (chục cm), vẽ đúng tỉ lệ
// thật sẽ phẳng lì không thấy gì. Phóng đại trục y riêng — quy ước chuẩn của
// mọi sách/mô phỏng sóng trên dây, không phải sai số.

import { useEffect, useRef, useState } from "react";
import Konva from "konva";
import type { StringWaveScene } from "./types";
import {
  antinodePositionsFixedFixed,
  nodePositionsFixedFixed,
  standingDisplacement,
  travelingDisplacement,
  waveNumber,
} from "./string-wave-math";
import { attachZoomPan, type ZoomActions } from "../shared/konva-zoom";
import { ZoomControls } from "../shared/zoom-controls";
import { useContainerSize } from "../shared/use-container-size";

const SAMPLES = 160; // số điểm lấy mẫu dựng đường cong sóng mỗi khung hình
const GRID_EXTENT_FACTOR = 3; // lưới vẽ rộng hơn khung nhìn ban đầu để còn chỗ kéo (pan)

type Vec2 = { x: number; y: number };

export function SceneKonvaStringWave({
  scene,
  running,
  resetSignal,
  onRunningChange,
  seekSeconds,
  seekToken,
  markLabel,
  speed = 1,
}: {
  scene: StringWaveScene;
  running: boolean;
  resetSignal: number;
  onRunningChange: (running: boolean) => void;
  seekSeconds?: number;
  seekToken?: number;
  markLabel?: string;
  // Hệ số tốc độ mô phỏng (0.5 = chậm nửa, 2 = nhanh gấp đôi…).
  speed?: number;
}) {
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
  const zoomActionsRef = useRef<ZoomActions | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    const { width: w, height: hgt } = size;
    if (!container || !w || !hgt) return;
    const W = w, H = hgt;

    const { length, amplitude, wavelength, frequency, mode } = scene;
    const direction = scene.direction ?? 1;
    const harmonic = Math.max(1, Math.round(scene.harmonic ?? 1));

    let simTime = seekToken && seekSeconds != null && seekSeconds >= 0 ? seekSeconds : 0;
    if (seekToken && seekSeconds != null && seekSeconds >= 0) {
      runningRef.current = false;
      onRunningChange(false);
    }

    const maxDisp = mode === "standing" ? 2 * amplitude : amplitude;
    const padX = 50, padY = 50;
    const xScale = (W - 2 * padX) / length;
    const ampScale = ((H - 2 * padY) / 2) / (maxDisp * 1.35);
    const toScreen = (x: number, y: number): Vec2 => ({ x: padX + x * xScale, y: H / 2 - y * ampScale });

    const stage = new Konva.Stage({ container, width: W, height: H });
    const layer = new Konva.Layer();
    stage.add(layer);

    zoomActionsRef.current = attachZoomPan(stage, { width: W, height: H, onZoomChange: setZoomPct });

    // ── Lưới dọc + trục 0 (dây ở trạng thái nghỉ, nét đứt vì là đường THAM
    // CHIẾU — dây thật là đường cong động vẽ đè lên sau). Vẽ rộng hơn khung
    // nhìn ban đầu để còn phủ kín khi kéo (pan) canvas. ──
    const xStep = length <= 20 ? 2 : length <= 50 ? 5 : 10;
    const gx0 = -GRID_EXTENT_FACTOR * length, gx1 = (1 + GRID_EXTENT_FACTOR) * length;
    for (let gx = Math.ceil(gx0 / xStep) * xStep; gx <= gx1; gx += xStep) {
      const x = toScreen(gx, 0).x;
      layer.add(new Konva.Line({ points: [x, 0, x, H], stroke: "#1e293b", strokeWidth: 1, listening: false }));
      layer.add(
        new Konva.Text({ x: x + 2, y: H / 2 + 6, text: `${gx}`, fontSize: 10, fill: "#64748b", fontFamily: "monospace", listening: false }),
      );
    }
    layer.add(
      new Konva.Line({
        points: [toScreen(gx0, 0).x, H / 2, toScreen(gx1, 0).x, H / 2],
        stroke: "#3f4d63",
        strokeWidth: 1,
        dash: [4, 4],
        listening: false,
      }),
    );

    if (mode === "standing") {
      // ── Đường bao biên độ (2 vị trí biên: cos(ωt)=±1) — nét đứt, tĩnh. ──
      const k = waveNumber(wavelength);
      const upper: number[] = [], lower: number[] = [];
      for (let i = 0; i <= SAMPLES; i++) {
        const x = (i / SAMPLES) * length;
        const y = 2 * amplitude * Math.sin(k * x);
        const spU = toScreen(x, y), spL = toScreen(x, -y);
        upper.push(spU.x, spU.y);
        lower.push(spL.x, spL.y);
      }
      layer.add(new Konva.Line({ points: upper, stroke: "#475569", strokeWidth: 1, dash: [4, 4], listening: false }));
      layer.add(new Konva.Line({ points: lower, stroke: "#475569", strokeWidth: 1, dash: [4, 4], listening: false }));

      // ── Nút (N, biên độ luôn 0) và bụng (B, biên độ cực đại ±2A) — ký hiệu
      // ngắn, giải thích đầy đủ ở bảng chú thích cạnh panel Tham số. ──
      const addBadge = (x: number, y: number, text: string, color: string) => {
        const sp = toScreen(x, y);
        const badge = new Konva.Label({ x: sp.x - 8, y: y >= 0 ? sp.y - 24 : sp.y + 10, listening: false });
        badge.add(new Konva.Tag({ fill: "#0f172a", stroke: color, strokeWidth: 1, cornerRadius: 3, opacity: 0.9 }));
        badge.add(new Konva.Text({ text, fontSize: 10, fontStyle: "bold", fill: color, fontFamily: "monospace", padding: 3 }));
        layer.add(badge);
      };
      for (const x of nodePositionsFixedFixed(length, harmonic)) {
        const sp = toScreen(x, 0);
        layer.add(new Konva.Circle({ x: sp.x, y: sp.y, radius: 5, fill: "#94a3b8", stroke: "#0f172a", strokeWidth: 1, listening: false }));
        addBadge(x, 0, "N", "#94a3b8");
      }
      for (const x of antinodePositionsFixedFixed(length, harmonic)) {
        const yTop = 2 * amplitude * Math.sin(k * x);
        const guideTop = toScreen(x, yTop), guideBottom = toScreen(x, -yTop);
        layer.add(
          new Konva.Line({ points: [guideTop.x, guideTop.y, guideBottom.x, guideBottom.y], stroke: "#f59e0b", strokeWidth: 1, dash: [2, 3], opacity: 0.5, listening: false }),
        );
        addBadge(x, yTop, "B", "#f59e0b");
      }
    } else {
      // ── Vector biên độ A + bước sóng λ — chỉ 1 lần, gần đầu dây. ──
      const yA = toScreen(0, 0), yATop = toScreen(0, amplitude);
      layer.add(new Konva.Arrow({ points: [yA.x + 14, yA.y, yATop.x + 14, yATop.y], stroke: "#facc15", fill: "#facc15", strokeWidth: 1.5, pointerLength: 6, pointerWidth: 6, listening: false }));
      layer.add(new Konva.Text({ x: yA.x + 20, y: (yA.y + yATop.y) / 2 - 6, text: "A", fontSize: 12, fontStyle: "bold", fill: "#facc15", fontFamily: "monospace", listening: false }));

      const lamY = maxDisp * 1.2;
      const p0 = toScreen(0, lamY), p1 = toScreen(wavelength, lamY);
      layer.add(new Konva.Arrow({ points: [p0.x, p0.y, p1.x, p1.y], stroke: "#34d399", fill: "#34d399", strokeWidth: 1.5, pointerLength: 6, pointerWidth: 6, pointerAtBeginning: true, listening: false }));
      layer.add(new Konva.Text({ x: (p0.x + p1.x) / 2 - 8, y: p0.y - 16, text: "λ", fontSize: 13, fontStyle: "bold", fill: "#34d399", fontFamily: "monospace", listening: false }));

      // Mũi tên chiều truyền sóng, góc trên canvas.
      const arrowY = 20;
      const ax0 = direction === 1 ? padX : W - padX, ax1 = direction === 1 ? padX + 46 : W - padX - 46;
      layer.add(new Konva.Arrow({ points: [ax0, arrowY, ax1, arrowY], stroke: "#e8724a", fill: "#e8724a", strokeWidth: 2, pointerLength: 7, pointerWidth: 7, listening: false }));
      layer.add(
        new Konva.Text({ x: Math.min(ax0, ax1), y: arrowY + 6, text: "chiều truyền sóng", fontSize: 10, fill: "#e8724a", fontFamily: "monospace", listening: false }),
      );
    }

    // ── Đường cong dây (động) — mutate points() mỗi khung hình, không huỷ/dựng lại node. ──
    const waveLine = new Konva.Line({ stroke: "#38bdf8", strokeWidth: 2.5, lineJoin: "round", listening: false });
    layer.add(waveLine);

    const computeCurvePoints = (t: number): number[] => {
      const pts: number[] = [];
      for (let i = 0; i <= SAMPLES; i++) {
        const x = (i / SAMPLES) * length;
        const y =
          mode === "standing"
            ? standingDisplacement(x, t, amplitude, wavelength, frequency)
            : travelingDisplacement(x, t, amplitude, wavelength, frequency, direction);
        const sp = toScreen(x, y);
        pts.push(sp.x, sp.y);
      }
      return pts;
    };

    // Phần tử dây đánh dấu (traveling) — chấm vàng dao động vuông góc phương
    // truyền, minh hoạ tốc độ TRUYỀN SÓNG (ngang) khác tốc độ PHẦN TỬ (dọc).
    let particle: Konva.Circle | null = null;
    const particleX = length * 0.5;
    if (mode === "traveling") {
      particle = new Konva.Circle({ x: toScreen(particleX, 0).x, y: toScreen(particleX, 0).y, radius: 7, fill: "#facc15", shadowBlur: 6, shadowColor: "#000" });
      layer.add(particle);
    }

    const syncCurve = (t: number) => {
      waveLine.points(computeCurvePoints(t));
      if (particle) {
        const y = travelingDisplacement(particleX, t, amplitude, wavelength, frequency, direction);
        particle.position(toScreen(particleX, y));
      }
    };
    syncCurve(simTime);

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
        syncCurve(simTime);
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
