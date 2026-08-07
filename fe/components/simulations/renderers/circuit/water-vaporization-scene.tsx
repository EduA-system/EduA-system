"use client";
import { memo, useEffect, useRef } from "react";
import {
  createWaterVaporizationState,
  snapshotWaterVaporization,
  stepWaterVaporization,
} from "../../engines/circuit/water-vaporization-physics";
import type {
  WaterVaporizationParams,
  WaterVaporizationSnapshot,
} from "../../engines/circuit/water-vaporization-types";
import { useContainerSize } from "../../shared/use-container-size";

export const WaterVaporizationScene = memo(function WaterVaporizationScene({
  params,
  running,
  speed,
  resetSignal,
  zoom,
  onSnapshot,
}: {
  params: WaterVaporizationParams;
  running: boolean;
  speed: number;
  resetSignal: number;
  zoom: number;
  onSnapshot: (s: WaterVaporizationSnapshot) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null),
    stateRef = useRef(createWaterVaporizationState()),
    latest = useRef({ params, running, speed, zoom, onSnapshot }),
    frameRef = useRef(0);
  latest.current = { params, running, speed, zoom, onSnapshot };
  const { ref, size } = useContainerSize<HTMLDivElement>();
  useEffect(() => {
    stateRef.current = createWaterVaporizationState();
    latest.current.onSnapshot(
      snapshotWaterVaporization(stateRef.current, latest.current.params),
    );
  }, [resetSignal]);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !size.width || !size.height) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = size.width * dpr;
    canvas.height = size.height * dpr;
    canvas.style.width = `${size.width}px`;
    canvas.style.height = `${size.height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    let last = performance.now(),
      acc = 0,
      report = 0;
    const wire = (points: [number, number][], active: boolean) => {
      ctx.strokeStyle = active ? "#38bdf8" : "#71849a";
      ctx.lineWidth = 4;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      points.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.stroke();
    };
    const draw = (now: number) => {
      const c = latest.current,
        state = stateRef.current,
        dt = Math.min(0.033, (now - last) / 1000);
      last = now;
      if (c.running) {
        acc += dt * c.speed * 30;
        let n = 0;
        while (acc >= 1 / 120 && n++ < 120) {
          stepWaterVaporization(state, c.params, 1 / 120);
          acc -= 1 / 120;
        }
      }
      const snap = snapshotWaterVaporization(state, c.params);
      if (now - report > 90) {
        c.onSnapshot(snap);
        report = now;
      }
      const scale =
          (Math.min(size.width / 900, size.height / 540) * c.zoom) / 100,
        ox = size.width / 2 - 450 * scale,
        oy = size.height / 2 - 270 * scale;
      const bg = ctx.createLinearGradient(0, 0, 0, size.height);
      bg.addColorStop(0, "#07182b");
      bg.addColorStop(1, "#102d45");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, size.width, size.height);
      ctx.save();
      ctx.translate(ox, oy);
      ctx.scale(scale, scale);
      const active = c.params.switchClosed;
      // Giá đỡ và thanh treo.
      ctx.fillStyle = "#263d51";
      ctx.fillRect(55, 475, 185, 18);
      ctx.fillStyle = "#94a3b8";
      ctx.fillRect(84, 75, 9, 402);
      ctx.fillRect(88, 126, 310, 8);
      ctx.fillStyle = "#64748b";
      ctx.fillRect(72, 117, 34, 25);
      ctx.strokeStyle = "#dbe4ec";
      ctx.lineWidth = 2;
      ctx.strokeRect(72, 117, 34, 25);
      // Nhiệt lượng kế có nước sôi.
      ctx.fillStyle = "rgba(226,240,248,.16)";
      ctx.strokeStyle = "#dce8ef";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(285, 142, 205, 210, [0, 0, 28, 28]);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#cbd5e1";
      ctx.fillRect(268, 126, 239, 18);
      ctx.fillStyle = "#94a3b8";
      ctx.fillRect(282, 119, 211, 10);
      const waterHeight = 116 * (1 - snap.vaporizedRatio * 0.78);
      const top = 336 - waterHeight;
      const water = ctx.createLinearGradient(0, top, 0, 338);
      water.addColorStop(0, "#5bc6ed");
      water.addColorStop(1, "#1687c4");
      ctx.fillStyle = water;
      ctx.beginPath();
      ctx.roundRect(290, top, 195, waterHeight, [0, 0, 22, 22]);
      ctx.fill();
      ctx.strokeStyle = "rgba(224,247,255,.75)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let x = 292; x <= 483; x += 7) {
        const y = top + Math.sin(x * 0.09 + now * 0.006) * (active ? 2.5 : 0.8);
        if (x === 292) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      // Dây nung tách hai đầu, cuộn đều dưới mặt nước.
      wire(
        [
          [330, 92],
          [330, 245],
        ],
        active,
      );
      wire(
        [
          [445, 92],
          [445, 245],
        ],
        active,
      );
      ctx.strokeStyle = active ? "#fb923c" : "#dbe4ec";
      ctx.shadowColor = active ? "rgba(251,146,60,.8)" : "transparent";
      ctx.shadowBlur = active ? 14 : 0;
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(330, 245);
      for (let i = 0; i <= 80; i++) {
        const r = i / 80;
        ctx.lineTo(330 + r * 115, 270 + Math.sin(r * Math.PI * 12) * 19);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;
      // Bọt sôi và hơi nước đi lên mượt.
      if (active) {
        for (let i = 0; i < 18; i++) {
          const rise = (now * 0.025 + i * 31) % Math.max(35, waterHeight - 8);
          const x = 305 + ((i * 43) % 160);
          ctx.fillStyle = `rgba(207,250,254,${0.2 + rise / 280})`;
          ctx.beginPath();
          ctx.arc(x, 330 - rise, 2 + (i % 4), 0, Math.PI * 2);
          ctx.fill();
        }
        for (let i = 0; i < 8; i++) {
          const rise = (now * 0.018 + i * 42) % 145;
          const x = 335 + ((i * 29) % 110) + Math.sin(now * 0.002 + i) * 10;
          ctx.fillStyle = `rgba(226,240,248,${Math.max(0, 0.34 - rise / 480)})`;
          ctx.beginPath();
          ctx.arc(x, 118 - rise, 8 + (i % 3) * 3, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      // Ống dẫn hơi ngưng tụ và cốc hứng trên cân.
      ctx.strokeStyle = "#dce8ef";
      ctx.lineWidth = 10;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(468, 126);
      ctx.lineTo(550, 126);
      ctx.quadraticCurveTo(575, 126, 575, 152);
      ctx.lineTo(575, 300);
      ctx.stroke();
      ctx.strokeStyle = "#7dd3fc";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(468, 126);
      ctx.lineTo(550, 126);
      ctx.quadraticCurveTo(575, 126, 575, 152);
      ctx.lineTo(575, 300);
      ctx.stroke();
      if (active && snap.collectedMass > 0) {
        for (let i = 0; i < 3; i++) {
          const fall = (now * 0.09 + i * 39) % 80;
          ctx.fillStyle = "#67e8f9";
          ctx.beginPath();
          ctx.arc(575, 310 + fall, 4 - i * 0.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.fillStyle = "rgba(207,250,254,.3)";
      ctx.strokeStyle = "#cffafe";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(510, 392);
      ctx.lineTo(640, 392);
      ctx.lineTo(625, 462);
      ctx.quadraticCurveTo(575, 470, 525, 462);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      const cupLevel = Math.min(1, snap.collectedMass / c.params.waterMass);
      ctx.fillStyle = "rgba(56,189,248,.7)";
      ctx.fillRect(527, 453 - cupLevel * 48, 96, cupLevel * 48);
      // Cân điện tử.
      ctx.fillStyle = "#94a3b8";
      ctx.strokeStyle = "#e2e8f0";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(490, 462);
      ctx.lineTo(658, 462);
      ctx.lineTo(675, 500);
      ctx.lineTo(473, 500);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#f8fafc";
      ctx.beginPath();
      ctx.roundRect(530, 470, 90, 22, 4);
      ctx.fill();
      ctx.fillStyle = "#172235";
      ctx.textAlign = "center";
      ctx.font = "700 13px Inter";
      ctx.fillText(`${(snap.collectedMass * 1000).toFixed(2)} g`, 575, 486);
      // Biến áp nguồn và oát kế, dây vuông góc gọn.
      ctx.fillStyle = "#132a40";
      ctx.strokeStyle = "#dce8ef";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(665, 170, 170, 125, 15);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#e2e8f0";
      ctx.font = "700 13px Inter";
      ctx.fillText("BIẾN ÁP NGUỒN", 750, 196);
      ctx.fillStyle = "#0f172a";
      ctx.beginPath();
      ctx.roundRect(690, 210, 120, 34, 6);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#67e8f9";
      ctx.fillText(`${c.params.voltage.toFixed(1)} V`, 750, 232);
      ctx.fillStyle = "#fb7185";
      ctx.beginPath();
      ctx.arc(705, 270, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#60a5fa";
      ctx.beginPath();
      ctx.arc(795, 270, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#cbd5e1";
      ctx.font = "600 11px Inter";
      ctx.fillText(`P = ${snap.power.toFixed(1)} W`, 750, 286);
      wire(
        [
          [330, 92],
          [330, 65],
          [705, 65],
          [705, 170],
        ],
        active,
      );
      wire(
        [
          [445, 92],
          [445, 82],
          [795, 82],
          [795, 170],
        ],
        active,
      );
      ctx.fillStyle = "#e2e8f0";
      ctx.textAlign = "left";
      ctx.font = "600 13px Inter";
      ctx.fillText("Nhiệt lượng kế", 285, 382);
      ctx.fillStyle = "#67e8f9";
      ctx.fillText(`t = ${state.time.toFixed(1)} s`, 690, 330);
      ctx.fillStyle = "#fde68a";
      ctx.fillText(
        `Δm = ${(snap.vaporizedMass * 1000).toFixed(2)} g`,
        690,
        354,
      );
      ctx.restore();
      frameRef.current = requestAnimationFrame(draw);
    };
    frameRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frameRef.current);
  }, [resetSignal, size.height, size.width]);
  return (
    <div ref={ref} className="h-full w-full">
      <canvas
        ref={canvasRef}
        className="block h-full w-full"
        aria-label="Mô phỏng đo nhiệt hoá hơi riêng của nước"
      />
    </div>
  );
});
