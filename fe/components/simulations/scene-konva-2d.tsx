"use client";

// Renderer 2D bằng Konva (imperative) cho Kernel Cơ học 2D.
// Đọc Scene + kernel thật (kernel/*.ts), chạy vòng lặp vật lý, vẽ vật/lò xo/dây.
//
// KHÔNG GIAN: mặt đất CỐ ĐỊNH ở world y=0 (dải nền + đường sàn), phần còn lại là
// lưới phủ kín canvas → mặt phẳng 2D vô hạn. Canvas rộng theo khung chứa.
//
// KÉO-THẢ: kéo một vật động để đặt lại vị trí đầu → thả ra mô phỏng chạy lại từ đó.
//
// CONTROLLED: chạy/dừng (`running`) và `resetSignal` do component CHA điều khiển
// (nút nằm ở bảng tham số). Khi kéo, gọi `onRunningChange` để cha cập nhật theo.

import { useEffect, useRef, useState } from "react";
import Konva from "konva";
import { buildKernel, readPosition, readVelocity, stepScene } from "./kernel/build-derivs";
import type { StateVec } from "./shared/ode";
import type { Scene, VectorAnnotation } from "./kernel/types";

const H = 520; // chiều cao canvas (px); bề rộng đo theo khung chứa

type Vec2 = { x: number; y: number };
type Box = { minX: number; maxX: number; minY: number; maxY: number };

// Mô phỏng trước ~5 s để biết quỹ đạo → hộp bao. LUÔN gồm mặt đất y=0.
function fitBox(scene: Scene): Box {
  const xs = scene.bodies.map((b) => b.x);
  const ys = scene.bodies.map((b) => b.y);
  let minX = Math.min(...xs), maxX = Math.max(...xs);
  let minY = Math.min(...ys), maxY = Math.max(...ys);
  for (const c of scene.constraints) {
    if (c.kind !== "curveTrack") continue;
    for (const p of c.points) {
      minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
      minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y);
    }
  }
  // Vector annotation gốc CỐ ĐỊNH (`at`): tính cả gốc và ngọn vào hộp bao để mũi
  // tên không ló mép. Vector gốc bám vật (`anchor`) bỏ qua ở đây — vật đã được
  // tính rồi; phần đuôi vượt ra được xử lý bằng padding thị giác của renderer.
  for (const a of scene.annotations ?? []) {
    if (a.kind !== "vector" || a.anchor != null || !a.at) continue;
    const tipX = a.at.x + a.dx;
    const tipY = a.at.y + a.dy;
    minX = Math.min(minX, a.at.x, tipX); maxX = Math.max(maxX, a.at.x, tipX);
    minY = Math.min(minY, a.at.y, tipY); maxY = Math.max(maxY, a.at.y, tipY);
  }
  const kernel = buildKernel(scene);
  let s = kernel.project(kernel.initialState);
  let bounded = true;
  for (let i = 0; i < 300 && bounded; i++) {
    s = stepScene(kernel, s, 1 / 60);
    for (const b of scene.bodies) {
      if (b.fixed) continue;
      const p = readPosition(s, b.id);
      if (!Number.isFinite(p.x) || !Number.isFinite(p.y) || Math.abs(p.x) > 60 || Math.abs(p.y) > 60) {
        bounded = false;
        break;
      }
      minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
      minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y);
    }
  }
  if (!bounded) { minX -= 4; maxX += 4; maxY += 4; }
  minY = Math.min(minY, 0); // luôn thấy mặt đất
  return { minX, maxX, minY, maxY };
}

// Năng lượng của hệ (để tracking): động năng + thế năng (trọng lực + lò xo).
function energyOf(scene: Scene, state: StateVec): { ke: number; pe: number } {
  const gravity = scene.forces.find((f) => f.kind === "gravity");
  const g = gravity && gravity.kind === "gravity" ? gravity.g ?? 9.8 : 0;
  const posById = (id: string): { x: number; y: number } => {
    const b = scene.bodies.find((x) => x.id === id);
    if (!b) return { x: 0, y: 0 };
    return b.fixed ? { x: b.x, y: b.y } : readPosition(state, id);
  };
  let ke = 0, pe = 0;
  for (const b of scene.bodies) {
    if (b.fixed) continue;
    const v = readVelocity(state, b.id);
    ke += 0.5 * b.mass * (v.x * v.x + v.y * v.y);
    pe += b.mass * g * readPosition(state, b.id).y;
  }
  for (const f of scene.forces) {
    if (f.kind !== "spring") continue;
    const pa = posById(f.a), pb = posById(f.b);
    const ext = Math.hypot(pb.x - pa.x, pb.y - pa.y) - f.restLength;
    pe += 0.5 * f.k * ext * ext;
  }
  return { ke, pe };
}

function springPoints(ax: number, ay: number, bx: number, by: number): number[] {
  const dx = bx - ax, dy = by - ay;
  const len = Math.hypot(dx, dy) || 1;
  const px = -dy / len, py = dx / len;
  const n = 16;
  const pts = [ax, ay];
  for (let i = 1; i < n; i++) {
    const t = i / n;
    const off = (i % 2 ? 1 : -1) * 7;
    pts.push(ax + dx * t + px * off, ay + dy * t + py * off);
  }
  pts.push(bx, by);
  return pts;
}

/** Dữ liệu tracking live phát ra ngoài canvas (để cha render thành bảng). */
export type SceneReadout = {
  bodies: { id: string; x: number; y: number; speed: number }[];
  energy: { ke: number; pe: number; total: number };
};

export function SceneKonva2D({
  scene,
  running,
  resetSignal,
  onRunningChange,
  onReadout,
  seekSeconds,
  seekToken,
}: {
  scene: Scene;
  running: boolean;
  resetSignal: number;
  onRunningChange: (running: boolean) => void;
  // Phát tracking (toạ độ/vận tốc/cơ năng) lên cha để hiển thị ngoài canvas.
  onReadout?: (r: SceneReadout) => void;
  // "Đi tới mốc thời gian t" — tăng seekToken để yêu cầu nhảy tới seekSeconds
  // giây (tính từ trạng thái đầu, KHÔNG phải hiện tại). Dựng lại từ đầu rồi
  // tích phân nhanh (deterministic, cùng sub-step 1/240) tới đúng thời điểm đó
  // rồi tự dừng — không phải "tua nhanh có hoạt ảnh", mà nhảy thẳng tới trạng thái.
  seekSeconds?: number;
  seekToken?: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(0);
  const runningRef = useRef(running);
  useEffect(() => {
    runningRef.current = running;
  }, [running]);
  // Giữ onReadout mới nhất qua ref để effect dựng scene không phụ thuộc nó.
  const onReadoutRef = useRef(onReadout);
  useEffect(() => {
    onReadoutRef.current = onReadout;
  }, [onReadout]);

  // Đo bề rộng khung chứa → canvas rộng theo (mở hết chỗ).
  useEffect(() => {
    if (containerRef.current) setW(containerRef.current.clientWidth);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !w) return;
    const W = w;

    // Bản làm việc — kéo-thả/reset sửa ở đây, không đụng prop.
    const work: Scene = {
      bodies: scene.bodies.map((b) => ({ ...b })),
      forces: scene.forces,
      constraints: scene.constraints,
      annotations: scene.annotations,
    };
    let kernel = buildKernel(work);
    let state = kernel.project(kernel.initialState);

    // Đi tới mốc thời gian: tích phân xác định (không phụ thuộc frame rate)
    // từ trạng thái đầu tới seekSeconds, rồi dừng lại đúng đó để xem/đối chiếu.
    if (seekToken && seekSeconds != null && seekSeconds > 0) {
      const seekSub = 1 / 240;
      const seekSteps = Math.round(seekSeconds / seekSub);
      for (let i = 0; i < seekSteps; i++) state = stepScene(kernel, state, seekSub);
      runningRef.current = false;
      onRunningChange(false);
    }

    // world→screen: mặt đất (y=0) ghim gần đáy, vật scale vừa khung.
    const box = fitBox(work);
    const sidePad = 70, topPad = 112, groundPad = 46;
    const bboxW = Math.max(box.maxX - box.minX, 1);
    const worldH = Math.max(box.maxY, 1) + Math.max(-box.minY, 0);
    const scale = Math.min((W - 2 * sidePad) / bboxW, (H - topPad - groundPad) / worldH);
    const cxBox = (box.minX + box.maxX) / 2;
    const groundY = H - groundPad;
    const toScreen = (wx: number, wy: number): Vec2 => ({ x: W / 2 + (wx - cxBox) * scale, y: groundY - wy * scale });
    const toWorld = (sx: number, sy: number): Vec2 => ({ x: cxBox + (sx - W / 2) / scale, y: (groundY - sy) / scale });

    const stage = new Konva.Stage({ container, width: W, height: H });
    const layer = new Konva.Layer();
    stage.add(layer);
    layer.add(new Konva.Rect({ x: 0, y: 0, width: W, height: H, fill: "#0f172a" }));

    // Lưới phủ kín canvas → không gian vô hạn.
    const wl = toWorld(0, 0).x, wr = toWorld(W, 0).x;
    const wb = toWorld(0, H).y, wt = toWorld(0, 0).y;
    const step = scale >= 26 ? 1 : scale >= 13 ? 2 : 5;
    for (let gx = Math.ceil(wl / step) * step; gx <= wr; gx += step) {
      const x = toScreen(gx, 0).x;
      layer.add(new Konva.Line({ points: [x, 0, x, H], stroke: "#1e293b", strokeWidth: 1 }));
    }
    for (let gy = Math.ceil(wb / step) * step; gy <= wt; gy += step) {
      const y = toScreen(0, gy).y;
      layer.add(new Konva.Line({ points: [0, y, W, y], stroke: "#1e293b", strokeWidth: 1 }));
    }

    // Mặt đất CỐ ĐỊNH ở y=0 (đồng thời là trục Ox).
    layer.add(new Konva.Rect({ x: 0, y: groundY, width: W, height: H - groundY, fill: "#0b1220" }));
    layer.add(new Konva.Line({ points: [0, groundY, W, groundY], stroke: "#64748b", strokeWidth: 3 }));

    // ── Trục toạ độ + nhãn số (mặt phẳng 2D định lượng) ──
    const labelColor = "#64748b";
    const yAxisX = toScreen(0, 0).x;
    const yAxisOnScreen = yAxisX >= 0 && yAxisX <= W - 16;
    if (yAxisOnScreen) {
      layer.add(new Konva.Line({ points: [yAxisX, 0, yAxisX, groundY], stroke: "#3f4d63", strokeWidth: 1.5 })); // trục Oy
    }
    for (let gx = Math.ceil(wl / step) * step; gx <= wr; gx += step) {
      if (gx === 0) continue;
      layer.add(new Konva.Text({ x: toScreen(gx, 0).x + 2, y: groundY - 15, text: `${gx}`, fontSize: 11, fill: labelColor, fontFamily: "monospace" }));
    }
    if (yAxisOnScreen) {
      for (let gy = Math.ceil(wb / step) * step; gy <= wt; gy += step) {
        if (gy <= 0) continue;
        layer.add(new Konva.Text({ x: yAxisX + 4, y: toScreen(0, gy).y - 6, text: `${gy}`, fontSize: 11, fill: labelColor, fontFamily: "monospace" }));
      }
    }
    const o = toScreen(0, 0); // gốc toạ độ O
    layer.add(new Konva.Circle({ x: o.x, y: o.y, radius: 3, fill: "#94a3b8" }));
    layer.add(new Konva.Text({ x: o.x + 5, y: o.y - 17, text: "O", fontSize: 12, fill: "#94a3b8", fontFamily: "monospace" }));

    // Mặt phẳng riêng của cảnh (surface constraint).
    for (const c of work.constraints) {
      if (c.kind !== "surface") continue;
      const rad = (c.angle * Math.PI) / 180;
      const hx = (Math.cos(rad) * c.length) / 2;
      const hy = (Math.sin(rad) * c.length) / 2;
      const a = toScreen(c.x - hx, c.y - hy);
      const b = toScreen(c.x + hx, c.y + hy);
      layer.add(new Konva.Line({ points: [a.x, a.y, b.x, b.y], stroke: "#475569", strokeWidth: 4 }));
    }

    // Lò xo + dây/thanh.
    for (const c of work.constraints) {
      if (c.kind !== "curveTrack") continue;
      const points = c.points.flatMap((p) => {
        const sp = toScreen(p.x, p.y);
        return [sp.x, sp.y];
      });
      layer.add(new Konva.Line({ points, stroke: "#38bdf8", strokeWidth: 5, lineCap: "round", lineJoin: "round" }));
      layer.add(new Konva.Line({ points, stroke: "#0f172a", strokeWidth: 1.5, lineCap: "round", lineJoin: "round" }));
    }
    const springs: { a: string; b: string; line: Konva.Line }[] = [];
    for (const f of work.forces) {
      if (f.kind !== "spring") continue;
      const line = new Konva.Line({ stroke: "#cbd5e1", strokeWidth: 2.5, lineJoin: "round" });
      layer.add(line);
      springs.push({ a: f.a, b: f.b, line });
    }
    const links: { a: string; b: string; line: Konva.Line }[] = [];
    for (const c of work.constraints) {
      if (c.kind === "surface" || c.kind === "curveTrack") continue;
      const line = new Konva.Line({ stroke: "#64748b", strokeWidth: c.kind === "rod" ? 3 : 1.5 });
      layer.add(line);
      links.push({ a: c.a, b: c.b, line });
    }

    // Vật.
    const circles: Record<string, Konva.Group | Konva.Shape> = {};
    let draggingId: string | null = null;
    let resumeAfterDrag = false;

    const posOf = (id: string): Vec2 => {
      const b = work.bodies.find((x) => x.id === id)!;
      return b.fixed ? { x: b.x, y: b.y } : readPosition(state, b.id);
    };
    const screenOf = (id: string): Vec2 => {
      // Vật đang kéo: lấy vị trí node Konva tức thời để dây/lò xo bám theo tay
      // (không thì chúng trỏ về vị trí cũ trong state → rời khỏi vật).
      if (id === draggingId) {
        const node = circles[id];
        if (node) return { x: node.x(), y: node.y() };
      }
      const wpt = posOf(id);
      return toScreen(wpt.x, wpt.y);
    };
    // Toạ độ world để hiển thị (vật đang kéo → quy từ vị trí node về world).
    const worldOf = (id: string): Vec2 => {
      const node = circles[id];
      if (id === draggingId && node) return toWorld(node.x(), node.y());
      return posOf(id);
    };

    const makeForceMeter = (
      p: Vec2,
      radius: number,
      fill: string,
      draggable: boolean,
      reading?: string,
      angle = 0,
      label?: string,
    ): Konva.Group => {
      const w = Math.max(58, radius * 3.5);
      const h = Math.max(30, radius * 1.55);
      const group = new Konva.Group({ x: p.x, y: p.y, draggable, rotation: angle });
      group.add(new Konva.Rect({
        x: -w / 2,
        y: -h / 2,
        width: w,
        height: h,
        cornerRadius: 7,
        fill: "#111827",
        stroke: fill,
        strokeWidth: 2,
        shadowBlur: 8,
        shadowColor: "#000",
      }));
      group.add(new Konva.Line({ points: [-w / 2 - 12, 0, -w / 2, 0], stroke: "#cbd5e1", strokeWidth: 2.5, lineCap: "round" }));
      group.add(new Konva.Line({ points: [w / 2, 0, w / 2 + 12, 0], stroke: "#cbd5e1", strokeWidth: 2.5, lineCap: "round" }));
      group.add(new Konva.Circle({ x: -w * 0.24, y: 0, radius: h * 0.28, fill: "#0f172a", stroke: "#94a3b8", strokeWidth: 1.5 }));
      group.add(new Konva.Line({ points: [-w * 0.24, 0, -w * 0.11, -h * 0.18], stroke: "#fbbf24", strokeWidth: 2.5, lineCap: "round" }));
      group.add(new Konva.Text({
        x: -w * 0.02,
        y: -h * 0.28,
        width: w * 0.45,
        text: reading ?? "0 N",
        align: "center",
        fontSize: 11,
        fontStyle: "700",
        fill: "#e2e8f0",
        fontFamily: "monospace",
      }));
      group.add(new Konva.Text({
        x: -w * 0.02,
        y: h * 0.03,
        width: w * 0.45,
        text: label ?? "luc ke",
        align: "center",
        fontSize: 9,
        fill,
        fontFamily: "monospace",
      }));
      return group;
    };
    for (const b of work.bodies) {
      const p = toScreen(b.x, b.y);
      if (b.fixed) {
        const fill = b.visual?.color ?? "#64748b";
        const shape = b.visual?.shape;
        const worldR = b.radius ?? 0.18;
        const radius = Math.max(8, worldR * scale);
        const node: Konva.Group | Konva.Shape =
          shape === "forceMeter"
            ? makeForceMeter(p, radius, fill, false, b.visual?.reading, b.visual?.angle ?? 0, b.visual?.label)
            : shape === "circle"
              ? new Konva.Circle({ x: p.x, y: p.y, radius, fill, stroke: "#e2e8f0", strokeWidth: 1.5 })
              : new Konva.Rect({ x: p.x - 7, y: p.y - 7, width: 14, height: 14, fill: "#1e293b", cornerRadius: 2 });
        layer.add(node);
        circles[b.id] = node;
      } else {
        // Vật va chạm (có radius) vẽ đúng bán kính thật; còn lại suy theo khối lượng.
        const worldR = b.radius ?? Math.min(0.25 + b.mass * 0.04, 0.5);
        const radius = Math.max(8, worldR * scale);
        const fill = b.visual?.color ?? "#f472b6";
        const shape = b.visual?.shape ?? "circle";
        const c: Konva.Group | Konva.Shape =
          shape === "forceMeter"
            ? makeForceMeter(p, radius, fill, true, b.visual?.reading, b.visual?.angle ?? 0, b.visual?.label)
            : shape === "plate"
            ? new Konva.Rect({
                x: p.x,
                y: p.y,
                width: radius * 2.4,
                height: radius * 0.9,
                offsetX: radius * 1.2,
                offsetY: radius * 0.45,
                cornerRadius: 3,
                fill,
                draggable: true,
                shadowBlur: 6,
                shadowColor: "#000",
              })
            : shape === "streamlined"
              ? new Konva.RegularPolygon({
                  x: p.x,
                  y: p.y,
                  sides: 3,
                  radius: radius * 1.1,
                  rotation: 90,
                  fill,
                  draggable: true,
                  shadowBlur: 6,
                  shadowColor: "#000",
                })
              : new Konva.Circle({ x: p.x, y: p.y, radius, fill, draggable: true, shadowBlur: 6, shadowColor: "#000" });
        const draggableNode = c as Konva.Node;
        draggableNode.on("dragstart", () => {
          draggingId = b.id;
          resumeAfterDrag = runningRef.current;
          onRunningChange(false);
        });
        draggableNode.on("dragend", () => {
          const wpt = toWorld(c.x(), c.y());
          const body = work.bodies.find((x) => x.id === b.id)!;
          body.x = wpt.x; body.y = wpt.y; body.vx = 0; body.vy = 0;
          kernel = buildKernel(work);
          state = kernel.project(kernel.initialState);
          draggingId = null;
          onRunningChange(resumeAfterDrag);
        });
        layer.add(c);
        circles[b.id] = c;
      }
    }

    // ── Tracking toạ độ + giá trị (live) ──
    const coordLabels: Record<string, Konva.Text> = {};
    for (const b of work.bodies) {
      if (b.fixed) continue;
      const t = new Konva.Text({ text: "", fontSize: 11, fill: "#cbd5e1", fontFamily: "monospace" });
      layer.add(t);
      coordLabels[b.id] = t;
    }

    // ── Vector annotation (lớp chú thích hình học — CHỈ vẽ, kernel không biết) ──
    // Gốc world = anchor (bám vật) hoặc `at` cố định; ngọn = gốc + (dx, dy) (m).
    // Vector gốc-cố-định cập nhật một lần; vector gốc-bám-vật cập nhật mỗi frame
    // trong syncShapes (chỉ ĐỌC vị trí vật, không đụng vật lý).
    const ARROW_DEFAULT_COLOR = "#34d399";
    const arrows: { ann: VectorAnnotation; arrow: Konva.Arrow; label?: Konva.Text }[] = [];
    const annOriginWorld = (ann: VectorAnnotation): Vec2 =>
      ann.anchor != null ? posOf(ann.anchor) : ann.at ?? { x: 0, y: 0 };
    const syncArrow = (entry: { ann: VectorAnnotation; arrow: Konva.Arrow; label?: Konva.Text }) => {
      const ow = annOriginWorld(entry.ann);
      const start = toScreen(ow.x, ow.y);
      const tip = toScreen(ow.x + entry.ann.dx, ow.y + entry.ann.dy);
      entry.arrow.points([start.x, start.y, tip.x, tip.y]);
      if (entry.label) entry.label.position({ x: tip.x + 6, y: tip.y - 6 });
    };
    for (const ann of work.annotations ?? []) {
      if (ann.kind !== "vector") continue;
      const color = ann.color ?? ARROW_DEFAULT_COLOR;
      const arrow = new Konva.Arrow({
        points: [0, 0, 0, 0],
        stroke: color,
        fill: color,
        strokeWidth: ann.width ?? 3,
        pointerLength: 10,
        pointerWidth: 9,
        lineCap: "round",
        lineJoin: "round",
      });
      layer.add(arrow);
      let label: Konva.Text | undefined;
      if (ann.label) {
        label = new Konva.Text({ text: ann.label, fontSize: 12, fontStyle: "700", fill: color, fontFamily: "monospace" });
        layer.add(label);
      }
      const entry = { ann, arrow, label };
      arrows.push(entry);
      syncArrow(entry);
    }
    // Vector gốc-bám-vật có cần cập nhật mỗi frame không (khi vật di chuyển)?
    const hasAnchoredArrow = arrows.some((a) => a.ann.anchor != null);

    // Tracking đưa ra ngoài canvas (panel) — chỉ phát ~12 lần/giây cho đỡ render.
    let readoutTick = 0;
    const syncShapes = () => {
      for (const b of work.bodies) {
        if (b.fixed || b.id === draggingId) continue;
        circles[b.id]!.position(screenOf(b.id));
      }
      for (const s of springs) {
        const pa = screenOf(s.a), pb = screenOf(s.b);
        s.line.points(springPoints(pa.x, pa.y, pb.x, pb.y));
      }
      for (const l of links) {
        const pa = screenOf(l.a), pb = screenOf(l.b);
        l.line.points([pa.x, pa.y, pb.x, pb.y]);
      }
      // Vector gốc-bám-vật theo kịp vật khi nó di chuyển (chỉ đọc vị trí).
      if (hasAnchoredArrow) {
        for (const entry of arrows) {
          if (entry.ann.anchor != null) syncArrow(entry);
        }
      }
      // nhãn toạ độ bám theo vật + thu dữ liệu tracking
      const bodies: SceneReadout["bodies"] = [];
      for (const b of work.bodies) {
        if (b.fixed) continue;
        const wpt = worldOf(b.id);
        const sp = screenOf(b.id);
        const lbl = coordLabels[b.id]!;
        lbl.position({ x: sp.x + 12, y: sp.y - 10 });
        lbl.text(`(${wpt.x.toFixed(1)}, ${wpt.y.toFixed(1)})`);
        const v = readVelocity(state, b.id);
        bodies.push({ id: b.id, x: wpt.x, y: wpt.y, speed: Math.hypot(v.x, v.y) });
      }
      if (readoutTick % 5 === 0) {
        const e = energyOf(work, state);
        onReadoutRef.current?.({ bodies, energy: { ke: e.ke, pe: e.pe, total: e.ke + e.pe } });
      }
      readoutTick++;
    };
    syncShapes();

    const anim = new Konva.Animation((frame) => {
      if (runningRef.current && frame && frame.timeDiff > 0) {
        const dt = Math.min(frame.timeDiff / 1000, 1 / 30);
        const steps = Math.max(1, Math.ceil(dt / (1 / 240)));
        const sub = dt / steps;
        for (let i = 0; i < steps; i++) state = stepScene(kernel, state, sub);
      }
      syncShapes();
    }, layer);
    anim.start();

    return () => {
      anim.stop();
      stage.destroy();
    };
    // resetSignal/seekToken: tăng → dựng lại cảnh từ đầu (reset/đi tới mốc).
    // running đọc qua ref nên KHÔNG ở deps.
  }, [scene, w, resetSignal, seekToken, seekSeconds, onRunningChange]);

  return <div ref={containerRef} className="w-full overflow-hidden rounded-lg" style={{ height: H }} />;
}
