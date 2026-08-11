"use client";
import { useEffect, useRef } from "react";
import Konva from "konva";
import type { ParallelCurrentSheetsScene } from "../../engines/parallel-current-sheets/types";
import { currentSheetForce, initialCurrentSheetsState, stepCurrentSheets } from "../../engines/parallel-current-sheets/physics";
import { useContainerSize } from "../../shared/use-container-size";

const RAD_TO_DEG = 180 / Math.PI;

/** Asset Konva tái dùng: kẹp chữ U, bu-lông và má kẹp giữ cố định đầu trên của tấm. */
function addClamp(layer: Konva.Container, x: number, y: number) {
  layer.add(new Konva.Rect({ x: x - 37, y: y - 13, width: 74, height: 26, cornerRadius: 5, fill: "#64748b", stroke: "#334155", strokeWidth: 2 }));
  layer.add(new Konva.Rect({ x: x - 19, y: y - 5, width: 38, height: 36, cornerRadius: 3, fill: "#cbd5e1", stroke: "#475569", strokeWidth: 2 }));
  for (const dx of [-28, 28]) {
    layer.add(new Konva.Circle({ x: x + dx, y, radius: 6, fill: "#e2e8f0", stroke: "#334155", strokeWidth: 2 }));
    layer.add(new Konva.Line({ points: [x + dx - 3, y, x + dx + 3, y], stroke: "#334155", strokeWidth: 1.5 }));
  }
}

export function SceneKonvaParallelCurrentSheets({ scene, running, resetSignal, onRunningChange, speed = 1 }: {
  scene: ParallelCurrentSheetsScene; running: boolean; resetSignal: number; onRunningChange: (running: boolean) => void; speed?: number;
}) {
  const { ref, size } = useContainerSize<HTMLDivElement>();
  const runningRef = useRef(running); const speedRef = useRef(speed);
  useEffect(() => { runningRef.current = running; }, [running]);
  useEffect(() => { speedRef.current = speed; }, [speed]);

  useEffect(() => {
    const container = ref.current; const { width: W, height: H } = size;
    if (!container || !W || !H) return;
    const stage = new Konva.Stage({ container, width: W, height: H });
    const layer = new Konva.Layer(); stage.add(layer);
    layer.add(new Konva.Rect({ x: 0, y: 0, width: W, height: H, fill: "#f8fafc" }));

    const beamY = H * .16, pivotY = H * .27, plateH = H * .43;
    const scale = Math.min(W * .9 / .8, H);
    const baseL = W / 2 - scene.separation * scale / 2, baseR = W / 2 + scene.separation * scale / 2;
    layer.add(new Konva.Rect({ x: W * .14, y: beamY - 12, width: W * .72, height: 24, cornerRadius: 4, fill: "#d4a574", stroke: "#8a5a34", strokeWidth: 2 }));
    layer.add(new Konva.Text({ x: 18, y: 18, text: "Đầu trên được kẹp cố định — chỉ phần dưới lệch do lực từ", fontSize: 15, fill: "#334155" }));
    for (const x of [baseL, baseR]) {
      layer.add(new Konva.Line({ points: [x, beamY + 12, x, pivotY - 13], stroke: "#64748b", strokeWidth: 8, lineCap: "round" }));
      addClamp(layer, x, pivotY);
    }

    const left = new Konva.Group({ x: baseL, y: pivotY + 22 });
    const right = new Konva.Group({ x: baseR, y: pivotY + 22 });
    layer.add(left, right);
    const addPlate = (group: Konva.Group, label: string, color: string) => {
      group.add(new Konva.Rect({ x: -27, y: 0, width: 54, height: plateH, cornerRadius: 4, fill: "#b9c3cc", stroke: "#475569", strokeWidth: 2, shadowColor: "#64748b", shadowBlur: 5, shadowOpacity: .22 }));
      group.add(new Konva.Rect({ x: -16, y: 4, width: 32, height: 11, cornerRadius: 2, fill: "#94a3b8" }));
      group.add(new Konva.Arrow({ points: [0, plateH - 22, 0, 34], stroke: color, fill: color, strokeWidth: 4, pointerLength: 10, pointerWidth: 10 }));
      group.add(new Konva.Text({ x: -38, y: plateH + 12, width: 76, align: "center", text: label, fontSize: 14, fontStyle: "bold", fill: "#334155" }));
    };
    addPlate(left, "Tấm trái", "#e11d48"); addPlate(right, "Tấm phải", "#2563eb");
    const leftCurrentArrow = left.findOne("Arrow") as Konva.Arrow;
    const rightCurrentArrow = right.findOne("Arrow") as Konva.Arrow;

    // Hai dây độc lập đi ra hai phía; mỗi đầu dây được giữ bằng kẹp bám dưới đáy tấm.
    const leftWire = new Konva.Line({ stroke: "#1f2937", strokeWidth: 4, tension: .42, lineCap: "round" });
    const rightWire = new Konva.Line({ stroke: "#1f2937", strokeWidth: 4, tension: .42, lineCap: "round" });
    layer.add(leftWire, rightWire);
    const leftBottomClamp = new Konva.Group();
    const rightBottomClamp = new Konva.Group();
    layer.add(leftBottomClamp, rightBottomClamp);
    addClamp(leftBottomClamp, 0, 0);
    addClamp(rightBottomClamp, 0, 0);
    const terminalY = H * .79;
    layer.add(new Konva.Circle({ x: 30, y: terminalY, radius: 11, fill: "#e11d48", stroke: "#881337", strokeWidth: 2 }));
    layer.add(new Konva.Circle({ x: W - 30, y: terminalY, radius: 11, fill: "#2563eb", stroke: "#1e3a8a", strokeWidth: 2 }));
    const status = new Konva.Text({ x: 0, y: H - 42, width: W, align: "center", fontSize: 15, fontStyle: "bold", fill: "#334155" }); layer.add(status);

    let state = initialCurrentSheetsState();
    const draw = () => {
      // Mô hình vật lý cho độ lệch đáy; quy đổi thành góc quay quanh điểm kẹp bất động.
      const leftAngle = Math.atan2(state.leftX * scale, plateH);
      const rightAngle = Math.atan2(state.rightX * scale, plateH);
      left.rotation(-leftAngle * RAD_TO_DEG);
      right.rotation(-rightAngle * RAD_TO_DEG);
      const leftBottom = { x: baseL + Math.sin(leftAngle) * plateH, y: pivotY + 22 + Math.cos(leftAngle) * plateH };
      const rightBottom = { x: baseR + Math.sin(rightAngle) * plateH, y: pivotY + 22 + Math.cos(rightAngle) * plateH };
      leftBottomClamp.position(leftBottom);
      rightBottomClamp.position(rightBottom);
      leftWire.points([leftBottom.x - 37, leftBottom.y, leftBottom.x - 82, leftBottom.y + 18, 30, terminalY]);
      rightWire.points([rightBottom.x + 37, rightBottom.y, rightBottom.x + 82, rightBottom.y + 18, W - 30, terminalY]);
      leftCurrentArrow.points(scene.currentLeft >= 0 ? [0, plateH - 22, 0, 34] : [0, 34, 0, plateH - 22]);
      rightCurrentArrow.points(scene.currentRight >= 0 ? [0, plateH - 22, 0, 34] : [0, 34, 0, plateH - 22]);
      const force = currentSheetForce(scene, state);
      const relation = scene.currentLeft * scene.currentRight > 0 ? "Cùng chiều → đẩy nhau" : scene.currentLeft * scene.currentRight < 0 ? "Ngược chiều → hút nhau" : "Không có dòng điện → không có lực từ";
      status.text(relation + "   |   F = " + (force.magnitude * 1000).toFixed(3) + " mN");
      layer.batchDraw();
    };
    draw();
    let raf = 0, last = performance.now();
    const loop = (now: number) => { const dt = Math.min((now - last) / 1000, 1 / 30); last = now; if (runningRef.current) { state = stepCurrentSheets(scene, state, dt * speedRef.current); draw(); } raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); stage.destroy(); };
  }, [scene, size, resetSignal, onRunningChange, ref]);
  return <div ref={ref} className="h-full w-full overflow-hidden rounded-lg bg-slate-50" />;
}
