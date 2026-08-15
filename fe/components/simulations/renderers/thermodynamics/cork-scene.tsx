"use client";

import { simulationCanvasFont } from "@/components/simulations/shared/typography";

import { memo, useEffect, useRef } from "react";
import { createThermalState, metrics, stepThermal } from "../../engines/thermodynamics/physics";
import type { ThermalMetrics, ThermalParams, ThermalState } from "../../engines/thermodynamics/types";

type Props = { params: ThermalParams; running: boolean; speed: number; resetSignal: number; showLabels: boolean; showParticles: boolean; zoom: number; onMetrics: (metrics: ThermalMetrics) => void };
type GasParticle = { id: number; x: number; y: number; previousX: number; previousY: number; vx: number; vy: number; radius: number; energyFactor: number; phase: number; escaped: boolean; opacity: number };

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

function drawVector(context: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, color: string) {
  const angle = Math.atan2(y2 - y1, x2 - x1), head = 7;
  context.strokeStyle = color; context.fillStyle = color; context.lineWidth = 2.5; context.lineCap = "round";
  context.beginPath(); context.moveTo(x1, y1); context.lineTo(x2, y2); context.stroke();
  context.beginPath(); context.moveTo(x2, y2); context.lineTo(x2 - head * Math.cos(angle - Math.PI / 6), y2 - head * Math.sin(angle - Math.PI / 6)); context.lineTo(x2 - head * Math.cos(angle + Math.PI / 6), y2 - head * Math.sin(angle + Math.PI / 6)); context.closePath(); context.fill();
}

type AnnotationRect = { x: number; y: number; width: number; height: number };

function overlaps(a: AnnotationRect, b: AnnotationRect, gap = 12) {
  return a.x < b.x + b.width + gap && a.x + a.width + gap > b.x && a.y < b.y + b.height + gap && a.y + a.height + gap > b.y;
}

function getAnnotationLayout(context: CanvasRenderingContext2D, text: string, preferredX: number, preferredY: number, sceneWidth: number, sceneHeight: number, occupied: AnnotationRect[]) {
  context.font = simulationCanvasFont("13px", 500);
  const width = Math.ceil(context.measureText(text).width) + 16, height = 25, safe = 20;
  const candidates = [[preferredX, preferredY], [preferredX, preferredY - 34], [preferredX, preferredY + 34], [preferredX + 42, preferredY], [preferredX - 42, preferredY]];
  for (const [candidateX, candidateY] of candidates) {
    const rect = { x: clamp(candidateX, safe, sceneWidth - safe - width), y: clamp(candidateY, safe, sceneHeight - safe - height), width, height };
    if (!occupied.some((other) => overlaps(rect, other))) { occupied.push(rect); return rect; }
  }
  const fallback = { x: clamp(preferredX, safe, sceneWidth - safe - width), y: clamp(preferredY, safe, sceneHeight - safe - height), width, height };
  occupied.push(fallback); return fallback;
}

function drawAnnotationLabel(context: CanvasRenderingContext2D, rect: AnnotationRect, text: string, color: string) {
  context.fillStyle = "rgba(7,20,38,.84)"; context.strokeStyle = "rgba(148,163,184,.3)"; context.lineWidth = 1;
  context.beginPath(); context.roundRect(rect.x, rect.y, rect.width, rect.height, 7); context.fill(); context.stroke();
  context.fillStyle = color; context.font = simulationCanvasFont("13px", 500); context.textBaseline = "middle"; context.fillText(text, rect.x + 8, rect.y + rect.height / 2 + 0.5); context.textBaseline = "alphabetic";
}

function createGasParticles(): GasParticle[] {
  let seed = 1847;
  const random = () => ((seed = seed * 16807 % 2147483647) - 1) / 2147483646;
  return Array.from({ length: 54 }, (_, id) => {
    const angle = random() * Math.PI * 2, energyFactor = 0.82 + random() * 0.36;
    return { id, x: 0.12 + random() * 0.76, y: 0.08 + random() * 0.84, previousX: 0, previousY: 0, vx: Math.cos(angle) * 0.19, vy: Math.sin(angle) * 0.19, radius: 2 + random() * 1.25, energyFactor, phase: random() * Math.PI * 2, escaped: false, opacity: 1 };
  });
}

export const CorkScene = memo(function CorkScene({ params, running, speed, resetSignal, showLabels, showParticles, zoom, onMetrics }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null), stateRef = useRef<ThermalState>(createThermalState(params)), particlesRef = useRef(createGasParticles());
  const latest = useRef({ params, running, speed, showLabels, showParticles, zoom, onMetrics });
  latest.current = { params, running, speed, showLabels, showParticles, zoom, onMetrics };

  useEffect(() => { stateRef.current = createThermalState(params); particlesRef.current = createGasParticles(); onMetrics(metrics(stateRef.current, params)); }, [resetSignal, params, onMetrics]);
  useEffect(() => {
    const canvas = canvasRef.current, context = canvas?.getContext("2d"); if (!canvas || !context) return;
    let frame = 0, lastTime = performance.now(), lastReport = 0;
    const render = (now: number) => {
      const bounds = canvas.getBoundingClientRect(), pixelRatio = Math.min(devicePixelRatio, 2), dt = Math.min((now - lastTime) / 1000, 0.04); lastTime = now;
      if (canvas.width !== Math.round(bounds.width * pixelRatio) || canvas.height !== Math.round(bounds.height * pixelRatio)) { canvas.width = Math.round(bounds.width * pixelRatio); canvas.height = Math.round(bounds.height * pixelRatio); }
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0); const width = bounds.width, height = bounds.height, current = latest.current;
      if (!current.running && !["idle", "paused", "completed"].includes(stateRef.current.phase)) stateRef.current = { ...stateRef.current, resumePhase: stateRef.current.phase as ThermalState["resumePhase"], phase: "paused" };
      if (current.running) { if (stateRef.current.phase === "idle") stateRef.current = { ...stateRef.current, phase: "heating", resumePhase: "heating" }; else if (stateRef.current.phase === "paused") stateRef.current = { ...stateRef.current, phase: stateRef.current.resumePhase }; stateRef.current = stepThermal(stateRef.current, current.params, dt * current.speed); }
      const state = stateRef.current, live = metrics(state, current.params); if (now - lastReport > 100) { current.onMetrics(live); lastReport = now; }
      const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches, heat = clamp((state.temperature - current.params.initialTemperature) / 72, 0, 1);
      const sceneScale = current.zoom / 100 * 1.08, centerX = width * 0.46, deviceCenterY = height * 0.515, tubeWidth = Math.min(240, width * 0.4) * sceneScale, tubeHeight = height * 0.54 * sceneScale, tubeTop = deviceCenterY - tubeHeight / 2, tubeBottom = deviceCenterY + tubeHeight / 2, innerLeft = centerX - tubeWidth / 2 + 8, innerRight = centerX + tubeWidth / 2 - 8, innerTop = tubeTop + 24, innerBottom = tubeBottom - 8;
      const releaseAge = state.releaseTime === null ? -1 : state.time - state.releaseTime;
      const corkLift = releaseAge < 0 ? 0 : Math.max(-(tubeHeight - 55), 300 * releaseAge - 135 * releaseAge * releaseAge);
      const corkSide = releaseAge < 0 ? 0 : Math.min(tubeWidth * 1.65, releaseAge * tubeWidth * 0.82);
      context.clearRect(0, 0, width, height); const background = context.createLinearGradient(0, 0, 0, height); background.addColorStop(0, "#071426"); background.addColorStop(1, "#102a43"); context.fillStyle = background; context.fillRect(0, 0, width, height);

      // Giá đỡ
      context.strokeStyle = "#64748b"; context.lineWidth = 7; context.lineCap = "round"; context.beginPath(); context.moveTo(centerX - tubeWidth * 0.86, height * 0.15); context.lineTo(centerX - tubeWidth * 0.86, height * 0.88); context.moveTo(centerX - tubeWidth * 1.08, height * 0.88); context.lineTo(centerX + tubeWidth * 0.65, height * 0.88); context.stroke();
      context.strokeStyle = "#94a3b8"; context.lineWidth = 3; context.beginPath(); context.moveTo(centerX - tubeWidth * 0.86, height * 0.43); context.lineTo(centerX - tubeWidth * 0.52, height * 0.43); context.stroke();

      // Đèn cồn, tim đèn và phản sáng đáy bình
      const burnerY = tubeBottom + 70; context.shadowColor = `rgba(251,146,60,${0.25 + heat * 0.35})`; context.shadowBlur = current.running ? 24 : 0; context.fillStyle = "#64748b"; context.beginPath(); context.roundRect(centerX - 42, burnerY, 84, 38, 12); context.fill(); context.shadowBlur = 0; context.fillStyle = "#cbd5e1"; context.beginPath(); context.roundRect(centerX - 11, burnerY - 18, 22, 23, 4); context.fill(); context.strokeStyle = "#334155"; context.lineWidth = 3; context.beginPath(); context.moveTo(centerX, burnerY - 19); context.lineTo(centerX, burnerY - 29); context.stroke();
      const flameOn = current.running && state.phase !== "completed"; if (flameOn) { const flicker = reducedMotion ? 0 : Math.sin(now * 0.017) * 4; context.shadowColor = "#fb923c"; context.shadowBlur = 26; context.fillStyle = "#f59e0b"; context.beginPath(); context.moveTo(centerX, burnerY - 27); context.bezierCurveTo(centerX - 28, burnerY - 51, centerX - 13, burnerY - 77, centerX + flicker, burnerY - 97); context.bezierCurveTo(centerX + 23, burnerY - 65, centerX + 28, burnerY - 45, centerX, burnerY - 27); context.fill(); context.shadowBlur = 0; context.fillStyle = "#38bdf8"; context.beginPath(); context.moveTo(centerX, burnerY - 29); context.quadraticCurveTo(centerX - 11, burnerY - 48, centerX, burnerY - 62); context.quadraticCurveTo(centerX + 12, burnerY - 47, centerX, burnerY - 29); context.fill(); }
      if (flameOn) { context.strokeStyle = `rgba(251,146,60,${0.22 + heat * 0.38})`; context.lineWidth = 2; for (let index = 0; index < 3; index++) { const waveY = tubeBottom + 42 - index * 11 - (reducedMotion ? 0 : now / 38 % 22); context.beginPath(); context.moveTo(centerX - 28 + index * 28, waveY); context.bezierCurveTo(centerX - 39 + index * 28, waveY - 8, centerX - 17 + index * 28, waveY - 16, centerX - 28 + index * 28, waveY - 25); context.stroke(); } }

      // Khí và các phân tử
      const gasGradient = context.createLinearGradient(0, tubeTop, 0, tubeBottom); gasGradient.addColorStop(0, `rgba(${70 + heat * 175},${220 - heat * 60},${190 - heat * 105},.15)`); gasGradient.addColorStop(1, `rgba(251,${195 - heat * 48},90,${0.12 + heat * 0.22})`); context.fillStyle = gasGradient; context.fillRect(innerLeft, innerTop, innerRight - innerLeft, innerBottom - innerTop);
      if (current.showParticles) {
        const thermalRatio = Math.sqrt(Math.max(0.1, state.temperature / current.params.initialTemperature));
        const visualSpeed = clamp(1 + (thermalRatio - 1) * 5, 0.65, 3.2) * (reducedMotion ? 0.35 : 1);
        for (const particle of particlesRef.current) {
          particle.previousX = particle.x; particle.previousY = particle.y;
          if (current.running) {
            if (!particle.escaped) {
              particle.x += particle.vx * visualSpeed * particle.energyFactor * dt * current.speed; particle.y += particle.vy * visualSpeed * particle.energyFactor * dt * current.speed;
              const radiusX = particle.radius / Math.max(1, innerRight - innerLeft), radiusY = particle.radius / Math.max(1, innerBottom - innerTop);
              if (particle.x < radiusX) { particle.x = radiusX; particle.vx = Math.abs(particle.vx) * (0.98 + 0.02 * Math.sin(particle.phase + now * 0.001)); }
              if (particle.x > 1 - radiusX) { particle.x = 1 - radiusX; particle.vx = -Math.abs(particle.vx) * (0.98 + 0.02 * Math.cos(particle.phase)); }
              const curvedBottom = 1 - radiusY - Math.max(0, Math.abs(particle.x - 0.5) - 0.38) * 0.18;
              if (particle.y > curvedBottom) { particle.y = curvedBottom; particle.vy = -Math.abs(particle.vy); }
              if (particle.y < radiusY) { particle.y = radiusY; particle.vy = Math.abs(particle.vy); }
              const nearMouth = particle.y < 0.16 && Math.abs(particle.x - 0.5) < 0.23;
              if (state.releaseTime !== null && nearMouth && (particle.id % 4 === 0 || releaseAge > 0.35 && particle.id % 7 === 0)) { particle.escaped = true; particle.vx = (particle.x - 0.5) * 0.22 + Math.sin(particle.phase) * 0.035; particle.vy = -0.42 * particle.energyFactor; }
            } else { particle.x += particle.vx * dt * current.speed; particle.y += particle.vy * dt * current.speed; particle.vy -= 0.04 * dt; particle.opacity = Math.max(0, particle.opacity - dt * 0.55); }
          }
          if (particle.opacity <= 0) continue;
          const x = innerLeft + particle.x * (innerRight - innerLeft), y = innerTop + particle.y * (innerBottom - innerTop) - (particle.escaped ? corkLift * 0.75 : 0), previousX = innerLeft + particle.previousX * (innerRight - innerLeft), previousY = innerTop + particle.previousY * (innerBottom - innerTop);
          if (heat > 0.25 && !reducedMotion) { context.strokeStyle = `rgba(253,224,71,${heat * 0.22 * particle.opacity})`; context.lineWidth = particle.radius; context.beginPath(); context.moveTo(previousX, previousY); context.lineTo(x, y); context.stroke(); }
          context.shadowColor = heat > 0.55 ? "#fde68a" : "#6ee7d3"; context.shadowBlur = 2 + heat * 6; context.fillStyle = heat > 0.65 ? `rgba(253,211,77,${particle.opacity})` : `rgba(110,231,211,${particle.opacity})`; context.beginPath(); context.arc(x, y, particle.radius, 0, Math.PI * 2); context.fill(); context.shadowBlur = 0;
        }
      }

      // Thành kính
      context.strokeStyle = "rgba(186,230,253,.8)"; context.lineWidth = 6; context.beginPath(); context.moveTo(centerX - tubeWidth / 2, tubeTop); context.lineTo(centerX - tubeWidth / 2, tubeBottom - 16); context.quadraticCurveTo(centerX - tubeWidth / 2, tubeBottom, centerX - tubeWidth / 2 + 17, tubeBottom); context.lineTo(centerX + tubeWidth / 2 - 17, tubeBottom); context.quadraticCurveTo(centerX + tubeWidth / 2, tubeBottom, centerX + tubeWidth / 2, tubeBottom - 16); context.lineTo(centerX + tubeWidth / 2, tubeTop); context.stroke();

      // Nút bấc: đầu rộng + thân cắm kín trong lòng ống
      const jitter = state.phase === "nearRelease" && !reducedMotion ? Math.sin(now * 0.075) * 1.5 : 0, squash = releaseAge >= 0 && releaseAge < 0.09 ? 0.9 + releaseAge / 0.09 * 0.1 : 1, corkCenterY = tubeTop - 7 - corkLift;
      context.save(); context.translate(centerX + corkSide + jitter, corkCenterY); context.rotate(releaseAge < 0 ? 0 : releaseAge * 4.4); context.scale(1 + (1 - squash) * 0.08, squash); context.shadowColor = "rgba(0,0,0,.45)"; context.shadowBlur = 12;
      const stemWidth = tubeWidth - 18, stemHeight = 18; context.fillStyle = "#b97842"; context.beginPath(); context.roundRect(-stemWidth / 2, 3, stemWidth, stemHeight, 4); context.fill(); context.strokeStyle = "#82502c"; context.lineWidth = 2; context.stroke();
      const capWidth = tubeWidth - 2; context.fillStyle = "#c58b55"; context.beginPath(); context.moveTo(-capWidth / 2 + 7, -18); context.quadraticCurveTo(-capWidth / 2, -18, -capWidth / 2, -10); context.lineTo(-stemWidth / 2, 7); context.lineTo(stemWidth / 2, 7); context.lineTo(capWidth / 2, -10); context.quadraticCurveTo(capWidth / 2, -18, capWidth / 2 - 7, -18); context.closePath(); context.fill(); context.strokeStyle = "#8a5a32"; context.stroke();
      context.strokeStyle = "rgba(112,65,31,.6)"; context.lineWidth = 1.5; for (let x = -capWidth * 0.38; x < capWidth * 0.4; x += 15) { context.beginPath(); context.moveTo(x, -13); context.lineTo(x + 5, 2); context.stroke(); } context.restore();

      if (releaseAge >= 0 && releaseAge < 0.5) { const radius = 30 + releaseAge * 190; context.strokeStyle = `rgba(110,231,211,${1 - releaseAge * 2})`; context.lineWidth = 3; context.beginPath(); context.arc(centerX, tubeTop, radius, 0, Math.PI * 2); context.stroke(); context.fillStyle = "#fde68a"; context.font = simulationCanvasFont("13px", 500); context.fillText("Khí thực hiện công · W tăng", centerX + tubeWidth * 0.48, tubeTop - 32); }
      if (current.showLabels) {
        const occupied: AnnotationRect[] = [];

        const atmosphereX = clamp(innerLeft - 40, 54, width - 54);
        drawVector(context, atmosphereX, tubeTop - 60, atmosphereX, tubeTop - 12, "#fca5a5");
        const atmosphereLabel = getAnnotationLayout(context, "P_atm", atmosphereX - 68, tubeTop - 55, width, height, occupied);
        drawAnnotationLabel(context, atmosphereLabel, "P_atm", "#fca5a5");

        if (releaseAge < 0.35) {
          const forceX = clamp(centerX + corkSide + tubeWidth * 0.2, 45, width - 90);
          drawVector(context, forceX, corkCenterY - 3, forceX, corkCenterY - 66, "#6ee7d3");
          const forceLabel = getAnnotationLayout(context, "F_ap", forceX + 12, corkCenterY - 64, width, height, occupied);
          drawAnnotationLabel(context, forceLabel, "F_ap", "#6ee7d3");

          const gravityX = clamp(centerX + corkSide + tubeWidth * 0.38, 60, width - 55);
          drawVector(context, gravityX, corkCenterY - 5, gravityX, corkCenterY + 55, "#fca5a5");
          const gravityLabel = getAnnotationLayout(context, "mg", gravityX + 12, corkCenterY + 18, width, height, occupied);
          drawAnnotationLabel(context, gravityLabel, "mg", "#fca5a5");
        }

        drawVector(context, centerX - 45, burnerY - 10, centerX - 45, tubeBottom + 10, "#fde68a");
        const heatLabel = getAnnotationLayout(context, "Q_in", centerX - 102, burnerY - 51, width, height, occupied);
        drawAnnotationLabel(context, heatLabel, "Q_in", "#fde68a");

        const temperatureLabel = getAnnotationLayout(context, "T khí", innerRight - 66, innerBottom - 48, width, height, occupied);
        drawAnnotationLabel(context, temperatureLabel, "T khí", "#fde68a");

        const pressureLabel = getAnnotationLayout(context, "P_trong", innerRight - 102, tubeTop + tubeHeight * 0.42, width, height, occupied);
        context.strokeStyle = "rgba(219,234,254,.65)"; context.lineWidth = 1.5; context.beginPath(); context.moveTo(pressureLabel.x, pressureLabel.y + pressureLabel.height / 2); context.lineTo(innerRight - 24, pressureLabel.y + pressureLabel.height / 2); context.stroke();
        drawAnnotationLabel(context, pressureLabel, "P_trong", "#dbeafe");

      }
      frame = requestAnimationFrame(render);
    };
    frame = requestAnimationFrame(render); return () => cancelAnimationFrame(frame);
  }, []);
  return <canvas ref={canvasRef} className="h-full w-full" aria-label="Mô phỏng các phân tử khí được đun nóng làm nút bấc bật khỏi ống" />;
});
