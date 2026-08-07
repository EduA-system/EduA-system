"use client";

import { memo, useEffect, useRef } from "react";
import {
  createIceFusionState,
  snapshotIceFusion,
  stepIceFusion,
} from "../../engines/circuit/ice-fusion-physics";
import type {
  IceFusionParams,
  IceFusionSnapshot,
} from "../../engines/circuit/ice-fusion-types";
import { useContainerSize } from "../../shared/use-container-size";

const WORLD_WIDTH = 900;
const WORLD_HEIGHT = 540;

function wire(
  ctx: CanvasRenderingContext2D,
  points: Array<[number, number]>,
  active: boolean,
) {
  ctx.strokeStyle = active ? "#38bdf8" : "#71849a";
  ctx.lineWidth = 4;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  points.forEach(([x, y], index) =>
    index === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y),
  );
  ctx.stroke();
}

export const IceFusionScene = memo(function IceFusionScene({
  params,
  running,
  speed,
  resetSignal,
  zoom,
  onSnapshot,
}: {
  params: IceFusionParams;
  running: boolean;
  speed: number;
  resetSignal: number;
  zoom: number;
  onSnapshot: (snapshot: IceFusionSnapshot) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef(createIceFusionState());
  const latest = useRef({ params, running, speed, zoom, onSnapshot });
  const frameRef = useRef(0);
  latest.current = { params, running, speed, zoom, onSnapshot };
  const { ref, size } = useContainerSize<HTMLDivElement>();

  useEffect(() => {
    stateRef.current = createIceFusionState();
    latest.current.onSnapshot(
      snapshotIceFusion(stateRef.current, latest.current.params),
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
    let report = 0;

    const draw = (now: number) => {
      const current = latest.current;
      const state = stateRef.current;
      const dt = Math.min(0.033, (now - last) / 1000);
      last = now;
      if (current.running) {
        accumulator += dt * current.speed * 12;
        let iterations = 0;
        while (accumulator >= 1 / 120 && iterations < 70) {
          stepIceFusion(state, current.params, 1 / 120);
          accumulator -= 1 / 120;
          iterations += 1;
        }
      }
      const snapshot = snapshotIceFusion(state, current.params);
      if (now - report > 90) {
        current.onSnapshot(snapshot);
        report = now;
      }

      const scale =
        (Math.min(size.width / WORLD_WIDTH, size.height / WORLD_HEIGHT) *
          current.zoom) /
        100;
      const ox = size.width / 2 - (WORLD_WIDTH * scale) / 2;
      const oy = size.height / 2 - (WORLD_HEIGHT * scale) / 2;
      const background = ctx.createLinearGradient(0, 0, 0, size.height);
      background.addColorStop(0, "#07182b");
      background.addColorStop(1, "#102d45");
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, size.width, size.height);
      ctx.save();
      ctx.translate(ox, oy);
      ctx.scale(scale, scale);

      const active = current.params.switchClosed;

      // Giá đỡ thẳng, chắc và cân với cụm nhiệt lượng kế.
      ctx.fillStyle = "#273d50";
      ctx.fillRect(55, 465, 175, 18);
      ctx.fillStyle = "#94a3b8";
      ctx.fillRect(84, 70, 9, 398);
      ctx.fillStyle = "#cbd5e1";
      ctx.fillRect(88, 120, 275, 8);
      ctx.fillStyle = "#64748b";
      ctx.fillRect(72, 112, 34, 24);
      ctx.strokeStyle = "#dbe4ec";
      ctx.lineWidth = 2;
      ctx.strokeRect(72, 112, 34, 24);
      ctx.fillStyle = "#e2e8f0";
      ctx.font = "600 13px Inter, sans-serif";
      ctx.fillText("Giá đỡ", 112, 89);

      // Nhiệt lượng kế trong suốt, treo đúng dưới thanh ngang.
      ctx.fillStyle = "rgba(226,240,248,.18)";
      ctx.strokeStyle = "#dce8ef";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(275, 125, 195, 205, [0, 0, 28, 28]);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#cbd5e1";
      ctx.fillRect(260, 112, 225, 18);
      ctx.fillStyle = "#94a3b8";
      ctx.fillRect(274, 105, 197, 10);

      // Nước đá co dần theo tỉ lệ nóng chảy, các khối không nhấp nháy.
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(278, 132, 189, 195, [0, 0, 25, 25]);
      ctx.clip();
      const meltOrder = [
        0.42, 0.3, 0.28, 0.4, 0.22, 0.08, 0.06, 0.2, 0.16, 0, 0.02, 0.14, 0.5,
        0.34, 0.32, 0.48,
      ];
      for (let row = 0; row < 4; row += 1) {
        for (let col = 0; col < 4; col += 1) {
          const index = row * 4 + col;
          const localMelt = Math.max(
            0,
            Math.min(1, (snapshot.meltedRatio - meltOrder[index]!) / 0.5),
          );
          const chunkScale = 1 - localMelt * 0.92;
          if (chunkScale <= 0.09) continue;
          const baseX = 292 + col * 42 + (row % 2) * 9;
          const baseY = 153 + row * 35;
          const width = 34 * chunkScale;
          const height = 27 * chunkScale;
          const x = baseX + (34 - width) / 2;
          const y =
            baseY + (27 - height) / 2 + snapshot.meltedRatio * (12 + row * 2);
          const alpha = 0.86 * Math.pow(1 - localMelt, 0.55);
          ctx.fillStyle = `rgba(220,247,255,${alpha})`;
          ctx.strokeStyle = `rgba(125,211,252,${Math.max(0.12, alpha)})`;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.roundRect(x, y, width, height, Math.max(3, 9 * chunkScale));
          ctx.fill();
          ctx.stroke();
        }
      }
      const waterHeight = 18 + snapshot.meltedRatio * 70;
      const water = ctx.createLinearGradient(0, 310 - waterHeight, 0, 320);
      water.addColorStop(0, "rgba(125,211,252,.65)");
      water.addColorStop(1, "rgba(14,165,233,.82)");
      ctx.fillStyle = water;
      ctx.fillRect(280, 318 - waterHeight, 185, waterHeight);
      ctx.restore();

      // Dây nung dạng xoắn nằm trong đá, hai đầu tách rõ.
      wire(
        ctx,
        [
          [325, 92],
          [325, 195],
        ],
        active,
      );
      wire(
        ctx,
        [
          [420, 92],
          [420, 195],
        ],
        active,
      );
      ctx.strokeStyle = active ? "#fb923c" : "#dbe4ec";
      ctx.shadowColor = active ? "rgba(251,146,60,.8)" : "transparent";
      ctx.shadowBlur = active ? 14 : 0;
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(325, 195);
      for (let index = 0; index <= 60; index += 1) {
        const ratio = index / 60;
        ctx.lineTo(325 + ratio * 95, 215 + Math.sin(ratio * Math.PI * 10) * 18);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.fillStyle = "#fde68a";
      ctx.font = "700 13px Inter, sans-serif";
      ctx.fillText("Dây nung", 343, 253);

      // Lỗ thoát và giọt nước chuyển động liên tục xuống cốc hứng.
      ctx.fillStyle = "#dce8ef";
      ctx.beginPath();
      ctx.moveTo(355, 330);
      ctx.lineTo(390, 330);
      ctx.lineTo(378, 345);
      ctx.lineTo(367, 345);
      ctx.closePath();
      ctx.fill();
      if (active && state.meltedMass > 0.0001) {
        for (let index = 0; index < 3; index += 1) {
          const travel = (now * 0.09 + index * 38) % 105;
          ctx.fillStyle = "#67e8f9";
          ctx.beginPath();
          ctx.arc(372, 350 + travel, 4 - index * 0.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Cốc hứng đặt đúng tâm dưới lỗ thoát.
      ctx.fillStyle = "rgba(207,250,254,.38)";
      ctx.strokeStyle = "#cffafe";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(290, 377);
      ctx.lineTo(454, 377);
      ctx.lineTo(433, 454);
      ctx.quadraticCurveTo(372, 465, 311, 454);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      const cupLevel = Math.min(
        1,
        snapshot.collectedMass / current.params.iceMass,
      );
      ctx.fillStyle = "rgba(56,189,248,.7)";
      ctx.beginPath();
      ctx.moveTo(309, 451);
      ctx.lineTo(435, 451);
      ctx.lineTo(431, 451 - cupLevel * 56);
      ctx.lineTo(313, 451 - cupLevel * 56);
      ctx.closePath();
      ctx.fill();

      // Cân điện tử với màn hình khối lượng thật.
      ctx.fillStyle = "#94a3b8";
      ctx.strokeStyle = "#e2e8f0";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(275, 456);
      ctx.lineTo(469, 456);
      ctx.lineTo(486, 495);
      ctx.lineTo(258, 495);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#f8fafc";
      ctx.beginPath();
      ctx.roundRect(315, 466, 114, 22, 4);
      ctx.fill();
      ctx.fillStyle = "#172235";
      ctx.textAlign = "center";
      ctx.font = "700 13px Inter, sans-serif";
      ctx.fillText(`${(snapshot.collectedMass * 1000).toFixed(1)} g`, 372, 482);
      ctx.fillStyle = "#e2e8f0";
      ctx.font = "600 12px Inter, sans-serif";
      ctx.fillText("Cân điện tử", 372, 518);

      // Biến áp nguồn riêng bên phải; dây đi vuông góc, không cắt thiết bị.
      ctx.fillStyle = "#132a40";
      ctx.strokeStyle = "#dce8ef";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(645, 315, 175, 135, 16);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#e2e8f0";
      ctx.font = "700 13px Inter, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("BIẾN ÁP NGUỒN", 732, 343);
      ctx.fillStyle = "#0f172a";
      ctx.strokeStyle = "#94a3b8";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(671, 360, 122, 35, 6);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#67e8f9";
      ctx.font = "700 13px Inter, sans-serif";
      ctx.fillText(`${current.params.voltage.toFixed(1)} V`, 732, 383);
      ctx.fillStyle = "#fb7185";
      ctx.beginPath();
      ctx.arc(690, 420, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#60a5fa";
      ctx.beginPath();
      ctx.arc(775, 420, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#cbd5e1";
      ctx.font = "600 11px Inter, sans-serif";
      ctx.fillText(
        `I = ${active ? current.params.current.toFixed(2) : "0.00"} A`,
        732,
        440,
      );

      wire(
        ctx,
        [
          [325, 92],
          [325, 65],
          [690, 65],
          [690, 315],
        ],
        active,
      );
      wire(
        ctx,
        [
          [420, 92],
          [420, 82],
          [775, 82],
          [775, 315],
        ],
        active,
      );
      ctx.fillStyle = "#fb7185";
      ctx.beginPath();
      ctx.arc(325, 92, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#60a5fa";
      ctx.beginPath();
      ctx.arc(420, 92, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#fb7185";
      ctx.font = "700 16px Inter, sans-serif";
      ctx.textAlign = "right";
      ctx.fillText("+", 313, 97);
      ctx.fillStyle = "#93c5fd";
      ctx.textAlign = "left";
      ctx.fillText("−", 432, 97);

      ctx.textAlign = "left";
      ctx.font = "600 13px Inter, sans-serif";
      ctx.fillStyle = "#67e8f9";
      ctx.fillText(`t = ${state.time.toFixed(1)} s`, 565, 488);
      ctx.fillStyle = "#fde68a";
      ctx.fillText(`UIt = ${state.electricalEnergy.toFixed(0)} J`, 565, 512);

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
        aria-label="Mô phỏng đo nhiệt nóng chảy riêng của nước đá"
      />
    </div>
  );
});
