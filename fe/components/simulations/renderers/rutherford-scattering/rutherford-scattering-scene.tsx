"use client";

import { useCallback, useEffect, useRef } from "react";
import { useContainerSize } from "../../shared/use-container-size";
import {
  CATEGORY_LABELS,
  SCATTERING_COLORS,
  SCATTERING_VIEW,
} from "../../engines/rutherford-scattering/constants";
import {
  createRutherfordScatteringState,
  handleScatteringCommand,
  rutherfordScatteringMetrics,
  stepRutherfordScattering,
} from "../../engines/rutherford-scattering/physics";
import type {
  RutherfordScatteringCommand,
  RutherfordScatteringMetrics,
  RutherfordScatteringParams,
  RutherfordScatteringState,
  ScatteringParticle,
  Vector2,
} from "../../engines/rutherford-scattering/types";

type Props = {
  params: RutherfordScatteringParams;
  running: boolean;
  speed: number;
  resetSignal: number;
  command: { type: RutherfordScatteringCommand; token: number };
  showTrails: boolean;
  showLabels: boolean;
  onData: (metrics: RutherfordScatteringMetrics) => void;
  onComplete: () => void;
};

function roundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  context.beginPath();
  context.roundRect(x, y, width, height, radius);
}

function drawLabel(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  anchor?: Vector2,
) {
  context.save();
  context.font = "600 12px Inter, sans-serif";
  const width = context.measureText(text).width + 20;
  if (anchor) {
    context.strokeStyle = "rgba(203,213,225,.62)";
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(anchor.x, anchor.y);
    context.lineTo(x + width / 2, y + 14);
    context.stroke();
  }
  roundedRect(context, x, y, width, 28, 8);
  context.fillStyle = "rgba(2,6,23,.88)";
  context.fill();
  context.strokeStyle = "rgba(148,163,184,.38)";
  context.stroke();
  context.fillStyle = "#e2e8f0";
  context.fillText(text, x + 10, y + 18);
  context.restore();
}

function drawArrow(
  context: CanvasRenderingContext2D,
  from: Vector2,
  to: Vector2,
  color: string,
) {
  const angle = Math.atan2(to.y - from.y, to.x - from.x);
  context.save();
  context.strokeStyle = color;
  context.fillStyle = color;
  context.lineWidth = 1.5;
  context.beginPath();
  context.moveTo(from.x, from.y);
  context.lineTo(to.x, to.y);
  context.stroke();
  context.beginPath();
  context.moveTo(to.x, to.y);
  context.lineTo(to.x - 8 * Math.cos(angle - 0.5), to.y - 8 * Math.sin(angle - 0.5));
  context.lineTo(to.x - 8 * Math.cos(angle + 0.5), to.y - 8 * Math.sin(angle + 0.5));
  context.closePath();
  context.fill();
  context.restore();
}

function drawParticle(
  context: CanvasRenderingContext2D,
  particle: ScatteringParticle,
  showTrails: boolean,
) {
  const color = particle.category ? SCATTERING_COLORS[particle.category] : "#fbbf24";
  context.save();
  if (showTrails && particle.trail.length > 1) {
    context.lineCap = "round";
    context.lineJoin = "round";
    for (let index = 1; index < particle.trail.length; index += 1) {
      const from = particle.trail[index - 1]!;
      const to = particle.trail[index]!;
      const progress = index / particle.trail.length;
      context.globalAlpha = (0.07 + progress * 0.34) * particle.opacity;
      context.strokeStyle = color;
      context.lineWidth = particle.category === "backscatter" ? 2.3 : 1.7;
      context.beginPath();
      context.moveTo(from.x, from.y);
      context.lineTo(to.x, to.y);
      context.stroke();
    }
  }
  context.globalAlpha = particle.opacity;
  context.fillStyle = color;
  context.shadowColor = color;
  context.shadowBlur = 8;
  context.beginPath();
  context.arc(particle.position.x, particle.position.y, 3.7, 0, Math.PI * 2);
  context.fill();
  context.shadowBlur = 0;
  context.fillStyle = "#fff7d6";
  context.font = "800 8px Inter, sans-serif";
  context.fillText("α", particle.position.x + 6, particle.position.y - 5);
  context.restore();
}

function drawScreen(context: CanvasRenderingContext2D, state: RutherfordScatteringState) {
  const { x, y } = SCATTERING_VIEW.foil;
  const radius = SCATTERING_VIEW.screenRadius;
  context.save();
  context.shadowColor = "rgba(163,230,53,.22)";
  context.shadowBlur = 18 + state.detectorPulse * 12;
  context.strokeStyle = "#365314";
  context.lineWidth = 22;
  context.beginPath();
  context.arc(x, y, radius, 0, Math.PI * 2);
  context.stroke();
  context.shadowBlur = 0;
  context.strokeStyle = "#84cc16";
  context.lineWidth = 10;
  context.beginPath();
  context.arc(x, y, radius, 0, Math.PI * 2);
  context.stroke();
  context.strokeStyle = "rgba(217,249,157,.78)";
  context.lineWidth = 2;
  context.beginPath();
  context.arc(x, y, radius - 4, 0, Math.PI * 2);
  context.stroke();
  context.restore();

  context.fillStyle = "#07111d";
  context.fillRect(x - radius - 15, y - 22, 46, 44);
  context.strokeStyle = "rgba(190,242,100,.42)";
  context.lineWidth = 1.5;
  context.strokeRect(x - radius - 15, y - 22, 46, 44);
}

function drawFoil(
  context: CanvasRenderingContext2D,
  state: RutherfordScatteringState,
  params: RutherfordScatteringParams,
) {
  const width = 9 + params.foilThickness * 5;
  const gradient = context.createLinearGradient(SCATTERING_VIEW.foil.x - width / 2, 0, SCATTERING_VIEW.foil.x + width / 2, 0);
  gradient.addColorStop(0, "#a16207");
  gradient.addColorStop(0.32, "#fde68a");
  gradient.addColorStop(0.62, "#facc15");
  gradient.addColorStop(1, "#854d0e");
  context.save();
  context.fillStyle = gradient;
  context.strokeStyle = "#fef08a";
  context.lineWidth = 1.5;
  context.shadowColor = "#fbbf24";
  context.shadowBlur = 8 + state.foilPulse * 20;
  roundedRect(context, SCATTERING_VIEW.foil.x - width / 2, 173, width, 274, 4);
  context.fill();
  context.stroke();
  context.shadowBlur = 0;

  for (const nucleus of state.nuclei) {
    context.globalAlpha = 0.5 + nucleus.pulse * 0.5;
    context.fillStyle = "#f97316";
    context.shadowColor = "#fde68a";
    context.shadowBlur = nucleus.pulse * 18;
    context.beginPath();
    context.arc(nucleus.position.x, nucleus.position.y, 2.2 + nucleus.pulse * 2.4, 0, Math.PI * 2);
    context.fill();
  }
  context.restore();
}

export function RutherfordScatteringScene({
  params,
  running,
  speed,
  resetSignal,
  command,
  showTrails,
  showLabels,
  onData,
  onComplete,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<RutherfordScatteringState>(createRutherfordScatteringState());
  const paramsRef = useRef(params);
  const optionsRef = useRef({ showTrails, showLabels });
  const callbacksRef = useRef({ onData, onComplete });
  const drawRef = useRef<() => void>(() => undefined);
  const lastCommandTokenRef = useRef(command.token);
  const lastDataTimeRef = useRef(-1);
  const completedNotifiedRef = useRef(false);
  const reducedMotionRef = useRef(false);
  const { ref: containerRef, size } = useContainerSize<HTMLDivElement>();

  useEffect(() => {
    callbacksRef.current = { onData, onComplete };
  }, [onComplete, onData]);

  useEffect(() => {
    paramsRef.current = params;
    optionsRef.current = { showTrails, showLabels };
    drawRef.current();
  }, [params, showLabels, showTrails]);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => { reducedMotionRef.current = media.matches; };
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  const drawScene = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || size.width <= 0 || size.height <= 0) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    const state = stateRef.current;
    const currentParams = paramsRef.current;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    context.clearRect(0, 0, size.width, size.height);
    const background = context.createRadialGradient(size.width * 0.52, size.height * 0.5, 30, size.width * 0.52, size.height * 0.5, size.width * 0.7);
    background.addColorStop(0, "#14253a");
    background.addColorStop(1, "#050b15");
    context.fillStyle = background;
    context.fillRect(0, 0, size.width, size.height);

    const scale = Math.min(size.width / SCATTERING_VIEW.width, size.height / SCATTERING_VIEW.height);
    const offsetX = (size.width - SCATTERING_VIEW.width * scale) / 2;
    const offsetY = (size.height - SCATTERING_VIEW.height * scale) / 2;
    context.save();
    context.translate(offsetX, offsetY);
    context.scale(scale, scale);

    context.fillStyle = "rgba(15,23,42,.62)";
    context.strokeStyle = "#64748b";
    context.lineWidth = 2.5;
    roundedRect(context, 24, 54, 952, 524, 36);
    context.fill();
    context.stroke();

    drawScreen(context, state);

    context.fillStyle = "#111827";
    context.strokeStyle = "#64748b";
    context.lineWidth = 2;
    roundedRect(context, 42, 246, 120, 128, 17);
    context.fill();
    context.stroke();
    context.fillStyle = "#334155";
    roundedRect(context, 55, 259, 94, 102, 11);
    context.fill();
    context.fillStyle = "#f59e0b";
    context.shadowColor = "#fbbf24";
    context.shadowBlur = 6 + state.sourcePulse * 13;
    context.beginPath();
    context.arc(118, SCATTERING_VIEW.source.y, 11, 0, Math.PI * 2);
    context.fill();
    context.shadowBlur = 0;
    context.fillStyle = "#fff7d6";
    context.font = "800 11px Inter, sans-serif";
    context.fillText("α", 114, 314);

    context.fillStyle = "#64748b";
    context.strokeStyle = "#cbd5e1";
    roundedRect(context, 160, 275, 125, 18, 4);
    context.fill();
    context.stroke();
    roundedRect(context, 160, 327, 125, 18, 4);
    context.fill();
    context.stroke();
    context.fillStyle = "#07111d";
    context.fillRect(158, 294, 138, 32);
    context.strokeStyle = "rgba(251,191,36,.26)";
    context.beginPath();
    context.moveTo(285, SCATTERING_VIEW.source.y);
    context.lineTo(SCATTERING_VIEW.foil.x, SCATTERING_VIEW.foil.y);
    context.stroke();

    drawFoil(context, state, currentParams);
    for (const particle of state.particles) drawParticle(context, particle, optionsRef.current.showTrails);

    for (const flash of state.flashes) {
      const fade = 1 - flash.age / flash.lifetime;
      const color = SCATTERING_COLORS[flash.category];
      context.save();
      context.globalAlpha = fade;
      context.fillStyle = "#f7fee7";
      context.shadowColor = color;
      context.shadowBlur = 22 * fade;
      context.beginPath();
      context.arc(flash.position.x, flash.position.y, 4 + 3 * fade, 0, Math.PI * 2);
      context.fill();
      context.restore();
    }

    if (optionsRef.current.showLabels) {
      const screenPoint = (angle: number): Vector2 => ({
        x: SCATTERING_VIEW.foil.x + Math.cos(angle) * SCATTERING_VIEW.screenRadius,
        y: SCATTERING_VIEW.foil.y + Math.sin(angle) * SCATTERING_VIEW.screenRadius,
      });

      drawLabel(context, "Nguồn phát hạt α", 48, 390, { x: 118, y: 321 });
      drawLabel(context, "Khe chuẩn trực", 170, 218, { x: 225, y: 275 });
      drawLabel(context, "Lá vàng rất mỏng", 465, 112, { x: SCATTERING_VIEW.foil.x, y: 173 });
      drawLabel(context, "Màn huỳnh quang ZnS", 690, 72, screenPoint(-0.88));
      drawLabel(context, "Hạt gần như đi thẳng", 696, 274, screenPoint(0));
      drawLabel(context, "Hạt lệch góc lớn", 720, 390, screenPoint(0.7));
      if (state.counters.backscattered > 0) {
        drawLabel(context, "Hạt bật ngược", 292, 116, screenPoint(-2.62));
      }
    }

    context.fillStyle = "rgba(2,6,23,.8)";
    roundedRect(context, 54, 532, 420, 30, 9);
    context.fill();
    let legendX = 72;
    for (const category of ["straight", "small", "large", "backscatter"] as const) {
      context.fillStyle = SCATTERING_COLORS[category];
      context.beginPath();
      context.arc(legendX, 547, 4, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = "#cbd5e1";
      context.font = "600 9px Inter, sans-serif";
      context.fillText(CATEGORY_LABELS[category], legendX + 9, 550);
      legendX += category === "straight" ? 105 : category === "backscatter" ? 0 : 98;
    }

    drawArrow(context, { x: 320, y: 92 }, { x: 402, y: 92 }, "rgba(251,191,36,.7)");
    context.fillStyle = "#fde68a";
    context.font = "600 9px Inter, sans-serif";
    context.fillText("Chùm α tới", 326, 82);
    context.restore();
  }, [size.height, size.width]);

  useEffect(() => { drawRef.current = drawScene; }, [drawScene]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || size.width <= 0 || size.height <= 0) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(size.width * dpr);
    canvas.height = Math.round(size.height * dpr);
    canvas.style.width = `${size.width}px`;
    canvas.style.height = `${size.height}px`;
    drawScene();
  }, [drawScene, size.height, size.width]);

  useEffect(() => {
    stateRef.current = createRutherfordScatteringState();
    lastDataTimeRef.current = -1;
    completedNotifiedRef.current = false;
    callbacksRef.current.onData(rutherfordScatteringMetrics(stateRef.current));
    drawRef.current();
  }, [resetSignal]);

  useEffect(() => {
    if (lastCommandTokenRef.current === command.token) return;
    lastCommandTokenRef.current = command.token;
    if (command.type === "start" || command.type === "resume") completedNotifiedRef.current = false;
    handleScatteringCommand(stateRef.current, command.type);
    callbacksRef.current.onData(rutherfordScatteringMetrics(stateRef.current));
    drawRef.current();
  }, [command]);

  useEffect(() => {
    if (!running || size.width <= 0 || size.height <= 0) {
      drawScene();
      return;
    }
    let animationFrame = 0;
    let previousTime: number | null = null;
    const animate = (now: number) => {
      const previous = previousTime ?? now;
      previousTime = now;
      const delta = Math.min(0.06, Math.max(0, (now - previous) / 1000));
      const motionScale = reducedMotionRef.current ? Math.min(0.55, speed) : speed;
      stepRutherfordScattering(stateRef.current, paramsRef.current, delta * motionScale);
      drawScene();
      if (stateRef.current.elapsed - lastDataTimeRef.current >= 0.08) {
        lastDataTimeRef.current = stateRef.current.elapsed;
        callbacksRef.current.onData(rutherfordScatteringMetrics(stateRef.current));
      }
      if (stateRef.current.phase === "completed" && !completedNotifiedRef.current) {
        completedNotifiedRef.current = true;
        callbacksRef.current.onComplete();
      }
      animationFrame = requestAnimationFrame(animate);
    };
    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [drawScene, running, size.height, size.width, speed]);

  return (
    <div ref={containerRef} className="relative h-full min-h-[360px] w-full overflow-hidden bg-[#050b15]">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 block h-full w-full"
        role="img"
        aria-label="Thí nghiệm tán xạ hạt alpha Rutherford với lá vàng và màn huỳnh quang kẽm sulfide"
      />
    </div>
  );
}
