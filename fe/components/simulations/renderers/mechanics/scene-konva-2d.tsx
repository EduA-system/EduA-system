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

// Lưới/mặt đất vẽ rộng hơn khung nhìn ban đầu nhiều lần để còn phủ kín khi
// zoom out / kéo canvas (lưới TĨNH, không tính lại theo viewport khi zoom).
// Đây cũng là "vùng làm việc" pan bị khoá trong đó (xem konva-zoom.ts).
const GRID_EXTENT_FACTOR = 7;

type Vec2 = { x: number; y: number };
type Box = { minX: number; maxX: number; minY: number; maxY: number };

// Mô phỏng trước ~5 s để biết quỹ đạo → hộp bao. LUÔN gồm mặt đất y=0.
function fitBox(scene: Scene): Box {
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

// Đầu mũi tên hình chevron tại (x,y), hướng theo `angle` (rad) — dùng chung
// cho "arrow" (giữa đường thẳng) và "curve" (tiếp tuyến tại điểm arrowAt).
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
  bodySigns,
  minimalOverlay,
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
  // Ký hiệu ngắn (1-2 ký tự, vd "+"/"−"/"0") vẽ ĐÈ LÊN TÂM vật, bám theo vật
  // khi di chuyển — khác bodyLabels (vẽ DƯỚI vật). Dùng cho dấu điện tích
  // ngay trên hạt, giống hạt mang điện trong sách giáo khoa.
  bodySigns?: Record<string, string>;
  // Ẩn mặt đất/trục Ox-Oy/nhãn số/gốc O/nhãn toạ độ cạnh vật VÀ đường mặt
  // phẳng mặc định (surface constraint) — dùng cho sơ đồ giáo khoa tối giản có
  // chú thích (annotations) tự vẽ mọi thứ. KHÔNG ẩn lưới nền (vẫn vẽ, chỉ là
  // kết cấu mờ cho cảm giác chiều sâu, không phải công cụ định lượng).
  minimalOverlay?: boolean;
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
      bodies: scene.bodies.map((b) => ({ ...b })),
      forces: scene.forces,
      constraints: scene.constraints,
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
    const sidePad = 70, topPad = 50, groundPad = 46;
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
    for (let gx = Math.ceil(gx0 / step) * step; gx <= gx1; gx += step) {
      const x = toScreen(gx, 0).x;
      layer.add(new Konva.Line({ points: [x, toScreen(0, gy1).y, x, toScreen(0, gy0).y], stroke: gridColor, strokeWidth: 1 }));
    }
    for (let gy = Math.ceil(gy0 / step) * step; gy <= gy1; gy += step) {
      const y = toScreen(0, gy).y;
      layer.add(new Konva.Line({ points: [toScreen(gx0, 0).x, y, toScreen(gx1, 0).x, y], stroke: gridColor, strokeWidth: 1 }));
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
    {
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
          new Konva.Rect({
            x: corner.x,
            y: corner.y,
            width: ann.width * scale,
            height: ann.height * scale,
            fill: ann.fill ?? "#e2e8f0",
            stroke: ann.stroke ?? "#475569",
            strokeWidth: ann.strokeWidth ?? 2,
            cornerRadius: 2,
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
        layer.add(
          new Konva.Text({
            x: p.x - 5,
            y: p.y - 8,
            text: ann.text,
            fontSize: ann.fontSize ?? 16,
            fontStyle: ann.fontStyle ?? "bold",
            fill: ann.color ?? "#e2e8f0",
            fontFamily: ann.fontFamily ?? "monospace",
            listening: false,
          }),
        );
      }
    }

    // Lò xo + dây/thanh.
    const springs: { a: string; b: string; line: Konva.Line }[] = [];
    for (const f of work.forces) {
      if (f.kind !== "spring") continue;
      const line = new Konva.Line({ stroke: "#cbd5e1", strokeWidth: 2.5, lineJoin: "round" });
      layer.add(line);
      springs.push({ a: f.a, b: f.b, line });
    }
    const links: { a: string; b: string; line: Konva.Line }[] = [];
    for (const c of work.constraints) {
      if (c.kind === "surface") continue;
      const line = new Konva.Line({ stroke: "#64748b", strokeWidth: c.kind === "rod" ? 3 : 1.5 });
      layer.add(line);
      links.push({ a: c.a, b: c.b, line });
    }

    // Vật.
    const circles: Record<string, Konva.Circle | Konva.Rect> = {};
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

    // Bán kính hiển thị — dùng chung cho vật thật lẫn tàn ảnh (ghost).
    const radiusFor = (b: Scene["bodies"][number]): number => {
      const worldR = b.radius ?? Math.min(0.25 + b.mass * 0.04, 0.5);
      return Math.max(8, worldR * scale);
    };

    // Tàn ảnh (ghost) — vị trí các vật động tại mốc VỪA đi qua trước đó, vẽ nét
    // đứt mờ để so sánh trực quan với vị trí hiện tại. Chỉ tính khi có yêu cầu.
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

    for (const b of work.bodies) {
      // Vị trí khởi tạo node: vật fixed dùng toạ độ tĩnh; vật động đọc từ `state`
      // hiện tại (đã tích phân tới seekSeconds nếu có yêu cầu "đi tới mốc") để
      // node — và nhãn mốc gắn theo nó — không bị vẽ nhầm ở vị trí ban đầu rồi
      // "giật" sang đúng chỗ ở khung hình kế (syncShapes chạy ngay sau vẫn đúng,
      // nhưng nhãn mốc chỉ vẽ MỘT LẦN ở đây nên phải đúng ngay từ đầu).
      const p = b.fixed ? toScreen(b.x, b.y) : toScreen(readPosition(state, b.id).x, readPosition(state, b.id).y);
      if (b.fixed) {
        const r = new Konva.Rect({ x: p.x - 7, y: p.y - 7, width: 14, height: 14, fill: "#1e293b", cornerRadius: 2 });
        layer.add(r);
        circles[b.id] = r;
      } else {
        // Vật va chạm (có radius) vẽ đúng bán kính thật; còn lại suy theo khối lượng.
        const radius = radiusFor(b);
        const fill = bodyColors?.[b.id] ?? "#f472b6";
        const c = new Konva.Circle({ x: p.x, y: p.y, radius, fill, draggable: true, shadowBlur: 6, shadowColor: "#000" });
        // Nhãn mốc hiện tại (vd "t2"/"B") — chỉ khi đang dừng đúng tại một mốc.
        if (seekToken && markLabel) {
          const badge = new Konva.Label({ x: p.x + radius + 4, y: p.y - radius - 22, listening: false });
          badge.add(
            new Konva.Tag({ fill: "#e8724a", cornerRadius: 4 }),
          );
          badge.add(
            new Konva.Text({
              text: markLabel,
              fontSize: 12,
              fontStyle: "bold",
              fill: "#ffffff",
              fontFamily: "monospace",
              padding: 4,
            }),
          );
          layer.add(badge);
        }
        c.on("dragstart", () => {
          draggingId = b.id;
          resumeAfterDrag = runningRef.current;
          onRunningChange(false);
        });
        c.on("dragend", () => {
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

    // ── Tracking toạ độ + giá trị (live) — ẩn nhãn toạ độ cạnh vật khi
    // minimalOverlay (sơ đồ giáo khoa không hiện toạ độ debug cạnh hạt). ──
    const coordLabels: Record<string, Konva.Text> = {};
    if (!minimalOverlay) {
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
      // nhãn toạ độ bám theo vật + thu dữ liệu tracking
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
    bodySigns,
    minimalOverlay,
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
