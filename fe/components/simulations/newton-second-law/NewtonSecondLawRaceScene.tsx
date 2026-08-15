"use client";

import { simulationCanvasFont } from "@/components/simulations/shared/typography";

import { useCallback, useEffect, useRef } from "react";
import { useContainerSize } from "../shared/use-container-size";
import {
  HUMAN_SUSTAINED_FORCE_LIMIT_N,
  cartRaceState,
  newtonRaceParams,
  raceMetrics,
  type CartRaceState,
} from "./physics";

const VIEW_WIDTH = 1200;
const VIEW_HEIGHT = 720;
const START_X = 205;
const FINISH_X = 1035;

type Props = {
  params: Record<string, number>;
  running: boolean;
  speed: number;
  resetSignal: number;
  onRunningChange: (running: boolean) => void;
  seekSeconds?: number;
  seekToken?: number;
  markLabel?: string;
};

type LaneTheme = {
  accent: string;
  accentSoft: string;
  label: string;
};

const TOP_THEME: LaneTheme = {
  accent: "#38bdf8",
  accentSoft: "rgba(56,189,248,.18)",
  label: "NGƯỜI TRÊN · XE A",
};

const BOTTOM_THEME: LaneTheme = {
  accent: "#fb923c",
  accentSoft: "rgba(251,146,60,.18)",
  label: "NGƯỜI DƯỚI · XE B",
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
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: string,
) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.hypot(dx, dy);
  if (length < 1) return;
  const unitX = dx / length;
  const unitY = dy / length;
  const normalX = -unitY;
  const normalY = unitX;
  const headLength = Math.min(16, Math.max(10, length * 0.22));
  const headHalfWidth = 8;
  const headBaseX = x2 - unitX * headLength;
  const headBaseY = y2 - unitY * headLength;

  context.save();
  context.strokeStyle = color;
  context.fillStyle = color;
  context.lineWidth = 4;
  context.lineCap = "round";
  context.beginPath();
  context.moveTo(x1, y1);
  context.lineTo(headBaseX + unitX, headBaseY + unitY);
  context.stroke();
  context.beginPath();
  context.moveTo(x2, y2);
  context.lineTo(headBaseX + normalX * headHalfWidth, headBaseY + normalY * headHalfWidth);
  context.lineTo(headBaseX - normalX * headHalfWidth, headBaseY - normalY * headHalfWidth);
  context.closePath();
  context.fill();
  context.restore();
}

function drawClassicBackground(context: CanvasRenderingContext2D) {
  context.fillStyle = "#0f172a";
  context.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);

  context.save();
  context.strokeStyle = "#3a4a68";
  context.lineWidth = 1;
  context.globalAlpha = 0.42;
  for (let x = 0; x <= VIEW_WIDTH; x += 40) {
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x, VIEW_HEIGHT);
    context.stroke();
  }
  for (let y = 0; y <= VIEW_HEIGHT; y += 40) {
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(VIEW_WIDTH, y);
    context.stroke();
  }
  context.restore();
}

function drawTrack(context: CanvasRenderingContext2D, groundY: number, theme: LaneTheme) {
  context.save();
  roundedRect(context, 42, groundY - 24, 1116, 76, 18);
  context.fillStyle = "#0b1220";
  context.fill();
  context.strokeStyle = "rgba(148,163,184,.2)";
  context.lineWidth = 1.5;
  context.stroke();

  context.strokeStyle = theme.accentSoft;
  context.lineWidth = 2;
  context.setLineDash([18, 18]);
  context.beginPath();
  context.moveTo(74, groundY + 25);
  context.lineTo(1126, groundY + 25);
  context.stroke();
  context.setLineDash([]);

  context.restore();
}

function drawFinishGate(context: CanvasRenderingContext2D, groundY: number, pulse: number) {
  context.save();
  context.fillStyle = "#475569";
  context.fillRect(FINISH_X - 5, groundY - 168, 10, 218);
  context.fillStyle = "#94a3b8";
  context.fillRect(FINISH_X - 7, groundY - 168, 14, 8);
  const square = 10;
  for (let row = 0; row < 5; row += 1) {
    for (let col = 0; col < 6; col += 1) {
      context.fillStyle = (row + col) % 2 === 0 ? "#f8fafc" : "#0f172a";
      context.fillRect(FINISH_X + col * square, groundY - 160 + row * square, square, square);
    }
  }
  context.shadowColor = "#f8fafc";
  context.shadowBlur = pulse * 20;
  context.strokeStyle = `rgba(248,250,252,${0.35 + pulse * 0.4})`;
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(FINISH_X, groundY - 175);
  context.lineTo(FINISH_X, groundY + 2);
  context.stroke();
  context.restore();
}

function drawSilhouettePath(
  context: CanvasRenderingContext2D,
  width: number,
  path: () => void,
  fill = "#05070b",
  outline = "rgba(226,232,240,.88)",
) {
  context.beginPath();
  path();
  context.strokeStyle = outline;
  context.lineWidth = width + 3;
  context.stroke();
  context.strokeStyle = fill;
  context.lineWidth = width;
  context.stroke();
}

function drawSilhouetteLeg(
  context: CanvasRenderingContext2D,
  hipX: number,
  hipY: number,
  footX: number,
  footY: number,
  bend: number,
  rear = false,
) {
  const kneeX = hipX + (footX - hipX) * 0.48 + bend;
  const kneeY = hipY + (footY - hipY) * 0.5 - Math.abs(bend) * 0.12;
  const fill = rear ? "#273244" : "#05070b";
  const outline = rear ? "rgba(148,163,184,.72)" : "rgba(226,232,240,.9)";
  drawSilhouettePath(context, 14, () => {
    context.moveTo(hipX, hipY);
    context.lineTo(kneeX, kneeY);
    context.lineTo(footX, footY);
  }, fill, outline);
  drawSilhouettePath(context, 9, () => {
    context.moveTo(footX - 2, footY);
    context.lineTo(footX + 20, footY);
  }, fill, outline);
}

// Kept as a fallback reference for the previous scene renderer.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function drawPerson(
  context: CanvasRenderingContext2D,
  cartX: number,
  groundY: number,
  state: CartRaceState,
  theme: LaneTheme,
) {
  const moving = state.velocity > 0.04 && !state.finished;
  const forceRatio = Math.min(1, state.appliedForce / HUMAN_SUSTAINED_FORCE_LIMIT_N);
  // Pha bước phụ thuộc quãng đường, vì vậy bàn chân không chạy tại chỗ khi đổi tốc độ.
  const gaitPhase = moving ? state.position * 2.7 : 0;
  const frontStride = moving ? Math.sin(gaitPhase) * 27 : 19;
  const rearStride = moving ? Math.sin(gaitPhase + Math.PI) * 27 : -18;
  const frontLift = moving ? Math.max(0, Math.cos(gaitPhase)) * 10 : 0;
  const rearLift = moving ? Math.max(0, Math.cos(gaitPhase + Math.PI)) * 10 : 0;
  const bodyBounce = moving ? Math.abs(Math.sin(gaitPhase * 2)) * 1.7 : 0;
  const hipX = cartX - 124;
  const hipY = groundY - 60 - bodyBounce;
  const lean = 13 + forceRatio * 11;
  const shoulderX = hipX + lean;
  const shoulderY = hipY - 57;
  const headX = shoulderX + 5;
  const headY = shoulderY - 25;
  const handX = cartX - 69;
  const handY = groundY - 91;

  context.save();
  context.lineCap = "round";
  context.lineJoin = "round";

  // Chân sau vẽ trước, chân trước vẽ sau để không nhập thành một khối khó đọc.
  drawSilhouetteLeg(context, hipX - 3, hipY, hipX + rearStride, groundY - 9 - rearLift, -10, true);
  drawSilhouetteLeg(context, hipX + 4, hipY, hipX + frontStride, groundY - 9 - frontLift, 10);

  // Tay sau là một lớp xám riêng biệt; tay trước màu đen nối đúng vai–khuỷu–tay cầm.
  drawSilhouettePath(context, 9, () => {
    context.moveTo(shoulderX - 6, shoulderY + 12);
    context.lineTo((shoulderX + handX) / 2 - 2, handY + 15);
    context.lineTo(handX - 2, handY + 12);
  }, "#273244", "rgba(148,163,184,.72)");

  // Thân là một mảng kín thay vì nhiều nét chồng lên nhau.
  context.beginPath();
  context.moveTo(shoulderX - 11, shoulderY + 2);
  context.quadraticCurveTo(shoulderX - 17, shoulderY + 30, hipX - 11, hipY + 2);
  context.quadraticCurveTo(hipX, hipY + 10, hipX + 12, hipY + 1);
  context.quadraticCurveTo(shoulderX + 17, shoulderY + 32, shoulderX + 11, shoulderY + 4);
  context.closePath();
  context.fillStyle = "#05070b";
  context.fill();
  context.strokeStyle = "rgba(226,232,240,.9)";
  context.lineWidth = 3;
  context.stroke();

  drawSilhouettePath(context, 10, () => {
    context.moveTo(shoulderX + 5, shoulderY + 11);
    context.lineTo((shoulderX + handX) / 2 + 3, handY - 7);
    context.lineTo(handX, handY);
  });

  context.fillStyle = "#020617";
  context.strokeStyle = "rgba(226,232,240,.92)";
  context.lineWidth = 3;
  context.beginPath();
  context.arc(headX, headY, 18, 0, Math.PI * 2);
  context.fill();
  context.stroke();

  context.strokeStyle = theme.accent;
  context.lineWidth = 3;
  context.beginPath();
  context.moveTo(hipX - 8, hipY - 3);
  context.lineTo(hipX + 10, hipY - 1);
  context.stroke();
  context.restore();
}

const VECTOR_PERSON_FILL = "#000000";
const VECTOR_PERSON_OUTLINE = "#ffffff";

function drawVectorSegment(
  context: CanvasRenderingContext2D,
  points: Array<[number, number]>,
  width: number,
) {
  const stroke = (lineWidth: number, color: string) => {
    context.beginPath();
    context.moveTo(points[0][0], points[0][1]);
    for (const [x, y] of points.slice(1)) context.lineTo(x, y);
    context.strokeStyle = color;
    context.lineWidth = lineWidth;
    context.lineCap = "round";
    context.lineJoin = "round";
    context.stroke();
  };
  stroke(width + 7, VECTOR_PERSON_OUTLINE);
  stroke(width, VECTOR_PERSON_FILL);
}

function drawVectorFoot(context: CanvasRenderingContext2D, x: number, y: number) {
  context.save();
  roundedRect(context, x, y - 8, 22, 16, 8);
  context.fillStyle = VECTOR_PERSON_FILL;
  context.fill();
  context.strokeStyle = VECTOR_PERSON_OUTLINE;
  context.lineWidth = 3.5;
  context.stroke();
  context.restore();
}

/** Flat, rig-friendly character. Each limb is a separate rounded vector segment. */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function drawPersonVector(
  context: CanvasRenderingContext2D,
  cartX: number,
  groundY: number,
  state: CartRaceState,
) {
  const moving = state.velocity > 0.04 && !state.finished;
  const forceRatio = Math.min(1, state.appliedForce / HUMAN_SUSTAINED_FORCE_LIMIT_N);
  const gait = moving ? state.position * 2.7 : 0;
  const stride = moving ? Math.sin(gait) * 25 : 17;
  const counterStride = moving ? Math.sin(gait + Math.PI) * 25 : -15;
  const frontLift = moving ? Math.max(0, Math.cos(gait)) * 8 : 0;
  const rearLift = moving ? Math.max(0, Math.cos(gait + Math.PI)) * 8 : 0;
  const bounce = moving ? Math.abs(Math.sin(gait * 2)) * 1.5 : 0;

  const hip = { x: cartX - 124, y: groundY - 60 - bounce };
  const shoulder = { x: hip.x + 12 + forceRatio * 10, y: hip.y - 58 };
  const head = { x: shoulder.x + 4, y: shoulder.y - 25 };
  const hand = { x: cartX - 69, y: groundY - 91 };

  const rearKnee = { x: hip.x - 11 + counterStride * 0.36, y: groundY - 37 - rearLift };
  const rearAnkle = { x: hip.x - 16 + counterStride, y: groundY - 10 - rearLift };
  const frontKnee = { x: hip.x + 10 + stride * 0.36, y: groundY - 35 - frontLift };
  const frontAnkle = { x: hip.x + 13 + stride, y: groundY - 10 - frontLift };
  const rearElbow = { x: shoulder.x - 12, y: shoulder.y + 33 };
  const frontElbow = { x: shoulder.x + 3, y: hand.y - 7 };

  context.save();
  context.lineCap = "round";
  context.lineJoin = "round";

  // Legs are thicker than arms and have deliberately bent knees.
  drawVectorSegment(context, [[hip.x - 3, hip.y], [rearKnee.x, rearKnee.y]], 15);
  drawVectorSegment(context, [[rearKnee.x, rearKnee.y], [rearAnkle.x, rearAnkle.y]], 15);
  drawVectorFoot(context, rearAnkle.x - 3, rearAnkle.y);
  drawVectorSegment(context, [[hip.x + 4, hip.y], [frontKnee.x, frontKnee.y]], 15);
  drawVectorSegment(context, [[frontKnee.x, frontKnee.y], [frontAnkle.x, frontAnkle.y]], 15);
  drawVectorFoot(context, frontAnkle.x - 3, frontAnkle.y);

  // Slightly curved torso, kept as a single clean silhouette for readability.
  context.beginPath();
  context.moveTo(shoulder.x - 12, shoulder.y + 3);
  context.quadraticCurveTo(shoulder.x - 16, shoulder.y + 28, hip.x - 11, hip.y + 4);
  context.quadraticCurveTo(hip.x, hip.y + 11, hip.x + 11, hip.y + 3);
  context.quadraticCurveTo(shoulder.x + 16, shoulder.y + 29, shoulder.x + 11, shoulder.y + 3);
  context.closePath();
  context.fillStyle = VECTOR_PERSON_FILL;
  context.fill();
  context.strokeStyle = VECTOR_PERSON_OUTLINE;
  context.lineWidth = 3.5;
  context.stroke();

  // Two independently rotating arm pairs reach the cart handle.
  drawVectorSegment(context, [[shoulder.x - 7, shoulder.y + 11], [rearElbow.x, rearElbow.y]], 10);
  drawVectorSegment(context, [[rearElbow.x, rearElbow.y], [hand.x - 2, hand.y + 11]], 10);
  drawVectorSegment(context, [[shoulder.x + 6, shoulder.y + 11], [frontElbow.x, frontElbow.y]], 10);
  drawVectorSegment(context, [[frontElbow.x, frontElbow.y], [hand.x, hand.y]], 10);

  // Featureless round head: no face, hair, clothing, shadows or accessories.
  context.fillStyle = VECTOR_PERSON_FILL;
  context.strokeStyle = VECTOR_PERSON_OUTLINE;
  context.lineWidth = 3.5;
  context.beginPath();
  context.arc(head.x, head.y, 17, 0, Math.PI * 2);
  context.fill();
  context.stroke();
  context.restore();
}

function drawForceVector(
  context: CanvasRenderingContext2D,
  cartX: number,
  groundY: number,
  state: CartRaceState,
) {
  const length = state.appliedForce * 0.45;
  if (length < 2) return;
  const endX = cartX - 84;
  const startX = endX - length;
  const y = groundY - 74;
  const color = "#22c55e";
  drawArrow(context, startX, y, endX, y, color);

  context.save();
  context.fillStyle = "#bbf7d0";
  context.font = simulationCanvasFont("11px", 500);
  context.textAlign = "center";
  context.fillText(`F = ${state.appliedForce.toFixed(0)} N`, (startX + endX) / 2, y - 13);
  context.restore();
}

function drawMassBlock(
  context: CanvasRenderingContext2D,
  centerX: number,
  bottomY: number,
  mass: number,
  maxSize: number,
) {
  const size = 22 + (maxSize - 22) * Math.sqrt(Math.min(100, mass) / 100);
  const x = centerX - size / 2;
  const y = bottomY - size;
  context.save();
  roundedRect(context, x, y, size, size, Math.min(7, size * 0.12));
  context.fillStyle = "#475569";
  context.fill();
  context.strokeStyle = "#cbd5e1";
  context.lineWidth = 2.5;
  context.stroke();
  if (size >= 34) {
    context.fillStyle = "#f8fafc";
    context.font = simulationCanvasFont(`${size >= 50 ? 11 : 9}px`, 500);
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(`${mass.toFixed(0)} kg`, centerX, y + size / 2);
  }
  context.restore();
}

function loadSegments(loadMass: number): number[] {
  const completedHundreds = Math.floor(loadMass / 100);
  const activeMass = Math.max(1, loadMass - completedHundreds * 100);
  return [...Array.from({ length: completedHundreds }, () => 100), activeMass];
}

function massBlockLayout(loadMass: number) {
  const segments = loadSegments(loadMass);
  const maxSize = segments.length === 1 ? 68 : segments.length === 2 ? 56 : 45;
  const sizes = segments.map((mass) => 22 + (maxSize - 22) * Math.sqrt(Math.min(100, mass) / 100));
  return {
    segments,
    maxSize,
    sizes,
    totalWidth: sizes.reduce((sum, size) => sum + size, 0) + (segments.length - 1) * 7,
  };
}

function drawMassObject(
  context: CanvasRenderingContext2D,
  cartX: number,
  groundY: number,
  state: CartRaceState,
  visualTime: number,
  theme: LaneTheme,
) {
  const bounce = state.finished ? 0 : Math.sin(visualTime * 10) * Math.min(1.2, state.velocity * 0.2);
  context.save();
  context.translate(0, -bounce);

  const layout = massBlockLayout(state.loadMass);
  let blockX = cartX - layout.totalWidth / 2;
  for (let index = 0; index < layout.segments.length; index += 1) {
    const size = layout.sizes[index]!;
    drawMassBlock(context, blockX + size / 2, groundY - 43, layout.segments[index]!, layout.maxSize);
    blockX += size + 7;
  }

  // Giữ lại xe hàng cũ: tay đẩy, lưới chắn, sàn và hai bánh xe.
  roundedRect(context, cartX - 78, groundY - 43, 160, 24, 7);
  context.fillStyle = theme.accent;
  context.fill();
  context.strokeStyle = "#e2e8f0";
  context.lineWidth = 2;
  context.stroke();

  for (const wheelX of [cartX - 47, cartX + 52]) {
    context.save();
    context.translate(wheelX, groundY - 10);
    context.rotate(state.position * 3.2);
    context.fillStyle = "#020617";
    context.beginPath();
    context.arc(0, 0, 17, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = "#64748b";
    context.lineWidth = 4;
    context.stroke();
    context.strokeStyle = "#cbd5e1";
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(-10, 0);
    context.lineTo(10, 0);
    context.moveTo(0, -10);
    context.lineTo(0, 10);
    context.stroke();
    context.fillStyle = theme.accent;
    context.beginPath();
    context.arc(0, 0, 4, 0, Math.PI * 2);
    context.fill();
    context.restore();
  }
  context.restore();
}

function drawAccelerationVector(
  context: CanvasRenderingContext2D,
  cartX: number,
  groundY: number,
  state: CartRaceState,
  theme: LaneTheme,
) {
  // Cùng một tỉ lệ cho cả hai xe: 62 px ứng với 1 m/s².
  const length = state.acceleration * 62;
  if (length < 2) return;
  const startX = cartX - 48;
  const y = groundY - 137;
  drawArrow(context, startX, y, startX + length, y, theme.accent);
  context.save();
  context.fillStyle = "#e2e8f0";
  context.font = simulationCanvasFont("11px", 500);
  context.textAlign = "left";
  context.fillText(`a = ${state.acceleration.toFixed(2)} m/s²`, startX, y - 11);
  context.restore();
}

function drawComparisonHud(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  top: CartRaceState,
  bottom: CartRaceState,
) {
  context.save();
  roundedRect(context, x, y, 610, 112, 16);
  context.fillStyle = "rgba(2,6,23,.76)";
  context.fill();
  context.strokeStyle = "rgba(148,163,184,.28)";
  context.lineWidth = 1.5;
  context.stroke();

  context.fillStyle = "#f8fafc";
  context.font = simulationCanvasFont("11px", 500);
  context.textAlign = "left";
  context.fillText("SO SÁNH HAI XE HÀNG", x + 17, y + 22);
  context.fillStyle = "#94a3b8";
  context.font = simulationCanvasFont("10px", 500);
  context.textAlign = "right";
  context.fillText("a = F / m", x + 593, y + 22);

  context.strokeStyle = "rgba(148,163,184,.18)";
  context.beginPath();
  context.moveTo(x + 15, y + 34);
  context.lineTo(x + 595, y + 34);
  context.moveTo(x + 15, y + 72);
  context.lineTo(x + 595, y + 72);
  context.stroke();

  const drawRow = (state: CartRaceState, theme: LaneTheme, rowY: number, shortLabel: string) => {
    roundedRect(context, x + 16, rowY - 16, 27, 25, 7);
    context.fillStyle = theme.accent;
    context.fill();
    context.fillStyle = "#020617";
    context.font = simulationCanvasFont("12px", 500);
    context.textAlign = "center";
    context.fillText(shortLabel, x + 29.5, rowY + 1);

    context.fillStyle = "#e2e8f0";
    context.font = simulationCanvasFont("12px", 500);
    context.textAlign = "left";
    context.fillText(`m = ${state.totalMass.toFixed(0)} kg`, x + 57, rowY);
    context.fillText(`F = ${state.appliedForce.toFixed(0)} N`, x + 178, rowY);
    context.fillText(`a = ${state.acceleration.toFixed(2)} m/s²`, x + 288, rowY);

    context.textAlign = "right";
    context.font = simulationCanvasFont("10px", 500);
    context.fillStyle = state.finished ? "#86efac" : state.forceLimited ? "#fda4af" : "#94a3b8";
    const status = state.finished
      ? `${state.finishTime.toFixed(2)} s`
      : state.forceLimited
        ? `giới hạn ${HUMAN_SUSTAINED_FORCE_LIMIT_N} N`
        : `${state.position.toFixed(1)} m`;
    context.fillText(status, x + 590, rowY);
  };

  drawRow(top, TOP_THEME, y + 58, "A");
  drawRow(bottom, BOTTOM_THEME, y + 96, "B");
  context.restore();
}

export function NewtonSecondLawRaceScene({
  params,
  running,
  speed,
  resetSignal,
  onRunningChange,
  seekSeconds,
  seekToken,
  markLabel,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const elapsedRef = useRef(0);
  const visualTimeRef = useRef(0);
  const paramsRef = useRef(newtonRaceParams(params));
  const callbackRef = useRef(onRunningChange);
  const completedRef = useRef(false);
  const reducedMotionRef = useRef(false);
  const drawRef = useRef<() => void>(() => undefined);
  const { ref: containerRef, size } = useContainerSize<HTMLDivElement>();

  useEffect(() => { callbackRef.current = onRunningChange; }, [onRunningChange]);

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
    const scale = Math.min(size.width / VIEW_WIDTH, size.height / VIEW_HEIGHT);
    const offsetX = (size.width - VIEW_WIDTH * scale) / 2;
    const offsetY = (size.height - VIEW_HEIGHT * scale) / 2;
    const currentParams = paramsRef.current;
    const metrics = raceMetrics(currentParams);
    const top = cartRaceState(metrics.top, elapsedRef.current);
    const bottom = cartRaceState(metrics.bottom, elapsedRef.current);
    const topX = START_X + top.progress * (FINISH_X - START_X);
    const bottomX = START_X + bottom.progress * (FINISH_X - START_X);
    const pulse = 0.5 + Math.sin(visualTimeRef.current * 4) * 0.5;

    context.setTransform(1, 0, 0, 1, 0, 0);
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.save();
    context.scale(canvas.width / size.width, canvas.height / size.height);
    context.translate(offsetX, offsetY);
    context.scale(scale, scale);

    drawClassicBackground(context);
    drawTrack(context, 345, TOP_THEME);
    drawTrack(context, 650, BOTTOM_THEME);
    drawFinishGate(context, 345, top.finished ? pulse : 0);
    drawFinishGate(context, 650, bottom.finished ? pulse : 0);
    drawComparisonHud(context, 50, 20, top, bottom);

    drawForceVector(context, topX, 345, top);
    drawMassObject(context, topX, 345, top, visualTimeRef.current, TOP_THEME);
    drawAccelerationVector(context, topX, 345, top, TOP_THEME);

    drawForceVector(context, bottomX, 650, bottom);
    drawMassObject(context, bottomX, 650, bottom, visualTimeRef.current, BOTTOM_THEME);
    drawAccelerationVector(context, bottomX, 650, bottom, BOTTOM_THEME);

    if (markLabel) {
      roundedRect(context, 50, 143, 275, 36, 10);
      context.fillStyle = "rgba(2,6,23,.88)";
      context.fill();
      context.strokeStyle = "rgba(167,139,250,.55)";
      context.stroke();
      context.fillStyle = "#ddd6fe";
      context.textAlign = "center";
      context.font = simulationCanvasFont("11px", 500);
      context.fillText(`${markLabel} · t = ${elapsedRef.current.toFixed(2)} s`, 187.5, 166);
    }
    context.restore();
  }, [markLabel, size.height, size.width]);

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
    paramsRef.current = newtonRaceParams(params);
    elapsedRef.current = 0;
    visualTimeRef.current = 0;
    completedRef.current = false;
    drawRef.current();
  }, [params]);

  useEffect(() => {
    elapsedRef.current = 0;
    visualTimeRef.current = 0;
    completedRef.current = false;
    drawRef.current();
  }, [resetSignal]);

  useEffect(() => {
    if (!seekToken || seekSeconds === undefined) return;
    elapsedRef.current = Math.max(0, seekSeconds);
    visualTimeRef.current = elapsedRef.current;
    completedRef.current = false;
    drawRef.current();
  }, [seekSeconds, seekToken]);

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
      const motionScale = reducedMotionRef.current ? Math.min(0.6, speed) : speed;
      elapsedRef.current += delta * motionScale;
      visualTimeRef.current += delta * motionScale;
      drawScene();

      const currentParams = paramsRef.current;
      const metrics = raceMetrics(currentParams);
      const topDone = elapsedRef.current >= metrics.top.finishTime;
      const bottomDone = elapsedRef.current >= metrics.bottom.finishTime;
      const topComplete = topDone || !Number.isFinite(metrics.top.finishTime);
      const bottomComplete = bottomDone || !Number.isFinite(metrics.bottom.finishTime);
      if (topComplete && bottomComplete) {
        if (!completedRef.current) {
          completedRef.current = true;
          callbackRef.current(false);
        }
        return;
      }
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
        aria-label="Mô phỏng hai người đẩy hai xe hàng có khối lượng và lực đẩy khác nhau đến vạch đích để minh họa định luật II Newton"
      />
    </div>
  );
}
