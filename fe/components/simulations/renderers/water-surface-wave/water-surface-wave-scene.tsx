"use client";

import { useCallback, useEffect, useRef } from "react";
import { useContainerSize } from "../../shared/use-container-size";
import {
  MAX_FIELD_RADIUS_CM,
  PROBE_DISTANCE_CM,
  VIEW_HEIGHT,
  VIEW_WIDTH,
} from "../../engines/water-surface-wave/constants";
import {
  applyWaterWaveCommand,
  createWaterWaveState,
  crestRadii,
  stepWaterWave,
  waterDisplacementAt,
  waterWaveMetrics,
  waterWavelength,
} from "../../engines/water-surface-wave/physics";
import type {
  WaterSurfaceWaveParams,
  WaterWaveCommand,
  WaterWaveMetrics,
  WaterWaveState,
} from "../../engines/water-surface-wave/types";

type Props = {
  params: WaterSurfaceWaveParams;
  running: boolean;
  speed: number;
  resetSignal: number;
  command: { type: WaterWaveCommand; token: number };
  onData: (metrics: WaterWaveMetrics) => void;
  onComplete: () => void;
};

const TAU = Math.PI * 2;
const SOURCE = { x: 260, y: 325 };
const CM_TO_PX = 12.7;
const PERSPECTIVE_Y = 0.56;

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

function tankPath(context: CanvasRenderingContext2D) {
  context.beginPath();
  context.moveTo(86, 144);
  context.lineTo(900, 144);
  context.lineTo(963, 512);
  context.lineTo(35, 512);
  context.closePath();
}

function drawArrow(
  context: CanvasRenderingContext2D,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  color: string,
) {
  const angle = Math.atan2(toY - fromY, toX - fromX);
  context.save();
  context.strokeStyle = color;
  context.fillStyle = color;
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(fromX, fromY);
  context.lineTo(toX, toY);
  context.stroke();
  context.beginPath();
  context.moveTo(toX, toY);
  context.lineTo(toX - 9 * Math.cos(angle - 0.5), toY - 9 * Math.sin(angle - 0.5));
  context.lineTo(toX - 9 * Math.cos(angle + 0.5), toY - 9 * Math.sin(angle + 0.5));
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
    context.strokeStyle = "rgba(203,213,225,.58)";
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

function drawWaterSurface(
  context: CanvasRenderingContext2D,
  state: WaterWaveState,
  params: WaterSurfaceWaveParams,
) {
  const clarity = Math.min(1, Math.max(0.2, params.surfaceClarity / 100));
  const waterGradient = context.createLinearGradient(0, 145, 0, 512);
  waterGradient.addColorStop(0, "#174963");
  waterGradient.addColorStop(0.42, "#0d6681");
  waterGradient.addColorStop(1, "#063b52");
  context.fillStyle = waterGradient;
  tankPath(context);
  context.fill();

  context.save();
  tankPath(context);
  context.clip();

  const sheen = context.createLinearGradient(80, 130, 880, 500);
  sheen.addColorStop(0, "rgba(186,230,253,.22)");
  sheen.addColorStop(0.35, "rgba(34,211,238,.035)");
  sheen.addColorStop(0.72, "rgba(255,255,255,.09)");
  sheen.addColorStop(1, "rgba(8,47,73,.1)");
  context.fillStyle = sheen;
  context.fillRect(20, 130, 950, 390);

  const waveTime = Math.max(0, state.time - 0.45);
  const frontRadius = Math.min(MAX_FIELD_RADIUS_CM, params.waveSpeed * waveTime);
  for (let row = 0; row < 10; row += 1) {
    for (let column = 0; column < 22; column += 1) {
      const x = 80 + column * 40 + (row % 2) * 18;
      const y = 175 + row * 34;
      const dxCm = (x - SOURCE.x) / CM_TO_PX;
      const dyCm = (y - SOURCE.y) / (CM_TO_PX * PERSPECTIVE_Y);
      const distance = Math.hypot(dxCm, dyCm);
      const displacement = waterDisplacementAt(distance, state.time, state.envelope, params);
      const reached = distance <= frontRadius;
      context.globalAlpha = reached
        ? (0.12 + Math.abs(displacement) * 0.13) * clarity
        : 0.05 * clarity;
      context.fillStyle = displacement >= 0 ? "#d9f6ff" : "#0b263a";
      context.beginPath();
      context.ellipse(x, y - displacement * 1.5, 4.5, 1.4, -0.18, 0, TAU);
      context.fill();
    }
  }
  context.globalAlpha = 1;

  const radii = crestRadii(state, params);
  for (const radiusCm of radii) {
    const damping = Math.exp(-params.damping * 0.0009 * radiusCm);
    const opacity = (0.25 + params.amplitude * 0.18) * damping * clarity;
    const radiusX = radiusCm * CM_TO_PX;
    const radiusY = radiusX * PERSPECTIVE_Y;
    context.save();
    context.strokeStyle = `rgba(207,250,254,${Math.min(0.9, opacity)})`;
    context.lineWidth = 1.6 + params.amplitude * 0.65;
    context.shadowColor = "rgba(103,232,249,.45)";
    context.shadowBlur = 5 + params.amplitude * 2;
    context.beginPath();
    context.ellipse(SOURCE.x, SOURCE.y, radiusX, radiusY, 0, 0, TAU);
    context.stroke();
    context.shadowBlur = 0;
    context.strokeStyle = `rgba(2,44,64,${Math.min(0.55, opacity * 0.72)})`;
    context.lineWidth = 1.2;
    context.beginPath();
    context.ellipse(
      SOURCE.x,
      SOURCE.y + 2,
      Math.max(1, radiusX - 4),
      Math.max(1, radiusY - 2),
      0,
      0,
      TAU,
    );
    context.stroke();
    context.restore();
  }

  if (state.frontRadius > 0.5 && state.frontRadius < MAX_FIELD_RADIUS_CM) {
    const radiusX = state.frontRadius * CM_TO_PX;
    context.strokeStyle = "rgba(165,243,252,.28)";
    context.lineWidth = 1;
    context.setLineDash([7, 7]);
    context.beginPath();
    context.ellipse(SOURCE.x, SOURCE.y, radiusX, radiusX * PERSPECTIVE_Y, 0, 0, TAU);
    context.stroke();
    context.setLineDash([]);
  }

  context.restore();

  context.strokeStyle = "rgba(186,230,253,.82)";
  context.lineWidth = 3;
  tankPath(context);
  context.stroke();

  const sideHeight = 20 + Math.min(100, Math.max(25, params.waterLevel)) * 0.28;
  const sideGradient = context.createLinearGradient(0, 510, 0, 570);
  sideGradient.addColorStop(0, "rgba(14,116,144,.72)");
  sideGradient.addColorStop(1, "rgba(5,46,66,.92)");
  context.fillStyle = sideGradient;
  context.beginPath();
  context.moveTo(35, 512);
  context.lineTo(963, 512);
  context.lineTo(945, 512 + sideHeight);
  context.lineTo(55, 512 + sideHeight);
  context.closePath();
  context.fill();
  context.strokeStyle = "rgba(125,211,252,.48)";
  context.stroke();
}

function drawDriver(
  context: CanvasRenderingContext2D,
  state: WaterWaveState,
  params: WaterSurfaceWaveParams,
) {
  const sourceDisplacement = waterDisplacementAt(0, state.time, state.envelope, params);
  const tipY = SOURCE.y - sourceDisplacement * 7;
  context.save();
  context.shadowColor = "rgba(0,0,0,.5)";
  context.shadowBlur = 16;
  const housing = context.createLinearGradient(180, 0, 330, 0);
  housing.addColorStop(0, "#38475b");
  housing.addColorStop(0.5, "#8ba0b7");
  housing.addColorStop(1, "#263548");
  context.fillStyle = housing;
  context.strokeStyle = "#cbd5e1";
  context.lineWidth = 2;
  roundedRect(context, 184, 76, 152, 58, 16);
  context.fill();
  context.stroke();
  context.shadowBlur = 0;
  context.fillStyle = "#172033";
  roundedRect(context, 199, 91, 122, 27, 9);
  context.fill();
  context.fillStyle = "#67e8f9";
  context.font = "800 11px ui-monospace, monospace";
  context.textAlign = "center";
  context.fillText(`${params.frequency.toFixed(1)} Hz`, 260, 109);

  context.strokeStyle = "#9fb0c5";
  context.lineWidth = 9;
  context.lineCap = "round";
  context.beginPath();
  context.moveTo(260, 133);
  context.lineTo(260, tipY - 13);
  context.stroke();
  context.strokeStyle = "#e2e8f0";
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(257, 137);
  context.lineTo(257, tipY - 14);
  context.stroke();
  const tipRadius = 8 + params.sourceDiameter * 1.5;
  context.fillStyle = "#e8c978";
  context.strokeStyle = "#fff1bd";
  context.lineWidth = 1.5;
  context.beginPath();
  context.ellipse(SOURCE.x, tipY, tipRadius, 6, 0, 0, TAU);
  context.fill();
  context.stroke();
  context.restore();
}

function drawProbe(
  context: CanvasRenderingContext2D,
  state: WaterWaveState,
  params: WaterSurfaceWaveParams,
) {
  const baseX = SOURCE.x + PROBE_DISTANCE_CM * CM_TO_PX;
  const baseY = SOURCE.y;
  const displacement = waterDisplacementAt(PROBE_DISTANCE_CM, state.time, state.envelope, params);
  const y = baseY - displacement * 8;
  context.save();
  context.strokeStyle = "rgba(251,191,36,.46)";
  context.lineWidth = 1;
  context.setLineDash([3, 4]);
  context.beginPath();
  context.moveTo(baseX, baseY - 35);
  context.lineTo(baseX, baseY + 35);
  context.stroke();
  context.setLineDash([]);
  context.fillStyle = "rgba(2,20,32,.45)";
  context.beginPath();
  context.ellipse(baseX + 2, baseY + 8, 17, 6, 0, 0, TAU);
  context.fill();
  const cork = context.createRadialGradient(baseX - 5, y - 5, 1, baseX, y, 18);
  cork.addColorStop(0, "#fff1b8");
  cork.addColorStop(0.45, "#f2b84b");
  cork.addColorStop(1, "#9a5d1e");
  context.fillStyle = cork;
  context.strokeStyle = "#fde68a";
  context.lineWidth = 2;
  context.beginPath();
  context.ellipse(baseX, y, 17, 11, 0, 0, TAU);
  context.fill();
  context.stroke();
  drawArrow(context, baseX + 28, baseY + 22, baseX + 28, baseY - 23, "#fde68a");
  context.fillStyle = "#fff1b8";
  context.font = "700 10px Inter, sans-serif";
  context.fillText("dao động tại chỗ", baseX + 38, baseY + 3);
  context.restore();
}

function drawWavelengthBracket(
  context: CanvasRenderingContext2D,
  state: WaterWaveState,
  params: WaterSurfaceWaveParams,
) {
  if (state.emittedCycles < 2) return;
  const wavelength = waterWavelength(params);
  const radii = crestRadii(state, params)
    .filter((radius) => SOURCE.x + radius * CM_TO_PX < 875)
    .sort((a, b) => a - b);
  if (radii.length < 2) return;
  const r1 = radii[0]!;
  const r2 = r1 + wavelength;
  const x1 = SOURCE.x + r1 * CM_TO_PX;
  const x2 = SOURCE.x + r2 * CM_TO_PX;
  const y = SOURCE.y - 54;
  context.save();
  context.strokeStyle = "#fef08a";
  context.fillStyle = "#fef08a";
  context.lineWidth = 1.5;
  context.beginPath();
  context.moveTo(x1, y - 6);
  context.lineTo(x1, y + 6);
  context.moveTo(x2, y - 6);
  context.lineTo(x2, y + 6);
  context.moveTo(x1, y);
  context.lineTo(x2, y);
  context.stroke();
  context.font = "700 11px Inter, sans-serif";
  context.textAlign = "center";
  context.fillText(`λ = ${wavelength.toFixed(1)} cm`, (x1 + x2) / 2, y - 9);
  context.restore();
}

function drawRuler(context: CanvasRenderingContext2D) {
  const x = 112;
  const y = 490;
  const width = 760;
  context.save();
  context.fillStyle = "rgba(2,20,32,.62)";
  roundedRect(context, x, y, width, 17, 5);
  context.fill();
  context.strokeStyle = "rgba(186,230,253,.54)";
  context.lineWidth = 1;
  context.stroke();
  context.font = "600 8px ui-monospace, monospace";
  context.fillStyle = "#bae6fd";
  context.textAlign = "center";
  for (let cm = 0; cm <= 60; cm += 2) {
    const tickX = x + (cm / 60) * width;
    const major = cm % 10 === 0;
    context.beginPath();
    context.moveTo(tickX, y);
    context.lineTo(tickX, y + (major ? 9 : 5));
    context.stroke();
    if (major) context.fillText(String(cm), tickX, y + 15);
  }
  context.restore();
}

export function WaterSurfaceWaveScene({
  params,
  running,
  speed,
  resetSignal,
  command,
  onData,
  onComplete,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<WaterWaveState>(createWaterWaveState());
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
    const background = context.createRadialGradient(size.width * 0.5, size.height * 0.45, 20, size.width * 0.5, size.height * 0.45, Math.max(size.width, size.height) * 0.75);
    background.addColorStop(0, "#18354a");
    background.addColorStop(0.58, "#0a1828");
    background.addColorStop(1, "#050c17");
    context.fillStyle = background;
    context.fillRect(0, 0, size.width, size.height);

    const scale = Math.min(size.width / VIEW_WIDTH, size.height / VIEW_HEIGHT);
    const offsetX = (size.width - VIEW_WIDTH * scale) / 2;
    const offsetY = (size.height - VIEW_HEIGHT * scale) / 2;
    context.save();
    context.translate(offsetX, offsetY);
    context.scale(scale, scale);

    context.fillStyle = "rgba(0,0,0,.35)";
    context.beginPath();
    context.ellipse(500, 563, 447, 32, 0, 0, TAU);
    context.fill();
    drawWaterSurface(context, state, currentParams);
    drawRuler(context);
    drawDriver(context, state, currentParams);
    drawProbe(context, state, currentParams);
    drawWavelengthBracket(context, state, currentParams);

    drawArrow(context, 305, 390, 420, 390, "#a5f3fc");
    context.fillStyle = "#cffafe";
    context.font = "700 10px Inter, sans-serif";
    context.fillText("hướng truyền năng lượng", 321, 409);

    drawLabel(context, "Nguồn dao động", 104, 82, 184, 105);
    drawLabel(context, "Mặt nước", 50, 242, 91, 254);
    drawLabel(context, "Phao quan sát", 653, 231, 641, 311);
    drawLabel(context, "Khay sóng", 823, 462, 931, 500);

    context.fillStyle = "rgba(3,10,24,.84)";
    roundedRect(context, 24, 24, 278, 52, 12);
    context.fill();
    context.strokeStyle = "rgba(148,163,184,.28)";
    context.stroke();
    context.fillStyle = "#f1f5f9";
    context.font = "700 13px Inter, sans-serif";
    context.fillText("SÓNG TRÊN MẶT NƯỚC", 40, 46);
    context.fillStyle = "#a7b5c8";
    context.font = "500 10px Inter, sans-serif";
    context.fillText("Phần tử nước dao động; trạng thái sóng lan ra xa.", 40, 64);

    const wavelength = waterWavelength(currentParams);
    context.fillStyle = "rgba(3,10,24,.84)";
    roundedRect(context, 718, 24, 254, 68, 12);
    context.fill();
    context.strokeStyle = "rgba(148,163,184,.28)";
    context.stroke();
    context.fillStyle = "#e2e8f0";
    context.font = "700 16px Georgia, serif";
    context.textAlign = "center";
    context.fillText("v = λf", 845, 49);
    context.fillStyle = "#9fb0c5";
    context.font = "500 10px Inter, sans-serif";
    context.fillText(`v = ${currentParams.waveSpeed.toFixed(1)} cm/s · λ = ${wavelength.toFixed(1)} cm`, 845, 69);
    context.fillText(`f = ${currentParams.frequency.toFixed(1)} Hz · T = ${(1 / Math.max(0.1, currentParams.frequency)).toFixed(2)} s`, 845, 84);

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
    stateRef.current = createWaterWaveState();
    lastDataTimeRef.current = -1;
    callbacksRef.current.onData(waterWaveMetrics(stateRef.current, paramsRef.current));
    drawRef.current();
  }, [resetSignal]);

  useEffect(() => {
    if (lastCommandTokenRef.current === command.token) return;
    lastCommandTokenRef.current = command.token;
    stateRef.current = applyWaterWaveCommand(stateRef.current, command.type);
    callbacksRef.current.onData(waterWaveMetrics(stateRef.current, paramsRef.current));
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
      const result = stepWaterWave(stateRef.current, paramsRef.current, delta * motionScale);
      stateRef.current = result.state;
      drawScene();
      if (stateRef.current.time - lastDataTimeRef.current >= 0.08) {
        lastDataTimeRef.current = stateRef.current.time;
        callbacksRef.current.onData(waterWaveMetrics(stateRef.current, paramsRef.current));
      }
      animationFrame = requestAnimationFrame(animate);
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
        aria-label="Nguồn dao động tạo các gợn sóng tròn lan truyền trên mặt nước"
      />
    </div>
  );
}
