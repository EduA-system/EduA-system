"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { PendulumResonanceRuntime, PENDULUM_DT, projectWorldToScreen, sortByDepth } from "./physics";
import { PENDULUM_COUNT, type PendulumResonanceParams, type PendulumResonanceSnapshot } from "./types";
import { useContainerSize } from "../shared/use-container-size";
import { ZoomControls } from "../shared/zoom-controls";

const COLORS = ["#fb7185", "#fb923c", "#facc15", "#4ade80", "#67e8f9"];
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

type CanvasPoint = { x: number; y: number; z: number; scale: number; opacity: number };

export function PendulumResonanceCanvas({
  params,
  running,
  resetSignal,
  stepSignal,
  onRunningChange,
  onSnapshot,
}: {
  params: PendulumResonanceParams;
  running: boolean;
  resetSignal: number;
  stepSignal: number;
  onRunningChange: (running: boolean) => void;
  onSnapshot: (snapshot: PendulumResonanceSnapshot) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const runtimeRef = useRef<PendulumResonanceRuntime | null>(null);
  const paramsRef = useRef(params);
  const runningRef = useRef(running);
  const stepSignalRef = useRef(stepSignal);
  const lastStepRef = useRef(stepSignal);
  const onSnapshotRef = useRef(onSnapshot);
  const frameRef = useRef<number | null>(null);
  const lastFrameRef = useRef<number | null>(null);
  const accumulatorRef = useRef(0);
  const lastSampleTimeRef = useRef(-Infinity);
  const trailRef = useRef<Array<Array<CanvasPoint>>>(Array.from({ length: PENDULUM_COUNT }, () => []));
  const dragRef = useRef<{ index: number; startX: number; startY: number } | { pan: true; startX: number; startY: number; panX: number; panY: number } | null>(null);
  const viewRef = useRef({ centerX: 0, centerY: 0, scaleX: 1, scaleY: 1, perspective: 0.9 });
  const [zoomPct, setZoomPct] = useState(100);
  const zoomRef = useRef(1);
  const panRef = useRef({ x: 0, y: 0 });
  const { ref: containerRef, size } = useContainerSize<HTMLDivElement>();

  useEffect(() => {
    paramsRef.current = params;
    runningRef.current = running;
    stepSignalRef.current = stepSignal;
    onSnapshotRef.current = onSnapshot;
  }, [onSnapshot, params, running, stepSignal]);

  const runtimeKey = useMemo(
    () => [params.sourceIndex, params.initialAngle, params.initialAngularVelocity, params.gravity, params.lengths.join(","), params.masses.join(","), params.damping.join(","), params.supportMass, params.supportStiffness, params.supportDamping, params.driveEnabled, params.driveAmplitude, params.driveFrequency, params.drivePhase].join("|"),
    [params],
  );

  useEffect(() => {
    if (size.width <= 0 || size.height <= 0) return;
    const runtime = new PendulumResonanceRuntime(paramsRef.current);
    runtimeRef.current = runtime;
    trailRef.current = Array.from({ length: PENDULUM_COUNT }, () => []);
    accumulatorRef.current = 0;
    lastFrameRef.current = null;
    lastSampleTimeRef.current = -Infinity;
    lastStepRef.current = stepSignalRef.current;
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

    const drawArrow = (x: number, y: number, dx: number, dy: number, color: string) => {
      const length = Math.hypot(dx, dy);
      if (length < 0.01) return;
      const scale = Math.min(26, Math.max(7, length * 12));
      const ux = dx / length;
      const uy = dy / length;
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + ux * scale, y + uy * scale); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x + ux * scale, y + uy * scale); ctx.lineTo(x + ux * (scale - 5) - uy * 2, y + uy * (scale - 5) + ux * 2); ctx.moveTo(x + ux * scale, y + uy * scale); ctx.lineTo(x + ux * (scale - 5) + uy * 2, y + uy * (scale - 5) - ux * 2); ctx.stroke();
    };

    const getGeometry = (runtime: PendulumResonanceRuntime) => {
      const scale = Math.min(size.width / 7.3, size.height / 2.35);
      const view = { centerX: size.width * 0.5, centerY: size.height * 0.22, scaleX: scale, scaleY: scale, perspective: paramsRef.current.perspective };
      viewRef.current = view;
      // Thanh treo được vẽ cố định và nằm ngang theo yêu cầu trực quan. Độ
      // dịch chuyển hiệu dụng của giá đỡ vẫn được giữ trong solver để truyền
      // năng lượng, nhưng không làm biến dạng hình học thanh trên canvas.
      const visualSupport = 0;
      const supports = [-2.4, -1.2, 0, 1.2, 2.4].map((x) => ({ x, y: visualSupport, z: 0 }));
      const bobs = supports.map((pivot, index) => {
        const length = Math.max(0.08, paramsRef.current.lengths[index] ?? 1);
        const theta = runtime.theta[index] ?? 0;
        return { index, pivot, x: pivot.x, y: visualSupport - length * Math.cos(theta), z: length * Math.sin(theta) };
      });
      return { view, supports, bobs };
    };

    const draw = () => {
      const runtime = runtimeRef.current;
      if (!runtime) return;
      const current = paramsRef.current;
      const snapshot = runtime.snapshot();
      const geometry = getGeometry(runtime);
      const { view, supports, bobs } = geometry;
      const zoom = zoomRef.current;
      const pan = panRef.current;

      ctx.clearRect(0, 0, size.width, size.height);
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(0, 0, size.width, size.height);
      ctx.save();
      ctx.translate(pan.x, pan.y);
      ctx.scale(zoom, zoom);

      // Lưới rất nhẹ giúp nhận ra chuyển động theo chiều sâu mà không biến canvas thành dashboard.
      ctx.strokeStyle = "rgba(148, 163, 184, 0.08)";
      ctx.lineWidth = 1;
      for (let x = -size.width; x < size.width * 2; x += 42) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, size.height); ctx.stroke(); }
      for (let y = 22; y < size.height; y += 42) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(size.width, y); ctx.stroke(); }

      const pivotPoints = supports.map((pivot) => projectWorldToScreen(pivot.x, pivot.y, pivot.z, view));
      const bobPoints = bobs.map((bob) => ({ ...bob, point: projectWorldToScreen(bob.x, bob.y, bob.z, view) }));
      const top = pivotPoints[0]!;
      const right = pivotPoints[PENDULUM_COUNT - 1]!;

      // Thanh treo chung: duy nhất một phần tử ngang, không có liên kết giữa các quả nặng.
      ctx.fillStyle = "rgba(226, 232, 240, 0.95)";
      ctx.strokeStyle = "rgba(103, 232, 249, 0.85)";
      ctx.lineWidth = 2;
      const barY = top.y;
      const barLeft = top.x - 40;
      const barRight = right.x + 40;
      ctx.beginPath();
      ctx.rect(barLeft, barY - 6, barRight - barLeft, 12);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      for (const x of [barLeft + 12, barRight - 12]) {
        ctx.strokeStyle = "rgba(148, 163, 184, 0.9)";
        ctx.lineWidth = 4;
        ctx.beginPath(); ctx.moveTo(x, barY + 6); ctx.lineTo(x, barY + 36); ctx.stroke();
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(x - 10, barY + 36); ctx.lineTo(x + 10, barY + 36); ctx.stroke();
      }

      if (current.showBalance) {
        ctx.strokeStyle = "rgba(148, 163, 184, 0.24)";
        ctx.setLineDash([4, 5]);
        ctx.beginPath(); ctx.moveTo(barLeft, barY + 16); ctx.lineTo(barRight, barY + 16); ctx.stroke();
        ctx.setLineDash([]);
      }

      if (current.showTrails) {
        for (const [index, points] of trailRef.current.entries()) {
          if (points.length < 2) continue;
          ctx.strokeStyle = `${COLORS[index]}66`;
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          points.forEach((point, pointIndex) => { if (pointIndex === 0) ctx.moveTo(point.x, point.y); else ctx.lineTo(point.x, point.y); });
          ctx.stroke();
        }
      }

      // Dây độc lập được vẽ trước các quả nặng, theo thứ tự chiều sâu.
      for (const bob of sortByDepth(bobPoints)) {
        const pivot = pivotPoints[bob.index]!;
        ctx.strokeStyle = `${COLORS[bob.index]}99`;
        ctx.lineWidth = 1.5 + bob.point.scale * 0.2;
        ctx.beginPath(); ctx.moveTo(pivot.x, pivot.y); ctx.lineTo(bob.point.x, bob.point.y); ctx.stroke();
        if (current.showShadows) {
          ctx.fillStyle = "rgba(2, 6, 23, 0.35)";
          ctx.beginPath(); ctx.ellipse(bob.point.x - bob.z * view.scaleX * 0.08, bob.point.y + 14, 12 * bob.point.scale, 4, 0, 0, Math.PI * 2); ctx.fill();
        }
      }

      for (const bob of sortByDepth(bobPoints)) {
        const point = bob.point;
        const radius = 10 * point.scale;
        ctx.globalAlpha = point.opacity;
        ctx.fillStyle = COLORS[bob.index]!;
        ctx.strokeStyle = "rgba(255, 247, 237, 0.9)";
        ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.arc(point.x, point.y, radius, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = "rgba(255,255,255,0.55)";
        ctx.beginPath(); ctx.arc(point.x - radius * 0.32, point.y - radius * 0.32, radius * 0.2, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
        if (current.showLabels) {
          ctx.fillStyle = "rgba(226, 232, 240, 0.86)";
          ctx.font = "600 11px Inter, sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(`${bob.index + 1}`, point.x, point.y + radius + 16);
        }
        if (current.showEnergy && snapshot.energies[bob.index]! > 0.0001) {
          drawArrow(point.x, point.y, 0, -snapshot.angularVelocity[bob.index]! * 6, "rgba(216, 180, 254, 0.72)");
        }
      }

      if (current.showSupportMotion && Math.abs(runtime.supportDisplacement) > 0.00001) {
        ctx.fillStyle = "rgba(103, 232, 249, 0.78)";
        ctx.font = "10px Inter, sans-serif";
        ctx.textAlign = "left";
        ctx.fillText("Thanh treo cố định, phản lực được tính trong mô hình ghép", 16, 48);
      }
      ctx.restore();

      // Bảng số liệu giữ đúng kiểu overlay tối của các thí nghiệm EDUA hiện tại.
      const boxX = 14;
      const boxY = size.height - 98;
      const boxW = Math.min(302, size.width - 28);
      ctx.fillStyle = "rgba(2, 6, 23, 0.8)";
      ctx.beginPath(); ctx.roundRect(boxX, boxY, boxW, 82, 8); ctx.fill();
      ctx.fillStyle = "rgba(226, 232, 240, 0.72)";
      ctx.font = "10px Inter, sans-serif";
      ctx.textAlign = "left";
      ctx.fillText("Cộng hưởng qua thanh treo chung", boxX + 10, boxY + 16);
      ctx.fillStyle = "#e2e8f0";
      ctx.font = "10px ui-monospace, SFMono-Regular, Menlo, monospace";
      ctx.fillText(`t = ${snapshot.time.toFixed(1)} s`, boxX + 10, boxY + 34);
      ctx.fillText("Thanh treo: cố định", boxX + 10, boxY + 50);
      ctx.fillText(`E tổng: ${snapshot.totalEnergy.toFixed(3)} J`, boxX + 10, boxY + 66);
      const strongest = snapshot.amplitudes.indexOf(Math.max(...snapshot.amplitudes));
      ctx.fillStyle = COLORS[strongest]!;
      ctx.fillText(`Biên độ lớn nhất: con lắc ${strongest + 1}`, boxX + boxW * 0.52, boxY + 34);
      ctx.fillStyle = "rgba(226, 232, 240, 0.75)";
      ctx.fillText(`f nguồn: ${snapshot.naturalFrequencies[current.sourceIndex]!.toFixed(2)} Hz`, boxX + boxW * 0.52, boxY + 50);
      ctx.fillText(current.driveEnabled ? "Kích thích cưỡng bức" : "Không ngoại lực", boxX + boxW * 0.52, boxY + 66);
    };

    const recordSnapshot = () => {
      const runtime = runtimeRef.current;
      if (!runtime) return;
      const snapshot = runtime.step(PENDULUM_DT);
      if (snapshot.time - lastSampleTimeRef.current >= 0.05) {
        const geometry = getGeometry(runtime);
        geometry.bobs.forEach((bob, index) => {
          const point = projectWorldToScreen(bob.x, bob.y, bob.z, viewRef.current);
          const points = trailRef.current[index]!;
          points.push(point);
          if (points.length > 90) points.shift();
        });
        lastSampleTimeRef.current = snapshot.time;
        onSnapshotRef.current(snapshot);
      }
    };

    const animate = (now: number) => {
      const previous = lastFrameRef.current ?? now;
      lastFrameRef.current = now;
      const frameSeconds = Math.min(0.08, Math.max(0, (now - previous) / 1000));
      if (lastStepRef.current !== stepSignalRef.current) {
        lastStepRef.current = stepSignalRef.current;
        recordSnapshot();
      }
      if (runningRef.current && runtimeRef.current) {
        accumulatorRef.current += frameSeconds * paramsRef.current.speed;
        let steps = 0;
        while (accumulatorRef.current >= PENDULUM_DT && steps < 24) {
          recordSnapshot();
          accumulatorRef.current -= PENDULUM_DT;
          steps += 1;
        }
      }
      draw();
      frameRef.current = requestAnimationFrame(animate);
    };
    frameRef.current = requestAnimationFrame(animate);
    return () => { if (frameRef.current !== null) cancelAnimationFrame(frameRef.current); frameRef.current = null; };
  }, [size.height, size.width]);

  const getPointAt = (index: number) => {
    const runtime = runtimeRef.current;
    if (!runtime) return null;
    const length = Math.max(0.08, paramsRef.current.lengths[index] ?? 1);
    const x = [-2.4, -1.2, 0, 1.2, 2.4][index]!;
    const theta = runtime.theta[index] ?? 0;
    const support = 0;
    return projectWorldToScreen(x, support - length * Math.cos(theta), length * Math.sin(theta), viewRef.current);
  };

  const pointerPosition = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: (event.clientX - rect.left - panRef.current.x) / zoomRef.current, y: (event.clientY - rect.top - panRef.current.y) / zoomRef.current };
  };

  const onPointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const point = pointerPosition(event);
    let closest = -1;
    let distance = 24;
    for (let i = 0; i < PENDULUM_COUNT; i += 1) {
      const bob = getPointAt(i);
      if (!bob) continue;
      const d = Math.hypot(point.x - bob.x, point.y - bob.y);
      if (d < distance) { distance = d; closest = i; }
    }
    if (closest >= 0 && !runningRef.current) {
      dragRef.current = { index: closest, startX: point.x, startY: point.y };
      event.currentTarget.setPointerCapture(event.pointerId);
    } else if (closest < 0) {
      dragRef.current = { pan: true, startX: event.clientX, startY: event.clientY, panX: panRef.current.x, panY: panRef.current.y };
      event.currentTarget.setPointerCapture(event.pointerId);
    }
  };

  const onPointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    if ("pan" in drag) {
      panRef.current = { x: drag.panX + event.clientX - drag.startX, y: drag.panY + event.clientY - drag.startY };
      return;
    }
    const point = pointerPosition(event);
    const angle = clamp((point.x - drag.startX - (point.y - drag.startY)) / Math.max(80, viewRef.current.scaleY * 1.2), -0.8, 0.8);
    runtimeRef.current?.setAngle(drag.index, angle);
  };

  const endPointer = () => { dragRef.current = null; };

  return <div ref={containerRef} className="relative h-full min-h-[360px] w-full overflow-hidden rounded-lg bg-[#0f172a]"><canvas ref={canvasRef} className="absolute inset-0 block h-full w-full touch-none cursor-grab active:cursor-grabbing" aria-label="Mô phỏng cộng hưởng 5 con lắc trên thanh treo chung" onPointerDown={(event) => { if (runningRef.current) onRunningChange(false); onPointerDown(event); }} onPointerMove={onPointerMove} onPointerUp={endPointer} onPointerCancel={endPointer} /><ZoomControls percent={zoomPct} onZoomIn={() => { zoomRef.current = clamp(zoomRef.current + 0.1, 1, 1.8); setZoomPct(Math.round(zoomRef.current * 100)); }} onZoomOut={() => { zoomRef.current = clamp(zoomRef.current - 0.1, 1, 1.8); setZoomPct(Math.round(zoomRef.current * 100)); }} /></div>;
}
