"use client";

import { useEffect, useRef } from "react";
import Konva from "konva";
import type { VariableCurrentInductionScene } from "../../engines/electromagnetic-induction/types";
import {
  initialVariableCurrentState,
  stepVariableCurrentInduction,
} from "../../engines/electromagnetic-induction/physics";
import { useContainerSize } from "../../shared/use-container-size";

type Props = {
  scene: VariableCurrentInductionScene;
  running: boolean;
  resetSignal: number;
  onRunningChange: (running: boolean) => void;
  speed?: number;
};

const DESIGN_WIDTH = 1000;
const DESIGN_HEIGHT = 600;

function addTag(layer: Konva.Layer, number: number, label: string, x: number, y: number) {
  const group = new Konva.Group({ x, y, listening: false });
  group.add(
    new Konva.Circle({ radius: 16, fill: "#fff", stroke: "#334155", strokeWidth: 2 }),
    new Konva.Text({ x: -12, y: -8, width: 24, text: String(number), align: "center", fontSize: 14, fontStyle: "bold", fill: "#0f172a" }),
    new Konva.Text({ x: 22, y: -9, text: label, fontSize: 14, fontStyle: "bold", fill: "#334155" }),
  );
  layer.add(group);
}

export function SceneKonvaVariableCurrentInduction({
  scene,
  running,
  resetSignal,
  onRunningChange,
  speed = 1,
}: Props) {
  const { ref, size } = useContainerSize<HTMLDivElement>();
  const runningRef = useRef(running);
  const speedRef = useRef(speed);

  useEffect(() => { runningRef.current = running; }, [running]);
  useEffect(() => { speedRef.current = speed; }, [speed]);

  useEffect(() => {
    const container = ref.current;
    const { width, height } = size;
    if (!container || !width || !height) return;

    const stage = new Konva.Stage({ container, width, height });
    const layer = new Konva.Layer();
    stage.add(layer);
    layer.add(new Konva.Rect({ x: 0, y: 0, width, height, fill: "#eef3f7" }));

    const scale = Math.min(width / DESIGN_WIDTH, height / DESIGN_HEIGHT);
    const board = new Konva.Group({
      x: (width - DESIGN_WIDTH * scale) / 2,
      y: (height - DESIGN_HEIGHT * scale) / 2,
      scaleX: scale,
      scaleY: scale,
    });
    layer.add(board);
    board.add(
      new Konva.Rect({ x: 16, y: 16, width: 968, height: 568, cornerRadius: 18, fill: "#f8fafc", stroke: "#cbd5e1", strokeWidth: 2 }),
      new Konva.Text({ x: 42, y: 36, text: "Đóng/ngắt khoá K hoặc kéo con chạy biến trở", fontSize: 18, fontStyle: "bold", fill: "#1e293b" }),
      new Konva.Text({ x: 42, y: 62, text: "Quan sát kim điện kế trong lúc dòng điện qua nam châm điện biến thiên", fontSize: 14, fill: "#64748b" }),
    );

    const blue = "#2563eb";
    const red = "#dc2626";
    const wire = (points: number[], color: string) => board.add(new Konva.Line({ points, stroke: color, strokeWidth: 4, lineCap: "round", lineJoin: "round" }));

    // Mạch cuộn dây kín nối điện kế.
    wire([160, 314, 160, 430, 300, 430, 300, 360], blue);
    wire([120, 314, 120, 470, 360, 470, 360, 360], red);

    // Mạch sơ cấp: nguồn, nam châm điện, biến trở và khoá K.
    wire([500, 300, 500, 145, 670, 145], blue);
    wire([805, 145, 925, 145, 925, 428], blue);
    wire([875, 428, 830, 428, 830, 456], blue);
    wire([670, 456, 555, 456, 555, 300], red);

    // Điện kế (3).
    const meter = new Konva.Group({ x: 140, y: 260 });
    board.add(meter);
    meter.add(
      new Konva.Rect({ x: -70, y: -74, width: 140, height: 128, cornerRadius: 12, fill: "#e5e7eb", stroke: "#475569", strokeWidth: 3, shadowColor: "#94a3b8", shadowBlur: 8, shadowOpacity: 0.28 }),
      new Konva.Arc({ x: 0, y: -2, innerRadius: 51, outerRadius: 55, angle: 180, rotation: 180, fill: "#475569" }),
      new Konva.Text({ x: -52, y: 24, width: 104, text: "ĐIỆN KẾ", align: "center", fontSize: 13, fontStyle: "bold", fill: "#334155" }),
      new Konva.Circle({ x: -20, y: 54, radius: 7, fill: blue, stroke: "#1e3a8a", strokeWidth: 2 }),
      new Konva.Circle({ x: 20, y: 54, radius: 7, fill: red, stroke: "#7f1d1d", strokeWidth: 2 }),
    );
    for (let i = 0; i <= 10; i += 1) {
      const angle = Math.PI + Math.PI * i / 10;
      meter.add(new Konva.Line({
        points: [Math.cos(angle) * 42, Math.sin(angle) * 42 - 2, Math.cos(angle) * 51, Math.sin(angle) * 51 - 2],
        stroke: i === 5 ? red : "#64748b",
        strokeWidth: i === 5 ? 2 : 1,
      }));
    }
    meter.add(new Konva.Text({ x: -8, y: -48, width: 16, text: "0", align: "center", fontSize: 11, fontStyle: "bold", fill: red }));
    const needle = new Konva.Line({ x: 0, y: -2, points: [0, 0, 0, -42], stroke: red, strokeWidth: 3, lineCap: "round" });
    meter.add(needle, new Konva.Circle({ x: 0, y: -2, radius: 5, fill: "#334155" }));

    // Cuộn dây kín (2).
    const secondary = new Konva.Group({ x: 330, y: 320 });
    board.add(secondary);
    secondary.add(new Konva.Rect({ x: -54, y: -47, width: 108, height: 94, cornerRadius: 9, fill: "#9a5d35", stroke: "#6b3d22", strokeWidth: 3 }));
    for (let i = 0; i < 14; i += 1) secondary.add(new Konva.Ellipse({ x: -42 + i * 6.5, y: 0, radiusX: 12, radiusY: 39, stroke: "#f59e0b", strokeWidth: 2.4 }));

    // Nam châm điện (1): lõi sắt và cuộn sơ cấp.
    const electromagnet = new Konva.Group({ x: 510, y: 320 });
    board.add(electromagnet);
    electromagnet.add(
      new Konva.Rect({ x: -98, y: -18, width: 196, height: 36, cornerRadius: 6, fill: "#64748b", stroke: "#334155", strokeWidth: 3 }),
      new Konva.Rect({ x: -82, y: -42, width: 72, height: 84, cornerRadius: 8, fill: "#8b5e3c", stroke: "#5f3c27", strokeWidth: 2 }),
      new Konva.Rect({ x: 10, y: -42, width: 72, height: 84, cornerRadius: 8, fill: "#8b5e3c", stroke: "#5f3c27", strokeWidth: 2 }),
    );
    for (const offset of [-46, 46]) {
      for (let i = 0; i < 10; i += 1) electromagnet.add(new Konva.Ellipse({ x: offset - 27 + i * 6, y: 0, radiusX: 10, radiusY: 34, stroke: "#ef7d32", strokeWidth: 2.3 }));
    }

    // Nguồn điện (5).
    const supply = new Konva.Group({ x: 738, y: 145 });
    board.add(supply);
    supply.add(
      new Konva.Rect({ x: -68, y: -48, width: 136, height: 96, cornerRadius: 12, fill: "#e2e8f0", stroke: "#475569", strokeWidth: 3 }),
      new Konva.Text({ x: -45, y: -30, width: 90, text: "NGUỒN DC", align: "center", fontSize: 13, fontStyle: "bold", fill: "#334155" }),
      new Konva.Circle({ x: -34, y: 18, radius: 9, fill: blue, stroke: "#1e3a8a", strokeWidth: 2 }),
      new Konva.Circle({ x: 34, y: 18, radius: 9, fill: red, stroke: "#7f1d1d", strokeWidth: 2 }),
      new Konva.Text({ x: -45, y: 9, width: 22, text: "-", align: "center", fontSize: 18, fill: "#fff" }),
      new Konva.Text({ x: 23, y: 9, width: 22, text: "+", align: "center", fontSize: 18, fill: "#fff" }),
    );

    // Biến trở (6), con chạy kéo ngang.
    const rheostat = new Konva.Group({ x: 750, y: 456 });
    board.add(rheostat);
    rheostat.add(
      new Konva.Rect({ x: -80, y: -45, width: 160, height: 90, cornerRadius: 10, fill: "#d7a06b", stroke: "#7c4a28", strokeWidth: 3 }),
      new Konva.Rect({ x: -58, y: -16, width: 116, height: 32, cornerRadius: 14, fill: "#b45309", stroke: "#7c2d12", strokeWidth: 2 }),
      new Konva.Line({ points: [-58, -27, 58, -27], stroke: "#475569", strokeWidth: 5, lineCap: "round" }),
    );
    let rheostatFraction = 0.55;
    const slider = new Konva.Group({ x: 4, y: -27, draggable: true });
    slider.add(
      new Konva.Rect({ x: -10, y: -21, width: 20, height: 31, cornerRadius: 5, fill: "#f8fafc", stroke: "#334155", strokeWidth: 2 }),
      new Konva.Line({ points: [0, 10, 0, 30], stroke: "#334155", strokeWidth: 4 }),
    );
    rheostat.add(slider);
    slider.on("dragstart", () => { runningRef.current = true; onRunningChange(true); });
    slider.on("dragmove", () => {
      slider.x(Math.max(-58, Math.min(58, slider.x())));
      slider.y(-27);
      rheostatFraction = (slider.x() + 58) / 116;
    });
    slider.on("mouseenter", () => { stage.container().style.cursor = "grab"; });
    slider.on("mouseleave", () => { stage.container().style.cursor = "default"; });

    // Khoá K (4), bấm để đóng hoặc ngắt.
    let switchClosed = false;
    const switchGroup = new Konva.Group({ x: 900, y: 423 });
    board.add(switchGroup);
    const switchBase = new Konva.Rect({ x: -50, y: -28, width: 100, height: 66, cornerRadius: 10, fill: "#d7a06b", stroke: "#7c4a28", strokeWidth: 3 });
    const switchArm = new Konva.Line({ points: [-25, 5, 24, -15], stroke: "#334155", strokeWidth: 7, lineCap: "round" });
    const switchLabel = new Konva.Text({ x: -34, y: 43, width: 68, text: "K mở", align: "center", fontSize: 13, fontStyle: "bold", fill: "#b91c1c" });
    switchGroup.add(switchBase, new Konva.Circle({ x: -25, y: 5, radius: 7, fill: "#475569" }), new Konva.Circle({ x: 25, y: 5, radius: 7, fill: "#475569" }), switchArm, switchLabel);
    switchGroup.on("click tap", () => {
      switchClosed = !switchClosed;
      switchArm.points(switchClosed ? [-25, 5, 25, 5] : [-25, 5, 24, -15]);
      switchLabel.text(switchClosed ? "K đóng" : "K mở");
      switchLabel.fill(switchClosed ? "#15803d" : "#b91c1c");
      runningRef.current = true;
      onRunningChange(true);
    });
    switchGroup.on("mouseenter", () => { stage.container().style.cursor = "pointer"; });
    switchGroup.on("mouseleave", () => { stage.container().style.cursor = "default"; });

    addTag(board as unknown as Konva.Layer, 3, "Điện kế", 64, 150);
    addTag(board as unknown as Konva.Layer, 2, "Cuộn dây kín", 254, 224);
    addTag(board as unknown as Konva.Layer, 1, "Nam châm điện", 430, 224);
    addTag(board as unknown as Konva.Layer, 5, "Nguồn điện", 676, 78);
    addTag(board as unknown as Konva.Layer, 6, "Biến trở", 666, 370);
    addTag(board as unknown as Konva.Layer, 4, "Khoá K", 858, 342);

    const status = new Konva.Text({ x: 42, y: 532, width: 916, align: "center", fontSize: 15, fontStyle: "bold", fill: "#334155" });
    board.add(status);

    let state = initialVariableCurrentState();
    const draw = () => {
      needle.rotation(state.needle * 70);
      const moving = Math.abs(state.inducedEmf) > 0.002;
      const observation = moving
        ? state.inducedEmf > 0 ? "Kim lệch phải: có dòng điện cảm ứng" : "Kim lệch trái: dòng điện cảm ứng đổi chiều"
        : "Dòng điện sơ cấp ổn định: kim điện kế ở vạch 0";
      status.text(`${observation}   |   I₁ = ${state.primaryCurrent.toFixed(2)} A`);
      layer.batchDraw();
    };
    draw();

    let frame = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min((now - last) / 1000, 1 / 30) * speedRef.current;
      last = now;
      if (runningRef.current) {
        state = stepVariableCurrentInduction(scene, state, switchClosed, rheostatFraction, dt);
        draw();
      }
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(frame);
      stage.destroy();
    };
  }, [scene, size, resetSignal, onRunningChange, ref]);

  return (
    <div
      ref={ref}
      className="h-full w-full overflow-hidden rounded-lg bg-[#eef3f7]"
      role="img"
      aria-label="Mạch thí nghiệm gồm điện kế, cuộn dây kín, nam châm điện, khoá K, nguồn điện và biến trở. Bấm khoá K hoặc kéo con chạy để quan sát cảm ứng điện từ."
    />
  );
}
