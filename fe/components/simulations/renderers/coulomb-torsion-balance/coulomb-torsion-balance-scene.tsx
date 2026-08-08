"use client";

import { useCallback, useEffect, useRef } from "react";
import { useContainerSize } from "../../shared/use-container-size";
import { VIEW_HEIGHT, VIEW_WIDTH } from "../../engines/coulomb-torsion-balance/constants";
import {
  applyTorsionCommand,
  calculateTorsionForces,
  createTorsionBalanceState,
  stepTorsionBalance,
  torsionBalanceMetrics,
} from "../../engines/coulomb-torsion-balance/physics";
import type {
  TorsionBalanceCommand,
  TorsionBalanceMetrics,
  TorsionBalanceParams,
  TorsionBalanceState,
} from "../../engines/coulomb-torsion-balance/types";

type Props = {
  params: TorsionBalanceParams;
  running: boolean;
  speed: number;
  resetSignal: number;
  command: { type: TorsionBalanceCommand; token: number };
  onData: (metrics: TorsionBalanceMetrics) => void;
  onComplete: () => void;
};

const TAU = Math.PI * 2;

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
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  color: string,
  width = 2,
) {
  const angle = Math.atan2(toY - fromY, toX - fromX);
  context.save();
  context.strokeStyle = color;
  context.fillStyle = color;
  context.lineWidth = width;
  context.lineCap = "round";
  context.beginPath();
  context.moveTo(fromX, fromY);
  context.lineTo(toX, toY);
  context.stroke();
  context.beginPath();
  context.moveTo(toX, toY);
  context.lineTo(toX - 9 * Math.cos(angle - 0.52), toY - 9 * Math.sin(angle - 0.52));
  context.lineTo(toX - 9 * Math.cos(angle + 0.52), toY - 9 * Math.sin(angle + 0.52));
  context.closePath();
  context.fill();
  context.restore();
}

function drawLabel(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  anchorX?: number,
  anchorY?: number,
) {
  context.save();
  context.font = "600 12px Inter, sans-serif";
  const width = context.measureText(text).width + 20;
  if (anchorX !== undefined && anchorY !== undefined) {
    context.strokeStyle = "rgba(203,213,225,.56)";
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(anchorX, anchorY);
    context.lineTo(x + width / 2, y + 14);
    context.stroke();
  }
  roundedRect(context, x, y, width, 28, 8);
  context.fillStyle = "rgba(3,10,24,.88)";
  context.fill();
  context.strokeStyle = "rgba(148,163,184,.34)";
  context.stroke();
  context.fillStyle = "#e8edf5";
  context.fillText(text, x + 10, y + 18);
  context.restore();
}

function drawSphere(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  charge: number,
  chargeProgress: number,
  active: boolean,
) {
  const gradient = context.createRadialGradient(x - radius * 0.35, y - radius * 0.45, 1, x, y, radius);
  gradient.addColorStop(0, active ? "#fff4bb" : "#e7e3d7");
  gradient.addColorStop(0.38, active ? "#d9a94c" : "#a9a59a");
  gradient.addColorStop(1, active ? "#76501e" : "#555b62");
  context.save();
  context.shadowColor = active ? "rgba(251,191,36,.46)" : "transparent";
  context.shadowBlur = active ? 14 : 0;
  context.fillStyle = gradient;
  context.strokeStyle = active ? "#fde68a" : "#d6d3d1";
  context.lineWidth = 1.5;
  context.beginPath();
  context.arc(x, y, radius, 0, TAU);
  context.fill();
  context.stroke();
  context.shadowBlur = 0;
  if (chargeProgress > 0.05 && Math.abs(charge) > 0.02) {
    context.fillStyle = charge > 0 ? "#fff7cc" : "#d9f6ff";
    context.font = "800 14px Inter, sans-serif";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(charge > 0 ? "+" : "−", x, y + 0.5);
  }
  context.restore();
}

function drawChargeCloud(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  charge: number,
  amount: number,
  time: number,
) {
  if (amount < 0.04 || Math.abs(charge) < 0.02) return;
  context.save();
  context.fillStyle = charge > 0 ? "rgba(253,224,71,.82)" : "rgba(103,232,249,.82)";
  context.font = "700 8px Inter, sans-serif";
  context.textAlign = "center";
  for (let index = 0; index < 7; index += 1) {
    const angle = (index / 7) * TAU + time * 0.18;
    const radius = 22 + ((index * 7) % 4);
    context.globalAlpha = amount * (0.55 + (index % 3) * 0.18);
    context.fillText(charge > 0 ? "+" : "−", x + Math.cos(angle) * radius, y + Math.sin(angle) * radius * 0.72);
  }
  context.restore();
}

function mapSphere(angle: number) {
  return {
    x: 500 + Math.cos(angle) * 235,
    y: 405 + Math.sin(angle) * 137,
  };
}

function drawDegreeScale(context: CanvasRenderingContext2D) {
  context.save();
  for (let degree = 0; degree < 360; degree += 5) {
    const angle = (degree * Math.PI) / 180;
    const major = degree % 30 === 0;
    const outerX = 500 + Math.cos(angle) * 313;
    const outerY = 405 + Math.sin(angle) * 183;
    const innerX = 500 + Math.cos(angle) * (major ? 294 : 302);
    const innerY = 405 + Math.sin(angle) * (major ? 171 : 177);
    context.strokeStyle = major ? "rgba(240,196,111,.88)" : "rgba(203,213,225,.38)";
    context.lineWidth = major ? 1.6 : 1;
    context.beginPath();
    context.moveTo(innerX, innerY);
    context.lineTo(outerX, outerY);
    context.stroke();
    if (major) {
      const labelX = 500 + Math.cos(angle) * 276;
      const labelY = 408 + Math.sin(angle) * 160;
      context.fillStyle = "rgba(226,232,240,.72)";
      context.font = "600 8px ui-monospace, monospace";
      context.textAlign = "center";
      context.fillText(String(degree), labelX, labelY);
    }
  }
  context.restore();
}

function drawMicrometer(
  context: CanvasRenderingContext2D,
  angle: number,
  twist: number,
) {
  context.save();
  const x = 500;
  const top = 68;
  context.shadowColor = "rgba(0,0,0,.45)";
  context.shadowBlur = 18;
  const tubeGradient = context.createLinearGradient(455, 0, 545, 0);
  tubeGradient.addColorStop(0, "rgba(191,219,254,.08)");
  tubeGradient.addColorStop(0.45, "rgba(224,242,254,.28)");
  tubeGradient.addColorStop(0.62, "rgba(125,211,252,.10)");
  tubeGradient.addColorStop(1, "rgba(15,23,42,.16)");
  context.fillStyle = tubeGradient;
  context.strokeStyle = "rgba(203,213,225,.64)";
  context.lineWidth = 2;
  roundedRect(context, 462, 112, 76, 185, 31);
  context.fill();
  context.stroke();
  context.shadowBlur = 0;
  const brass = context.createLinearGradient(450, 0, 550, 0);
  brass.addColorStop(0, "#7c4e1d");
  brass.addColorStop(0.45, "#efc36e");
  brass.addColorStop(0.68, "#a56c29");
  brass.addColorStop(1, "#5c3516");
  context.fillStyle = brass;
  context.strokeStyle = "#f5d28a";
  roundedRect(context, 447, 98, 106, 27, 8);
  context.fill();
  context.stroke();
  context.beginPath();
  context.ellipse(x, top + 25, 48, 18, 0, 0, TAU);
  context.fill();
  context.stroke();
  context.fillStyle = "#273244";
  context.beginPath();
  context.ellipse(x, top + 25, 32, 11, 0, 0, TAU);
  context.fill();
  context.strokeStyle = "#f7d58b";
  context.beginPath();
  context.moveTo(x, top + 25);
  context.lineTo(x + Math.cos(angle - Math.PI / 2) * 29, top + 25 + Math.sin(angle - Math.PI / 2) * 10);
  context.stroke();
  context.fillStyle = brass;
  roundedRect(context, 487, 46, 26, 26, 7);
  context.fill();
  context.stroke();

  context.strokeStyle = "rgba(244,225,180,.88)";
  context.lineWidth = 1.4;
  context.beginPath();
  for (let y = 124; y <= 405; y += 3) {
    const phase = (y - 124) * 0.13 + twist * 7;
    const wireX = 500 + Math.sin(phase) * Math.min(2.2, Math.abs(twist) * 7);
    if (y === 124) context.moveTo(wireX, y);
    else context.lineTo(wireX, y);
  }
  context.stroke();
  context.restore();
}

export function CoulombTorsionBalanceScene({
  params,
  running,
  speed,
  resetSignal,
  command,
  onData,
  onComplete,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<TorsionBalanceState>(createTorsionBalanceState());
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
    const update = () => {
      reducedMotionRef.current = media.matches;
    };
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
    const forces = calculateTorsionForces(state, currentParams);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    context.clearRect(0, 0, size.width, size.height);
    const backdrop = context.createRadialGradient(size.width * 0.5, size.height * 0.55, 10, size.width * 0.5, size.height * 0.55, Math.max(size.width, size.height) * 0.72);
    backdrop.addColorStop(0, "#172942");
    backdrop.addColorStop(0.58, "#0b1628");
    backdrop.addColorStop(1, "#060d1a");
    context.fillStyle = backdrop;
    context.fillRect(0, 0, size.width, size.height);

    const scale = Math.min(size.width / VIEW_WIDTH, size.height / VIEW_HEIGHT);
    const offsetX = (size.width - VIEW_WIDTH * scale) / 2;
    const offsetY = (size.height - VIEW_HEIGHT * scale) / 2;
    context.save();
    context.translate(offsetX, offsetY);
    context.scale(scale, scale);

    context.save();
    context.shadowColor = "rgba(0,0,0,.5)";
    context.shadowBlur = 28;
    context.fillStyle = "rgba(11,25,43,.82)";
    context.strokeStyle = "rgba(203,213,225,.62)";
    context.lineWidth = 3;
    context.beginPath();
    context.ellipse(500, 405, 373, 218, 0, 0, TAU);
    context.fill();
    context.stroke();
    context.restore();

    const glass = context.createLinearGradient(0, 205, 0, 590);
    glass.addColorStop(0, "rgba(186,230,253,.13)");
    glass.addColorStop(0.42, "rgba(56,189,248,.035)");
    glass.addColorStop(1, "rgba(125,211,252,.11)");
    context.fillStyle = glass;
    context.beginPath();
    context.ellipse(500, 405, 351, 199, 0, 0, TAU);
    context.fill();
    context.strokeStyle = "rgba(186,230,253,.28)";
    context.lineWidth = 1.5;
    context.stroke();

    drawDegreeScale(context);
    drawMicrometer(context, state.dialAngle, state.angle - state.dialAngle);

    context.fillStyle = "rgba(109,72,31,.84)";
    context.strokeStyle = "rgba(245,210,138,.65)";
    context.lineWidth = 2;
    context.beginPath();
    context.ellipse(500, 405, 54, 31, 0, 0, TAU);
    context.fill();
    context.stroke();
    context.fillStyle = "#d7aa5c";
    context.beginPath();
    context.arc(500, 405, 9, 0, TAU);
    context.fill();

    const moving = mapSphere(state.angle);
    const opposite = mapSphere(state.angle + Math.PI);
    const fixedAngle = Math.atan2(forces.fixedPosition.y, forces.fixedPosition.x);
    const fixed = mapSphere(fixedAngle);
    const releaseOpacity = state.phase === "charging" || state.phase === "zeroing"
      ? 0.42
      : 1;
    context.save();
    context.globalAlpha = releaseOpacity;
    context.strokeStyle = "#e6d2a7";
    context.lineWidth = 8;
    context.lineCap = "round";
    context.shadowColor = "rgba(245,210,138,.24)";
    context.shadowBlur = 8;
    context.beginPath();
    context.moveTo(opposite.x, opposite.y);
    context.lineTo(moving.x, moving.y);
    context.stroke();
    context.shadowBlur = 0;
    context.strokeStyle = "#6b4828";
    context.lineWidth = 2;
    context.stroke();
    context.restore();

    context.save();
    context.translate(opposite.x, opposite.y);
    context.rotate(state.angle);
    context.fillStyle = "#d8c9aa";
    context.strokeStyle = "#fff1c7";
    context.lineWidth = 1.2;
    context.beginPath();
    context.moveTo(-18, -15);
    context.lineTo(14, -10);
    context.lineTo(18, 15);
    context.lineTo(-13, 11);
    context.closePath();
    context.fill();
    context.stroke();
    context.restore();

    context.strokeStyle = "#a97736";
    context.lineWidth = 5;
    context.beginPath();
    context.moveTo(fixed.x, 209);
    context.lineTo(fixed.x, fixed.y - 17);
    context.stroke();
    context.fillStyle = "#d5a75f";
    context.beginPath();
    context.ellipse(fixed.x, 208, 15, 7, 0, 0, TAU);
    context.fill();

    const charged = state.chargeProgress > 0.05;
    drawSphere(context, moving.x, moving.y, 15, currentParams.movingCharge, state.chargeProgress, charged);
    drawSphere(context, fixed.x, fixed.y, 15, currentParams.fixedCharge, state.chargeProgress, charged);
    drawChargeCloud(context, moving.x, moving.y, currentParams.movingCharge, state.chargeProgress, state.time);
    drawChargeCloud(context, fixed.x, fixed.y, currentParams.fixedCharge, state.chargeProgress, -state.time);

    if (state.phase === "charging") {
      const probeY = 160 + state.probeProgress * 173;
      context.strokeStyle = "#a8b4c5";
      context.lineWidth = 5;
      context.beginPath();
      context.moveTo(moving.x + 68, 125);
      context.lineTo(moving.x + 68, probeY);
      context.lineTo(moving.x + 10, moving.y - 5);
      context.stroke();
      context.fillStyle = "#e5bd6c";
      context.beginPath();
      context.arc(moving.x + 68, probeY, 9, 0, TAU);
      context.fill();
      for (let index = 0; index < 6; index += 1) {
        const progress = (state.phaseTime * 1.8 + index / 6) % 1;
        context.fillStyle = currentParams.movingCharge >= 0 ? "#fde047" : "#67e8f9";
        context.beginPath();
        context.arc(
          moving.x + 62 - progress * 48,
          probeY + (moving.y - probeY) * progress - 4,
          2.2,
          0,
          TAU,
        );
        context.fill();
      }
    }

    const dx = fixed.x - moving.x;
    const dy = fixed.y - moving.y;
    const length = Math.max(1, Math.hypot(dx, dy));
    const nx = -dy / length;
    const ny = dx / length;
    context.strokeStyle = "rgba(125,211,252,.72)";
    context.lineWidth = 1.2;
    context.setLineDash([4, 4]);
    context.beginPath();
    context.moveTo(moving.x + nx * 25, moving.y + ny * 25);
    context.lineTo(fixed.x + nx * 25, fixed.y + ny * 25);
    context.stroke();
    context.setLineDash([]);
    context.fillStyle = "#bae6fd";
    context.font = "700 10px Inter, sans-serif";
    context.textAlign = "center";
    context.fillText(`${(forces.distance * 100).toFixed(1)} cm`, (moving.x + fixed.x) / 2 + nx * 35, (moving.y + fixed.y) / 2 + ny * 35);

    if (state.chargeProgress > 0.05) {
      const direction = forces.forceSigned >= 0 ? 1 : -1;
      const forceLength = 38 + Math.min(48, forces.force * 1e6 * 28);
      const unitX = (moving.x - fixed.x) / length;
      const unitY = (moving.y - fixed.y) / length;
      drawArrow(
        context,
        moving.x,
        moving.y,
        moving.x + unitX * forceLength * direction,
        moving.y + unitY * forceLength * direction,
        "#fb7185",
        2.4,
      );
      context.fillStyle = "#fecdd3";
      context.font = "700 11px Inter, sans-serif";
      context.textAlign = "left";
      context.fillText("Fₑ", moving.x + unitX * forceLength * direction + 8, moving.y + unitY * forceLength * direction - 4);
    }

    if (Math.abs(state.angle) > 0.015) {
      context.strokeStyle = "rgba(250,204,21,.78)";
      context.lineWidth = 2;
      context.beginPath();
      context.ellipse(500, 405, 91, 53, 0, 0, state.angle, state.angle < 0);
      context.stroke();
      context.fillStyle = "#fde68a";
      context.font = "700 11px Inter, sans-serif";
      context.fillText(`θ = ${Math.abs((state.angle * 180) / Math.PI).toFixed(1)}°`, 582, 382);

      const restoringSign = state.angle > 0 ? -1 : 1;
      const restoringEnd = state.angle + restoringSign * 0.5;
      context.strokeStyle = "rgba(103,232,249,.86)";
      context.lineWidth = 2;
      context.beginPath();
      context.ellipse(
        500,
        405,
        72,
        42,
        0,
        state.angle,
        restoringEnd,
        restoringSign < 0,
      );
      context.stroke();
      const arrowEndX = 500 + Math.cos(restoringEnd) * 72;
      const arrowEndY = 405 + Math.sin(restoringEnd) * 42;
      const arrowStartAngle = restoringEnd - restoringSign * 0.08;
      drawArrow(
        context,
        500 + Math.cos(arrowStartAngle) * 72,
        405 + Math.sin(arrowStartAngle) * 42,
        arrowEndX,
        arrowEndY,
        "#67e8f9",
        2,
      );
      context.fillStyle = "#a5f3fc";
      context.font = "700 10px Inter, sans-serif";
      context.fillText("τxoắn", 514, 351);
    }

    context.strokeStyle = "rgba(255,255,255,.12)";
    context.lineWidth = 2;
    context.beginPath();
    context.ellipse(500, 405, 373, 218, 0, Math.PI * 0.08, Math.PI * 0.92);
    context.stroke();
    context.fillStyle = "rgba(255,255,255,.05)";
    context.beginPath();
    context.ellipse(403, 315, 112, 34, -0.38, 0, TAU);
    context.fill();

    drawLabel(context, "Vi kế xoắn", 564, 68, 532, 91);
    drawLabel(context, "Sợi bạc rất mảnh", 576, 145, 501, 184);
    drawLabel(context, "Quả cầu cố định", 757, 244, fixed.x, fixed.y);
    drawLabel(context, "Quả cầu di động", 700, 516, moving.x, moving.y);
    drawLabel(context, "Thanh cách điện", 313, 497, 420, 448);
    drawLabel(context, "Cánh cản dao động", 105, 344, opposite.x, opposite.y);

    context.fillStyle = "rgba(3,10,24,.78)";
    roundedRect(context, 28, 24, 250, 70, 12);
    context.fill();
    context.strokeStyle = "rgba(148,163,184,.28)";
    context.stroke();
    context.fillStyle = "#f1f5f9";
    context.font = "700 13px Inter, sans-serif";
    context.textAlign = "left";
    context.fillText("CÂN XOẮN COULOMB", 44, 47);
    context.fillStyle = "#a7b5c8";
    context.font = "500 11px Inter, sans-serif";
    context.fillText("Lực điện làm thanh quay; dây bạc xoắn lại", 44, 68);
    context.fillText("đến khi hai mô-men cân bằng.", 44, 84);

    context.fillStyle = "rgba(3,10,24,.82)";
    roundedRect(context, 742, 22, 230, 84, 12);
    context.fill();
    context.strokeStyle = "rgba(148,163,184,.28)";
    context.stroke();
    context.fillStyle = "#e2e8f0";
    context.font = "700 15px Georgia, serif";
    context.textAlign = "center";
    context.fillText("F = k|q₁q₂| / r²", 857, 49);
    context.fillStyle = "#9fb0c5";
    context.font = "500 10px Inter, sans-serif";
    context.fillText("r giảm một nửa → lực tăng khoảng 4 lần", 857, 70);
    context.fillText("Cân bằng: τđiện + τxoắn = 0", 857, 88);

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
    stateRef.current = createTorsionBalanceState();
    lastDataTimeRef.current = -1;
    callbacksRef.current.onData(torsionBalanceMetrics(stateRef.current, paramsRef.current));
    drawRef.current();
  }, [resetSignal]);

  useEffect(() => {
    if (lastCommandTokenRef.current === command.token) return;
    lastCommandTokenRef.current = command.token;
    stateRef.current = applyTorsionCommand(stateRef.current, command.type);
    callbacksRef.current.onData(torsionBalanceMetrics(stateRef.current, paramsRef.current));
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
      const delta = Math.min(0.05, Math.max(0, (now - previous) / 1000));
      const motionScale = reducedMotionRef.current ? Math.min(0.5, speed) : speed;
      const result = stepTorsionBalance(stateRef.current, paramsRef.current, delta * motionScale);
      stateRef.current = result.state;
      drawScene();
      if (stateRef.current.time - lastDataTimeRef.current >= 0.08 || result.completed) {
        lastDataTimeRef.current = stateRef.current.time;
        callbacksRef.current.onData(torsionBalanceMetrics(stateRef.current, paramsRef.current));
      }
      if (result.completed) callbacksRef.current.onComplete();
      else animationFrame = requestAnimationFrame(animate);
    };
    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [drawScene, running, size.height, size.width, speed]);

  return (
    <div ref={containerRef} className="relative h-full min-h-[360px] w-full overflow-hidden bg-[#081221]">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 block h-full w-full"
        role="img"
        aria-label="Cân xoắn Coulomb với sợi bạc, thanh cách điện và hai quả cầu tích điện"
      />
    </div>
  );
}
