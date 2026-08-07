"use client";

// Renderer 2D bằng Konva (imperative) cho Kernel Cơ học 2D.
// Đọc Scene + engine mechanics, chạy vòng lặp vật lý, vẽ vật/lò xo/dây.
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
import { buildKernel, readPosition, readVelocity, stepScene } from "../../engines/mechanics/build-derivs";
import { computeBodyPositionsAtTime } from "../../engines/mechanics/sim-time";
import type { StateVec } from "../../engines/mechanics/ode";
import type { Scene } from "../../engines/mechanics/types";
import { attachZoomPan, type ZoomActions } from "../../shared/konva-zoom";
import { ZoomControls } from "../../shared/zoom-controls";
import { useContainerSize } from "../../shared/use-container-size";
import type { SceneAnnotation, SceneReadout } from "../../shared/scene-types";
import { screenAngleAtClosestTrackSegment } from "./track-orientation";

// Lưới/mặt đất vẽ rộng hơn khung nhìn ban đầu nhiều lần để còn phủ kín khi
// zoom out / kéo canvas (lưới TĨNH, không tính lại theo viewport khi zoom).
// Đây cũng là "vùng làm việc" pan bị khoá trong đó (xem konva-zoom.ts).
const GRID_EXTENT_FACTOR = 7;

type Vec2 = { x: number; y: number };
type Box = { minX: number; maxX: number; minY: number; maxY: number };

// Mô phỏng trước ~5 s để biết quỹ đạo → hộp bao. LUÔN gồm mặt đất y=0.
function fitBox(scene: Scene): Box {
  if (scene.view) return scene.view;
  const xs = scene.bodies.map((b) => b.x);
  const ys = scene.bodies.map((b) => b.y);
  let minX = Math.min(...xs), maxX = Math.max(...xs);
  let minY = Math.min(...ys), maxY = Math.max(...ys);
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
    if (f.compressionOnly && ext >= 0) continue;
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

function offsetTrackPoints(points: Vec2[], offset: number): Vec2[] {
  if (Math.abs(offset) < 1e-9) return points;
  return points.map((point, index) => {
    const before = points[Math.max(0, index - 1)]!;
    const after = points[Math.min(points.length - 1, index + 1)]!;
    const dx = after.x - before.x;
    const dy = after.y - before.y;
    const length = Math.hypot(dx, dy) || 1;
    let nx = -dy / length;
    let ny = dx / length;
    if (ny < 0) {
      nx *= -1;
      ny *= -1;
    }
    return { x: point.x + nx * offset, y: point.y + ny * offset };
  });
}

type ScreenTrackPoint = Vec2 & { nx: number; ny: number };

function extendScreenTrack(points: ScreenTrackPoint[], startPx: number, endPx: number): ScreenTrackPoint[] {
  if (points.length < 2) return points;
  const first = points[0]!;
  const second = points[1]!;
  const beforeLast = points[points.length - 2]!;
  const last = points[points.length - 1]!;

  const startLength = Math.hypot(second.x - first.x, second.y - first.y) || 1;
  const endLength = Math.hypot(last.x - beforeLast.x, last.y - beforeLast.y) || 1;
  const extendedStart = {
    ...first,
    x: first.x - ((second.x - first.x) / startLength) * startPx,
    y: first.y - ((second.y - first.y) / startLength) * startPx,
  };
  const extendedEnd = {
    ...last,
    x: last.x + ((last.x - beforeLast.x) / endLength) * endPx,
    y: last.y + ((last.y - beforeLast.y) / endLength) * endPx,
  };

  return [extendedStart, ...points.slice(1, -1), extendedEnd];
}
// Đầu mũi tên hình chevron tại (x,y), hướng theo `angle` (rad) — dùng chung

function rightAnglePulleyRopePoints(
  cartAttachment: Vec2,
  hanger: Vec2,
  corner: Vec2,
  radius: number,
  hangerTopY: number,
): number[] {
  const topY = corner.y - radius;
  const rightX = corner.x + radius;
  const points: number[] = [cartAttachment.x, cartAttachment.y, corner.x, topY];
  const arcSteps = 8;
  for (let i = 1; i <= arcSteps; i++) {
    const angle = -Math.PI / 2 + (i / arcSteps) * (Math.PI / 2);
    points.push(corner.x + Math.cos(angle) * radius, corner.y + Math.sin(angle) * radius);
  }
  points.push(rightX, hangerTopY, hanger.x, hangerTopY);
  return points;
}
function addArrowhead(layer: Konva.Layer, x: number, y: number, angle: number, color: string, size = 8) {
  const a1 = angle + Math.PI - Math.PI / 7;
  const a2 = angle + Math.PI + Math.PI / 7;
  layer.add(
    new Konva.Line({
      points: [x + size * Math.cos(a1), y + size * Math.sin(a1), x, y, x + size * Math.cos(a2), y + size * Math.sin(a2)],
      stroke: color,
      strokeWidth: 2,
      lineCap: "round",
      lineJoin: "round",
      listening: false,
    }),
  );
}

export function SceneKonva2D({
  scene,
  running,
  resetSignal,
  onRunningChange,
  onReadout,
  seekSeconds,
  seekToken,
  markLabel,
  ghostSeconds,
  ghostLabel,
  bodyLabels,
  annotations,
  bodyColors,
  bodyTrails,
  bodySigns,
  minimalOverlay,
  hideCoordinateLabels,
  hideFixedSupportDecoration,
  speed = 1,
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
  // Nhãn mốc hiện tại đang xem (vd "t2" hoặc "B") — vẽ cạnh mỗi vật động khi
  // đang dừng ở một mốc (seekToken active).
  markLabel?: string;
  // Mốc VỪA đi qua trước đó — vẽ tàn ảnh (nét đứt, mờ) tại vị trí mốc đó để so
  // sánh trực quan với vị trí hiện tại. null/undefined = không có tàn ảnh.
  ghostSeconds?: number | null;
  ghostLabel?: string;
  // Nhãn cố định gắn với từng vật (vd đánh số con lắc "1","2","3") — LUÔN hiện,
  // khác markLabel/ghostLabel (chỉ hiện khi đang xem 1 mốc).
  bodyLabels?: Record<string, string>;
  // Chú thích tuỳ chọn của preset (mũi tên trường, nhãn +/−…) — xem SceneAnnotation.
  annotations?: SceneAnnotation[];
  // Màu riêng cho từng vật (id → mã màu), ghi đè màu hồng mặc định — vd hạt
  // mang điện vẽ xanh dương thay vì hồng cho preset điện trường.
  bodyColors?: Record<string, string>;
  // Vệt quỹ đạo nối dần theo vị trí thực tế của vật khi mô phỏng đang chạy.
  bodyTrails?: Record<string, { color?: string; width?: number; dash?: number[] }>;
  // Ký hiệu ngắn (1-2 ký tự, vd "+"/"−"/"0") vẽ ĐÈ LÊN TÂM vật, bám theo vật
  // khi di chuyển — khác bodyLabels (vẽ DƯỚI vật). Dùng cho dấu điện tích
  // ngay trên hạt, giống hạt mang điện trong sách giáo khoa.
  bodySigns?: Record<string, string>;
  // Ẩn mặt đất/trục Ox-Oy/nhãn số/gốc O/nhãn toạ độ cạnh vật VÀ đường mặt
  // phẳng mặc định (surface constraint) — dùng cho sơ đồ giáo khoa tối giản có
  // chú thích (annotations) tự vẽ mọi thứ. KHÔNG ẩn lưới nền (vẫn vẽ, chỉ là
  // kết cấu mờ cho cảm giác chiều sâu, không phải công cụ định lượng).
  minimalOverlay?: boolean;
  hideCoordinateLabels?: boolean;
  hideFixedSupportDecoration?: boolean;
  // Hệ số tốc độ mô phỏng (0.5 = chậm nửa, 1 = thật, 2 = nhanh gấp đôi…) — chỉ
  // nhân vào dt mỗi khung hình, không đụng engine/độ chính xác tích phân.
  speed?: number;
}) {
  // Đo kích thước THẬT của khung chứa (không cố định 520px) → canvas trải
  // kín toàn bộ không gian cha dành cho, kể cả khi thu/mở sidebar hay resize.
  const { ref: containerRef, size } = useContainerSize<HTMLDivElement>();
  const [zoomPct, setZoomPct] = useState(100);
  // Nút zoom nằm ngoài effect dựng cảnh (React JSX) → gọi qua ref vào hàm
  // thao tác trực tiếp trên Konva.Stage, tránh phải dựng lại toàn bộ cảnh.
  const zoomActionsRef = useRef<ZoomActions | null>(null);
  const runningRef = useRef(running);
  useEffect(() => {
    runningRef.current = running;
  }, [running]);
  // speed qua ref (như running) → đổi tốc độ không dựng lại toàn bộ cảnh.
  const speedRef = useRef(speed);
  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);
  // Giữ onReadout mới nhất qua ref để effect dựng scene không phụ thuộc nó.
  const onReadoutRef = useRef(onReadout);
  useEffect(() => {
    onReadoutRef.current = onReadout;
  }, [onReadout]);

  useEffect(() => {
    const container = containerRef.current;
    const { width: w, height: hgt } = size;
    if (!container || !w || !hgt) return;
    const W = w;
    const H = hgt;

    // Bản làm việc — kéo-thả/reset sửa ở đây, không đụng prop.
    const work: Scene = {
      ...scene,
      bodies: scene.bodies.map((b) => ({ ...b })),
      forces: scene.forces,
      constraints: scene.constraints,
      restitution: scene.restitution,
      annotations: scene.annotations,
      view: scene.view,
      groundPadding: scene.groundPadding,
      groundPaddingRatio: scene.groundPaddingRatio,
      viewShiftYRatio: scene.viewShiftYRatio,
      preferredScale: scene.preferredScale,
      displayScaleX: scene.displayScaleX,
      displayScaleXRange: scene.displayScaleXRange,
      disableDragging: scene.disableDragging,
    };
    let kernel = buildKernel(work);
    let state = kernel.project(kernel.initialState);
    let simulationSeconds = 0;

    // Đi tới mốc thời gian: tích phân xác định (không phụ thuộc frame rate)
    // từ trạng thái đầu tới seekSeconds, rồi dừng lại đúng đó để xem/đối chiếu.
    if (seekToken && seekSeconds != null && seekSeconds > 0) {
      const seekSub = 1 / 240;
      const seekSteps = Math.round(seekSeconds / seekSub);
      for (let i = 0; i < seekSteps; i++) state = stepScene(kernel, state, seekSub);
      simulationSeconds = seekSeconds;
      runningRef.current = false;
      onRunningChange(false);
    }

    // world→screen: mặt đất (y=0) ghim gần đáy, vật scale vừa khung.
    const box = fitBox(work);
    const sidePad = Math.min(70, W * 0.07);
    const topPad = Math.min(50, H * 0.07);
    const groundPad = work.groundPaddingRatio != null
      ? H * Math.min(0.75, Math.max(0.1, work.groundPaddingRatio))
      : work.groundPadding ?? 46;
    const displayScaleX = Math.max(work.displayScaleX ?? 1, 0.01);
    const displayRange = work.displayScaleXRange;
    const outsideScaleX = Math.max(displayRange?.outsideScale ?? 1, 0.01);
    const warpX = (x: number): number => {
      if (!displayRange) return x * displayScaleX;
      const startDisplay = displayRange.startX * outsideScaleX;
      if (x <= displayRange.startX) return x * outsideScaleX;
      const insideEnd = startDisplay + (displayRange.endX - displayRange.startX) * displayScaleX;
      if (x <= displayRange.endX) return startDisplay + (x - displayRange.startX) * displayScaleX;
      return insideEnd + (x - displayRange.endX) * outsideScaleX;
    };
    const unwarpX = (x: number): number => {
      if (!displayRange) return x / displayScaleX;
      const startDisplay = displayRange.startX * outsideScaleX;
      if (x <= startDisplay) return x / outsideScaleX;
      const endDisplay = startDisplay + (displayRange.endX - displayRange.startX) * displayScaleX;
      if (x <= endDisplay) return displayRange.startX + (x - startDisplay) / displayScaleX;
      return displayRange.endX + (x - endDisplay) / outsideScaleX;
    };
    const displayMinX = warpX(box.minX);
    const displayMaxX = warpX(box.maxX);
    const bboxW = Math.max(displayMaxX - displayMinX, 1);
    const worldH = Math.max(box.maxY, 1) + Math.max(-box.minY, 0);
    const fitScale = Math.min((W - 2 * sidePad) / bboxW, (H - topPad - groundPad) / worldH);
    const scale = Math.min(work.preferredScale ?? fitScale, fitScale);
    const cxDisplay = (displayMinX + displayMaxX) / 2;
    const viewShiftY = H * Math.min(0.25, Math.max(-0.25, work.viewShiftYRatio ?? 0));
    const groundY = H - groundPad - viewShiftY;
    const toScreen = (wx: number, wy: number): Vec2 => ({ x: W / 2 + (warpX(wx) - cxDisplay) * scale, y: groundY - wy * scale });
    const toWorld = (sx: number, sy: number): Vec2 => ({ x: unwarpX(cxDisplay + (sx - W / 2) / scale), y: (groundY - sy) / scale });

    const stage = new Konva.Stage({ container, width: W, height: H });
    const layer = new Konva.Layer();
    stage.add(layer);

    // ── Zoom (lăn chuột quanh con trỏ, hoặc nút +/−/reset) — chỉ scale + dịch
    // stage (KHÔNG GIAN), không vẽ lại nội dung. Nền vẽ bằng CSS của container
    // (không phải Konva.Rect) nên khung canvas luôn phủ kín, không "trôi" theo
    // transform khi zoom/pan. ──
    zoomActionsRef.current = attachZoomPan(stage, { width: W, height: H, onZoomChange: setZoomPct, panExtentFactor: GRID_EXTENT_FACTOR });

    // Lưới phủ kín canvas → không gian vô hạn. Vẽ RỘNG HƠN khung nhìn ban đầu
    // (GRID_EXTENT_FACTOR lần) để còn phủ kín khi zoom out / kéo canvas. LUÔN
    // vẽ (kể cả minimalOverlay) — lưới chỉ là kết cấu nền mờ, khác với trục
    // toạ độ/nhãn số/gốc O/nhãn toạ độ debug (những thứ minimalOverlay ẩn).
    const wl = toWorld(0, 0).x, wr = toWorld(W, 0).x;
    const wb = toWorld(0, H).y, wt = toWorld(0, 0).y;
    // Thêm bậc nhỏ hơn 1 đơn vị — preset có thang world nhỏ (vd khe hở tụ điện
    // vài chục cm) đạt scale rất cao (px/đơn vị) nên trước đây LUÔN rơi vào
    // bậc thô nhất (step=1), khiến cả khung nhìn (world height ~1 đơn vị) chỉ
    // có 0-1 đường lưới — trông như "mất lưới". Bậc mịn hơn không ảnh hưởng
    // preset thang lớn (con lắc, ném xiên…) vì scale của chúng hiếm khi vượt 100.
    const step = scale >= 400 ? 0.1 : scale >= 200 ? 0.2 : scale >= 100 ? 0.5 : scale >= 26 ? 1 : scale >= 13 ? 2 : 5;
    const gridColor = "#3a4a68"; // tăng tương phản mạnh với nền #0f172a (bậc #1e293b/#293548 trước đó gần như không thấy)
    const cxWorld = (wl + wr) / 2, cyWorld = (wb + wt) / 2;
    const gx0 = cxWorld - (GRID_EXTENT_FACTOR * (wr - wl)) / 2, gx1 = cxWorld + (GRID_EXTENT_FACTOR * (wr - wl)) / 2;
    const gy0 = cyWorld - (GRID_EXTENT_FACTOR * (wt - wb)) / 2, gy1 = cyWorld + (GRID_EXTENT_FACTOR * (wt - wb)) / 2;
    const usesHorizontalWarp = Boolean(displayRange) || Math.abs(displayScaleX - 1) > 1e-9;
    if (usesHorizontalWarp && minimalOverlay) {
      // Với scene minh hoạ có kéo/nén trục X (vd Định luật II Newton), lưới
      // chỉ là texture nền. Nếu vẽ bằng toScreen(), lưới cũng bị warp theo
      // apparatus và tạo các ô nền méo/không đều.
      const screenStep = Math.max(36, Math.min(90, step * scale));
      const gridW = W * GRID_EXTENT_FACTOR;
      const gridH = H * GRID_EXTENT_FACTOR;
      const x0 = (W - gridW) / 2;
      const x1 = (W + gridW) / 2;
      const y0 = (H - gridH) / 2;
      const y1 = (H + gridH) / 2;
      for (let x = Math.floor(x0 / screenStep) * screenStep; x <= x1; x += screenStep) {
        layer.add(new Konva.Line({ points: [x, y0, x, y1], stroke: gridColor, strokeWidth: 1 }));
      }
      for (let y = Math.floor(y0 / screenStep) * screenStep; y <= y1; y += screenStep) {
        layer.add(new Konva.Line({ points: [x0, y, x1, y], stroke: gridColor, strokeWidth: 1 }));
      }
    } else {
      for (let gx = Math.ceil(gx0 / step) * step; gx <= gx1; gx += step) {
        const x = toScreen(gx, 0).x;
        layer.add(new Konva.Line({ points: [x, toScreen(0, gy1).y, x, toScreen(0, gy0).y], stroke: gridColor, strokeWidth: 1 }));
      }
      for (let gy = Math.ceil(gy0 / step) * step; gy <= gy1; gy += step) {
        const y = toScreen(0, gy).y;
        layer.add(new Konva.Line({ points: [toScreen(gx0, 0).x, y, toScreen(gx1, 0).x, y], stroke: gridColor, strokeWidth: 1 }));
      }
    }

    // Mặt đất/trục Ox, trục Oy, nhãn số, gốc O — ẩn khi minimalOverlay (sơ đồ
    // giáo khoa tối giản tự vẽ mọi thứ qua annotations, không cần định lượng).
    if (!minimalOverlay) {
      const groundX0 = toScreen(gx0, 0).x, groundX1 = toScreen(gx1, 0).x;
      layer.add(new Konva.Rect({ x: groundX0, y: groundY, width: groundX1 - groundX0, height: 4000, fill: "#0b1220" }));
      layer.add(new Konva.Line({ points: [groundX0, groundY, groundX1, groundY], stroke: "#64748b", strokeWidth: 3 }));

      // ── Trục toạ độ + nhãn số (mặt phẳng 2D định lượng) ──
      const labelColor = "#64748b";
      const yAxisX = toScreen(0, 0).x;
      const yAxisOnScreen = yAxisX >= 0 && yAxisX <= W - 16;
      if (yAxisOnScreen) {
        layer.add(new Konva.Line({ points: [yAxisX, toScreen(0, gy1).y, yAxisX, groundY], stroke: "#3f4d63", strokeWidth: 1.5 })); // trục Oy
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
    }

    // Thanh treo trang trí — khi ≥2 vật fixed cùng độ cao (vd nhiều con lắc
    // treo cạnh nhau), vẽ 1 thanh ngang nối chúng + giá đỡ gạch chéo ở 2 đầu,
    // giống sơ đồ con lắc Barton kinh điển. THUẦN HIỂN THỊ — các trục vẫn là
    // fixed độc lập về vật lý (kernel chưa hỗ trợ vật rắn quay/thanh cứng chung).
    if (!hideFixedSupportDecoration) {
      const fixedGroups = new Map<number, { x: number; y: number }[]>();
      for (const b of work.bodies) {
        if (!b.fixed) continue;
        const key = Math.round(b.y * 100);
        const list = fixedGroups.get(key) ?? [];
        list.push({ x: b.x, y: b.y });
        fixedGroups.set(key, list);
      }
      for (const group of fixedGroups.values()) {
        if (group.length < 2) continue;
        const minX = Math.min(...group.map((b) => b.x));
        const maxX = Math.max(...group.map((b) => b.x));
        const y = group[0]!.y;
        const pad = 0.5; // world units — thanh nhô ra ngoài 2 trục ngoài cùng
        const left = toScreen(minX - pad, y);
        const right = toScreen(maxX + pad, y);
        layer.add(new Konva.Line({ points: [left.x, left.y, right.x, right.y], stroke: "#475569", strokeWidth: 4 }));
        for (const pt of [left, right]) {
          const wW = 24, wH = 16;
          // Giá đỡ hình nêm dưới đầu thanh.
          layer.add(
            new Konva.Line({
              points: [pt.x - wW / 2, pt.y + wH, pt.x + wW / 2, pt.y + wH, pt.x, pt.y],
              closed: true,
              fill: "#1e293b",
              stroke: "#475569",
              strokeWidth: 1.5,
            }),
          );
          // Vạch gạch chéo (ký hiệu ngàm cố định) dưới giá đỡ.
          layer.add(new Konva.Line({ points: [pt.x - wW / 2 - 4, pt.y + wH, pt.x + wW / 2 + 4, pt.y + wH], stroke: "#475569", strokeWidth: 2 }));
          for (let i = -1; i <= 2; i++) {
            const hx = pt.x - wW / 2 + i * (wW / 3);
            layer.add(
              new Konva.Line({ points: [hx, pt.y + wH, hx - 6, pt.y + wH + 8], stroke: "#64748b", strokeWidth: 1.5 }),
            );
          }
        }
      }
    }

    // Mặt phẳng riêng của cảnh (surface constraint) — bỏ qua khi minimalOverlay
    // vì preset tự vẽ mặt phẳng qua annotations "rect" (vd bản kim loại tụ điện).
    if (!minimalOverlay) {
      for (const c of work.constraints) {
        if (c.kind !== "surface") continue;
        const rad = (c.angle * Math.PI) / 180;
        const hx = (Math.cos(rad) * c.length) / 2;
        const hy = (Math.sin(rad) * c.length) / 2;
        const a = toScreen(c.x - hx, c.y - hy);
        const b = toScreen(c.x + hx, c.y + hy);
        layer.add(new Konva.Line({ points: [a.x, a.y, b.x, b.y], stroke: "#475569", strokeWidth: 4 }));
      }
    }

    // Máng/đường ray cong: ràng buộc đã được kernel xử lý, renderer chỉ chuyển
    // các điểm world sang màn hình và vẽ hai lớp nét để học sinh nhìn rõ ray.
    for (const c of work.constraints) {
      if (c.kind !== "curveTrack" || c.points.length < 2 || c.appearance === "hidden") continue;
      if (c.appearance === "rollerCoaster") {
        const centerline = c.points.map((point) => toScreen(point.x, point.y));
        const rail = centerline.map((point, index) => {
          const before = centerline[Math.max(0, index - 1)]!;
          const after = centerline[Math.min(centerline.length - 1, index + 1)]!;
          const dx = after.x - before.x;
          const dy = after.y - before.y;
          const length = Math.hypot(dx, dy) || 1;
          const tx = dx / length;
          const ty = dy / length;
          let nx = -ty;
          let ny = tx;
          if (ny < 0) {
            nx *= -1;
            ny *= -1;
          }
          return { x: point.x, y: point.y, nx, ny };
        });
        const baseY = groundY;
        const visualRail = extendScreenTrack(rail, 50, 50);

        layer.add(
          new Konva.Line({
            points: [visualRail[0]!.x - 18, baseY, visualRail[visualRail.length - 1]!.x + 18, baseY],
            stroke: "#334155",
            strokeWidth: 6,
            lineCap: "round",
            listening: false,
          }),
        );

        for (let index = 3; index < rail.length - 2; index += 8) {
          const point = rail[index]!;
          if (baseY - point.y < 12) continue;
          layer.add(
            new Konva.Line({
              points: [point.x, point.y + 3, point.x, baseY],
              stroke: "#475569",
              strokeWidth: 5,
              lineCap: "round",
              listening: false,
            }),
            new Konva.Line({
              points: [point.x, point.y + 10, point.x + 17, baseY],
              stroke: "#334155",
              strokeWidth: 2,
              listening: false,
            }),
            new Konva.Rect({
              x: point.x - 10,
              y: baseY - 3,
              width: 20,
              height: 6,
              fill: "#64748b",
              cornerRadius: 2,
              listening: false,
            }),
          );
        }

        for (let index = 1; index < rail.length - 1; index += 4) {
          const point = rail[index]!;
          layer.add(
            new Konva.Line({
              points: [
                point.x - point.nx * 9,
                point.y - point.ny * 9,
                point.x + point.nx * 9,
                point.y + point.ny * 9,
              ],
              stroke: "#64748b",
              strokeWidth: 3,
              lineCap: "round",
              listening: false,
            }),
          );
        }

        const railPoints = visualRail.flatMap((point) => [point.x, point.y]);
        layer.add(
          new Konva.Line({
            points: railPoints,
            stroke: "#0f172a",
            strokeWidth: 13,
            lineCap: "round",
            lineJoin: "round",
            listening: false,
          }),
        );
        for (const offset of [-3.5, 3.5]) {
          layer.add(
            new Konva.Line({
              points: visualRail.flatMap((point) => [
                point.x + point.nx * offset,
                point.y + point.ny * offset,
              ]),
              stroke: offset < 0 ? "#5eead4" : "#2dd4bf",
              strokeWidth: 2.5,
              lineCap: "round",
              lineJoin: "round",
              listening: false,
              shadowBlur: 5,
              shadowColor: "#14b8a6",
              shadowOpacity: 0.32,
            }),
          );
        }
        continue;
      }
      const displayPoints = c.appearance === "galileiRamp"
        ? offsetTrackPoints(c.points, -(c.visualOffset ?? 0))
        : c.points;
      const points = displayPoints.flatMap((point) => {
        const screen = toScreen(point.x, point.y);
        return [screen.x, screen.y];
      });
      if (c.appearance === "galileiRamp") {
        layer.add(
          new Konva.Line({
            points,
            stroke: "#0b1220",
            strokeWidth: 16,
            lineCap: "round",
            lineJoin: "round",
            listening: false,
            shadowBlur: 8,
            shadowColor: "#020617",
            shadowOpacity: 0.45,
          }),
        );
        layer.add(
          new Konva.Line({
            points,
            stroke: "#64748b",
            strokeWidth: 8,
            lineCap: "round",
            lineJoin: "round",
            listening: false,
          }),
        );
        layer.add(
          new Konva.Line({
            points,
            stroke: "#cbd5e1",
            strokeWidth: 2.5,
            lineCap: "round",
            lineJoin: "round",
            listening: false,
          }),
        );
        continue;
      }
      layer.add(
        new Konva.Line({
          points,
          stroke: "#1e293b",
          strokeWidth: 10,
          lineCap: "round",
          lineJoin: "round",
          listening: false,
        }),
      );
      layer.add(
        new Konva.Line({
          points,
          stroke: "#94a3b8",
          strokeWidth: 4,
          lineCap: "round",
          lineJoin: "round",
          listening: false,
        }),
      );
    }
    // Chú thích tuỳ chọn của preset (đường sức, nhãn +/−, bản kim loại, đường
    // sức cong mép…) — toạ độ world TĨNH, vẽ một lần, không bám vật động.
    // `animated` (arrow/curve) → nét đứt "chảy" theo chiều mũi tên, cập nhật
    // trong vòng lặp Konva.Animation bên dưới (xem `flowingShapes`).
    const flowingShapes: Konva.Shape[] = [];
    for (const ann of annotations ?? []) {
      if (ann.kind === "arrow") {
        const p1 = toScreen(ann.x1, ann.y1);
        const p2 = toScreen(ann.x2, ann.y2);
        const color = ann.color ?? "#34d399";
        const line = new Konva.Line({
          points: [p1.x, p1.y, p2.x, p2.y],
          stroke: color,
          strokeWidth: 2,
          listening: false,
          dash: ann.animated ? [10, 8] : undefined,
        });
        layer.add(line);
        if (ann.animated) flowingShapes.push(line);
        const t = ann.arrowAt ?? 1;
        const ax = p1.x + (p2.x - p1.x) * t;
        const ay = p1.y + (p2.y - p1.y) * t;
        addArrowhead(layer, ax, ay, Math.atan2(p2.y - p1.y, p2.x - p1.x), color);
      } else if (ann.kind === "rect") {
        const corner = toScreen(ann.x - ann.width / 2, ann.y + ann.height / 2); // world top-left (y lên → screen trên)
        layer.add(
          // Width follows the same display-only horizontal warp as positions.
          new Konva.Rect({
            x: corner.x,
            y: corner.y,
            width: toScreen(ann.x + ann.width / 2, ann.y).x - corner.x,
            height: ann.height * scale,
            fill: ann.fill ?? "#e2e8f0",
            stroke: ann.stroke ?? "#475569",
            strokeWidth: ann.strokeWidth ?? 2,
            cornerRadius: 2,
            listening: false,
          }),
        );
      } else if (ann.kind === "polygon") {
        const points = ann.points.flatMap((point) => {
          const screenPoint = toScreen(point.x, point.y);
          return [screenPoint.x, screenPoint.y];
        });
        layer.add(
          new Konva.Line({
            points,
            closed: true,
            fill: ann.fill ?? "#1e293b",
            stroke: ann.stroke ?? "#64748b",
            strokeWidth: ann.strokeWidth ?? 2,
            opacity: ann.opacity ?? 1,
            lineJoin: "round",
            listening: false,
          }),
        );
      } else if (ann.kind === "curve") {
        const p1 = toScreen(ann.x1, ann.y1);
        const c1 = toScreen(ann.cx1, ann.cy1);
        const c2 = toScreen(ann.cx2, ann.cy2);
        const p2 = toScreen(ann.x2, ann.y2);
        const color = ann.color ?? "#f59e0b";
        const path = new Konva.Path({
          data: `M ${p1.x} ${p1.y} C ${c1.x} ${c1.y} ${c2.x} ${c2.y} ${p2.x} ${p2.y}`,
          stroke: color,
          strokeWidth: ann.strokeWidth ?? 2,
          listening: false,
          dash: ann.animated ? [10, 8] : undefined,
        });
        layer.add(path);
        if (ann.animated) flowingShapes.push(path);
        if (ann.arrowAt != null) {
          const t = ann.arrowAt;
          const mt = 1 - t;
          const bx = mt * mt * mt * p1.x + 3 * mt * mt * t * c1.x + 3 * mt * t * t * c2.x + t * t * t * p2.x;
          const by = mt * mt * mt * p1.y + 3 * mt * mt * t * c1.y + 3 * mt * t * t * c2.y + t * t * t * p2.y;
          const dx = 3 * mt * mt * (c1.x - p1.x) + 6 * mt * t * (c2.x - c1.x) + 3 * t * t * (p2.x - c2.x);
          const dy = 3 * mt * mt * (c1.y - p1.y) + 6 * mt * t * (c2.y - c1.y) + 3 * t * t * (p2.y - c2.y);
          addArrowhead(layer, bx, by, Math.atan2(dy, dx), color);
        }
      } else {
        const p = toScreen(ann.x, ann.y);
        const text = new Konva.Text({
          x: ann.centered ? p.x : p.x - 5,
          y: p.y - 8,
          text: ann.text,
          fontSize: ann.fontSize ?? 16,
          fontStyle: ann.fontStyle ?? "bold",
          fill: ann.color ?? "#e2e8f0",
          fontFamily: ann.fontFamily ?? "monospace",
          listening: false,
        });
        if (ann.centered) text.offsetX(text.width() / 2);
        layer.add(text);
      }
    }

    // Lò xo + dây/thanh.
    const springs: { a: string; b: string; line: Konva.Line; restLength: number; compressionOnly?: boolean }[] = [];
    for (const f of work.forces) {
      if (f.kind !== "spring") continue;
      const hookeSpring = f.appearance === "hooke";
      const line = new Konva.Line({
        stroke: hookeSpring ? "#94a3b8" : "#cbd5e1",
        strokeWidth: hookeSpring ? 3.5 : 2.5,
        lineCap: "round",
        lineJoin: "round",
        shadowBlur: hookeSpring ? 5 : 0,
        shadowColor: "#020617",
        shadowOpacity: hookeSpring ? 0.48 : 0,
      });
      layer.add(line);
      springs.push({ a: f.a, b: f.b, line, restLength: f.restLength, compressionOnly: f.compressionOnly });
    }
    const links: { a: string; b: string; line: Konva.Line }[] = [];
    const rightAngleLinks: {
      horizontal: string;
      vertical: string;
      corner: Vec2;
      line: Konva.Line;
    }[] = [];
    for (const c of work.constraints) {
      if (c.kind === "surface" || c.kind === "curveTrack") continue;
      if (c.kind === "rightAngleRope") {
        const line = new Konva.Line({
          stroke: "#cbd5e1",
          strokeWidth: 2,
          lineCap: "round",
          lineJoin: "round",
          listening: false,
        });
        layer.add(line);
        rightAngleLinks.push({
          horizontal: c.horizontal,
          vertical: c.vertical,
          corner: c.corner,
          line,
        });
        continue;
      }
      const pendulumRod = c.kind === "rod" && c.appearance === "pendulum";
      const line = new Konva.Line({
        stroke: pendulumRod ? "#cbd5e1" : "#64748b",
        strokeWidth: pendulumRod ? 4 : c.kind === "rod" ? 3 : 1.5,
        lineCap: "round",
        shadowBlur: pendulumRod ? 5 : 0,
        shadowColor: "#0f172a",
        shadowOpacity: pendulumRod ? 0.5 : 0,
      });
      layer.add(line);
      links.push({ a: c.a, b: c.b, line });
    }

    // Vật.
    const circles: Record<string, Konva.Node> = {};
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
      const screen = toScreen(wpt.x, wpt.y);
      const verticalRope = work.constraints.find(
        (constraint) => constraint.kind === "rightAngleRope" && constraint.vertical === id,
      );
      if (verticalRope?.kind === "rightAngleRope") {
        const pulleyBody = work.bodies.find(
          (body) =>
            body.visual?.shape === "pulley" &&
            Math.abs(body.x - verticalRope.corner.x) < 1e-6 &&
            Math.abs(body.y - verticalRope.corner.y) < 1e-6,
        );
        const ropeRadius = pulleyBody
          ? Math.min(28, Math.max(13, radiusFor(pulleyBody))) + 2
          : 24;
        return {
          x: toScreen(verticalRope.corner.x, verticalRope.corner.y).x + ropeRadius,
          y: screen.y,
        };
      }
      const body = work.bodies.find((candidate) => candidate.id === id);
      const horizontalSurface = work.constraints.find(
        (constraint) => constraint.kind === "surface" && Math.abs(constraint.angle) < 1e-6,
      );
      if (body?.visual?.wheels && horizontalSurface?.kind === "surface") {
        return {
          x: screen.x,
          y: toScreen(horizontalSurface.x, horizontalSurface.y).y - cartVisualBottom(radiusFor(body)),
        };
      }
      return screen;
    };
    // Toạ độ world để hiển thị (vật đang kéo → quy từ vị trí node về world).
    const worldOf = (id: string): Vec2 => {
      const node = circles[id];
      if (id === draggingId && node) return toWorld(node.x(), node.y());
      return posOf(id);
    };

    const trailNodes: Record<string, { line: Konva.Line; points: number[]; last: Vec2 }> = {};
    for (const [bodyId, style] of Object.entries(bodyTrails ?? {})) {
      const body = work.bodies.find((candidate) => candidate.id === bodyId);
      if (!body || body.fixed) continue;
      const initial = toScreen(readPosition(state, body.id).x, readPosition(state, body.id).y);
      const line = new Konva.Line({
        points: [],
        stroke: style.color ?? "#f59e0b",
        strokeWidth: style.width ?? 2,
        dash: style.dash ?? [8, 7],
        lineCap: "round",
        lineJoin: "round",
        listening: false,
        opacity: 0.9,
      });
      layer.add(line);
      trailNodes[bodyId] = { line, points: [], last: initial };
    }

    // Bán kính hiển thị — dùng chung cho vật thật lẫn tàn ảnh (ghost).
    const radiusFor = (b: Scene["bodies"][number]): number => {
      const worldR = b.radius ?? Math.min(0.25 + b.mass * 0.04, 0.5);
      const visualScale = Math.max(b.displayScale ?? 1, 0.1);
      return Math.max(6, worldR * scale * visualScale);
    };
    const cartVisualRadius = (bodyRadius: number): number => Math.min(42, Math.max(12, bodyRadius));
    const cartVisualBottom = (bodyRadius: number): number => {
      const cartRadius = cartVisualRadius(bodyRadius);
      const height = cartRadius * 1.5;
      const wheelRadius = cartRadius * 0.28;
      const wheelY = height / 2 - wheelRadius * 0.55;
      return wheelY + wheelRadius;
    };
    // Chỉ tải ảnh lông vũ khi scene THẬT SỰ có vật dùng shape "feather" — effect
    // này chạy lại mỗi lần đổi tham số (phụ thuộc `scene`), nên tải vô điều
    // kiện ở đây sẽ load lại ảnh trên MỌI preset cơ học mỗi lần kéo slider.
    const usesFeather = work.bodies.some((b) => b.visual?.shape === "feather");
    const featherAsset = usesFeather ? new window.Image() : null;
    if (featherAsset) {
      featherAsset.decoding = "async";
      featherAsset.onload = () => layer.batchDraw();
      featherAsset.src = "/simulations/newton/feather.png";
    }


    // Tàn ảnh (ghost) — vị trí các vật động tại mốc VỪA đi qua trước đó, vẽ nét
    // Ghost body positions at a previous seek point.
    const makeForceMeterNode = (p: Vec2, radius: number, b: Scene["bodies"][number], fill: string, draggable: boolean): Konva.Group => {
      const visual = b.visual;
      const group = new Konva.Group({ x: p.x, y: p.y, rotation: visual?.angle ?? 0, draggable });
      if (visual?.orientation === "vertical") {
        const bodyW = Math.max(48, radius * 1.75);
        const bodyH = Math.max(112, radius * 4.5);
        const top = -bodyH / 2;
        const bottom = bodyH / 2;
        const readingRatio = Math.max(0, Math.min(1, visual.readingRatio ?? 0));
        const springTop = top + 13;
        const springMinEnd = top + 36;
        const springMaxEnd = bottom - 22;
        const springEnd = springMinEnd + (springMaxEnd - springMinEnd) * readingRatio;

        group.add(new Konva.Line({ points: [0, top - 20, 0, top - 5], stroke: "#94a3b8", strokeWidth: 3, lineCap: "round" }));
        group.add(new Konva.Circle({ x: 0, y: top - 25, radius: 7, stroke: "#cbd5e1", strokeWidth: 3 }));
        group.add(new Konva.Rect({ x: -bodyW / 2, y: top, width: bodyW, height: bodyH, cornerRadius: 4, fill: "#f8fafc", opacity: 0.92, stroke: "#334155", strokeWidth: 2 }));
        group.add(new Konva.Rect({ x: -bodyW / 2 + 5, y: top + 5, width: bodyW - 10, height: bodyH - 10, cornerRadius: 2, fill, opacity: 0.1 }));

        const springPoints = [0, springTop];
        const coils = 9;
        for (let i = 1; i < coils; i += 1) {
          const t = i / coils;
          springPoints.push((i % 2 === 0 ? -1 : 1) * 8, springTop + (springEnd - springTop) * t);
        }
        springPoints.push(0, springEnd);
        group.add(new Konva.Line({ points: springPoints, stroke: "#64748b", strokeWidth: 3, lineCap: "round", lineJoin: "round" }));

        const scaleX = bodyW / 2 - 8;
        group.add(new Konva.Line({ points: [scaleX, springMinEnd - 5, scaleX, springMaxEnd + 5], stroke: "#94a3b8", strokeWidth: 1 }));
        for (let i = 0; i <= 10; i += 1) {
          const y = springMinEnd + ((springMaxEnd - springMinEnd) * i) / 10;
          const tick = i % 5 === 0 ? 8 : 4;
          group.add(new Konva.Line({ points: [scaleX - tick, y, scaleX, y], stroke: "#64748b", strokeWidth: 1.2 }));
        }
        group.add(new Konva.Line({ points: [-bodyW / 2 + 5, springEnd, bodyW / 2 - 4, springEnd], stroke: "#ef4444", strokeWidth: 3, lineCap: "round" }));
        group.add(new Konva.Arrow({
          points: [bodyW / 2 + 42, springEnd, bodyW / 2 + 5, springEnd],
          stroke: "#e2e8f0",
          fill: "#e2e8f0",
          strokeWidth: 2,
          pointerLength: 7,
          pointerWidth: 7,
          listening: false,
        }));
        group.add(new Konva.Text({
          x: bodyW / 2 + 47,
          y: springEnd - 8,
          width: 72,
          text: visual.reading ?? "0.0 N",
          fontSize: 12,
          fontStyle: "bold",
          fill: "#f8fafc",
          fontFamily: "monospace",
          listening: false,
        }));

        const linkedHook = visual.forceMeterHookBody ? screenOf(visual.forceMeterHookBody) : null;
        if (linkedHook) {
          const hookX = linkedHook.x - p.x;
          const hookY = linkedHook.y - p.y;
          group.add(new Konva.Line({ points: [0, springEnd, 0, bottom + 2, hookX, hookY - 6], stroke: "#64748b", strokeWidth: 3, lineCap: "round", lineJoin: "round" }));
          group.add(new Konva.Rect({ x: -bodyW / 2 - 4, y: bottom - 3, width: bodyW + 8, height: 6, fill: "#d6a15f", stroke: "#92400e", strokeWidth: 1 }));
          group.add(new Konva.Circle({ x: hookX, y: hookY, radius: 6, stroke: "#cbd5e1", strokeWidth: 3 }));
        } else {
          group.add(new Konva.Line({ points: [0, bottom, 0, bottom + 17], stroke: "#64748b", strokeWidth: 3, lineCap: "round" }));
          group.add(new Konva.Line({ points: [0, bottom + 17, 7, bottom + 24, 0, bottom + 31, -7, bottom + 24], stroke: "#64748b", strokeWidth: 3, lineCap: "round", lineJoin: "round" }));
        }
        return group;
      }      const bodyW = Math.max(44, radius * 3.2);
      const bodyH = Math.max(22, radius * 1.45);
      const handleW = Math.max(28, radius * 1.6);
      const reading = visual?.reading ?? "";
      group.add(new Konva.Rect({ x: -bodyW / 2, y: -bodyH / 2, width: bodyW, height: bodyH, cornerRadius: 6, fill: "#e5e7eb", stroke: "#334155", strokeWidth: 2 }));
      group.add(new Konva.Rect({ x: -bodyW / 2 + 5, y: -bodyH / 2 + 5, width: bodyW - 10, height: bodyH - 10, cornerRadius: 4, fill, opacity: 0.22 }));
      group.add(new Konva.Line({ points: [bodyW / 2, 0, bodyW / 2 + handleW, 0], stroke: "#cbd5e1", strokeWidth: 4, lineCap: "round" }));
      group.add(new Konva.Circle({ x: bodyW / 2 + handleW + 6, y: 0, radius: 5, stroke: "#cbd5e1", strokeWidth: 3 }));
      group.add(new Konva.Line({ points: [-bodyW / 2 - handleW, 0, -bodyW / 2, 0], stroke: "#cbd5e1", strokeWidth: 4, lineCap: "round" }));
      group.add(new Konva.Text({ x: -bodyW / 2, y: -8, width: bodyW, align: "center", text: reading || visual?.label || "F", fontSize: 12, fontStyle: "bold", fill: "#0f172a", fontFamily: "monospace" }));
      return group;
    };

    const makeMetalBallNode = (
      p: Vec2,
      radius: number,
      draggable: boolean,
      tone: "steel" | "brass" = "steel",
    ): Konva.Group => {
      const ballRadius = Math.min(18, Math.max(10, radius * 1.08));
      const gradientStops = tone === "brass"
        ? [
            0, "#fff7c2",
            0.2, "#f5d76e",
            0.5, "#c99722",
            0.8, "#73510f",
            1, "#2f2108",
          ]
        : [
            0, "#f8fafc",
            0.2, "#cbd5e1",
            0.52, "#64748b",
            0.82, "#334155",
            1, "#111827",
          ];
      const group = new Konva.Group({ x: p.x, y: p.y, draggable });
      group.add(
        new Konva.Circle({
          radius: ballRadius,
          fillRadialGradientStartPoint: { x: -ballRadius * 0.38, y: -ballRadius * 0.42 },
          fillRadialGradientStartRadius: 0,
          fillRadialGradientEndPoint: { x: ballRadius * 0.12, y: ballRadius * 0.18 },
          fillRadialGradientEndRadius: ballRadius * 1.18,
          fillRadialGradientColorStops: gradientStops,
          stroke: tone === "brass" ? "#fde68a" : "#e2e8f0",
          strokeWidth: 1.2,
          shadowBlur: 9,
          shadowColor: "#020617",
          shadowOpacity: 0.5,
          shadowOffset: { x: 2, y: 4 },
        }),
        new Konva.Ellipse({
          x: -ballRadius * 0.32,
          y: -ballRadius * 0.38,
          radiusX: ballRadius * 0.24,
          radiusY: ballRadius * 0.13,
          rotation: -32,
          fill: tone === "brass" ? "#fff7c2" : "#f8fafc",
          opacity: 0.72,
          listening: false,
        }),
        new Konva.Arc({
          x: ballRadius * 0.03,
          y: ballRadius * 0.04,
          innerRadius: ballRadius * 0.72,
          outerRadius: ballRadius * 0.78,
          angle: 76,
          rotation: 34,
          fill: tone === "brass" ? "#d6a62b" : "#94a3b8",
          opacity: 0.32,
          listening: false,
        }),
      );
      return group;
    };

    const makeFeatherNode = (p: Vec2, radius: number, angle: number, draggable: boolean): Konva.Group => {
      const size = Math.min(62, Math.max(46, radius * 5.2));
      const group = new Konva.Group({ x: p.x, y: p.y, rotation: angle, draggable });
      group.add(
        new Konva.Image({
          x: -size / 2,
          y: -size / 2,
          width: size,
          height: size,
          image: featherAsset ?? undefined,
          shadowBlur: 7,
          shadowColor: "#020617",
          shadowOpacity: 0.34,
          shadowOffset: { x: 2, y: 3 },
        }),
      );
      return group;
    };

    const makeBodyNode = (b: Scene["bodies"][number], p: Vec2, radius: number, fill: string, draggable: boolean): Konva.Shape | Konva.Group => {
      const shape = b.visual?.shape ?? "circle";
      const angle = b.visual?.angle ?? 0;
      if (shape === "forceMeter") return makeForceMeterNode(p, radius, b, fill, draggable);
      if (shape === "metalBall") return makeMetalBallNode(p, radius, draggable, b.visual?.metalTone);
      if (shape === "feather") return makeFeatherNode(p, radius, angle, draggable);
      if (shape === "pulley") {
        const pulleyRadius = Math.min(28, Math.max(13, radius));
        const group = new Konva.Group({ x: p.x, y: p.y, draggable });
        group.add(
          new Konva.Circle({
            radius: pulleyRadius,
            fill: "#1e293b",
            stroke: "#cbd5e1",
            strokeWidth: 3,
            shadowBlur: 8,
            shadowColor: "#020617",
            shadowOpacity: 0.45,
          }),
          new Konva.Circle({
            radius: pulleyRadius * 0.7,
            stroke: "#64748b",
            strokeWidth: 2,
          }),
          new Konva.Circle({
            radius: Math.max(4, pulleyRadius * 0.22),
            fill: "#cbd5e1",
            stroke: "#334155",
            strokeWidth: 1.5,
          }),
        );
        return group;
      }
      if (shape === "pendulumPivot") {
        const group = new Konva.Group({ x: p.x, y: p.y, draggable: false });
        group.add(
          new Konva.Rect({
            x: -44,
            y: -31,
            width: 88,
            height: 8,
            fill: "#334155",
            stroke: "#64748b",
            strokeWidth: 1.5,
            cornerRadius: 3,
          }),
          new Konva.Line({
            points: [-20, -23, 20, -23, 0, 0],
            closed: true,
            fill: "#1e293b",
            stroke: "#94a3b8",
            strokeWidth: 2,
            lineJoin: "round",
          }),
          new Konva.Circle({
            radius: 9,
            fill: "#0f172a",
            stroke: "#5eead4",
            strokeWidth: 3,
          }),
          new Konva.Circle({
            radius: 3.5,
            fill: "#cbd5e1",
          }),
        );
        for (let index = -3; index <= 3; index++) {
          group.add(
            new Konva.Line({
              points: [index * 11 - 5, -32, index * 11 + 2, -39],
              stroke: "#475569",
              strokeWidth: 2,
              lineCap: "round",
            }),
          );
        }
        return group;
      }
      if (shape === "pendulumBob") {
        const bobRadius = Math.max(18, Math.min(32, radius));
        const group = new Konva.Group({ x: p.x, y: p.y, draggable });
        group.add(
          new Konva.Circle({
            radius: bobRadius,
            fill,
            stroke: "#99f6e4",
            strokeWidth: 3,
            shadowBlur: 10,
            shadowColor: "#020617",
            shadowOpacity: 0.46,
            shadowOffset: { x: 3, y: 5 },
          }),
          new Konva.Circle({
            x: -bobRadius * 0.28,
            y: -bobRadius * 0.3,
            radius: bobRadius * 0.28,
            fill: "#ccfbf1",
            opacity: 0.72,
          }),
          new Konva.Arc({
            innerRadius: bobRadius * 0.72,
            outerRadius: bobRadius * 0.82,
            angle: 78,
            rotation: 28,
            fill: "#0f766e",
            opacity: 0.75,
          }),
          new Konva.Text({
            x: -bobRadius,
            y: -7,
            width: bobRadius * 2,
            text: b.visual?.label ?? "",
            align: "center",
            fontSize: 14,
            fontStyle: "bold",
            fontFamily: "monospace",
            fill: "#042f2e",
          }),
        );
        return group;
      }
      if (shape === "hangingWeight") {
        const width = Math.max(52, Math.min(76, radius * 3.2));
        const height = Math.max(46, Math.min(64, radius * 2.6));
        const group = new Konva.Group({ x: p.x, y: p.y, draggable });
        group.add(
          new Konva.Circle({
            y: 1,
            radius: 7,
            fill: "#0f172a",
            stroke: "#bae6fd",
            strokeWidth: 2.5,
          }),
          new Konva.Line({
            points: [0, 8, 0, 16],
            stroke: "#cbd5e1",
            strokeWidth: 4,
            lineCap: "round",
          }),
          new Konva.Line({
            points: [
              -width * 0.42, 15,
              width * 0.42, 15,
              width * 0.5, 15 + height,
              -width * 0.5, 15 + height,
            ],
            closed: true,
            fill,
            stroke: "#bae6fd",
            strokeWidth: 2.5,
            lineJoin: "round",
            shadowBlur: 10,
            shadowColor: "#020617",
            shadowOpacity: 0.46,
            shadowOffset: { x: 3, y: 5 },
          }),
          new Konva.Line({
            points: [-width * 0.32, 24, width * 0.32, 24],
            stroke: "#e0f2fe",
            strokeWidth: 2,
            opacity: 0.7,
            lineCap: "round",
          }),
          new Konva.Text({
            x: -width / 2,
            y: 29,
            width,
            text: b.visual?.label ?? "m",
            align: "center",
            fontSize: 16,
            fontStyle: "bold",
            fontFamily: "monospace",
            fill: "#082f49",
          }),
        );
        return group;
      }
      if (shape === "collisionCart") {
        const width = Math.max(64, Math.min(108, radius * 1.9));
        const height = Math.max(36, Math.min(62, radius * 1.05));
        const wheelRadius = Math.max(8, Math.min(13, radius * 0.22));
        const bodyBottom = -wheelRadius * 0.55;
        const bodyTop = bodyBottom - height;
        const wheelY = -wheelRadius;
        const bumperSide = b.visual?.collisionSide === "left" ? -1 : 1;
        const bumperX = bumperSide * (width / 2 + 8);
        const group = new Konva.Group({ x: p.x, y: p.y, draggable });

        group.add(
          new Konva.Rect({
            x: -width / 2,
            y: bodyTop,
            width,
            height,
            fill,
            stroke: "#bae6fd",
            strokeWidth: 2,
            cornerRadius: 6,
            shadowBlur: 10,
            shadowColor: "#020617",
            shadowOpacity: 0.42,
            shadowOffset: { x: 2, y: 5 },
          }),
          new Konva.Line({
            points: [-width / 2 + 8, bodyTop + 8, width / 2 - 8, bodyTop + 8],
            stroke: "#e0f2fe",
            strokeWidth: 2,
            opacity: 0.75,
            lineCap: "round",
          }),
          new Konva.Text({
            x: -width / 2,
            y: bodyTop + height * 0.38,
            width,
            text: b.visual?.label ?? "",
            align: "center",
            fontSize: 13,
            fontStyle: "bold",
            fontFamily: "monospace",
            fill: "#082f49",
          }),
          new Konva.Line({
            points: [
              bumperSide * width / 2,
              bodyTop + height * 0.38,
              bumperX - bumperSide * 4,
              bodyTop + height * 0.38,
            ],
            stroke: "#cbd5e1",
            strokeWidth: 4,
            lineCap: "round",
          }),
          new Konva.Circle({
            x: bumperX,
            y: bodyTop + height * 0.38,
            radius: 6,
            fill: "#94a3b8",
            stroke: "#e2e8f0",
            strokeWidth: 2,
          }),
        );

        for (const wheelX of [-width * 0.3, width * 0.3]) {
          group.add(
            new Konva.Circle({
              x: wheelX,
              y: wheelY,
              radius: wheelRadius,
              fill: "#0f172a",
              stroke: "#cbd5e1",
              strokeWidth: 2.5,
            }),
            new Konva.Circle({
              x: wheelX,
              y: wheelY,
              radius: wheelRadius * 0.38,
              fill: "#64748b",
              stroke: "#e2e8f0",
              strokeWidth: 1,
            }),
          );
        }
        return group;
      }
      if (shape === "coaster") {
        const width = Math.max(58, Math.min(84, radius * 3.4));
        const height = Math.max(26, Math.min(38, radius * 1.35));
        const wheelRadius = Math.max(6, Math.min(9, radius * 0.28));
        const bodyLift = height * 0.52 + wheelRadius * 0.55;
        const wheelY = 0;
        const group = new Konva.Group({ x: p.x, y: p.y, rotation: angle, draggable });

        group.add(
          new Konva.Line({
            points: [
              -width * 0.5, -height * 0.32 - bodyLift,
              width * 0.34, -height * 0.32 - bodyLift,
              width * 0.5, -height * 0.06 - bodyLift,
              width * 0.42, height * 0.44 - bodyLift,
              -width * 0.42, height * 0.44 - bodyLift,
            ],
            closed: true,
            fill,
            stroke: "#99f6e4",
            strokeWidth: 2,
            lineJoin: "round",
            shadowBlur: 12,
            shadowColor: "#020617",
            shadowOpacity: 0.5,
            shadowOffset: { x: 2, y: 5 },
          }),
          new Konva.Line({
            points: [-width * 0.38, height * 0.4 - bodyLift, width * 0.4, height * 0.4 - bodyLift],
            stroke: "#0f172a",
            strokeWidth: 5,
            lineCap: "round",
          }),
        );

        for (const seatX of [-width * 0.2, width * 0.12]) {
          group.add(
            new Konva.Line({
              points: [
                seatX, -height * 0.28 - bodyLift,
                seatX, -height * 0.72 - bodyLift,
                seatX + 7, -height * 0.72 - bodyLift,
              ],
              stroke: "#cbd5e1",
              strokeWidth: 3,
              lineCap: "round",
              lineJoin: "round",
            }),
            new Konva.Circle({
              x: seatX + 3,
              y: -height * 0.92 - bodyLift,
              radius: 4.5,
              fill: "#f8fafc",
              stroke: "#64748b",
              strokeWidth: 1.5,
            }),
          );
        }

        for (const wheelX of [-width * 0.3, width * 0.29]) {
          group.add(
            new Konva.Circle({
              x: wheelX,
              y: wheelY,
              radius: wheelRadius,
              fill: "#020617",
              stroke: "#94a3b8",
              strokeWidth: 2,
            }),
            new Konva.Circle({
              x: wheelX,
              y: wheelY,
              radius: wheelRadius * 0.38,
              fill: "#5eead4",
            }),
          );
        }
        return group;
      }
      if (shape === "box") {
        if (b.visual?.wheels) {
          // Clamp the complete cart once, then derive every part from the same
          // base size. Separate min/max values made wheels disproportionately
          // large on small canvases and too small again at 100% display scale.
          const cartRadius = cartVisualRadius(radius);
          const width = cartRadius * 2.4;
          const height = cartRadius * 1.5;
          const wheelRadius = cartRadius * 0.28;
          const wheelStroke = cartRadius * 0.08;
          const hubStroke = cartRadius * 0.04;
          // Tâm bánh nằm hơi phía trên mép dưới của thân xe; phần bánh nhô ra
          // vừa đủ để đáy bánh tiếp xúc mặt đường thay vì xuyên xuống dưới.
          const wheelY = height / 2 - wheelRadius * 0.55;
          const group = new Konva.Group({ x: p.x, y: p.y, rotation: angle, draggable });
          group.add(
            new Konva.Rect({
              x: -width / 2,
              y: -height / 2,
              width,
              height,
              fill,
              cornerRadius: 4,
              shadowBlur: draggable ? 8 : 0,
              shadowColor: "#020617",
              shadowOpacity: 0.45,
              shadowOffset: { x: 2, y: 4 },
            }),
          );
          if (b.visual.photogateFlag) {
            const mastX = width * 0.42;
            const mastTop = -height / 2 - 32;
            group.add(
              new Konva.Line({
                points: [mastX, -height / 2, mastX, mastTop],
                stroke: "#cbd5e1",
                strokeWidth: 2,
                lineCap: "round",
              }),
              new Konva.Rect({
                x: mastX,
                y: mastTop,
                width: 13,
                height: 21,
                fill: "#e2e8f0",
                stroke: "#475569",
                strokeWidth: 1,
                cornerRadius: 1,
              }),
            );
          }
          for (const wheelX of [-width * 0.28, width * 0.28]) {
            group.add(
              new Konva.Circle({
                x: wheelX,
                y: wheelY,
                radius: wheelRadius,
                fill: "#111827",
                stroke: "#94a3b8",
                strokeWidth: wheelStroke,
              }),
              new Konva.Circle({
                x: wheelX,
                y: wheelY,
                radius: wheelRadius * 0.34,
                fill: "#cbd5e1",
                stroke: "#475569",
                strokeWidth: hubStroke,
              }),
            );
          }
          return group;
        }
        const width = Math.max(22, radius * 2.4);
        const height = Math.max(18, radius * 1.5);
        return new Konva.Rect({
          x: p.x,
          y: p.y,
          width,
          height,
          offsetX: width / 2,
          offsetY: height / 2,
          fill,
          cornerRadius: 4,
          rotation: angle,
          draggable,
          shadowBlur: draggable ? 6 : 0,
          shadowColor: "#000",
        });
      }
      if (shape === "plate") {
        const width = Math.max(26, radius * 3.0);
        const height = Math.max(10, radius * 0.8);
        return new Konva.Rect({
          x: p.x,
          y: p.y,
          width,
          height,
          offsetX: width / 2,
          offsetY: height / 2,
          fill,
          cornerRadius: 3,
          rotation: angle,
          draggable,
          shadowBlur: draggable ? 6 : 0,
          shadowColor: "#000",
        });
      }
      if (shape === "streamlined") {
        return new Konva.RegularPolygon({ x: p.x, y: p.y, sides: 3, radius: Math.max(10, radius * 1.15), fill, rotation: 90 + angle, draggable, shadowBlur: draggable ? 6 : 0, shadowColor: "#000" });
      }
      return new Konva.Circle({ x: p.x, y: p.y, radius, fill, draggable, shadowBlur: draggable ? 6 : 0, shadowColor: "#000" });
    };

    if (ghostSeconds != null && ghostSeconds >= 0) {
      const ghostPos = computeBodyPositionsAtTime(work, ghostSeconds);
      for (const b of work.bodies) {
        if (b.fixed) continue;
        const gp = ghostPos[b.id];
        if (!gp) continue;
        const sp = toScreen(gp.x, gp.y);
        layer.add(
          new Konva.Circle({
            x: sp.x,
            y: sp.y,
            radius: radiusFor(b),
            stroke: "#f472b6",
            strokeWidth: 1.5,
            dash: [5, 4],
            opacity: 0.55,
            listening: false,
          }),
        );
        if (ghostLabel) {
          layer.add(
            new Konva.Text({
              x: sp.x - 6,
              y: sp.y - radiusFor(b) - 16,
              text: ghostLabel,
              fontSize: 12,
              fontStyle: "italic",
              fill: "#f472b6",
              opacity: 0.65,
              fontFamily: "monospace",
              listening: false,
            }),
          );
        }
      }
    }

    const dynamicAnnotationResetters: (() => void)[] = [];

    for (const b of work.bodies) {
      const p = b.fixed ? toScreen(b.x, b.y) : screenOf(b.id);
      const radius = radiusFor(b);
      const fill = b.visual?.color ?? bodyColors?.[b.id] ?? (b.fixed ? "#1e293b" : "#f472b6");
      const node = makeBodyNode(b, p, radius, fill, !b.fixed && !work.disableDragging);
      layer.add(node);
      circles[b.id] = node;

      if (!b.fixed && seekToken && markLabel) {
        const badge = new Konva.Label({ x: p.x + radius + 4, y: p.y - radius - 22, listening: false });
        badge.add(new Konva.Tag({ fill: "#e8724a", cornerRadius: 4 }));
        badge.add(new Konva.Text({ text: markLabel, fontSize: 12, fontStyle: "bold", fill: "#ffffff", fontFamily: "monospace", padding: 4 }));
        layer.add(badge);
      }

      if (!b.fixed && !work.disableDragging) {
        const dragNode = node as Konva.Node;
        dragNode.on("dragstart", () => {
          draggingId = b.id;
          resumeAfterDrag = runningRef.current;
          onRunningChange(false);
        });
        dragNode.on("dragend", () => {
          const wpt = toWorld(dragNode.x(), dragNode.y());
          const body = work.bodies.find((x) => x.id === b.id)!;
          body.x = wpt.x; body.y = wpt.y; body.vx = 0; body.vy = 0;
          kernel = buildKernel(work);
          state = kernel.project(kernel.initialState);
          simulationSeconds = 0;
          for (const resetAnnotation of dynamicAnnotationResetters) resetAnnotation();
          const trail = trailNodes[b.id];
          if (trail) {
            trail.points = [];
            trail.last = { x: dragNode.x(), y: dragNode.y() };
            trail.line.points([]);
          }
          draggingId = null;
          onRunningChange(resumeAfterDrag);
        });
      }
    }

    // Tracking coordinates and live values.
    const coordLabels: Record<string, Konva.Text> = {};
    if (!minimalOverlay && !hideCoordinateLabels) {
      for (const b of work.bodies) {
        if (b.fixed) continue;
        const t = new Konva.Text({ text: "", fontSize: 11, fill: "#cbd5e1", fontFamily: "monospace" });
        layer.add(t);
        coordLabels[b.id] = t;
      }
    }

    // Nhãn cố định (vd đánh số con lắc) — LUÔN hiện, khác markLabel/ghostLabel.
    const idLabels: Record<string, Konva.Text> = {};
    for (const b of work.bodies) {
      if (b.fixed || !bodyLabels?.[b.id]) continue;
      const t = new Konva.Text({
        text: `(${bodyLabels[b.id]})`,
        fontSize: 13,
        fontStyle: "bold",
        fill: "#e2e8f0",
        fontFamily: "monospace",
        listening: false,
      });
      layer.add(t);
      idLabels[b.id] = t;
    }

    // Ký hiệu đè lên tâm vật (vd dấu +/− điện tích) — LUÔN hiện, bám theo vật.
    const signLabels: Record<string, Konva.Text> = {};
    for (const b of work.bodies) {
      if (b.fixed || !bodySigns?.[b.id]) continue;
      const t = new Konva.Text({
        text: bodySigns[b.id],
        fontSize: 15,
        fontStyle: "bold",
        fill: "#ffffff",
        fontFamily: "monospace",
        listening: false,
      });
      layer.add(t);
      signLabels[b.id] = t;
    }

    // Tracking đưa ra ngoài canvas (panel) — chỉ phát ~12 lần/giây cho đỡ render.
    // Scene annotations from mechanics presets are dynamic overlays: vectors can
    // anchor to bodies, and spring vectors are recomputed from current state.
    const dynamicAnnotationUpdaters: (() => void)[] = [];
    const setArrow = (arrow: Konva.Arrow, from: Vec2, to: Vec2) => {
      arrow.points([from.x, from.y, to.x, to.y]);
    };
    const setTextNear = (text: Konva.Text, p: Vec2) => {
      text.position({ x: p.x + 6, y: p.y - 16 });
    };

    for (const ann of work.annotations ?? []) {
      if (ann.kind === "photogateTimer") {
        const position = toScreen(ann.at.x, ann.at.y);
        const timer = new Konva.Text({
          x: position.x - 34,
          y: position.y - 8,
          width: 68,
          align: "center",
          text: "0.000 s",
          fontSize: 14,
          fontStyle: "bold",
          fill: ann.color ?? "#86efac",
          fontFamily: "monospace",
          listening: false,
        });
        layer.add(timer);
        const rawResultPosition = ann.resultAt ? toScreen(ann.resultAt.x, ann.resultAt.y) : null;
        const resultHeight = 68;
        const resultPosition = rawResultPosition
          ? ann.resultBottom != null
            ? { x: W / 2, y: H - ann.resultBottom - resultHeight }
            : rawResultPosition
          : null;
        const resultWidth = Math.min(700, W - 80);
        const resultPanel = resultPosition
          ? new Konva.Rect({
              x: resultPosition.x - resultWidth / 2,
              y: resultPosition.y,
              width: resultWidth,
              height: resultHeight,
              fill: "#111827",
              stroke: "#94a3b8",
              strokeWidth: 1.5,
              cornerRadius: 4,
              listening: false,
            })
          : null;
        const resultTitle = resultPosition
          ? new Konva.Text({
              x: resultPosition.x - resultWidth / 2 + 16,
              y: resultPosition.y + 12,
              width: resultWidth - 32,
              align: "center",
              text: "Chờ đồng hồ hoàn tất phép đo tại cổng 2...",
              fontSize: 13,
              fontStyle: "bold",
              fill: "#86efac",
              fontFamily: "monospace",
              listening: false,
            })
          : null;
        const resultFormula = resultPosition
          ? new Konva.Text({
              x: resultPosition.x - resultWidth / 2 + 16,
              y: resultPosition.y + 36,
              width: resultWidth - 32,
              align: "center",
              text: "",
              fontSize: 14,
              fontStyle: "bold",
              fill: "#f8fafc",
              fontFamily: "monospace",
              listening: false,
            })
          : null;
        if (resultPanel && resultTitle && resultFormula) {
          layer.add(resultPanel, resultTitle, resultFormula);
        }
        let startTime: number | null = null;
        let measuredTime = 0;
        let finished = false;
        let previousX: number | null = null;
        let previousTime = 0;
        dynamicAnnotationResetters.push(() => {
          startTime = null;
          measuredTime = 0;
          finished = false;
          previousX = null;
          previousTime = 0;
          timer.text("0.000 s");
          resultTitle?.text("Chờ đồng hồ hoàn tất phép đo tại cổng 2...");
          resultFormula?.text("");
        });
        dynamicAnnotationUpdaters.push(() => {
          const x = worldOf(ann.body).x + (ann.bodyOffsetX ?? 0);
          // This experiment begins with the flag beside gate 1. Starting from
          // zero also keeps the display correct when the user seeks to gate 2.
          if (startTime == null && x >= ann.startX) startTime = 0;
          if (startTime != null && !finished) {
            if (x >= ann.endX) {
              let stopTime = simulationSeconds;
              // Interpolate within the rendered frame so the frozen display
              // represents the instant the flag crosses gate 2, not the next
              // animation frame.
              if (previousX != null && previousX < ann.endX && x > previousX) {
                const crossingFraction = (ann.endX - previousX) / (x - previousX);
                stopTime = previousTime + crossingFraction * (simulationSeconds - previousTime);
              }
              measuredTime = Math.max(0, stopTime - startTime);
              finished = true;
            } else {
              measuredTime = Math.max(0, simulationSeconds - startTime);
            }
          }
          previousX = x;
          previousTime = simulationSeconds;
          timer.text(`${measuredTime.toFixed(3)} s`);
          if (finished && measuredTime > 0 && ann.distance != null) {
            const measuredAcceleration = (2 * ann.distance) / measuredTime ** 2;
            resultTitle?.text("Gia tốc thực nghiệm tính từ số liệu đồng hồ");
            resultFormula?.text(
              `a = 2s/t² = (2 × ${ann.distance.toFixed(2)}) / ${measuredTime.toFixed(3)}² = ${measuredAcceleration.toFixed(2)} m/s²`,
            );
          }
        });
      } else if (ann.kind === "circularMotionVectors") {
        const tangentColor = ann.tangentColor ?? "#38bdf8";
        const tensionColor = ann.tensionColor ?? "#f59e0b";
        const orbit = new Konva.Circle({
          x: 0,
          y: 0,
          radius: 0,
          stroke: ann.orbitColor ?? "#475569",
          strokeWidth: 2,
          dash: [8, 8],
          opacity: 0.75,
          listening: false,
        });
        const makeMotionArrow = (color: string) =>
          new Konva.Arrow({
            points: [0, 0, 0, 0],
            stroke: color,
            fill: color,
            strokeWidth: 3,
            pointerLength: 10,
            pointerWidth: 10,
            lineCap: "round",
            lineJoin: "round",
            listening: false,
          });
        const tangentArrow = makeMotionArrow(tangentColor);
        const tensionArrow = makeMotionArrow(tensionColor);
        const tangentLabel = new Konva.Text({
          text: ann.tangentLabel ?? "v",
          fontSize: 14,
          fontStyle: "bold",
          fill: tangentColor,
          fontFamily: "monospace",
          listening: false,
        });
        const tensionLabel = new Konva.Text({
          text: ann.tensionLabel ?? "T",
          fontSize: 14,
          fontStyle: "bold",
          fill: tensionColor,
          fontFamily: "monospace",
          listening: false,
        });
        layer.add(orbit, tangentArrow, tensionArrow, tangentLabel, tensionLabel);
        orbit.moveToBottom();

        const placeVectorLabel = (label: Konva.Text, from: Vec2, to: Vec2) => {
          const dx = to.x - from.x;
          const dy = to.y - from.y;
          const length = Math.hypot(dx, dy) || 1;
          label.position({
            x: to.x + (dx / length) * 9 - (dx < 0 ? label.width() : 0),
            y: to.y + (dy / length) * 9 - label.height() / 2,
          });
        };

        dynamicAnnotationUpdaters.push(() => {
          const center = worldOf(ann.center);
          const body = worldOf(ann.body);
          const radialX = center.x - body.x;
          const radialY = center.y - body.y;
          const radius = Math.hypot(radialX, radialY) || 1;
          const inwardX = radialX / radius;
          const inwardY = radialY / radius;
          const velocity = readVelocity(state, ann.body);
          const positiveTangentX = -inwardY;
          const positiveTangentY = inwardX;
          const direction =
            positiveTangentX * velocity.x + positiveTangentY * velocity.y >= 0 ? 1 : -1;
          const tangentX = positiveTangentX * direction;
          const tangentY = positiveTangentY * direction;

          const centerScreen = toScreen(center.x, center.y);
          const bodyScreen = toScreen(body.x, body.y);
          orbit.position(centerScreen);
          orbit.radius(radius * scale);

          const tangentTip = toScreen(
            body.x + tangentX * ann.tangentLength,
            body.y + tangentY * ann.tangentLength,
          );
          const tensionTip = toScreen(
            body.x + inwardX * ann.tensionLength,
            body.y + inwardY * ann.tensionLength,
          );
          setArrow(tangentArrow, bodyScreen, tangentTip);
          setArrow(tensionArrow, bodyScreen, tensionTip);
          placeVectorLabel(tangentLabel, bodyScreen, tangentTip);
          placeVectorLabel(tensionLabel, bodyScreen, tensionTip);
        });
      } else if (ann.kind === "vector") {
        const color = ann.color ?? "#f59e0b";
        const arrow = new Konva.Arrow({
          points: [0, 0, 0, 0],
          stroke: color,
          fill: color,
          strokeWidth: ann.width ?? 2.5,
          pointerLength: 9,
          pointerWidth: 9,
          listening: false,
        });
        layer.add(arrow);
        const label = ann.label
          ? new Konva.Text({
              text: ann.label,
              fontSize: 13,
              fontStyle: "bold",
              fill: color,
              fontFamily: "monospace",
              listening: false,
            })
          : null;
        if (label) layer.add(label);
        dynamicAnnotationUpdaters.push(() => {
          const base = ann.anchor ? worldOf(ann.anchor) : ann.at ?? { x: 0, y: 0 };
          const unshiftedBase = toScreen(base.x, base.y);
          const unshiftedTip = toScreen(base.x + ann.dx, base.y + ann.dy);
          const p1 = ann.anchor ? screenOf(ann.anchor) : unshiftedBase;
          const p2 = {
            x: p1.x + (unshiftedTip.x - unshiftedBase.x),
            y: p1.y + (unshiftedTip.y - unshiftedBase.y),
          };
          setArrow(arrow, p1, p2);
          if (label) {
            if (ann.labelPosition === "outside") {
              const dx = p2.x - p1.x;
              const dy = p2.y - p1.y;
              const length = Math.hypot(dx, dy) || 1;
              const ux = dx / length;
              const uy = dy / length;
              const padding = 10;
              label.position({
                x: p2.x + ux * padding - (ux < 0 ? label.width() : 0),
                y: p2.y + uy * padding - label.height() / 2,
              });
            } else {
              setTextNear(label, p2);
            }
          }
        });
      } else if (ann.kind === "springActionReaction") {
        const spring = work.forces.find((f) => f.kind === "spring" && f.a === ann.a && f.b === ann.b);
        if (!spring || spring.kind !== "spring") continue;

        const makeForceArrow = (color: string) =>
          new Konva.Arrow({
            points: [0, 0, 0, 0],
            stroke: color,
            fill: color,
            strokeWidth: 3,
            pointerLength: 10,
            pointerWidth: 10,
            listening: false,
          });
        const arrowA = makeForceArrow(ann.colorA ?? "#60a5fa");
        const arrowB = makeForceArrow(ann.colorB ?? "#f59e0b");
        const labelA = ann.labelA
          ? new Konva.Text({ text: ann.labelA, fontSize: 13, fontStyle: "bold", fill: ann.colorA ?? "#60a5fa", fontFamily: "monospace", listening: false })
          : null;
        const labelB = ann.labelB
          ? new Konva.Text({ text: ann.labelB, fontSize: 13, fontStyle: "bold", fill: ann.colorB ?? "#f59e0b", fontFamily: "monospace", listening: false })
          : null;
        layer.add(arrowA, arrowB);
        if (labelA) layer.add(labelA);
        if (labelB) layer.add(labelB);

        const updateForceArrow = (arrow: Konva.Arrow, label: Konva.Text | null, at: Vec2, fx: number, fy: number) => {
          const magnitude = Math.hypot(fx, fy);
          const visible = magnitude > 1e-4;
          arrow.visible(visible);
          if (label) label.visible(visible);
          if (!visible) return;
          const from = toScreen(at.x, at.y);
          const to = toScreen(at.x + fx * ann.forceScale, at.y + fy * ann.forceScale);
          setArrow(arrow, from, to);
          if (label) {
            const dx = to.x - from.x;
            const dy = to.y - from.y;
            const length = Math.hypot(dx, dy) || 1;
            label.position({ x: to.x + (dx / length) * 8 - (dx < 0 ? label.width() : 0), y: to.y + (dy / length) * 8 - label.height() / 2 });
          }
        };

        dynamicAnnotationUpdaters.push(() => {
          const pa = worldOf(ann.a);
          const pb = worldOf(ann.b);
          const dx = pb.x - pa.x;
          const dy = pb.y - pa.y;
          const length = Math.hypot(dx, dy) || 1;
          const ux = dx / length;
          const uy = dy / length;
          const va = readVelocity(state, ann.a);
          const vb = readVelocity(state, ann.b);
          const relativeRate = (vb.x - va.x) * ux + (vb.y - va.y) * uy;
          const rawMagnitude = spring.k * (length - spring.restLength) + spring.damping * relativeRate;
          const springMagnitude = spring.compressionOnly ? Math.min(0, rawMagnitude) : rawMagnitude;
          updateForceArrow(arrowA, labelA, pa, springMagnitude * ux, springMagnitude * uy);
          updateForceArrow(arrowB, labelB, pb, -springMagnitude * ux, -springMagnitude * uy);
        });
      } else if (ann.kind === "springVector") {
        const spring = work.forces.find((f) => f.kind === "spring" && f.a === ann.a && f.b === ann.b);
        if (!spring || spring.kind !== "spring") continue;

        const stretchArrow = ann.stretchScale
          ? new Konva.Arrow({
              points: [0, 0, 0, 0],
              stroke: ann.stretchColor ?? "#34d399",
              fill: ann.stretchColor ?? "#34d399",
              strokeWidth: 2,
              pointerLength: 8,
              pointerWidth: 8,
              listening: false,
            })
          : null;
        const forceArrow = ann.forceScale
          ? new Konva.Arrow({
              points: [0, 0, 0, 0],
              stroke: ann.forceColor ?? "#f59e0b",
              fill: ann.forceColor ?? "#f59e0b",
              strokeWidth: 2.5,
              pointerLength: 9,
              pointerWidth: 9,
              listening: false,
            })
          : null;
        const stretchLabel =
          stretchArrow && ann.stretchLabel
            ? new Konva.Text({
                text: ann.stretchLabel,
                fontSize: 13,
                fontStyle: "bold",
                fill: ann.stretchColor ?? "#34d399",
                fontFamily: "monospace",
                listening: false,
              })
            : null;
        const forceLabel =
          forceArrow && ann.forceLabel
            ? new Konva.Text({
                text: ann.forceLabel,
                fontSize: 13,
                fontStyle: "bold",
                fill: ann.forceColor ?? "#f59e0b",
                fontFamily: "monospace",
                listening: false,
              })
            : null;
        if (stretchArrow) layer.add(stretchArrow);
        if (forceArrow) layer.add(forceArrow);
        if (stretchLabel) layer.add(stretchLabel);
        if (forceLabel) layer.add(forceLabel);

        dynamicAnnotationUpdaters.push(() => {
          const pa = worldOf(ann.a);
          const pb = worldOf(ann.b);
          const dx = pb.x - pa.x;
          const dy = pb.y - pa.y;
          const len = Math.hypot(dx, dy) || 1;
          const ux = dx / len;
          const uy = dy / len;
          const ext = len - spring.restLength;

          if (stretchArrow && ann.stretchScale) {
            const from = toScreen(pb.x, pb.y);
            const to = toScreen(pb.x + ux * ext * ann.stretchScale, pb.y + uy * ext * ann.stretchScale);
            setArrow(stretchArrow, from, to);
            if (stretchLabel) setTextNear(stretchLabel, to);
          }

          if (forceArrow && ann.forceScale) {
            const forceLen = spring.k * ext * ann.forceScale;
            const from = toScreen(pb.x, pb.y);
            const to = toScreen(pb.x - ux * forceLen, pb.y - uy * forceLen);
            setArrow(forceArrow, from, to);
            if (forceLabel) setTextNear(forceLabel, to);
          }
        });
      }
    }
    let readoutTick = 0;
    const syncShapes = () => {
      if (runningRef.current) {
        for (const [bodyId, trail] of Object.entries(trailNodes)) {
          const current = screenOf(bodyId);
          if (Math.hypot(current.x - trail.last.x, current.y - trail.last.y) < 1.5) continue;
          if (trail.points.length === 0) trail.points.push(trail.last.x, trail.last.y);
          if (trail.points.length < 4000) {
            trail.points.push(current.x, current.y);
            trail.line.points(trail.points);
          }
          trail.last = current;
        }
      }
      for (const b of work.bodies) {
        if (b.fixed || b.id === draggingId) continue;
        const node = circles[b.id]!;
        node.position(screenOf(b.id));
        if (b.visual?.shape === "coaster") {
          const velocity = readVelocity(state, b.id);
          if (Math.hypot(velocity.x, velocity.y) > 0.03) {
            node.rotation((Math.atan2(-velocity.y, velocity.x) * 180) / Math.PI);
          } else {
            // A seek can land after the coaster has stopped, so velocity no
            // longer provides an orientation. Use the local track tangent
            // instead of leaving the coaster at its initial slope angle.
            const track = work.constraints.find(
              (constraint) => constraint.kind === "curveTrack" && constraint.body === b.id,
            );
            if (track?.kind === "curveTrack") {
              const position = readPosition(state, b.id);
              const trackAngle = screenAngleAtClosestTrackSegment(
                track.points,
                position.x,
                position.y,
              );
              if (trackAngle != null) node.rotation(trackAngle);
            }
          }
        }
      }
      for (const s of springs) {
        const pa = screenOf(s.a), pb = screenOf(s.b);
        const paWorld = posOf(s.a), pbWorld = posOf(s.b);
        const dx = pbWorld.x - paWorld.x;
        const dy = pbWorld.y - paWorld.y;
        const length = Math.hypot(dx, dy) || 1;
        // Bumper spring: after releasing B, keep a relaxed spring visibly attached
        // to A while its free end points toward B; it no longer transmits force.
        const displayEnd = s.compressionOnly && length >= s.restLength
          ? toScreen(paWorld.x + (dx / length) * s.restLength, paWorld.y + (dy / length) * s.restLength)
          : pb;
        s.line.visible(true);
        s.line.points(springPoints(pa.x, pa.y, displayEnd.x, displayEnd.y));
      }
      for (const l of links) {
        const pa = screenOf(l.a), pb = screenOf(l.b);
        l.line.points([pa.x, pa.y, pb.x, pb.y]);
      }
      for (const rope of rightAngleLinks) {
        const cart = screenOf(rope.horizontal);
        const hangerCenter = screenOf(rope.vertical);
        const corner = toScreen(rope.corner.x, rope.corner.y);
        const pulleyBody = work.bodies.find((body) => body.visual?.shape === "pulley" && Math.abs(body.x - rope.corner.x) < 1e-6 && Math.abs(body.y - rope.corner.y) < 1e-6);
        const cartBody = work.bodies.find((body) => body.id === rope.horizontal);
        const hangerBody = work.bodies.find((body) => body.id === rope.vertical);
        const ropeRadius = pulleyBody ? Math.min(28, Math.max(13, radiusFor(pulleyBody))) + 2 : 24;
        const cartRadius = cartBody ? cartVisualRadius(radiusFor(cartBody)) : 12;
        const cartWidth = cartRadius * 2.4;
        const cartAttachment = {
          x: cart.x + cartWidth / 2,
          y: corner.y - ropeRadius,
        };
        const hangerTopOffset = hangerBody?.visual?.shape === "box" ? Math.max(11, Math.max(22, radiusFor(hangerBody) * 1.45) / 2) : 0;
        const hangerAttachment = { x: corner.x + ropeRadius, y: hangerCenter.y };
        rope.line.points(
          rightAnglePulleyRopePoints(
            cartAttachment,
            hangerAttachment,
            corner,
            ropeRadius,
            hangerCenter.y - hangerTopOffset,
          ),
        );
      }
      // nhãn toạ độ bám theo vật + thu dữ liệu tracking
      for (const updateAnnotation of dynamicAnnotationUpdaters) updateAnnotation();
      const bodies: SceneReadout["bodies"] = [];
      for (const b of work.bodies) {
        if (b.fixed) continue;
        const wpt = worldOf(b.id);
        const sp = screenOf(b.id);
        const lbl = coordLabels[b.id];
        if (lbl) {
          lbl.position({ x: sp.x + 12, y: sp.y - 10 });
          lbl.text(`(${wpt.x.toFixed(1)}, ${wpt.y.toFixed(1)})`);
        }
        const idLbl = idLabels[b.id];
        if (idLbl) idLbl.position({ x: sp.x - idLbl.width() / 2, y: sp.y + radiusFor(b) + 6 });
        const signLbl = signLabels[b.id];
        if (signLbl) signLbl.position({ x: sp.x - signLbl.width() / 2, y: sp.y - signLbl.height() / 2 });
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
        const dt = Math.min(frame.timeDiff / 1000, 1 / 30) * speedRef.current;
        const steps = Math.max(1, Math.ceil(dt / (1 / 240)));
        const sub = dt / steps;
        for (let i = 0; i < steps; i++) state = stepScene(kernel, state, sub);
        simulationSeconds += dt;
      }
      syncShapes();
      // Nét đứt "chảy" trên đường sức animated — LUÔN chạy (kể cả lúc dừng mô
      // phỏng), vì đây là chỉ báo chiều điện trường tĩnh, không phải chuyển
      // động của hạt. Tốc độ tính theo thời gian thực (frame.timeDiff), không
      // phụ thuộc speed/running.
      if (flowingShapes.length > 0 && frame) {
        const flowSpeed = 40; // px/s
        const delta = (flowSpeed * frame.timeDiff) / 1000;
        for (const shape of flowingShapes) shape.dashOffset(shape.dashOffset() - delta);
      }
    }, layer);
    anim.start();

    return () => {
      anim.stop();
      if (featherAsset) {
        featherAsset.onload = null;
        featherAsset.src = ""; // huỷ tải dở dang thay vì để network request tiếp tục chạy nền
      }
      stage.destroy();
    };
    // resetSignal/seekToken: tăng → dựng lại cảnh từ đầu (reset/đi tới mốc).
    // running đọc qua ref nên KHÔNG ở deps.
  }, [
    scene,
    size,
    resetSignal,
    seekToken,
    seekSeconds,
    markLabel,
    ghostSeconds,
    ghostLabel,
    bodyLabels,
    annotations,
    bodyColors,
    bodyTrails,
    bodySigns,
    minimalOverlay,
    hideCoordinateLabels,
    hideFixedSupportDecoration,
    onRunningChange,
    containerRef,
  ]);

  return (
    <div className="relative h-full w-full overflow-hidden rounded-lg bg-[#0f172a]">
      <div ref={containerRef} className="h-full w-full" />
      <ZoomControls
        percent={zoomPct}
        onZoomIn={() => zoomActionsRef.current?.in()}
        onZoomOut={() => zoomActionsRef.current?.out()}
      />
    </div>
  );
}
