"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createHeatingRuntime, phaseChangeEndTime, phaseLabel, solidHeatingDuration, totalHeatingTime } from "./physics";
import type { HeatingParams, HeatingPoint, HeatingSnapshot } from "./types";
import { useContainerSize } from "../shared/use-container-size";
import { ZoomControls } from "../shared/zoom-controls";

type TrailPoint = HeatingPoint;

export function HeatingCurveCanvas({
  params,
  running,
  resetSignal,
  stepSignal,
  onSnapshot,
}: {
  params: HeatingParams;
  running: boolean;
  resetSignal: number;
  stepSignal: number;
  onSnapshot: (snapshot: HeatingSnapshot) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const transformRef = useRef<HTMLDivElement>(null);
  const runtimeRef = useRef<ReturnType<typeof createHeatingRuntime> | null>(null);
  const trailRef = useRef<TrailPoint[]>([]);
  const lastFrameRef = useRef<number | null>(null);
  const accumulatorRef = useRef(0);
  const lastRecordedTimeRef = useRef(-Infinity);
  const stepSignalRef = useRef(stepSignal);
  const lastStepSignalRef = useRef(stepSignal);
  const paramsRef = useRef(params);
  const onSnapshotRef = useRef(onSnapshot);
  const { ref: containerRef, size } = useContainerSize<HTMLDivElement>();
  const [zoomPct, setZoomPct] = useState(100);
  const zoomRef = useRef(1);
  const panRef = useRef({ x: 0, y: 0 });
  const zoomActionsRef = useRef<{ in: () => void; out: () => void } | null>(null);

  useEffect(() => {
    paramsRef.current = params;
    onSnapshotRef.current = onSnapshot;
    stepSignalRef.current = stepSignal;
  }, [onSnapshot, params, stepSignal]);

  const runtimeKey = useMemo(
    () => [params.initialTemperature, params.meltingPoint, params.solidHeatingRate, params.phaseChangeDuration, params.liquidHeatingRate, params.liquidHeatingDuration].join("|"),
    [params],
  );

  useEffect(() => {
    if (size.width <= 0 || size.height <= 0) return;
    const runtime = createHeatingRuntime(paramsRef.current);
    runtimeRef.current = runtime;
    const initial = runtime.snapshot();
    trailRef.current = [initial];
    lastRecordedTimeRef.current = 0;
    accumulatorRef.current = 0;
    lastFrameRef.current = null;
    lastStepSignalRef.current = stepSignalRef.current;
    onSnapshotRef.current({ ...initial, elapsedHeatingTime: initial.time });
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

    const draw = () => {
      const currentParams = paramsRef.current;
      ctx.textAlign = "left";
      ctx.textBaseline = "alphabetic";
      const total = Math.max(1, totalHeatingTime(currentParams));
      const finalTemperature = currentParams.meltingPoint + currentParams.liquidHeatingRate * currentParams.liquidHeatingDuration;
      const minTemperature = Math.min(-10, currentParams.initialTemperature - 2);
      const maxTemperature = Math.max(12, finalTemperature + 2);
      const apparatusWidth = Math.min(210, Math.max(94, size.width * 0.24));
      const chart = { left: apparatusWidth + 32, top: 54, right: size.width - 26, bottom: size.height - 52 };
      const chartWidth = Math.max(20, chart.right - chart.left);
      const chartHeight = Math.max(20, chart.bottom - chart.top);
      const x = (time: number) => chart.left + (time / total) * chartWidth;
      const y = (temperature: number) => chart.bottom - ((temperature - minTemperature) / (maxTemperature - minTemperature)) * chartHeight;
      const trail = trailRef.current;
      const latestPoint = trail.at(-1);

      ctx.fillStyle = "#0f172a";
      ctx.fillRect(0, 0, size.width, size.height);

      ctx.fillStyle = "rgba(226, 232, 240, 0.9)";
      ctx.font = "600 13px Inter, sans-serif";
      ctx.fillText("Đun nóng và đồ thị nhiệt độ - thời gian", 16, 25);

      // Thỏi sắt nằm cạnh đồ thị; màu tăng từ xám sang đỏ theo nhiệt độ hiện tại.
      const apparatusX = apparatusWidth * 0.5;
      const barWidth = Math.min(112, apparatusWidth * 0.72);
      const barHeight = Math.min(28, Math.max(18, size.height * 0.065));
      const barCenterY = Math.max(150, size.height * 0.42);
      const barTop = barCenterY - barHeight / 2;
      const flameBase = barTop + barHeight + 36;
      const currentTemperature = latestPoint?.temperature ?? currentParams.initialTemperature;
      const redHeat = Math.max(0, Math.min(1, (currentTemperature - 350) / 850));
      const ironRed = Math.round(92 + redHeat * 150);
      const ironGreen = Math.round(100 - redHeat * 72);
      const ironBlue = Math.round(108 - redHeat * 96);
      ctx.textAlign = "center";
      ctx.fillStyle = "rgba(226, 232, 240, 0.86)";
      ctx.font = "600 11px Inter, sans-serif";
      ctx.fillText("Thỏi sắt đang đun", apparatusX, barTop - 25);
      ctx.fillStyle = "rgba(148, 163, 184, 0.85)";
      ctx.font = "10px ui-monospace, SFMono-Regular, Menlo, monospace";
      ctx.fillText(`${currentTemperature.toFixed(0)}°C`, apparatusX, barTop - 10);
      ctx.fillStyle = `rgb(${ironRed}, ${ironGreen}, ${ironBlue})`;
      ctx.beginPath();
      ctx.roundRect(apparatusX - barWidth / 2, barTop, barWidth, barHeight, 5);
      ctx.fill();
      ctx.strokeStyle = redHeat > 0.2 ? "#fed7aa" : "#cbd5e1";
      ctx.lineWidth = 1.5;
      ctx.stroke();
      if (redHeat > 0.05) {
        ctx.strokeStyle = `rgba(251, 113, 133, ${(0.25 + redHeat * 0.65).toFixed(2)})`;
        ctx.lineWidth = 5 + redHeat * 5;
        ctx.stroke();
      }
      ctx.strokeStyle = "rgba(148, 163, 184, 0.85)";
      ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(apparatusX - barWidth * 0.62, flameBase); ctx.lineTo(apparatusX + barWidth * 0.62, flameBase); ctx.stroke();
      ctx.fillStyle = "rgba(251, 146, 60, 0.95)";
      ctx.beginPath();
      ctx.moveTo(apparatusX, flameBase + 26);
      ctx.bezierCurveTo(apparatusX - 18, flameBase + 10, apparatusX - 10, flameBase - 4, apparatusX, flameBase - 18);
      ctx.bezierCurveTo(apparatusX + 10, flameBase - 5, apparatusX + 18, flameBase + 10, apparatusX, flameBase + 26);
      ctx.fill();
      ctx.fillStyle = "rgba(255, 247, 237, 0.72)";
      ctx.font = "10px Inter, sans-serif";
      ctx.fillText("Bếp lửa", apparatusX, flameBase + 44);
      if (currentParams.showThermometer) {
        const thermometerX = apparatusX + barWidth * 0.42;
        const thermometerTop = barTop - 12;
        const thermometerBottom = barTop + barHeight + 5;
        ctx.strokeStyle = "rgba(251, 113, 133, 0.9)";
        ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.moveTo(thermometerX, thermometerBottom); ctx.lineTo(thermometerX, thermometerTop); ctx.stroke();
        ctx.fillStyle = "#fb7185";
        ctx.beginPath(); ctx.arc(thermometerX, thermometerBottom, 5, 0, Math.PI * 2); ctx.fill();
      }

      ctx.strokeStyle = "rgba(148, 163, 184, 0.15)";
      ctx.lineWidth = 1;
      for (let i = 0; i <= 5; i += 1) {
        const temperature = minTemperature + ((maxTemperature - minTemperature) / 5) * i;
        ctx.beginPath(); ctx.moveTo(chart.left, y(temperature)); ctx.lineTo(chart.right, y(temperature)); ctx.stroke();
        ctx.fillStyle = "rgba(203, 213, 225, 0.7)";
        ctx.font = "10px ui-monospace, SFMono-Regular, Menlo, monospace";
        ctx.textAlign = "right";
        ctx.fillText(`${temperature.toFixed(0)}°C`, chart.left - 8, y(temperature) + 3);
      }
      const timeTicks = 4;
      for (let i = 0; i <= timeTicks; i += 1) {
        const time = (total / timeTicks) * i;
        ctx.strokeStyle = "rgba(148, 163, 184, 0.12)";
        ctx.beginPath(); ctx.moveTo(x(time), chart.top); ctx.lineTo(x(time), chart.bottom); ctx.stroke();
        ctx.fillStyle = "rgba(203, 213, 225, 0.7)";
        ctx.textAlign = "center";
        ctx.fillText(`${time.toFixed(0)}`, x(time), chart.bottom + 18);
      }

      ctx.strokeStyle = "rgba(226, 232, 240, 0.85)";
      ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(chart.left, chart.bottom); ctx.lineTo(chart.right + 8, chart.bottom); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(chart.left, chart.bottom); ctx.lineTo(chart.left, chart.top - 8); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(chart.right + 8, chart.bottom); ctx.lineTo(chart.right + 2, chart.bottom - 3); ctx.moveTo(chart.right + 8, chart.bottom); ctx.lineTo(chart.right + 2, chart.bottom + 3); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(chart.left, chart.top - 8); ctx.lineTo(chart.left - 3, chart.top - 2); ctx.moveTo(chart.left, chart.top - 8); ctx.lineTo(chart.left + 3, chart.top - 2); ctx.stroke();
      ctx.textAlign = "left";
      ctx.fillStyle = "rgba(226, 232, 240, 0.9)";
      ctx.font = "11px Inter, sans-serif";
      ctx.fillText("Nhiệt độ (°C)", chart.left + 4, chart.top - 16);
      ctx.textAlign = "right";
      ctx.fillText("Thời gian (phút)", chart.right + 4, chart.bottom + 36);

      if (currentParams.showGuides) {
        const guideTimes = [solidHeatingDuration(currentParams), phaseChangeEndTime(currentParams), total];
        const guideTemperatures = [currentParams.meltingPoint, currentParams.meltingPoint, finalTemperature];
        ctx.setLineDash([5, 5]);
        ctx.strokeStyle = "rgba(251, 191, 36, 0.5)";
        for (let i = 0; i < guideTimes.length; i += 1) {
          ctx.beginPath(); ctx.moveTo(x(guideTimes[i]!), y(guideTemperatures[i]!)); ctx.lineTo(x(guideTimes[i]!), chart.bottom); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(chart.left, y(guideTemperatures[i]!)); ctx.lineTo(x(guideTimes[i]!), y(guideTemperatures[i]!)); ctx.stroke();
        }
        ctx.setLineDash([]);
      }

      if (trail.length > 0) {
        ctx.strokeStyle = "#f59e0b";
        ctx.lineWidth = 2.5;
        ctx.lineJoin = "round";
        ctx.beginPath();
        trail.forEach((point, index) => {
          if (index === 0) ctx.moveTo(x(point.time), y(point.temperature));
          else ctx.lineTo(x(point.time), y(point.temperature));
        });
        ctx.stroke();
        if (currentParams.showSamples) {
          ctx.fillStyle = "#fdba74";
          for (const point of trail) {
            ctx.beginPath(); ctx.arc(x(point.time), y(point.temperature), 2.5, 0, Math.PI * 2); ctx.fill();
          }
        }
        const latest = trail[trail.length - 1]!;
        ctx.fillStyle = "#fb7185";
        ctx.beginPath(); ctx.arc(x(latest.time), y(latest.temperature), 4.5, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = "#fff7ed"; ctx.lineWidth = 1.2; ctx.stroke();
        ctx.textAlign = "left";
        ctx.fillStyle = "rgba(255, 247, 237, 0.95)";
        ctx.font = "600 11px Inter, sans-serif";
        ctx.fillText(`${latest.temperature.toFixed(1)}°C`, Math.min(chart.right - 42, x(latest.time) + 8), y(latest.temperature) - 8);
      }

      const latest = trail[trail.length - 1];
      if (latest) {
        ctx.textAlign = "left";
        ctx.fillStyle = "rgba(226, 232, 240, 0.75)";
        ctx.font = "11px ui-monospace, SFMono-Regular, Menlo, monospace";
        ctx.fillText(`t = ${latest.time.toFixed(1)} phút`, 16, size.height - 16);
        ctx.textAlign = "right";
        ctx.fillText(phaseLabel(latest.phase), size.width - 16, 42);
      }
    };

    const recordStep = () => {
      const runtime = runtimeRef.current;
      if (!runtime) return;
      const point = runtime.step(1 / 120);
      if (point.time - lastRecordedTimeRef.current >= 0.1 || point.phase !== trailRef.current.at(-1)?.phase || point.time >= totalHeatingTime(paramsRef.current)) {
        trailRef.current.push(point);
        lastRecordedTimeRef.current = point.time;
        onSnapshotRef.current({ ...point, elapsedHeatingTime: point.time });
      }
    };

    const animate = (now: number) => {
      const previous = lastFrameRef.current ?? now;
      lastFrameRef.current = now;
      const frameSeconds = Math.min(0.08, Math.max(0, (now - previous) / 1000));
      if (runtimeRef.current && lastStepSignalRef.current !== stepSignalRef.current) {
        lastStepSignalRef.current = stepSignalRef.current;
        recordStep();
      }
      if (running && runtimeRef.current) {
        accumulatorRef.current += frameSeconds * paramsRef.current.speed;
        let guard = 0;
        while (accumulatorRef.current >= HEATING_DT_SECONDS && guard < 24) {
          recordStep();
          accumulatorRef.current -= HEATING_DT_SECONDS;
          guard += 1;
        }
      }
      draw();
      animationFrame = requestAnimationFrame(animate);
    };
    const HEATING_DT_SECONDS = 1 / 120;
    let animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [params.showGuides, params.showSamples, params.showThermometer, params.speed, resetSignal, running, size.height, size.width]);

  useEffect(() => {
    const container = containerRef.current;
    const transformEl = transformRef.current;
    if (!container || !transformEl || size.width <= 0 || size.height <= 0) return;
    const minZoom = 0.8;
    const maxZoom = 6;
    const applyTransform = () => { transformEl.style.transform = `translate(${panRef.current.x}px, ${panRef.current.y}px) scale(${zoomRef.current})`; };
    const clampPan = (pan: { x: number; y: number }, zoom: number) => ({
      x: Math.min(0, Math.max(size.width * (1 - zoom), pan.x)),
      y: Math.min(0, Math.max(size.height * (1 - zoom), pan.y)),
    });
    const applyZoom = (nextZoom: number, focal?: { x: number; y: number }) => {
      const clamped = Math.min(maxZoom, Math.max(minZoom, nextZoom));
      const focus = focal ?? { x: size.width / 2, y: size.height / 2 };
      const world = { x: (focus.x - panRef.current.x) / zoomRef.current, y: (focus.y - panRef.current.y) / zoomRef.current };
      zoomRef.current = clamped;
      panRef.current = clampPan({ x: focus.x - world.x * clamped, y: focus.y - world.y * clamped }, clamped);
      applyTransform();
      setZoomPct(Math.round(clamped * 100));
    };
    zoomActionsRef.current = { in: () => applyZoom(zoomRef.current * 1.3), out: () => applyZoom(zoomRef.current / 1.3) };
    applyTransform();
    let dragging = false;
    const start = { x: 0, y: 0, panX: 0, panY: 0 };
    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 0 || event.target !== canvasRef.current) return;
      dragging = true; start.x = event.clientX; start.y = event.clientY; start.panX = panRef.current.x; start.panY = panRef.current.y;
      container.setPointerCapture(event.pointerId);
    };
    const onPointerMove = (event: PointerEvent) => {
      if (!dragging) return;
      panRef.current = clampPan({ x: start.panX + event.clientX - start.x, y: start.panY + event.clientY - start.y }, zoomRef.current);
      applyTransform();
    };
    const onPointerUp = (event: PointerEvent) => { dragging = false; if (container.hasPointerCapture(event.pointerId)) container.releasePointerCapture(event.pointerId); };
    const onWheel = (event: WheelEvent) => {
      if (event.target !== canvasRef.current) return;
      event.preventDefault();
      const rect = container.getBoundingClientRect();
      applyZoom(event.deltaY > 0 ? zoomRef.current / 1.08 : zoomRef.current * 1.08, { x: event.clientX - rect.left, y: event.clientY - rect.top });
    };
    container.addEventListener("pointerdown", onPointerDown);
    container.addEventListener("pointermove", onPointerMove);
    container.addEventListener("pointerup", onPointerUp);
    container.addEventListener("pointercancel", onPointerUp);
    container.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      container.removeEventListener("pointerdown", onPointerDown); container.removeEventListener("pointermove", onPointerMove);
      container.removeEventListener("pointerup", onPointerUp); container.removeEventListener("pointercancel", onPointerUp); container.removeEventListener("wheel", onWheel);
    };
  }, [containerRef, size]);

  return (
    <div ref={containerRef} className="relative h-full min-h-[360px] w-full overflow-hidden rounded-lg bg-[#0f172a]">
      <div ref={transformRef} className="absolute inset-0" style={{ transformOrigin: "0 0" }}>
        <canvas ref={canvasRef} className="absolute inset-0 block h-full w-full touch-none cursor-grab active:cursor-grabbing" aria-label="Mô phỏng đun nóng và đồ thị nhiệt độ theo thời gian" />
      </div>
      <ZoomControls percent={zoomPct} onZoomIn={() => zoomActionsRef.current?.in()} onZoomOut={() => zoomActionsRef.current?.out()} />
    </div>
  );
}
