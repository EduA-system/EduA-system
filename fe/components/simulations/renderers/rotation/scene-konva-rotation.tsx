"use client";

// Renderer cho engine rotation. Mọi tính toán theta, omega, alpha nằm trong
// engines/rotation; file này chỉ chuyển trạng thái đó thành đĩa, dây và quả cân.

import { useEffect, useRef } from "react";
import Konva from "konva";
import type { RotationScene, RotationState } from "../../engines/rotation/types";
import { initialRotationState, rotationStateAt, rotationTorques, stepRotation } from "../../engines/rotation/physics";
import { useContainerSize } from "../../shared/use-container-size";
import { SceneKonvaSeesaw } from "./scene-konva-seesaw";

const RAD_TO_DEG = 180 / Math.PI;

function blockSize(mass: number): number {
  return Math.min(42, Math.max(24, 20 + mass * 4));
}

type RotationRendererProps = {
  scene: RotationScene;
  running: boolean;
  resetSignal: number;
  onRunningChange: (running: boolean) => void;
  seekSeconds?: number;
  seekToken?: number;
  markLabel?: string;
  speed?: number;
};

export function SceneKonvaRotation(props: RotationRendererProps) {
  if (props.scene.variant === "seesaw") return <SceneKonvaSeesaw {...props} />;
  return <SceneKonvaDiskRotation {...props} />;
}

function SceneKonvaDiskRotation({
  scene,
  running,
  resetSignal,
  onRunningChange,
  seekSeconds,
  seekToken,
  markLabel,
  speed = 1,
}: RotationRendererProps) {
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

    layer.add(new Konva.Rect({ x: 0, y: 0, width: W, height: H, fill: "#0f172a" }));

    const center = { x: W * 0.5, y: H * 0.38 };
    const diskPx = Math.min(W * 0.2, H * 0.25);
    const scale = diskPx / scene.diskRadius;
    const baseY = H - 38;
    const standX = center.x;

    for (let x = 0; x <= W; x += 38) {
      layer.add(new Konva.Line({ points: [x, 0, x, H], stroke: "#17233a", strokeWidth: 1, listening: false }));
    }
    for (let y = 0; y <= H; y += 38) {
      layer.add(new Konva.Line({ points: [0, y, W, y], stroke: "#17233a", strokeWidth: 1, listening: false }));
    }

    const metal = "#64748b";
    const metalDark = "#334155";
    const accent = "#2dd4bf";
    layer.add(new Konva.Rect({ x: 28, y: baseY + 7, width: W - 56, height: 14, fill: "#08111f", opacity: 0.62, cornerRadius: 4, listening: false }));
    layer.add(new Konva.Rect({ x: 34, y: baseY, width: W - 68, height: 15, fill: metalDark, stroke: metal, strokeWidth: 2, cornerRadius: 4, listening: false }));
    const postGap = diskPx + 8;
    layer.add(new Konva.Line({ points: [standX, baseY, standX, center.y + postGap], stroke: "#1e293b", strokeWidth: 13, lineCap: "round", listening: false }));
    layer.add(new Konva.Line({ points: [standX, baseY, standX, center.y + postGap], stroke: metal, strokeWidth: 7, lineCap: "round", listening: false }));
    layer.add(new Konva.Line({ points: [standX, center.y - postGap, standX, 38], stroke: "#1e293b", strokeWidth: 13, lineCap: "round", listening: false }));
    layer.add(new Konva.Line({ points: [standX, center.y - postGap, standX, 38], stroke: metal, strokeWidth: 7, lineCap: "round", listening: false }));
    layer.add(new Konva.Line({ points: [standX - 54, baseY, standX + 54, baseY], stroke: "#94a3b8", strokeWidth: 8, lineCap: "round", listening: false }));
    layer.add(new Konva.Line({ points: [standX - 54, baseY - 3, standX + 54, baseY - 3], stroke: accent, strokeWidth: 2, opacity: 0.8, lineCap: "round", listening: false }));

    const wheel = new Konva.Group({ x: center.x, y: center.y, listening: false });
    layer.add(wheel);
    wheel.add(new Konva.Circle({ radius: diskPx, fill: "#0f766e", opacity: 0.2, stroke: accent, strokeWidth: 4 }));
    const ringRadii = [0.24, 0.42, 0.6, 0.78, 1].map((ratio) => diskPx * ratio);
    for (const radius of ringRadii) {
      wheel.add(new Konva.Circle({ radius, stroke: radius === diskPx ? accent : "#5eead4", strokeWidth: radius === diskPx ? 4 : 2, opacity: 0.9 }));
    }
    for (let i = 0; i < 8; i += 1) {
      const angle = (i * Math.PI) / 4;
      wheel.add(new Konva.Line({ points: [0, 0, Math.cos(angle) * diskPx * 0.92, Math.sin(angle) * diskPx * 0.92], stroke: "#99f6e4", strokeWidth: 2, opacity: 0.62 }));
    }
    wheel.add(new Konva.Circle({ radius: 13, fill: "#e2e8f0", stroke: "#334155", strokeWidth: 3 }));
    wheel.add(new Konva.Circle({ radius: 4, fill: "#475569" }));

    const leftMarker = new Konva.Line({ stroke: scene.left.color, strokeWidth: 4, lineCap: "round" });
    const rightMarker = new Konva.Line({ stroke: scene.right.color, strokeWidth: 4, lineCap: "round" });
    wheel.add(leftMarker, rightMarker);

    const leftRope = new Konva.Line({ stroke: "#e2e8f0", strokeWidth: 2.5, lineCap: "round" });
    const rightRope = new Konva.Line({ stroke: "#e2e8f0", strokeWidth: 2.5, lineCap: "round" });
    layer.add(leftRope, rightRope);

    const leftMass = new Konva.Group();
    const rightMass = new Konva.Group();
    layer.add(leftMass, rightMass);

    const leftBox = new Konva.Rect({ cornerRadius: 5, fill: scene.left.color, stroke: "#e2e8f0", strokeWidth: 1.5, shadowColor: "#020617", shadowBlur: 6, shadowOpacity: 0.35 });
    const rightBox = new Konva.Rect({ cornerRadius: 5, fill: scene.right.color, stroke: "#e2e8f0", strokeWidth: 1.5, shadowColor: "#020617", shadowBlur: 6, shadowOpacity: 0.35 });
    const leftText = new Konva.Text({ fontSize: 11, fontStyle: "bold", fill: "#0f172a", align: "center", fontFamily: "monospace" });
    const rightText = new Konva.Text({ fontSize: 11, fontStyle: "bold", fill: "#0f172a", align: "center", fontFamily: "monospace" });
    leftMass.add(leftBox, leftText);
    rightMass.add(rightBox, rightText);

    const leftWeightArrow = new Konva.Arrow({ points: [], stroke: accent, fill: accent, strokeWidth: 2.5, pointerLength: 7, pointerWidth: 7 });
    const rightWeightArrow = new Konva.Arrow({ points: [], stroke: "#cbd5e1", fill: "#cbd5e1", strokeWidth: 2.5, pointerLength: 7, pointerWidth: 7 });
    const leftWeightLabel = new Konva.Text({ text: "P₁", fontSize: 12, fontStyle: "bold", fill: accent, fontFamily: "monospace" });
    const rightWeightLabel = new Konva.Text({ text: "P₂", fontSize: 12, fontStyle: "bold", fill: "#cbd5e1", fontFamily: "monospace" });
    layer.add(leftWeightArrow, rightWeightArrow, leftWeightLabel, rightWeightLabel);

    layer.add(new Konva.Rect({ x: 16, y: 16, width: 220, height: 90, fill: "#111c2f", opacity: 0.94, stroke: "#334155", strokeWidth: 1, cornerRadius: 12, listening: false }));
    const info = new Konva.Text({ x: 30, y: 29, width: 194, fontSize: 12, fill: "#e2e8f0", fontFamily: "monospace", lineHeight: 1.55 });
    const status = new Konva.Text({ x: 0, y: H - 44, width: W, align: "center", fontSize: 12, fontStyle: "bold", fill: "#fbbf24", fontFamily: "monospace" });
    layer.add(info, status);

    const draw = (state: RotationState) => {
      const cosine = Math.cos(state.theta);
      const sine = Math.sin(state.theta);
      const leftAnchor = { x: center.x - scene.left.radius * scale * cosine, y: center.y + scene.left.radius * scale * sine };
      const rightAnchor = { x: center.x + scene.right.radius * scale * cosine, y: center.y - scene.right.radius * scale * sine };
      // Điểm gắn quay cùng đĩa, nhưng quả cân treo tự do nên dây luôn thẳng đứng.
      // Chiều dài dây không đổi; quả cân chỉ đi lên/xuống theo điểm gắn.
      const ropePx = scene.ropeLength * scale;
      const leftEnd = { x: leftAnchor.x, y: leftAnchor.y + ropePx };
      const rightEnd = { x: rightAnchor.x, y: rightAnchor.y + ropePx };
      const leftSize = blockSize(scene.left.mass);
      const rightSize = blockSize(scene.right.mass);

      wheel.rotation(-state.theta * RAD_TO_DEG);
      leftMarker.points([-scene.left.radius * scale, 0, -scene.left.radius * scale, diskPx * 0.16]);
      rightMarker.points([scene.right.radius * scale, 0, scene.right.radius * scale, diskPx * 0.16]);

      leftRope.points([leftAnchor.x, leftAnchor.y, leftEnd.x, leftEnd.y]);
      rightRope.points([rightAnchor.x, rightAnchor.y, rightEnd.x, rightEnd.y]);

      leftMass.position(leftEnd);
      rightMass.position(rightEnd);
      leftBox.position({ x: -leftSize / 2, y: -leftSize / 2 });
      leftBox.size({ width: leftSize, height: leftSize });
      rightBox.position({ x: -rightSize / 2, y: -rightSize / 2 });
      rightBox.size({ width: rightSize, height: rightSize });
      leftText.position({ x: -leftSize / 2, y: -7 });
      leftText.width(leftSize);
      leftText.text(`${scene.left.mass.toFixed(1)} kg`);
      rightText.position({ x: -rightSize / 2, y: -7 });
      rightText.width(rightSize);
      rightText.text(`${scene.right.mass.toFixed(1)} kg`);

      leftWeightArrow.points([leftEnd.x - leftSize * 0.65, leftEnd.y - 12, leftEnd.x - leftSize * 0.65, leftEnd.y + 28]);
      rightWeightArrow.points([rightEnd.x + rightSize * 0.65, rightEnd.y - 12, rightEnd.x + rightSize * 0.65, rightEnd.y + 28]);
      leftWeightLabel.position({ x: leftEnd.x - leftSize * 0.65 - 20, y: leftEnd.y + 30 });
      rightWeightLabel.position({ x: rightEnd.x + rightSize * 0.65 + 8, y: rightEnd.y + 30 });

      const torques = rotationTorques(scene, state.theta);
      const balanced = Math.abs(torques.net) < 1e-6;
      const direction = balanced ? "Cân bằng" : torques.net > 0 ? "Quay ngược chiều kim đồng hồ" : "Quay theo chiều kim đồng hồ";
      info.text(`M₁ = P₁·d₁ = ${torques.left.toFixed(2)} N·m\nM₂ = P₂·d₂ = ${torques.right.toFixed(2)} N·m\nΣM = ${torques.net.toFixed(2)} N·m\nθ = ${(state.theta * RAD_TO_DEG).toFixed(1)}°   ω = ${state.omega.toFixed(2)} rad/s`);
      status.text(state.stoppedAtLimit ? "Đĩa đã dừng ở giới hạn hành trình dây" : direction);
      layer.batchDraw();
    };

    let simState = seekToken && seekSeconds != null && seekSeconds >= 0 ? rotationStateAt(scene, seekSeconds) : initialRotationState(scene);
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
        simState = stepRotation(scene, simState, dt * speedRef.current);
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

  return <div ref={containerRef} className="h-full w-full overflow-hidden rounded-lg bg-[#0f172a]" />;
}
