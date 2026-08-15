"use client";

import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";

// Vùng chữ nhật CẤM — ô kính KHÔNG được nổi trong vùng này (tọa độ tương đối trong SVG).
// Glow blob (phần chìm) vẫn được phép toả sáng xuyên qua.
export type BoundRect = { top: number; left: number; right: number; bottom: number };

// ─── Cấu hình lưới ──────────────────────────────────────────────────────────
const CELL = 26;   // lưới thưa hơn để giảm số node SVG và chi phí repaint
const GAP = 0;    // khoảng cách giữa các ô
const TILE_RADIUS = 3;    // bo góc ô (~15% cạnh, khớp ô mẫu)
const GLOW_RADIUS = 70;  // bán kính vùng glow blob
const STRENGTH_STEPS = 18;
const MIN_STRENGTH = 0.04;

// ─── Cấu hình glow nền (4 ellipse blur bên dưới lưới) ────────────────────────
// Lớp glow TRÒN toả sáng dưới lưới ô kính. Tách màu tâm/rìa + độ sáng + độ rộng.
//   GLOW_CORE_COLOR  : màu tại tâm (sáng nhất). Vd "#ffffff" trắng.
//   GLOW_EDGE_COLOR  : màu tại rìa (đậm nhất). Vd "#ffb547" vàng-cam.
//   GLOW_BG_STRENGTH : hệ số nhân độ sáng (1.0 = gốc; >1 sáng; <1 tối; 0 = TẮT).
//   GLOW_BG_RADIUS   : bán kính vòng ngoài (px). Lớn hơn = glow lan rộng hơn.
//                      Các vòng trong tự co giãn theo (≈ 0.31 / 0.50 / 0.72 / 1.0).
// CHÚ Ý: đặt GLOW_BG_STRENGTH = 0 sẽ tắt glow nền.
const GLOW_CORE_COLOR = "#ffacacff";
const GLOW_EDGE_COLOR = "#ff8800ff";
// Giữ độ rực của glow nguyên bản. Giá trị này chỉ tác động opacity đã được
// clamp, không làm tăng số node hay số phép tính trong animation loop.
const GLOW_BG_STRENGTH = 100;
const GLOW_BG_RADIUS = 70;

// ─── Cấu hình ô kính ─────────────────────────────────────────────────────────
// Nền kính khi KHÔNG lit: tách màu + độ đậm để tuỳ chỉnh độc lập.
//   TILE_BASE_COLOR : màu nền (hex "#rrggbb"). Vd "#ffffff" trắng, "#f0f4ff" xanh nhạt...
//   TILE_BASE_ALPHA : độ đậm (0.0 = trong suốt; 0.30 = kính trắng mờ; 1.0 = đặc).
const TILE_BASE_COLOR = "#ffffffff";  // màu nền ô kính (trắng nhạt)
const TILE_BASE_ALPHA = 0.000;      // độ đậm nền

// Màu vùng sáng khi ô lit. Glow lan từ rìa (strength thấp) vào tâm (strength cao)
// theo nội suy tuyến tính giữa TILE_LIT_DARK → TILE_LIT_BRIGHT.
// TILE_LIT_DARK : màu tại rìa vùng sáng (strength ≈ 0). Đậm hơn để viền rõ.
// TILE_LIT_BRIGHT: màu tại tâm vùng sáng (strength = 1). Sáng nhất.
const TILE_LIT_DARK = "#ff954fef";  // cam-vàng đậm (rìa)
const TILE_LIT_BRIGHT = "#fde5b7ff";  // peachy sáng (tâm)

// ─── Cấu hình va chạm (viên bi lăn theo bề mặt tường) ────────────────────────
// Bán kính viên bi glow khi va chạm với bounds (px). Lớn hơn = bi đẩy xa tường.
// Nên ≈ rx vòng ngoài lớn nhất của RINGS để bi vừa khít mép.
// Dùng 0 = chỉ chặn tâm (bi chạm sát tường), >0 = bi giữ khoảng cách với tường.
const BOUNCE_RADIUS = 30;

type GlassTile = SVGRectElement & {
  _cx?: number;
  _cy?: number;
  _strength?: number;
  _base?: SVGRectElement;   // nền ô kính (luôn hiện) — đổi viền khi lit
  _tint?: SVGRectElement;   // lớp màu peachy #FFD699 khi glow chạm
  _sheen?: SVGRectElement;  // lớp kính highlight góc trên-trái
};

// Refs cho các phần tử glow bên dưới (4 vòng đồng tâm)
type GlowRing = {
  el: SVGEllipseElement;
  grad: SVGRadialGradientElement;
  outerOp: number;  // opacity gốc của vòng (từ RINGS), dùng để nhân GLOW_BG_STRENGTH mỗi frame
};

function clamp01(v: number) { return Math.max(0, Math.min(1, v)); }

function quantize(v: number) {
  if (v < MIN_STRENGTH) return 0;
  return Math.round(v * STRENGTH_STEPS) / STRENGTH_STEPS;
}

// Kiểm tra một điểm có nằm trong vùng cô lập (ô nổi bị chặn) không.
function isInBounds(cx: number, cy: number, bounds: BoundRect[]) {
  for (const b of bounds) {
    if (cx >= b.left && cx <= b.right && cy >= b.top && cy <= b.bottom) return true;
  }
  return false;
}

function tileStrength(
  cx: number, cy: number,
  curX: number, curY: number,
  bounds: BoundRect[],
) {
  // Ô nằm trong vùng cô lập → không bao giờ "nổi" (sáng lên) dù glow ở gần.
  // Glow blob (phần chìm) bên dưới vẫn toả sáng xuyên qua — chỉ ô kính bị chặn.
  if (isInBounds(cx, cy, bounds)) return 0;
  const dist = Math.hypot(cx - curX, cy - curY);
  if (dist >= GLOW_RADIUS) return 0;
  const t = 1 - dist / GLOW_RADIUS;
  return quantize(t * t); // quadratic: lan rộng mượt
}

// ── Viên bi va chạm: đẩy tâm (px,py) ra khỏi các vùng cấm ────────────────────
// Giữ khoảng cách từ tâm bi đến mỗi vùng ≥ R → bi lăn sát bề mặt, không lấn tường.
function clampToBounds(
  px: number, py: number,
  bounds: BoundRect[], R: number,
) {
  if (bounds.length === 0) return [px, py] as const;
  let x = px, y = py;
  // 2 vòng lặp để ổn định khi nhiều vùng chồng/lân cận nhau
  for (let iter = 0; iter < 2; iter++) {
    for (const b of bounds) {
      const nx = Math.max(b.left, Math.min(x, b.right));
      const ny = Math.max(b.top, Math.min(y, b.bottom));
      const dx = x - nx, dy = y - ny;
      const dist = Math.hypot(dx, dy);
      if (dist > 0.0001 && dist < R) {
        // Đẩy tâm bi ra ngoài dọc theo hướng (nx,ny)→tâm cho tới cách mép = R
        const push = (R - dist) / dist;
        x += dx * push;
        y += dy * push;
      } else if (dist <= 0.0001) {
        // Tâm đang nằm trong vùng cấm → đẩy ra theo trục gần mép nhất
        const toLeft = x - b.left;
        const toRight = b.right - x;
        const toTop = y - b.top;
        const toBot = b.bottom - y;
        const m = Math.min(toLeft, toRight, toTop, toBot);
        if (m === toLeft) x = b.left - R;
        else if (m === toRight) x = b.right + R;
        else if (m === toTop) y = b.top - R;
        else y = b.bottom + R;
      }
    }
  }
  return [x, y] as const;
}

// Parse hex "#rrggbb" → [r,g,b]
function hex2rgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

// Ghép màu hex + độ đậm alpha → "rgba(r,g,b,a)"
function rgba(hex: string, alpha: number) {
  const [r, g, b] = hex2rgb(hex);
  return `rgba(${r},${g},${b},${alpha})`;
}

// Nội suy tuyến tính giữa 2 màu hex theo t (0..1). t=0 → a, t=1 → b.
// Dùng cho glow tròn: t thấp = tâm (sáng), t cao = rìa (đậm).
function lerpHex(a: string, b: string, t: number) {
  const tt = clamp01(t);
  const [r0, g0, b0] = hex2rgb(a);
  const [r1, g1, b1] = hex2rgb(b);
  const r = Math.round(r0 + (r1 - r0) * tt);
  const g = Math.round(g0 + (g1 - g0) * tt);
  const bl = Math.round(b0 + (b1 - b0) * tt);
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${bl.toString(16).padStart(2, "0")}`;
}

// Màu tint theo strength: nội suy tuyến tính TILE_LIT_DARK (rìa) → TILE_LIT_BRIGHT (tâm).
// strength thấp = đậm (rìa vùng sáng), strength cao = sáng (tâm).
function tintColor(s: number) {
  const t = clamp01(s);
  const [r0, g0, b0] = hex2rgb(TILE_LIT_DARK);
  const [r1, g1, b1] = hex2rgb(TILE_LIT_BRIGHT);
  const r = Math.round(r0 + (r1 - r0) * t);
  const g = Math.round(g0 + (g1 - g0) * t);
  const b = Math.round(b0 + (b1 - b0) * t);
  return `rgb(${r},${g},${b})`;
}

export function HeroGlow({
  bounds = [],
  contentFrameWidth = 1280,
  exclusionSelector = "[data-glow-exclusion]",
}: {
  bounds?: BoundRect[];
  contentFrameWidth?: number;
  exclusionSelector?: string;
} = {}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const tileRefs = useRef<GlassTile[]>([]);
  const glowRefs = useRef<GlowRing[]>([]);
  // boundsOrigRef: toạ độ GỐC theo frame nội dung (KHÔNG bao giờ mutate).
  // boundsRef: toạ độ đã chuyển sang hệ SVG (cộng frameOffsetX) — dùng cho hit-test.
  const boundsOrigRef = useRef<BoundRect[]>(bounds);
  const boundsRef = useRef<BoundRect[]>(bounds);
  const contentFrameWidthRef = useRef<number>(contentFrameWidth);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const ns = "http://www.w3.org/2000/svg";
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let curX = -9999, curY = -9999;
    let tgtX = -9999, tgtY = -9999;
    let active = false;
    let raf = 0, resizeRaf = 0;

    // ── Cập nhật vị trí glow blob ──────────────────────────────────────────
    function moveGlow(x: number, y: number, visible: boolean) {
      for (const ring of glowRefs.current) {
        ring.el.setAttribute("cx", String(x));
        ring.el.setAttribute("cy", String(y));
        // đồng bộ tâm gradient với vị trí ellipse
        ring.grad.setAttribute("fx", String(x));
        ring.grad.setAttribute("fy", String(y));
        ring.grad.setAttribute("cx", String(x));
        ring.grad.setAttribute("cy", String(y));
        // opacity = outerOp × GLOW_BG_STRENGTH (khi hiện); 0 khi ẩn.
        // Nếu set cứng "1" sẽ ghi đè GLOW_BG_STRENGTH → const không tác dụng.
        const op = visible ? clamp01(ring.outerOp * GLOW_BG_STRENGTH) : 0;
        ring.el.setAttribute("opacity", String(op));
      }
    }

    // ── Tô màu từng ô kính ────────────────────────────────────────────────
    function paintTiles() {
      for (const tile of tileRefs.current) {
        const s = tileStrength(tile._cx ?? 0, tile._cy ?? 0, curX, curY, boundsRef.current);

        if (tile._strength === s) continue;
        tile._strength = s;

        // Nền: khi glow chạm → peachy #FFD699 đặc dần; không → kính trắng mờ
        // Viền LUÔN giữ màu trắng (theo yêu cầu), chỉ đổi độ dày khi lit
        if (tile._base) {
          if (s > 0) {
            tile._base.setAttribute("fill", tintColor(s));
            tile._base.setAttribute("fill-opacity", "1");
            tile._base.setAttribute("stroke", "rgba(255,255,255,0.85)");
            tile._base.setAttribute("stroke-width", s > 0.5 ? "1.5" : "1");
          } else {
            tile._base.setAttribute("fill", rgba(TILE_BASE_COLOR, TILE_BASE_ALPHA));
            tile._base.setAttribute("stroke", "rgba(255,255,255,0.60)");
            tile._base.setAttribute("stroke-width", "1");
          }
        }

        // Tint: giữ lớp overlay ấm bổ sung khi glow rất mạnh (gần tâm)
        if (tile._tint) {
          if (s <= 0) {
            tile._tint.setAttribute("fill-opacity", "0");
          } else {
            tile._tint.setAttribute("fill", tintColor(s));
            tile._tint.setAttribute("fill-opacity", (s * 0.35).toFixed(3));
          }
        }

        // Sheen: kính luôn có chút sáng; khi lit → ấm #FFF8E1 đậm hơn
        if (tile._sheen) {
          tile._sheen.setAttribute("fill-opacity", (0.06 + s * 0.40).toFixed(3));
          tile._sheen.setAttribute("fill", s > 0 ? "rgba(255,248,225,0.85)" : "rgba(255,255,255,0.75)");
        }
      }
    }

    function clearEffect() {
      for (const tile of tileRefs.current) {
        tile._strength = 0;
        tile._base?.setAttribute("fill", rgba(TILE_BASE_COLOR, TILE_BASE_ALPHA));
        tile._base?.setAttribute("stroke", "rgba(255,255,255,0.60)");
        tile._base?.setAttribute("stroke-width", "1");
        tile._tint?.setAttribute("fill-opacity", "0");
        tile._sheen?.setAttribute("fill-opacity", "0.06");
        tile._sheen?.setAttribute("fill", "rgba(255,255,255,0.75)");
      }
      moveGlow(curX, curY, false);
    }

    // ── Xây dựng lại SVG ──────────────────────────────────────────────────
    let lastGridWidth = 0;
    let lastGridHeight = 0;

    function buildGrid() {
      if (!svg) return;
      const W = svg.clientWidth;
      const H = svg.clientHeight;
      if (Math.abs(W - lastGridWidth) < 1 && Math.abs(H - lastGridHeight) < 1 && tileRefs.current.length > 0) return;
      lastGridWidth = W;
      lastGridHeight = H;
      const cols = Math.ceil(W / CELL) + 1;
      const rows = Math.ceil(H / CELL) + 1;
      const tileSize = CELL - GAP;

      svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
      svg.replaceChildren();
      tileRefs.current = [];
      glowRefs.current = [];

      // Bounds nhập theo toạ độ content-frame (FRAME_WIDTH căn giữa).
      // Chuyển sang toạ độ SVG (viewport) bằng cách cộng offset căn giữa.
      // Luôn đọc từ boundsOrigRef (toạ độ GỐC) — nếu đọc boundsRef (đã +offset)
      // và lưu ngược lại, resize sau sẽ cộng offset 2 lần → lệch phải càng lúc càng xa.
      const frameOffsetX = Math.max(0, (W - contentFrameWidthRef.current) / 2);
      const svgBounds: BoundRect[] = boundsOrigRef.current.map((b) => ({
        left: b.left + frameOffsetX,
        right: b.right + frameOffsetX,
        top: b.top,
        bottom: b.bottom,
      }));
      const svgRect = svg.getBoundingClientRect();
      const exclusionRoot = svg.closest("section") ?? svg.parentElement;
      const measuredBounds = exclusionRoot
        ? Array.from(exclusionRoot.querySelectorAll<HTMLElement>(exclusionSelector)).map((element) => {
            const rect = element.getBoundingClientRect();
            return {
              left: rect.left - svgRect.left,
              right: rect.right - svgRect.left,
              top: rect.top - svgRect.top,
              bottom: rect.bottom - svgRect.top,
            };
          })
        : [];
      boundsRef.current = [...svgBounds, ...measuredBounds];

      // ── defs ──────────────────────────────────────────────────────────
      const defs = document.createElementNS(ns, "defs");

      // Blur filter cho glow blob.
      // Region DẶT theo userSpaceOnUse (toạ độ tuyệt đối) bao trùm cả SVG,
      // thay vì % tương đối theo bounding box. Tránh hiện tượng "ô vuông":
      // khi ring ellipse nhỏ, "-60%" bbox < không gian blur cần thiết (~156px
      // với stdDeviation 52) → blur bị clip thành hình chữ nhật cứng.
      const flt = document.createElementNS(ns, "filter");
      flt.setAttribute("id", "hg-blur");
      flt.setAttribute("filterUnits", "userSpaceOnUse");
      flt.setAttribute("x", "0");
      flt.setAttribute("y", "0");
      flt.setAttribute("width", String(W));
      flt.setAttribute("height", String(H));
      const fe = document.createElementNS(ns, "feGaussianBlur");
      fe.setAttribute("stdDeviation", "52");
      flt.appendChild(fe);
      defs.appendChild(flt);

      // 4 radialGradient cho 4 vòng glow (sẽ cập nhật cx/cy khi di chuyển)
      // Màu nội suy từ GLOW_CORE_COLOR (tâm) → GLOW_EDGE_COLOR (rìa) qua 4 vòng.
      // 4 radialGradient cho 4 vòng glow (sẽ cập nhật cx/cy khi di chuyển)
      // Màu nội suy GLOW_CORE_COLOR (tâm) → GLOW_EDGE_COLOR (rìa).
      // Độ rộng: rx/ry co giãn theo GLOW_BG_RADIUS (tỷ lệ 0.31/0.50/0.72/1.0).
      const R = GLOW_BG_RADIUS;
      const RINGS = [
        { rx: R * 0.31, ry: R * 0.25, colors: [lerpHex(GLOW_CORE_COLOR, GLOW_EDGE_COLOR, 0.00), lerpHex(GLOW_CORE_COLOR, GLOW_EDGE_COLOR, 0.25)], opacities: [1.0, 0], outerOp: 1.0 },
        { rx: R * 0.50, ry: R * 0.40, colors: [lerpHex(GLOW_CORE_COLOR, GLOW_EDGE_COLOR, 0.25), lerpHex(GLOW_CORE_COLOR, GLOW_EDGE_COLOR, 0.50)], opacities: [0.55, 0], outerOp: 0.40 },
        { rx: R * 0.72, ry: R * 0.58, colors: [lerpHex(GLOW_CORE_COLOR, GLOW_EDGE_COLOR, 0.50), lerpHex(GLOW_CORE_COLOR, GLOW_EDGE_COLOR, 0.75)], opacities: [0.28, 0], outerOp: 0.18 },
        { rx: R * 1.00, ry: R * 0.81, colors: [lerpHex(GLOW_CORE_COLOR, GLOW_EDGE_COLOR, 0.75), GLOW_EDGE_COLOR], opacities: [0.12, 0], outerOp: 0.07 },
      ];

      RINGS.forEach((ring, i) => {
        const grad = document.createElementNS(ns, "radialGradient");
        grad.setAttribute("id", `hg-g${i}`);
        grad.setAttribute("gradientUnits", "userSpaceOnUse");
        grad.setAttribute("cx", "0"); grad.setAttribute("cy", "0");
        grad.setAttribute("fx", "0"); grad.setAttribute("fy", "0");
        grad.setAttribute("r", String(ring.rx));

        const s0 = document.createElementNS(ns, "stop");
        s0.setAttribute("offset", "0%");
        s0.setAttribute("stop-color", ring.colors[0]);
        // Nhân GLOW_BG_STRENGTH tại stop-opacity (nơi quyết định độ đậm thật của blob).
        // Nếu chỉ nhân ở element opacity (dòng 356) thì stop-opacity này bị fix cứng →
        // đổi STRENGTH không thấy khác biệt gì (đặc biệt khi bị feGaussianBlur mạnh).
        s0.setAttribute("stop-opacity", String(clamp01(ring.opacities[0] * GLOW_BG_STRENGTH)));
        grad.appendChild(s0);

        const s1 = document.createElementNS(ns, "stop");
        s1.setAttribute("offset", "100%");
        s1.setAttribute("stop-color", ring.colors[1]);
        s1.setAttribute("stop-opacity", String(ring.opacities[1]));
        grad.appendChild(s1);

        defs.appendChild(grad);
      });

      svg.appendChild(defs);

      // ── Layer 1: Glow blob (phần chìm — toả sáng xuyên qua mọi vùng) ────
      // Glow blob KHÔNG bị clip trong vùng cô lập: nó là lớp nền chìm, được phép
      // toả sáng xuyên qua vùng nội dung (người dùng vẫn thấy glow vàng qua đó).
      const glowLayer = document.createElementNS(ns, "g");
      glowLayer.setAttribute("filter", "url(#hg-blur)");
      svg.appendChild(glowLayer);

      RINGS.forEach((ring, i) => {
        const el = document.createElementNS(ns, "ellipse");
        el.setAttribute("rx", String(ring.rx));
        el.setAttribute("ry", String(ring.ry));
        el.setAttribute("fill", `url(#hg-g${i})`);
        el.setAttribute("opacity", String(clamp01(ring.outerOp * GLOW_BG_STRENGTH)));
        glowLayer.appendChild(el);
        glowRefs.current.push({
          el,
          grad: defs.querySelector(`#hg-g${i}`) as SVGRadialGradientElement,
          outerOp: ring.outerOp,
        });
      });

      // ── Layer 2: Lưới ô kính (luôn hiển thị) ─────────────────────────
      const gridLayer = document.createElementNS(ns, "g");
      svg.appendChild(gridLayer);

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const x = col * CELL + GAP / 2;
          const y = row * CELL + GAP / 2;
          const cx = x + tileSize / 2;
          const cy = y + tileSize / 2;

          // Nền ô kính — trắng bán trong suốt, luôn hiện
          const base = document.createElementNS(ns, "rect") as GlassTile;
          base.setAttribute("x", String(x));
          base.setAttribute("y", String(y));
          base.setAttribute("width", String(tileSize));
          base.setAttribute("height", String(tileSize));
          base.setAttribute("rx", String(TILE_RADIUS));
          base.setAttribute("ry", String(TILE_RADIUS));
          base.setAttribute("fill", rgba(TILE_BASE_COLOR, TILE_BASE_ALPHA));
          base.setAttribute("stroke", "rgba(255,255,255,0.60)");
          base.setAttribute("stroke-width", "1");
          gridLayer.appendChild(base);

          const gt = base;
          gt._cx = cx;
          gt._cy = cy;
          gt._base = base;
          tileRefs.current.push(gt);
        }
      }

      moveGlow(-9999, -9999, false);
      paintTiles();
    }

    // ── Animation loop ────────────────────────────────────────────────────
    function tick() {
      raf = 0;
      const dx = tgtX - curX;
      const dy = tgtY - curY;

      if (reduceMotion || (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5)) {
        curX = tgtX; curY = tgtY;
        moveGlow(curX, curY, active);
        paintTiles();
        return;
      }

      curX += dx * 0.12;
      curY += dy * 0.12;
      moveGlow(curX, curY, active);
      paintTiles();
      raf = requestAnimationFrame(tick);
    }

    function ensureLoop() { if (!raf) raf = requestAnimationFrame(tick); }

    // ── Events ────────────────────────────────────────────────────────────
    function handlePointerMove(e: PointerEvent) {
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      const inside =
        e.clientX >= rect.left && e.clientX <= rect.right &&
        e.clientY >= rect.top && e.clientY <= rect.bottom;

      if (!inside) {
        if (active) { active = false; clearEffect(); }
        return;
      }

      let nx = e.clientX - rect.left;
      let ny = e.clientY - rect.top;
      // Chặn viên bi không lấn qua tường ranh giới (lăn sát bề mặt)
      [nx, ny] = clampToBounds(nx, ny, boundsRef.current, BOUNCE_RADIUS);
      tgtX = nx;
      tgtY = ny;
      active = true;
      ensureLoop();
    }

    function handlePointerLeave() { active = false; clearEffect(); }

    function handleResize() {
      if (resizeRaf) return;
      resizeRaf = requestAnimationFrame(() => {
        resizeRaf = 0;
        buildGrid();
        if (!active) clearEffect();
      });
    }

    buildGrid();

    const pointerRoot = svg.closest<HTMLElement>("section");
    const ro = new ResizeObserver(handleResize);
    ro.observe(svg);
    if (pointerRoot) {
      pointerRoot.addEventListener("pointermove", handlePointerMove, { passive: true });
      pointerRoot.addEventListener("pointerleave", handlePointerLeave, { passive: true });
    }

    return () => {
      ro.disconnect();
      pointerRoot?.removeEventListener("pointermove", handlePointerMove);
      pointerRoot?.removeEventListener("pointerleave", handlePointerLeave);
      if (raf) cancelAnimationFrame(raf);
      if (resizeRaf) cancelAnimationFrame(resizeRaf);
    };
  }, [exclusionSelector]);

  return (
    <div
      aria-hidden
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 0,
        pointerEvents: "none",
        overflow: "hidden",
      } as CSSProperties}
    >
      <svg
        ref={svgRef}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          display: "block",
        }}
      />
    </div>
  );
}
