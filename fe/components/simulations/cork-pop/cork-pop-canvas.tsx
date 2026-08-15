"use client";

import { simulationCanvasFont } from "@/components/simulations/shared/typography";

import { useEffect, useMemo, useRef, useState } from "react";
import { CORK_POP_DT, CorkPopRuntime } from "./physics";
import type { CorkPopParams, CorkPopSnapshot } from "./types";
import { useContainerSize } from "../shared/use-container-size";
import { ZoomControls } from "../shared/zoom-controls";

type TrailPoint = { x: number; y: number };

export function CorkPopCanvas({ params, running, resetSignal, stepSignal, onSnapshot }: { params: CorkPopParams; running: boolean; resetSignal: number; stepSignal: number; onSnapshot: (snapshot: CorkPopSnapshot) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const transformRef = useRef<HTMLDivElement>(null);
  const runtimeRef = useRef<CorkPopRuntime | null>(null);
  const paramsRef = useRef(params);
  const onSnapshotRef = useRef(onSnapshot);
  const stepSignalRef = useRef(stepSignal);
  const lastStepSignalRef = useRef(stepSignal);
  const lastFrameRef = useRef<number | null>(null);
  const accumulatorRef = useRef(0);
  const lastRecordedTimeRef = useRef(-Infinity);
  const trailRef = useRef<TrailPoint[]>([]);
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

  const runtimeKey = useMemo(() => [params.heatPower, params.corkTightness, params.gasAmount, params.initialTemperature, params.corkMass].join("|"), [params]);

  useEffect(() => {
    if (size.width <= 0 || size.height <= 0) return;
    const runtime = new CorkPopRuntime(paramsRef.current);
    runtimeRef.current = runtime;
    const initial = runtime.snapshot();
    trailRef.current = [{ x: initial.corkPosition, y: initial.corkPosition }];
    accumulatorRef.current = 0;
    lastFrameRef.current = null;
    lastRecordedTimeRef.current = 0;
    lastStepSignalRef.current = stepSignalRef.current;
    onSnapshotRef.current(initial);
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
      const scale = Math.min(34, Math.max(7, length * 9));
      const ux = dx / length;
      const uy = dy / length;
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + ux * scale, y + uy * scale); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x + ux * scale, y + uy * scale); ctx.lineTo(x + ux * (scale - 5) - uy * 2.5, y + uy * (scale - 5) + ux * 2.5); ctx.moveTo(x + ux * scale, y + uy * scale); ctx.lineTo(x + ux * (scale - 5) + uy * 2.5, y + uy * (scale - 5) - ux * 2.5); ctx.stroke();
    };

    const draw = () => {
      const runtime = runtimeRef.current;
      if (!runtime) return;
      const currentParams = paramsRef.current;
      const snapshot = runtime.snapshot();
      const bodyW = Math.min(250, Math.max(150, size.width * 0.34));
      const bodyH = Math.min(350, Math.max(180, size.height * 0.48));
      const bodyX = size.width * 0.5 - bodyW * 0.5;
      const bodyBottom = size.height * 0.74;
      const bodyTop = bodyBottom - bodyH;
      const neckW = bodyW * 0.36;
      const neckTop = bodyTop - Math.min(85, bodyH * 0.28);
      const neckBottom = bodyTop + 8;
      const corkScale = Math.min(190, bodyH * 0.54);
      const corkY = neckTop - snapshot.corkPosition * corkScale;
      const particleCount = Math.round(25 + (currentParams.gasAmount / 100) * 15);

      ctx.fillStyle = "#0f172a";
      ctx.fillRect(0, 0, size.width, size.height);
      // Lưới nền nhẹ giúp đọc vị trí và biến đổi thể tích mà không làm cảnh
      // giống một bảng debug kỹ thuật.
      ctx.strokeStyle = "rgba(148, 163, 184, 0.09)";
      ctx.lineWidth = 1;
      for (let x = 18; x < size.width; x += 36) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, size.height); ctx.stroke();
      }
      for (let y = 58; y < size.height; y += 36) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(size.width, y); ctx.stroke();
      }
      ctx.textBaseline = "alphabetic";
      ctx.textAlign = "left";
      ctx.fillStyle = "rgba(226, 232, 240, 0.92)";
      ctx.font = simulationCanvasFont("13px", 500);
      ctx.fillText("Nút bấc bật: Nội năng chuyển thành công", 16, 25);
      ctx.fillStyle = "rgba(148, 163, 184, 0.82)";
      ctx.font = simulationCanvasFont("11px");
      ctx.fillText("Khí nhận nhiệt và đẩy nút bấc ra khỏi bình", 16, 43);

      // Bình thủy tinh kín và cổ bình.
      ctx.fillStyle = "rgba(103, 232, 249, 0.05)";
      ctx.strokeStyle = "rgba(103, 232, 249, 0.78)";
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(bodyX + bodyW * 0.16, bodyTop);
      ctx.lineTo(bodyX + bodyW * 0.04, bodyBottom - 10);
      ctx.quadraticCurveTo(bodyX + bodyW * 0.5, bodyBottom + 10, bodyX + bodyW * 0.96, bodyBottom - 10);
      ctx.lineTo(bodyX + bodyW * 0.84, bodyTop);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(size.width * 0.5 - neckW / 2, neckTop); ctx.lineTo(size.width * 0.5 - neckW / 2, neckBottom); ctx.lineTo(size.width * 0.5 + neckW / 2, neckBottom); ctx.lineTo(size.width * 0.5 + neckW / 2, neckTop); ctx.stroke();
      ctx.strokeStyle = "rgba(165, 243, 252, 0.35)";
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(bodyX + bodyW * 0.22, bodyTop + 20); ctx.lineTo(bodyX + bodyW * 0.12, bodyBottom - 30); ctx.stroke();

      // Phân tử khí và vector vận tốc.
      if (currentParams.showMolecules && currentParams.mode === "micro") {
        for (let i = 0; i < particleCount; i += 1) {
          const px = bodyX + bodyW * 0.1 + ((runtime.molecules.x[i]! + 0.9) / 1.8) * bodyW * 0.8;
          const py = bodyBottom - 20 - (runtime.molecules.y[i]! / 0.84) * (bodyH - 34);
          ctx.fillStyle = "rgba(103, 232, 249, 0.88)";
          ctx.beginPath(); ctx.arc(px, py, 2, 0, Math.PI * 2); ctx.fill();
          if (currentParams.showVelocityVectors && i % 2 === 0) drawArrow(px, py, runtime.molecules.vx[i]!, -runtime.molecules.vy[i]!, "rgba(216, 180, 254, 0.76)");
        }
      }

      // Nút bấc: đứng yên, rung khi sắp bật và bay lên khi vượt ngưỡng.
      const corkW = neckW + 12;
      const corkH = 18;
      const corkX = size.width * 0.5;
      ctx.fillStyle = snapshot.status === "near-pop" ? "#fb7185" : "#f97316";
      ctx.strokeStyle = "#fed7aa";
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.roundRect(corkX - corkW / 2, corkY - corkH / 2, corkW, corkH, 4); ctx.fill(); ctx.stroke();
      if (snapshot.status === "near-pop") {
        ctx.strokeStyle = "rgba(251, 146, 60, 0.55)";
        ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.arc(corkX, corkY, 25, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
      }
      if (currentParams.showLabels) {
        ctx.fillStyle = "rgba(255, 247, 237, 0.92)"; ctx.font = simulationCanvasFont("11px", 500); ctx.textAlign = "left";
        ctx.fillText("Nút bấc", corkX + corkW / 2 + 8, corkY + 4);
      }

      if (snapshot.popped) {
        ctx.strokeStyle = "rgba(251, 146, 60, 0.75)"; ctx.lineWidth = 1.5;
        for (let i = 0; i < 3; i += 1) { ctx.beginPath(); ctx.moveTo(corkX - 16 + i * 14, neckTop + 8); ctx.quadraticCurveTo(corkX - 28 + i * 20, neckTop - 18, corkX - 12 + i * 22, neckTop - 34); ctx.stroke(); }
        ctx.fillStyle = "#fb7185"; ctx.font = simulationCanvasFont("12px", 500); ctx.textAlign = "center"; ctx.fillText("Khí thực hiện công lên nút", corkX, Math.max(62, neckTop - 55));
      }

      // Bếp nhiệt tối giản.
      ctx.strokeStyle = "rgba(148, 163, 184, 0.8)"; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(bodyX + bodyW * 0.18, bodyBottom + 18); ctx.lineTo(bodyX + bodyW * 0.82, bodyBottom + 18); ctx.stroke();
      ctx.fillStyle = "#fb923c"; ctx.beginPath(); ctx.moveTo(corkX, bodyBottom + 45); ctx.bezierCurveTo(corkX - 22, bodyBottom + 24, corkX - 10, bodyBottom + 10, corkX, bodyBottom - 4); ctx.bezierCurveTo(corkX + 10, bodyBottom + 10, corkX + 22, bodyBottom + 24, corkX, bodyBottom + 45); ctx.fill();
      ctx.fillStyle = "rgba(255, 247, 237, 0.75)"; ctx.font = simulationCanvasFont("10px"); ctx.textAlign = "center"; ctx.fillText("Nguồn nhiệt", corkX, bodyBottom + 62);

      // Nhiệt kế cạnh bình.
      const thermometerX = bodyX - 22;
      ctx.strokeStyle = "rgba(251, 113, 133, 0.86)"; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(thermometerX, bodyTop + 35); ctx.lineTo(thermometerX, bodyBottom - 22); ctx.stroke();
      ctx.fillStyle = "#fb7185"; ctx.beginPath(); ctx.arc(thermometerX, bodyBottom - 18, 6, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "rgba(226, 232, 240, 0.74)"; ctx.font = simulationCanvasFont("10px"); ctx.textAlign = "center"; ctx.fillText("T", thermometerX, bodyTop + 22);

      // Gauge áp suất.
      const gaugeX = Math.min(size.width - 54, bodyX + bodyW + 48);
      const gaugeY = bodyTop + bodyH * 0.42;
      const pressureRatio = Math.max(0, Math.min(1, (snapshot.pressure - 80) / 180));
      ctx.strokeStyle = "rgba(148, 163, 184, 0.5)"; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(gaugeX, gaugeY, 28, Math.PI * 0.75, Math.PI * 2.25); ctx.stroke();
      ctx.strokeStyle = pressureRatio > 0.8 ? "#fb7185" : "#67e8f9"; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(gaugeX, gaugeY, 28, Math.PI * 0.75, Math.PI * (0.75 + 1.5 * pressureRatio)); ctx.stroke();
      const needleAngle = Math.PI * (0.75 + 1.5 * pressureRatio); ctx.strokeStyle = "#fed7aa"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(gaugeX, gaugeY); ctx.lineTo(gaugeX + Math.cos(needleAngle) * 22, gaugeY + Math.sin(needleAngle) * 22); ctx.stroke();
      ctx.fillStyle = "rgba(226, 232, 240, 0.8)"; ctx.font = simulationCanvasFont("10px"); ctx.textAlign = "center"; ctx.fillText("P", gaugeX, gaugeY + 43); ctx.fillText(`${snapshot.pressure.toFixed(0)} kPa`, gaugeX, gaugeY + 56);

      if (currentParams.showCorkForce) { ctx.fillStyle = "#fbbf24"; ctx.font = "10px ui-monospace, SFMono-Regular, Menlo, monospace"; ctx.fillText(`F = ${snapshot.force.toFixed(2)} N`, gaugeX, gaugeY - 43); }

      if (currentParams.showCorkTrail && trailRef.current.length > 1) {
        ctx.strokeStyle = "rgba(251, 191, 36, 0.65)"; ctx.lineWidth = 1.5; ctx.setLineDash([4, 4]); ctx.beginPath();
        trailRef.current.forEach((point, index) => { const py = neckTop - point.y * corkScale; if (index === 0) ctx.moveTo(corkX, py); else ctx.lineTo(corkX, py); });
        ctx.stroke(); ctx.setLineDash([]);
      }

      // Thanh chuyển hóa năng lượng được giữ lại như một chú thích trực quan
      // gọn, còn các con số chi tiết nằm trong panel bên phải.
      const energyY = size.height - 22; const energyW = Math.max(100, size.width - 28); const q = Math.max(1, snapshot.heatAdded); const u = Math.max(0, snapshot.internalEnergy); const a = Math.max(0, snapshot.work); const totalEnergy = Math.max(q, u + a, 1);
      ctx.fillStyle = "rgba(148, 163, 184, 0.2)"; ctx.fillRect(14, energyY - 7, energyW, 7); ctx.fillStyle = "#fb923c"; ctx.fillRect(14, energyY - 7, energyW * Math.min(1, q / totalEnergy), 7); ctx.fillStyle = "#67e8f9"; ctx.fillRect(14, energyY - 7, energyW * Math.min(1, u / totalEnergy), 4); ctx.fillStyle = "#fbbf24"; ctx.fillRect(14, energyY - 3, energyW * Math.min(1, a / totalEnergy), 3);
      ctx.fillStyle = "rgba(226, 232, 240, 0.7)"; ctx.font = simulationCanvasFont("9px"); ctx.fillText("Q nhiệt", 14, energyY - 11); ctx.fillText("U nội năng", Math.min(size.width - 74, 14 + energyW * 0.45), energyY - 11); ctx.textAlign = "right"; ctx.fillText("A công cơ học", size.width - 14, energyY - 11);
    };

    const recordStep = () => {
      const runtime = runtimeRef.current;
      if (!runtime) return;
      const snapshot = runtime.step(CORK_POP_DT);
      if (snapshot.time - lastRecordedTimeRef.current >= 0.05 || snapshot.popped || snapshot.status === "near-pop") {
        trailRef.current.push({ x: snapshot.corkPosition, y: snapshot.corkPosition });
        if (trailRef.current.length > 180) trailRef.current.shift();
        lastRecordedTimeRef.current = snapshot.time;
        onSnapshotRef.current(snapshot);
      }
    };
    const animate = (now: number) => {
      const previous = lastFrameRef.current ?? now; lastFrameRef.current = now;
      const frameSeconds = Math.min(0.08, Math.max(0, (now - previous) / 1000));
      if (runtimeRef.current && lastStepSignalRef.current !== stepSignalRef.current) { lastStepSignalRef.current = stepSignalRef.current; recordStep(); }
      if (running && runtimeRef.current) {
        accumulatorRef.current += frameSeconds * paramsRef.current.speed;
        let guard = 0;
        while (accumulatorRef.current >= CORK_POP_DT && guard < 24) { recordStep(); accumulatorRef.current -= CORK_POP_DT; guard += 1; }
      }
      draw(); animationFrame = requestAnimationFrame(animate);
    };
    let animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [params.mode, params.showCorkForce, params.showCorkTrail, params.showLabels, params.showMolecules, params.showVelocityVectors, params.speed, resetSignal, running, size.height, size.width]);

  useEffect(() => {
    const container = containerRef.current; const transformEl = transformRef.current;
    if (!container || !transformEl || size.width <= 0 || size.height <= 0) return;
    const applyTransform = () => { transformEl.style.transform = `translate(${panRef.current.x}px, ${panRef.current.y}px) scale(${zoomRef.current})`; };
    const clampPan = (pan: { x: number; y: number }, zoom: number) => {
      const maxX = Math.max(0, (size.width * (zoom - 1)) / 2);
      const maxY = Math.max(0, (size.height * (zoom - 1)) / 2);
      return {
        x: Math.min(maxX, Math.max(-maxX, pan.x)),
        y: Math.min(maxY, Math.max(-maxY, pan.y)),
      };
    };
    const applyZoom = (next: number) => {
      const zoom = Math.min(6, Math.max(1, next));
      zoomRef.current = zoom;
      panRef.current = clampPan(panRef.current, zoom);
      applyTransform();
      setZoomPct(Math.round(zoom * 100));
    };
    zoomActionsRef.current = { in: () => applyZoom(zoomRef.current * 1.3), out: () => applyZoom(zoomRef.current / 1.3) }; applyTransform();
    let dragging = false; const start = { x: 0, y: 0, panX: 0, panY: 0 };
    const onPointerDown = (event: PointerEvent) => { if (event.button !== 0 || event.target !== canvasRef.current) return; dragging = true; start.x = event.clientX; start.y = event.clientY; start.panX = panRef.current.x; start.panY = panRef.current.y; container.setPointerCapture(event.pointerId); };
    const onPointerMove = (event: PointerEvent) => { if (!dragging) return; panRef.current = clampPan({ x: start.panX + event.clientX - start.x, y: start.panY + event.clientY - start.y }, zoomRef.current); applyTransform(); };
    const onPointerUp = (event: PointerEvent) => { dragging = false; if (container.hasPointerCapture(event.pointerId)) container.releasePointerCapture(event.pointerId); };
    const onWheel = (event: WheelEvent) => { if (event.target !== canvasRef.current) return; event.preventDefault(); applyZoom(event.deltaY > 0 ? zoomRef.current / 1.08 : zoomRef.current * 1.08); };
    container.addEventListener("pointerdown", onPointerDown); container.addEventListener("pointermove", onPointerMove); container.addEventListener("pointerup", onPointerUp); container.addEventListener("pointercancel", onPointerUp); container.addEventListener("wheel", onWheel, { passive: false });
    return () => { container.removeEventListener("pointerdown", onPointerDown); container.removeEventListener("pointermove", onPointerMove); container.removeEventListener("pointerup", onPointerUp); container.removeEventListener("pointercancel", onPointerUp); container.removeEventListener("wheel", onWheel); };
  }, [containerRef, size]);

  return <div ref={containerRef} className="relative h-full min-h-[360px] w-full overflow-hidden rounded-lg bg-[#0f172a]"><div ref={transformRef} className="absolute inset-0" style={{ transformOrigin: "center center" }}><canvas ref={canvasRef} className="absolute inset-0 block h-full w-full touch-none cursor-grab active:cursor-grabbing" aria-label="Mô phỏng nút bấc bật: nội năng chuyển thành công" /></div><ZoomControls percent={zoomPct} onZoomIn={() => zoomActionsRef.current?.in()} onZoomOut={() => zoomActionsRef.current?.out()} /></div>;
}
