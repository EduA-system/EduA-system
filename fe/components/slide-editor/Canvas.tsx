"use client";

import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { useEditorStore } from "@/stores/slide-editor-store";
import { CANVAS_W, CANVAS_H, type Slide, type SlideElement, type ElementPatch } from "./types";
import { ElementView } from "./ElementView";
import { SelectionBox } from "./SelectionBox";
import { InlineTextEditor } from "./InlineTextEditor";
import { ContextMenu, type CtxMenuState } from "./ContextMenu";
import { computeSnap, type Guide } from "./lib/geometry";
import { makeDraw } from "./lib/factory";

export type ActiveTool = "select" | "brush" | "pencil" | "eraser";

const PADDING = 40;

interface DragRef {
  current: {
    kind: "move" | "resize" | "rotate";
    ids: string[];
    startPositions: Map<
      string,
      { x: number; y: number; w: number; h: number; rotation: number }
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
  drawColor = "#1e293b",
  drawSize = 6,
}: {
  dragRef: DragRef;
  zoomMode: "fit" | number;
  lockAspect: boolean;
  activeTool?: ActiveTool;
  drawColor?: string;
  drawSize?: number;
}) {
  const slide = useEditorStore((s) =>
    s.slides.find((sl) => sl.id === s.currentSlideId)
  );
  const selectedIds = useEditorStore((s) => s.selectedIds);
  const select = useEditorStore((s) => s.select);
  const toggleSelect = useEditorStore((s) => s.toggleSelect);

  const areaRef = useRef<HTMLDivElement>(null);
  const canvasInnerRef = useRef<HTMLDivElement>(null);
  const scaleRef = useRef(1);
  const [fitScale, setFitScale] = useState(1);

  const [editingId, setEditingId] = useState<string | null>(null);
  const editSnapRef = useRef<{
    slides: Slide[];
    currentSlideId: string;
    originalText: string;
  } | null>(null);
  const [snapGuides, setSnapGuides] = useState<Guide[]>([]);
  const [rubberBand, setRubberBand] = useState<RubberBand | null>(null);
  const [ctxMenu, setCtxMenu] = useState<CtxMenuState | null>(null);

  const scale = zoomMode === "fit" ? fitScale : zoomMode;

  useLayoutEffect(() => {
    scaleRef.current = scale;
  }, [scale]);

  useLayoutEffect(() => {
    if (zoomMode !== "fit") return;

    const area = areaRef.current;
    if (!area) return;

    const fit = () => {
      const aw = area.clientWidth - PADDING * 2;
      const ah = area.clientHeight - PADDING * 2;
      const s = Math.min(aw / CANVAS_W, ah / CANVAS_H, 1);
      setFitScale(s);
    };

    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(area);
    return () => ro.disconnect();
  }, [zoomMode]);

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
      e.stopPropagation();
      if (editingId) return;
      if (el.locked) return;

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
        { x: number; y: number; w: number; h: number; rotation: number }
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
            updates.push({ id, patch: { x: start.x + dx, y: start.y + dy } });
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
    [editingId, selectedIds, select, toggleSelect, toCanvas, dragRef]
  );

  const handleCanvasMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return;
      // Chỉ xử lý khi bấm trúng nền canvas (không phải element con).
      if (e.target !== canvasInnerRef.current) return;
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
    [select, toCanvas]
  );

  // Vẽ tay (brush/pencil/eraser): mỗi nét là 1 element "draw" + 1 bước history.
  const startDraw = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return;
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
    [activeTool, drawColor, drawSize, toCanvas]
  );

  const handleDoubleClick = useCallback((el: SlideElement) => {
    if (el.type !== "text" || el.locked) return;
    const store = useEditorStore.getState();
    editSnapRef.current = {
      slides: structuredClone(store.slides),
      currentSlideId: store.currentSlideId,
      originalText: el.text,
    };
    setEditingId(el.id);
  }, []);

  const handleTextChange = useCallback((id: string, text: string) => {
    useEditorStore.getState().transientUpdate([{ id, patch: { text } }]);
  }, []);

  const handleTextCommit = useCallback(() => {
    const store = useEditorStore.getState();
    const snap = editSnapRef.current;
    if (editingId && snap) {
      const el = store.currentSlide()?.elements.find((e) => e.id === editingId);
      // Chỉ ghi history nếu chữ thực sự đổi; dùng snapshot chụp trước khi sửa.
      if (el && el.type === "text" && el.text !== snap.originalText) {
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
      if (el && !selectedIds.includes(el.id)) select([el.id]);
      setCtxMenu({ x: e.clientX, y: e.clientY, isCanvas: el === null });
    },
    [selectedIds, select]
  );

  const handleCtxAction = useCallback((action: string) => {
    const store = useEditorStore.getState();
    const ids = store.selectedIds;
    switch (action) {
      case "copy":
        store.copySelected();
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
  }, []);

  const editingEl =
    editingId && slide
      ? slide.elements.find((e) => e.id === editingId)
      : undefined;

  return (
    <div
      ref={areaRef}
      className={`flex min-h-0 flex-1 ${
        zoomMode === "fit"
          ? "items-center justify-center overflow-hidden"
          : "items-start justify-start overflow-auto p-[40px]"
      }`}
      style={{
        background: "#edeff2",
        backgroundImage: "radial-gradient(circle, #d7dbe0 1px, transparent 1px)",
        backgroundSize: "20px 20px",
      }}
    >
      <div
        style={{ width: CANVAS_W * scale, height: CANVAS_H * scale }}
        className="shrink-0 overflow-hidden rounded-[6px] shadow-[0_10px_34px_rgba(15,23,42,0.14)]"
      >
        <div
          ref={canvasInnerRef}
          data-canvas="true"
          style={{
            width: CANVAS_W,
            height: CANVAS_H,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
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
              selected={selectedIds.includes(el.id)}
              hideText={editingId === el.id}
              onMouseDown={(e) => handleElementMouseDown(e, el)}
              onDoubleClick={() => handleDoubleClick(el)}
              onContextMenu={(e) => openCtxMenu(e, el)}
            />
          ))}

          {editingEl && editingEl.type === "text" && (
            <InlineTextEditor
              el={editingEl}
              onChange={(text) => handleTextChange(editingEl.id, text)}
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
                  <line key={i} x1={g.pos} y1={0} x2={g.pos} y2={CANVAS_H} stroke="#f43f5e" strokeWidth="1" strokeDasharray="4 2" />
                ) : (
                  <line key={i} x1={0} y1={g.pos} x2={CANVAS_W} y2={g.pos} stroke="#f43f5e" strokeWidth="1" strokeDasharray="4 2" />
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
                border: "1.5px dashed #3b82f6",
                background: "rgba(59,130,246,0.07)",
                pointerEvents: "none",
                zIndex: 10001,
              }}
            />
          )}

          <SelectionBox toCanvas={toCanvas} lockAspect={lockAspect} />

          {activeTool !== "select" && (
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
