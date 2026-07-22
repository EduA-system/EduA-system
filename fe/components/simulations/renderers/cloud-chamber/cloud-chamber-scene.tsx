"use client";

import { useCallback, useEffect, useRef } from "react";
import { useContainerSize } from "../../shared/use-container-size";
import { createObservation } from "../../engines/cloud-chamber/analysis";
import {
  CHAMBER_BOUNDS,
  PARTICLE_COLORS,
  PARTICLE_LABELS,
  SENSITIVITY_DURATION,
} from "../../engines/cloud-chamber/constants";
import {
  applyCloudChamberCommand,
  cloudChamberMetrics,
  createCloudChamberState,
  stepCloudChamber,
} from "../../engines/cloud-chamber/physics";
import type {
  CloudChamberCommand,
  CloudChamberMetrics,
  CloudChamberObservation,
  CloudChamberParams,
  CloudChamberState,
  ObservationMode,
  ParticleTrack,
  Vector2,
} from "../../engines/cloud-chamber/types";
import { DropletBuffer } from "./droplet-renderer";

const VIEW_WIDTH = 1000;
const VIEW_HEIGHT = 620;

type Props = {
  params: CloudChamberParams;
  mode: ObservationMode;
  running: boolean;
  speed: number;
  resetSignal: number;
  command: { type: CloudChamberCommand; token: number };
  showFog: boolean;
  showLabels: boolean;
  classificationColors: boolean;
  onData: (metrics: CloudChamberMetrics) => void;
  onPhotograph: (observation: CloudChamberObservation) => void;
  onCycleComplete: () => void;
};

function drawRoundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): void {
  context.beginPath();
  context.roundRect(x, y, width, height, radius);
}

function drawLabel(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  anchor?: Vector2,
): void {
  context.save();
  context.font = "600 12px Inter, sans-serif";
  const width = context.measureText(text).width + 18;
  if (anchor) {
    context.strokeStyle = "rgba(203,213,225,0.66)";
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(anchor.x, anchor.y);
    context.lineTo(x + width / 2, y + 13);
    context.stroke();
  }
  drawRoundedRect(context, x, y, width, 26, 7);
  context.fillStyle = "rgba(2,6,23,0.78)";
  context.fill();
  context.strokeStyle = "rgba(148,163,184,0.3)";
  context.stroke();
  context.fillStyle = "#e2e8f0";
  context.fillText(text, x + 9, y + 17);
  context.restore();
}

function drawTrackPath(
  context: CanvasRenderingContext2D,
  track: ParticleTrack,
  classificationColors: boolean,
): void {
  if (track.points.length === 0) return;
  const color = classificationColors ? PARTICLE_COLORS[track.particleType] : "#f8fafc";
  context.save();
  context.strokeStyle = color;
  context.globalAlpha = 0.11 * track.opacity;
  context.lineWidth = Math.max(0.8, track.width * 0.58);
  context.lineCap = "round";
  context.lineJoin = "round";
  context.beginPath();
  context.moveTo(track.points[0]!.x, track.points[0]!.y);
  for (let index = 1; index < track.points.length; index += 1) {
    context.lineTo(track.points[index]!.x, track.points[index]!.y);
  }
  context.lineTo(track.position.x, track.position.y);
  context.stroke();
  if (track.active) {
    context.globalAlpha = 0.9;
    context.fillStyle = color;
    context.beginPath();
    context.arc(track.position.x, track.position.y, track.particleType === "alpha" ? 3 : 2.3, 0, Math.PI * 2);
    context.fill();
  }
  context.restore();
}

function drawRecordedImage(context: CanvasRenderingContext2D, state: CloudChamberState): void {
  const x = 822;
  const y = 344;
  const width = 148;
  const height = 108;
  context.save();
  drawRoundedRect(context, x, y, width, height, 10);
  context.fillStyle = "#020617";
  context.fill();
  context.strokeStyle = state.hasPhotographed ? "#67e8f9" : "rgba(148,163,184,0.4)";
  context.lineWidth = 1.5;
  context.stroke();
  context.fillStyle = "#94a3b8";
  context.font = "700 9px Inter, sans-serif";
  context.fillText(state.hasPhotographed ? "ẢNH SỰ KIỆN" : "KHUNG GHI ẢNH", x + 10, y + 16);
  if (state.hasPhotographed) {
    const sx = (width - 22) / (CHAMBER_BOUNDS.right - CHAMBER_BOUNDS.left);
    const sy = (height - 34) / (CHAMBER_BOUNDS.bottom - CHAMBER_BOUNDS.top);
    context.translate(x + 11 - CHAMBER_BOUNDS.left * sx, y + 24 - CHAMBER_BOUNDS.top * sy);
    for (const track of state.tracks) {
      context.strokeStyle = "rgba(248,250,252,0.88)";
      context.lineWidth = Math.max(0.7, track.width * 0.42);
      context.beginPath();
      context.moveTo(track.startPosition.x * sx, track.startPosition.y * sy);
      context.lineTo(track.position.x * sx, track.position.y * sy);
      context.stroke();
    }
  } else {
    context.fillStyle = "rgba(148,163,184,0.16)";
    context.fillRect(x + 10, y + 26, width - 20, height - 36);
  }
  context.restore();
}

export function CloudChamberScene({
  params,
  mode,
  running,
  speed,
  resetSignal,
  command,
  showFog,
  showLabels,
  classificationColors,
  onData,
  onPhotograph,
  onCycleComplete,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<CloudChamberState>(createCloudChamberState(params, mode));
  const dropletsRef = useRef(new DropletBuffer());
  const paramsRef = useRef(params);
  const modeRef = useRef(mode);
  const visibilityRef = useRef({ showFog, showLabels, classificationColors });
  const callbacksRef = useRef({ onData, onPhotograph, onCycleComplete });
  const drawRef = useRef<() => void>(() => undefined);
  const capturedRef = useRef(false);
  const lastDataTimeRef = useRef(-1);
  const lastCommandTokenRef = useRef(command.token);
  const reducedMotionRef = useRef(false);
  const visualTimeRef = useRef(0);
  const { ref: containerRef, size } = useContainerSize<HTMLDivElement>();

  useEffect(() => {
    paramsRef.current = params;
    modeRef.current = mode;
    visibilityRef.current = { showFog, showLabels, classificationColors };
    callbacksRef.current = { onData, onPhotograph, onCycleComplete };
  }, [classificationColors, mode, onCycleComplete, onData, onPhotograph, params, showFog, showLabels]);

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
    const visibility = visibilityRef.current;
    const warmFactor = Math.max(0, Math.min(1, (currentParams.topTemperature - 15) / 17));
    const coldFactor = Math.max(0, Math.min(1, (-currentParams.baseTemperature - 35) / 50));
    const ipaFactor = Math.max(0, Math.min(1, currentParams.ipaAmount / 100));
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    context.clearRect(0, 0, size.width, size.height);
    context.fillStyle = "#0f172a";
    context.fillRect(0, 0, size.width, size.height);

    const scale = Math.min(size.width / VIEW_WIDTH, size.height / VIEW_HEIGHT);
    const offsetX = (size.width - VIEW_WIDTH * scale) / 2;
    const offsetY = (size.height - VIEW_HEIGHT * scale) / 2;
    context.save();
    context.translate(offsetX, offsetY);
    context.scale(scale, scale);

    context.fillStyle = "#111827";
    context.strokeStyle = "#64748b";
    context.lineWidth = 2;
    drawRoundedRect(context, 106, 320, 94, 60, 12);
    context.fill();
    context.stroke();
    context.fillStyle = "#334155";
    context.fillRect(173, 337, 34, 26);
    context.fillStyle = "#cbd5e1";
    context.beginPath();
    context.arc(202, 350, 5, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = "#f8fafc";
    context.font = "800 18px Inter, sans-serif";
    context.fillText("α", 139, 355);

    context.save();
    context.shadowColor = "rgba(103,232,249,0.16)";
    context.shadowBlur = 18;
    context.fillStyle = "rgba(8,47,73,0.22)";
    context.strokeStyle = "rgba(203,213,225,0.76)";
    context.lineWidth = 3;
    drawRoundedRect(context, 178, 116, 636, 426, 68);
    context.fill();
    context.stroke();
    context.restore();

    context.save();
    drawRoundedRect(context, 181, 119, 630, 420, 64);
    context.clip();
    const feltGradient = context.createLinearGradient(0, 119, 0, 166);
    feltGradient.addColorStop(0, `rgba(251,146,60,${0.3 + ipaFactor * 0.38 + warmFactor * 0.16})`);
    feltGradient.addColorStop(1, `rgba(180,83,9,${0.12 + ipaFactor * 0.25 + warmFactor * 0.13})`);
    context.fillStyle = feltGradient;
    context.fillRect(CHAMBER_BOUNDS.left, 119, CHAMBER_BOUNDS.right - CHAMBER_BOUNDS.left, 47);
    context.strokeStyle = "rgba(253,186,116,0.72)";
    context.lineWidth = 1.5;
    context.beginPath();
    context.moveTo(CHAMBER_BOUNDS.left, 166);
    context.lineTo(CHAMBER_BOUNDS.right, 166);
    context.stroke();
    context.fillStyle = "#ffedd5";
    context.font = "800 10px Inter, sans-serif";
    const feltLabel = "LỚP NỈ THẤM CỒN IPA 99%";
    context.fillText(feltLabel, 496 - context.measureText(feltLabel).width / 2, 151);
    context.restore();

    context.save();
    context.beginPath();
    context.rect(CHAMBER_BOUNDS.left, 166, CHAMBER_BOUNDS.right - CHAMBER_BOUNDS.left, CHAMBER_BOUNDS.bottom - 166);
    context.clip();
    const gasGradient = context.createLinearGradient(0, 166, 0, CHAMBER_BOUNDS.bottom);
    gasGradient.addColorStop(0, `rgba(251,146,60,${0.035 + warmFactor * 0.09})`);
    gasGradient.addColorStop(0.55, "rgba(148,163,184,0.025)");
    gasGradient.addColorStop(1, `rgba(34,211,238,${0.06 + coldFactor * 0.18})`);
    context.fillStyle = gasGradient;
    context.fillRect(CHAMBER_BOUNDS.left, 166, CHAMBER_BOUNDS.right - CHAMBER_BOUNDS.left, CHAMBER_BOUNDS.bottom - 166);

    if (visibility.showFog) {
      const ambientFog = (currentParams.backgroundFog / 100) *
        (0.35 + coldFactor * 0.45) *
        (0.45 + ipaFactor * 0.55);
      const saturationFactor = Math.max(0.08, Math.min(1.35, (state.supersaturation - 0.82) / 0.34));
      const activeFog = state.backgroundFog * saturationFactor;
      const fogStrength = Math.min(0.9, Math.max(ambientFog, activeFog));
      const density = Math.round(fogStrength * 420);
      context.fillStyle = `rgba(226,232,240,${Math.min(0.22, fogStrength * 0.25)})`;
      context.fillRect(CHAMBER_BOUNDS.left, 292, CHAMBER_BOUNDS.right - CHAMBER_BOUNDS.left, CHAMBER_BOUNDS.bottom - 292);
      context.strokeStyle = `rgba(125,211,252,${Math.min(0.6, fogStrength * 0.7)})`;
      context.lineWidth = 1.5;
      context.beginPath();
      context.moveTo(CHAMBER_BOUNDS.left, 292);
      context.lineTo(CHAMBER_BOUNDS.right, 292);
      context.stroke();
      context.shadowColor = "rgba(248,250,252,0.28)";
      context.shadowBlur = 3;
      for (let index = 0; index < density; index += 1) {
        const x = CHAMBER_BOUNDS.left + 13 + ((index * 83) % 560);
        const y = 300 + ((index * 47) % 144) + Math.sin(index * 2.1 + visualTimeRef.current * 0.7) * 3;
        const radius = 0.65 + (index % 5) * 0.34;
        context.globalAlpha = (0.16 + fogStrength * 0.38) * (0.55 + (index % 3) * 0.18);
        context.fillStyle = "#e2e8f0";
        context.beginPath();
        context.arc(x, y, radius, 0, Math.PI * 2);
        context.fill();
      }
      context.globalAlpha = 1;
      context.shadowBlur = 0;
    }

    for (const track of state.tracks) drawTrackPath(context, track, visibility.classificationColors);
    const globalFade = state.phase === "clearing" ? Math.max(0, state.tracks[0]?.opacity ?? 0) : 1;
    dropletsRef.current.draw(context, state.time, visibility.classificationColors, globalFade);
    context.restore();

    const collisionOccurred = ["collisionDetected", "productsTracking", "photographing", "observationComplete", "clearing"].includes(state.phase);
    if (state.collisionPoint && collisionOccurred) {
      context.save();
      context.translate(state.collisionPoint.x, state.collisionPoint.y);
      context.strokeStyle = "rgba(248,250,252,0.92)";
      context.lineWidth = 2;
      context.beginPath();
      context.moveTo(-5, -5);
      context.lineTo(5, 5);
      context.moveTo(5, -5);
      context.lineTo(-5, 5);
      context.stroke();
      context.restore();
    }

    context.save();
    context.beginPath();
    drawRoundedRect(context, 181, 119, 630, 420, 64);
    context.clip();
    context.fillStyle = "rgba(14,116,144,0.22)";
    context.fillRect(CHAMBER_BOUNDS.left, 482, CHAMBER_BOUNDS.right - CHAMBER_BOUNDS.left, 57);
    for (let row = 0; row < 3; row += 1) {
      for (let column = 0; column < 24; column += 1) {
        const index = row * 24 + column;
        const width = 17 + (index % 4) * 2;
        const height = 10 + (index % 3) * 2;
        const x = 174 + column * 27 + (row % 2) * 13;
        const y = 484 + row * 17 + (column % 3) * 2;
        context.beginPath();
        context.moveTo(x, y + height * 0.35);
        context.lineTo(x + width * 0.24, y);
        context.lineTo(x + width * 0.76, y + 1);
        context.lineTo(x + width, y + height * 0.42);
        context.lineTo(x + width * 0.78, y + height);
        context.lineTo(x + width * 0.18, y + height * 0.88);
        context.closePath();
        context.fillStyle = index % 3 === 0 ? "#bae6fd" : index % 3 === 1 ? "#e0f2fe" : "#7dd3fc";
        context.fill();
        context.strokeStyle = "rgba(14,116,144,0.72)";
        context.lineWidth = 0.8;
        context.stroke();
      }
    }
    context.restore();

    const plateGradient = context.createLinearGradient(0, 474, 0, 482);
    plateGradient.addColorStop(0, "#d7e3e8");
    plateGradient.addColorStop(1, "#64748b");
    context.fillStyle = plateGradient;
    context.fillRect(CHAMBER_BOUNDS.left, 474, CHAMBER_BOUNDS.right - CHAMBER_BOUNDS.left, 8);
    context.strokeStyle = "rgba(207,250,254,0.8)";
    context.lineWidth = 1;
    context.strokeRect(CHAMBER_BOUNDS.left, 474, CHAMBER_BOUNDS.right - CHAMBER_BOUNDS.left, 8);

    context.font = "700 9px Inter, sans-serif";
    context.fillStyle = "#a5f3fc";
    const baseTemperatureLabel = state.phase === "idle" || state.phase === "preparing"
      ? `${currentParams.baseTemperature.toFixed(0)}°C · ĐÁY LẠNH`
      : `${state.baseTemperature.toFixed(0)}°C · ĐÁY LẠNH`;
    context.fillText(baseTemperatureLabel, 632, 469);

    if (state.ipaVapor > 0.08) {
      context.strokeStyle = "rgba(254,215,170,0.72)";
      context.fillStyle = "rgba(254,215,170,0.82)";
      context.lineWidth = 1.8;
      context.beginPath();
      context.moveTo(722, 182);
      context.lineTo(722, 274);
      context.stroke();
      context.beginPath();
      context.moveTo(722, 274);
      context.lineTo(717, 265);
      context.lineTo(727, 265);
      context.closePath();
      context.fill();
      context.font = "700 9px Inter, sans-serif";
      context.fillText("hơi IPA khuếch tán xuống", 626, 291);
    }

    context.fillStyle = "#334155";
    context.strokeStyle = "#94a3b8";
    context.lineWidth = 2;
    drawRoundedRect(context, 844, 214, 92, 64, 10);
    context.fill();
    context.stroke();
    context.beginPath();
    context.arc(844, 246, 22, 0, Math.PI * 2);
    context.fillStyle = "#020617";
    context.fill();
    context.strokeStyle = "#67e8f9";
    context.stroke();
    context.fillStyle = "#64748b";
    drawRoundedRect(context, 866, 199, 36, 16, 5);
    context.fill();
    context.strokeStyle = "#64748b";
    context.beginPath();
    context.moveTo(880, 278);
    context.lineTo(861, 320);
    context.moveTo(900, 278);
    context.lineTo(919, 320);
    context.stroke();
    drawRecordedImage(context, state);

    if (state.flash > 0) {
      const flashGradient = context.createRadialGradient(835, 246, 4, 835, 246, 120);
      flashGradient.addColorStop(0, `rgba(248,250,252,${state.flash})`);
      flashGradient.addColorStop(1, "rgba(248,250,252,0)");
      context.fillStyle = flashGradient;
      context.fillRect(710, 126, 250, 240);
    }

    if (visibility.showLabels) {
      context.fillStyle = "rgba(2,6,23,0.76)";
      drawRoundedRect(context, 822, 468, 154, 78, 10);
      context.fill();
      context.fillStyle = "#e2e8f0";
      context.font = "700 10px Inter, sans-serif";
      context.fillText("CHÚ GIẢI TRONG BUỒNG", 833, 486);
      context.font = "600 9px Inter, sans-serif";
      context.fillStyle = "#cbd5e1";
      context.fillText("• chấm trắng: giọt IPA", 833, 502);
      context.fillText("mũi tên: hơi IPA đi xuống", 833, 517);
      context.fillText("×: điểm xảy ra phản ứng", 833, 532);
    }

    if (visibility.classificationColors) {
      context.fillStyle = "rgba(2,6,23,0.76)";
      drawRoundedRect(context, 24, 548, 294, 32, 9);
      context.fill();
      context.fillStyle = "#cbd5e1";
      context.font = "600 10px Inter, sans-serif";
      context.fillText("Màu minh họa phân loại – không phải màu thật của hạt", 38, 568);
    }

    if (visibility.showLabels) {
      drawLabel(context, "Nguồn α", 80, 270, { x: 151, y: 320 });
      drawLabel(context, `Phần trên ấm · ${state.topTemperature.toFixed(0)}°C`, 244, 82, { x: 300, y: 132 });
      drawLabel(context, "Không khí + hơi IPA", 438, 176, { x: 500, y: 230 });
      drawLabel(context, "Đá khô làm lạnh đáy", 560, 548, { x: 620, y: 508 });
      drawLabel(context, "Camera (chụp tự động)", 806, 162, { x: 880, y: 214 });
      if (state.supersaturation >= 1) drawLabel(context, "Lớp IPA siêu bão hòa", 500, 270, { x: 585, y: 330 });
      const alpha = state.tracks.find((track) => track.particleType === "alpha");
      if (alpha) drawLabel(context, "Hạt α", 326, 184, alpha.position);
      if (state.collisionPoint && collisionOccurred) drawLabel(context, "Điểm phản ứng ×", 422, 244, state.collisionPoint);
      const proton = state.tracks.find((track) => track.particleType === "proton");
      const oxygen = state.tracks.find((track) => track.particleType === "oxygen17");
      if (proton) drawLabel(context, "Vệt proton", 680, 122, proton.position);
      if (oxygen) drawLabel(context, "Vệt ¹⁷O", 686, 456, oxygen.position);
    }

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
    stateRef.current = createCloudChamberState(paramsRef.current, modeRef.current);
    dropletsRef.current.clear();
    capturedRef.current = false;
    lastDataTimeRef.current = -1;
    callbacksRef.current.onData(cloudChamberMetrics(stateRef.current, paramsRef.current));
    drawRef.current();
  }, [resetSignal]);

  useEffect(() => {
    if (lastCommandTokenRef.current === command.token) return;
    lastCommandTokenRef.current = command.token;
    if (command.type === "startCycle" || command.type === "prepareChamber") {
      dropletsRef.current.clear();
      capturedRef.current = false;
    }
    stateRef.current = applyCloudChamberCommand(
      stateRef.current,
      paramsRef.current,
      modeRef.current,
      command.type,
    );
    callbacksRef.current.onData(cloudChamberMetrics(stateRef.current, paramsRef.current));
    drawRef.current();
  }, [command]);

  useEffect(() => {
    drawScene();
  }, [classificationColors, drawScene, showFog, showLabels]);

  useEffect(() => {
    if (size.width <= 0 || size.height <= 0) return;
    let animationFrame = 0;
    let previousTime: number | null = null;
    const animate = (now: number) => {
      const previous = previousTime ?? now;
      previousTime = now;
      const rawDelta = Math.min(0.08, Math.max(0, (now - previous) / 1000));
      visualTimeRef.current += rawDelta * (reducedMotionRef.current ? 0.16 : 1);

      if (running) {
        const motionScale = reducedMotionRef.current ? Math.min(0.5, speed) : speed;
        const result = stepCloudChamber(stateRef.current, paramsRef.current, rawDelta * motionScale);
        stateRef.current = result.state;
        const formationEfficiency = Math.max(
          0,
          Math.min(1, (stateRef.current.supersaturation - 0.8) / 0.75),
        );
        const sensitivity = Math.max(
          0,
          formationEfficiency *
            (paramsRef.current.chamberSensitivity / 100) *
            Math.max(0.04, stateRef.current.sensitivityWindow / SENSITIVITY_DURATION),
        );
        for (const segment of result.segments) {
          dropletsRef.current.addSegment(
            segment,
            stateRef.current.time,
            sensitivity,
            paramsRef.current.trackLifetime,
          );
        }
        if (result.clearDroplets) dropletsRef.current.clear();

        if (result.photographRequested && !capturedRef.current) {
          capturedRef.current = true;
          const imageDataUrl = canvasRef.current?.toDataURL("image/png") ?? "";
          callbacksRef.current.onPhotograph(createObservation(stateRef.current, imageDataUrl));
        }
        if (
          stateRef.current.time - lastDataTimeRef.current >= 0.09 ||
          result.photographRequested ||
          result.cycleCompleted
        ) {
          lastDataTimeRef.current = stateRef.current.time;
          callbacksRef.current.onData(cloudChamberMetrics(stateRef.current, paramsRef.current));
        }
        if (result.cycleCompleted) callbacksRef.current.onCycleComplete();
      }
      drawScene();
      animationFrame = requestAnimationFrame(animate);
    };
    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [drawScene, running, size.height, size.width, speed]);

  return (
    <div ref={containerRef} className="relative h-full min-h-[360px] w-full overflow-hidden bg-[#0f172a]">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 block h-full w-full"
        role="img"
        aria-label="Buồng sương Blackett quan sát phản ứng hạt alpha với hạt nhân nitơ"
      />
      <div className="sr-only">
        Các vệt sáng là chuỗi giọt IPA ngưng tụ quanh ion, không phải tia sáng liên tục. {Object.values(PARTICLE_LABELS).join(", ")}.
      </div>
    </div>
  );
}
