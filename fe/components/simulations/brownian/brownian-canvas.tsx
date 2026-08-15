"use client";

import { simulationCanvasFont } from "@/components/simulations/shared/typography";

import { useEffect, useMemo, useRef, useState } from "react";
import { BrownianRuntime, getPhysicsDt, getWorldBounds } from "./physics";
import type { BrownianParams, BrownianSnapshot, BrownianViewMode } from "./types";
import { useContainerSize } from "../shared/use-container-size";
import { ZoomControls } from "../shared/zoom-controls";

type TrailPoint = { x: number; y: number; time: number };
const WORLD_BOUNDS = getWorldBounds();

export function BrownianCanvas({
  params,
  running,
  resetSignal,
  stepSignal,
  viewMode,
  onSnapshot,
}: {
  params: BrownianParams;
  running: boolean;
  resetSignal: number;
  stepSignal: number;
  viewMode: BrownianViewMode;
  onSnapshot: (snapshot: BrownianSnapshot) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const transformRef = useRef<HTMLDivElement>(null);
  const runtimeRef = useRef<BrownianRuntime | null>(null);
  const trailRef = useRef<TrailPoint[]>([]);
  const accumulatorRef = useRef(0);
  const lastFrameRef = useRef<number | null>(null);
  const lastSampleTimeRef = useRef(-Infinity);
  const lastStepSignalRef = useRef(stepSignal);
  const stepSignalRef = useRef(stepSignal);
  const reducedMotionRef = useRef(false);
  const onSnapshotRef = useRef(onSnapshot);
  const paramsRef = useRef(params);
  const { ref: containerRef, size } = useContainerSize<HTMLDivElement>();
  const zoomRef = useRef(1);
  const panRef = useRef({ x: 0, y: 0 });
  const [zoomPct, setZoomPct] = useState(100);
  const zoomActionsRef = useRef<{ in: () => void; out: () => void } | null>(null);
  useEffect(() => {
    onSnapshotRef.current = onSnapshot;
    paramsRef.current = params;
    stepSignalRef.current = stepSignal;
  }, [onSnapshot, params, stepSignal]);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => { reducedMotionRef.current = media.matches; };
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  const runtimeKey = useMemo(
    () => [
      params.seed,
      params.mode,
      params.temperature,
      params.viscosity,
      params.radius,
      params.mass,
      params.moleculeDensity,
      params.autoDiffusion,
      params.diffusion,
      params.boundary,
    ].join("|"),
    [params],
  );

  useEffect(() => {
    if (size.width <= 0 || size.height <= 0) return;
    const currentParams = paramsRef.current;
    const moleculeCount = Math.min(currentParams.moleculeDensity, size.width < 560 ? 140 : 280);
    runtimeRef.current = new BrownianRuntime({ width: size.width, height: size.height, moleculeCount, params: currentParams });
    trailRef.current = [];
    accumulatorRef.current = 0;
    lastFrameRef.current = null;
    lastSampleTimeRef.current = -Infinity;
    lastStepSignalRef.current = stepSignalRef.current;
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

    const toScreen = (x: number, y: number, cameraX = 0, cameraY = 0) => ({
      x: size.width / 2 + ((x - cameraX) / (WORLD_BOUNDS.halfWidth * 2)) * size.width,
      y: size.height / 2 - ((y - cameraY) / (WORLD_BOUNDS.halfHeight * 2)) * size.height,
    });
    const drawArrow = (x: number, y: number, dx: number, dy: number, color: string, scale: number) => {
      const length = Math.hypot(dx, dy);
      if (length < 1e-14) return;
      const ux = dx / length;
      const uy = -dy / length;
      const endX = x + ux * Math.min(92, Math.max(20, length * scale));
      const endY = y + uy * Math.min(92, Math.max(20, length * scale));
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(endX, endY);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(endX, endY);
      ctx.lineTo(endX - ux * 8 - uy * 4, endY - uy * 8 + ux * 4);
      ctx.moveTo(endX, endY);
      ctx.lineTo(endX - ux * 8 + uy * 4, endY - uy * 8 - ux * 4);
      ctx.stroke();
    };
    const draw = () => {
      const runtime = runtimeRef.current;
      if (!runtime) return;
      const currentParams = paramsRef.current;
      const cameraX = currentParams.boundary === "large-field" ? runtime.x : 0;
      const cameraY = currentParams.boundary === "large-field" ? runtime.y : 0;
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(0, 0, size.width, size.height);

      if (currentParams.showGrid) {
        ctx.strokeStyle = "rgba(148, 163, 184, 0.12)";
        ctx.lineWidth = 1;
        for (let x = 0; x <= size.width; x += 36) {
          ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, size.height); ctx.stroke();
        }
        for (let y = 0; y <= size.height; y += 36) {
          ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(size.width, y); ctx.stroke();
        }
      }

      ctx.strokeStyle = "rgba(226, 232, 240, 0.22)";
      ctx.lineWidth = 1;
      ctx.strokeRect(0.5, 0.5, size.width - 1, size.height - 1);

      if (viewMode === "micro" && currentParams.showMolecules) {
        ctx.fillStyle = "rgba(103, 232, 249, 0.82)";
        for (let i = 0; i < runtime.molecules.x.length; i += 1) {
          const point = toScreen(runtime.molecules.x[i]!, runtime.molecules.y[i]!, cameraX, cameraY);
          ctx.beginPath();
          ctx.arc(point.x, point.y, size.width < 560 ? 1.25 : 1.55, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      const trail = trailRef.current;
      if (currentParams.showTrajectory && trail.length > 1) {
        const start = currentParams.keepFullPath ? 0 : Math.max(0, trail.length - Math.max(40, currentParams.trailLength));
        ctx.lineWidth = 2;
        ctx.lineJoin = "miter";
        for (let i = start + 1; i < trail.length; i += 1) {
          const previous = toScreen(trail[i - 1]!.x, trail[i - 1]!.y, cameraX, cameraY);
          const point = toScreen(trail[i]!.x, trail[i]!.y, cameraX, cameraY);
          const alpha = currentParams.trailLength > 0 ? 0.18 + 0.82 * ((i - start) / (trail.length - start)) : 0.86;
          ctx.strokeStyle = `rgba(251, 191, 36, ${alpha.toFixed(3)})`;
          ctx.beginPath();
          ctx.moveTo(previous.x, previous.y);
          ctx.lineTo(point.x, point.y);
          ctx.stroke();
        }
        if (currentParams.showSamples) {
          ctx.fillStyle = "rgba(251, 146, 60, 0.7)";
          for (let i = start; i < trail.length; i += 1) {
            const point = toScreen(trail[i]!.x, trail[i]!.y, cameraX, cameraY);
            ctx.beginPath(); ctx.arc(point.x, point.y, 2, 0, Math.PI * 2); ctx.fill();
          }
        }
      }

      if (currentParams.showTrajectory) {
        const initial = toScreen(0, 0, cameraX, cameraY);
        ctx.strokeStyle = "rgba(254, 215, 170, 0.9)";
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(initial.x, initial.y, 5, 0, Math.PI * 2); ctx.stroke();
      }

      const pollen = toScreen(runtime.x, runtime.y, cameraX, cameraY);
      const pollenRadius = Math.max(3.5, Math.min(5.5, (currentParams.radius / (WORLD_BOUNDS.halfWidth / 1e-6)) * size.width / 6));
      if (currentParams.showRadius) {
        const displacementRadius = (Math.hypot(runtime.x, runtime.y) / (WORLD_BOUNDS.halfWidth * 2)) * size.width;
        ctx.strokeStyle = "rgba(251, 191, 36, 0.36)";
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]);
        ctx.beginPath(); ctx.arc(toScreen(0, 0, cameraX, cameraY).x, toScreen(0, 0, cameraX, cameraY).y, Math.max(8, displacementRadius), 0, Math.PI * 2); ctx.stroke();
        ctx.setLineDash([]);
      }
      ctx.save();
      ctx.translate(pollen.x, pollen.y);
      ctx.beginPath();
      ctx.arc(0, 0, pollenRadius, 0, Math.PI * 2);
      ctx.fillStyle = "#f59e0b";
      ctx.fill();
      ctx.strokeStyle = "#fed7aa";
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = "rgba(255, 247, 237, 0.55)";
      ctx.beginPath(); ctx.arc(-pollenRadius * 0.28, -pollenRadius * 0.3, pollenRadius * 0.22, 0, Math.PI * 2); ctx.fill();
      ctx.restore();

      if (currentParams.showLabel) {
        ctx.fillStyle = "rgba(255, 247, 237, 0.92)";
        ctx.font = simulationCanvasFont("12px", 500);
        ctx.fillText("Hạt phấn hoa", pollen.x + pollenRadius + 8, pollen.y - pollenRadius - 8);
      }
      ctx.fillStyle = "rgba(226, 232, 240, 0.78)";
      ctx.font = "12px ui-monospace, SFMono-Regular, Menlo, monospace";
      ctx.fillText(`t = ${runtime.time.toFixed(1)} s`, 16, 24);
      if (currentParams.showVelocity) drawArrow(pollen.x, pollen.y, runtime.vx, runtime.vy, "#f0abfc", 5e7);
      if (currentParams.showRandomForce) drawArrow(pollen.x, pollen.y, runtime.randomForce.x, runtime.randomForce.y, "#fb923c", 2e8);
      if (currentParams.showDragForce) drawArrow(pollen.x, pollen.y, runtime.dragForce.x, runtime.dragForce.y, "#67e8f9", 2e8);
      if (currentParams.showMolecules && viewMode === "micro") {
        ctx.fillStyle = "rgba(165, 243, 252, 0.78)";
        ctx.font = simulationCanvasFont("11px");
        ctx.fillText("Phân tử nước", 16, size.height - 16);
      }
    };

    const stepAndRecord = () => {
      const runtime = runtimeRef.current;
      if (!runtime) return;
      const snapshot = runtime.step(paramsRef.current, getPhysicsDt());
      if (runtime.time - lastSampleTimeRef.current >= 0.04) {
        trailRef.current.push({ x: snapshot.x, y: snapshot.y, time: snapshot.time });
        if (trailRef.current.length > 5000) trailRef.current.splice(0, 500);
        lastSampleTimeRef.current = runtime.time;
        onSnapshotRef.current(snapshot);
      }
    };

    const animate = (now: number) => {
      const previous = lastFrameRef.current ?? now;
      lastFrameRef.current = now;
      const frameSeconds = Math.min(0.08, Math.max(0, (now - previous) / 1000));
      if (runtimeRef.current && lastStepSignalRef.current !== stepSignalRef.current) {
        lastStepSignalRef.current = stepSignalRef.current;
        stepAndRecord();
      }
      if (running && runtimeRef.current) {
        accumulatorRef.current += frameSeconds * (reducedMotionRef.current ? Math.min(0.5, paramsRef.current.speed) : paramsRef.current.speed);
        let guard = 0;
        while (accumulatorRef.current >= getPhysicsDt() && guard < 24) {
          stepAndRecord();
          accumulatorRef.current -= getPhysicsDt();
          guard += 1;
        }
      }
      draw();
      animationFrame = requestAnimationFrame(animate);
    };
    let animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [params.showGrid, params.showLabel, params.showMolecules, params.showRandomForce, params.showSamples, params.showTrajectory, params.showVelocity, params.showDragForce, params.speed, resetSignal, running, size.height, size.width, viewMode]);

  useEffect(() => {
    const container = containerRef.current;
    const transformEl = transformRef.current;
    const { width, height } = size;
    if (!container || !transformEl || width <= 0 || height <= 0) return;

    const minZoom = 1;
    const maxZoom = 6;
    const applyTransform = () => {
      transformEl.style.transform = `translate(${panRef.current.x}px, ${panRef.current.y}px) scale(${zoomRef.current})`;
    };
    const clampPan = (pan: { x: number; y: number }, zoom: number) => ({
      x: Math.min(0, Math.max(width * (1 - zoom), pan.x)),
      y: Math.min(0, Math.max(height * (1 - zoom), pan.y)),
    });
    const applyZoom = (nextZoom: number, focal?: { x: number; y: number }) => {
      const clamped = Math.min(maxZoom, Math.max(minZoom, nextZoom));
      const focus = focal ?? { x: width / 2, y: height / 2 };
      const worldUnderFocal = {
        x: (focus.x - panRef.current.x) / zoomRef.current,
        y: (focus.y - panRef.current.y) / zoomRef.current,
      };
      zoomRef.current = clamped;
      panRef.current = clampPan({
        x: focus.x - worldUnderFocal.x * clamped,
        y: focus.y - worldUnderFocal.y * clamped,
      }, clamped);
      applyTransform();
      setZoomPct(Math.round(clamped * 100));
    };
    zoomActionsRef.current = {
      in: () => applyZoom(zoomRef.current * 1.3),
      out: () => applyZoom(zoomRef.current / 1.3),
    };
    applyTransform();

    const panStart = { x: 0, y: 0, panX: 0, panY: 0 };
    let dragging = false;
    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 0 || event.target !== canvasRef.current) return;
      dragging = true;
      panStart.x = event.clientX;
      panStart.y = event.clientY;
      panStart.panX = panRef.current.x;
      panStart.panY = panRef.current.y;
      container.setPointerCapture(event.pointerId);
    };
    const onPointerMove = (event: PointerEvent) => {
      if (!dragging) return;
      panRef.current = clampPan({
        x: panStart.panX + event.clientX - panStart.x,
        y: panStart.panY + event.clientY - panStart.y,
      }, zoomRef.current);
      applyTransform();
    };
    const onPointerUp = (event: PointerEvent) => {
      dragging = false;
      if (container.hasPointerCapture(event.pointerId)) container.releasePointerCapture(event.pointerId);
    };
    const onWheel = (event: WheelEvent) => {
      if (event.target !== canvasRef.current) return;
      event.preventDefault();
      const rect = container.getBoundingClientRect();
      applyZoom(event.deltaY > 0 ? zoomRef.current / 1.08 : zoomRef.current * 1.08, {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      });
    };

    container.addEventListener("pointerdown", onPointerDown);
    container.addEventListener("pointermove", onPointerMove);
    container.addEventListener("pointerup", onPointerUp);
    container.addEventListener("pointercancel", onPointerUp);
    container.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      container.removeEventListener("pointerdown", onPointerDown);
      container.removeEventListener("pointermove", onPointerMove);
      container.removeEventListener("pointerup", onPointerUp);
      container.removeEventListener("pointercancel", onPointerUp);
      container.removeEventListener("wheel", onWheel);
    };
  }, [containerRef, size]);

  return (
    <div ref={containerRef} className="relative h-full min-h-[360px] w-full overflow-hidden bg-[#0f172a]">
      <div ref={transformRef} className="absolute inset-0" style={{ transformOrigin: "0 0" }}>
        <canvas ref={canvasRef} className="absolute inset-0 block h-full w-full touch-none cursor-grab active:cursor-grabbing" aria-label="Mô phỏng chuyển động Brown của hạt phấn hoa" />
      </div>
      <ZoomControls percent={zoomPct} onZoomIn={() => zoomActionsRef.current?.in()} onZoomOut={() => zoomActionsRef.current?.out()} />
    </div>
  );
}
