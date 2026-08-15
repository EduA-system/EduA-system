"use client";

import { simulationCanvasFont } from "@/components/simulations/shared/typography";

import { useCallback, useEffect, useRef } from "react";
import { useContainerSize } from "../../shared/use-container-size";
import {
  GAS_LABELS,
  GAS_SHORT_LABELS,
  MATERIAL_LABELS,
  RUTHERFORD_VIEW,
  gasFromCode,
  materialFromCode,
} from "../../engines/rutherford-nitrogen/constants";
import {
  createRutherfordState,
  handleRutherfordCommand,
  loadRutherfordGas,
  rutherfordMetrics,
  stepRutherford,
} from "../../engines/rutherford-nitrogen/physics";
import type {
  NuclearTarget,
  ObservationView,
  RutherfordCommand,
  RutherfordMetrics,
  RutherfordParams,
  RutherfordParticle,
  RutherfordState,
  Vec2,
} from "../../engines/rutherford-nitrogen/types";

type Props = {
  params: RutherfordParams;
  running: boolean;
  speed: number;
  resetSignal: number;
  command: { type: RutherfordCommand; token: number };
  observationView: ObservationView;
  showTrails: boolean;
  showLabels: boolean;
  onData: (metrics: RutherfordMetrics) => void;
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
  anchor?: Vec2,
) {
  context.save();
  context.font = simulationCanvasFont("12px", 500);
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
  from: Vec2,
  to: Vec2,
  color: string,
  width = 1.5,
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
  context.lineTo(to.x - 8 * Math.cos(angle - 0.5), to.y - 8 * Math.sin(angle - 0.5));
  context.lineTo(to.x - 8 * Math.cos(angle + 0.5), to.y - 8 * Math.sin(angle + 0.5));
  context.closePath();
  context.fill();
  context.restore();
}

function drawGas(
  context: CanvasRenderingContext2D,
  params: RutherfordParams,
  gas: RutherfordState["currentGas"],
) {
  const density = gas === "vacuum" ? 0 : Math.round(18 + (params.gasDensity / 100) * 45);
  context.save();
  for (let index = 0; index < density; index += 1) {
    const x = RUTHERFORD_VIEW.chamberLeft + 28 + ((index * 83 + 31) % 410);
    const y = RUTHERFORD_VIEW.chamberTop + 28 + ((index * 57 + 19) % 210);
    const opacity = 0.11 + (index % 4) * 0.025;
    context.lineWidth = 1;
    if (gas === "carbonDioxide") {
      context.strokeStyle = `rgba(196,181,253,${opacity})`;
      context.beginPath();
      context.arc(x - 5, y, 2.5, 0, Math.PI * 2);
      context.arc(x + 5, y, 2.5, 0, Math.PI * 2);
      context.stroke();
      context.strokeStyle = `rgba(251,191,36,${opacity + 0.04})`;
      context.beginPath();
      context.arc(x, y, 2.8, 0, Math.PI * 2);
      context.stroke();
    } else {
      const isNitrogenMolecule = gas === "nitrogen" || (gas === "air" && index % 5 === 0);
      context.strokeStyle = isNitrogenMolecule
        ? `rgba(125,211,252,${opacity})`
        : `rgba(196,181,253,${opacity})`;
      context.beginPath();
      context.arc(x - 3, y, 2.5, 0, Math.PI * 2);
      context.arc(x + 3, y, 2.5, 0, Math.PI * 2);
      context.stroke();
    }
  }
  context.restore();
}

function targetColor(target: NuclearTarget): string {
  if (target.nucleusType === "nitrogen14") return "#38bdf8";
  if (target.nucleusType === "oxygen16") return "#a78bfa";
  return "#f59e0b";
}

function drawNuclearTarget(
  context: CanvasRenderingContext2D,
  target: NuclearTarget,
  enlarged: boolean,
) {
  const radius = target.displayRadius * (enlarged ? 0.92 : 0.72);
  const color = targetColor(target);
  context.save();
  context.globalAlpha = enlarged ? 0.86 : 0.68;
  context.shadowColor = color;
  context.shadowBlur = target.pulse > 0 ? 10 + target.pulse * 16 : enlarged ? 5 : 2;
  for (let index = 0; index < 5; index += 1) {
    const angle = index * 2.4;
    const offset = index === 0 ? 0 : radius * 0.46;
    context.fillStyle = index % 2 === 0 ? color : "#fb7185";
    context.beginPath();
    context.arc(
      target.position.x + Math.cos(angle) * offset,
      target.position.y + Math.sin(angle) * offset,
      radius * 0.42,
      0,
      Math.PI * 2,
    );
    context.fill();
  }
  context.shadowBlur = 0;
  context.fillStyle = "#f8fafc";
  context.font = simulationCanvasFont(`${enlarged ? 8 : 6}px`, 500);
  context.textAlign = "center";
  const mark = target.nucleusType === "nitrogen14" ? "N" : target.nucleusType === "oxygen16" ? "O" : "C";
  context.fillText(mark, target.position.x, target.position.y + (enlarged ? 3 : 2));
  if (target.pulse > 0) {
    context.globalAlpha = target.pulse;
    context.strokeStyle = color;
    context.lineWidth = 1.5;
    context.beginPath();
    context.arc(target.position.x, target.position.y, radius + (1 - target.pulse) * 18 + 6, 0, Math.PI * 2);
    context.stroke();
  }
  context.restore();
}

function drawNuclearTargetField(
  context: CanvasRenderingContext2D,
  state: RutherfordState,
  enlarged: boolean,
) {
  for (const target of state.nuclearTargets) drawNuclearTarget(context, target, enlarged);
}

function particleColor(particle: RutherfordParticle): string {
  if (particle.particleType === "alpha") return "#fbbf24";
  if (particle.particleType === "proton") return "#67e8f9";
  return "#c084fc";
}

function drawParticle(
  context: CanvasRenderingContext2D,
  particle: RutherfordParticle,
  showTrails: boolean,
  explanation: boolean,
) {
  if (!explanation && particle.particleType !== "alpha") return;
  const color = particleColor(particle);
  context.save();
  context.globalAlpha = particle.opacity;
  if (showTrails && particle.trail.length > 1) {
    context.lineCap = "round";
    for (let index = 1; index < particle.trail.length; index += 1) {
      const from = particle.trail[index - 1]!;
      const to = particle.trail[index]!;
      context.globalAlpha = particle.opacity * (0.08 + (index / particle.trail.length) * 0.3);
      context.strokeStyle = color;
      context.lineWidth = particle.particleType === "oxygen17" ? 3.5 : particle.particleType === "alpha" ? 2.4 : 1.7;
      context.beginPath();
      context.moveTo(from.x, from.y);
      context.lineTo(to.x, to.y);
      context.stroke();
    }
  }
  if (particle.active) {
    context.globalAlpha = particle.opacity;
    context.fillStyle = color;
    context.shadowColor = color;
    context.shadowBlur = explanation ? 10 : 5;
    context.beginPath();
    context.arc(
      particle.position.x,
      particle.position.y,
      explanation ? particle.radius * 1.35 : particle.radius * 0.85,
      0,
      Math.PI * 2,
    );
    context.fill();
    context.shadowBlur = 0;
    if (explanation) {
      context.fillStyle = "#f8fafc";
      context.font = simulationCanvasFont("10px", 500);
      const mark = particle.particleType === "alpha" ? "α" : particle.particleType === "proton" ? "p" : "¹⁷O";
      context.fillText(mark, particle.position.x + 10, particle.position.y - 8);
    }
  }
  context.restore();
}

function drawApparatus(
  context: CanvasRenderingContext2D,
  state: RutherfordState,
  params: RutherfordParams,
  showLabels: boolean,
) {
  const enclosureGradient = context.createLinearGradient(0, 90, 0, 525);
  enclosureGradient.addColorStop(0, "#182438");
  enclosureGradient.addColorStop(1, "#0b1628");
  context.fillStyle = enclosureGradient;
  context.strokeStyle = "#94a3b8";
  context.lineWidth = 3;
  roundedRect(context, 28, 86, 920, 448, 34);
  context.fill();
  context.stroke();

  context.fillStyle = "rgba(15,23,42,.78)";
  context.strokeStyle = "rgba(125,211,252,.55)";
  context.lineWidth = 2;
  roundedRect(context, RUTHERFORD_VIEW.chamberLeft, RUTHERFORD_VIEW.chamberTop, 468, 266, 24);
  context.fill();
  context.stroke();
  const gasGlow = context.createRadialGradient(470, 308, 20, 470, 308, 280);
  gasGlow.addColorStop(0, "rgba(14,116,144,.16)");
  gasGlow.addColorStop(1, "rgba(14,116,144,0)");
  context.fillStyle = gasGlow;
  roundedRect(context, 236, 176, 460, 258, 21);
  context.fill();
  drawGas(context, params, state.currentGas);
  drawNuclearTargetField(context, state, false);

  context.fillStyle = "#111827";
  context.strokeStyle = "#64748b";
  context.lineWidth = 2;
  roundedRect(context, 56, 232, 126, 154, 18);
  context.fill();
  context.stroke();
  context.fillStyle = "#334155";
  roundedRect(context, 68, 245, 98, 128, 12);
  context.fill();
  context.fillStyle = "#d97706";
  context.shadowColor = "#f59e0b";
  context.shadowBlur = 4 + state.sourcePulse * 9;
  context.beginPath();
  context.arc(132, RUTHERFORD_VIEW.beamY, 11, 0, Math.PI * 2);
  context.fill();
  context.shadowBlur = 0;
  context.fillStyle = "#fef3c7";
  context.font = simulationCanvasFont("11px", 500);
  context.fillText("α", 128.5, RUTHERFORD_VIEW.beamY + 4);

  context.fillStyle = "#64748b";
  context.strokeStyle = "#cbd5e1";
  roundedRect(context, 176, 270, 70, 24, 5);
  context.fill();
  context.stroke();
  roundedRect(context, 176, 322, 70, 24, 5);
  context.fill();
  context.stroke();
  context.fillStyle = "#07111f";
  context.fillRect(176, 294, 70, 28);

  context.strokeStyle = "rgba(148,163,184,.28)";
  context.setLineDash([5, 6]);
  context.beginPath();
  context.arc(530, RUTHERFORD_VIEW.beamY, 78, 0, Math.PI * 2);
  context.stroke();
  context.setLineDash([]);

  const latestReaction = [...state.reactions].reverse().find((reaction) => reaction.gas === state.currentGas);
  const collisionPoint = state.pendingReaction?.point ?? latestReaction?.point;
  const latestTargetHit = state.nuclearTargets.reduce<NuclearTarget | null>(
    (latest, target) => target.pulse > (latest?.pulse ?? 0) ? target : latest,
    null,
  );
  if (collisionPoint && state.reactionPulse > 0) {
    const progress = 1 - state.reactionPulse;
    context.save();
    context.globalAlpha = 0.28 + state.reactionPulse * 0.72;
    context.fillStyle = "#f8fafc";
    context.shadowColor = "#fde68a";
    context.shadowBlur = 7 + state.reactionPulse * 10;
    context.beginPath();
    context.arc(collisionPoint.x, collisionPoint.y, 3.2, 0, Math.PI * 2);
    context.fill();
    context.shadowBlur = 0;
    context.strokeStyle = "#fde68a";
    context.lineWidth = 1.8;
    context.beginPath();
    context.arc(collisionPoint.x, collisionPoint.y, 10 + progress * 25, 0, Math.PI * 2);
    context.stroke();
    context.strokeStyle = "rgba(103,232,249,.72)";
    context.beginPath();
    context.arc(collisionPoint.x, collisionPoint.y, 20 + progress * 36, 0, Math.PI * 2);
    context.stroke();
    context.restore();
  }

  const material = materialFromCode(params.absorberMaterialCode);
  const absorberWidth = 10 + params.absorberThickness * 7;
  const absorberGradient = context.createLinearGradient(RUTHERFORD_VIEW.absorberX, 0, RUTHERFORD_VIEW.absorberX + absorberWidth, 0);
  absorberGradient.addColorStop(0, material === "gold" ? "#f59e0b" : "#cbd5e1");
  absorberGradient.addColorStop(0.5, material === "mica" ? "#a5f3fc" : material === "gold" ? "#fcd34d" : "#64748b");
  absorberGradient.addColorStop(1, "#334155");
  context.fillStyle = absorberGradient;
  context.shadowColor = "rgba(251,191,36,.5)";
  context.shadowBlur = state.absorberPulse * 18;
  roundedRect(context, RUTHERFORD_VIEW.absorberX, 190, absorberWidth, 238, 4);
  context.fill();
  context.shadowBlur = 0;

  const screenGradient = context.createLinearGradient(RUTHERFORD_VIEW.screenX, 0, RUTHERFORD_VIEW.screenX + 25, 0);
  screenGradient.addColorStop(0, "#d9f99d");
  screenGradient.addColorStop(0.5, "#65a30d");
  screenGradient.addColorStop(1, "#365314");
  context.fillStyle = screenGradient;
  context.strokeStyle = "#bef264";
  context.lineWidth = 1.5;
  roundedRect(context, RUTHERFORD_VIEW.screenX, 184, 26, 250, 8);
  context.fill();
  context.stroke();

  context.save();
  context.translate(888, 291);
  context.rotate(-0.16);
  context.fillStyle = "#334155";
  context.strokeStyle = "#94a3b8";
  context.lineWidth = 2;
  roundedRect(context, -18, -45, 76, 90, 16);
  context.fill();
  context.stroke();
  context.fillStyle = "#0f172a";
  context.beginPath();
  context.arc(-18, 0, 24, 0, Math.PI * 2);
  context.fill();
  context.stroke();
  context.fillStyle = `rgba(190,242,100,${0.22 + state.microscopeGlow * 0.66})`;
  context.shadowColor = "#bef264";
  context.shadowBlur = state.microscopeGlow * 22;
  context.beginPath();
  context.arc(-18, 0, 15, 0, Math.PI * 2);
  context.fill();
  context.shadowBlur = 0;
  context.fillStyle = "#64748b";
  roundedRect(context, 50, -23, 38, 46, 8);
  context.fill();
  context.restore();

  context.fillStyle = "rgba(2,6,23,.86)";
  roundedRect(context, 792, 462, 130, 46, 10);
  context.fill();
  context.strokeStyle = "rgba(148,163,184,.35)";
  context.stroke();
  context.fillStyle = "#94a3b8";
  context.font = simulationCanvasFont("9px", 500);
  context.fillText("BỘ ĐẾM CHỚP", 810, 478);
  context.fillStyle = "#d9ff57";
  context.font = "800 20px ui-monospace, monospace";
  context.fillText(String(state.counters.flashes).padStart(4, "0"), 830, 500);

  for (const flash of state.flashes) {
    const fade = 1 - flash.age / flash.lifetime;
    context.save();
    context.globalAlpha = fade;
    context.fillStyle = "#f7fee7";
    context.shadowColor = "#d9f99d";
    context.shadowBlur = 22 * fade;
    context.beginPath();
    context.arc(flash.position.x + 3, flash.position.y, 4 + 3 * fade, 0, Math.PI * 2);
    context.fill();
    context.restore();
  }

  if (showLabels) {
    drawLabel(context, "Nguồn α", 58, 404, { x: 132, y: 320 });
    drawLabel(context, "Khe định hướng", 148, 126, { x: 212, y: 270 });
    drawLabel(context, "Hạt α", 258, 458, { x: 340, y: RUTHERFORD_VIEW.beamY });
    drawLabel(context, `Buồng khí: ${GAS_LABELS[state.currentGas]}`, 328, 112, { x: 450, y: 174 });
    drawLabel(context, "Vùng tương tác", 480, 454, { x: 530, y: 378 });
    if (collisionPoint && state.reactionPulse > 0) drawLabel(context, "Va chạm hạt nhân", 516, 386, collisionPoint);
    if (latestTargetHit && latestTargetHit.pulse > 0 && latestTargetHit.nucleusType !== "nitrogen14") {
      const symbol = latestTargetHit.nucleusType === "oxygen16" ? "O" : "C";
      drawLabel(context, `Tán xạ trên ${symbol} · không tạo proton`, 418, 386, latestTargetHit.position);
    }
    drawLabel(context, `Lớp hấp thụ ${MATERIAL_LABELS[material]}`, 665, 132, { x: 748, y: 190 });
    drawLabel(context, "Màn ZnS", 776, 104, { x: 830, y: 184 });
    drawLabel(context, "Kính hiển vi", 848, 390, { x: 878, y: 330 });
    if (state.flashes.length > 0) drawLabel(context, "Chớp sáng", 838, 148, state.flashes[0]!.position);
  }

  context.fillStyle = "#cbd5e1";
  context.font = simulationCanvasFont("12px", 500);
  context.fillText(`Khí hiện tại: ${GAS_LABELS[state.currentGas]}`, 52, 65);
  context.fillStyle = "#94a3b8";
  context.font = simulationCanvasFont("10px");
  context.fillText("Trong chế độ thiết bị, proton được nhận biết qua chớp ZnS; ¹⁷O không phải quan sát trực tiếp.", 52, 562);
}

function drawExplanation(
  context: CanvasRenderingContext2D,
  state: RutherfordState,
  showLabels: boolean,
) {
  const panelGradient = context.createLinearGradient(0, 70, 0, 540);
  panelGradient.addColorStop(0, "#17243a");
  panelGradient.addColorStop(1, "#071423");
  context.fillStyle = panelGradient;
  context.strokeStyle = "#64748b";
  context.lineWidth = 2.5;
  roundedRect(context, 30, 76, 920, 466, 30);
  context.fill();
  context.stroke();

  context.fillStyle = "rgba(2,6,23,.72)";
  roundedRect(context, 225, 98, 550, 58, 14);
  context.fill();
  context.fillStyle = "#f8fafc";
  context.font = "700 24px Georgia, serif";
  context.textAlign = "center";
  context.fillText("¹⁴₇N + ⁴₂He  →  ¹⁷₈O + ¹₁H", 500, 131);
  context.textAlign = "left";

  context.fillStyle = "rgba(14,116,144,.12)";
  roundedRect(context, 85, 184, 830, 270, 24);
  context.fill();
  context.strokeStyle = "rgba(125,211,252,.28)";
  context.stroke();
  drawNuclearTargetField(context, state, true);

  const reactingAlpha = state.particles.find((particle) => particle.particleType === "alpha" && particle.willReact);
  const latestReaction = [...state.reactions].reverse().find((reaction) => reaction.gas === state.currentGas);
  const target = state.pendingReaction?.point ?? reactingAlpha?.reactionPoint ?? latestReaction?.point ?? { x: 520, y: 308 };
  const oxygen = state.particles.find((particle) => particle.particleType === "oxygen17" && particle.active);
  const collisionOccurred = Boolean(state.pendingReaction || latestReaction);

  if (state.reactionPulse > 0) {
    context.save();
    context.globalAlpha = state.reactionPulse;
    context.strokeStyle = "#f8fafc";
    context.lineWidth = 2;
    context.beginPath();
    context.arc(target.x, target.y, 12 + (1 - state.reactionPulse) * 24, 0, Math.PI * 2);
    context.stroke();
    context.restore();
  }

  const proton = state.particles.find((particle) => particle.particleType === "proton" && particle.active);
  if (showLabels) {
    drawLabel(context, "Hạt α tới", 112, 220, reactingAlpha?.position ?? { x: 300, y: target.y });
    if (!collisionOccurred || state.phase === "nuclearCollision") drawLabel(context, "Hạt nhân ¹⁴N", 442, 178, target);
    if (collisionOccurred) drawLabel(context, "Điểm va chạm", 438, 438, target);
    if (proton) drawLabel(context, "Proton p · tầm bay dài", 694, 210, proton.position);
    if (oxygen || collisionOccurred) drawLabel(context, "¹⁷O · quãng ngắn", 384, 376, oxygen?.position ?? target);
  }

  drawArrow(context, { x: 140, y: 416 }, { x: 310, y: 416 }, "rgba(251,191,36,.75)");
  context.fillStyle = "#fde68a";
  context.font = simulationCanvasFont("10px", 500);
  context.fillText("α đi vào", 188, 407);
  drawArrow(context, { x: 690, y: 416 }, { x: 855, y: 416 }, "rgba(103,232,249,.75)");
  context.fillStyle = "#a5f3fc";
  context.fillText("proton đi xa", 736, 407);

  context.fillStyle = "rgba(2,6,23,.78)";
  roundedRect(context, 92, 474, 816, 42, 11);
  context.fill();
  context.fillStyle = "#cbd5e1";
  context.font = simulationCanvasFont("10px", 500);
  context.textAlign = "center";
  context.fillText("Các hạt nhân và quỹ đạo được phóng đại để minh họa; thiết bị Rutherford không quan sát trực tiếp toàn bộ phản ứng này.", 500, 499);
  context.textAlign = "left";
}

export function RutherfordNitrogenScene({
  params,
  running,
  speed,
  resetSignal,
  command,
  observationView,
  showTrails,
  showLabels,
  onData,
  onComplete,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<RutherfordState>(createRutherfordState(params));
  const paramsRef = useRef(params);
  const viewRef = useRef(observationView);
  const optionsRef = useRef({ showTrails, showLabels });
  const callbacksRef = useRef({ onData, onComplete });
  const drawRef = useRef<() => void>(() => undefined);
  const lastCommandTokenRef = useRef(command.token);
  const lastDataTimeRef = useRef(-1);
  const targetConfigRef = useRef(`${gasFromCode(params.gasCode)}-${Math.round(params.gasDensity)}`);
  const completedNotifiedRef = useRef(false);
  const reducedMotionRef = useRef(false);
  const { ref: containerRef, size } = useContainerSize<HTMLDivElement>();

  useEffect(() => {
    callbacksRef.current = { onData, onComplete };
  }, [onComplete, onData]);

  useEffect(() => {
    const nextGas = gasFromCode(params.gasCode);
    const nextTargetConfig = `${nextGas}-${Math.round(params.gasDensity)}`;
    if (targetConfigRef.current !== nextTargetConfig) {
      loadRutherfordGas(stateRef.current, nextGas, params, true);
      targetConfigRef.current = nextTargetConfig;
    }
    paramsRef.current = params;
    callbacksRef.current.onData(rutherfordMetrics(stateRef.current, params));
    drawRef.current();
  }, [onData, params]);

  useEffect(() => {
    viewRef.current = observationView;
    optionsRef.current = { showTrails, showLabels };
    drawRef.current();
  }, [observationView, showLabels, showTrails]);

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
    const backdrop = context.createLinearGradient(0, 0, 0, size.height);
    backdrop.addColorStop(0, "#101827");
    backdrop.addColorStop(1, "#050b15");
    context.fillStyle = backdrop;
    context.fillRect(0, 0, size.width, size.height);

    const scale = Math.min(size.width / RUTHERFORD_VIEW.width, size.height / RUTHERFORD_VIEW.height);
    const offsetX = (size.width - RUTHERFORD_VIEW.width * scale) / 2;
    const offsetY = (size.height - RUTHERFORD_VIEW.height * scale) / 2;
    context.save();
    context.translate(offsetX, offsetY);
    context.scale(scale, scale);

    if (viewRef.current === "apparatus") {
      drawApparatus(context, state, currentParams, optionsRef.current.showLabels);
    } else {
      drawExplanation(context, state, optionsRef.current.showLabels);
    }

    for (const particle of state.particles) {
      drawParticle(
        context,
        particle,
        optionsRef.current.showTrails,
        viewRef.current === "nuclearExplanation",
      );
    }

    context.fillStyle = "rgba(2,6,23,.82)";
    roundedRect(context, 760, 20, 205, 38, 10);
    context.fill();
    context.fillStyle = "#cbd5e1";
    context.font = simulationCanvasFont("10px", 500);
    context.fillText(`${GAS_SHORT_LABELS[state.currentGas]} · ${state.counters.alphasEmitted} α · ${state.counters.flashes} chớp`, 777, 43);
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
    stateRef.current = createRutherfordState(paramsRef.current);
    lastDataTimeRef.current = -1;
    completedNotifiedRef.current = false;
    callbacksRef.current.onData(rutherfordMetrics(stateRef.current, paramsRef.current));
    drawRef.current();
  }, [resetSignal]);

  useEffect(() => {
    if (lastCommandTokenRef.current === command.token) return;
    lastCommandTokenRef.current = command.token;
    if (command.type === "start" || command.type === "resume") completedNotifiedRef.current = false;
    handleRutherfordCommand(stateRef.current, command.type);
    callbacksRef.current.onData(rutherfordMetrics(stateRef.current, paramsRef.current));
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
      stepRutherford(
        stateRef.current,
        paramsRef.current,
        delta * motionScale,
      );
      drawScene();
      if (stateRef.current.elapsed - lastDataTimeRef.current >= 0.08) {
        lastDataTimeRef.current = stateRef.current.elapsed;
        callbacksRef.current.onData(rutherfordMetrics(stateRef.current, paramsRef.current));
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
        aria-label="Rutherford bắn phá hạt nhân nitơ bằng hạt alpha, lớp hấp thụ và màn huỳnh quang kẽm sulfide"
      />
    </div>
  );
}
