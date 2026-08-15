"use client";

import { simulationCanvasFont } from "@/components/simulations/shared/typography";

import { useCallback, useEffect, useRef } from "react";
import { useContainerSize } from "../shared/use-container-size";
import { collisionOutcome, collisionParams, simulateCollisionTrack } from "./collision-physics";

const VIEW_WIDTH = 1200;
const VIEW_HEIGHT = 720;
const TRACK_Y = 465;
const CART_WIDTH = 86;
const CART_HEIGHT = 30;
const COLLISION_DURATION = 0.18;
const WALL_FORCE_DURATION = 1.1;
const PIXELS_PER_METER = 52;
const LEFT_WALL_FACE = 110;
const RIGHT_WALL_FACE = 1090;
const START_X_A = 300;
const START_X_B = 900;

type Props = {
  params: Record<string, number>;
  running: boolean;
  speed: number;
  resetSignal: number;
  onRunningChange: (running: boolean) => void;
  seekSeconds?: number;
  seekToken?: number;
  markLabel?: string;
  appearance?: "dark" | "light";
  autoReplay?: boolean;
  minimal?: boolean;
};

type State = {
  time: number;
  mA: number;
  mB: number;
  uA: number;
  uB: number;
  vA: number;
  vB: number;
  force: number;
  accelerationA: number;
  accelerationB: number;
  impulse: number;
  collisionTime: number;
  contactForce: number;
  xA: number;
  xB: number;
  velocityA: number;
  velocityB: number;
  forceAlpha: number;
  wallAlphaA: number;
  wallAlphaB: number;
  wallHitA: boolean;
  wallHitB: boolean;
  wallImpactXA: number;
  wallImpactXB: number;
  settled: boolean;
  cartCollisionCount: number;
  phase: "balance" | "interaction" | "separation";
};

function roundedRect(context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  context.beginPath();
  context.roundRect(x, y, width, height, radius);
}

function drawArrow(context: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, color: string, width = 5) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.hypot(dx, dy);
  if (length < 2) return;
  const ux = dx / length;
  const uy = dy / length;
  const nx = -uy;
  const ny = ux;
  const headLength = Math.min(18, Math.max(11, length * 0.2));
  const headHalf = Math.min(9, Math.max(6, width * 1.5));
  const bx = x2 - ux * headLength;
  const by = y2 - uy * headLength;
  context.save();
  context.strokeStyle = color;
  context.fillStyle = color;
  context.lineWidth = width;
  context.lineCap = "round";
  context.lineJoin = "round";
  context.beginPath();
  context.moveTo(x1, y1);
  context.lineTo(bx + ux, by + uy);
  context.stroke();
  context.beginPath();
  context.moveTo(x2, y2);
  context.lineTo(bx + nx * headHalf, by + ny * headHalf);
  context.lineTo(bx - nx * headHalf, by - ny * headHalf);
  context.closePath();
  context.fill();
  context.restore();
}

function paramsOf(values: Record<string, number>) {
  return collisionParams(values);
}

export function stateAt(values: Record<string, number>, time: number): State {
  const params = paramsOf(values);
  const outcome = collisionOutcome(params);
  const contactX = VIEW_WIDTH / 2;
  const halfGap = CART_WIDTH / 2;
  const initialA = START_X_A;
  const initialB = START_X_B;
  const approachDistance = (initialB - initialA - CART_WIDTH) / PIXELS_PER_METER;
  const estimatedCollisionTime = approachDistance / (outcome.uA - outcome.uB);
  const simulation = simulateCollisionTrack({
    ...params,
    time,
    initialXA: initialA,
    initialXB: initialB,
    minCenter: LEFT_WALL_FACE + halfGap,
    maxCenter: RIGHT_WALL_FACE - halfGap,
    cartWidth: CART_WIDTH,
    pixelsPerMeter: PIXELS_PER_METER,
  });
  const collisionTime = simulation.firstCartImpactTime ?? estimatedCollisionTime;
  const impactEnvelope = (age: number, duration: number) => {
    if (age < 0 || age > duration) return 0;
    const riseDuration = Math.min(COLLISION_DURATION, duration * 0.35);
    return age <= riseDuration
      ? 0.2 + 0.8 * Math.sin((Math.PI / 2) * (age / riseDuration))
      : Math.pow(Math.max(0, 1 - (age - riseDuration) / (duration - riseDuration)), 2);
  };
  const cartImpactAge = simulation.lastCartImpactTime === null ? Number.POSITIVE_INFINITY : time - simulation.lastCartImpactTime;
  const wallImpactAgeA = simulation.lastWallImpactTimeA === null ? Number.POSITIVE_INFINITY : time - simulation.lastWallImpactTimeA;
  const wallImpactAgeB = simulation.lastWallImpactTimeB === null ? Number.POSITIVE_INFINITY : time - simulation.lastWallImpactTimeB;
  const forceAlpha = impactEnvelope(cartImpactAge, COLLISION_DURATION + 0.65);
  const wallAlphaA = impactEnvelope(wallImpactAgeA, WALL_FORCE_DURATION);
  const wallAlphaB = impactEnvelope(wallImpactAgeB, WALL_FORCE_DURATION);
  const contactForce = simulation.lastCartImpulse / COLLISION_DURATION * forceAlpha;
  const wallForceA = simulation.lastWallImpulseA / COLLISION_DURATION * wallAlphaA;
  const wallForceB = simulation.lastWallImpulseB / COLLISION_DURATION * wallAlphaB;
  const cartAccelerationA = Math.sign(simulation.lastCartDeltaVelocityA) * contactForce / params.mA;
  const cartAccelerationB = Math.sign(simulation.lastCartDeltaVelocityB) * contactForce / params.mB;
  const wallAccelerationA = Math.sign(simulation.lastWallDeltaVelocityA) * wallForceA / params.mA;
  const wallAccelerationB = Math.sign(simulation.lastWallDeltaVelocityB) * wallForceB / params.mB;
  const accelerationA = wallAlphaA > 0 ? wallAccelerationA : forceAlpha > 0 ? cartAccelerationA : simulation.accelerationA;
  const accelerationB = wallAlphaB > 0 ? wallAccelerationB : forceAlpha > 0 ? cartAccelerationB : simulation.accelerationB;
  const phase: State["phase"] = simulation.cartCollisionCount === 0
    ? "balance"
    : forceAlpha > 0
      ? "interaction"
      : "separation";
  return {
    time,
    mA: params.mA,
    mB: params.mB,
    uA: outcome.uA,
    uB: outcome.uB,
    vA: outcome.vA,
    vB: outcome.vB,
    force: Math.max(contactForce, wallForceA, wallForceB),
    accelerationA,
    accelerationB,
    impulse: outcome.impulse,
    collisionTime,
    contactForce,
    xA: simulation.xA,
    xB: simulation.xB,
    velocityA: simulation.velocityA * PIXELS_PER_METER,
    velocityB: simulation.velocityB * PIXELS_PER_METER,
    forceAlpha,
    wallAlphaA,
    wallAlphaB,
    wallHitA: simulation.wallHitA,
    wallHitB: simulation.wallHitB,
    wallImpactXA: simulation.lastWallPositionA !== null && simulation.lastWallPositionA < contactX ? LEFT_WALL_FACE : RIGHT_WALL_FACE,
    wallImpactXB: simulation.lastWallPositionB !== null && simulation.lastWallPositionB < contactX ? LEFT_WALL_FACE : RIGHT_WALL_FACE,
    settled: simulation.settled,
    cartCollisionCount: simulation.cartCollisionCount,
    phase,
  };
}

function drawBackground(context: CanvasRenderingContext2D, light: boolean) {
  context.fillStyle = light ? "#f7fbf8" : "#0f172a";
  context.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
  context.strokeStyle = light ? "#cddedb" : "#263449";
  context.globalAlpha = light ? 0.55 : 0.42;
  context.lineWidth = 1;
  for (let x = 0; x <= VIEW_WIDTH; x += 48) {
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x, VIEW_HEIGHT);
    context.stroke();
  }
  for (let y = 0; y <= VIEW_HEIGHT; y += 44) {
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(VIEW_WIDTH, y);
    context.stroke();
  }
  context.globalAlpha = 1;
}

function drawTrack(context: CanvasRenderingContext2D, light: boolean) {
  roundedRect(context, 48, TRACK_Y - 44, VIEW_WIDTH - 96, 92, 22);
  context.fillStyle = light ? "#eef4f1" : "#0b1220";
  context.fill();
  context.strokeStyle = light ? "#b9cbc8" : "#334155";
  context.lineWidth = 1.5;
  context.stroke();
  context.strokeStyle = light ? "#789092" : "#475569";
  context.lineWidth = 3;
  context.beginPath();
  context.moveTo(72, TRACK_Y + 22);
  context.lineTo(VIEW_WIDTH - 72, TRACK_Y + 22);
  context.stroke();
  for (const wall of [
    { x: LEFT_WALL_FACE - 36, faceX: LEFT_WALL_FACE },
    { x: RIGHT_WALL_FACE, faceX: RIGHT_WALL_FACE },
  ]) {
    roundedRect(context, wall.x, TRACK_Y - 138, 36, 162, 5);
    context.fillStyle = light ? "#dce6e3" : "#334155";
    context.fill();
    context.strokeStyle = light ? "#71878a" : "#cbd5e1";
    context.lineWidth = 2.5;
    context.stroke();
    context.strokeStyle = light ? "#a7b7b6" : "#64748b";
    context.lineWidth = 4;
    for (let y = TRACK_Y - 122; y < TRACK_Y + 8; y += 24) {
      context.beginPath();
      context.moveTo(wall.x + 6, y);
      context.lineTo(wall.x + 30, y + 14);
      context.stroke();
    }
    context.strokeStyle = light ? "#526a6e" : "#f8fafc";
    context.lineWidth = 3;
    context.beginPath();
    context.moveTo(wall.faceX, TRACK_Y - 132);
    context.lineTo(wall.faceX, TRACK_Y + 18);
    context.stroke();
  }
}

function drawCart(context: CanvasRenderingContext2D, x: number, color: string, label: string, mass: number, velocity: number, light: boolean) {
  const left = x - CART_WIDTH / 2;
  const top = TRACK_Y - CART_HEIGHT - 4;
  const blockSize = Math.min(52, 26 + Math.sqrt(Math.min(mass, 8) / 8) * 26);
  const blockX = x - blockSize / 2;
  const blockY = top - blockSize + 4;
  context.save();
  roundedRect(context, blockX, blockY, blockSize, blockSize, 7);
  context.fillStyle = light ? "#ffffff" : "#475569";
  context.fill();
  context.strokeStyle = light ? "#8ea2a3" : "#cbd5e1";
  context.lineWidth = 3;
  context.stroke();
  context.fillStyle = light ? "#173746" : "#f8fafc";
  context.font = simulationCanvasFont("11px", 500);
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(`${mass.toFixed(1)} kg`, x, blockY + blockSize / 2);

  roundedRect(context, left, top, CART_WIDTH, CART_HEIGHT, 8);
  context.fillStyle = color;
  context.fill();
  context.strokeStyle = light ? "#ffffff" : "#f8fafc";
  context.lineWidth = 2.5;
  context.stroke();
  context.fillStyle = light ? "#0b2c3b" : "#0f172a";
  context.font = simulationCanvasFont("14px", 700);
  context.fillText(label, x, top + CART_HEIGHT / 2 + 1);
  for (const wheelX of [left + 18, left + CART_WIDTH - 18]) {
    context.fillStyle = light ? "#173746" : "#020617";
    context.beginPath();
    context.arc(wheelX, TRACK_Y + 1, 11, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = light ? "#d8e4e1" : "#94a3b8";
    context.lineWidth = 3;
    context.stroke();
    context.fillStyle = color;
    context.beginPath();
    context.arc(wheelX, TRACK_Y + 1, 3, 0, Math.PI * 2);
    context.fill();
  }
  if (Math.abs(velocity) > 2) {
    drawArrow(context, x, TRACK_Y + 42, x + Math.sign(velocity) * Math.min(72, Math.abs(velocity) * 0.7), TRACK_Y + 42, color, 3);
  }
  context.restore();
}

function drawInteraction(context: CanvasRenderingContext2D, state: State, light: boolean) {
  const leftEdge = state.xA + CART_WIDTH / 2;
  const rightEdge = state.xB - CART_WIDTH / 2;
  const contact = (leftEdge + rightEdge) / 2;
  const alpha = state.forceAlpha;
  context.save();
  context.globalAlpha = alpha;
  context.fillStyle = light ? "#fff7e9" : "#f8fafc";
  context.beginPath();
  context.arc(contact, TRACK_Y - 18, 8 + alpha * 5, 0, Math.PI * 2);
  context.fill();
  context.strokeStyle = "#fbbf24";
  context.lineWidth = 3;
  for (let i = 0; i < 6; i += 1) {
    const angle = (Math.PI * 2 * i) / 6;
    context.beginPath();
    context.moveTo(contact + Math.cos(angle) * 13, TRACK_Y - 18 + Math.sin(angle) * 13);
    context.lineTo(contact + Math.cos(angle) * 24, TRACK_Y - 18 + Math.sin(angle) * 24);
    context.stroke();
  }

  const arrowLength = Math.min(132, 32 + state.contactForce * 0.18);
  drawArrow(context, contact - 6, TRACK_Y - 112, contact - arrowLength, TRACK_Y - 112, `rgba(56,189,248,${alpha})`, 5);
  drawArrow(context, contact + 6, TRACK_Y - 112, contact + arrowLength, TRACK_Y - 112, `rgba(251,146,60,${alpha})`, 5);
  context.fillStyle = light ? `rgba(24,104,143,${alpha})` : `rgba(186,230,253,${alpha})`;
  context.font = simulationCanvasFont("13px", 500);
  context.textAlign = "right";
  context.fillText("F_B→A", contact - 20, TRACK_Y - 130);
  context.fillStyle = light ? `rgba(174,72,33,${alpha})` : `rgba(254,215,170,${alpha})`;
  context.textAlign = "left";
  context.fillText("F_A→B", contact + 20, TRACK_Y - 130);
  context.restore();
}

function drawWallImpact(
  context: CanvasRenderingContext2D,
  wallX: number,
  alpha: number,
  cartLabel: "A" | "B",
  cartColor: string,
  light: boolean,
) {
  if (alpha <= 0) return;
  const y = TRACK_Y - 18;
  context.save();
  context.globalAlpha = alpha;
  context.fillStyle = light ? "#fff7e9" : "#f8fafc";
  context.beginPath();
  context.arc(wallX, y, 8 + alpha * 7, 0, Math.PI * 2);
  context.fill();
  context.strokeStyle = cartColor;
  context.lineWidth = 3;
  context.beginPath();
  context.arc(wallX, y, 21 + (1 - alpha) * 14, 0, Math.PI * 2);
  context.stroke();
  const inward = wallX < VIEW_WIDTH / 2 ? 1 : -1;
  drawArrow(context, wallX - inward * 5, y - 64, wallX - inward * 65, y - 64, light ? "#70878a" : "#94a3b8", 4);
  drawArrow(context, wallX + inward * 5, y - 64, wallX + inward * 65, y - 64, cartColor, 4);
  context.fillStyle = light ? "#173746" : "#f8fafc";
  context.font = simulationCanvasFont("10px", 500);
  context.textAlign = "center";
  context.fillText(`Va chạm tường · Xe ${cartLabel}`, wallX, y - 84);
  context.restore();
}

// Kept as a compatibility fallback for the previous renderer.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function drawHud(context: CanvasRenderingContext2D, state: State) {
  roundedRect(context, 50, 22, 680, 126, 18);
  context.fillStyle = "rgba(2,6,23,.82)";
  context.fill();
  context.strokeStyle = "rgba(148,163,184,.28)";
  context.lineWidth = 1.5;
  context.stroke();
  context.fillStyle = "#f8fafc";
  context.font = simulationCanvasFont("13px", 500);
  context.textAlign = "left";
  context.fillText("Định luật III Newton · Tác dụng và phản lực", 70, 49);
  context.fillStyle = "#94a3b8";
  context.font = simulationCanvasFont("11px", 500);
  context.fillText("|F_B→A| = |F_A→B|  ·  F_B→A = −F_A→B", 70, 72);
  context.fillStyle = state.phase === "balance" ? "#86efac" : state.phase === "interaction" ? "#fbbf24" : "#cbd5e1";
  context.font = simulationCanvasFont("12px", 500);
  context.fillText(state.phase === "balance" ? "Cân bằng ban đầu · Sẵn sàng tác động" : state.phase === "interaction" ? "Đang tác động · Hai lực đối" : "Sau tương tác · Hai xe tách ra", 70, 101);
  context.fillStyle = "#64748b";
  context.font = simulationCanvasFont("10px", 500);
  context.fillText(`F = ${state.force.toFixed(1)} N`, 70, 125);
  context.fillText(`a_A = ${state.accelerationA.toFixed(2)} m/s²`, 180, 125);
  context.fillText(`a_B = ${state.accelerationB.toFixed(2)} m/s²`, 330, 125);
  context.fillStyle = "#e2e8f0";
  context.textAlign = "right";
  context.font = simulationCanvasFont("11px", 500);
  context.fillText("Cặp lực tác dụng lên hai vật khác nhau", 710, 125);
}

function drawCollisionHud(context: CanvasRenderingContext2D, state: State, light: boolean) {
  const wallImpactVisible = state.wallAlphaA > 0 || state.wallAlphaB > 0;
  const returnedFromWall = state.wallHitA || state.wallHitB;
  roundedRect(context, 50, 22, 680, 170, 18);
  context.fillStyle = light ? "rgba(255,255,255,.94)" : "rgba(2,6,23,.88)";
  context.fill();
  context.strokeStyle = light ? "rgba(87,116,119,.25)" : "rgba(148,163,184,.28)";
  context.lineWidth = 1.5;
  context.stroke();
  context.fillStyle = light ? "#123342" : "#f8fafc";
  context.font = simulationCanvasFont("15px", 700);
  context.textAlign = "left";
  context.textBaseline = "alphabetic";
  context.fillText("Định luật III Newton · Va chạm hai vật", 70, 49);
  context.fillStyle = light ? "#647b80" : "#94a3b8";
  context.font = simulationCanvasFont("12px", 500);
  context.fillText("F_B→A = −F_A→B  ·  hai lực chỉ xuất hiện khi tiếp xúc", 70, 73);
  const statusColor = state.settled ? (light ? "#348a5b" : "#86efac") : state.phase === "interaction" || wallImpactVisible ? (light ? "#b86432" : "#fbbf24") : (light ? "#60777c" : "#cbd5e1");
  context.fillStyle = statusColor;
  context.font = simulationCanvasFont("12px", 500);
  context.fillText(
    state.settled
      ? "Kết thúc · Hai xe đã đứng yên"
      : wallImpactVisible
      ? "Đang va chạm tường · Lực và phản lực"
      : state.phase === "interaction"
        ? state.cartCollisionCount > 1
          ? `Va chạm lặp lại lần ${state.cartCollisionCount} · Lực và phản lực`
          : "Đang va chạm · Lực và phản lực"
      : returnedFromWall
        ? "Sau va chạm tường · Hai xe tiếp tục chuyển động"
      : state.phase === "balance"
      ? "Trước va chạm · Hai vật đang tiến lại"
        : "Sau va chạm · Hai vật bật ra",
    70,
    101,
  );

  const metricCards = [
    { x: 65, color: light ? "#278aa8" : "#38bdf8", tint: light ? "rgba(39,138,168,.10)" : "rgba(14,165,233,.12)", label: "Xe A", velocity: state.velocityA / PIXELS_PER_METER, acceleration: state.accelerationA },
    { x: 400, color: light ? "#d96637" : "#fb923c", tint: light ? "rgba(217,102,55,.10)" : "rgba(249,115,22,.12)", label: "Xe B", velocity: state.velocityB / PIXELS_PER_METER, acceleration: state.accelerationB },
  ];
  for (const card of metricCards) {
    roundedRect(context, card.x, 113, 315, 48, 10);
    context.fillStyle = card.tint;
    context.fill();
    context.strokeStyle = card.color;
    context.globalAlpha = 0.65;
    context.lineWidth = 1.5;
    context.stroke();
    context.globalAlpha = 1;
    context.fillStyle = card.color;
    context.font = simulationCanvasFont("11px", 500);
    context.textAlign = "left";
    context.fillText(card.label, card.x + 13, 133);
    context.fillStyle = light ? "#173746" : "#f8fafc";
    context.font = simulationCanvasFont("12px", 500);
    context.fillText(`v  ${directionValue(card.velocity, "m/s")}`, card.x + 13, 151);
    context.fillText(`a  ${directionValue(card.acceleration, "m/s²")}`, card.x + 172, 151);
  }
}

function directionValue(value: number, unit: string) {
  if (Math.abs(value) < 0.005) return `0.00 ${unit}`;
  return `${Math.abs(value).toFixed(2)} ${unit} ${value < 0 ? "←" : "→"}`;
}

export function NewtonThirdLawScene({ params, running, speed, resetSignal, onRunningChange, seekSeconds, seekToken, markLabel, appearance = "dark", autoReplay = false, minimal = false }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const elapsedRef = useRef(0);
  const replayAtRef = useRef<number | null>(null);
  const paramsRef = useRef(params);
  const callbackRef = useRef(onRunningChange);
  const drawRef = useRef<() => void>(() => undefined);
  const { ref: containerRef, size } = useContainerSize<HTMLDivElement>();

  useEffect(() => { callbackRef.current = onRunningChange; }, [onRunningChange]);
  useEffect(() => { paramsRef.current = params; elapsedRef.current = 0; replayAtRef.current = null; drawRef.current(); }, [params]);
  useEffect(() => { elapsedRef.current = 0; replayAtRef.current = null; drawRef.current(); }, [resetSignal]);
  useEffect(() => {
    if (seekToken === undefined || seekSeconds === undefined) return;
    elapsedRef.current = Math.max(0, seekSeconds);
    drawRef.current();
  }, [seekSeconds, seekToken]);

  const drawScene = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || size.width <= 0 || size.height <= 0) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    const virtualTop = minimal ? 225 : 0;
    const virtualHeight = minimal ? 420 : VIEW_HEIGHT;
    const scale = Math.min(size.width / VIEW_WIDTH, size.height / virtualHeight);
    const offsetX = (size.width - VIEW_WIDTH * scale) / 2;
    const offsetY = (size.height - virtualHeight * scale) / 2 - virtualTop * scale;
    const state = stateAt(paramsRef.current, elapsedRef.current);
    const light = appearance === "light";
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.save();
    context.scale(canvas.width / size.width, canvas.height / size.height);
    context.translate(offsetX, offsetY);
    context.scale(scale, scale);
    drawBackground(context, light);
    drawTrack(context, light);
    if (!minimal) drawCollisionHud(context, state, light);
    drawInteraction(context, state, light);
    drawCart(context, state.xA, light ? "#55bdd0" : "#38bdf8", "A", state.mA, state.velocityA, light);
    drawCart(context, state.xB, light ? "#ed7546" : "#fb923c", "B", state.mB, state.velocityB, light);
    drawWallImpact(context, state.wallImpactXA, state.wallAlphaA, "A", light ? "#55bdd0" : "#38bdf8", light);
    drawWallImpact(context, state.wallImpactXB, state.wallAlphaB, "B", light ? "#ed7546" : "#fb923c", light);
    if (markLabel) {
      roundedRect(context, 50, 190, 250, 34, 10);
      context.fillStyle = light ? "rgba(255,255,255,.94)" : "rgba(2,6,23,.88)";
      context.fill();
      context.fillStyle = light ? "#5c4d88" : "#ddd6fe";
      context.font = simulationCanvasFont("11px", 500);
      context.textAlign = "center";
      context.fillText(markLabel, 175, 212);
    }
    context.restore();
  }, [appearance, markLabel, minimal, size.height, size.width]);

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
    if (!running || size.width <= 0 || size.height <= 0) {
      drawScene();
      return;
    }
    let frame = 0;
    let previous: number | null = null;
    const animate = (now: number) => {
      const last = previous ?? now;
      previous = now;
      elapsedRef.current += Math.min(0.05, Math.max(0, (now - last) / 1000)) * speed;
      drawScene();
      const state = stateAt(paramsRef.current, elapsedRef.current);
      if (state.settled) {
        if (!autoReplay) {
          callbackRef.current(false);
          return;
        }
        replayAtRef.current ??= now + 800;
        if (now >= replayAtRef.current) {
          elapsedRef.current = 0;
          previous = now;
          replayAtRef.current = null;
        }
      } else {
        replayAtRef.current = null;
      }
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [autoReplay, drawScene, running, size.height, size.width, speed]);

  return (
    <div ref={containerRef} className={`relative h-full min-h-[360px] w-full overflow-hidden ${appearance === "light" ? "bg-[#f7fbf8]" : "bg-[#0f172a]"}`}>
      <canvas ref={canvasRef} className="absolute inset-0 block h-full w-full" role="img" aria-label="Mô phỏng Định luật III Newton: cặp lực tác dụng và phản lực" />
    </div>
  );
}
