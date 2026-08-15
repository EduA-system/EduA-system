"use client";

// Renderer Canvas THUẦN (không Konva) cho "Điện phổ của hai điện tích điểm" —
// theo đúng tinh thần renderers/wave-field/scene-canvas-wave-field.tsx (vật lý thật,
// không animation liên tục vì cảnh KHÔNG phụ thuộc thời gian: đường sức và
// hạt điện phổ chỉ đổi khi điện tích/tham số đổi, không phải hệ động).
//
// Đường sức KHÔNG hardcode — mỗi lần vẽ, gọi lại traceAllFieldLines() (RK4
// tích phân dr/ds = E/|E| trên field-line-tracer.ts) từ đúng vị trí/điện tích
// hiện tại. Mũi tên trên mỗi đường lấy hướng từ điện trường THẬT tại điểm đó
// (totalField), không suy từ chiều truy vết — luôn đúng chiều E cục bộ.

import { useEffect, useRef, useState } from "react";
import type { PointChargeFieldScene } from "../../engines/point-charge-field/types";
import { fieldMagnitude, totalField, totalPotential, type Point } from "../../engines/point-charge-field/physics";
import { pointAtFraction, traceAllFieldLines } from "../../engines/point-charge-field/field-line-tracer";
import { fitViewport, screenToWorld, worldToScreen } from "../../engines/point-charge-field/coordinates";
import { useContainerSize } from "../../shared/use-container-size";
import { ZoomControls } from "../../shared/zoom-controls";

const FIELD_LINE_COLOR = "#e8724a";
const POSITIVE_FILL = "#f87171";
const POSITIVE_STROKE = "#b91c1c";
const NEGATIVE_FILL = "#60a5fa";
const NEGATIVE_STROKE = "#1d4ed8";
const NULL_FIELD_TOLERANCE = 0.5; // |E| dưới ngưỡng này coi là "điểm cân bằng điện trường"

type Readout = { midX: number; midY: number; v: number; ex: number; ey: number; mag: number };

function drawArrowHead(ctx: CanvasRenderingContext2D, tip: Point, angle: number, size = 7) {
  ctx.beginPath();
  ctx.moveTo(tip.x, tip.y);
  ctx.lineTo(tip.x - size * Math.cos(angle - Math.PI / 7), tip.y - size * Math.sin(angle - Math.PI / 7));
  ctx.moveTo(tip.x, tip.y);
  ctx.lineTo(tip.x - size * Math.cos(angle + Math.PI / 7), tip.y - size * Math.sin(angle + Math.PI / 7));
  ctx.stroke();
}

// Giả ngẫu nhiên xác định (không Math.random()) — hạt điện phổ giữ NGUYÊN vị
// trí seed qua mọi lần vẽ lại, chỉ hướng đổi theo trường (đúng yêu cầu "không
// chạy liên tục như hệ hạt động").
function pseudoRandom(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

export function SceneCanvasPointChargeField({
  scene,
  resetSignal,
  onParamsChange,
}: {
  scene: PointChargeFieldScene;
  running: boolean;
  resetSignal: number;
  onRunningChange: (running: boolean) => void;
  seekSeconds?: number;
  seekToken?: number;
  markLabel?: string;
  speed?: number;
  // Kéo điện tích → cập nhật q1x/q1y/q2x/q2y ở tham số cha, ParamPanel luôn
  // đồng bộ với vị trí kéo tay — giống pattern onParamsChange của wave-field.
  onParamsChange?: (patch: Record<string, number>) => void;
}) {
  const { ref: containerRef, size } = useContainerSize<HTMLDivElement>();
  const transformRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const onParamsChangeRef = useRef(onParamsChange);
  useEffect(() => {
    onParamsChangeRef.current = onParamsChange;
  }, [onParamsChange]);

  // Zoom/pan CSS-transform thuần (không vẽ lại nội dung khi zoom/pan) — giống
  // hệt renderers/wave-field/scene-canvas-wave-field.tsx.
  const zoomRef = useRef(1);
  const panRef = useRef({ x: 0, y: 0 });
  const [zoomPct, setZoomPct] = useState(100);
  const zoomActionsRef = useRef<{ in: () => void; out: () => void; reset: () => void } | null>(null);
  const dragTargetRef = useRef<0 | 1 | "pan" | null>(null);
  const [readout, setReadout] = useState<Readout | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    const { width: w, height: hgt } = size;
    if (!container || !canvas || !w || !hgt) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(hgt * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${hgt}px`;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const domain = scene.domainRadius;
    const vp = fitViewport(w, hgt, -domain, domain, -domain, domain, 0.8);
    const toScreen = (p: Point): Point => worldToScreen(p.x, p.y, vp);
    // Vector HƯỚNG (không phải vị trí) world→screen: world y lên, screen y
    // xuống nên đảo dấu thành phần y khi đổi một VECTOR (không phải điểm).
    const worldAngleToScreen = (ex: number, ey: number): number => Math.atan2(-ey, ex);

    // Hạt điện phổ: seed CỐ ĐỊNH theo lưới + jitter giả ngẫu nhiên (không đổi
    // giữa các lần vẽ lại, chỉ hướng của mỗi hạt đổi theo trường hiện tại).
    const SPECTRUM_ROWS = 24;
    const SPECTRUM_COLS = 32;
    const spectrumSeeds: Point[] = [];
    for (let r = 0; r < SPECTRUM_ROWS; r++) {
      for (let c = 0; c < SPECTRUM_COLS; c++) {
        const idx = r * SPECTRUM_COLS + c;
        const jx = (pseudoRandom(idx * 2 + 1) - 0.5) * (domain / SPECTRUM_COLS) * 1.2;
        const jy = (pseudoRandom(idx * 2 + 2) - 0.5) * (domain / SPECTRUM_ROWS) * 1.2;
        spectrumSeeds.push({
          x: -domain + ((c + 0.5) / SPECTRUM_COLS) * 2 * domain + jx,
          y: -domain + ((r + 0.5) / SPECTRUM_ROWS) * 2 * domain + jy,
        });
      }
    }

    // Truy vết đường sức MỘT LẦN khi scene/kích thước đổi (RK4 tốn chi phí) —
    // vòng lặp animation bên dưới chỉ VẼ LẠI polyline đã có sẵn với dash chảy,
    // không truy vết lại mỗi khung hình.
    const lines = scene.displayMode === "field-lines"
      ? traceAllFieldLines(scene.charges, scene.epsilonR, scene.baseLineCount, scene.chargeVisualRadius, scene.domainRadius)
      : [];
    // Chiều "chảy" của dash trên mỗi đường: đường seed từ điện tích DƯƠNG có
    // thứ tự mảng points đi TỪ + RA XA (chỉ số tăng = đúng chiều tới −) nên
    // offset tăng cho chảy đúng chiều; đường seed từ điện tích ÂM được truy
    // vết NGƯỢC (xem field-line-tracer.ts — sign=-1), thứ tự mảng đi TỪ XA
    // VÀO − nên phải đảo dấu offset để dash vẫn chảy đúng chiều E thật (vào −).
    // (Dấu thực nghiệm: lineDashOffset TĂNG khiến canvas vẽ dash lùi lại theo
    // hướng path, nên phải NGƯỢC với suy luận "tăng offset = chảy tới cuối
    // path" ban đầu — đã kiểm chứng bằng lấy mẫu pixel trực tiếp, xem lịch sử.)
    const flowSigns = lines.map((line) => (scene.charges[line.sourceIndex]!.q >= 0 ? -1 : 1));

    const draw = (dashOffset = 0) => {
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(0, 0, w, hgt);

      if (scene.displayMode === "field-lines") {
        ctx.strokeStyle = FIELD_LINE_COLOR;
        ctx.lineWidth = 2;
        ctx.lineJoin = "round";
        ctx.setLineDash([10, 8]);
        for (let li = 0; li < lines.length; li++) {
          const line = lines[li]!;
          if (line.points.length < 2) continue;
          ctx.lineDashOffset = flowSigns[li]! * dashOffset;
          ctx.beginPath();
          const p0 = toScreen(line.points[0]!);
          ctx.moveTo(p0.x, p0.y);
          for (let i = 1; i < line.points.length; i++) {
            const p = toScreen(line.points[i]!);
            ctx.lineTo(p.x, p.y);
          }
          ctx.stroke();
        }
        ctx.setLineDash([]);
        ctx.lineDashOffset = 0;

        // 1–3 mũi tên theo chiều dài đường (không dash) — tại 35%/60%/80%,
        // hướng lấy từ ĐIỆN TRƯỜNG THẬT tính lại ngay tại điểm đó (không phải
        // tiếp tuyến polyline — với đường seed từ điện tích ÂM, tiếp tuyến
        // polyline ngược chiều E vì truy vết đi lùi, xem field-line-tracer.ts).
        ctx.fillStyle = FIELD_LINE_COLOR;
        for (const line of lines) {
          if (line.points.length < 2) continue;
          const fractions = line.points.length > 220 ? [0.32, 0.58, 0.82] : line.points.length > 90 ? [0.4, 0.72] : [0.55];
          for (const frac of fractions) {
            const worldPt = pointAtFraction(line.points, frac);
            const f = totalField(worldPt, scene.charges, scene.epsilonR);
            if (fieldMagnitude(f) < 1e-9) continue;
            drawArrowHead(ctx, toScreen(worldPt), worldAngleToScreen(f.ex, f.ey));
          }
        }
      } else {
        // Điện phổ hạt: đoạn nhỏ định hướng theo θ = atan2(Ey,Ex) tại mỗi
        // seed — hạt không có đầu mũi tên nên θ và θ+π tương đương (không cần
        // phân biệt chiều), độ dài tăng nhẹ theo |E|.
        ctx.strokeStyle = "#fde68a";
        ctx.lineCap = "round";
        for (const seed of spectrumSeeds) {
          let insideCharge = false;
          for (const c of scene.charges) {
            if (Math.hypot(seed.x - c.x, seed.y - c.y) < scene.chargeVisualRadius * 1.4) {
              insideCharge = true;
              break;
            }
          }
          if (insideCharge) continue;
          const f = totalField(seed, scene.charges, scene.epsilonR);
          const mag = fieldMagnitude(f);
          if (mag < 1e-9) continue;
          const angle = worldAngleToScreen(f.ex, f.ey);
          const halfLen = 3 + Math.min(4, Math.log10(mag + 1) * 1.6); // ~4–10px theo |E|
          const sp = toScreen(seed);
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.moveTo(sp.x - halfLen * Math.cos(angle), sp.y - halfLen * Math.sin(angle));
          ctx.lineTo(sp.x + halfLen * Math.cos(angle), sp.y + halfLen * Math.sin(angle));
          ctx.stroke();
        }
      }

      // 2 điện tích — hình tròn, dấu +/− trắng chính giữa, nhãn q1/q2 dưới.
      const labels = ["q₁", "q₂"];
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      for (let i = 0; i < scene.charges.length; i++) {
        const c = scene.charges[i]!;
        const sp = toScreen(c);
        const r = Math.max(18, scene.chargeVisualRadius * vp.scale);
        const positive = c.q >= 0;
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, r, 0, Math.PI * 2);
        ctx.fillStyle = positive ? POSITIVE_FILL : NEGATIVE_FILL;
        ctx.shadowColor = "rgba(0,0,0,0.45)";
        ctx.shadowBlur = 8;
        ctx.shadowOffsetY = 2;
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.shadowOffsetY = 0;
        ctx.lineWidth = 2;
        ctx.strokeStyle = positive ? POSITIVE_STROKE : NEGATIVE_STROKE;
        ctx.stroke();
        // highlight nhẹ (giả cầu)
        ctx.beginPath();
        ctx.arc(sp.x - r * 0.32, sp.y - r * 0.32, r * 0.35, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255,255,255,0.28)";
        ctx.fill();

        ctx.fillStyle = "#ffffff";
        ctx.font = `bold ${Math.max(13, Math.round(r * 0.85))}px monospace`;
        ctx.fillText(positive ? "+" : "−", sp.x, sp.y + 1);

        ctx.font = "12px monospace";
        ctx.fillStyle = "#e2e8f0";
        ctx.fillText(`${labels[i]} = ${(c.q * 1e9 >= 0 ? "+" : "") + (c.q * 1e9).toFixed(2)} nC`, sp.x, sp.y + r + 15);
      }
      ctx.textAlign = "start";
      ctx.textBaseline = "alphabetic";
    };

    draw(0);

    // Trung điểm 2 điện tích — bảng giá trị vật lý nhỏ (E, V) nổi trên canvas.
    // Đây CHÍNH là điểm phân biệt then chốt của cả 2 cấu hình: cùng dấu bằng
    // nhau → |E|≈0 nhưng V≠0; trái dấu bằng nhau → V≈0 nhưng |E|≠0.
    const mid: Point = { x: (scene.charges[0]!.x + scene.charges[1]!.x) / 2, y: (scene.charges[0]!.y + scene.charges[1]!.y) / 2 };
    const midField = totalField(mid, scene.charges, scene.epsilonR);
    setReadout({
      midX: mid.x,
      midY: mid.y,
      v: totalPotential(mid, scene.charges, scene.epsilonR),
      ex: midField.ex,
      ey: midField.ey,
      mag: fieldMagnitude(midField),
    });

    // ── Zoom/pan CSS-transform (giống wave-field) ──
    const transformEl = transformRef.current;
    const applyTransform = () => {
      if (transformEl) transformEl.style.transform = `translate(${panRef.current.x}px, ${panRef.current.y}px) scale(${zoomRef.current})`;
    };
    const minZoom = 0.7;
    const maxZoom = 6;
    const clampPan = (pan: Point, zoom: number): Point => ({
      x: Math.min(0, Math.max(w * (1 - zoom), pan.x)),
      y: Math.min(0, Math.max(hgt * (1 - zoom), pan.y)),
    });
    const applyZoom = (nextZoom: number, focal?: Point) => {
      const clamped = Math.min(maxZoom, Math.max(minZoom, nextZoom));
      const f = focal ?? { x: w / 2, y: hgt / 2 };
      const worldUnderFocal = { x: (f.x - panRef.current.x) / zoomRef.current, y: (f.y - panRef.current.y) / zoomRef.current };
      zoomRef.current = clamped;
      panRef.current = clampPan({ x: f.x - worldUnderFocal.x * clamped, y: f.y - worldUnderFocal.y * clamped }, clamped);
      applyTransform();
      setZoomPct(Math.round(clamped * 100));
    };
    zoomActionsRef.current = {
      in: () => applyZoom(zoomRef.current * 1.3),
      out: () => applyZoom(zoomRef.current / 1.3),
      reset: () => {
        zoomRef.current = 1;
        panRef.current = { x: 0, y: 0 };
        applyTransform();
        setZoomPct(100);
      },
    };
    applyTransform();

    // ── Kéo điện tích (hit-test theo khoảng cách màn hình) hoặc kéo nền để
    // pan — ưu tiên điện tích, không trúng thì pan. ──
    const getPointerCanvas = (evt: PointerEvent): Point => {
      const rect = container.getBoundingClientRect();
      const outer = { x: evt.clientX - rect.left, y: evt.clientY - rect.top };
      return { x: (outer.x - panRef.current.x) / zoomRef.current, y: (outer.y - panRef.current.y) / zoomRef.current };
    };
    const panStart = { x: 0, y: 0, panX: 0, panY: 0 };
    const chargeHitPx = Math.max(20, scene.chargeVisualRadius * vp.scale * 1.3);
    const minSeparation = scene.chargeVisualRadius * 2.4;
    const dragBound = domain * 0.92;

    const onPointerDown = (evt: PointerEvent) => {
      const pc = getPointerCanvas(evt);
      let target: 0 | 1 | "pan" = "pan";
      for (let i = 0; i < scene.charges.length; i++) {
        const sp = toScreen(scene.charges[i]!);
        if (Math.hypot(pc.x - sp.x, pc.y - sp.y) < chargeHitPx) {
          target = i as 0 | 1;
          break;
        }
      }
      dragTargetRef.current = target;
      canvas.setPointerCapture(evt.pointerId);
      if (target === "pan") {
        panStart.x = evt.clientX;
        panStart.y = evt.clientY;
        panStart.panX = panRef.current.x;
        panStart.panY = panRef.current.y;
      }
    };
    const onPointerMove = (evt: PointerEvent) => {
      const target = dragTargetRef.current;
      if (target === null) return;
      if (target === "pan") {
        panRef.current = clampPan(
          { x: panStart.panX + (evt.clientX - panStart.x), y: panStart.panY + (evt.clientY - panStart.y) },
          zoomRef.current,
        );
        applyTransform();
        return;
      }
      const pc = getPointerCanvas(evt);
      const world = screenToWorld(pc.x, pc.y, vp);
      const otherIdx = target === 0 ? 1 : 0;
      const other = scene.charges[otherIdx]!;
      let nx = Math.max(-dragBound, Math.min(dragBound, world.x));
      let ny = Math.max(-dragBound, Math.min(dragBound, world.y));
      // Không cho 2 điện tích chồng lên nhau hoàn toàn.
      const distToOther = Math.hypot(nx - other.x, ny - other.y);
      if (distToOther < minSeparation) {
        const angle = distToOther > 1e-6 ? Math.atan2(ny - other.y, nx - other.x) : 0;
        nx = other.x + minSeparation * Math.cos(angle);
        ny = other.y + minSeparation * Math.sin(angle);
      }
      const prefix = target === 0 ? "q1" : "q2";
      onParamsChangeRef.current?.({ [`${prefix}x`]: nx, [`${prefix}y`]: ny });
    };
    const onPointerUp = (evt: PointerEvent) => {
      dragTargetRef.current = null;
      canvas.releasePointerCapture(evt.pointerId);
    };
    const onWheel = (evt: WheelEvent) => {
      evt.preventDefault();
      const rect = container.getBoundingClientRect();
      const focal = { x: evt.clientX - rect.left, y: evt.clientY - rect.top };
      const factor = 1.08;
      applyZoom(evt.deltaY > 0 ? zoomRef.current / factor : zoomRef.current * factor, focal);
    };
    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("wheel", onWheel, { passive: false });

    // Nét đứt "chảy" dọc đường sức (chỉ đường sức, KHÔNG áp cho hạt điện phổ
    // — hạt tĩnh theo đúng yêu cầu). Đây là hiệu ứng hiển thị thuần tuý, chỉ
    // vẽ lại polyline đã truy vết sẵn (`lines`), không tính lại vật lý mỗi
    // khung hình nên vẫn nhẹ dù chạy liên tục.
    let raf = 0;
    if (scene.displayMode === "field-lines" && lines.length > 0) {
      let dashOffset = 0;
      let lastTime = performance.now();
      const flowSpeed = 36; // px/s
      const loop = (now: number) => {
        const dt = Math.min((now - lastTime) / 1000, 1 / 30);
        lastTime = now;
        dashOffset += flowSpeed * dt;
        draw(dashOffset);
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
    }

    return () => {
      if (raf) cancelAnimationFrame(raf);
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("wheel", onWheel);
    };
  }, [scene, size, resetSignal, containerRef]);

  const nullField = readout != null && readout.mag < NULL_FIELD_TOLERANCE;

  return (
    <div className="relative h-full w-full overflow-hidden rounded-lg bg-[#0f172a]">
      <div ref={containerRef} className="relative h-full w-full overflow-hidden">
        <div ref={transformRef} className="absolute inset-0" style={{ transformOrigin: "0 0" }}>
          <canvas ref={canvasRef} className="absolute inset-0 touch-none" />
        </div>
      </div>
      <ZoomControls percent={zoomPct} onZoomIn={() => zoomActionsRef.current?.in()} onZoomOut={() => zoomActionsRef.current?.out()} />
      {readout && (
        <div className="pointer-events-none absolute bottom-3 left-3 space-y-0.5 rounded-[8px] bg-black/50 px-3 py-2 font-sans text-[10.5px] leading-snug text-slate-200">
          <div className="text-slate-400">Tại trung điểm 2 điện tích:</div>
          <div>V = {readout.v.toExponential(2)} V</div>
          <div>
            Ex = {readout.ex.toExponential(2)} · Ey = {readout.ey.toExponential(2)} V/m
          </div>
          <div>|E| = {readout.mag.toExponential(2)} V/m</div>
          {nullField && <div className="font-semibold text-emerald-400">● Điểm cân bằng điện trường (|E| ≈ 0)</div>}
        </div>
      )}
    </div>
  );
}
