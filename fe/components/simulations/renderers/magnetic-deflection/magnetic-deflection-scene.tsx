"use client";

import { useCallback, useEffect, useRef } from "react";
import { useContainerSize } from "../../shared/use-container-size";
import {
  FIELD_LEFT,
  PARTICLE_START,
  RADIATION_COLORS,
  SCREEN_X,
  VIEW_HEIGHT,
  VIEW_WIDTH,
  fieldRight,
} from "../../engines/magnetic-deflection/constants";
import {
  applyMagneticCommand,
  createMagneticDeflectionState,
  magneticDeflectionMetrics,
  stepMagneticDeflection,
} from "../../engines/magnetic-deflection/physics";
import type {
  MagneticDeflectionCommand,
  MagneticDeflectionMetrics,
  MagneticDeflectionParams,
  MagneticDeflectionState,
  RadiationParticle,
  RadiationType,
  Vector2,
} from "../../engines/magnetic-deflection/types";

type Props = {
  params: MagneticDeflectionParams;
  running: boolean;
  speed: number;
  resetSignal: number;
  command: { type: MagneticDeflectionCommand; token: number };
  onData: (metrics: MagneticDeflectionMetrics) => void;
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

function drawArrow(
  context: CanvasRenderingContext2D,
  from: Vector2,
  to: Vector2,
  color: string,
  width = 2,
) {
  const angle = Math.atan2(to.y - from.y, to.x - from.x);
  context.save();
  context.strokeStyle = color;
  context.fillStyle = color;
  context.lineWidth = width;
  context.beginPath();
  context.moveTo(from.x, from.y);
  context.lineTo(to.x, to.y);
  context.stroke();
  context.beginPath();
  context.moveTo(to.x, to.y);
  context.lineTo(to.x - 8 * Math.cos(angle - 0.55), to.y - 8 * Math.sin(angle - 0.55));
  context.lineTo(to.x - 8 * Math.cos(angle + 0.55), to.y - 8 * Math.sin(angle + 0.55));
  context.closePath();
  context.fill();
  context.restore();
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
  const width = context.measureText(text).width + 18;
  if (anchor) {
    context.strokeStyle = "rgba(203,213,225,0.62)";
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(anchor.x, anchor.y);
    context.lineTo(x + width / 2, y + 13);
    context.stroke();
  }
  roundedRect(context, x, y, width, 26, 7);
  context.fillStyle = "rgba(2,6,23,0.82)";
  context.fill();
  context.strokeStyle = "rgba(148,163,184,0.32)";
  context.stroke();
  context.fillStyle = "#e2e8f0";
  context.fillText(text, x + 9, y + 17);
  context.restore();
}

function drawFieldSymbol(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  outward: boolean,
  opacity: number,
) {
  context.save();
  context.globalAlpha = opacity;
  context.strokeStyle = "#7dd3fc";
  context.fillStyle = "#7dd3fc";
  context.lineWidth = 1.25;
  context.beginPath();
  context.arc(x, y, 7, 0, Math.PI * 2);
  context.stroke();
  if (outward) {
    context.beginPath();
    context.arc(x, y, 2.1, 0, Math.PI * 2);
    context.fill();
  } else {
    context.beginPath();
    context.moveTo(x - 3.4, y - 3.4);
    context.lineTo(x + 3.4, y + 3.4);
    context.moveTo(x + 3.4, y - 3.4);
    context.lineTo(x - 3.4, y + 3.4);
    context.stroke();
  }
  context.restore();
}

function drawParticleTrail(
  context: CanvasRenderingContext2D,
  particle: RadiationParticle,
  trailPersistence: number,
  sourceActivity: number,
) {
  if (particle.path.length < 2) return;
  const visibleSegments = Math.round(40 + Math.max(0, Math.min(100, trailPersistence)) * 3.2);
  const start = Math.max(1, particle.path.length - visibleSegments);
  const color = RADIATION_COLORS[particle.type];
  context.save();
  context.lineCap = "round";
  context.lineJoin = "round";
  context.shadowColor = color;
  context.shadowBlur = 7;
  for (let index = start; index < particle.path.length; index += 1) {
    const from = particle.path[index - 1]!;
    const to = particle.path[index]!;
    const progress = (index - start + 1) / Math.max(1, particle.path.length - start);
    const activityOpacity = 0.35 + Math.max(0, Math.min(100, sourceActivity)) * 0.0065;
    context.globalAlpha = (0.14 + progress * 0.76) * activityOpacity;
    context.strokeStyle = color;
    context.lineWidth = particle.type === "alpha" ? 3.2 : particle.type === "beta" ? 2.2 : 2.5;
    context.beginPath();
    context.moveTo(from.x, from.y);
    context.lineTo(to.x, to.y);
    context.stroke();
  }
  context.globalAlpha = 1;
  context.shadowBlur = 0;
  if (particle.active) {
    context.fillStyle = color;
    context.shadowColor = color;
    context.shadowBlur = 11;
    context.beginPath();
    context.arc(particle.position.x, particle.position.y, particle.type === "alpha" ? 5 : 4, 0, Math.PI * 2);
    context.fill();
    context.shadowBlur = 0;
    context.fillStyle = "#f8fafc";
    context.font = "800 10px Inter, sans-serif";
    const mark = particle.type === "alpha" ? "α" : particle.type === "beta" ? "β" : "γ";
    context.fillText(mark, particle.position.x + 8, particle.position.y - 7);
  }
  context.restore();
}

function drawLorentzForce(
  context: CanvasRenderingContext2D,
  particle: RadiationParticle,
  params: MagneticDeflectionParams,
) {
  if (!particle.active || particle.type === "gamma") return;
  const right = fieldRight(params);
  if (particle.position.x < FIELD_LEFT || particle.position.x > right) return;
  const directionSign = params.fieldDirection >= 0 ? 1 : -1;
  const chargeSign = particle.type === "alpha" ? 1 : -1;
  const sign = directionSign * chargeSign;
  const normal = { x: particle.direction.y * sign, y: -particle.direction.x * sign };
  const length = 30 + params.magneticField * 15;
  const end = {
    x: particle.position.x + normal.x * length,
    y: particle.position.y + normal.y * length,
  };
  drawArrow(context, particle.position, end, "rgba(248,250,252,0.72)", 1.5);
  context.fillStyle = "#e2e8f0";
  context.font = "700 9px Inter, sans-serif";
  context.fillText("Fₗ", end.x + 4, end.y - 3);
}

export function MagneticDeflectionScene({
  params,
  running,
  speed,
  resetSignal,
  command,
  onData,
  onComplete,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<MagneticDeflectionState>(createMagneticDeflectionState());
  const paramsRef = useRef(params);
  const callbacksRef = useRef({ onData, onComplete });
  const drawRef = useRef<() => void>(() => undefined);
  const lastCommandTokenRef = useRef(command.token);
  const lastDataTimeRef = useRef(-1);
  const reducedMotionRef = useRef(false);
  const { ref: containerRef, size } = useContainerSize<HTMLDivElement>();

  useEffect(() => {
    paramsRef.current = params;
    callbacksRef.current = { onData, onComplete };
    drawRef.current();
  }, [onComplete, onData, params]);

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
    context.fillStyle = "#0b1324";
    context.fillRect(0, 0, size.width, size.height);

    const scale = Math.min(size.width / VIEW_WIDTH, size.height / VIEW_HEIGHT);
    const offsetX = (size.width - VIEW_WIDTH * scale) / 2;
    const offsetY = (size.height - VIEW_HEIGHT * scale) / 2;
    context.save();
    context.translate(offsetX, offsetY);
    context.scale(scale, scale);

    const right = fieldRight(currentParams);
    const fieldAlpha = 0.08 + Math.min(0.2, currentParams.magneticField * 0.13);
    const fieldGradient = context.createLinearGradient(FIELD_LEFT, 0, right, 0);
    fieldGradient.addColorStop(0, `rgba(14,116,144,${fieldAlpha * 0.7})`);
    fieldGradient.addColorStop(0.5, `rgba(8,145,178,${fieldAlpha})`);
    fieldGradient.addColorStop(1, `rgba(14,116,144,${fieldAlpha * 0.7})`);
    context.fillStyle = fieldGradient;
    roundedRect(context, FIELD_LEFT, 110, right - FIELD_LEFT, 400, 22);
    context.fill();
    context.strokeStyle = "rgba(125,211,252,0.48)";
    context.lineWidth = 1.5;
    context.setLineDash([7, 7]);
    context.stroke();
    context.setLineDash([]);

    const outward = currentParams.fieldDirection >= 0;
    const symbolOpacity = currentParams.magneticField <= 0.01
      ? 0.12
      : 0.24 + Math.min(0.5, currentParams.magneticField * 0.42);
    for (let y = 145; y <= 475; y += 55) {
      for (let x = FIELD_LEFT + 34; x <= right - 24; x += 58) {
        drawFieldSymbol(context, x, y, outward, symbolOpacity);
      }
    }
    context.save();
    context.shadowColor = "rgba(148,163,184,0.25)";
    context.shadowBlur = 18;
    context.fillStyle = "#1f2937";
    context.strokeStyle = "#94a3b8";
    context.lineWidth = 2.5;
    roundedRect(context, 48, 238, 150, 144, 18);
    context.fill();
    context.stroke();
    context.restore();
    context.fillStyle = "#111827";
    roundedRect(context, 63, 254, 115, 112, 12);
    context.fill();
    context.strokeStyle = "rgba(203,213,225,0.36)";
    context.stroke();
    context.fillStyle = "#f59e0b";
    context.shadowColor = "#f59e0b";
    context.shadowBlur = 5 + state.emissionPulse * (6 + currentParams.sourceActivity * 0.12);
    context.beginPath();
    context.arc(143, 310, 12, 0, Math.PI * 2);
    context.fill();
    context.shadowBlur = 0;
    context.fillStyle = "#fef3c7";
    context.font = "800 10px Inter, sans-serif";
    context.fillText("αβγ", 132, 314);

    context.fillStyle = "#64748b";
    context.strokeStyle = "#cbd5e1";
    context.lineWidth = 1.5;
    roundedRect(context, 178, 286, 105, 16, 4);
    context.fill();
    context.stroke();
    roundedRect(context, 178, 318, 105, 16, 4);
    context.fill();
    context.stroke();
    context.fillStyle = "#0b1324";
    context.fillRect(178, 302, 105, 16);
    context.strokeStyle = "rgba(226,232,240,0.45)";
    context.beginPath();
    context.moveTo(205, 310);
    context.lineTo(FIELD_LEFT, 310);
    context.stroke();

    context.save();
    context.shadowColor = "rgba(226,232,240,0.28)";
    context.shadowBlur = 15;
    const screenGradient = context.createLinearGradient(SCREEN_X, 0, SCREEN_X + 34, 0);
    screenGradient.addColorStop(0, "#f8fafc");
    screenGradient.addColorStop(0.42, "#94a3b8");
    screenGradient.addColorStop(1, "#334155");
    context.fillStyle = screenGradient;
    context.strokeStyle = "#e2e8f0";
    context.lineWidth = 2;
    roundedRect(context, SCREEN_X, 82, 30, 456, 7);
    context.fill();
    context.stroke();
    context.restore();
    context.fillStyle = "#64748b";
    context.font = "600 8px ui-monospace, monospace";
    for (let y = 110; y <= 510; y += 40) {
      context.fillRect(SCREEN_X - 8, y, 8, 1);
      context.fillText(`${Math.round((PARTICLE_START.y - y) / 4)}`, SCREEN_X + 36, y + 3);
    }
    context.fillStyle = "#cbd5e1";
    context.font = "700 10px Inter, sans-serif";
    context.fillText("ĐỘ LỆCH (cm quy ước)", SCREEN_X - 42, 565);

    for (const particle of state.particles) {
      drawParticleTrail(context, particle, currentParams.trailPersistence, currentParams.sourceActivity);
      drawLorentzForce(context, particle, currentParams);
    }
    for (const impact of state.impacts) {
      const color = RADIATION_COLORS[impact.particleType];
      context.save();
      context.shadowColor = color;
      context.shadowBlur = 18;
      context.fillStyle = color;
      context.beginPath();
      context.arc(impact.position.x + 4, impact.position.y, 5, 0, Math.PI * 2);
      context.fill();
      context.restore();
    }

    drawLabel(context, "Hộp chì bảo vệ", 48, 190, { x: 91, y: 238 });
    drawLabel(context, "Nguồn phóng xạ", 68, 404, { x: 143, y: 322 });
    drawLabel(context, "Ống chuẩn trực", 188, 370, { x: 232, y: 327 });
    drawLabel(context, "Vùng từ trường đều", 470, 76, { x: 515, y: 111 });
    drawLabel(context, "Màn quan sát", 820, 38, { x: 890, y: 84 });

    const finalPoint = (type: RadiationType) =>
      state.particles.find((particle) => particle.type === type)?.position;
    const alpha = finalPoint("alpha");
    const beta = finalPoint("beta");
    const gamma = finalPoint("gamma");
    if (state.phase === "impacting" || state.phase === "complete") {
      if (alpha) drawLabel(context, "Tia α: lệch ít", 708, 184, alpha);
      if (beta) drawLabel(context, "Tia β⁻: lệch nhiều", 674, 424, beta);
      if (gamma) drawLabel(context, "Tia γ: đi thẳng", 680, 287, gamma);
    }

    context.fillStyle = "rgba(2,6,23,0.76)";
    roundedRect(context, 30, 548, 380, 42, 10);
    context.fill();
    context.fillStyle = "#cbd5e1";
    context.font = "600 10px Inter, sans-serif";
    context.fillText("F = q(v × B) · α và β⁻ lệch ngược phía · γ không chịu lực Lorentz", 45, 568);
    context.fillStyle = "#94a3b8";
    context.fillText("Đường màu là quỹ đạo minh họa, không phải màu thật của bức xạ.", 45, 582);

    context.restore();
  }, [size.height, size.width]);

  useEffect(() => {
    drawRef.current = drawScene;
  }, [drawScene]);

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
    stateRef.current = createMagneticDeflectionState();
    lastDataTimeRef.current = -1;
    callbacksRef.current.onData(magneticDeflectionMetrics(stateRef.current, paramsRef.current));
    drawRef.current();
  }, [resetSignal]);

  useEffect(() => {
    if (lastCommandTokenRef.current === command.token) return;
    lastCommandTokenRef.current = command.token;
    stateRef.current = applyMagneticCommand(stateRef.current, command.type);
    callbacksRef.current.onData(magneticDeflectionMetrics(stateRef.current, paramsRef.current));
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
      const delta = Math.min(0.08, Math.max(0, (now - previous) / 1000));
      const motionScale = reducedMotionRef.current ? Math.min(0.5, speed) : speed;
      const result = stepMagneticDeflection(stateRef.current, paramsRef.current, delta * motionScale);
      stateRef.current = result.state;
      drawScene();
      if (stateRef.current.time - lastDataTimeRef.current >= 0.08 || result.completed) {
        lastDataTimeRef.current = stateRef.current.time;
        callbacksRef.current.onData(magneticDeflectionMetrics(stateRef.current, paramsRef.current));
      }
      if (result.completed) callbacksRef.current.onComplete();
      animationFrame = requestAnimationFrame(animate);
    };
    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [drawScene, running, size.height, size.width, speed]);

  return (
    <div ref={containerRef} className="relative h-full min-h-[360px] w-full overflow-hidden bg-[#0b1324]">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 block h-full w-full"
        role="img"
        aria-label="Độ lệch của tia alpha, beta trừ và gamma trong từ trường đều"
      />
    </div>
  );
}
