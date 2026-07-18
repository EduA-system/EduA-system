"use client";

// Renderer cho engine rotation. Mọi tính toán theta, omega, alpha nằm trong
// engines/rotation; file này chỉ chuyển trạng thái đó thành đĩa, dây và quả cân.

import { useEffect, useRef } from "react";
import Konva from "konva";
import type { RotationScene, RotationState } from "../../engines/rotation/types";
import { initialRotationState, rotationStateAt, rotationTorques, stepRotation } from "../../engines/rotation/physics";
import { useContainerSize } from "../../shared/use-container-size";

const RAD_TO_DEG = 180 / Math.PI;

function blockSize(mass: number): number {
  return Math.min(42, Math.max(24, 20 + mass * 4));
}

export function SceneKonvaRotation({
  scene,
  running,
  resetSignal,
  onRunningChange,
  seekSeconds,
  seekToken,
  markLabel,
  speed = 1,
}: {
  scene: RotationScene;
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

    layer.add(new Konva.Rect({ x: 0, y: 0, width: W, height: H, fill: "#0f172a" }));

    const center = { x: W * 0.5, y: H * 0.43 };
    const diskPx = Math.min(W * 0.22, H * 0.26);
    const scale = diskPx / scene.diskRadius;
    const floorY = Math.min(H - 22, center.y + diskPx + scene.ropeLength * scale + 56);

    for (let x = 0; x <= W; x += 38) {
      layer.add(new Konva.Line({ points: [x, 0, x, H], stroke: "#17233a", strokeWidth: 1, listening: false }));
    }
    for (let y = 0; y <= H; y += 38) {
      layer.add(new Konva.Line({ points: [0, y, W, y], stroke: "#17233a", strokeWidth: 1, listening: false }));
    }

    layer.add(new Konva.Line({ points: [0, floorY, W, floorY], stroke: "#475569", strokeWidth: 3, listening: false }));
    layer.add(new Konva.Rect({ x: center.x - 52, y: center.y + diskPx + 2, width: 104, height: 10, fill: "#64748b", cornerRadius: 3 }));
    layer.add(new Konva.Line({ points: [center.x - 28, center.y + diskPx + 12, center.x, center.y + diskPx + 58, center.x + 28, center.y + diskPx + 12], closed: true, fill: "#334155", stroke: "#94a3b8", strokeWidth: 2 }));

    const wheel = new Konva.Group({ x: center.x, y: center.y, listening: false });
    layer.add(wheel);
    wheel.add(new Konva.Circle({ radius: diskPx, fill: "#0f6faf", opacity: 0.23, stroke: "#38bdf8", strokeWidth: 4 }));
    const ringRadii = [0.24, 0.42, 0.6, 0.78, 1].map((ratio) => diskPx * ratio);
    for (const radius of ringRadii) {
      wheel.add(new Konva.Circle({ radius, stroke: "#38bdf8", strokeWidth: radius === diskPx ? 4 : 2, opacity: 0.95 }));
    }
    for (let i = 0; i < 8; i += 1) {
      const angle = (i * Math.PI) / 4;
      wheel.add(new Konva.Line({ points: [0, 0, Math.cos(angle) * diskPx * 0.92, Math.sin(angle) * diskPx * 0.92], stroke: "#7dd3fc", strokeWidth: 2, opacity: 0.72 }));
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

    const leftBox = new Konva.Rect({ cornerRadius: 5, fill: scene.left.color, stroke: "#e2e8f0", strokeWidth: 1.5, shadowColor: "#000", shadowBlur: 6, shadowOpacity: 0.35 });
    const rightBox = new Konva.Rect({ cornerRadius: 5, fill: scene.right.color, stroke: "#e2e8f0", strokeWidth: 1.5, shadowColor: "#000", shadowBlur: 6, shadowOpacity: 0.35 });
    const leftText = new Konva.Text({ fontSize: 11, fontStyle: "bold", fill: "#fff", align: "center", fontFamily: "monospace" });
    const rightText = new Konva.Text({ fontSize: 11, fontStyle: "bold", fill: "#fff", align: "center", fontFamily: "monospace" });
    leftMass.add(leftBox, leftText);
    rightMass.add(rightBox, rightText);

    const leftWeightArrow = new Konva.Arrow({ points: [], stroke: "#93c5fd", fill: "#93c5fd", strokeWidth: 2.5, pointerLength: 7, pointerWidth: 7 });
    const rightWeightArrow = new Konva.Arrow({ points: [], stroke: "#f9a8d4", fill: "#f9a8d4", strokeWidth: 2.5, pointerLength: 7, pointerWidth: 7 });
    const leftWeightLabel = new Konva.Text({ text: "P₁", fontSize: 12, fontStyle: "bold", fill: "#93c5fd", fontFamily: "monospace" });
    const rightWeightLabel = new Konva.Text({ text: "P₂", fontSize: 12, fontStyle: "bold", fill: "#f9a8d4", fontFamily: "monospace" });
    layer.add(leftWeightArrow, rightWeightArrow, leftWeightLabel, rightWeightLabel);

    const info = new Konva.Text({ x: 16, y: 16, fontSize: 12, fill: "#e2e8f0", fontFamily: "monospace", lineHeight: 1.55 });
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
      status.text(state.stoppedAtLimit ? "Đã tới giới hạn hành trình dây" : direction);
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
