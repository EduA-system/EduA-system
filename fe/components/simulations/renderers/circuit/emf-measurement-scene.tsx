"use client";
import { memo, useEffect, useRef } from "react";
import { emfMeasurement } from "../../engines/circuit/emf-measurement-physics";
import type {
  EmfParams,
  EmfSnapshot,
} from "../../engines/circuit/emf-measurement-types";
import { useContainerSize } from "../../shared/use-container-size";
export const EmfMeasurementScene = memo(function EmfMeasurementScene({
  params,
  running,
  speed,
  resetSignal,
  zoom,
  onSnapshot,
}: {
  params: EmfParams;
  running: boolean;
  speed: number;
  resetSignal: number;
  zoom: number;
  onSnapshot: (s: EmfSnapshot) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null),
    timeRef = useRef(0),
    shownI = useRef(0),
    shownU = useRef(params.emf),
    latest = useRef({ params, running, speed, zoom, onSnapshot }),
    frameRef = useRef(0);
  latest.current = { params, running, speed, zoom, onSnapshot };
  const { ref, size } = useContainerSize<HTMLDivElement>();
  useEffect(() => {
    timeRef.current = 0;
    shownI.current = 0;
    shownU.current = latest.current.params.emf;
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
      report = 0;
    const meter = (
      x: number,
      y: number,
      r: number,
      label: string,
      value: number,
      max: number,
      unit: string,
    ) => {
      ctx.fillStyle = "#0f172a";
      ctx.strokeStyle = "#f8fafc";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = "#64748b";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(x, y, r - 9, Math.PI * 1.15, Math.PI * 1.85);
      ctx.stroke();
      const angle =
        Math.PI * 1.15 + Math.min(1, Math.max(0, value / max)) * Math.PI * 0.7;
      ctx.strokeStyle = "#fb7185";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(x, y + 5);
      ctx.lineTo(
        x + Math.cos(angle) * (r - 12),
        y + Math.sin(angle) * (r - 12),
      );
      ctx.stroke();
      ctx.fillStyle = "#f8fafc";
      ctx.textAlign = "center";
      ctx.font = "700 14px Inter, sans-serif";
      ctx.fillText(label, x, y + 2);
      ctx.font = "600 10px Inter, sans-serif";
      ctx.fillStyle = "#cbd5e1";
      ctx.fillText(`${value.toFixed(2)} ${unit}`, x, y + 17);
    };
    const draw = (now: number) => {
      const c = latest.current,
        dt = Math.min(0.033, (now - last) / 1000);
      last = now;
      if (c.running) timeRef.current += dt * c.speed;
      const target = emfMeasurement(c.params, timeRef.current),
        smooth = 1 - Math.exp(-dt * 9);
      shownI.current += (target.current - shownI.current) * smooth;
      shownU.current += (target.terminalVoltage - shownU.current) * smooth;
      const snap = {
        ...target,
        current: shownI.current,
        terminalVoltage: shownU.current,
        calculatedEmf:
          shownU.current + shownI.current * c.params.internalResistance,
      };
      if (now - report > 90) {
        c.onSnapshot(snap);
        report = now;
      }
      const w = size.width,
        h = size.height,
        s = (Math.min(w / 820, h / 520) * c.zoom) / 100,
        ox = w / 2 - 410 * s,
        oy = h / 2 - 260 * s;
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = "#09182b";
      ctx.fillRect(0, 0, w, h);
      ctx.save();
      ctx.translate(ox, oy);
      ctx.scale(s, s);
      const wire = c.params.switchClosed ? "#38bdf8" : "#64748b";
      ctx.strokeStyle = wire;
      ctx.lineWidth = 4;
      // Dây mạch ngoài, chừa khoảng trống đúng tại K, nguồn, A, R và R0.
      ctx.beginPath();
      ctx.moveTo(135, 105);
      ctx.lineTo(380, 105);
      ctx.moveTo(440, 105);
      ctx.lineTo(680, 105);
      ctx.lineTo(680, 190);
      ctx.moveTo(680, 305);
      ctx.lineTo(680, 390);
      ctx.lineTo(520, 390);
      ctx.moveTo(390, 390);
      ctx.lineTo(135, 390);
      ctx.lineTo(135, 283);
      ctx.moveTo(135, 268);
      ctx.lineTo(135, 190);
      ctx.moveTo(135, 135);
      ctx.lineTo(135, 105);
      ctx.stroke();
      // Công tắc K.
      ctx.fillStyle = "#cbd5e1";
      ctx.beginPath();
      ctx.arc(135, 135, 6, 0, Math.PI * 2);
      ctx.arc(135, 190, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#f59e0b";
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(135, 135);
      ctx.lineTo(
        c.params.switchClosed ? 135 : 115,
        c.params.switchClosed ? 190 : 174,
      );
      ctx.stroke();
      ctx.fillStyle = "#e2e8f0";
      ctx.font = "700 13px Inter, sans-serif";
      ctx.textAlign = "left";
      ctx.fillText("K", 104, 166);
      // Pin E,r với hai bản cực và dây không chạy xuyên nguồn.
      ctx.strokeStyle = "#f8fafc";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(116, 268);
      ctx.lineTo(154, 268);
      ctx.moveTo(123, 283);
      ctx.lineTo(147, 283);
      ctx.stroke();
      ctx.fillStyle = "#fda4af";
      ctx.font = "700 12px Inter, sans-serif";
      ctx.fillText("+", 105, 266);
      ctx.fillStyle = "#93c5fd";
      ctx.fillText("−", 105, 288);
      ctx.fillStyle = "#cbd5e1";
      ctx.fillText(`E = ${c.params.emf.toFixed(2)} V`, 62, 320);
      ctx.fillText(`r = ${c.params.internalResistance.toFixed(2)} Ω`, 62, 338);
      // Ampe kế A trên nhánh chính.
      meter(
        410,
        105,
        30,
        "A",
        shownI.current,
        Math.max(
          1,
          c.params.emf /
            Math.max(
              0.2,
              c.params.internalResistance + c.params.protectiveResistance,
            ),
        ),
        "A",
      );
      // Vôn kế mắc giữa M và N, dây dừng tại hai cực đồng hồ.
      ctx.strokeStyle = wire;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(305, 105);
      ctx.lineTo(305, 210);
      ctx.moveTo(305, 280);
      ctx.lineTo(305, 390);
      ctx.stroke();
      meter(
        305,
        245,
        35,
        "V",
        shownU.current,
        Math.max(1, c.params.emf * 1.15),
        "V",
      );
      ctx.fillStyle = "#f8fafc";
      ctx.textAlign = "center";
      ctx.font = "700 13px Inter, sans-serif";
      ctx.fillText("M", 305, 88);
      ctx.fillText("N", 305, 415);
      // Biến trở tải R.
      ctx.fillStyle = "#dbe4ec";
      ctx.strokeStyle = "#f8fafc";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.roundRect(660, 190, 40, 115, 4);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#334155";
      ctx.font = "700 14px Inter, sans-serif";
      ctx.fillText("R", 680, 252);
      // Điện trở bảo vệ R0.
      ctx.fillStyle = "#dbe4ec";
      ctx.strokeStyle = "#f8fafc";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.roundRect(390, 374, 130, 32, 3);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#334155";
      ctx.textAlign = "center";
      ctx.fillText(
        `R₀ = ${c.params.protectiveResistance.toFixed(1)} Ω`,
        455,
        396,
      );
      ctx.fillStyle = "#67e8f9";
      ctx.font = "600 12px Inter, sans-serif";
      ctx.fillText(`U = ${shownU.current.toFixed(2)} V`, 560, 345);
      ctx.fillText(`I = ${shownI.current.toFixed(2)} A`, 560, 365);
      ctx.fillStyle = "#fde68a";
      ctx.fillText(`E đo = ${snap.calculatedEmf.toFixed(2)} V`, 455, 455);
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
        className="h-full w-full"
        aria-label="Mạch đo suất điện động và điện trở trong của pin"
      />
    </div>
  );
});
