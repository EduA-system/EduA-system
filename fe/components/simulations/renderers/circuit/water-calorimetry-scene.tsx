"use client";

import { simulationCanvasFont } from "@/components/simulations/shared/typography";

import { memo, useEffect, useRef } from "react";
import {
  createWaterCalorimetryState,
  snapshotWaterCalorimetry,
  stepWaterCalorimetry,
} from "../../engines/circuit/water-calorimetry-physics";
import type {
  WaterCalorimetryParams,
  WaterCalorimetrySnapshot,
} from "../../engines/circuit/water-calorimetry-types";
import { useContainerSize } from "../../shared/use-container-size";

type Point = { x: number; y: number };

const WORLD_WIDTH = 900;
const WORLD_HEIGHT = 540;
const WIRE_IDLE = "#71849a";
const WIRE_ACTIVE = "#38bdf8";

function strokePath(ctx: CanvasRenderingContext2D, points: Point[]) {
  ctx.beginPath();
  points.forEach((point, index) => {
    if (index === 0) ctx.moveTo(point.x, point.y);
    else ctx.lineTo(point.x, point.y);
  });
  ctx.stroke();
}

function drawMeter(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  label: "A" | "V",
  value: number,
  max: number,
  unit: string,
) {
  ctx.save();
  // Dùng cùng ngôn ngữ hiển thị với đồng hồ của thí nghiệm đo suất điện động.
  ctx.fillStyle = "#0f172a";
  ctx.strokeStyle = "#f8fafc";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(x, y, 32, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  const start = Math.PI * 1.15;
  const sweep = Math.PI * 0.7;
  ctx.strokeStyle = "#94a3b8";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(x, y, 23, start, start + sweep);
  ctx.stroke();

  const ratio = Math.max(0, Math.min(1, value / max));
  const needle = start + sweep * ratio;
  ctx.strokeStyle = "#fb7185";
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(x, y + 4);
  ctx.lineTo(x + Math.cos(needle) * 23, y + Math.sin(needle) * 23);
  ctx.stroke();
  ctx.fillStyle = "#f8fafc";
  ctx.textAlign = "center";
  ctx.font = simulationCanvasFont("14px", 700);
  ctx.fillText(label, x, y + 2);
  ctx.font = simulationCanvasFont("10px", 500);
  ctx.fillStyle = "#cbd5e1";
  ctx.fillText(`${value.toFixed(2)} ${unit}`, x, y + 17);
  ctx.restore();
}

function drawStopwatch(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  time: number,
) {
  ctx.save();
  ctx.fillStyle = "#dce5ee";
  ctx.strokeStyle = "#8fa1b5";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(x - 20, y - 83, 40, 18, 5);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.roundRect(x + 49, y - 62, 24, 12, 3);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#f8fafc";
  ctx.strokeStyle = "#d7e0e9";
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.arc(x, y, 68, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  for (let index = 0; index < 12; index += 1) {
    const angle = (index / 12) * Math.PI * 2 - Math.PI / 2;
    ctx.strokeStyle = "#71849a";
    ctx.lineWidth = index % 3 === 0 ? 3 : 2;
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(angle) * 49, y + Math.sin(angle) * 49);
    ctx.lineTo(x + Math.cos(angle) * 57, y + Math.sin(angle) * 57);
    ctx.stroke();
  }

  const angle = -Math.PI / 2 + ((time % 60) / 60) * Math.PI * 2;
  ctx.strokeStyle = "#ef4444";
  ctx.lineWidth = 4;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + Math.cos(angle) * 44, y + Math.sin(angle) * 44);
  ctx.stroke();
  ctx.fillStyle = "#172235";
  ctx.beginPath();
  ctx.arc(x, y, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#e2e8f0";
  ctx.textAlign = "center";
  ctx.font = simulationCanvasFont("14px", 700);
  ctx.fillText(`${time.toFixed(1)} s`, x, y + 92);
  ctx.restore();
}

export const WaterCalorimetryScene = memo(function WaterCalorimetryScene({
  params,
  running,
  speed,
  resetSignal,
  zoom,
  onSnapshot,
}: {
  params: WaterCalorimetryParams;
  running: boolean;
  speed: number;
  resetSignal: number;
  zoom: number;
  onSnapshot: (snapshot: WaterCalorimetrySnapshot) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef(createWaterCalorimetryState(params));
  const latest = useRef({ params, running, speed, zoom, onSnapshot });
  const frameRef = useRef(0);
  latest.current = { params, running, speed, zoom, onSnapshot };
  const { ref, size } = useContainerSize<HTMLDivElement>();

  useEffect(() => {
    stateRef.current = createWaterCalorimetryState(latest.current.params);
    latest.current.onSnapshot(
      snapshotWaterCalorimetry(stateRef.current, latest.current.params),
    );
  }, [resetSignal]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !size.width || !size.height) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = size.width * dpr;
    canvas.height = size.height * dpr;
    canvas.style.width = `${size.width}px`;
    canvas.style.height = `${size.height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    let last = performance.now();
    let accumulator = 0;
    let lastReport = 0;

    const draw = (now: number) => {
      const current = latest.current;
      const state = stateRef.current;
      const dt = Math.min(0.033, (now - last) / 1000);
      last = now;
      if (current.running) {
        // Tăng tốc thời gian thí nghiệm; đồng hồ và năng lượng vẫn dùng cùng
        // thời gian mô phỏng nên hệ thức UIt = mcΔT không bị thay đổi.
        accumulator += dt * current.speed * 10;
        let iterations = 0;
        while (accumulator >= 1 / 120 && iterations < 60) {
          stepWaterCalorimetry(state, current.params, 1 / 120);
          accumulator -= 1 / 120;
          iterations += 1;
        }
      }
      const snapshot = snapshotWaterCalorimetry(state, current.params);
      if (now - lastReport > 90) {
        current.onSnapshot(snapshot);
        lastReport = now;
      }

      const scale =
        (Math.min(size.width / WORLD_WIDTH, size.height / WORLD_HEIGHT) *
          current.zoom) /
        100;
      const offsetX = size.width / 2 - (WORLD_WIDTH * scale) / 2;
      const offsetY = size.height / 2 - (WORLD_HEIGHT * scale) / 2;
      const background = ctx.createLinearGradient(0, 0, 0, size.height);
      background.addColorStop(0, "#07182b");
      background.addColorStop(1, "#102d45");
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, size.width, size.height);
      ctx.save();
      ctx.translate(offsetX, offsetY);
      ctx.scale(scale, scale);

      const active = current.params.switchClosed;
      const wireColor = active ? WIRE_ACTIVE : WIRE_IDLE;
      ctx.strokeStyle = wireColor;
      ctx.lineWidth = 4;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      // Mạch chính: K → nguồn → dây nung C → A → về K.
      strokePath(ctx, [
        { x: 125, y: 190 },
        { x: 125, y: 92 },
        { x: 190, y: 92 },
      ]);
      strokePath(ctx, [
        { x: 255, y: 92 },
        { x: 390, y: 92 },
      ]);
      strokePath(ctx, [
        { x: 417, y: 92 },
        { x: 595, y: 92 },
        { x: 595, y: 190 },
        { x: 495, y: 190 },
      ]);
      strokePath(ctx, [
        { x: 430, y: 190 },
        { x: 252, y: 190 },
      ]);
      strokePath(ctx, [
        { x: 188, y: 190 },
        { x: 125, y: 190 },
      ]);

      // Khóa K là phần duy nhất hở khi chưa chạy.
      ctx.fillStyle = "#dce5ee";
      ctx.beginPath();
      ctx.arc(190, 92, 6, 0, Math.PI * 2);
      ctx.arc(255, 92, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#f59e0b";
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(190, 92);
      ctx.lineTo(active ? 255 : 245, active ? 92 : 62);
      ctx.stroke();
      ctx.fillStyle = "#e2e8f0";
      ctx.textAlign = "center";
      ctx.font = simulationCanvasFont("14px", 700);
      ctx.fillText("K", 222, 52);

      // Nguồn điện: hai bản cực nằm đúng trên nhánh chính.
      ctx.strokeStyle = "#f8fafc";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(390, 70);
      ctx.lineTo(390, 114);
      ctx.moveTo(417, 78);
      ctx.lineTo(417, 106);
      ctx.stroke();
      ctx.fillStyle = "#fb7185";
      ctx.font = simulationCanvasFont("13px", 500);
      ctx.fillText("+", 376, 77);
      ctx.fillStyle = "#93c5fd";
      ctx.fillText("−", 431, 77);
      ctx.fillStyle = "#cbd5e1";
      ctx.font = simulationCanvasFont("11px", 500);
      ctx.fillText(`${current.params.voltage.toFixed(1)} V`, 403, 132);

      drawMeter(
        ctx,
        220,
        190,
        "A",
        active ? current.params.current : 0,
        6,
        "A",
      );

      // Vôn kế mắc song song chính xác giữa hai đầu dây nung C.
      ctx.strokeStyle = wireColor;
      ctx.lineWidth = 3;
      strokePath(ctx, [
        { x: 430, y: 190 },
        { x: 430, y: 150 },
      ]);
      strokePath(ctx, [
        { x: 494, y: 150 },
        { x: 495, y: 190 },
      ]);
      drawMeter(ctx, 462, 150, "V", current.params.voltage, 24, "V");

      // Nhiệt lượng kế hai lớp, nắp, và nước.
      ctx.fillStyle = "#dce4eb";
      ctx.strokeStyle = "#f8fafc";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(185, 235, 350, 230, 28);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#132a40";
      ctx.strokeStyle = "#8fa1b5";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(203, 253, 314, 194, 20);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#cbd5e1";
      ctx.fillRect(170, 226, 380, 14);

      const waterTop = 302;
      const waterGradient = ctx.createLinearGradient(0, waterTop, 0, 447);
      waterGradient.addColorStop(0, "#5bc6ed");
      waterGradient.addColorStop(1, "#1687c4");
      ctx.fillStyle = waterGradient;
      ctx.beginPath();
      ctx.roundRect(205, waterTop, 310, 143, [0, 0, 18, 18]);
      ctx.fill();
      ctx.strokeStyle = "rgba(224,247,255,.8)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let x = 207; x <= 513; x += 7) {
        const y =
          waterTop + Math.sin(x * 0.08 + now * 0.004) * (active ? 2 : 0.6);
        if (x === 207) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Hai dây dẫn của C đi liên tục từ hai nút mạch xuống điện trở nung.
      ctx.strokeStyle = wireColor;
      ctx.lineWidth = 5;
      strokePath(ctx, [
        { x: 430, y: 190 },
        { x: 430, y: 365 },
        { x: 435, y: 392 },
      ]);
      strokePath(ctx, [
        { x: 490, y: 392 },
        { x: 495, y: 365 },
        { x: 495, y: 190 },
      ]);

      // Dây nung xoắn, sáng dần nhưng không thay đổi hình học.
      ctx.strokeStyle = active ? "#fb923c" : "#d4dde6";
      ctx.shadowColor = active ? "rgba(251,146,60,.72)" : "transparent";
      ctx.shadowBlur = active ? 13 : 0;
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(435, 392);
      for (let index = 0; index <= 60; index += 1) {
        const ratio = index / 60;
        ctx.lineTo(435 + ratio * 55, 392 + Math.sin(ratio * Math.PI * 8) * 19);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.fillStyle = "#fde68a";
      ctx.textAlign = "left";
      ctx.font = simulationCanvasFont("15px", 700);
      ctx.fillText("C", 505, 272);

      // Nhiệt kế ngập trong nước, cột đỏ phản ánh nhiệt độ thật.
      ctx.fillStyle = "rgba(248,250,252,.93)";
      ctx.strokeStyle = "#cbd5e1";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(258, 215, 34, 172, 16);
      ctx.fill();
      ctx.stroke();
      const thermometerLevel = Math.max(
        0,
        Math.min(1, (state.temperature - 10) / 90),
      );
      ctx.fillStyle = "#ef4444";
      ctx.fillRect(
        271,
        365 - thermometerLevel * 120,
        8,
        15 + thermometerLevel * 120,
      );
      ctx.beginPath();
      ctx.arc(275, 373, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#e2e8f0";
      ctx.textAlign = "center";
      ctx.font = simulationCanvasFont("13px", 500);
      ctx.fillText("T", 275, 203);
      ctx.font = simulationCanvasFont("12px", 500);
      ctx.fillText(`${state.temperature.toFixed(1)} °C`, 275, 420);

      // Que khuấy độc lập, không bị nhầm với dây điện.
      const stir = active ? Math.sin(now * 0.0045) * 7 : 0;
      ctx.strokeStyle = "#e2e8f0";
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(350 + stir, 218);
      ctx.lineTo(350 - stir, 414);
      ctx.stroke();
      ctx.fillStyle = "#cbd5e1";
      ctx.beginPath();
      ctx.ellipse(350 - stir, 416, 25, 7, 0, 0, Math.PI * 2);
      ctx.fill();

      // Dòng đối lưu nhỏ, chỉ xuất hiện khi đang cấp điện.
      if (active) {
        for (let index = 0; index < 12; index += 1) {
          const rise = (now * 0.02 + index * 29) % 100;
          const x = 220 + ((index * 47) % 285);
          ctx.fillStyle = `rgba(207,250,254,${0.12 + rise / 360})`;
          ctx.beginPath();
          ctx.arc(x, 430 - rise, 2 + (index % 3), 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Hạt mang điện chạy trên các đoạn dây thật, không nhảy qua linh kiện.
      if (active) {
        const particles = [
          { from: { x: 255, y: 92 }, to: { x: 380, y: 92 } },
          { from: { x: 427, y: 92 }, to: { x: 595, y: 92 } },
          { from: { x: 595, y: 102 }, to: { x: 595, y: 190 } },
          { from: { x: 585, y: 190 }, to: { x: 505, y: 190 } },
          { from: { x: 420, y: 190 }, to: { x: 262, y: 190 } },
          { from: { x: 178, y: 190 }, to: { x: 125, y: 190 } },
        ];
        particles.forEach((segment, segmentIndex) => {
          const phase =
            (((now * 0.00025 * current.speed + segmentIndex * 0.19) % 1) + 1) %
            1;
          const x = segment.from.x + (segment.to.x - segment.from.x) * phase;
          const y = segment.from.y + (segment.to.y - segment.from.y) * phase;
          ctx.fillStyle = "#fef08a";
          ctx.beginPath();
          ctx.arc(x, y, 2.7, 0, Math.PI * 2);
          ctx.fill();
        });
      }

      drawStopwatch(ctx, 735, 355, state.time);

      ctx.textAlign = "left";
      ctx.font = simulationCanvasFont("13px", 500);
      ctx.fillStyle = "#67e8f9";
      ctx.fillText(`UIt = ${state.electricalEnergy.toFixed(0)} J`, 105, 505);
      ctx.fillStyle = "#fde68a";
      ctx.fillText(
        `m = ${(current.params.waterMass * 1000).toFixed(0)} g`,
        350,
        505,
      );
      ctx.fillStyle = "#fda4af";
      ctx.fillText(`ΔT = ${snapshot.deltaTemperature.toFixed(2)} °C`, 575, 505);

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
        aria-label="Mạch điện đo nhiệt dung riêng của nước với ampe kế nối tiếp và vôn kế song song dây nung"
      />
    </div>
  );
});
