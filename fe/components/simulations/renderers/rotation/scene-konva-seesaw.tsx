"use client";

import { getSimulationFontFamily } from "@/components/simulations/shared/typography";

import { useEffect, useRef } from "react";
import Konva from "konva";
import type { RotationScene, RotationState } from "../../engines/rotation/types";
import { initialRotationState, rotationStateAt, rotationTorques, stepRotation } from "../../engines/rotation/physics";
import { useContainerSize } from "../../shared/use-container-size";

const RAD_TO_DEG = 180 / Math.PI;

type SeesawRendererProps = {
  scene: RotationScene;
  running: boolean;
  resetSignal: number;
  onRunningChange: (running: boolean) => void;
  seekSeconds?: number;
  seekToken?: number;
  markLabel?: string;
  speed?: number;
};

export function SceneKonvaSeesaw({
  scene,
  running,
  resetSignal,
  onRunningChange,
  seekSeconds,
  seekToken,
  speed = 1,
}: SeesawRendererProps) {
  const { ref: containerRef, size } = useContainerSize<HTMLDivElement>();
  const runningRef = useRef(running);
  const speedRef = useRef(speed);
  const sceneRef = useRef(scene);
  const stateRef = useRef<RotationState | null>(null);
  const displayRadiiRef = useRef({ left: scene.left.radius, right: scene.right.radius });

  useEffect(() => {
    runningRef.current = running;
  }, [running]);

  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);

  useEffect(() => {
    sceneRef.current = scene;
    if (stateRef.current) stateRef.current = { ...stateRef.current, stoppedAtLimit: false };
  }, [scene]);

  useEffect(() => {
    const container = containerRef.current;
    const { width: W, height: H } = size;
    if (!container || !W || !H) return;

    const initialScene = sceneRef.current;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const stage = new Konva.Stage({ container, width: W, height: H });
    const layer = new Konva.Layer();
    stage.add(layer);

    layer.add(new Konva.Rect({ x: 0, y: 0, width: W, height: H, fill: "#0f172a", listening: false }));
    for (let x = 0; x <= W; x += 42) {
      layer.add(new Konva.Line({ points: [x, 0, x, H], stroke: "#1b2940", strokeWidth: 1, listening: false }));
    }
    for (let y = 0; y <= H; y += 42) {
      layer.add(new Konva.Line({ points: [0, y, W, y], stroke: "#1b2940", strokeWidth: 1, listening: false }));
    }

    const center = { x: W / 2, y: H * 0.57 };
    const groundY = Math.min(H - 28, center.y + Math.min(128, H * 0.22));
    const floorShadow = new Konva.Rect({ x: 0, y: groundY + 3, width: W, height: H - groundY, fill: "#0b1220", listening: false });
    const floor = new Konva.Line({ points: [0, groundY, W, groundY], stroke: "#475569", strokeWidth: 3, listening: false });
    const support = new Konva.Line({ closed: true, fill: "#27364b", stroke: "#94a3b8", strokeWidth: 2, lineJoin: "round", shadowColor: "#020617", shadowBlur: 14, shadowOpacity: 0.55, listening: false });
    const supportFace = new Konva.Line({ closed: true, fill: "#1e293b", stroke: "#475569", strokeWidth: 1, lineJoin: "round", listening: false });
    const leftStop = new Konva.Rect({ fill: "#334155", stroke: "#64748b", strokeWidth: 1.5, cornerRadius: 5, listening: false });
    const rightStop = new Konva.Rect({ fill: "#334155", stroke: "#64748b", strokeWidth: 1.5, cornerRadius: 5, listening: false });
    layer.add(floorShadow, floor, support, supportFace, leftStop, rightStop);

    const seesaw = new Konva.Group({ x: center.x, y: center.y, listening: false });
    const beamShadow = new Konva.Rect({ fill: "#020617", opacity: 0.55, cornerRadius: 10, shadowColor: "#020617", shadowBlur: 18, shadowOpacity: 0.65, shadowOffsetY: 10 });
    const beam = new Konva.Rect({ fillLinearGradientStartPoint: { x: 0, y: -12 }, fillLinearGradientEndPoint: { x: 0, y: 12 }, fillLinearGradientColorStops: [0, "#5eead4", 0.35, "#22b8aa", 1, "#0f766e"], stroke: "#99f6e4", strokeWidth: 1.5, cornerRadius: 10 });
    const beamHighlight = new Konva.Line({ stroke: "#ccfbf1", strokeWidth: 2, opacity: 0.72, lineCap: "round" });
    seesaw.add(beamShadow, beam, beamHighlight);

    const personAsset = new window.Image();
    personAsset.decoding = "async";
    personAsset.src = initialScene.visual?.personImageSrc ?? "/simulations/bapbenh/man.png";
    personAsset.onload = () => layer.batchDraw();
    const leftPerson = new Konva.Group({ listening: false });
    const rightPerson = new Konva.Group({ listening: false, scaleX: -1 });
    const leftPersonImage = new Konva.Image({ image: personAsset, crop: initialScene.visual?.personCrop, shadowColor: "#020617", shadowBlur: 8, shadowOpacity: 0.38, shadowOffsetY: 5, listening: false });
    const rightPersonImage = new Konva.Image({ image: personAsset, crop: initialScene.visual?.personCrop, shadowColor: "#020617", shadowBlur: 8, shadowOpacity: 0.38, shadowOffsetY: 5, listening: false });
    leftPerson.add(leftPersonImage);
    rightPerson.add(rightPersonImage);
    seesaw.add(leftPerson, rightPerson);

    const dimensionLine = new Konva.Line({ stroke: "#94a3b8", strokeWidth: 1.5, lineCap: "round", listening: false });
    const leftTick = new Konva.Line({ stroke: "#94a3b8", strokeWidth: 1.5, listening: false });
    const centerTick = new Konva.Line({ stroke: "#94a3b8", strokeWidth: 1.5, listening: false });
    const rightTick = new Konva.Line({ stroke: "#94a3b8", strokeWidth: 1.5, listening: false });
    const leftDistance = new Konva.Text({ fontSize: 13, fontStyle: "normal", fill: "#cbd5e1", fontFamily: getSimulationFontFamily(), align: "center", listening: false });
    const rightDistance = new Konva.Text({ fontSize: 13, fontStyle: "normal", fill: "#cbd5e1", fontFamily: getSimulationFontFamily(), align: "center", listening: false });
    seesaw.add(dimensionLine, leftTick, centerTick, rightTick, leftDistance, rightDistance);

    const makeMassBadge = () => {
      const group = new Konva.Group({ listening: false });
      const box = new Konva.Rect({ width: 76, height: 25, x: -38, y: 0, fill: "#162238", stroke: "#475569", strokeWidth: 1, cornerRadius: 7 });
      const text = new Konva.Text({ width: 76, x: -38, y: 6, align: "center", fontSize: 11, fontStyle: "normal", fill: "#f1f5f9", fontFamily: getSimulationFontFamily() });
      group.add(box, text);
      seesaw.add(group);
      return { group, text };
    };
    const leftMassBadge = makeMassBadge();
    const rightMassBadge = makeMassBadge();
    layer.add(seesaw);

    const pivotOuter = new Konva.Circle({ x: center.x, y: center.y, radius: 18, fill: "#cbd5e1", stroke: "#0f172a", strokeWidth: 5, shadowColor: "#020617", shadowBlur: 8, shadowOpacity: 0.5, listening: false });
    const pivotInner = new Konva.Circle({ x: center.x, y: center.y, radius: 7, fill: "#475569", stroke: "#f8fafc", strokeWidth: 1.5, listening: false });
    layer.add(pivotOuter, pivotInner);

    const leftWeight = new Konva.Arrow({ points: [0, 0, 0, 0], stroke: "#e2e8f0", fill: "#e2e8f0", strokeWidth: 2.2, pointerLength: 8, pointerWidth: 8, listening: false });
    const rightWeight = new Konva.Arrow({ points: [0, 0, 0, 0], stroke: "#e2e8f0", fill: "#e2e8f0", strokeWidth: 2.2, pointerLength: 8, pointerWidth: 8, listening: false });
    const leftWeightLabel = new Konva.Text({ text: "P₁", fontSize: 13, fontStyle: "normal", fill: "#e2e8f0", fontFamily: getSimulationFontFamily(), listening: false });
    const rightWeightLabel = new Konva.Text({ text: "P₂", fontSize: 13, fontStyle: "normal", fill: "#e2e8f0", fontFamily: getSimulationFontFamily(), listening: false });
    layer.add(leftWeight, rightWeight, leftWeightLabel, rightWeightLabel);

    const infoPanel = new Konva.Rect({ x: 16, y: 16, width: 220, height: 90, fill: "#111c2f", opacity: 0.94, stroke: "#334155", strokeWidth: 1, cornerRadius: 12, listening: false });
    const info = new Konva.Text({ x: 30, y: 29, width: 196, fontSize: 12, fill: "#cbd5e1", fontFamily: getSimulationFontFamily(), lineHeight: 1.55, listening: false });
    const status = new Konva.Text({ x: 250, y: 22, width: Math.max(180, W - 500), align: "center", fontSize: 13, fontStyle: "normal", fill: "#5eead4", fontFamily: getSimulationFontFamily(), listening: false });
    layer.add(infoPanel, info, status);

    const localToStage = (x: number, y: number, theta: number) => {
      const rotation = -theta;
      const cosine = Math.cos(rotation);
      const sine = Math.sin(rotation);
      return { x: center.x + x * cosine - y * sine, y: center.y + x * sine + y * cosine };
    };

    const draw = (state: RotationState, dt: number) => {
      const currentScene = sceneRef.current;
      const scale = Math.min((W - 150) / (currentScene.diskRadius * 2), Math.max(82, H * 0.23));
      const beamWidth = currentScene.diskRadius * 2 * scale;
      const beamHeight = Math.max(20, Math.min(28, scale * 0.2));
      const ease = reduceMotion ? 1 : 1 - Math.exp(-Math.max(dt, 1 / 120) * 9);
      displayRadiiRef.current.left += (currentScene.left.radius - displayRadiiRef.current.left) * ease;
      displayRadiiRef.current.right += (currentScene.right.radius - displayRadiiRef.current.right) * ease;
      const leftX = -displayRadiiRef.current.left * scale;
      const rightX = displayRadiiRef.current.right * scale;

      seesaw.rotation(-state.theta * RAD_TO_DEG);
      beamShadow.position({ x: -beamWidth / 2, y: -beamHeight / 2 + 7 });
      beamShadow.size({ width: beamWidth, height: beamHeight });
      beam.position({ x: -beamWidth / 2, y: -beamHeight / 2 });
      beam.size({ width: beamWidth, height: beamHeight });
      beamHighlight.points([-beamWidth / 2 + 16, -beamHeight / 2 + 4, beamWidth / 2 - 16, -beamHeight / 2 + 4]);

      const personHeight = Math.min(192, Math.max(128, scale * 1.35));
      const personWidth = personHeight * (442 / 991);
      const sittingY = -beamHeight / 2 - 30;
      leftPerson.position({ x: leftX, y: sittingY });
      rightPerson.position({ x: rightX, y: sittingY });
      leftPersonImage.position({ x: -personWidth / 2, y: -personHeight * 0.48 });
      rightPersonImage.position({ x: -personWidth / 2, y: -personHeight * 0.48 });
      leftPersonImage.size({ width: personWidth, height: personHeight });
      rightPersonImage.size({ width: personWidth, height: personHeight });

      const dimensionY = beamHeight / 2 + 36;
      dimensionLine.points([leftX, dimensionY, 0, dimensionY, rightX, dimensionY]);
      leftTick.points([leftX, dimensionY - 7, leftX, dimensionY + 7]);
      centerTick.points([0, dimensionY - 7, 0, dimensionY + 7]);
      rightTick.points([rightX, dimensionY - 7, rightX, dimensionY + 7]);
      leftDistance.position({ x: leftX / 2 - 60, y: dimensionY + 11 });
      leftDistance.width(120);
      leftDistance.text(`d₁ = ${currentScene.left.radius.toFixed(2)} m`);
      rightDistance.position({ x: rightX / 2 - 60, y: dimensionY + 11 });
      rightDistance.width(120);
      rightDistance.text(`d₂ = ${currentScene.right.radius.toFixed(2)} m`);

      leftMassBadge.group.position({ x: leftX, y: beamHeight / 2 + 67 });
      rightMassBadge.group.position({ x: rightX, y: beamHeight / 2 + 67 });
      leftMassBadge.text.text(`m₁ ${currentScene.left.mass.toFixed(1)} kg`);
      rightMassBadge.text.text(`m₂ ${currentScene.right.mass.toFixed(1)} kg`);

      const leftArrowAnchor = localToStage(leftX - personWidth * 0.72, sittingY - personHeight * 0.17, state.theta);
      const rightArrowAnchor = localToStage(rightX + personWidth * 0.72, sittingY - personHeight * 0.17, state.theta);
      const leftArrowLength = Math.min(76, 38 + currentScene.left.mass * 3.5);
      const rightArrowLength = Math.min(76, 38 + currentScene.right.mass * 3.5);
      leftWeight.points([leftArrowAnchor.x, leftArrowAnchor.y, leftArrowAnchor.x, leftArrowAnchor.y + leftArrowLength]);
      rightWeight.points([rightArrowAnchor.x, rightArrowAnchor.y, rightArrowAnchor.x, rightArrowAnchor.y + rightArrowLength]);
      leftWeightLabel.position({ x: leftArrowAnchor.x - 24, y: leftArrowAnchor.y + leftArrowLength + 5 });
      rightWeightLabel.position({ x: rightArrowAnchor.x + 8, y: rightArrowAnchor.y + rightArrowLength + 5 });

      const supportTop = center.y + beamHeight / 2 + 4;
      support.points([center.x - 16, supportTop, center.x + 16, supportTop, center.x + 62, groundY, center.x - 62, groundY]);
      supportFace.points([center.x - 10, supportTop + 9, center.x + 10, supportTop + 9, center.x + 38, groundY - 8, center.x - 38, groundY - 8]);
      const stopWidth = Math.max(42, scale * 0.38);
      const stopX = currentScene.diskRadius * scale * 0.9;
      leftStop.position({ x: center.x - stopX - stopWidth / 2, y: groundY - 13 });
      leftStop.size({ width: stopWidth, height: 13 });
      rightStop.position({ x: center.x + stopX - stopWidth / 2, y: groundY - 13 });
      rightStop.size({ width: stopWidth, height: 13 });

      const torques = rotationTorques(currentScene, state.theta);
      const balanced = Math.abs(torques.net) <= 0.05;
      info.text(`M₁ = ${torques.left.toFixed(2)} N·m\nM₂ = ${torques.right.toFixed(2)} N·m\nΣM = ${torques.net.toFixed(2)} N·m\nθ = ${(state.theta * RAD_TO_DEG).toFixed(1)}°`);
      if (balanced) {
        status.text("Hai moment cân bằng");
        status.fill("#5eead4");
      } else if (state.stoppedAtLimit) {
        status.text(torques.net > 0 ? "Bên trái đã hạ xuống" : "Bên phải đã hạ xuống");
        status.fill("#fbbf24");
      } else {
        status.text(torques.net > 0 ? "Moment trái lớn hơn, bập bênh nghiêng trái" : "Moment phải lớn hơn, bập bênh nghiêng phải");
        status.fill("#e2e8f0");
      }
      layer.batchDraw();
    };

    let simulationState = seekToken && seekSeconds != null && seekSeconds >= 0
      ? rotationStateAt(initialScene, seekSeconds)
      : initialRotationState(initialScene);
    stateRef.current = simulationState;
    if (seekToken && seekSeconds != null && seekSeconds >= 0) {
      runningRef.current = false;
      onRunningChange(false);
    }

    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min((now - last) / 1000, 1 / 30);
      last = now;
      const currentScene = sceneRef.current;
      if (reduceMotion) {
        const net = rotationTorques(currentScene, 0).net;
        const theta = Math.abs(net) <= 0.05 ? 0 : net > 0 ? currentScene.maxTheta ?? 0 : currentScene.minTheta ?? 0;
        simulationState = { theta, omega: 0, stoppedAtLimit: Math.abs(net) > 0.05 };
      } else if (runningRef.current) {
        simulationState = stepRotation(currentScene, simulationState, dt * speedRef.current);
      }
      stateRef.current = simulationState;
      draw(simulationState, dt);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      personAsset.onload = null;
      stateRef.current = null;
      stage.destroy();
    };
  }, [containerRef, onRunningChange, resetSignal, seekSeconds, seekToken, size]);

  return <div ref={containerRef} className="h-full w-full overflow-hidden rounded-lg bg-[#0f172a]" />;
}
