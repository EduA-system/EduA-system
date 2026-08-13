"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useEditorStore } from "@/stores/slide-editor-store";
import {
  CANVAS_W,
  CANVAS_H,
  isSlideLockedForGeneration,
  type Slide,
  type SlideElement,
  type ElementPatch,
} from "./types";
import { ElementView } from "./ElementView";
import { SelectionBox } from "./SelectionBox";
import { InlineTextEditor } from "./InlineTextEditor";
import { ContextMenu, type CtxMenuState } from "./ContextMenu";
import { computeSnap, type Guide } from "./lib/geometry";
import { makeDraw } from "./lib/factory";

export type ActiveTool = "select" | "brush" | "pencil" | "eraser";

const ZOOM_MIN = 0.1;
const ZOOM_MAX = 4;

interface DragRef {
  current: {
    kind: "move" | "resize" | "rotate";
    ids: string[];
    startPositions: Map<
      string,
      { x: number; y: number; w: number; h: number; rotation: number; x1?: number; y1?: number; x2?: number; y2?: number }
    >;
    startMouse: { x: number; y: number };
  } | null;
}

interface RubberBand {
  sx: number;
  sy: number;
  ex: number;
  ey: number;
}

export function Canvas({
  dragRef,
  zoomMode,
  lockAspect,
  activeTool = "select",
  drawColor = "#2b2926",
  drawSize = 6,
  onScaleChange,
  onZoomModeChange,
}: {
  dragRef: DragRef;
  zoomMode: number;
  lockAspect: boolean;
  activeTool?: ActiveTool;
  drawColor?: string;
  drawSize?: number;
  onScaleChange?: (scale: number) => void;
  onZoomModeChange: (zoom: number) => void;
}) {
  const slide = useEditorStore((s) =>
    s.slides.find((sl) => sl.id === s.currentSlideId)
  );
  const selectedIds = useEditorStore((s) => s.selectedIds);
  const select = useEditorStore((s) => s.select);
  const toggleSelect = useEditorStore((s) => s.toggleSelect);
  const activeSandboxIds = useEditorStore((s) => s.activeSandboxIds);

  const areaRef = useRef<HTMLDivElement>(null);
  const canvasInnerRef = useRef<HTMLDivElement>(null);
  const scaleRef = useRef(1);
  const zoomFrameRef = useRef<number | null>(null);
  const pendingZoomRef = useRef<number | null>(null);
  const pendingPanRef = useRef<{ x: number; y: number } | null>(null);
  // Vị trí dời canvas (px, toạ độ màn hình). Mô hình Canva: world div dùng
  // transform translate(pan) scale(zoom), không dùng scroll.
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const panRef = useRef(pan);
  const [isPanning, setIsPanning] = useState(false);
  const panDragRef = useRef<{ startX: number; startY: number; panX: number; panY: number } | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const editSnapRef = useRef<{
    slides: Slide[];
    currentSlideId: string;
    originalText: string;
    originalRect: { x: number; y: number; w: number; h: number };
  } | null>(null);
  const [snapGuides, setSnapGuides] = useState<Guide[]>([]);
  const [rubberBand, setRubberBand] = useState<RubberBand | null>(null);
  const [ctxMenu, setCtxMenu] = useState<CtxMenuState | null>(null);

  const scale = zoomMode;
  const slideLocked = isSlideLockedForGeneration(slide);
  const slideFailed = slide?.generationStatus === "failed";

  useLayoutEffect(() => {
    scaleRef.current = scale;
  }, [scale]);

  // Đồng bộ panRef (dùng trong event handlers).
  useEffect(() => {
    panRef.current = pan;
  }, [pan]);

  // Báo tỉ lệ render thật lên cha (để BottomBar hiển thị % và đặt vị trí slider).
  useEffect(() => {
    onScaleChange?.(scale);
  }, [scale, onScaleChange]);

  // Wheel trên canvas: Ctrl/⌘ → zoom quanh con trỏ; không Ctrl → chặn hoàn toàn
  // (không cuộn trang, không pan, không zoom).
  useEffect(() => {
    const area = areaRef.current;
    if (!area) return;

    const handleWheel = (event: WheelEvent) => {
      // Chặn wheel để trang không bị cuộn khi con trỏ đang trong canvas.
      event.preventDefault();

      if (!event.ctrlKey && !event.metaKey) {
        // Không làm gì cả — disable wheel thường trong canvas.
        return;
      }

      const areaRect = area.getBoundingClientRect();
      const cursorX = event.clientX - areaRect.left;
      const cursorY = event.clientY - areaRect.top;

      const factor = Math.exp(-event.deltaY * 0.0015);
      const oldScale = scaleRef.current;
      const nextScale = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, oldScale * factor));
      const ratio = nextScale / oldScale;
      const p = panRef.current;

      // Giữ điểm dưới con trỏ cố định: pan' = cursor - (cursor - pan) * ratio
      // (world scale quanh tâm viewport nhờ flex căn giữa).
      const nextPanX = cursorX - (cursorX - p.x) * ratio;
      const nextPanY = cursorY - (cursorY - p.y) * ratio;

      scaleRef.current = nextScale;
      pendingZoomRef.current = nextScale;
      pendingPanRef.current = { x: nextPanX, y: nextPanY };

      if (zoomFrameRef.current !== null) return;
      zoomFrameRef.current = requestAnimationFrame(() => {
        zoomFrameRef.current = null;
        const zoom = pendingZoomRef.current;
        const nextPan = pendingPanRef.current;
        pendingZoomRef.current = null;
        pendingPanRef.current = null;
        if (zoom !== null) {
          onZoomModeChange(zoom);
          if (nextPan) {
            panRef.current = nextPan;
            setPan(nextPan);
          }
        }
      });
    };

    area.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      area.removeEventListener("wheel", handleWheel);
      if (zoomFrameRef.current !== null) cancelAnimationFrame(zoomFrameRef.current);
      zoomFrameRef.current = null;
      pendingZoomRef.current = null;
      pendingPanRef.current = null;
    };
  }, [onZoomModeChange]);

  const toCanvas = useCallback((clientX: number, clientY: number) => {
    const rect = canvasInnerRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: (clientX - rect.left) / scaleRef.current,
      y: (clientY - rect.top) / scaleRef.current,
    };
  }, []);

  const handleElementMouseDown = useCallback(
    (e: React.MouseEvent, el: SlideElement) => {
      if (e.button !== 0) return;
      // Lớp nền/trang trí bị khóa không thể được chọn. Để event nổi lên canvas
      // thì click vào chúng vẫn được xem là click vùng trống và bỏ selection.
      if (el.locked) return;
      e.stopPropagation();
      if (slideLocked || editingId) return;

      if (e.shiftKey) {
        toggleSelect(el.id);
        return;
      }

      // Element thuộc group → chọn cả nhóm.
      const slideNow = useEditorStore.getState().currentSlide();
      const groupMembers =
        el.groupId && slideNow
          ? slideNow.elements.filter((o) => o.groupId === el.groupId).map((o) => o.id)
          : [el.id];

      if (!selectedIds.includes(el.id)) {
        select(groupMembers);
      }

      const store = useEditorStore.getState();
      const currentSelected = store.selectedIds.includes(el.id)
        ? store.selectedIds
        : [el.id];
      const curSlide = store.currentSlide();
      if (!curSlide) return;

      const startPositions = new Map<
        string,
        { x: number; y: number; w: number; h: number; rotation: number; x1?: number; y1?: number; x2?: number; y2?: number }
      >();
      for (const id of currentSelected) {
        const elem = curSlide.elements.find((it) => it.id === id);
        if (elem && !elem.locked) {
          startPositions.set(id, {
            x: elem.x,
            y: elem.y,
            w: elem.w,
            h: elem.h,
            rotation: elem.rotation,
            x1: elem.type === "line" || elem.type === "arrow" ? elem.x1 : undefined,
            y1: elem.type === "line" || elem.type === "arrow" ? elem.y1 : undefined,
            x2: elem.type === "line" || elem.type === "arrow" ? elem.x2 : undefined,
            y2: elem.type === "line" || elem.type === "arrow" ? elem.y2 : undefined,
          });
        }
      }

      const startSnap = {
        slides: structuredClone(store.slides),
        currentSlideId: store.currentSlideId,
      };
      let moved = false;

      const startPos = toCanvas(e.clientX, e.clientY);
      dragRef.current = {
        kind: "move",
        ids: [...startPositions.keys()],
        startPositions,
        startMouse: startPos,
      };

      const handleMove = (me: MouseEvent) => {
        if (!dragRef.current) return;
        moved = true;
        const currentPos = toCanvas(me.clientX, me.clientY);
        let dx = currentPos.x - dragRef.current.startMouse.x;
        let dy = currentPos.y - dragRef.current.startMouse.y;

        // Snap: dựng bbox các element đang kéo (sau khi dịch) so với element còn lại.
        const draggedBoxes = dragRef.current.ids.map((id) => {
          const s = dragRef.current!.startPositions.get(id)!;
          return { x: s.x + dx, y: s.y + dy, w: s.w, h: s.h };
        });
        const others =
          useEditorStore
            .getState()
            .currentSlide()
            ?.elements.filter((o) => !dragRef.current!.ids.includes(o.id)) ?? [];
        const snap = computeSnap(draggedBoxes, others);
        dx += snap.snapDx;
        dy += snap.snapDy;
        setSnapGuides(snap.guides);

        const updates: { id: string; patch: ElementPatch }[] = [];
        for (const id of dragRef.current.ids) {
          const start = dragRef.current.startPositions.get(id);
          if (start) {
            if (start.x1 != null && start.y1 != null && start.x2 != null && start.y2 != null) {
              updates.push({
                id,
                patch: {
                  x: start.x + dx,
                  y: start.y + dy,
                  x1: start.x1 + dx,
                  y1: start.y1 + dy,
                  x2: start.x2 + dx,
                  y2: start.y2 + dy,
                },
              });
            } else {
              updates.push({ id, patch: { x: start.x + dx, y: start.y + dy } });
            }
          }
        }
        useEditorStore.getState().transientUpdate(updates);
      };

      const handleUp = () => {
        setSnapGuides([]);
        if (moved) useEditorStore.getState().pushSnapshot(startSnap);
        dragRef.current = null;
        window.removeEventListener("mousemove", handleMove);
        window.removeEventListener("mouseup", handleUp);
      };

      window.addEventListener("mousemove", handleMove);
      window.addEventListener("mouseup", handleUp);
    },
    [editingId, selectedIds, select, slideLocked, toggleSelect, toCanvas, dragRef]
  );

  const handleCanvasMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return;
      if (slideLocked) return;
      // Event từ element/handle đã bị chặn ở handler riêng. Vì vậy mọi click còn
      // lại bên trong canvas đều là vùng trống và cần bỏ chọn.
      e.stopPropagation();
      select([]);

      const start = toCanvas(e.clientX, e.clientY);
      setRubberBand({ sx: start.x, sy: start.y, ex: start.x, ey: start.y });

      const handleMove = (me: MouseEvent) => {
        const cur = toCanvas(me.clientX, me.clientY);
        setRubberBand({ sx: start.x, sy: start.y, ex: cur.x, ey: cur.y });
      };

      const handleUp = (me: MouseEvent) => {
        const end = toCanvas(me.clientX, me.clientY);
        const x0 = Math.min(start.x, end.x);
        const y0 = Math.min(start.y, end.y);
        const x1 = Math.max(start.x, end.x);
        const y1 = Math.max(start.y, end.y);
        if (x1 - x0 > 3 || y1 - y0 > 3) {
          const cur = useEditorStore.getState().currentSlide();
          if (cur) {
            const hit = cur.elements
              .filter(
                (el) =>
                  el.x < x1 && el.x + el.w > x0 && el.y < y1 && el.y + el.h > y0
              )
              .map((el) => el.id);
            useEditorStore.getState().select(hit);
          }
        }
        setRubberBand(null);
        window.removeEventListener("mousemove", handleMove);
        window.removeEventListener("mouseup", handleUp);
      };

      window.addEventListener("mousemove", handleMove);
      window.addEventListener("mouseup", handleUp);
    },
    [select, slideLocked, toCanvas]
  );

  // Vẽ tay (brush/pencil/eraser): mỗi nét là 1 element "draw" + 1 bước history.
  const startDraw = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return;
      if (slideLocked) return;
      e.stopPropagation();
      e.preventDefault();
      const p = toCanvas(e.clientX, e.clientY);
      const store = useEditorStore.getState();
      const cur = store.currentSlide();
      const maxZ = cur ? cur.elements.reduce((m, el) => Math.max(m, el.zIndex), 0) : 0;
      const id = `el-draw-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const isEraser = activeTool === "eraser";
      const stroke = isEraser ? cur?.bg ?? "#ffffff" : drawColor;
      let pts = `M ${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
      store.addElement(
        makeDraw({
          id,
          points: pts,
          stroke,
          strokeW: drawSize,
          drawTool: activeTool === "select" ? "brush" : activeTool,
          zIndex: maxZ + 1,
          opacity: activeTool === "brush" ? 0.85 : 1,
        })
      );
      let last = p;

      const handleMove = (me: MouseEvent) => {
        const q = toCanvas(me.clientX, me.clientY);
        if (Math.hypot(q.x - last.x, q.y - last.y) < 2) return;
        last = q;
        pts += ` L ${q.x.toFixed(1)} ${q.y.toFixed(1)}`;
        useEditorStore.getState().transientUpdate([{ id, patch: { points: pts } }]);
      };
      const handleUp = () => {
        window.removeEventListener("mousemove", handleMove);
        window.removeEventListener("mouseup", handleUp);
      };
      window.addEventListener("mousemove", handleMove);
      window.addEventListener("mouseup", handleUp);
    },
    [activeTool, drawColor, drawSize, slideLocked, toCanvas]
  );

  const handleDoubleClick = useCallback((el: SlideElement) => {
    if (slideLocked) return;
    if (el.type !== "text" || el.locked) return;
    const store = useEditorStore.getState();
    editSnapRef.current = {
      slides: structuredClone(store.slides),
      currentSlideId: store.currentSlideId,
      originalText: el.text,
      originalRect: { x: el.x, y: el.y, w: el.w, h: el.h },
    };
    setEditingId(el.id);
  }, [slideLocked]);

  const handleTextChange = useCallback((id: string, text: string) => {
    if (slideLocked) return;
    useEditorStore.getState().transientUpdate([{ id, patch: { text } }]);
  }, [slideLocked]);

  const handleTextResizeHeight = useCallback((id: string, height: number) => {
    if (slideLocked) return;
    useEditorStore.getState().transientUpdate([{ id, patch: { h: height } }]);
  }, [slideLocked]);

  const handleTextCommit = useCallback(() => {
    const store = useEditorStore.getState();
    const snap = editSnapRef.current;
    if (editingId && snap) {
      const el = store.currentSlide()?.elements.find((e) => e.id === editingId);
      // Chỉ ghi history nếu nội dung hoặc kích thước thật sự đổi.
      if (
        el &&
        el.type === "text" &&
        (el.text !== snap.originalText ||
          el.x !== snap.originalRect.x ||
          el.y !== snap.originalRect.y ||
          el.w !== snap.originalRect.w ||
          el.h !== snap.originalRect.h)
      ) {
        store.pushSnapshot({ slides: snap.slides, currentSlideId: snap.currentSlideId });
      }
    }
    editSnapRef.current = null;
    setEditingId(null);
  }, [editingId]);
  const openCtxMenu = useCallback(
    (e: React.MouseEvent, el: SlideElement | null) => {
      e.preventDefault();
      e.stopPropagation();
      if (slideLocked) return;
      if (el && !selectedIds.includes(el.id)) select([el.id]);
      setCtxMenu({ x: e.clientX, y: e.clientY, isCanvas: el === null });
    },
    [selectedIds, select, slideLocked]
  );

  const handleCtxAction = useCallback((action: string) => {
    if (slideLocked) return;
    const store = useEditorStore.getState();
    const ids = store.selectedIds;
    switch (action) {
      case "copy":
        store.copySelected();
        break;
      case "cut":
        store.cutSelected();
        break;
      case "duplicate":
        if (ids.length) store.duplicateElements(ids);
        break;
      case "paste":
        store.paste();
        break;
      case "delete":
        if (ids.length) store.removeElements(ids);
        break;
      case "zUp":
        if (ids.length === 1) store.bringForward(ids[0]);
        break;
      case "zDown":
        if (ids.length === 1) store.sendBackward(ids[0]);
        break;
      case "lock":
        if (ids.length) store.toggleLock(ids);
        break;
      case "group":
        store.groupSelected();
        break;
      case "ungroup":
        store.ungroupSelected();
        break;
      case "selectAll": {
        const cur = store.currentSlide();
        if (cur) store.select(cur.elements.map((el) => el.id));
        break;
      }
    }
  }, [slideLocked]);

  // Giữ chuột giữa kéo để di chuyển không gian (pan) — như Canva.
  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      const drag = panDragRef.current;
      if (!drag) return;
      const dx = e.clientX - drag.startX;
      const dy = e.clientY - drag.startY;
      const next = { x: drag.panX + dx, y: drag.panY + dy };
      panRef.current = next;
      setPan(next);
    };
    const onMouseUp = (e: MouseEvent) => {
      if (e.button === 1 && panDragRef.current) {
        panDragRef.current = null;
        setIsPanning(false);
      }
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

  const editingEl =
    editingId && slide
      ? slide.elements.find((e) => e.id === editingId)
      : undefined;

  return (
    <div
      ref={areaRef}
      className="relative min-h-0 flex-1 overflow-hidden"
      style={{
        background: "#f5f1ec",
        backgroundImage: "radial-gradient(circle, rgba(216,209,201,0.78) 1px, transparent 1px)",
        backgroundSize: "20px 20px",
        cursor: isPanning ? "grabbing" : "default",
      }}
      onMouseDown={(e) => {
        // Giữ chuột giữa để di chuyển không gian (pan) — như Canva.
        if (e.button === 1) {
          e.preventDefault();
          panDragRef.current = { startX: e.clientX, startY: e.clientY, panX: pan.x, panY: pan.y };
          setIsPanning(true);
          return;
        }
      }}
    >
      {/* World: căn giữa slide; translate(pan) + scale(zoom) quanh tâm — mô hình
          Canva đơn giản, không lồng transform nên không lệch. */}
      <div
        className="flex h-full w-full items-center justify-center"
        style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})` }}
      >
        <div
          className="shrink-0 overflow-hidden rounded-[12px] shadow-[0_10px_32px_rgba(43,41,38,0.12),0_2px_8px_rgba(43,41,38,0.07)]"
          style={{ width: CANVAS_W, height: CANVAS_H }}
        >
        <div
          ref={canvasInnerRef}
          data-canvas="true"
          style={{
            width: CANVAS_W,
            height: CANVAS_H,
            background: slide?.bg ?? "#ffffff",
          }}
          className="relative"
          onMouseDown={handleCanvasMouseDown}
          onContextMenu={(e) => {
            if (e.target === canvasInnerRef.current) openCtxMenu(e, null);
          }}
        >
          {slide?.elements.map((el) => (
            <ElementView
              key={el.id}
              el={el}
              hideText={editingId === el.id}
              simulationPreview
              sandboxActive={activeSandboxIds.includes(el.id)}
              onMouseDown={(e) => handleElementMouseDown(e, el)}
              onDoubleClick={() => handleDoubleClick(el)}
              onContextMenu={(e) => openCtxMenu(e, el)}
            />
          ))}

          {editingEl && editingEl.type === "text" && (
            <InlineTextEditor
              el={editingEl}
              onChange={(text) => handleTextChange(editingEl.id, text)}
              onResizeHeight={(height) => handleTextResizeHeight(editingEl.id, height)}
              onCommit={handleTextCommit}
            />
          )}

          {snapGuides.length > 0 && (
            <svg
              style={{
                position: "absolute",
                inset: 0,
                width: CANVAS_W,
                height: CANVAS_H,
                pointerEvents: "none",
                zIndex: 10000,
              }}
              viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`}
            >
              {snapGuides.map((g, i) =>
                g.type === "x" ? (
                  <line key={i} x1={g.pos} y1={0} x2={g.pos} y2={CANVAS_H} stroke="#d97757" strokeWidth="1" strokeDasharray="4 2" />
                ) : (
                  <line key={i} x1={0} y1={g.pos} x2={CANVAS_W} y2={g.pos} stroke="#d97757" strokeWidth="1" strokeDasharray="4 2" />
                )
              )}
            </svg>
          )}

          {rubberBand && (
            <div
              style={{
                position: "absolute",
                left: Math.min(rubberBand.sx, rubberBand.ex),
                top: Math.min(rubberBand.sy, rubberBand.ey),
                width: Math.abs(rubberBand.ex - rubberBand.sx),
                height: Math.abs(rubberBand.ey - rubberBand.sy),
                border: "1.5px dashed #d97757",
                background: "rgba(217,119,87,0.10)",
                pointerEvents: "none",
                zIndex: 10001,
              }}
            />
          )}

          <SelectionBox toCanvas={toCanvas} lockAspect={lockAspect} />

          {activeTool !== "select" && !slideLocked && (
            <div
              onMouseDown={startDraw}
              style={{
                position: "absolute",
                inset: 0,
                width: CANVAS_W,
                height: CANVAS_H,
                cursor: "crosshair",
                zIndex: 20000,
              }}
            />
          )}

          {slideLocked && (
            <div
              className="absolute inset-0 z-[30000] flex items-center justify-center bg-white/35 backdrop-blur-[1px]"
              style={{ width: CANVAS_W, height: CANVAS_H }}
            >
              <span className="size-11 animate-spin rounded-full border-[5px] border-[#d97757] border-t-transparent shadow-[0_0_0_1px_rgba(255,255,255,0.55)]" />
            </div>
          )}

          {slideFailed && (
            <div
              className="absolute inset-0 z-[29999] flex items-center justify-center bg-[#160b0b]/58 p-12"
              style={{ width: CANVAS_W, height: CANVAS_H }}
            >
              <div className="w-full max-w-[640px] rounded-2xl border border-red-200/40 bg-[#fff8f7] p-7 text-left shadow-2xl">
                <p className="text-sm font-semibold text-[#b42318]">Không thể tạo nội dung cho slide này</p>
                <p className="mt-2 text-sm leading-6 text-[#4f4943]">
                  {slide.generationError || "Đã xảy ra lỗi không xác định khi tạo slide."}
                </p>
                <p className="mt-4 text-xs text-[#7b7169]">Chạy lại bước hiện tại để thử tạo lại slide này.</p>
              </div>
            </div>
          )}
        </div>
        </div>
        </div>

      {ctxMenu && (
        <ContextMenu
          menu={ctxMenu}
          onClose={() => setCtxMenu(null)}
          onAction={handleCtxAction}
        />
      )}
    </div>
  );
}
