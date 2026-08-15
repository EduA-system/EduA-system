"use client";

import { simulationCanvasFont } from "@/components/simulations/shared/typography";

import { memo, useEffect, useRef } from "react";
import {
  initialVariableCurrentState,
  peakCircuitCurrent,
  stepVariableCurrentInduction,
} from "../../engines/electromagnetic-induction/physics";
import type {
  VariableCurrentInductionScene,
  VariableCurrentInductionState,
} from "../../engines/electromagnetic-induction/types";
import { useContainerSize } from "../../shared/use-container-size";

type Props = {
  scene: VariableCurrentInductionScene;
  running: boolean;
  resetSignal: number;
  onRunningChange: (running: boolean) => void;
  speed?: number;
};

const DESIGN_WIDTH = 1100;
const DESIGN_HEIGHT = 650;
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

function drawPanel(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  const gradient = context.createLinearGradient(x, y, x, y + height);
  gradient.addColorStop(0, "#10233c");
  gradient.addColorStop(1, "#0b1a2f");
  context.fillStyle = gradient;
  context.strokeStyle = "#29415f";
  context.lineWidth = 2;
  roundedRect(context, x, y, width, height, 18);
  context.fill();
  context.stroke();
}

function drawMeter(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  label: string,
  normalizedValue: number,
  reading: string,
  accent: string,
) {
  const shell = context.createRadialGradient(x - radius * 0.35, y - radius * 0.4, 3, x, y, radius);
  shell.addColorStop(0, "#f8fafc");
  shell.addColorStop(0.72, "#dbe4ee");
  shell.addColorStop(1, "#94a3b8");
  context.fillStyle = shell;
  context.strokeStyle = "#f8fafc";
  context.lineWidth = 3;
  context.beginPath();
  context.arc(x, y, radius, 0, TAU);
  context.fill();
  context.stroke();

  context.strokeStyle = "#64748b";
  context.lineWidth = 1.4;
  for (let index = 0; index <= 10; index += 1) {
    const angle = Math.PI * 0.72 + (index / 10) * Math.PI * 1.56;
    context.beginPath();
    context.moveTo(x + Math.cos(angle) * (radius - 13), y + Math.sin(angle) * (radius - 13));
    context.lineTo(x + Math.cos(angle) * (radius - 7), y + Math.sin(angle) * (radius - 7));
    context.stroke();
  }

  const needleAngle = -Math.PI / 2 + Math.max(-1, Math.min(1, normalizedValue)) * Math.PI * 0.58;
  context.strokeStyle = accent;
  context.lineWidth = 3;
  context.lineCap = "round";
  context.beginPath();
  context.moveTo(x, y + 4);
  context.lineTo(x + Math.cos(needleAngle) * (radius - 12), y + Math.sin(needleAngle) * (radius - 12));
  context.stroke();
  context.fillStyle = "#0f172a";
  context.beginPath();
  context.arc(x, y + 4, 5, 0, TAU);
  context.fill();

  context.textAlign = "center";
  context.fillStyle = "#0f172a";
  context.font = simulationCanvasFont("16px", 700);
  context.fillText(label, x, y - 2);
  context.font = simulationCanvasFont("10px", 500);
  context.fillStyle = "#334155";
  context.fillText(reading, x, y + 19);
}

type GraphOptions = {
  x: number;
  y: number;
  width: number;
  height: number;
  duration: number;
  axisAmplitude: number;
  unit: string;
  symbol: string;
  color: string;
  history: TracePoint[];
  currentTime: number;
  value: "voltage" | "current";
  valueScale?: number;
};

type TracePoint = {
  time: number;
  voltage: number;
  current: number;
};

function drawGraph(context: CanvasRenderingContext2D, options: GraphOptions) {
  const {
    x,
    y,
    width,
    height,
    duration,
    axisAmplitude,
    unit,
    symbol,
    color,
    history,
    currentTime,
    value,
    valueScale = 1,
  } = options;
  drawPanel(context, x, y, width, height);

  const left = x + 48;
  const right = x + width - 18;
  const top = y + 35;
  const bottom = y + height - 35;
  const middle = (top + bottom) / 2;
  const plotHeight = bottom - top;

  context.save();
  context.strokeStyle = "rgba(56,189,248,.22)";
  context.lineWidth = 1;
  for (let column = 0; column <= 12; column += 1) {
    const gx = left + (column / 12) * (right - left);
    context.beginPath();
    context.moveTo(gx, top);
    context.lineTo(gx, bottom);
    context.stroke();
  }
  for (let row = 0; row <= 8; row += 1) {
    const gy = top + (row / 8) * plotHeight;
    context.beginPath();
    context.moveTo(left, gy);
    context.lineTo(right, gy);
    context.stroke();
  }

  context.strokeStyle = "#64748b";
  context.lineWidth = 1.5;
  context.beginPath();
  context.moveTo(left, top);
  context.lineTo(left, bottom);
  context.moveTo(left, middle);
  context.lineTo(right, middle);
  context.stroke();

  context.fillStyle = "#cbd5e1";
  context.font = simulationCanvasFont("11px", 500);
  context.textAlign = "left";
  context.fillText(`${symbol} (${unit})`, left - 1, y + 21);
  context.textAlign = "right";
  context.fillText("t (s)", right, y + height - 11);
  context.font = simulationCanvasFont("9px", 500);
  context.fillStyle = "#8fa5bf";
  context.textAlign = "right";
  context.fillText(axisAmplitude.toFixed(axisAmplitude >= 10 ? 0 : 1), left - 6, top + 4);
  context.fillText("0", left - 6, middle + 3);
  context.fillText(`−${axisAmplitude.toFixed(axisAmplitude >= 10 ? 0 : 1)}`, left - 6, bottom + 3);
  context.textAlign = "center";
  for (let tick = 0; tick <= 6; tick += 1) {
    const displayedTime = duration * tick / 6;
    context.fillText(
      displayedTime.toFixed(1),
      left + (tick / 6) * (right - left),
      bottom + 16,
    );
  }

  const visible = history.filter((point) => point.time >= currentTime - duration - 0.01);
  if (visible.length > 0) {
    context.save();
    context.beginPath();
    context.rect(left, top, right - left, bottom - top);
    context.clip();
    context.strokeStyle = color;
    context.lineWidth = 2.7;
    context.lineJoin = "round";
    context.lineCap = "round";
    context.shadowColor = color;
    context.shadowBlur = 8;
    context.beginPath();
    visible.forEach((point, index) => {
      const age = currentTime - point.time;
      const px = right - (age / duration) * (right - left);
      const rawValue = point[value] * valueScale;
      const normalized = Math.max(-1.1, Math.min(1.1, rawValue / axisAmplitude));
      const py = middle - normalized * plotHeight * 0.44;
      if (index === 0) context.moveTo(px, py);
      else context.lineTo(px, py);
    });
    context.stroke();
    context.shadowBlur = 0;

    const latest = visible[visible.length - 1]!;
    const latestValue = latest[value] * valueScale;
    const latestY = middle
      - Math.max(-1.1, Math.min(1.1, latestValue / axisAmplitude)) * plotHeight * 0.44;
    context.fillStyle = color;
    context.beginPath();
    context.arc(right, latestY, 4.5, 0, TAU);
    context.fill();
    context.restore();
  }

  context.fillStyle = "#8fa5bf";
  context.font = simulationCanvasFont("9px", 500);
  context.textAlign = "right";
  context.fillText(`cửa sổ ${duration.toFixed(1)} s`, right - 4, top + 12);
  context.restore();
}

function drawCircuit(
  context: CanvasRenderingContext2D,
  scene: VariableCurrentInductionScene,
  state: VariableCurrentInductionState,
  switchClosed: boolean,
  running: boolean,
) {
  drawPanel(context, 30, 28, 500, 594);
  context.fillStyle = "#e2e8f0";
  context.font = simulationCanvasFont("16px", 700);
  context.textAlign = "left";
  context.fillText("MẠCH ĐIỆN XOAY CHIỀU", 55, 60);
  context.fillStyle = "#8fa5bf";
  context.font = simulationCanvasFont("11px", 500);
  context.fillText("Bấm khoá K; điều chỉnh Rₓ ở bảng Tham số", 55, 81);

  const activeLevel = switchClosed ? 0.55 + Math.abs(Math.sin(TAU * state.phase)) * 0.45 : 0;
  const wireColor = switchClosed ? `rgba(56,189,248,${activeLevel})` : "#52647b";
  context.strokeStyle = wireColor;
  context.lineWidth = 4;
  context.lineCap = "round";
  context.lineJoin = "round";
  context.beginPath();
  context.moveTo(90, 258);
  context.lineTo(90, 160);
  context.lineTo(178, 160);
  context.moveTo(250, 160);
  context.lineTo(465, 160);
  context.lineTo(465, 430);
  context.lineTo(90, 430);
  context.lineTo(90, 332);
  context.moveTo(310, 160);
  context.lineTo(310, 218);
  context.moveTo(310, 312);
  context.lineTo(310, 334);
  context.moveTo(310, 396);
  context.lineTo(310, 430);
  context.moveTo(418, 160);
  context.lineTo(418, 238);
  context.moveTo(418, 302);
  context.lineTo(418, 430);
  context.stroke();

  // Nguồn xoay chiều.
  context.fillStyle = "#d9f99d";
  context.strokeStyle = "#f8fafc";
  context.lineWidth = 2.5;
  context.beginPath();
  context.arc(90, 295, 36, 0, TAU);
  context.fill();
  context.stroke();
  context.strokeStyle = "#166534";
  context.lineWidth = 2;
  context.beginPath();
  for (let index = 0; index <= 40; index += 1) {
    const px = 70 + index;
    const py = 295 - Math.sin((index / 40) * TAU) * 8;
    if (index === 0) context.moveTo(px, py);
    else context.lineTo(px, py);
  }
  context.stroke();
  context.fillStyle = "#d9f99d";
  context.font = simulationCanvasFont("12px", 500);
  context.textAlign = "center";
  context.fillText(`${scene.frequency.toFixed(0)} Hz`, 90, 351);

  // Khoá K.
  context.fillStyle = "#dbe7f3";
  context.beginPath();
  context.arc(178, 160, 6, 0, TAU);
  context.arc(250, 160, 6, 0, TAU);
  context.fill();
  context.strokeStyle = "#f59e0b";
  context.lineWidth = 6;
  context.beginPath();
  context.moveTo(178, 160);
  context.lineTo(switchClosed ? 250 : 236, switchClosed ? 160 : 130);
  context.stroke();
  context.fillStyle = switchClosed ? "#6ee7b7" : "#fda4af";
  context.font = simulationCanvasFont("12px", 500);
  context.fillText(switchClosed ? "K đóng" : "K mở", 214, 116);

  // Biến trở X trên nhánh chính.
  const resistorGradient = context.createLinearGradient(280, 218, 340, 312);
  resistorGradient.addColorStop(0, "#e2e8f0");
  resistorGradient.addColorStop(1, "#94a3b8");
  context.fillStyle = resistorGradient;
  context.strokeStyle = "#f8fafc";
  context.lineWidth = 2;
  roundedRect(context, 282, 218, 56, 94, 8);
  context.fill();
  context.stroke();
  context.strokeStyle = "#475569";
  context.lineWidth = 2.3;
  context.beginPath();
  context.moveTo(310, 228);
  for (let index = 0; index < 7; index += 1) {
    context.lineTo(index % 2 === 0 ? 298 : 322, 238 + index * 10);
  }
  context.lineTo(310, 302);
  context.stroke();
  const resistanceRatio = Math.max(0, Math.min(1, (scene.resistance - 100) / 200));
  const sliderY = 230 + resistanceRatio * 66;
  context.strokeStyle = "#f97316";
  context.lineWidth = 3;
  context.beginPath();
  context.moveTo(350, sliderY - 12);
  context.lineTo(318, sliderY);
  context.stroke();
  context.fillStyle = "#fb923c";
  context.beginPath();
  context.arc(352, sliderY - 13, 5, 0, TAU);
  context.fill();
  context.fillStyle = "#e2e8f0";
  context.font = simulationCanvasFont("14px", 700);
  context.fillText("X", 310, 207);

  const peakCurrent = peakCircuitCurrent(scene, true);
  drawMeter(
    context,
    310,
    365,
    31,
    "A",
    peakCurrent > 0 ? state.current / peakCurrent : 0,
    `${(state.current * 1000).toFixed(1)} mA`,
    "#2563eb",
  );
  drawMeter(
    context,
    418,
    270,
    32,
    "V",
    scene.peakVoltage > 0 ? state.voltage / scene.peakVoltage : 0,
    `${state.voltage.toFixed(2)} V`,
    "#ef4444",
  );

  // Hạt tải điện dao động qua lại trên dây dẫn.
  if (switchClosed) {
    const displacement = Math.sin(TAU * state.phase) * 15;
    context.fillStyle = running ? "#67e8f9" : "#94a3b8";
    context.shadowColor = "#22d3ee";
    context.shadowBlur = running ? 9 : 0;
    for (let index = 0; index < 6; index += 1) {
      const y = 180 + index * 38 + displacement;
      if (y > 180 && y < 420) {
        context.beginPath();
        context.arc(465, y, 3.2, 0, TAU);
        context.fill();
      }
    }
    context.shadowBlur = 0;
  }

  // Giá trị điện trở chỉ đọc tại đây; việc thay đổi nằm trong bảng Tham số chung.
  context.fillStyle = "rgba(15,35,60,.78)";
  context.strokeStyle = "#334a65";
  context.lineWidth = 1.5;
  roundedRect(context, 64, 482, 432, 78, 12);
  context.fill();
  context.stroke();
  context.fillStyle = "#8fa5bf";
  context.font = simulationCanvasFont("10px", 500);
  context.textAlign = "left";
  context.fillText("GIÁ TRỊ TỪ BẢNG THAM SỐ", 82, 504);
  context.fillStyle = "#fde68a";
  context.font = simulationCanvasFont("18px", 700);
  context.fillText(`Rₓ = ${scene.resistance.toFixed(0)} Ω`, 82, 535);
  context.fillStyle = "#7dd3fc";
  context.font = simulationCanvasFont("12px", 500);
  context.fillText(`I₀ = U₀/Rₓ = ${(peakCurrent * 1000).toFixed(1)} mA`, 270, 533);

  context.fillStyle = switchClosed ? "rgba(16,185,129,.16)" : "rgba(244,63,94,.14)";
  context.strokeStyle = switchClosed ? "#34d399" : "#fb7185";
  context.lineWidth = 1.5;
  roundedRect(context, 63, 580, 434, 28, 9);
  context.fill();
  context.stroke();
  context.fillStyle = switchClosed ? "#a7f3d0" : "#fecdd3";
  context.font = simulationCanvasFont("11px", 500);
  context.fillText(
    switchClosed
      ? `Mạch kín · u và i cùng pha · I₀ = ${(peakCurrent * 1000).toFixed(1)} mA`
      : "Mạch hở · i = 0 và hai đồ thị trở về trục thời gian",
    280,
    599,
  );
}

export const SceneKonvaVariableCurrentInduction = memo(
  function SceneKonvaVariableCurrentInduction({
    scene,
    running,
    resetSignal,
    onRunningChange,
    speed = 1,
  }: Props) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const runningRef = useRef(running);
    const speedRef = useRef(speed);
    const { ref, size } = useContainerSize<HTMLDivElement>();

    useEffect(() => {
      runningRef.current = running;
    }, [running]);
    useEffect(() => {
      speedRef.current = speed;
    }, [speed]);

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas || !size.width || !size.height) return;
      const context = canvas.getContext("2d");
      if (!context) return;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(size.width * dpr);
      canvas.height = Math.round(size.height * dpr);
      canvas.style.width = `${size.width}px`;
      canvas.style.height = `${size.height}px`;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);

      let switchClosed = true;
      let state = initialVariableCurrentState(scene);
      const history: TracePoint[] = [{ time: 0, voltage: 0, current: 0 }];
      let frameId = 0;
      let last = performance.now();
      let transform = { scale: 1, offsetX: 0, offsetY: 0 };

      const toDesignPoint = (event: PointerEvent) => {
        const bounds = canvas.getBoundingClientRect();
        return {
          x: (event.clientX - bounds.left - transform.offsetX) / transform.scale,
          y: (event.clientY - bounds.top - transform.offsetY) / transform.scale,
        };
      };

      const onPointerDown = (event: PointerEvent) => {
        const point = toDesignPoint(event);
        if (point.x >= 160 && point.x <= 265 && point.y >= 105 && point.y <= 185) {
          switchClosed = !switchClosed;
          runningRef.current = true;
          onRunningChange(true);
          canvas.style.cursor = "pointer";
        }
      };

      const onPointerMove = (event: PointerEvent) => {
        const point = toDesignPoint(event);
        const overSwitch = point.x >= 160 && point.x <= 265 && point.y >= 105 && point.y <= 185;
        canvas.style.cursor = overSwitch ? "pointer" : "default";
      };

      canvas.addEventListener("pointerdown", onPointerDown);
      canvas.addEventListener("pointermove", onPointerMove);

      const render = (now: number) => {
        const dt = Math.min((now - last) / 1000, 1 / 30)
          * speedRef.current
          * scene.visualTimeScale;
        last = now;
        if (runningRef.current) {
          state = stepVariableCurrentInduction(scene, state, switchClosed, dt);
          history.push({ time: state.elapsed, voltage: state.voltage, current: state.current });
          const oldestVisibleTime = state.elapsed - scene.graphDuration - 0.04;
          while (history.length > 2 && history[1]!.time < oldestVisibleTime) history.shift();
        } else if (!switchClosed && (state.voltage !== 0 || state.current !== 0)) {
          state = { ...state, voltage: 0, current: 0 };
        }

        const scale = Math.min(size.width / DESIGN_WIDTH, size.height / DESIGN_HEIGHT);
        const offsetX = (size.width - DESIGN_WIDTH * scale) / 2;
        const offsetY = (size.height - DESIGN_HEIGHT * scale) / 2;
        transform = { scale, offsetX, offsetY };

        context.setTransform(dpr, 0, 0, dpr, 0, 0);
        context.clearRect(0, 0, size.width, size.height);
        context.fillStyle = "#081526";
        context.fillRect(0, 0, size.width, size.height);
        context.save();
        context.translate(offsetX, offsetY);
        context.scale(scale, scale);

        drawCircuit(context, scene, state, switchClosed, runningRef.current);
        drawGraph(context, {
          x: 552,
          y: 28,
          width: 518,
          height: 282,
          duration: scene.graphDuration,
          axisAmplitude: 10,
          unit: "V",
          symbol: "u",
          color: "#fb7185",
          history,
          currentTime: state.elapsed,
          value: "voltage",
        });
        drawGraph(context, {
          x: 552,
          y: 340,
          width: 518,
          height: 282,
          duration: scene.graphDuration,
          axisAmplitude: 100,
          unit: "mA",
          symbol: "i",
          color: "#38bdf8",
          history,
          currentTime: state.elapsed,
          value: "current",
          valueScale: 1000,
        });

        context.strokeStyle = "rgba(148,163,184,.38)";
        context.lineWidth = 1.4;
        context.setLineDash([5, 6]);
        context.beginPath();
        context.moveTo(450, 270);
        context.lineTo(552, 170);
        context.moveTo(342, 365);
        context.lineTo(552, 480);
        context.stroke();
        context.setLineDash([]);
        context.restore();

        frameId = requestAnimationFrame(render);
      };

      frameId = requestAnimationFrame(render);
      return () => {
        cancelAnimationFrame(frameId);
        canvas.removeEventListener("pointerdown", onPointerDown);
        canvas.removeEventListener("pointermove", onPointerMove);
      };
    }, [onRunningChange, ref, resetSignal, scene, size.height, size.width]);

    return (
      <div ref={ref} className="h-full w-full overflow-hidden rounded-lg bg-[#081526]">
        <canvas
          ref={canvasRef}
          className="h-full w-full touch-none"
          role="img"
          aria-label="Mạch điện xoay chiều gồm nguồn, khoá K, biến trở X, ampe kế, vôn kế và đồ thị điện áp cùng cường độ dòng điện theo thời gian"
        />
      </div>
    );
  },
);
