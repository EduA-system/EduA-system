"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { HEAT_TRANSFER_DT, HeatTransferRuntime, calculateThermometerFill, temperatureToColor } from "./physics";
import type { HeatTransferParams, HeatTransferSnapshot } from "./types";
import { useContainerSize } from "../shared/use-container-size";
import { ZoomControls } from "../shared/zoom-controls";

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, radius);
}

export function HeatTransferCanvas({
  params,
  running,
  resetSignal,
  onSnapshot,
}: {
  params: HeatTransferParams;
  running: boolean;
  resetSignal: number;
  onSnapshot: (snapshot: HeatTransferSnapshot) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const runtimeRef = useRef<HeatTransferRuntime | null>(null);
  const paramsRef = useRef(params);
  const runningRef = useRef(running);
  const onSnapshotRef = useRef(onSnapshot);
  const frameRef = useRef<number | null>(null);
  const lastFrameRef = useRef<number | null>(null);
  const accumulatorRef = useRef(0);
  const lastSampleRef = useRef(-Infinity);
  const { ref: containerRef, size } = useContainerSize<HTMLDivElement>();
  const [zoomPct, setZoomPct] = useState(100);
  const zoomRef = useRef(1);

  useEffect(() => {
    paramsRef.current = params;
    runningRef.current = running;
    onSnapshotRef.current = onSnapshot;
  }, [onSnapshot, params, running]);

  const runtimeKey = useMemo(
    () => [
      params.initialTemperatureA,
      params.massA,
      params.specificHeatA,
      params.initialTemperatureB,
      params.massB,
      params.specificHeatB,
      params.transferCoefficient,
      params.contacted,
    ].join("|"),
    [params],
  );

  useEffect(() => {
    if (size.width <= 0 || size.height <= 0) return;
    const runtime = new HeatTransferRuntime(paramsRef.current);
    runtimeRef.current = runtime;
    lastFrameRef.current = null;
    accumulatorRef.current = 0;
    lastSampleRef.current = -Infinity;
    onSnapshotRef.current(runtime.snapshot());
  }, [runtimeKey, resetSignal, size.height, size.width]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || size.width <= 0 || size.height <= 0) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(size.width * dpr);
    canvas.height = Math.round(size.height * dpr);
    canvas.style.width = `${size.width}px`;
    canvas.style.height = `${size.height}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const drawThermometer = (x: number, top: number, temperature: number, color: string, label: string) => {
      const compact = size.height < 500;
      const height = Math.min(compact ? 96 : 120, Math.max(compact ? 72 : 86, size.height * 0.2));
      const tubeTop = top + 18;
      const tubeBottom = top + height - 18;
      const fill = calculateThermometerFill(temperature);

      ctx.save();
      ctx.textAlign = "center";
      ctx.fillStyle = "rgba(226, 232, 240, 0.82)";
      ctx.font = "600 11px Inter, sans-serif";
      ctx.fillText(label, x, top + 3);

      ctx.fillStyle = "rgba(226, 232, 240, 0.1)";
      ctx.strokeStyle = "rgba(165, 243, 252, 0.68)";
      ctx.lineWidth = 1.5;
      roundedRect(ctx, x - 9, tubeTop, 18, tubeBottom - tubeTop + 8, 9);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = color;
      roundedRect(ctx, x - 4, tubeBottom - fill * (tubeBottom - tubeTop), 8, fill * (tubeBottom - tubeTop) + 9, 4);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x, top + height, 15, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = "rgba(226, 232, 240, 0.38)";
      ctx.lineWidth = 1;
      for (let index = 0; index <= 4; index += 1) {
        const y = tubeBottom - (tubeBottom - tubeTop) * (index / 4);
        ctx.beginPath();
        ctx.moveTo(x + 12, y);
        ctx.lineTo(x + 21, y);
        ctx.stroke();
      }

      ctx.fillStyle = "#f8fafc";
      ctx.font = "700 16px Inter, sans-serif";
      ctx.fillText(`${temperature.toFixed(1)}°C`, x, top + height + (compact ? 24 : 38));
      ctx.fillStyle = "rgba(226, 232, 240, 0.58)";
      ctx.font = "9px Inter, sans-serif";
      ctx.textAlign = "left";
      ctx.fillText("100°C", x + 25, tubeTop + 4);
      ctx.fillText("50°C", x + 25, (tubeTop + tubeBottom) / 2 + 3);
      ctx.fillText("0°C", x + 25, tubeBottom + 4);
      ctx.restore();
    };

    const drawMolecules = (
      x: number,
      y: number,
      width: number,
      height: number,
      temperature: number,
      time: number,
      side: number,
    ) => {
      if (!paramsRef.current.showMolecules) return;
      const speed = 0.4 + clamp(temperature / 100, 0, 1) * 1.6;
      const count = Math.max(30, Math.min(54, Math.floor(width / 4.2)));
      ctx.save();
      ctx.beginPath();
      ctx.rect(x + 8, y + 8, width - 16, height - 16);
      ctx.clip();
      for (let index = 0; index < count; index += 1) {
        const baseX = 0.08 + ((index * 37 + side * 11) % 84) / 100;
        const baseY = 0.1 + ((index * 53 + side * 17) % 78) / 100;
        const phase = index * 1.73 + side * 0.8;
        const px = x + width * baseX + Math.sin(time * speed * 2.1 + phase) * Math.min(7, width * 0.035);
        const py = y + height * baseY + Math.cos(time * speed * 1.8 + phase) * Math.min(7, height * 0.05);
        ctx.fillStyle = side === 0 ? "rgba(255, 247, 237, 0.64)" : "rgba(207, 250, 254, 0.72)";
        ctx.beginPath();
        ctx.arc(px, py, 1.7, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    };

    const drawBlock = ({
      x,
      y,
      width,
      height,
      color,
      label,
      temperature,
      mass,
      specificHeat,
      status,
      side,
      time,
      compact,
    }: {
      x: number;
      y: number;
      width: number;
      height: number;
      color: string;
      label: string;
      temperature: number;
      mass: number;
      specificHeat: number;
      status: string;
      side: number;
      time: number;
      compact: boolean;
    }) => {
      ctx.fillStyle = color;
      ctx.strokeStyle = "rgba(255, 247, 237, 0.74)";
      ctx.lineWidth = 1.5;
      roundedRect(ctx, x, y, width, height, 14);
      ctx.fill();
      ctx.stroke();

      const sheen = ctx.createLinearGradient(x, y, x + width, y + height);
      sheen.addColorStop(0, "rgba(255, 255, 255, 0.18)");
      sheen.addColorStop(0.45, "rgba(255, 255, 255, 0.05)");
      sheen.addColorStop(1, "rgba(15, 23, 42, 0.16)");
      ctx.fillStyle = sheen;
      roundedRect(ctx, x + 10, y + 10, width - 20, Math.max(26, height * 0.32), 9);
      ctx.fill();

      drawMolecules(x, y, width, height, temperature, time, side);

      ctx.textAlign = "center";
      ctx.fillStyle = "#fff7ed";
      ctx.font = "700 15px Inter, sans-serif";
      ctx.fillText(label, x + width / 2, compact ? y + height - 28 : y + height + 24);
      ctx.font = "600 13px Inter, sans-serif";
      ctx.fillText(`${temperature.toFixed(1)}°C`, x + width / 2, compact ? y + height - 10 : y + height + 44);
      if (compact) return;
      ctx.fillStyle = "rgba(226, 232, 240, 0.72)";
      ctx.font = "10px Inter, sans-serif";
      ctx.fillText(`${mass.toFixed(1)} kg · c = ${specificHeat.toFixed(1)} kJ/kg°C`, x + width / 2, y + height + 62);
      ctx.fillText(status, x + width / 2, y + height + 80);
    };

    const draw = () => {
      const runtime = runtimeRef.current;
      if (!runtime) return;
      const currentParams = paramsRef.current;
      const snapshot = runtime.snapshot();
      const width = size.width;
      const height = size.height;
      const zoom = zoomRef.current;
      const colorA = temperatureToColor(snapshot.temperatureA);
      const colorB = temperatureToColor(snapshot.temperatureB);
      const delta = snapshot.temperatureA - snapshot.temperatureB;
      const isCompact = width < 680;
      const compactHeight = height < 500;
      const blockWidth = Math.min(isCompact ? 150 : 220, Math.max(108, width * (isCompact ? 0.26 : 0.22)));
      const blockHeight = Math.min(compactHeight ? 108 : 145, Math.max(76, height * 0.2));
      const top = 54;
      const blockY = compactHeight ? Math.max(176, height * 0.42) : Math.min(height - 185, Math.max(205, height * 0.43));
      const gap = currentParams.contacted ? 10 : Math.max(34, width * 0.07);
      const centerA = currentParams.contacted ? width / 2 - gap / 2 - blockWidth / 2 : width * 0.27;
      const centerB = currentParams.contacted ? width / 2 + gap / 2 + blockWidth / 2 : width * 0.73;
      const leftA = centerA - blockWidth / 2;
      const leftB = centerB - blockWidth / 2;
      const contactX = (leftA + blockWidth + leftB) / 2;

      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(0, 0, width, height);

      ctx.save();
      ctx.translate(width / 2, height / 2);
      ctx.scale(zoom, zoom);
      ctx.translate(-width / 2, -height / 2);

      ctx.fillStyle = "rgba(226, 232, 240, 0.94)";
      ctx.font = "600 14px Inter, sans-serif";
      ctx.textAlign = "left";
      ctx.fillText("Nguyên lý truyền nhiệt", 18, 28);
      ctx.fillStyle = "rgba(148, 163, 184, 0.82)";
      ctx.font = "11px Inter, sans-serif";
      const statusText = snapshot.phase === "before-contact"
        ? "Hai vật chưa tiếp xúc"
        : snapshot.phase === "equilibrium"
          ? "Hai vật đã đạt cân bằng nhiệt"
          : "Nhiệt truyền từ vật nóng sang vật lạnh";
      ctx.fillText(statusText, 18, 47);

      drawThermometer(centerA, top, snapshot.temperatureA, colorA, "Nhiệt kế A");
      drawThermometer(centerB, top, snapshot.temperatureB, colorB, "Nhiệt kế B");

      drawBlock({
        x: leftA,
        y: blockY,
        width: blockWidth,
        height: blockHeight,
        color: colorA,
        label: "Vật A",
        temperature: snapshot.temperatureA,
        mass: currentParams.massA,
        specificHeat: currentParams.specificHeatA,
        status: snapshot.temperatureA > snapshot.temperatureB ? "Nóng hơn" : snapshot.temperatureA < snapshot.temperatureB ? "Lạnh hơn" : "Cân bằng",
        side: 0,
        time: snapshot.time,
        compact: compactHeight,
      });
      drawBlock({
        x: leftB,
        y: blockY,
        width: blockWidth,
        height: blockHeight,
        color: colorB,
        label: "Vật B",
        temperature: snapshot.temperatureB,
        mass: currentParams.massB,
        specificHeat: currentParams.specificHeatB,
        status: snapshot.temperatureB > snapshot.temperatureA ? "Nóng hơn" : snapshot.temperatureB < snapshot.temperatureA ? "Lạnh hơn" : "Cân bằng",
        side: 1,
        time: snapshot.time,
        compact: compactHeight,
      });

      if (currentParams.contacted && snapshot.phase === "equilibrium") {
        ctx.fillStyle = "rgba(103, 232, 249, 0.95)";
        ctx.font = "700 13px Inter, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("Hai vật đã đạt cân bằng nhiệt", contactX, blockY - 16);
      } else {
        const hintY = blockY + blockHeight * 0.42;
        const hintWidth = Math.min(210, Math.max(128, leftB - (leftA + blockWidth) - 24));
        ctx.fillStyle = "rgba(2, 6, 23, 0.46)";
        roundedRect(ctx, contactX - hintWidth / 2, hintY - 25, hintWidth, 50, 10);
        ctx.fill();
        ctx.strokeStyle = "rgba(148, 163, 184, 0.16)";
        ctx.stroke();
        ctx.fillStyle = "rgba(226, 232, 240, 0.84)";
        ctx.font = "600 11px Inter, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("Chưa tiếp xúc", contactX, hintY - 4);
        ctx.font = "10px Inter, sans-serif";
        ctx.fillText("Bấm nút ở panel", contactX, hintY + 13);
      }

      const panelX = 18;
      const narrowPanel = width < 720;
      const panelHeight = narrowPanel ? 76 : 72;
      const panelY = height - panelHeight - 20;
      const panelWidth = Math.max(260, width - 36);
      roundedRect(ctx, panelX, panelY, panelWidth, panelHeight, 10);
      ctx.fillStyle = "rgba(2, 6, 23, 0.44)";
      ctx.fill();
      ctx.strokeStyle = "rgba(148, 163, 184, 0.14)";
      ctx.stroke();

      const tempBarWidth = narrowPanel ? Math.max(82, panelWidth * 0.32) : Math.max(95, panelWidth * 0.34);
      ctx.textAlign = "left";
      ctx.font = "10px Inter, sans-serif";
      ctx.fillStyle = "rgba(226, 232, 240, 0.78)";
      ctx.fillText(`TA: ${snapshot.temperatureA.toFixed(1)}°C`, panelX + 12, panelY + 19);
      ctx.fillText(`TB: ${snapshot.temperatureB.toFixed(1)}°C`, panelX + 12, panelY + 38);
      ctx.fillText(`ΔT: ${delta.toFixed(1)}°C`, panelX + 12, panelY + 57);
      ctx.fillStyle = "rgba(148, 163, 184, 0.2)";
      ctx.fillRect(panelX + 82, panelY + 13, tempBarWidth, 7);
      ctx.fillRect(panelX + 82, panelY + 32, tempBarWidth, 7);
      ctx.fillStyle = colorA;
      ctx.fillRect(panelX + 82, panelY + 13, tempBarWidth * clamp(snapshot.temperatureA / 100, 0, 1), 7);
      ctx.fillStyle = colorB;
      ctx.fillRect(panelX + 82, panelY + 32, tempBarWidth * clamp(snapshot.temperatureB / 100, 0, 1), 7);

      const heatX = panelX + tempBarWidth + 112;
      ctx.fillStyle = "rgba(226, 232, 240, 0.78)";
      ctx.fillText(`Q A mất: ${snapshot.heatLostA.toFixed(2)} kJ`, heatX, panelY + 19);
      ctx.fillText(`Q B nhận: ${snapshot.heatReceivedB.toFixed(2)} kJ`, heatX, panelY + 38);
      ctx.fillText(`T cân bằng: ${snapshot.equilibriumTemperature.toFixed(1)}°C`, heatX, panelY + 57);

      ctx.restore();
    };

    const animate = (now: number) => {
      const previous = lastFrameRef.current ?? now;
      lastFrameRef.current = now;
      const frameSeconds = Math.min(0.08, Math.max(0, (now - previous) / 1000));
      if (runningRef.current && runtimeRef.current) {
        accumulatorRef.current += frameSeconds * paramsRef.current.speed;
        let steps = 0;
        while (accumulatorRef.current >= HEAT_TRANSFER_DT && steps < 24) {
          runtimeRef.current.step(HEAT_TRANSFER_DT);
          accumulatorRef.current -= HEAT_TRANSFER_DT;
          steps += 1;
        }
        const snapshot = runtimeRef.current.snapshot();
        if (snapshot.time - lastSampleRef.current >= 0.05) {
          lastSampleRef.current = snapshot.time;
          onSnapshotRef.current(snapshot);
        }
      }
      draw();
      frameRef.current = requestAnimationFrame(animate);
    };

    frameRef.current = requestAnimationFrame(animate);
    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    };
  }, [size.height, size.width]);

  const setZoom = (next: number) => {
    zoomRef.current = clamp(next, 1, 1.8);
    setZoomPct(Math.round(zoomRef.current * 100));
  };

  return (
    <div ref={containerRef} className="relative h-full min-h-[360px] w-full overflow-hidden rounded-lg bg-[#0f172a]">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 block h-full w-full"
        aria-label="Mô phỏng nguyên lý truyền nhiệt"
      />
      <ZoomControls
        percent={zoomPct}
        onZoomIn={() => setZoom(zoomRef.current + 0.1)}
        onZoomOut={() => setZoom(zoomRef.current - 0.1)}
      />
    </div>
  );
}
