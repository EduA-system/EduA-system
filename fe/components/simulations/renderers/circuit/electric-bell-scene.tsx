"use client";

import { memo, useEffect, useRef } from "react";
import { CIRCUIT_DT } from "../../engines/circuit/constants";
import {
  createElectricBellState,
  electricBellSnapshot,
  stepElectricBell,
} from "../../engines/circuit/physics";
import type {
  ElectricBellParams,
  ElectricBellSnapshot,
} from "../../engines/circuit/types";
import { useContainerSize } from "../../shared/use-container-size";

type Props = {
  params: ElectricBellParams;
  running: boolean;
  speed: number;
  resetSignal: number;
  zoom: number;
  onSnapshot: (value: ElectricBellSnapshot) => void;
};

export const ElectricBellScene = memo(function ElectricBellScene({
  params,
  running,
  speed,
  resetSignal,
  zoom,
  onSnapshot,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef(createElectricBellState());
  const frameRef = useRef(0);
  const latest = useRef({ params, running, speed, zoom, onSnapshot });
  const { ref: containerRef, size } = useContainerSize<HTMLDivElement>();
  latest.current = { params, running, speed, zoom, onSnapshot };

  useEffect(() => {
    stateRef.current = createElectricBellState();
    latest.current.onSnapshot(
      electricBellSnapshot(stateRef.current, latest.current.params),
    );
  }, [resetSignal]);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !size.width || !size.height) return;
    const dpr = Math.min(devicePixelRatio || 1, 2),
      ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width = Math.round(size.width * dpr);
    canvas.height = Math.round(size.height * dpr);
    canvas.style.width = `${size.width}px`;
    canvas.style.height = `${size.height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    let last = performance.now(),
      accumulator = 0,
      lastReport = 0;

    const wire = (points: Array<[number, number]>, glow: number) => {
      ctx.strokeStyle =
        glow > 0.05 ? `rgba(56,189,248,${0.5 + glow * 0.4})` : "#64748b";
      ctx.lineWidth = 4;
      ctx.lineJoin = "round";
      ctx.beginPath();
      points.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.stroke();
    };
    const label = (text: string, x: number, y: number, color = "#e2e8f0") => {
      ctx.font = "600 12px Inter, sans-serif";
      ctx.fillStyle = color;
      ctx.textAlign = "center";
      ctx.fillText(text, x, y);
    };
    const draw = (now: number) => {
      const current = latest.current,
        state = stateRef.current;
      const dt = Math.min(0.033, Math.max(0, (now - last) / 1000));
      last = now;
      if (
        current.running ||
        state.current > 0.001 ||
        state.displacement > 0.0001 ||
        Math.abs(state.velocity) > 0.001
      ) {
        accumulator += dt * current.speed;
        let guard = 0;
        while (accumulator >= CIRCUIT_DT && guard++ < 24) {
          stepElectricBell(state, current.params, CIRCUIT_DT);
          accumulator -= CIRCUIT_DT;
        }
      }
      const rawSnapshot = electricBellSnapshot(state, current.params);
      const snap =
        !current.running && current.params.masterSwitchClosed && state.time > 0
          ? { ...rawSnapshot, phase: "paused" as const }
          : rawSnapshot;
      if (now - lastReport > 90) {
        current.onSnapshot(snap);
        lastReport = now;
      }
      const w = size.width,
        h = size.height,
        s = (Math.min(w / 860, h / 540) * current.zoom) / 100,
        ox = w * 0.5 - 430 * s,
        oy = h * 0.5 - 270 * s;
      ctx.clearRect(0, 0, w, h);
      const bg = ctx.createLinearGradient(0, 0, 0, h);
      bg.addColorStop(0, "#071426");
      bg.addColorStop(1, "#10243b");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);
      ctx.save();
      ctx.translate(ox, oy);
      ctx.scale(s, s);
      const circuitLevel = current.params.masterSwitchClosed ? 0.65 : 0,
        shift = snap.displacement * 5300;
      // Bảng đế và dây mạch kín, đi vòng ngoài thiết bị.
      ctx.fillStyle = "#24354b";
      ctx.beginPath();
      ctx.roundRect(55, 455, 740, 22, 8);
      ctx.fill();
      wire(
        [
          [88, 78],
          [174, 78],
        ],
        circuitLevel,
      );
      wire(
        [
          [206, 78],
          [330, 78],
        ],
        circuitLevel,
      );
      wire(
        [
          [405, 78],
          [716, 78],
          [716, 223],
          [598, 223],
        ],
        circuitLevel,
      );
      wire(
        [
          [88, 78],
          [88, 380],
          [220, 380],
          [220, 285],
          [245, 285],
        ],
        circuitLevel,
      );
      wire(
        [
          [395, 285],
          [430, 285],
          [430, 155],
          [535, 155],
          [535, 188],
        ],
        circuitLevel,
      );
      // Nguồn DC theo ký hiệu mạch điện: bản dài là cực dương, bản ngắn là cực âm.
      ctx.strokeStyle = "#f8fafc";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(180, 58);
      ctx.lineTo(180, 98);
      ctx.moveTo(198, 66);
      ctx.lineTo(198, 90);
      ctx.stroke();
      label(
        current.params.polarity > 0 ? "+     −" : "−     +",
        189,
        49,
        "#fda4af",
      );
      label(`U = ${current.params.voltage.toFixed(1)} V`, 189, 116, "#fda4af");
      // Công tắc.
      ctx.fillStyle = "#cbd5e1";
      ctx.beginPath();
      ctx.arc(330, 78, 6, 0, Math.PI * 2);
      ctx.arc(405, 78, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#f59e0b";
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(330, 77);
      ctx.lineTo(
        current.params.masterSwitchClosed ? 405 : 388,
        current.params.masterSwitchClosed ? 77 : 52,
      );
      ctx.stroke();
      label("Công tắc", 368, 42);
      // Cuộn dây quấn trên một lõi sắt non thẳng; hai đầu dây nối trực tiếp vào mạch.
      ctx.fillStyle = "#cbd5e1";
      ctx.beginPath();
      ctx.roundRect(245, 267, 150, 36, 7);
      ctx.fill();
      ctx.strokeStyle = current.params.masterSwitchClosed
        ? "#fb923c"
        : "#b45309";
      ctx.lineWidth = 7;
      for (let x = 254; x <= 364; x += 14) {
        ctx.beginPath();
        ctx.ellipse(x, 285, 8, 31, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      label("Cuộn dây", 305, 245, "#fdba74");
      label("Lõi sắt non", 320, 329);
      label(`N = ${current.params.turns}`, 305, 351, "#fdba74");
      // Chốt kẹp là tâm quay cố định của toàn bộ lá thép, miếng sắt và cần gõ.
      const pivotX = 535,
        pivotY = 155,
        leverAngle = shift / 300;
      ctx.fillStyle = "#f8fafc";
      ctx.strokeStyle = "#fb7185";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(505, 132, 60, 38, 5);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#ef4444";
      ctx.beginPath();
      ctx.arc(pivotX, pivotY, 8, 0, Math.PI * 2);
      ctx.fill();
      label("Chốt kẹp", 620, 128, "#f8fafc");
      ctx.strokeStyle = "#94a3b8";
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(586, 130);
      ctx.lineTo(560, 146);
      ctx.stroke();
      ctx.save();
      ctx.translate(pivotX, pivotY);
      ctx.rotate(leverAngle);
      ctx.fillStyle = "#b87319";
      ctx.strokeStyle = "#fde68a";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(-9, 0, 18, 205, 5);
      ctx.fill();
      ctx.stroke();
      // Miếng sắt nhỏ gắn cứng vào lá thép và cùng quay quanh chốt kẹp.
      ctx.fillStyle = "#e2e8f0";
      ctx.strokeStyle = "#94a3b8";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(-68, 112, 68, 27, 4);
      ctx.fill();
      ctx.stroke();
      // Núm tiếp xúc thuộc cụm chuyển động; chốt tiếp điểm bên phải là phần cố định.
      ctx.fillStyle = "#fde68a";
      ctx.beginPath();
      ctx.arc(10, 68, 6, 0, Math.PI * 2);
      ctx.fill();
      // Cây gõ nối liên tục với cuối lá thép.
      ctx.strokeStyle = "#cbd5e1";
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(0, 202);
      ctx.quadraticCurveTo(-4, 225, -20, 242);
      ctx.stroke();
      ctx.fillStyle = "#cbd5e1";
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(-22, 247, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
      // Vẽ lại chốt ở lớp trên cùng để chốt thực sự đè và giữ đầu lá thép/cây gõ.
      ctx.fillStyle = "#f8fafc";
      ctx.strokeStyle = "#fb7185";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(505, 132, 60, 38, 5);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#ef4444";
      ctx.beginPath();
      ctx.arc(pivotX, pivotY, 8, 0, Math.PI * 2);
      ctx.fill();
      // Tiếp điểm cố định: khi lá thép quay, núm trên lá rời chốt và dòng điện bị ngắt.
      ctx.strokeStyle = "#fb7185";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(598, 223);
      ctx.lineTo(552, 223);
      ctx.stroke();
      ctx.fillStyle = "#fde68a";
      ctx.beginPath();
      ctx.arc(552, 223, 7, 0, Math.PI * 2);
      ctx.fill();
      label("Lá thép đàn hồi", 625, 183, "#bae6fd");
      label("Miếng sắt", 458, 235, "#e2e8f0");
      label("Tiếp điểm cố định", 650, 252, "#fda4af");
      label("Cây gõ chuông", 585, 425, "#cbd5e1");
      ctx.strokeStyle = "#94a3b8";
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(604, 188);
      ctx.lineTo(542, 195);
      ctx.moveTo(620, 256);
      ctx.lineTo(575, 225);
      ctx.moveTo(570, 418);
      ctx.lineTo(517, 402);
      ctx.stroke();
      // Chuông tròn đặt dưới cuộn dây và trong hướng chuyển động của đầu gõ.
      const bellShake = snap.bellImpulse * Math.sin(now * 0.06) * 4;
      ctx.save();
      ctx.translate(bellShake, 0);
      ctx.fillStyle = "#dc2626";
      ctx.strokeStyle = "#fca5a5";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(430, 392, 58, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#7f1d1d";
      ctx.beginPath();
      ctx.arc(430, 392, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#fecaca";
      ctx.stroke();
      ctx.restore();
      ctx.fillStyle = "#64748b";
      ctx.beginPath();
      ctx.roundRect(390, 450, 80, 16, 4);
      ctx.fill();
      label("Chuông", 430, 489, "#fca5a5");
      if (current.params.showLabels) {
        label(`I = ${snap.current.toFixed(2)} A`, 270, 104, "#67e8f9");
        label("F_từ ←", 442, 278, "#67e8f9");
        label(`g = ${snap.gapCurrentMm.toFixed(1)} mm`, 448, 310);
      }
      ctx.restore();
      frameRef.current = requestAnimationFrame(draw);
    };
    frameRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frameRef.current);
  }, [size.height, size.width, resetSignal]);
  return (
    <div ref={containerRef} className="h-full w-full">
      <canvas
        ref={canvasRef}
        className="block h-full w-full"
        aria-label="Mô phỏng chuông điện tự đóng ngắt bằng nam châm điện"
      />
    </div>
  );
});
