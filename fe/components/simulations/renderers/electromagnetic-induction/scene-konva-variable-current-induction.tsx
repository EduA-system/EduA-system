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
const COLORS = {
  background: "#080d14",
  surface: "#101923",
  surfaceRaised: "#16212d",
  border: "#2b3a48",
  text: "#e5edf5",
  muted: "#8da0b3",
  cyan: "#38bdf8",
  amber: "#fbbf24",
  orange: "#fb923c",
  red: "#fb7185",
  green: "#34d399",
};

function addLabel(container: Konva.Container, number: number, label: string, x: number, y: number) {
  const group = new Konva.Group({ x, y, listening: false });
  group.add(
    new Konva.Circle({ radius: 13, fill: COLORS.surfaceRaised, stroke: COLORS.cyan, strokeWidth: 1.5 }),
    new Konva.Text({ x: -10, y: -7, width: 20, text: String(number), align: "center", fontSize: 12, fontStyle: "bold", fill: COLORS.text }),
    new Konva.Text({ x: 20, y: -8, text: label, fontSize: 13, fontStyle: "bold", fill: COLORS.text }),
  );
  container.add(group);
}

function addGrid(layer: Konva.Layer, width: number, height: number) {
  for (let x = 0; x <= width; x += 40) {
    layer.add(new Konva.Line({ points: [x, 0, x, height], stroke: "#17222d", strokeWidth: 1, listening: false }));
  }
  for (let y = 0; y <= height; y += 40) {
    layer.add(new Konva.Line({ points: [0, y, width, y], stroke: "#17222d", strokeWidth: 1, listening: false }));
  }
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
    layer.add(new Konva.Rect({ x: 0, y: 0, width, height, fill: COLORS.background }));
    addGrid(layer, width, height);

    const scale = Math.min(width / DESIGN_WIDTH, height / DESIGN_HEIGHT);
    const board = new Konva.Group({
      x: (width - DESIGN_WIDTH * scale) / 2,
      y: (height - DESIGN_HEIGHT * scale) / 2,
      scaleX: scale,
      scaleY: scale,
    });
    layer.add(board);

    board.add(
      new Konva.Text({ x: 28, y: 25, text: "CẢM ỨNG ĐIỆN TỪ DO DÒNG ĐIỆN BIẾN THIÊN", fontSize: 17, fontStyle: "bold", fill: COLORS.text }),
      new Konva.Text({ x: 28, y: 52, text: "Bấm khoá K hoặc kéo con chạy. Quan sát dòng sơ cấp, từ thông và kim điện kế.", fontSize: 13, fill: COLORS.muted }),
      new Konva.Line({ points: [28, 84, 972, 84], stroke: COLORS.border, strokeWidth: 1 }),
      new Konva.Text({ x: 70, y: 105, width: 330, text: "MẠCH CẢM ỨNG", align: "center", fontSize: 12, fontStyle: "bold", fill: COLORS.cyan }),
      new Konva.Text({ x: 590, y: 105, width: 330, text: "MẠCH TẠO TỪ TRƯỜNG", align: "center", fontSize: 12, fontStyle: "bold", fill: COLORS.amber }),
    );

    const wire = (points: number[], color = "#62778b", width = 4) => {
      const line = new Konva.Line({ points, stroke: color, strokeWidth: width, lineCap: "round", lineJoin: "round" });
      board.add(line);
      return line;
    };

    // Mạch cảm ứng kín bên trái.
    wire([130, 350, 130, 455, 330, 455, 330, 364], "#64748b");
    wire([178, 350, 178, 415, 390, 415, 390, 364], "#64748b");

    // Mạch sơ cấp bên phải. Đường sáng nét đứt phía trên cho thấy dòng điện đang chạy.
    wire([520, 270, 520, 160, 698, 160], "#64748b");
    wire([822, 160, 930, 160, 930, 400], "#64748b");
    wire([870, 445, 830, 445], "#64748b");
    wire([670, 445, 560, 445, 560, 350], "#64748b");
    const currentPath = new Konva.Line({
      points: [520, 270, 520, 160, 698, 160, 822, 160, 930, 160, 930, 400],
      stroke: COLORS.cyan,
      strokeWidth: 3,
      dash: [12, 10],
      lineCap: "round",
      opacity: 0,
      listening: false,
    });
    board.add(currentPath);

    // Điện kế.
    const meter = new Konva.Group({ x: 154, y: 285 });
    board.add(meter);
    meter.add(
      new Konva.Rect({ x: -78, y: -82, width: 156, height: 142, cornerRadius: 12, fill: COLORS.surface, stroke: "#52677a", strokeWidth: 2 }),
      new Konva.Arc({ x: 0, y: 0, innerRadius: 56, outerRadius: 60, angle: 180, rotation: 180, fill: "#71869a" }),
      new Konva.Text({ x: -55, y: 27, width: 110, text: "ĐIỆN KẾ", align: "center", fontSize: 12, fontStyle: "bold", fill: COLORS.text }),
      new Konva.Circle({ x: -24, y: 60, radius: 7, fill: "#2563eb", stroke: "#93c5fd", strokeWidth: 1.5 }),
      new Konva.Circle({ x: 24, y: 60, radius: 7, fill: "#be123c", stroke: "#fda4af", strokeWidth: 1.5 }),
    );
    for (let i = 0; i <= 10; i += 1) {
      const angle = Math.PI + Math.PI * i / 10;
      meter.add(new Konva.Line({
        points: [Math.cos(angle) * 44, Math.sin(angle) * 44, Math.cos(angle) * 55, Math.sin(angle) * 55],
        stroke: i === 5 ? COLORS.red : COLORS.muted,
        strokeWidth: i === 5 ? 2 : 1,
      }));
    }
    meter.add(new Konva.Text({ x: -8, y: -54, width: 16, text: "0", align: "center", fontSize: 11, fontStyle: "bold", fill: COLORS.red }));
    const needle = new Konva.Line({ points: [0, 0, 0, -48], stroke: COLORS.red, strokeWidth: 3, lineCap: "round" });
    meter.add(needle, new Konva.Circle({ radius: 5, fill: COLORS.text }));

    // Cuộn dây kín và nam châm điện đặt cạnh nhau để nhìn rõ liên kết từ thông.
    const secondary = new Konva.Group({ x: 360, y: 320 });
    board.add(secondary);
    secondary.add(new Konva.Rect({ x: -60, y: -50, width: 120, height: 100, cornerRadius: 9, fill: "#3b210d", stroke: "#9a5b20", strokeWidth: 2 }));
    for (let i = 0; i < 15; i += 1) {
      secondary.add(new Konva.Ellipse({ x: -46 + i * 6.6, y: 0, radiusX: 12, radiusY: 41, stroke: COLORS.amber, strokeWidth: 2.2 }));
    }

    const electromagnet = new Konva.Group({ x: 550, y: 320 });
    board.add(electromagnet);
    electromagnet.add(
      new Konva.Rect({ x: -80, y: -17, width: 160, height: 34, cornerRadius: 5, fill: "#64748b", stroke: "#a8bac9", strokeWidth: 2 }),
      new Konva.Rect({ x: -66, y: -45, width: 52, height: 90, cornerRadius: 7, fill: "#4a2a12", stroke: "#9a5b20", strokeWidth: 2 }),
      new Konva.Rect({ x: 14, y: -45, width: 52, height: 90, cornerRadius: 7, fill: "#4a2a12", stroke: "#9a5b20", strokeWidth: 2 }),
    );
    for (const offset of [-40, 40]) {
      for (let i = 0; i < 8; i += 1) {
        electromagnet.add(new Konva.Ellipse({ x: offset - 21 + i * 6, y: 0, radiusX: 9, radiusY: 36, stroke: COLORS.orange, strokeWidth: 2.2 }));
      }
    }

    const fieldLines = new Konva.Group({ x: 455, y: 320, listening: false, opacity: 0.12 });
    for (const spread of [26, 44, 62]) {
      fieldLines.add(
        new Konva.Line({ points: [-70, -8, -40, -spread, 40, -spread, 70, -8], stroke: COLORS.cyan, strokeWidth: 1.7, tension: 0.45 }),
        new Konva.Line({ points: [-70, 8, -40, spread, 40, spread, 70, 8], stroke: COLORS.cyan, strokeWidth: 1.7, tension: 0.45 }),
      );
    }
    board.add(fieldLines);
    const fluxLabel = new Konva.Text({ x: 410, y: 202, width: 95, text: "Từ thông ổn định", align: "center", fontSize: 11, fontStyle: "bold", fill: COLORS.muted });
    board.add(fluxLabel);

    // Nguồn DC.
    const supply = new Konva.Group({ x: 760, y: 160 });
    board.add(supply);
    supply.add(
      new Konva.Rect({ x: -62, y: -42, width: 124, height: 84, cornerRadius: 10, fill: COLORS.surface, stroke: "#52677a", strokeWidth: 2 }),
      new Konva.Text({ x: -45, y: -26, width: 90, text: "NGUỒN DC", align: "center", fontSize: 12, fontStyle: "bold", fill: COLORS.text }),
      new Konva.Text({ x: -45, y: -5, width: 90, text: `${scene.supplyVoltage.toFixed(1)} V`, align: "center", fontSize: 15, fontStyle: "bold", fill: COLORS.green }),
      new Konva.Circle({ x: -31, y: 41, radius: 7, fill: "#2563eb", stroke: "#93c5fd", strokeWidth: 1.5 }),
      new Konva.Circle({ x: 31, y: 41, radius: 7, fill: "#be123c", stroke: "#fda4af", strokeWidth: 1.5 }),
    );

    // Biến trở kéo ngang.
    const rheostat = new Konva.Group({ x: 750, y: 445 });
    board.add(rheostat);
    rheostat.add(
      new Konva.Rect({ x: -80, y: -48, width: 160, height: 96, cornerRadius: 10, fill: COLORS.surface, stroke: "#52677a", strokeWidth: 2 }),
      new Konva.Line({ points: [-58, 4, 58, 4], stroke: "#5f6f7f", strokeWidth: 12, lineCap: "round" }),
      new Konva.Text({ x: -60, y: 25, width: 120, text: "KÉO ĐỂ ĐỔI R", align: "center", fontSize: 10, fontStyle: "bold", fill: COLORS.muted }),
      new Konva.Text({ x: -63, y: -30, text: "0 Ω", fontSize: 10, fill: COLORS.muted }),
      new Konva.Text({ x: 31, y: -30, width: 35, text: `${scene.rheostatMaxResistance} Ω`, align: "right", fontSize: 10, fill: COLORS.muted }),
    );
    let rheostatFraction = 0.55;
    const resistanceFill = new Konva.Line({ points: [-58, 4, 6, 4], stroke: COLORS.orange, strokeWidth: 12, lineCap: "round" });
    rheostat.add(resistanceFill);
    const slider = new Konva.Group({ x: 6, y: 4, draggable: true });
    slider.add(
      new Konva.Circle({ radius: 14, fill: COLORS.text, stroke: COLORS.orange, strokeWidth: 3 }),
      new Konva.Line({ points: [0, -18, 0, -31], stroke: COLORS.text, strokeWidth: 3, lineCap: "round" }),
      new Konva.Line({ points: [-5, -25, 0, -32, 5, -25], stroke: COLORS.text, strokeWidth: 2, lineCap: "round", lineJoin: "round" }),
    );
    rheostat.add(slider);
    slider.on("dragstart", () => { runningRef.current = true; onRunningChange(true); });
    slider.on("dragmove", () => {
      const x = Math.max(-58, Math.min(58, slider.x()));
      slider.position({ x, y: 4 });
      rheostatFraction = (x + 58) / 116;
      resistanceFill.points([-58, 4, x, 4]);
    });
    slider.on("mouseenter", () => { stage.container().style.cursor = "grab"; });
    slider.on("mouseleave", () => { stage.container().style.cursor = "default"; });

    // Khoá K, vùng bấm lớn và trạng thái viết rõ.
    let switchClosed = false;
    const switchGroup = new Konva.Group({ x: 915, y: 442 });
    board.add(switchGroup);
    const switchBase = new Konva.Rect({ x: -45, y: -42, width: 90, height: 84, cornerRadius: 10, fill: COLORS.surface, stroke: "#52677a", strokeWidth: 2 });
    const leftTerminal = new Konva.Circle({ x: -23, y: 2, radius: 7, fill: "#71869a" });
    const rightTerminal = new Konva.Circle({ x: 23, y: 2, radius: 7, fill: "#71869a" });
    const switchArm = new Konva.Line({ points: [-23, 2, 20, -16], stroke: COLORS.amber, strokeWidth: 7, lineCap: "round" });
    const switchLabel = new Konva.Text({ x: -38, y: 23, width: 76, text: "K MỞ", align: "center", fontSize: 11, fontStyle: "bold", fill: COLORS.red });
    switchGroup.add(switchBase, leftTerminal, rightTerminal, switchArm, switchLabel);
    switchGroup.on("click tap", () => {
      switchClosed = !switchClosed;
      switchArm.points(switchClosed ? [-23, 2, 23, 2] : [-23, 2, 20, -16]);
      switchArm.stroke(switchClosed ? COLORS.green : COLORS.amber);
      switchLabel.text(switchClosed ? "K ĐÓNG" : "K MỞ");
      switchLabel.fill(switchClosed ? COLORS.green : COLORS.red);
      runningRef.current = true;
      onRunningChange(true);
    });
    switchGroup.on("mouseenter", () => { stage.container().style.cursor = "pointer"; });
    switchGroup.on("mouseleave", () => { stage.container().style.cursor = "default"; });

    addLabel(board, 3, "Điện kế", 74, 166);
    addLabel(board, 2, "Cuộn dây kín", 300, 166);
    addLabel(board, 1, "Nam châm điện", 460, 392);
    addLabel(board, 5, "Nguồn điện", 570, 132);
    addLabel(board, 6, "Biến trở", 673, 374);
    addLabel(board, 4, "Khoá K", 870, 374);

    const statusPanel = new Konva.Rect({ x: 28, y: 515, width: 944, height: 58, cornerRadius: 10, fill: COLORS.surface, stroke: COLORS.border, strokeWidth: 1.5 });
    const observation = new Konva.Text({ x: 48, y: 528, width: 560, fontSize: 13, fontStyle: "bold", fill: COLORS.text });
    const readout = new Konva.Text({ x: 615, y: 528, width: 337, align: "right", fontSize: 13, fontFamily: "monospace", fill: COLORS.cyan });
    const hint = new Konva.Text({ x: 48, y: 549, width: 560, text: "Dòng điện chỉ xuất hiện trong cuộn kín khi từ thông đang thay đổi.", fontSize: 11, fill: COLORS.muted });
    board.add(statusPanel, observation, readout, hint);

    let state = initialVariableCurrentState();
    let previousCurrent = 0;
    let dashOffset = 0;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const draw = () => {
      needle.rotation(state.needle * 70);
      const changing = Math.abs(state.inducedEmf) > 0.002;
      const currentRate = state.primaryCurrent - previousCurrent;
      const fieldStrength = Math.min(0.9, 0.12 + state.primaryCurrent * 1.8);
      fieldLines.opacity(fieldStrength);
      currentPath.opacity(switchClosed && state.primaryCurrent > 0.005 ? 0.95 : 0);
      if (!reduceMotion && switchClosed) {
        dashOffset = (dashOffset - 1.4) % 22;
        currentPath.dashOffset(dashOffset);
      }
      fluxLabel.text(changing ? (currentRate >= 0 ? "Từ thông đang tăng" : "Từ thông đang giảm") : "Từ thông ổn định");
      fluxLabel.fill(changing ? COLORS.cyan : COLORS.muted);
      observation.text(
        changing
          ? state.inducedEmf > 0
            ? "Kim lệch phải: xuất hiện dòng điện cảm ứng"
            : "Kim lệch trái: dòng cảm ứng đổi chiều"
          : switchClosed
            ? "Dòng sơ cấp đã ổn định: kim trở về vạch 0"
            : "Mạch sơ cấp đang hở: chưa có dòng điện",
      );
      observation.fill(changing ? COLORS.green : COLORS.text);
      const resistance = scene.primaryResistance + rheostatFraction * scene.rheostatMaxResistance;
      readout.text(`R = ${resistance.toFixed(1)} Ω    I₁ = ${state.primaryCurrent.toFixed(2)} A`);
      previousCurrent = state.primaryCurrent;
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
      className="h-full w-full overflow-hidden rounded-lg bg-[#080d14]"
      role="img"
      aria-label="Mạch cảm ứng điện từ nền tối gồm điện kế, cuộn dây kín, nam châm điện, nguồn, biến trở và khoá K. Bấm khoá K hoặc kéo con chạy biến trở để quan sát dòng điện cảm ứng."
    />
  );
}