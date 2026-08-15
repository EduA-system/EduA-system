"use client";

import { simulationCanvasFont } from "@/components/simulations/shared/typography";
import { memo, useEffect, useRef } from "react";
import {
  createThermalWireState,
  stepThermalWire,
} from "../../engines/circuit/thermal-wire-physics";
import type {
  ThermalWireParams,
  ThermalWireSnapshot,
} from "../../engines/circuit/thermal-wire-types";
import { useContainerSize } from "../../shared/use-container-size";

export const ThermalWireScene = memo(function ThermalWireScene({
  params,
  running,
  speed,
  resetSignal,
  zoom,
  onSnapshot,
}: {
  params: ThermalWireParams;
  running: boolean;
  speed: number;
  resetSignal: number;
  zoom: number;
  onSnapshot: (value: ThermalWireSnapshot) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null),
    stateRef = useRef(createThermalWireState()),
    latest = useRef({ params, running, speed, zoom, onSnapshot }),
    frameRef = useRef(0);
  latest.current = { params, running, speed, zoom, onSnapshot };
  const { ref, size } = useContainerSize<HTMLDivElement>();
  useEffect(() => {
    stateRef.current = createThermalWireState();
    latest.current.onSnapshot({ ...stateRef.current });
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
    const draw = (now: number) => {
      const current = latest.current,
        state = stateRef.current,
        dt = Math.min(0.033, (now - last) / 1000);
      last = now;
      if (
        current.running ||
        state.current > 0.001 ||
        state.temperature > 25.1
      ) {
        acc += dt * current.speed;
        let n = 0;
        while (acc >= 1 / 180 && n++ < 20) {
          stepThermalWire(state, current.params, 1 / 180);
          acc -= 1 / 180;
        }
      }
      if (now - report > 100) {
        current.onSnapshot({ ...state, burnProgress: [...state.burnProgress] });
        report = now;
      }
      const w = size.width,
        h = size.height,
        s = (Math.min(w / 820, h / 520) * current.zoom) / 100,
        ox = w / 2 - 410 * s,
        oy = h / 2 - 260 * s;
      ctx.clearRect(0, 0, w, h);
      const bg = ctx.createLinearGradient(0, 0, 0, h);
      bg.addColorStop(0, "#071426");
      bg.addColorStop(1, "#10243b");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);
      ctx.save();
      ctx.translate(ox, oy);
      ctx.scale(s, s);
      const hot = Math.max(0, Math.min(1, (state.temperature - 60) / 500));
      ctx.strokeStyle = current.params.masterSwitchClosed
        ? "#38bdf8"
        : "#64748b";
      ctx.lineWidth = 4;
      // Dây mạch dừng đúng tại chốt K và hai bản cực E, không chạy xuyên qua linh kiện.
      ctx.beginPath();
      ctx.moveTo(110, 150);
      ctx.lineTo(110, 395);
      ctx.lineTo(345, 395);
      ctx.moveTo(420, 395);
      ctx.lineTo(545, 395);
      ctx.moveTo(564, 395);
      ctx.lineTo(690, 395);
      ctx.lineTo(690, 150);
      ctx.stroke();
      // Nguồn E và chốt K.
      ctx.strokeStyle = "#f8fafc";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(545, 373);
      ctx.lineTo(545, 417);
      ctx.moveTo(564, 382);
      ctx.lineTo(564, 408);
      ctx.stroke();
      ctx.fillStyle = "#fda4af";
      ctx.font = simulationCanvasFont("13px", 500);
      ctx.fillText("+", 530, 383);
      ctx.fillText("−", 572, 383);
      ctx.fillText("E", 550, 445);
      ctx.fillStyle = "#cbd5e1";
      ctx.beginPath();
      ctx.arc(345, 395, 6, 0, Math.PI * 2);
      ctx.arc(420, 395, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#f59e0b";
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(345, 394);
      ctx.lineTo(
        current.params.masterSwitchClosed ? 420 : 402,
        current.params.masterSwitchClosed ? 394 : 367,
      );
      ctx.stroke();
      ctx.fillStyle = "#e2e8f0";
      ctx.font = simulationCanvasFont("13px", 500);
      ctx.fillText("Chốt K", 360, 360);
      // Điện trở bảo vệ R.
      ctx.fillStyle = "#e2e8f0";
      ctx.strokeStyle = "#94a3b8";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(95, 250, 30, 70, 4);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#172235";
      ctx.font = simulationCanvasFont("14px", 700);
      ctx.fillText("R", 104, 290);
      // Dây sắt AB, đỏ dần theo nhiệt độ và có glow liên tục, không nhấp nháy.
      const wireColor =
        hot > 0.72 ? "#fff1a6" : hot > 0.35 ? "#fb923c" : "#94a3b8";
      ctx.shadowColor = hot > 0.4 ? "rgba(251,146,60,.75)" : "transparent";
      ctx.shadowBlur = 18 * hot;
      ctx.strokeStyle = wireColor;
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.moveTo(110, 150);
      ctx.lineTo(690, 150);
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.fillStyle = "#f8fafc";
      ctx.font = simulationCanvasFont("14px", 700);
      ctx.fillText("A", 88, 155);
      ctx.fillText("B", 702, 155);
      ctx.fillStyle = "#bae6fd";
      ctx.font = simulationCanvasFont("13px", 500);
      ctx.fillText("Dây sắt", 120, 125);
      // Ba mảnh giấy: sáng -> vàng nâu -> than hóa -> cháy thủng.
      const centers = [250, 400, 550];
      centers.forEach((x, index) => {
        const burn = state.burnProgress[index]!,
          brown = Math.min(1, burn * 2.15),
          char = Math.max(0, (burn - 0.38) / 0.62),
          curl = Math.sin(burn * Math.PI) * 5;
        // Tờ giấy co quăn, mép xém không đều và thu nhỏ dần khi biến thành than.
        if (burn < 0.97) {
          ctx.save();
          ctx.translate(x, 150 + char * 5);
          ctx.rotate((index - 1) * 0.04 + char * 0.035);
          ctx.globalAlpha = 1 - char * 0.28;
          ctx.fillStyle =
            brown > 0.05
              ? `rgb(${Math.round(238 - 158 * brown)},${Math.round(231 - 180 * brown)},${Math.round(205 - 168 * brown)})`
              : "#e8f0df";
          ctx.strokeStyle = char > 0.08 ? "#3f2414" : "#cbd5b1";
          ctx.lineWidth = 2 + char;
          ctx.beginPath();
          ctx.moveTo(-38 + char * 9, -15 + curl);
          ctx.lineTo(-15, -14 - curl * 0.35);
          ctx.lineTo(5, -15 + curl * 0.2);
          ctx.lineTo(38 - char * 8, -13 + curl);
          ctx.lineTo(36 - char * 7, 14 - curl * 0.2);
          ctx.lineTo(9, 15 + curl * 0.25);
          ctx.lineTo(-18, 14 - curl * 0.4);
          ctx.lineTo(-37 + char * 7, 12);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          if (burn > 0.3) {
            const hole = 4 + char * 25;
            ctx.fillStyle = "#070605";
            ctx.beginPath();
            for (let point = 0; point < 12; point++) {
              const angle = (point / 12) * Math.PI * 2,
                r = hole * (0.72 + 0.28 * Math.sin(point * 4 + index));
              const px = Math.cos(angle) * r,
                py = Math.sin(angle) * r * 0.45;
              if (point === 0) ctx.moveTo(px, py);
              else ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = "#7c2d12";
            ctx.lineWidth = 2;
            ctx.stroke();
          }
          ctx.restore();
        }
        // Lửa bám đúng vùng giấy tiếp xúc dây, gồm lớp đỏ, cam và lõi vàng.
        if (burn > 0.2 && burn < 0.94) {
          const sway = Math.sin(now * 0.019 + index * 1.7) * 5,
            height = 34 + burn * 34;
          ctx.fillStyle = `rgba(220,38,38,${Math.min(0.9, burn * 1.6)})`;
          ctx.beginPath();
          ctx.moveTo(x - 15, 143);
          ctx.quadraticCurveTo(x - 25 + sway, 118, x - 5 + sway, 143 - height);
          ctx.quadraticCurveTo(x + 27 + sway, 115, x + 15, 143);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = "#fb923c";
          ctx.beginPath();
          ctx.moveTo(x - 10, 143);
          ctx.quadraticCurveTo(
            x - 12 + sway * 0.5,
            120,
            x + 1 + sway * 0.4,
            143 - height * 0.76,
          );
          ctx.quadraticCurveTo(x + 16, 125, x + 9, 143);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = "#fef3c7";
          ctx.beginPath();
          ctx.moveTo(x - 4, 142);
          ctx.quadraticCurveTo(x - 5, 129, x + 1, 120);
          ctx.quadraticCurveTo(x + 7, 133, x + 4, 142);
          ctx.closePath();
          ctx.fill();
        }
        // Khói mềm phía trên vùng cháy.
        if (burn > 0.12 && burn < 0.98) {
          for (let p = 0; p < 4; p++) {
            const rise = (now * 0.022 + p * 19 + index * 11) % 70;
            ctx.fillStyle = `rgba(148,163,184,${Math.max(0, 0.3 - rise / 260) * Math.min(1, burn * 2)})`;
            ctx.beginPath();
            ctx.arc(
              x - 9 + p * 6 + Math.sin(now * 0.002 + p) * 7,
              118 - rise,
              4 + p * 1.4,
              0,
              Math.PI * 2,
            );
            ctx.fill();
          }
        }
        // Than giòn vỡ thành bụi li ti rơi xuống; vị trí được sinh ổn định từ chỉ số hạt.
        if (burn > 0.62) {
          for (let p = 0; p < 18; p++) {
            const seed = index * 37 + p * 17,
              fall = ((now * 0.035 + seed * 5) % (90 + (seed % 35))) * char;
            const spread = ((seed * 23) % 41) - 20;
            const alpha = Math.max(0, 0.78 - fall / 160) * char;
            ctx.fillStyle = `rgba(${p % 4 === 0 ? 88 : 35},${p % 4 === 0 ? 55 : 30},${p % 4 === 0 ? 31 : 26},${alpha})`;
            ctx.beginPath();
            ctx.arc(
              x + spread * (0.25 + char),
              163 + fall,
              1 + (seed % 4) * 0.45,
              0,
              Math.PI * 2,
            );
            ctx.fill();
          }
        }
      });
      ctx.fillStyle = "#fde68a";
      ctx.font = simulationCanvasFont("13px", 500);
      ctx.fillText(`T dây = ${state.temperature.toFixed(0)} °C`, 310, 225);
      ctx.fillStyle = "#67e8f9";
      ctx.fillText(`I = ${state.current.toFixed(2)} A`, 310, 250);
      ctx.fillText(`P = ${state.power.toFixed(1)} W`, 310, 275);
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
        aria-label="Mô phỏng dòng điện nung nóng dây sắt và đốt cháy giấy"
      />
    </div>
  );
});
