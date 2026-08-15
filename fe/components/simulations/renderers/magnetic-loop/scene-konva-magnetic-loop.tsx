"use client";

import { getSimulationFontFamily } from "@/components/simulations/shared/typography";

import { useEffect, useRef } from "react";
import Konva from "konva";
import type { MagneticLoopScene, MagneticLoopState } from "../../engines/magnetic-loop/types";
import {
  initialMagneticLoopState,
  magneticLoopDynamics,
  magneticLoopStateAt,
  stepMagneticLoop,
} from "../../engines/magnetic-loop/physics";
import { useContainerSize } from "../../shared/use-container-size";

const RAD_TO_DEG = 180 / Math.PI;
const FIELD_COLOR = "#1596b8";
const WIRE_COLOR = "#c8433b";
const FORCE_COLOR = "#d92d20";
const CURRENT_COLOR = "#9a6700";
const INK = "#17324d";

type Point = { x: number; y: number };

function midpoint(a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

function arrowAlong(a: Point, b: Point, from = 0.35, to = 0.68): number[] {
  return [a.x + (b.x - a.x) * from, a.y + (b.y - a.y) * from, a.x + (b.x - a.x) * to, a.y + (b.y - a.y) * to];
}

export function SceneKonvaMagneticLoop({
  scene,
  running,
  resetSignal,
  onRunningChange,
  seekSeconds,
  seekToken,
  markLabel,
  speed = 1,
}: {
  scene: MagneticLoopScene;
  running: boolean;
  resetSignal: number;
  onRunningChange: (running: boolean) => void;
  seekSeconds?: number;
  seekToken?: number;
  markLabel?: string;
  speed?: number;
}) {
  const { ref: containerRef, size } = useContainerSize<HTMLDivElement>();
  const runningRef = useRef(running);
  const speedRef = useRef(speed);

  useEffect(() => {
    runningRef.current = running;
  }, [running]);

  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);

  useEffect(() => {
    const container = containerRef.current;
    const { width: W, height: H } = size;
    if (!container || !W || !H) return;

    const stage = new Konva.Stage({ container, width: W, height: H });
    const layer = new Konva.Layer();
    stage.add(layer);

    layer.add(new Konva.Rect({ x: 0, y: 0, width: W, height: H, fill: "#f7faf9", listening: false }));

    // Từ trường đều hướng sang phải, đúng kiểu các đường song song trong hình SGK.
    const fieldTop = Math.max(58, H * 0.13);
    const fieldBottom = H - 58;
    const fieldGap = Math.max(44, Math.min(62, (fieldBottom - fieldTop) / 6));
    for (let y = fieldTop; y <= fieldBottom; y += fieldGap) {
      layer.add(new Konva.Arrow({
        points: [18, y, W - 18, y],
        stroke: FIELD_COLOR,
        fill: FIELD_COLOR,
        strokeWidth: 1.5,
        opacity: 0.62,
        visible: scene.magneticField > 1e-6,
        pointerLength: 6,
        pointerWidth: 6,
        listening: false,
      }));
    }
    layer.add(new Konva.Text({
      x: W - 72,
      y: fieldTop - 30,
      text: "B⃗",
      fontSize: 21,
      fontStyle: "normal",
      fontFamily: getSimulationFontFamily(),
      fill: FIELD_COLOR,
      listening: false,
      visible: scene.magneticField > 1e-6,
    }));

    const center = { x: W * 0.53, y: H * 0.5 };
    const loopHeightPx = Math.min(H * 0.56, W * 0.43);
    const loopWidthPx = Math.min(W * 0.45, loopHeightPx * (scene.width / scene.height) * 1.55);
    const halfH = loopHeightPx / 2;
    const halfW = loopWidthPx / 2;

    const axis = new Konva.Line({
      points: [center.x, center.y - halfH - 58, center.x, center.y + halfH + 58],
      stroke: "#64748b",
      strokeWidth: 2,
      dash: [8, 6],
      listening: false,
    });
    const axisTop = new Konva.Text({ text: "O′", fontSize: 16, fontStyle: "normal", fill: INK });
    const axisBottom = new Konva.Text({ text: "O", fontSize: 16, fontStyle: "normal", fill: INK });
    layer.add(axis, axisTop, axisBottom);

    const frame = new Konva.Line({
      points: [],
      closed: true,
      stroke: WIRE_COLOR,
      strokeWidth: 5,
      lineCap: "round",
      lineJoin: "round",
      shadowColor: "#8b2e29",
      shadowBlur: 3,
      shadowOpacity: 0.16,
      listening: false,
    });
    layer.add(frame);

    const vertexNames = ["M", "N", "P", "Q"];
    const vertexLabels = vertexNames.map((text) => new Konva.Text({ text, fontSize: 15, fontStyle: "normal", fill: INK, listening: false }));
    layer.add(...vertexLabels);

    const currentLeft = new Konva.Arrow({ points: [], stroke: CURRENT_COLOR, fill: CURRENT_COLOR, strokeWidth: 3, pointerLength: 7, pointerWidth: 7 });
    const currentRight = new Konva.Arrow({ points: [], stroke: CURRENT_COLOR, fill: CURRENT_COLOR, strokeWidth: 3, pointerLength: 7, pointerWidth: 7 });
    const currentLabel = new Konva.Text({ text: "I", fontSize: 14, fontStyle: "normal", fill: CURRENT_COLOR });
    layer.add(currentLeft, currentRight, currentLabel);

    const leftForce = new Konva.Arrow({ points: [], stroke: FORCE_COLOR, fill: FORCE_COLOR, strokeWidth: 3.5, pointerLength: 9, pointerWidth: 9, lineCap: "round" });
    const rightForce = new Konva.Arrow({ points: [], stroke: FORCE_COLOR, fill: FORCE_COLOR, strokeWidth: 3.5, pointerLength: 9, pointerWidth: 9, lineCap: "round" });
    const leftForceLabel = new Konva.Text({ text: "F⃗MN", fontSize: 14, fontStyle: "normal", fill: FORCE_COLOR });
    const rightForceLabel = new Konva.Text({ text: "F⃗QP", fontSize: 14, fontStyle: "normal", fill: FORCE_COLOR });
    const leftForceSymbol = new Konva.Text({ fontSize: 25, fontStyle: "normal", fill: FORCE_COLOR, align: "center" });
    const rightForceSymbol = new Konva.Text({ fontSize: 25, fontStyle: "normal", fill: FORCE_COLOR, align: "center" });
    layer.add(leftForce, rightForce, leftForceLabel, rightForceLabel, leftForceSymbol, rightForceSymbol);

    const normal = new Konva.Arrow({ points: [], stroke: INK, fill: INK, strokeWidth: 2.5, pointerLength: 8, pointerWidth: 8 });
    const normalLabel = new Konva.Text({ text: "n⃗", fontSize: 16, fontStyle: "normal", fill: INK });
    const angleArc = new Konva.Line({ stroke: "#7c3aed", strokeWidth: 2, lineCap: "round" });
    const angleLabel = new Konva.Text({ text: "α", fontSize: 16, fontStyle: "normal", fill: "#6d28d9" });
    const centerDot = new Konva.Circle({ radius: 4, fill: INK });
    const centerLabel = new Konva.Text({ text: "S", fontSize: 14, fontStyle: "normal", fill: INK });
    layer.add(angleArc, normal, normalLabel, centerDot, centerLabel, angleLabel);

    const rotationArrow = new Konva.Text({ text: "↺", fontSize: 42, fill: "#7c3aed", opacity: 0.8, fontFamily: getSimulationFontFamily() });
    const omegaLabel = new Konva.Text({ text: "ω", fontSize: 16, fontStyle: "normal", fill: "#6d28d9" });
    layer.add(rotationArrow, omegaLabel);

    const infoPanel = new Konva.Rect({ x: 16, y: 14, width: Math.min(236, W * 0.36), height: 105, fill: "#ffffff", stroke: "#d9e4e3", strokeWidth: 1, cornerRadius: 12, shadowColor: "#43615d", shadowBlur: 12, shadowOpacity: 0.1 });
    const info = new Konva.Text({ x: 30, y: 27, width: Math.min(208, W * 0.32), fontSize: 12, lineHeight: 1.55, fill: INK, fontFamily: getSimulationFontFamily() });
    layer.add(infoPanel, info);

    const legend = new Konva.Text({
      x: 16,
      y: H - 31,
      width: W - 32,
      align: "center",
      text: "⊙: lực hướng ra khỏi màn hình    ⊗: lực hướng vào màn hình",
      fontSize: 12,
      fill: "#526777",
      fontFamily: getSimulationFontFamily(),
    });
    layer.add(legend);

    const draw = (state: MagneticLoopState) => {
      const sin = Math.sin(state.angle);
      const cos = Math.cos(state.angle);
      // Phép chiếu xiên: khi alpha = 0, pháp tuyến cùng B và khung gần nhìn nghiêng cạnh.
      const xOffset = halfW * Math.abs(sin) * Math.sign(sin || 1);
      const depthOffset = halfW * cos * 0.38;
      const M = { x: center.x - xOffset, y: center.y - halfH + depthOffset };
      const N = { x: center.x - xOffset, y: center.y + halfH + depthOffset };
      const P = { x: center.x + xOffset, y: center.y + halfH - depthOffset };
      const Q = { x: center.x + xOffset, y: center.y - halfH - depthOffset };
      const leftMid = midpoint(M, N);
      const rightMid = midpoint(Q, P);

      frame.points([M.x, M.y, N.x, N.y, P.x, P.y, Q.x, Q.y]);
      const vertices = [M, N, P, Q];
      const offsets = [{ x: -24, y: -20 }, { x: -24, y: 7 }, { x: 10, y: 7 }, { x: 10, y: -20 }];
      vertexLabels.forEach((label, index) => label.position({ x: vertices[index].x + offsets[index].x, y: vertices[index].y + offsets[index].y }));

      axis.points([center.x, Math.min(M.y, Q.y) - 64, center.x, Math.max(N.y, P.y) + 64]);
      axisTop.position({ x: center.x + 8, y: Math.min(M.y, Q.y) - 68 });
      axisBottom.position({ x: center.x + 8, y: Math.max(N.y, P.y) + 47 });

      const dynamics = magneticLoopDynamics(scene, state);
      const positiveCurrent = dynamics.effectiveCurrent >= 0;
      currentLeft.points(positiveCurrent ? arrowAlong(N, M) : arrowAlong(M, N));
      currentRight.points(positiveCurrent ? arrowAlong(Q, P) : arrowAlong(P, Q));
      currentLabel.position({ x: leftMid.x - 18, y: leftMid.y - 10 });
      const currentVisible = Math.abs(dynamics.effectiveCurrent) > 1e-6;
      currentLeft.visible(currentVisible);
      currentRight.visible(currentVisible);
      currentLabel.visible(currentVisible);

      // Cổ góp đảo I mỗi nửa vòng, vì vậy chiều hai lực cũng đổi đúng theo I x B.
      const leftOut = !positiveCurrent;
      const forceVisible = dynamics.sideForce > 1e-6;
      const forceLength = forceVisible ? Math.min(78, 42 + dynamics.sideForce * 8) : 0;
      leftForce.visible(forceVisible);
      rightForce.visible(forceVisible);
      leftForceLabel.visible(forceVisible);
      rightForceLabel.visible(forceVisible);
      leftForceSymbol.visible(forceVisible);
      rightForceSymbol.visible(forceVisible);
      const outVector = { x: -0.68 * forceLength, y: -0.73 * forceLength };
      const leftVector = leftOut ? outVector : { x: -outVector.x, y: -outVector.y };
      const rightVector = { x: -leftVector.x, y: -leftVector.y };
      leftForce.points([leftMid.x, leftMid.y, leftMid.x + leftVector.x, leftMid.y + leftVector.y]);
      rightForce.points([rightMid.x, rightMid.y, rightMid.x + rightVector.x, rightMid.y + rightVector.y]);
      leftForceLabel.position({ x: leftMid.x + leftVector.x - (leftOut ? 45 : 2), y: leftMid.y + leftVector.y - 22 });
      rightForceLabel.position({ x: rightMid.x + rightVector.x + (leftOut ? 4 : -48), y: rightMid.y + rightVector.y + 5 });
      leftForceSymbol.text(leftOut ? "⊙" : "⊗");
      rightForceSymbol.text(leftOut ? "⊗" : "⊙");
      leftForceSymbol.position({ x: leftMid.x - 13, y: leftMid.y - 14 });
      rightForceSymbol.position({ x: rightMid.x - 13, y: rightMid.y - 14 });

      const normalLength = Math.min(106, loopWidthPx * 0.48);
      const normalEnd = { x: center.x + normalLength * cos, y: center.y - normalLength * sin * 0.42 };
      normal.points([center.x, center.y, normalEnd.x, normalEnd.y]);
      normalLabel.position({ x: normalEnd.x + 7, y: normalEnd.y - 16 });
      centerLabel.position({ x: center.x - 19, y: center.y + 7 });

      const arcRadius = 43;
      const alphaDisplay = Math.acos(Math.max(-1, Math.min(1, cos))) * RAD_TO_DEG;
      const arcPoints: number[] = [];
      const segments = 20;
      for (let i = 0; i <= segments; i += 1) {
        const a = (state.angle * i) / segments;
        arcPoints.push(center.x + arcRadius * Math.cos(a), center.y - arcRadius * Math.sin(a) * 0.42);
      }
      angleArc.points(arcPoints);
      angleLabel.position({ x: center.x + 47, y: center.y - 24 * Math.sign(state.angle || 1) });

      const turningLeft = state.angularVelocity < -0.02 || (Math.abs(state.angularVelocity) <= 0.02 && dynamics.torque < 0);
      rotationArrow.text(turningLeft ? "↻" : "↺");
      rotationArrow.position({ x: center.x + 18, y: center.y - halfH - 62 });
      omegaLabel.position({ x: center.x + 56, y: center.y - halfH - 45 });
      const rotationVisible = Math.abs(state.angularVelocity) > 0.02 || Math.abs(dynamics.torque) > 0.0001;
      rotationArrow.visible(rotationVisible);
      omegaLabel.visible(rotationVisible);

      info.text(
        `F = NIlB = ${dynamics.sideForce.toFixed(2)} N\n` +
          `τ = NIAB sin α = ${Math.abs(dynamics.torque).toFixed(3)} N·m\n` +
          `α = ${alphaDisplay.toFixed(1)}°    ω = ${state.angularVelocity.toFixed(2)} rad/s\n` +
          (!forceVisible
            ? "Không có lực từ vì tích I·B bằng 0"
            : Math.abs(dynamics.torque) < 0.0001
              ? "Khung lướt qua vị trí mô-men lực từ bằng 0"
              : "Cổ góp giữ mô-men cùng chiều quay"),
      );
      layer.batchDraw();
    };

    let simState = seekToken && seekSeconds != null && seekSeconds >= 0 ? magneticLoopStateAt(scene, seekSeconds) : initialMagneticLoopState(scene);
    if (seekToken && seekSeconds != null && seekSeconds >= 0) {
      runningRef.current = false;
      onRunningChange(false);
    }
    draw(simState);

    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min((now - last) / 1000, 1 / 30);
      last = now;
      if (runningRef.current) {
        simState = stepMagneticLoop(scene, simState, dt * speedRef.current);
        draw(simState);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      stage.destroy();
    };
  }, [scene, size, resetSignal, seekToken, seekSeconds, markLabel, onRunningChange, containerRef]);

  return <div ref={containerRef} className="h-full w-full overflow-hidden rounded-lg bg-[#f7faf9]" />;
}
