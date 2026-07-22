"use client";
import { memo, useEffect, useRef } from "react";
import {
  createVaState,
  stepVa,
} from "../../engines/circuit/va-characteristic-physics";
import type {
  VaParams,
  VaSnapshot,
} from "../../engines/circuit/va-characteristic-types";
import { useContainerSize } from "../../shared/use-container-size";
export const VaCharacteristicScene = memo(function VaCharacteristicScene({
  params,
  running,
  speed,
  resetSignal,
  zoom,
  onSnapshot,
}: {
  params: VaParams;
  running: boolean;
  speed: number;
  resetSignal: number;
  zoom: number;
  onSnapshot: (s: VaSnapshot) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null),
    stateRef = useRef(createVaState(params)),
    latest = useRef({ params, running, speed, zoom, onSnapshot }),
    frameRef = useRef(0);
  latest.current = { params, running, speed, zoom, onSnapshot };
  const { ref, size } = useContainerSize<HTMLDivElement>();
  useEffect(() => {
    stateRef.current = createVaState(latest.current.params);
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
      const c = latest.current,
        s = stateRef.current,
        dt = Math.min(0.033, (now - last) / 1000);
      last = now;
      if (c.running || s.lampTemperature > 25.1) {
        acc += dt * c.speed;
        let n = 0;
        while (acc >= 1 / 180 && n++ < 20) {
          stepVa(s, c.params, 1 / 180);
          acc -= 1 / 180;
        }
      }
      if (now - report > 90) {
        c.onSnapshot({ ...s });
        report = now;
      }
      const w = size.width,
        h = size.height,
        z = (Math.min(w / 820, h / 520) * c.zoom) / 100,
        ox = w / 2 - 410 * z,
        oy = h / 2 - 260 * z;
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = "#09182b";
      ctx.fillRect(0, 0, w, h);
      ctx.save();
      ctx.translate(ox, oy);
      ctx.scale(z, z);
      const active = c.params.switchClosed,
        wire = active ? "#38bdf8" : "#64748b";
      ctx.strokeStyle = wire;
      ctx.lineWidth = 4;
      // Nguồn điều chỉnh và khóa K, dây tách đúng tại linh kiện.
      ctx.beginPath();
      ctx.moveTo(95, 105);
      ctx.lineTo(95, 410);
      ctx.lineTo(310, 410);
      ctx.moveTo(385, 410);
      ctx.lineTo(535, 410);
      ctx.moveTo(555, 410);
      ctx.lineTo(660, 410);
      ctx.lineTo(660, 105);
      ctx.stroke();
      ctx.strokeStyle = "#f8fafc";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(535, 388);
      ctx.lineTo(535, 432);
      ctx.moveTo(555, 397);
      ctx.lineTo(555, 423);
      ctx.stroke();
      ctx.fillStyle = "#fda4af";
      ctx.font = "700 13px Inter, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(`U = ${c.params.voltage.toFixed(1)} V`, 545, 462);
      ctx.fillStyle = "#cbd5e1";
      ctx.beginPath();
      ctx.arc(310, 410, 6, 0, Math.PI * 2);
      ctx.arc(385, 410, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#f59e0b";
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(310, 409);
      ctx.lineTo(active ? 385 : 367, active ? 409 : 382);
      ctx.stroke();
      // Hai nhánh song song: điện trở chuẩn và bóng dây tóc.
      ctx.strokeStyle = wire;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(95, 105);
      ctx.lineTo(245, 105);
      ctx.moveTo(395, 105);
      ctx.lineTo(660, 105);
      ctx.moveTo(95, 285);
      ctx.lineTo(268, 285);
      ctx.moveTo(372, 285);
      ctx.lineTo(660, 285);
      ctx.stroke();
      ctx.strokeStyle = "#e2e8f0";
      ctx.lineWidth = 3;
      ctx.strokeRect(245, 87, 150, 36);
      ctx.fillStyle = "#cbd5e1";
      ctx.font = "700 14px Inter, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(`R = ${c.params.resistorOhms.toFixed(1)} Ω`, 320, 111);
      const glow = Math.max(0, Math.min(1, (s.lampTemperature - 100) / 1800));
      ctx.shadowColor = `rgba(251,191,36,${glow})`;
      ctx.shadowBlur = 24 * glow;
      ctx.strokeStyle = "#e2e8f0";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(320, 285, 52, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = "#94a3b8";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(268, 285);
      ctx.lineTo(282, 285);
      ctx.moveTo(358, 285);
      ctx.lineTo(372, 285);
      ctx.stroke();
      ctx.strokeStyle = glow > 0.2 ? "#fbbf24" : "#94a3b8";
      ctx.lineWidth = 1.25;
      ctx.beginPath();
      for (let point = 0; point <= 72; point++) {
        const ratio = point / 72,
          x = 282 + ratio * 76,
          y =
            285 +
            Math.sin(ratio * Math.PI * 8) * 7 +
            Math.sin(ratio * Math.PI * 2) * 2.5;
        if (point === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.fillStyle = "#e2e8f0";
      ctx.font = "600 13px Inter, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Bóng đèn dây tóc", 320, 352);
      // Ampe kế riêng từng nhánh và vôn kế mắc song song.
      for (const [x, y, text] of [
        [190, 105, "A₁"],
        [190, 285, "A₂"],
      ] as const) {
        ctx.fillStyle = "#0f172a";
        ctx.strokeStyle = "#f8fafc";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(x, y, 25, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = "#f8fafc";
        ctx.font = "700 13px Inter, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(text, x, y);
      }
      ctx.fillStyle = "#0f172a";
      ctx.strokeStyle = "#f8fafc";
      ctx.beginPath();
      ctx.arc(550, 195, 27, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#f8fafc";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("V", 550, 195);
      ctx.strokeStyle = wire;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(550, 168);
      ctx.lineTo(550, 105);
      ctx.moveTo(550, 222);
      ctx.lineTo(550, 285);
      ctx.stroke();
      ctx.textBaseline = "alphabetic";
      ctx.fillStyle = "#67e8f9";
      ctx.font = "600 13px Inter";
      ctx.fillText(`I điện trở = ${s.resistorCurrent.toFixed(2)} A`, 470, 82);
      ctx.fillText(`I đèn = ${s.lampCurrent.toFixed(2)} A`, 470, 316);
      ctx.fillStyle = "#fde68a";
      ctx.fillText(`T dây tóc = ${s.lampTemperature.toFixed(0)} °C`, 450, 342);
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
        className="h-full w-full"
        aria-label="So sánh đặc trưng V-A của điện trở và bóng đèn dây tóc"
      />
    </div>
  );
});
