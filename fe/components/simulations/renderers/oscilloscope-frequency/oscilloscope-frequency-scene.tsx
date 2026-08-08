"use client";

import { useCallback, useEffect, useRef } from "react";
import { useContainerSize } from "../../shared/use-container-size";
import { VIEW_HEIGHT, VIEW_WIDTH } from "../../engines/oscilloscope-frequency/constants";
import {
  applyOscilloscopeCommand,
  buildOscilloscopeSamples,
  createOscilloscopeState,
  cursorMeasurement,
  oscilloscopeMetrics,
  signalAmplitude,
  sourceEnvelope,
  stepOscilloscope,
} from "../../engines/oscilloscope-frequency/physics";
import type {
  OscilloscopeCommand,
  OscilloscopeFrequencyParams,
  OscilloscopeMetrics,
  OscilloscopeState,
} from "../../engines/oscilloscope-frequency/types";

type Props = {
  params: OscilloscopeFrequencyParams;
  running: boolean;
  speed: number;
  resetSignal: number;
  command: { type: OscilloscopeCommand; token: number };
  onData: (metrics: OscilloscopeMetrics) => void;
  onComplete: () => void;
};

const TAU = Math.PI * 2;

const smoothStep = (value: number) => {
  const t = Math.min(1, Math.max(0, value));
  return t * t * (3 - 2 * t);
};

const microphoneX = (params: OscilloscopeFrequencyParams) =>
  320 + ((Math.min(80, Math.max(5, params.microphoneDistance)) - 5) / 75) * 145;

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
  context.fillStyle = "rgba(3,10,24,.9)";
  context.fill();
  context.strokeStyle = "rgba(148,163,184,.34)";
  context.stroke();
  context.fillStyle = "#e8edf5";
  context.fillText(text, x + 10, y + 18);
  context.restore();
}

function drawKnob(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  value: number,
  label: string,
) {
  const gradient = context.createRadialGradient(x - radius * 0.35, y - radius * 0.4, 1, x, y, radius);
  gradient.addColorStop(0, "#f8fafc");
  gradient.addColorStop(0.45, "#9ca3af");
  gradient.addColorStop(1, "#374151");
  context.fillStyle = gradient;
  context.strokeStyle = "#1f2937";
  context.lineWidth = 2;
  context.beginPath();
  context.arc(x, y, radius, 0, TAU);
  context.fill();
  context.stroke();
  const angle = -Math.PI * 0.75 + value * Math.PI * 1.5;
  context.strokeStyle = "#fff7d6";
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(x, y);
  context.lineTo(x + Math.cos(angle) * radius * 0.72, y + Math.sin(angle) * radius * 0.72);
  context.stroke();
  context.fillStyle = "#5b3b13";
  context.font = "700 8px Inter, sans-serif";
  context.textAlign = "center";
  context.fillText(label, x, y + radius + 15);
}

function drawTuningFork(
  context: CanvasRenderingContext2D,
  state: OscilloscopeState,
  params: OscilloscopeFrequencyParams,
) {
  const active = state.envelope > 0.02;
  const visualFrequency = 2.2 + Math.min(4.2, params.frequency / 260);
  const visibleEnvelope = sourceEnvelope(state, params);
  const vibration = active
    ? Math.sin(state.time * TAU * visualFrequency) * visibleEnvelope * params.sourceAmplitude * 0.045
    : 0;
  const metal = context.createLinearGradient(140, 0, 225, 0);
  metal.addColorStop(0, "#667382");
  metal.addColorStop(0.34, "#f1f5f9");
  metal.addColorStop(0.58, "#9ca7b4");
  metal.addColorStop(1, "#475569");

  context.save();
  context.shadowColor = "rgba(0,0,0,.45)";
  context.shadowBlur = 16;
  const wood = context.createLinearGradient(0, 455, 0, 535);
  wood.addColorStop(0, "#cd8a3b");
  wood.addColorStop(1, "#71421d");
  context.fillStyle = wood;
  context.strokeStyle = "#e9b568";
  context.lineWidth = 2;
  roundedRect(context, 85, 465, 210, 67, 10);
  context.fill();
  context.stroke();
  context.shadowBlur = 0;
  context.fillStyle = "rgba(45,24,10,.34)";
  roundedRect(context, 104, 481, 172, 20, 6);
  context.fill();

  context.lineWidth = 16;
  context.lineCap = "round";
  context.lineJoin = "round";
  context.shadowColor = "rgba(148,163,184,.28)";
  context.shadowBlur = 8;
  context.beginPath();
  context.moveTo(151 + vibration, 220);
  context.lineTo(151, 348);
  context.bezierCurveTo(151, 412, 168, 452, 190, 452);
  context.bezierCurveTo(212, 452, 229, 412, 229, 348);
  context.lineTo(229 - vibration, 220);
  context.strokeStyle = metal;
  context.stroke();
  context.shadowBlur = 0;
  if (state.phase === "exciting") {
    const p = state.strikeProgress;
    const approach = smoothStep(p / 0.46);
    const recoil = smoothStep((p - 0.46) / 0.54);
    const headX = 78 + (134 - 78) * approach + (60 - 134) * recoil;
    const headY = 225 + (300 - 225) * approach + (238 - 300) * recoil;
    const rotation = -0.55 + 0.63 * approach - 0.46 * recoil;
    const fadeIn = smoothStep(p / 0.08);
    const fadeOut = 1 - smoothStep((p - 0.82) / 0.18);
    context.save();
    context.globalAlpha = fadeIn * fadeOut;
    context.translate(headX, headY);
    context.rotate(rotation);
    context.strokeStyle = "#9a6430";
    context.lineWidth = 8;
    context.lineCap = "round";
    context.beginPath();
    context.moveTo(-74, 0);
    context.lineTo(0, 0);
    context.stroke();
    context.fillStyle = "#e7d2a8";
    context.strokeStyle = "#5d4930";
    context.lineWidth = 2;
    roundedRect(context, -5, -16, 34, 32, 12);
    context.fill();
    context.stroke();
    context.restore();

    const impact = Math.min(1, Math.max(0, (p - 0.44) / 0.2));
    if (impact > 0 && impact < 1) {
      context.save();
      context.globalAlpha = Math.sin(impact * Math.PI) * 0.65;
      context.strokeStyle = "#bae6fd";
      context.lineWidth = 1.5;
      context.beginPath();
      context.arc(151, 300, 8 + impact * 15, -1.05, 1.05);
      context.stroke();
      context.restore();
    }
  }
  context.restore();
}

function drawSoundField(
  context: CanvasRenderingContext2D,
  state: OscilloscopeState,
  params: OscilloscopeFrequencyParams,
) {
  const visibleEnvelope = sourceEnvelope(state, params);
  if (visibleEnvelope < 0.03) return;
  const left = 245;
  const right = microphoneX(params) - 18;
  const progressLimit = state.phase === "propagating" ? state.propagationProgress : state.propagationProgress > 0 ? 1 : 0.25;
  context.save();
  context.strokeStyle = "rgba(103,232,249,.58)";
  context.lineWidth = 2;
  for (let index = 0; index < 7; index += 1) {
    const phase = (state.time * 0.72 + index / 7) % 1;
    if (phase > progressLimit) continue;
    const x = left + phase * (right - left);
    const spread = 18 + phase * 34;
    context.globalAlpha = (1 - phase * 0.65) * visibleEnvelope * (0.45 + params.sourceAmplitude / 180);
    context.beginPath();
    context.ellipse(x, 302, 7 + phase * 4, spread, 0, -Math.PI / 2, Math.PI / 2);
    context.stroke();
  }
  context.fillStyle = "rgba(165,243,252,.82)";
  context.font = "600 9px Inter, sans-serif";
  context.textAlign = "center";
  context.fillText("mặt sóng âm (minh họa)", 326, 370);
  context.restore();
}

function drawMicrophone(
  context: CanvasRenderingContext2D,
  state: OscilloscopeState,
  params: OscilloscopeFrequencyParams,
) {
  const x = microphoneX(params);
  context.save();
  context.strokeStyle = "#526987";
  context.lineWidth = 10;
  context.lineCap = "round";
  context.beginPath();
  // The stand reaches the microphone body instead of stopping below it.
  context.moveTo(x, 292);
  context.lineTo(x, 492);
  context.stroke();
  context.fillStyle = "#334155";
  context.beginPath();
  context.ellipse(x, 506, 64, 15, 0, 0, TAU);
  context.fill();
  context.strokeStyle = "#7891b5";
  context.lineWidth = 3;
  context.stroke();

  context.translate(x - 5, 278);
  context.rotate(0.05);
  const body = context.createLinearGradient(-55, 0, 42, 0);
  body.addColorStop(0, "#101827");
  body.addColorStop(0.5, "#526987");
  body.addColorStop(1, "#172235");
  context.fillStyle = body;
  context.strokeStyle = "#94a3b8";
  context.lineWidth = 2;
  roundedRect(context, -38, -14, 83, 28, 13);
  context.fill();
  context.stroke();
  context.fillStyle = "#152235";
  roundedRect(context, -56, -17, 27, 34, 12);
  context.fill();
  context.stroke();
  context.strokeStyle = "rgba(203,213,225,.58)";
  context.lineWidth = 1;
  for (let x = -51; x <= -34; x += 5) {
    context.beginPath();
    context.moveTo(x, -11);
    context.lineTo(x, 11);
    context.stroke();
  }
  if (state.propagationProgress > 0.75) {
    context.strokeStyle = "rgba(103,232,249,.75)";
    context.beginPath();
    context.arc(-43, 0, 21 + Math.sin(state.time * 8) * 2, -1.1, 1.1);
    context.stroke();
  }
  context.restore();
}

function drawOscilloscope(
  context: CanvasRenderingContext2D,
  state: OscilloscopeState,
  params: OscilloscopeFrequencyParams,
) {
  const bodyX = 535;
  const bodyY = 120;
  const bodyWidth = 425;
  const bodyHeight = 405;
  const screenX = 570;
  const screenY = 165;
  const screenWidth = 282;
  const screenHeight = 250;
  const screenCenterY = screenY + screenHeight / 2;

  context.save();
  context.shadowColor = "rgba(0,0,0,.58)";
  context.shadowBlur = 26;
  const casing = context.createLinearGradient(bodyX, bodyY, bodyX + bodyWidth, bodyY + bodyHeight);
  casing.addColorStop(0, "#f0bd5c");
  casing.addColorStop(0.45, "#cb8730");
  casing.addColorStop(1, "#76501f");
  context.fillStyle = casing;
  context.strokeStyle = "#ffdc8b";
  context.lineWidth = 2.5;
  roundedRect(context, bodyX, bodyY, bodyWidth, bodyHeight, 22);
  context.fill();
  context.stroke();
  context.shadowBlur = 0;
  context.fillStyle = "rgba(74,41,11,.25)";
  roundedRect(context, bodyX + 15, bodyY + 15, bodyWidth - 30, bodyHeight - 30, 15);
  context.fill();

  context.fillStyle = "#0a2c3b";
  context.strokeStyle = "#17202b";
  context.lineWidth = 10;
  roundedRect(context, screenX - 7, screenY - 7, screenWidth + 14, screenHeight + 14, 14);
  context.fill();
  context.stroke();
  context.strokeStyle = "rgba(125,211,252,.38)";
  context.lineWidth = 1.5;
  roundedRect(context, screenX, screenY, screenWidth, screenHeight, 8);
  context.stroke();

  context.save();
  roundedRect(context, screenX, screenY, screenWidth, screenHeight, 8);
  context.clip();
  const screenGlow = context.createRadialGradient(screenX + screenWidth / 2, screenCenterY, 10, screenX + screenWidth / 2, screenCenterY, screenWidth * 0.7);
  screenGlow.addColorStop(0, "rgba(11,94,108,.26)");
  screenGlow.addColorStop(1, "rgba(2,31,43,.06)");
  context.fillStyle = screenGlow;
  context.fillRect(screenX, screenY, screenWidth, screenHeight);

  for (let column = 0; column <= 10; column += 1) {
    const x = screenX + (column / 10) * screenWidth;
    context.strokeStyle = column === 5 ? "rgba(125,211,252,.46)" : "rgba(125,211,252,.19)";
    context.lineWidth = column === 5 ? 1.4 : 1;
    context.beginPath();
    context.moveTo(x, screenY);
    context.lineTo(x, screenY + screenHeight);
    context.stroke();
  }
  for (let row = 0; row <= 8; row += 1) {
    const y = screenY + (row / 8) * screenHeight;
    context.strokeStyle = row === 4 ? "rgba(125,211,252,.46)" : "rgba(125,211,252,.19)";
    context.lineWidth = row === 4 ? 1.4 : 1;
    context.beginPath();
    context.moveTo(screenX, y);
    context.lineTo(screenX + screenWidth, y);
    context.stroke();
  }
  for (let index = 0; index <= 50; index += 1) {
    const x = screenX + (index / 50) * screenWidth;
    context.fillStyle = "rgba(186,230,253,.35)";
    context.fillRect(x, screenCenterY - 2, 1, 4);
  }

  const traceVisible = state.phase !== "idle" && state.phase !== "exciting" && state.phase !== "vibrating" && state.phase !== "propagating";
  const samples = buildOscilloscopeSamples(state, params, 220);
  const voltsPerDivision = Math.max(0.05, params.voltsPerDivision);
  context.save();
  context.shadowColor = "#d9ff57";
  context.shadowBlur = traceVisible ? 9 : 3;
  context.strokeStyle = traceVisible ? "#d9ff57" : "rgba(217,255,87,.4)";
  context.lineWidth = 2.2;
  context.lineCap = "round";
  context.lineJoin = "round";
  context.beginPath();
  samples.forEach((sample, index) => {
    const x = screenX + (index / Math.max(1, samples.length - 1)) * screenWidth;
    const voltage = traceVisible ? sample.voltage : 0;
    const y = Math.min(screenY + screenHeight - 4, Math.max(screenY + 4, screenCenterY - (voltage / voltsPerDivision) * (screenHeight / 8)));
    if (index === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  });
  context.stroke();
  context.restore();

  if (traceVisible && state.phase !== "complete") {
    const sweepX = screenX + state.sweepProgress * screenWidth;
    const sweep = context.createLinearGradient(sweepX - 24, 0, sweepX + 4, 0);
    sweep.addColorStop(0, "rgba(217,255,87,0)");
    sweep.addColorStop(1, "rgba(217,255,87,.22)");
    context.fillStyle = sweep;
    context.fillRect(sweepX - 24, screenY, 28, screenHeight);
  }

  const cursor = cursorMeasurement(params);
  if (state.phase === "measuring" || state.phase === "complete") {
    const x1 = screenX + (cursor.cursorStartMs / cursor.visibleTimeMs) * screenWidth;
    const x2 = screenX + (cursor.cursorEndMs / cursor.visibleTimeMs) * screenWidth;
    context.setLineDash([5, 4]);
    context.strokeStyle = "rgba(251,191,36,.92)";
    context.lineWidth = 1.5;
    for (const x of [x1, x2]) {
      context.beginPath();
      context.moveTo(x, screenY + 18);
      context.lineTo(x, screenY + screenHeight - 12);
      context.stroke();
    }
    context.setLineDash([]);
    context.fillStyle = "#fde68a";
    context.font = "700 10px Inter, sans-serif";
    context.textAlign = "center";
    context.fillText("X₁", x1, screenY + 14);
    context.fillText("X₂", x2, screenY + 14);
    context.fillText(`Δt = ${cursor.cursorDeltaMs.toFixed(2)} ms · N = ${cursor.cursorCycles}`, (x1 + x2) / 2, screenY + screenHeight - 17);
  }
  context.restore();

  context.fillStyle = "#5b3615";
  context.font = "800 13px Inter, sans-serif";
  context.textAlign = "left";
  context.fillText("MÁY DAO ĐỘNG KÍ", 570, 455);
  context.font = "600 10px ui-monospace, monospace";
  context.fillText(`${params.timePerDivision.toFixed(2)} ms/DIV`, 570, 478);
  context.fillText(`${params.voltsPerDivision.toFixed(2)} V/DIV`, 570, 495);

  drawKnob(context, 898, 205, 23, (params.timePerDivision - 0.1) / 4.9, "TIME/DIV");
  drawKnob(context, 898, 290, 23, (params.voltsPerDivision - 0.1) / 1.9, "VOLT/DIV");
  drawKnob(context, 898, 375, 23, params.microphoneGain / 180, "GAIN");
  const ledColor = state.phase === "complete" || state.phase === "measuring" ? "#86efac" : state.phase === "noSignal" || state.phase === "invalidTimebase" ? "#fb7185" : "#fde047";
  context.fillStyle = ledColor;
  context.shadowColor = ledColor;
  context.shadowBlur = 8;
  context.beginPath();
  context.arc(904, 459, 7, 0, TAU);
  context.fill();
  context.shadowBlur = 0;
  context.fillStyle = "#5b3615";
  context.font = "700 9px Inter, sans-serif";
  context.textAlign = "center";
  context.fillText(state.phase === "complete" ? "ĐÃ ĐO" : state.phase === "measuring" ? "ĐANG ĐO" : state.phase === "noSignal" ? "NO SIGNAL" : state.phase === "invalidTimebase" ? "TIME/DIV" : "ACQUIRE", 904, 480);

  context.strokeStyle = "#172235";
  context.lineWidth = 4;
  context.beginPath();
  context.arc(554, 467, 9, 0, TAU);
  context.stroke();
  context.fillStyle = "#1e293b";
  context.beginPath();
  context.arc(554, 467, 5, 0, TAU);
  context.fill();
  context.restore();
}

export function OscilloscopeFrequencyScene({
  params,
  running,
  speed,
  resetSignal,
  command,
  onData,
  onComplete,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<OscilloscopeState>(createOscilloscopeState());
  const paramsRef = useRef(params);
  const callbacksRef = useRef({ onData, onComplete });
  const drawRef = useRef<() => void>(() => undefined);
  const lastCommandTokenRef = useRef(-1);
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
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    context.clearRect(0, 0, size.width, size.height);
    const backdrop = context.createRadialGradient(size.width * 0.45, size.height * 0.42, 20, size.width * 0.5, size.height * 0.5, Math.max(size.width, size.height) * 0.75);
    backdrop.addColorStop(0, "#183047");
    backdrop.addColorStop(0.58, "#0c192b");
    backdrop.addColorStop(1, "#060d18");
    context.fillStyle = backdrop;
    context.fillRect(0, 0, size.width, size.height);

    const scale = Math.min(size.width / VIEW_WIDTH, size.height / VIEW_HEIGHT);
    const offsetX = (size.width - VIEW_WIDTH * scale) / 2;
    const offsetY = (size.height - VIEW_HEIGHT * scale) / 2;
    context.save();
    context.translate(offsetX, offsetY);
    context.scale(scale, scale);

    context.fillStyle = "rgba(255,255,255,.035)";
    for (let y = 90; y < 540; y += 45) {
      context.fillRect(0, y, VIEW_WIDTH, 1);
    }
    context.fillStyle = "#172237";
    context.fillRect(0, 530, VIEW_WIDTH, 90);
    context.fillStyle = "rgba(148,163,184,.24)";
    context.fillRect(0, 530, VIEW_WIDTH, 3);

    const micX = microphoneX(currentParams);
    context.strokeStyle = "#111827";
    context.lineWidth = 4;
    context.beginPath();
    context.moveTo(micX + 40, 286);
    context.bezierCurveTo(Math.min(520, micX + 78), 302, 484, 470, 554, 467);
    context.stroke();
    context.strokeStyle = "rgba(148,163,184,.48)";
    context.lineWidth = 1;
    context.stroke();

    drawTuningFork(context, state, currentParams);
    drawSoundField(context, state, currentParams);
    drawMicrophone(context, state, currentParams);
    drawOscilloscope(context, state, currentParams);

    drawLabel(context, "Âm thoa", 68, 132, 180, 224);
    drawLabel(context, "Micro", Math.min(445, Math.max(290, micX - 58)), 188, micX - 40, 278);
    drawLabel(context, "Tín hiệu điện", 425, 434, 512, 452);
    drawLabel(context, "Dao động kí", 795, 72, 792, 121);

    context.fillStyle = "rgba(3,10,24,.82)";
    roundedRect(context, 26, 24, 264, 76, 12);
    context.fill();
    context.strokeStyle = "rgba(148,163,184,.28)";
    context.stroke();
    context.fillStyle = "#f1f5f9";
    context.font = "700 13px Inter, sans-serif";
    context.textAlign = "left";
    context.fillText("ĐO TẦN SỐ BẰNG DAO ĐỘNG KÍ", 42, 48);
    context.fillStyle = "#a7b5c8";
    context.font = "500 11px Inter, sans-serif";
    context.fillText("Micro biến dao động âm thành điện áp.", 42, 69);
    context.fillText("Đếm N chu kì trong khoảng thời gian Δt.", 42, 86);

    const amplitude = signalAmplitude(state, currentParams);
    const cursor = cursorMeasurement(currentParams);
    const hasMeasurement =
      amplitude >= 0.035 &&
      (state.phase === "measuring" || state.phase === "complete");
    context.fillStyle = "rgba(3,10,24,.84)";
    roundedRect(context, 552, 548, 420, 50, 11);
    context.fill();
    context.strokeStyle = "rgba(148,163,184,.28)";
    context.stroke();
    context.fillStyle = "#e2e8f0";
    context.font = "700 15px Georgia, serif";
    context.textAlign = "center";
    context.fillText(
      hasMeasurement
        ? `f = N/Δt = ${cursor.cursorCycles}/${(cursor.cursorDeltaMs / 1000).toFixed(5)} ≈ ${currentParams.frequency.toFixed(1)} Hz`
        : state.phase === "noSignal"
          ? "f = —  (không đủ tín hiệu)"
          : state.phase === "invalidTimebase"
            ? "Tăng TIME/DIV để thấy ít nhất một chu kì"
          : "Đang chờ dao động kí thu đủ chu kì…",
      762,
      571,
    );
    context.fillStyle = amplitude < 0.035 ? "#fda4af" : "#9fb0c5";
    context.font = "500 10px Inter, sans-serif";
    context.fillText(amplitude < 0.035 ? "Biên độ tín hiệu quá nhỏ: chưa thể đo." : "Độ cao vệt cho biết biên độ; khoảng ngang cho biết thời gian.", 762, 589);

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
    stateRef.current = createOscilloscopeState();
    lastDataTimeRef.current = -1;
    callbacksRef.current.onData(oscilloscopeMetrics(stateRef.current, paramsRef.current));
    drawRef.current();
  }, [resetSignal]);

  useEffect(() => {
    if (lastCommandTokenRef.current === command.token) return;
    lastCommandTokenRef.current = command.token;
    stateRef.current = applyOscilloscopeCommand(stateRef.current, command.type);
    callbacksRef.current.onData(oscilloscopeMetrics(stateRef.current, paramsRef.current));
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
      const result = stepOscilloscope(stateRef.current, paramsRef.current, delta * motionScale);
      stateRef.current = result.state;
      drawScene();
      if (stateRef.current.time - lastDataTimeRef.current >= 0.08 || result.completed) {
        lastDataTimeRef.current = stateRef.current.time;
        callbacksRef.current.onData(oscilloscopeMetrics(stateRef.current, paramsRef.current));
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
        aria-label="Âm thoa, micro và máy dao động kí dùng để đo tần số âm"
      />
    </div>
  );
}
