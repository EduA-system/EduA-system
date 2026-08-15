"use client";

import { simulationCanvasFont } from "@/components/simulations/shared/typography";

import { useEffect, useMemo, useRef, useState } from "react";
import { createHeatingRuntime, phaseChangeEndTime, phaseLabel, sampleHeatingCurve, solidHeatingDuration, totalHeatingTime } from "./physics";
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
      const total = Math.max(1, totalHeatingTime(currentParams));
      const solidEnd = solidHeatingDuration(currentParams);
      const phaseEnd = phaseChangeEndTime(currentParams);
      const finalTemperature = currentParams.meltingPoint + currentParams.liquidHeatingRate * currentParams.liquidHeatingDuration;
      const temperatureStep = finalTemperature <= 500 ? 100 : finalTemperature <= 1200 ? 250 : 500;
      const maxTemperature = Math.max(temperatureStep, Math.ceil(finalTemperature / temperatureStep) * temperatureStep);
      const apparatusWidth = size.width < 760 ? Math.max(150, size.width * 0.22) : Math.min(250, size.width * 0.23);
      const chart = { left: apparatusWidth + 48, top: 76, right: size.width - 26, bottom: size.height - 58 };
      const chartWidth = Math.max(20, chart.right - chart.left);
      const chartHeight = Math.max(20, chart.bottom - chart.top);
      const x = (time: number) => chart.left + (time / total) * chartWidth;
      const y = (temperature: number) => chart.bottom - (temperature / maxTemperature) * chartHeight;
      const trail = trailRef.current;
      const latest = trail.at(-1);
      const currentTemperature = latest?.temperature ?? currentParams.initialTemperature;

      ctx.textBaseline = "alphabetic";
      const background = ctx.createLinearGradient(0, 0, size.width, size.height);
      background.addColorStop(0, "#0b1425");
      background.addColorStop(1, "#111b30");
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, size.width, size.height);

      // Compact apparatus card keeps the experiment visible without competing with the graph.
      const card = {
        x: 18,
        y: 76,
        width: Math.max(122, apparatusWidth - 14),
        height: Math.min(322, Math.max(246, size.height - 170)),
      };
      ctx.fillStyle = "rgba(5, 12, 27, 0.52)";
      ctx.strokeStyle = "rgba(148, 163, 184, 0.18)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(card.x, card.y, card.width, card.height, 16);
      ctx.fill();
      ctx.stroke();

      const apparatusX = card.x + card.width / 2;
      ctx.textAlign = "center";
      ctx.fillStyle = "rgba(148, 163, 184, 0.78)";
      ctx.font = simulationCanvasFont("10px", 500);
      ctx.fillText("MẪU VẬT", apparatusX, card.y + 24);
      ctx.fillStyle = "#f8fafc";
      ctx.font = simulationCanvasFont("22px", 600);
      ctx.fillText(`${currentTemperature.toFixed(1)}°C`, apparatusX, card.y + 53);
      ctx.fillStyle = "rgba(203, 213, 225, 0.72)";
      ctx.font = simulationCanvasFont("11px");
      ctx.fillText(latest ? phaseLabel(latest.phase) : "Đun nóng thỏi sắt", apparatusX, card.y + 73);

      const redHeat = Math.max(0, Math.min(1, (currentTemperature - 300) / 1000));
      const ironRed = Math.round(92 + redHeat * 160);
      const ironGreen = Math.round(103 - redHeat * 68);
      const ironBlue = Math.round(115 - redHeat * 91);
      const barWidth = Math.min(132, card.width * 0.7);
      const barHeight = 31;
      const barTop = card.y + 118;
      const barLeft = apparatusX - barWidth / 2;

      if (redHeat > 0.04) {
        ctx.save();
        ctx.shadowColor = `rgba(251, 93, 74, ${0.25 + redHeat * 0.55})`;
        ctx.shadowBlur = 18 + redHeat * 22;
        ctx.fillStyle = `rgb(${ironRed}, ${ironGreen}, ${ironBlue})`;
        ctx.beginPath();
        ctx.roundRect(barLeft, barTop, barWidth, barHeight, 7);
        ctx.fill();
        ctx.restore();
      }
      const metal = ctx.createLinearGradient(barLeft, 0, barLeft + barWidth, 0);
      metal.addColorStop(0, `rgb(${Math.max(0, ironRed - 24)}, ${Math.max(0, ironGreen - 20)}, ${Math.max(0, ironBlue - 14)})`);
      metal.addColorStop(0.5, `rgb(${ironRed + 10}, ${ironGreen + 10}, ${ironBlue + 10})`);
      metal.addColorStop(1, `rgb(${Math.max(0, ironRed - 18)}, ${Math.max(0, ironGreen - 16)}, ${Math.max(0, ironBlue - 12)})`);
      ctx.fillStyle = metal;
      ctx.beginPath();
      ctx.roundRect(barLeft, barTop, barWidth, barHeight, 7);
      ctx.fill();
      ctx.strokeStyle = redHeat > 0.2 ? "rgba(254, 215, 170, 0.88)" : "rgba(226, 232, 240, 0.72)";
      ctx.stroke();

      if (currentParams.showThermometer) {
        const thermometerX = barLeft + barWidth - 11;
        const thermometerTop = barTop - 22;
        const thermometerBottom = barTop + barHeight + 4;
        ctx.strokeStyle = "rgba(248, 250, 252, 0.75)";
        ctx.lineWidth = 5;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(thermometerX, thermometerTop);
        ctx.lineTo(thermometerX, thermometerBottom);
        ctx.stroke();
        ctx.strokeStyle = "#fb7185";
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(thermometerX, thermometerTop + 6);
        ctx.lineTo(thermometerX, thermometerBottom);
        ctx.stroke();
        ctx.fillStyle = "#fb7185";
        ctx.beginPath();
        ctx.arc(thermometerX, thermometerBottom, 5, 0, Math.PI * 2);
        ctx.fill();
      }

      const barBottom = barTop + barHeight;
      const supportY = barBottom + 15;
      const burnerNozzleY = barBottom + 75;
      const burnerBottomY = burnerNozzleY + 45;

      // Giá đỡ hai càng giữ thỏi sắt ngay phía trên đầu đốt.
      ctx.strokeStyle = "rgba(148, 163, 184, 0.82)";
      ctx.lineWidth = 4;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(barLeft + 12, barBottom + 2);
      ctx.lineTo(barLeft + 12, supportY);
      ctx.lineTo(barLeft + 25, supportY);
      ctx.moveTo(barLeft + barWidth - 12, barBottom + 2);
      ctx.lineTo(barLeft + barWidth - 12, supportY);
      ctx.lineTo(barLeft + barWidth - 25, supportY);
      ctx.stroke();

      // Chân kiềng mở rộng xuống đế, tạo cảm giác thỏi sắt được kê chắc chắn.
      ctx.strokeStyle = "rgba(100, 116, 139, 0.72)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(barLeft + 22, supportY);
      ctx.lineTo(apparatusX - 46, burnerBottomY + 3);
      ctx.moveTo(barLeft + barWidth - 22, supportY);
      ctx.lineTo(apparatusX + 46, burnerBottomY + 3);
      ctx.stroke();

      // Ngọn lửa đi từ vòi bếp và chạm trực tiếp vào đáy thỏi sắt.
      const flameSway = Math.sin(performance.now() / 150) * 2.2;
      ctx.save();
      ctx.shadowColor = "rgba(249, 115, 22, 0.75)";
      ctx.shadowBlur = 20;
      const outerFlame = ctx.createLinearGradient(0, burnerNozzleY, 0, barBottom);
      outerFlame.addColorStop(0, "#2563eb");
      outerFlame.addColorStop(0.28, "#38bdf8");
      outerFlame.addColorStop(0.55, "#fb923c");
      outerFlame.addColorStop(1, "#fde68a");
      ctx.fillStyle = outerFlame;
      ctx.beginPath();
      ctx.moveTo(apparatusX - 15, burnerNozzleY);
      ctx.bezierCurveTo(apparatusX - 22, burnerNozzleY - 25, apparatusX - 13 + flameSway, barBottom + 24, apparatusX + flameSway, barBottom - 2);
      ctx.bezierCurveTo(apparatusX + 13 + flameSway, barBottom + 24, apparatusX + 22, burnerNozzleY - 25, apparatusX + 15, burnerNozzleY);
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = "rgba(239, 246, 255, 0.9)";
      ctx.beginPath();
      ctx.moveTo(apparatusX - 6, burnerNozzleY - 1);
      ctx.bezierCurveTo(apparatusX - 9, burnerNozzleY - 19, apparatusX - 4 + flameSway * 0.45, barBottom + 37, apparatusX + flameSway * 0.45, barBottom + 24);
      ctx.bezierCurveTo(apparatusX + 5 + flameSway * 0.45, barBottom + 39, apparatusX + 9, burnerNozzleY - 18, apparatusX + 6, burnerNozzleY - 1);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      // Bếp gas thí nghiệm: vòi đốt, thân bếp và đế chống trượt.
      const burnerGradient = ctx.createLinearGradient(apparatusX - 18, 0, apparatusX + 18, 0);
      burnerGradient.addColorStop(0, "#475569");
      burnerGradient.addColorStop(0.5, "#cbd5e1");
      burnerGradient.addColorStop(1, "#334155");
      ctx.fillStyle = burnerGradient;
      ctx.beginPath();
      ctx.roundRect(apparatusX - 10, burnerNozzleY - 2, 20, 38, 5);
      ctx.fill();
      ctx.fillStyle = "#1e293b";
      ctx.beginPath();
      ctx.roundRect(apparatusX - 16, burnerNozzleY - 5, 32, 8, 4);
      ctx.fill();
      ctx.strokeStyle = "rgba(226, 232, 240, 0.52)";
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = "#64748b";
      ctx.beginPath();
      ctx.roundRect(apparatusX - 39, burnerBottomY - 10, 78, 13, 6);
      ctx.fill();
      ctx.strokeStyle = "rgba(203, 213, 225, 0.6)";
      ctx.stroke();
      ctx.fillStyle = "#334155";
      ctx.beginPath();
      ctx.roundRect(apparatusX - 46, burnerBottomY, 92, 8, 4);
      ctx.fill();

      ctx.fillStyle = "#e2e8f0";
      ctx.beginPath();
      ctx.arc(apparatusX + 17, burnerNozzleY + 27, 4, 0, Math.PI * 2);
      ctx.fill();

      const progress = Math.min(1, (latest?.time ?? 0) / total);
      const progressY = card.y + card.height - 29;
      ctx.fillStyle = "rgba(71, 85, 105, 0.72)";
      ctx.beginPath();
      ctx.roundRect(card.x + 16, progressY, card.width - 32, 5, 3);
      ctx.fill();
      ctx.fillStyle = "#f59e0b";
      ctx.beginPath();
      ctx.roundRect(card.x + 16, progressY, (card.width - 32) * progress, 5, 3);
      ctx.fill();
      ctx.fillStyle = "rgba(203, 213, 225, 0.66)";
      ctx.font = simulationCanvasFont("10px");
      ctx.fillText(`${(latest?.time ?? 0).toFixed(1)} / ${total.toFixed(1)} phút`, apparatusX, progressY + 20);

      // A faint complete curve gives context; the bright line remains the live measurement.
      ctx.save();
      ctx.beginPath();
      ctx.rect(chart.left, chart.top, chartWidth, chartHeight);
      ctx.clip();
      const phaseBands = [
        { start: 0, end: solidEnd, color: "rgba(56, 189, 248, 0.035)" },
        { start: solidEnd, end: phaseEnd, color: "rgba(251, 191, 36, 0.055)" },
        { start: phaseEnd, end: total, color: "rgba(251, 113, 133, 0.035)" },
      ];
      for (const band of phaseBands) {
        ctx.fillStyle = band.color;
        ctx.fillRect(x(band.start), chart.top, Math.max(0, x(band.end) - x(band.start)), chartHeight);
      }
      ctx.restore();

      ctx.font = simulationCanvasFont("10px");
      ctx.lineWidth = 1;
      ctx.textAlign = "right";
      for (let temperature = 0; temperature <= maxTemperature; temperature += temperatureStep) {
        const tickY = y(temperature);
        ctx.strokeStyle = "rgba(148, 163, 184, 0.13)";
        ctx.beginPath();
        ctx.moveTo(chart.left, tickY);
        ctx.lineTo(chart.right, tickY);
        ctx.stroke();
        ctx.fillStyle = "rgba(203, 213, 225, 0.7)";
        ctx.fillText(`${temperature}°C`, chart.left - 9, tickY + 3);
      }
      for (let i = 0; i <= 5; i += 1) {
        const time = (total / 5) * i;
        const tickX = x(time);
        ctx.strokeStyle = "rgba(148, 163, 184, 0.1)";
        ctx.beginPath();
        ctx.moveTo(tickX, chart.top);
        ctx.lineTo(tickX, chart.bottom);
        ctx.stroke();
        ctx.fillStyle = "rgba(203, 213, 225, 0.7)";
        ctx.textAlign = "center";
        ctx.fillText(time.toFixed(time < 10 && total < 10 ? 1 : 0), tickX, chart.bottom + 19);
      }

      ctx.strokeStyle = "rgba(226, 232, 240, 0.75)";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(chart.left, chart.top);
      ctx.lineTo(chart.left, chart.bottom);
      ctx.lineTo(chart.right, chart.bottom);
      ctx.stroke();
      ctx.textAlign = "left";
      ctx.fillStyle = "rgba(226, 232, 240, 0.82)";
      ctx.font = simulationCanvasFont("11px", 500);
      ctx.fillText("Nhiệt độ (°C)", chart.left, chart.top - 26);
      ctx.textAlign = "right";
      ctx.fillText("Thời gian (phút)", chart.right, chart.bottom + 38);

      const phaseLabels = [
        { start: 0, end: solidEnd, label: "Đun nóng rắn", color: "#7dd3fc" },
        { start: solidEnd, end: phaseEnd, label: "Nóng chảy", color: "#fbbf24" },
        { start: phaseEnd, end: total, label: "Đun nóng lỏng", color: "#fda4af" },
      ];
      ctx.font = simulationCanvasFont("10px", 500);
      for (const section of phaseLabels) {
        if (x(section.end) - x(section.start) < 58) continue;
        ctx.textAlign = "center";
        ctx.fillStyle = section.color;
        ctx.fillText(section.label, (x(section.start) + x(section.end)) / 2, chart.top - 9);
      }

      if (currentParams.showGuides) {
        ctx.setLineDash([4, 5]);
        ctx.lineWidth = 1;
        ctx.strokeStyle = "rgba(251, 191, 36, 0.38)";
        for (const time of [solidEnd, phaseEnd]) {
          ctx.beginPath();
          ctx.moveTo(x(time), chart.top);
          ctx.lineTo(x(time), chart.bottom);
          ctx.stroke();
        }
        ctx.beginPath();
        ctx.moveTo(x(solidEnd), y(currentParams.meltingPoint));
        ctx.lineTo(x(phaseEnd), y(currentParams.meltingPoint));
        ctx.stroke();
        ctx.setLineDash([]);
      }

      const reference = sampleHeatingCurve(currentParams, Math.max(0.08, total / 180));
      ctx.save();
      ctx.strokeStyle = "rgba(148, 163, 184, 0.36)";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 6]);
      ctx.beginPath();
      reference.forEach((point, index) => {
        if (index === 0) ctx.moveTo(x(point.time), y(point.temperature));
        else ctx.lineTo(x(point.time), y(point.temperature));
      });
      ctx.stroke();
      ctx.restore();

      if (trail.length > 0) {
        const liveGradient = ctx.createLinearGradient(chart.left, 0, chart.right, 0);
        liveGradient.addColorStop(0, "#fbbf24");
        liveGradient.addColorStop(1, "#fb7185");
        ctx.save();
        ctx.strokeStyle = liveGradient;
        ctx.lineWidth = 3;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.shadowColor = "rgba(245, 158, 11, 0.36)";
        ctx.shadowBlur = 8;
        ctx.beginPath();
        trail.forEach((point, index) => {
          if (index === 0) ctx.moveTo(x(point.time), y(point.temperature));
          else ctx.lineTo(x(point.time), y(point.temperature));
        });
        ctx.stroke();
        ctx.restore();

        if (currentParams.showSamples) {
          ctx.fillStyle = "#fdba74";
          for (const point of trail) {
            ctx.beginPath();
            ctx.arc(x(point.time), y(point.temperature), 2.2, 0, Math.PI * 2);
            ctx.fill();
          }
        }

        const pointX = x(latest!.time);
        const pointY = y(latest!.temperature);
        ctx.fillStyle = "#fb7185";
        ctx.beginPath();
        ctx.arc(pointX, pointY, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#fff7ed";
        ctx.lineWidth = 1.5;
        ctx.stroke();

        const markerText = `${latest!.temperature.toFixed(1)}°C`;
        ctx.font = simulationCanvasFont("11px", 600);
        const markerWidth = ctx.measureText(markerText).width + 16;
        const markerX = Math.min(chart.right - markerWidth, pointX + 9);
        const markerY = Math.max(chart.top + 4, pointY - 30);
        ctx.fillStyle = "rgba(15, 23, 42, 0.9)";
        ctx.beginPath();
        ctx.roundRect(markerX, markerY, markerWidth, 23, 7);
        ctx.fill();
        ctx.strokeStyle = "rgba(251, 113, 133, 0.4)";
        ctx.stroke();
        ctx.fillStyle = "#fff7ed";
        ctx.textAlign = "center";
        ctx.fillText(markerText, markerX + markerWidth / 2, markerY + 16);
      }
    };

    const recordStep = (deltaMinutes = 1 / 120, forceRecord = false) => {
      const runtime = runtimeRef.current;
      if (!runtime) return;
      const point = runtime.step(deltaMinutes);
      if (forceRecord || point.time - lastRecordedTimeRef.current >= 0.04 || point.phase !== trailRef.current.at(-1)?.phase || point.time >= totalHeatingTime(paramsRef.current)) {
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
        recordStep(0.1, true);
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
    const minZoom = 1;
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
