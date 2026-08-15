"use client";

import { useEffect, useRef } from "react";
import Konva from "konva";
import type { MagneticScene } from "../../engines/magnetism/types";
import { initialMagneticState, magneticFieldAngle, stepMagnetic } from "../../engines/magnetism/physics";
import { useContainerSize } from "../../shared/use-container-size";

const RAD_TO_DEG = 180 / Math.PI;

export function SceneKonvaMagnetism({
  scene, running, resetSignal, onRunningChange, speed = 1,
}: {
  scene: MagneticScene; running: boolean; resetSignal: number; onRunningChange: (running: boolean) => void; speed?: number;
}) {
  const { ref: containerRef, size } = useContainerSize<HTMLDivElement>();
  const runningRef = useRef(running);
  const speedRef = useRef(speed);

  useEffect(() => { runningRef.current = running; }, [running]);
  useEffect(() => { speedRef.current = speed; }, [speed]);

  useEffect(() => {
    const container = containerRef.current;
    const { width: W, height: H } = size;
    if (!container || !W || !H) return;

    const stage = new Konva.Stage({ container, width: W, height: H });
    const layer = new Konva.Layer();
    stage.add(layer);
    layer.add(new Konva.Rect({ x: 0, y: 0, width: W, height: H, fill: "#f8fafc" }));

    const scale = Math.min(W / 8.5, H / 5.3);
    const center = { x: W * 0.56, y: H * 0.56 };
    const toScreen = (p: { x: number; y: number }) => ({ x: center.x + p.x * scale, y: center.y - p.y * scale });
    for (let x = center.x % (scale * .5); x < W; x += scale * .5) layer.add(new Konva.Line({ points: [x, 0, x, H], stroke: "#e7edf3", strokeWidth: 1 }));
    for (let y = center.y % (scale * .5); y < H; y += scale * .5) layer.add(new Konva.Line({ points: [0, y, W, y], stroke: "#e7edf3", strokeWidth: 1 }));

    const compassCenter = toScreen(scene.compass);
    const diskRadius = scene.compass.length * scale * .55;
    layer.add(new Konva.Circle({ x: compassCenter.x, y: compassCenter.y, radius: diskRadius, fill: "#ffffff", stroke: "#94a3b8", strokeWidth: 3, shadowColor: "#64748b", shadowBlur: 10, shadowOpacity: .17 }));
    layer.add(new Konva.Text({ x: 20, y: 18, text: "Kéo thanh nam châm; đưa các cực lại gần để quan sát kim quay.", fontSize: 15, fill: "#334155" }));

    const needle = new Konva.Group({ x: compassCenter.x, y: compassCenter.y, listening: false });
    const half = scene.compass.length * scale * .46;
    // Hai nửa tam giác riêng: N đỏ, S xanh; không chồng hình lên nhau.
    needle.add(new Konva.Line({ points: [0, -8, half, 0, 0, 8], closed: true, fill: "#dc2626", stroke: "#991b1b", strokeWidth: 1.5 }));
    needle.add(new Konva.Line({ points: [-half, 0, 0, -8, 0, 8], closed: true, fill: "#2563eb", stroke: "#1d4ed8", strokeWidth: 1.5 }));
    needle.add(new Konva.Circle({ radius: 8, fill: "#f8fafc", stroke: "#475569", strokeWidth: 2 }));
    needle.add(new Konva.Text({ x: half - 16, y: -28, text: "N", fontSize: 15, fontStyle: "normal", fill: "#dc2626" }));
    needle.add(new Konva.Text({ x: -half - 4, y: 12, text: "S", fontSize: 15, fontStyle: "normal", fill: "#2563eb" }));
    layer.add(needle);

    const bar = new Konva.Group({ draggable: true });
    const magnetHalf = scene.barMagnet.length * scale / 2;
    const magnetHeight = Math.max(34, scale * .42);
    const north = new Konva.Rect({ x: -magnetHalf, y: -magnetHeight / 2, width: magnetHalf, height: magnetHeight, fill: "#dc2626", stroke: "#7f1d1d", strokeWidth: 2, cornerRadius: 4 });
    const south = new Konva.Rect({ x: 0, y: -magnetHeight / 2, width: magnetHalf, height: magnetHeight, fill: "#2563eb", stroke: "#1e3a8a", strokeWidth: 2, cornerRadius: 4 });
    bar.add(north, south);
    bar.add(new Konva.Text({ x: -magnetHalf, y: -8, width: magnetHalf, text: "N", align: "center", fontSize: 18, fontStyle: "normal", fill: "white", listening: false }));
    bar.add(new Konva.Text({ x: 0, y: -8, width: magnetHalf, text: "S", align: "center", fontSize: 18, fontStyle: "normal", fill: "white", listening: false }));
    layer.add(bar);

    const status = new Konva.Text({ x: 0, y: H - 36, width: W, align: "center", fontSize: 14, fontStyle: "normal", fill: "#475569" });
    layer.add(status);

    let magnet = { ...scene.barMagnet };
    let simState = initialMagneticState();
    const syncMagnet = () => {
      const position = toScreen(magnet);
      bar.position(position);
      // Góc engine là hướng mô-men từ S → N; hình thanh dùng góc N → S nên lệch π.
      bar.rotation(-(magnet.angle - Math.PI) * RAD_TO_DEG);
    };
    const draw = () => {
      needle.rotation(-simState.angle * RAD_TO_DEG);
      const target = magneticFieldAngle(scene, magnet);
      const diff = Math.abs(Math.atan2(Math.sin(target - simState.angle), Math.cos(target - simState.angle)));
      status.text(diff < .11 ? "Kim đã ổn định theo từ trường" : "Kim nam châm đang quay theo từ trường");
      layer.batchDraw();
    };
    syncMagnet(); draw();

    bar.on("dragstart", () => { runningRef.current = true; onRunningChange(true); });
    bar.on("dragmove", () => {
      const p = bar.position();
      magnet = { ...magnet, x: (p.x - center.x) / scale, y: (center.y - p.y) / scale };
      draw();
    });

    let raf = 0, last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min((now - last) / 1000, 1 / 30);
      last = now;
      if (runningRef.current) { simState = stepMagnetic(scene, simState, dt * speedRef.current, magnet); draw(); }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); stage.destroy(); };
  }, [scene, size, resetSignal, onRunningChange, containerRef]);

  return <div ref={containerRef} className="h-full w-full overflow-hidden rounded-lg bg-slate-50" />;
}
