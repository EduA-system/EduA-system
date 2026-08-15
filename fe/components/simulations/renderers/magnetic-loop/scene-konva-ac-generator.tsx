"use client";

import { getSimulationFontFamily } from "@/components/simulations/shared/typography";

import { useEffect, useRef } from "react";
import Konva from "konva";
import type { MagneticLoopScene } from "../../engines/magnetic-loop/types";
import { acGeneratorDynamics, generatorAngleAt } from "../../engines/magnetic-loop/physics";
import { useContainerSize } from "../../shared/use-container-size";

const COPPER = "#f59e0b";
const COPPER_LIGHT = "#fcd34d";
const FIELD = "#67e8f9";
const FORCE = "#fb7185";
const CURRENT = "#fde047";
const INK = "#e5eef5";
const MUTED = "#91a4b7";
const RAD_TO_DEG = 180 / Math.PI;

type Point = { x: number; y: number };

function midpoint(a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

function arrowSegment(a: Point, b: Point, reverse: boolean): number[] {
  const start = reverse ? 0.7 : 0.3;
  const end = reverse ? 0.38 : 0.62;
  return [a.x + (b.x - a.x) * start, a.y + (b.y - a.y) * start, a.x + (b.x - a.x) * end, a.y + (b.y - a.y) * end];
}

export function SceneKonvaAcGenerator({
  scene,
  running,
  resetSignal,
  onRunningChange,
  seekSeconds,
  seekToken,
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

    layer.add(new Konva.Rect({
      x: 0,
      y: 0,
      width: W,
      height: H,
      fillLinearGradientStartPoint: { x: 0, y: 0 },
      fillLinearGradientEndPoint: { x: W, y: H },
      fillLinearGradientColorStops: [0, "#06111b", 0.58, "#0b1722", 1, "#071019"],
      listening: false,
    }));

    for (let x = 0; x < W; x += 46) {
      layer.add(new Konva.Line({ points: [x, 0, x, H], stroke: "#163044", strokeWidth: 1, opacity: 0.18, listening: false }));
    }
    for (let y = 0; y < H; y += 46) {
      layer.add(new Konva.Line({ points: [0, y, W, y], stroke: "#163044", strokeWidth: 1, opacity: 0.18, listening: false }));
    }

    const graphW = Math.max(190, Math.min(250, W * 0.24));
    const apparatusRight = W - graphW - 26;
    const magnetTop = Math.max(145, H * 0.2);
    const magnetHeight = Math.min(300, H * 0.45);
    const magnetBottom = magnetTop + magnetHeight;
    const leftX = 24;
    const leftW = Math.max(118, apparatusRight * 0.27);
    const gapLeft = leftX + leftW;
    const rightW = Math.max(118, apparatusRight * 0.27);
    const rightX = apparatusRight - rightW;
    const gapRight = rightX;
    const center = { x: (gapLeft + gapRight) / 2, y: magnetTop + magnetHeight * 0.5 };

    const addMagnet = (x: number, width: number, colorA: string, colorB: string, pole: string, faceOnRight: boolean) => {
      layer.add(new Konva.Line({
        points: [x, magnetTop, x + 15, magnetTop - 15, x + width + 15, magnetTop - 15, x + width, magnetTop],
        closed: true,
        fill: colorB,
        stroke: "#bfd2df",
        strokeWidth: 1,
        opacity: 0.82,
        listening: false,
      }));
      layer.add(new Konva.Rect({
        x,
        y: magnetTop,
        width,
        height: magnetHeight,
        fillLinearGradientStartPoint: { x, y: magnetTop },
        fillLinearGradientEndPoint: { x: x + width, y: magnetBottom },
        fillLinearGradientColorStops: [0, colorA, 1, colorB],
        stroke: "#b9cbd7",
        strokeWidth: 1.5,
        cornerRadius: 4,
        shadowColor: colorA,
        shadowBlur: 18,
        shadowOpacity: 0.18,
        listening: false,
      }));
      const faceX = faceOnRight ? x + width - 24 : x;
      layer.add(new Konva.Rect({ x: faceX, y: magnetTop + 20, width: 24, height: magnetHeight - 40, fill: "#d8e4ec", opacity: 0.72, listening: false }));
      layer.add(new Konva.Text({
        x,
        y: center.y - 42,
        width,
        text: pole,
        align: "center",
        fontSize: Math.min(62, width * 0.42),
        fontStyle: "normal",
        fontFamily: getSimulationFontFamily(),
        fill: "#f4f8fb",
        shadowColor: "#020617",
        shadowBlur: 5,
        shadowOpacity: 0.55,
        listening: false,
      }));
      layer.add(new Konva.Text({
        x,
        y: magnetBottom + 10,
        width,
        text: pole === "N" ? "CỰC BẮC" : "CỰC NAM",
        align: "center",
        fontSize: 11,
        fontStyle: "normal",
        fill: MUTED,
        listening: false,
      }));
    };

    addMagnet(leftX, leftW, "#2463d4", "#153b93", "N", true);
    addMagnet(rightX, rightW, "#ef4444", "#991b1b", "S", false);

    const fieldVisible = scene.magneticField > 1e-7;
    for (let i = -2; i <= 2; i += 1) {
      const y = center.y + i * Math.min(50, magnetHeight * 0.16);
      layer.add(new Konva.Arrow({
        points: [gapLeft + 8, y, gapRight - 8, y],
        stroke: FIELD,
        fill: FIELD,
        strokeWidth: 1.7,
        opacity: 0.58,
        pointerLength: 7,
        pointerWidth: 7,
        visible: fieldVisible,
        listening: false,
      }));
    }
    const fieldLabel = new Konva.Text({ x: center.x - 10, y: magnetTop - 30, text: "B", fontSize: 20, fontStyle: "normal", fill: FIELD, visible: fieldVisible, listening: false });
    const fieldNotationArrow = new Konva.Arrow({ points: [center.x - 12, magnetTop - 33, center.x + 10, magnetTop - 33], stroke: FIELD, fill: FIELD, strokeWidth: 1.4, pointerLength: 4, pointerWidth: 4, visible: fieldVisible, listening: false });
    layer.add(fieldLabel, fieldNotationArrow);

    const loopHeight = Math.min(magnetHeight * 0.72, 230);
    const loopHalfH = loopHeight / 2;
    const loopHalfW = Math.min((gapRight - gapLeft) * 0.36, 112);
    const shaftBottom = Math.min(H - 126, magnetBottom + 98);
    layer.add(new Konva.Line({ points: [center.x, center.y - loopHalfH - 24, center.x, shaftBottom], stroke: "#b9c8d3", strokeWidth: 5, opacity: 0.76, lineCap: "round", listening: false }));

    const frame = new Konva.Line({ points: [], closed: true, stroke: COPPER, strokeWidth: 6, lineCap: "round", lineJoin: "round", shadowColor: COPPER, shadowBlur: 8, shadowOpacity: 0.32, listening: false });
    layer.add(frame);
    const labels = ["M", "N", "P", "Q"].map((text) => new Konva.Text({ text, fontSize: 14, fontStyle: "normal", fill: INK, listening: false }));
    layer.add(...labels);

    const currentLeft = new Konva.Arrow({ points: [], stroke: CURRENT, fill: CURRENT, strokeWidth: 3, pointerLength: 7, pointerWidth: 7 });
    const currentRight = new Konva.Arrow({ points: [], stroke: CURRENT, fill: CURRENT, strokeWidth: 3, pointerLength: 7, pointerWidth: 7 });
    const forceLeft = new Konva.Arrow({ points: [], stroke: FORCE, fill: FORCE, strokeWidth: 3.5, pointerLength: 9, pointerWidth: 9 });
    const forceRight = new Konva.Arrow({ points: [], stroke: FORCE, fill: FORCE, strokeWidth: 3.5, pointerLength: 9, pointerWidth: 9 });
    const forceLeftLabel = new Konva.Text({ text: "F_MN", fontSize: 13, fontStyle: "normal", fill: FORCE });
    const forceRightLabel = new Konva.Text({ text: "F_QP", fontSize: 13, fontStyle: "normal", fill: FORCE });
    const forceLeftSymbol = new Konva.Text({ fontSize: 23, fontStyle: "normal", fill: FORCE });
    const forceRightSymbol = new Konva.Text({ fontSize: 23, fontStyle: "normal", fill: FORCE });
    layer.add(currentLeft, currentRight, forceLeft, forceRight, forceLeftLabel, forceRightLabel, forceLeftSymbol, forceRightSymbol);

    const normal = new Konva.Arrow({ points: [], stroke: "#d8b4fe", fill: "#d8b4fe", strokeWidth: 2.2, pointerLength: 7, pointerWidth: 7 });
    const normalLabel = new Konva.Text({ text: "n", fontSize: 14, fontStyle: "normal", fill: "#d8b4fe" });
    const normalNotationArrow = new Konva.Arrow({ points: [], stroke: "#d8b4fe", fill: "#d8b4fe", strokeWidth: 1.2, pointerLength: 3.5, pointerWidth: 3.5 });
    const angleArc = new Konva.Line({ points: [], stroke: "#c084fc", strokeWidth: 1.8, lineCap: "round", listening: false });
    const angleLabel = new Konva.Text({ text: "α", fontSize: 15, fontStyle: "normal", fill: "#c084fc", listening: false });
    layer.add(angleArc, angleLabel, normal, normalLabel, normalNotationArrow);

    const ringUpperY = shaftBottom - 40;
    const ringLowerY = shaftBottom - 15;
    const ringYs = [ringUpperY, ringLowerY];
    const rings = ringYs.map((y) => new Konva.Ellipse({ x: center.x, y, radiusX: 22, radiusY: 7, stroke: COPPER_LIGHT, strokeWidth: 5, fill: "#6b3f08", listening: false }));
    layer.add(...rings);
    layer.add(new Konva.Rect({ x: center.x - 7, y: ringUpperY + 8, width: 14, height: ringLowerY - ringUpperY - 16, fill: "#111827", stroke: "#64748b", strokeWidth: 1, cornerRadius: 3, listening: false }));
    const ringHighlights = ringYs.map(() => new Konva.Circle({ radius: 3.5, fill: "#fff7ae", shadowColor: COPPER_LIGHT, shadowBlur: 7, shadowOpacity: 0.8 }));
    layer.add(...ringHighlights);
    layer.add(
      new Konva.Text({ x: center.x + 34, y: ringUpperY - 17, text: "2 VÀNH TRƯỢT", fontSize: 10, fontStyle: "normal", fill: COPPER_LIGHT, listening: false }),
      new Konva.Line({ points: [center.x + 31, ringUpperY - 4, center.x + 18, ringUpperY], stroke: COPPER_LIGHT, strokeWidth: 1.3, listening: false }),
      new Konva.Text({ x: center.x - 132, y: ringLowerY + 18, text: "CHỔI TIẾP ĐIỆN", fontSize: 10, fontStyle: "normal", fill: "#cbd5e1", listening: false }),
      new Konva.Line({ points: [center.x - 34, ringLowerY + 19, center.x - 26, ringUpperY], stroke: "#cbd5e1", strokeWidth: 1.3, listening: false }),
    );

    const brushLeft = { x: center.x - 50, y: ringUpperY - 5 };
    const brushRight = { x: center.x + 25, y: ringLowerY - 5 };
    layer.add(
      new Konva.Rect({ x: brushLeft.x, y: brushLeft.y, width: 25, height: 10, fill: "#d1d5db", stroke: "#64748b", strokeWidth: 1, cornerRadius: 2 }),
      new Konva.Rect({ x: brushRight.x, y: brushRight.y, width: 25, height: 10, fill: "#d1d5db", stroke: "#64748b", strokeWidth: 1, cornerRadius: 2 }),
    );

    const loadX = Math.min(apparatusRight - 82, center.x + 150);
    const loadY = H - 72;
    layer.add(new Konva.Line({
      points: [brushLeft.x, ringUpperY, brushLeft.x - 22, loadY, loadX - 58, loadY],
      stroke: COPPER_LIGHT,
      strokeWidth: 4,
      lineCap: "round",
      lineJoin: "round",
      listening: false,
    }));
    layer.add(new Konva.Line({
      points: [brushRight.x + 25, ringLowerY, brushRight.x + 46, loadY - 34, loadX + 58, loadY - 34],
      stroke: COPPER_LIGHT,
      strokeWidth: 4,
      lineCap: "round",
      lineJoin: "round",
      listening: false,
    }));
    const load = new Konva.Rect({ x: loadX - 58, y: loadY - 40, width: 116, height: 46, fill: "#134e4a", stroke: "#5eead4", strokeWidth: 2, cornerRadius: 9, shadowColor: "#2dd4bf", shadowBlur: 14, shadowOpacity: 0.28 });
    const loadText = new Konva.Text({ x: loadX - 58, y: loadY - 31, width: 116, align: "center", text: `TẢI ${scene.loadResistance.toFixed(0)} Ω`, fontSize: 13, fontStyle: "normal", fill: "#ccfbf1" });
    layer.add(load, loadText);

    const graph = { x: W - graphW + 8, y: 26, width: graphW - 22, height: Math.min(205, H * 0.28) };
    layer.add(new Konva.Rect({ x: graph.x, y: graph.y, width: graph.width, height: graph.height, fill: "#03090f", stroke: "#28445b", strokeWidth: 1.2, cornerRadius: 12, shadowColor: "#020617", shadowBlur: 18, shadowOpacity: 0.45 }));
    layer.add(new Konva.Text({ x: graph.x + 14, y: graph.y + 12, text: "SUẤT ĐIỆN ĐỘNG e(t)", fontSize: 11, fontStyle: "normal", fill: MUTED }));
    const gx0 = graph.x + 30;
    const gy0 = graph.y + graph.height * 0.55;
    const gx1 = graph.x + graph.width - 12;
    layer.add(
      new Konva.Arrow({ points: [gx0, graph.y + graph.height - 20, gx0, graph.y + 32], stroke: "#dbeafe", fill: "#dbeafe", strokeWidth: 1.5, pointerLength: 6, pointerWidth: 6 }),
      new Konva.Arrow({ points: [gx0, gy0, gx1, gy0], stroke: "#dbeafe", fill: "#dbeafe", strokeWidth: 1.5, pointerLength: 6, pointerWidth: 6 }),
      new Konva.Text({ x: gx0 - 17, y: graph.y + 27, text: "e", fontSize: 13, fontStyle: "normal", fill: INK }),
      new Konva.Text({ x: gx1 - 6, y: gy0 + 6, text: "t", fontSize: 13, fontStyle: "normal", fill: INK }),
    );
    const waveform = new Konva.Line({ points: [], stroke: "#86efac", strokeWidth: 2.5, lineCap: "round", lineJoin: "round", shadowColor: "#4ade80", shadowBlur: 8, shadowOpacity: 0.45 });
    const waveDot = new Konva.Circle({ radius: 4.5, fill: "#fef08a", stroke: "#facc15", strokeWidth: 1, shadowColor: "#fde047", shadowBlur: 9, shadowOpacity: 0.8 });
    const graphValue = new Konva.Text({ x: graph.x + 14, y: graph.y + graph.height - 19, width: graph.width - 28, align: "right", fontSize: 11, fill: "#bbf7d0" });
    layer.add(waveform, waveDot, graphValue);

    const infoPanel = new Konva.Rect({ x: 16, y: 16, width: Math.min(255, apparatusRight * 0.35), height: 116, fill: "#08141f", opacity: 0.92, stroke: "#29465c", strokeWidth: 1, cornerRadius: 12, shadowColor: "#020617", shadowBlur: 14, shadowOpacity: 0.5 });
    const info = new Konva.Text({ x: 30, y: 29, width: Math.min(227, apparatusRight * 0.31), fontSize: 12, lineHeight: 1.52, fill: INK, fontFamily: getSimulationFontFamily() });
    layer.add(infoPanel, info);

    layer.add(new Konva.Text({
      x: 18,
      y: H - 27,
      width: W - 36,
      align: "center",
      text: "⊙: lực ra khỏi màn hình    ⊗: lực vào màn hình    Hai lực từ tạo mô-men cản theo Lenz",
      fontSize: 11,
      fill: MUTED,
      listening: false,
    }));

    const maxEmf = scene.turns * scene.magneticField * scene.width * scene.height * Math.abs(scene.driveAngularVelocity);
    const maxCurrent = maxEmf / Math.max(scene.loadResistance, 1e-9);
    const graphAmplitude = Math.min(52, graph.height * 0.3);
    const waveformPoints: number[] = [];
    for (let i = 0; i <= 96; i += 1) {
      const ratio = i / 96;
      waveformPoints.push(gx0 + ratio * (gx1 - gx0), gy0 - graphAmplitude * Math.sin(ratio * Math.PI * 2));
    }
    waveform.points(waveformPoints);
    waveform.visible(maxEmf > 1e-8);

    const draw = (angle: number) => {
      const sin = Math.sin(angle);
      const cos = Math.cos(angle);
      const dynamics = acGeneratorDynamics(scene, angle);
      const xOffset = loopHalfW * sin;
      const depthOffset = loopHalfW * cos * 0.36;
      const M = { x: center.x - xOffset, y: center.y - loopHalfH + depthOffset };
      const N = { x: center.x - xOffset, y: center.y + loopHalfH + depthOffset };
      const P = { x: center.x + xOffset, y: center.y + loopHalfH - depthOffset };
      const Q = { x: center.x + xOffset, y: center.y - loopHalfH - depthOffset };
      const leftMid = midpoint(M, N);
      const rightMid = midpoint(Q, P);

      frame.points([M.x, M.y, N.x, N.y, P.x, P.y, Q.x, Q.y]);
      const vertices = [M, N, P, Q];
      const labelOffsets = [{ x: -21, y: -18 }, { x: -21, y: 5 }, { x: 8, y: 5 }, { x: 8, y: -18 }];
      labels.forEach((label, index) => label.position({ x: vertices[index].x + labelOffsets[index].x, y: vertices[index].y + labelOffsets[index].y }));

      const currentVisible = Math.abs(dynamics.inducedCurrent) > Math.max(1e-7, maxCurrent * 0.015);
      const positiveCurrent = dynamics.inducedCurrent >= 0;
      currentLeft.points(arrowSegment(M, N, positiveCurrent));
      currentRight.points(arrowSegment(Q, P, !positiveCurrent));
      currentLeft.visible(currentVisible);
      currentRight.visible(currentVisible);

      const leftOut = !positiveCurrent;
      const forceRatio = maxCurrent > 1e-9 ? Math.abs(dynamics.inducedCurrent) / maxCurrent : 0;
      const forceLength = 36 + 30 * forceRatio;
      const out = { x: -forceLength * 0.7, y: -forceLength * 0.72 };
      const leftVector = leftOut ? out : { x: -out.x, y: -out.y };
      const rightVector = { x: -leftVector.x, y: -leftVector.y };
      forceLeft.points([leftMid.x, leftMid.y, leftMid.x + leftVector.x, leftMid.y + leftVector.y]);
      forceRight.points([rightMid.x, rightMid.y, rightMid.x + rightVector.x, rightMid.y + rightVector.y]);
      forceLeftLabel.position({ x: leftMid.x + leftVector.x - 38, y: leftMid.y + leftVector.y - 17 });
      forceRightLabel.position({ x: rightMid.x + rightVector.x + 5, y: rightMid.y + rightVector.y + 2 });
      forceLeftSymbol.text(leftOut ? "⊙" : "⊗");
      forceRightSymbol.text(leftOut ? "⊗" : "⊙");
      forceLeftSymbol.position({ x: leftMid.x - 12, y: leftMid.y - 13 });
      forceRightSymbol.position({ x: rightMid.x - 12, y: rightMid.y - 13 });
      [forceLeft, forceRight, forceLeftLabel, forceRightLabel, forceLeftSymbol, forceRightSymbol].forEach((node) => node.visible(currentVisible));

      const normalLength = Math.min(78, loopHalfW * 0.78);
      const normalEnd = { x: center.x + normalLength * cos, y: center.y + normalLength * sin * 0.36 };
      normal.points([center.x, center.y, normalEnd.x, normalEnd.y]);
      normalLabel.position({ x: normalEnd.x + 5, y: normalEnd.y - 15 });
      normalNotationArrow.points([normalEnd.x + 4, normalEnd.y - 18, normalEnd.x + 18, normalEnd.y - 18]);

      const displayAngle = Math.atan2(sin, cos);
      const angleRadius = 38;
      const arcPoints: number[] = [];
      for (let i = 0; i <= 16; i += 1) {
        const a = (displayAngle * i) / 16;
        arcPoints.push(center.x + angleRadius * Math.cos(a), center.y + angleRadius * Math.sin(a) * 0.36);
      }
      angleArc.points(arcPoints);
      const halfAngle = displayAngle / 2;
      angleLabel.position({ x: center.x + 45 * Math.cos(halfAngle), y: center.y + 45 * Math.sin(halfAngle) * 0.36 - 9 });

      ringHighlights.forEach((highlight, index) => {
        const ringCenterY = ringYs[index];
        highlight.position({ x: center.x + 18 * Math.cos(angle + index * Math.PI), y: ringCenterY + 5 * Math.sin(angle + index * Math.PI) });
      });

      const currentRatio = maxCurrent > 1e-9 ? Math.abs(dynamics.inducedCurrent) / maxCurrent : 0;
      load.shadowOpacity(0.18 + currentRatio * 0.55);
      load.fill(currentVisible ? "#0f766e" : "#134e4a");

      const phase = ((angle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
      const dotX = gx0 + (phase / (2 * Math.PI)) * (gx1 - gx0);
      waveDot.position({ x: dotX, y: gy0 - graphAmplitude * Math.sin(phase) });
      waveDot.visible(maxEmf > 1e-8);
      graphValue.text(`e = ${dynamics.inducedEmf.toFixed(3)} V`);

      const alpha = Math.acos(Math.max(-1, Math.min(1, cos))) * RAD_TO_DEG;
      info.text(
        `Φ = NBA cos α = ${dynamics.magneticFlux.toFixed(4)} Wb\n` +
          `e = NBAω sin α = ${dynamics.inducedEmf.toFixed(3)} V\n` +
          `I = e/R = ${dynamics.inducedCurrent.toFixed(3)} A\n` +
          `α = ${alpha.toFixed(1)}°   ω = ${scene.driveAngularVelocity.toFixed(2)} rad/s\n` +
          `|τcản| = ${Math.abs(dynamics.resistingTorque).toFixed(4)} N·m`,
      );
      layer.batchDraw();
    };

    let angle = seekToken && seekSeconds != null && seekSeconds >= 0 ? generatorAngleAt(scene, seekSeconds) : scene.initialAngle;
    if (seekToken && seekSeconds != null && seekSeconds >= 0) {
      runningRef.current = false;
      onRunningChange(false);
    }
    draw(angle);

    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min((now - last) / 1000, 1 / 30);
      last = now;
      if (runningRef.current) {
        angle += scene.driveAngularVelocity * dt * speedRef.current;
        if (Math.abs(angle) > Math.PI * 1000) angle %= Math.PI * 2;
        draw(angle);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      stage.destroy();
    };
  }, [scene, size, resetSignal, seekSeconds, seekToken, onRunningChange, containerRef]);

  return <div ref={containerRef} className="h-full w-full overflow-hidden rounded-lg bg-[#06111b]" />;
}
