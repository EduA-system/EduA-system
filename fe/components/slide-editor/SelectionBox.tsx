"use client";

import { useCallback, useMemo } from "react";
import { useEditorStore } from "@/stores/slide-editor-store";
import { isSlideLockedForGeneration, type ElementPatch, type LineElement } from "./types";
import {
  computeBoundingBox,
  applyResize,
  applyRotation,
  getCenter,
  elemFromEndpoints,
} from "./lib/geometry";

const HANDLE_SIZE = 8;
const ROTATE_HANDLE_OFFSET = 24;
const SELECTION_LAYER_Z_INDEX = 15000;

// Chỉ 4 góc mới scale cỡ chữ; handle cạnh chỉ resize khung.
const CORNER_HANDLES = new Set(["nw", "ne", "sw", "se"]);
// Làm chậm tốc độ tăng cỡ chữ so với khung (0..1, càng nhỏ càng chậm).
const FONT_SCALE_DAMPING = 0.5;

const HANDLES = [
  { id: "nw", cursor: "nw-resize", x: 0, y: 0 },
  { id: "ne", cursor: "ne-resize", x: 1, y: 0 },
  { id: "sw", cursor: "sw-resize", x: 0, y: 1 },
  { id: "se", cursor: "se-resize", x: 1, y: 1 },
  { id: "n", cursor: "n-resize", x: 0.5, y: 0 },
  { id: "s", cursor: "s-resize", x: 0.5, y: 1 },
  { id: "w", cursor: "w-resize", x: 0, y: 0.5 },
  { id: "e", cursor: "e-resize", x: 1, y: 0.5 },
];

interface SelectionBoxProps {
  toCanvas: (clientX: number, clientY: number) => { x: number; y: number };
  lockAspect: boolean;
}

// Chụp slides hiện tại (trước thao tác) để đẩy vào history khi mouseup.
function startSnapshot() {
  const store = useEditorStore.getState();
  return {
    slides: structuredClone(store.slides),
    currentSlideId: store.currentSlideId,
  };
}

export function SelectionBox({ toCanvas, lockAspect }: SelectionBoxProps) {
  const selectedIds = useEditorStore((s) => s.selectedIds);
  const currentSlide = useEditorStore((s) => s.currentSlide);
  const transientUpdate = useEditorStore((s) => s.transientUpdate);

  const slide = currentSlide();
  const selectedElements = useMemo(
    () => (slide ? slide.elements.filter((el) => selectedIds.includes(el.id)) : []),
    [slide, selectedIds]
  );
  const bbox = useMemo(
    () =>
      selectedElements.length > 0
        ? computeBoundingBox(selectedElements)
        : { x: 0, y: 0, w: 0, h: 0 },
    [selectedElements]
  );

  const single = selectedElements.length === 1 ? selectedElements[0] : null;
  const isLine = single?.type === "line" || single?.type === "arrow";
  const isDraw = single?.type === "draw";
  const locked = isSlideLockedForGeneration(slide) || selectedElements.some((el) => el.locked);

  const handleResizeStart = useCallback(
    (e: React.MouseEvent, handleId: string) => {
      e.stopPropagation();
      e.preventDefault();

      const startMouse = toCanvas(e.clientX, e.clientY);
      const startElements = selectedElements.map((el) => ({
        id: el.id,
        x: el.x,
        y: el.y,
        w: el.w,
        h: el.h,
        type: el.type,
        fontSize: el.type === "text" ? el.fontSize : 0,
      }));
      const startBbox = { ...bbox };
      const aspect = startBbox.w / startBbox.h;
      const snap = startSnapshot();
      let moved = false;

      const handleMove = (me: MouseEvent) => {
        moved = true;
        const currentMouse = toCanvas(me.clientX, me.clientY);
        const delta = { dx: currentMouse.x - startMouse.x, dy: currentMouse.y - startMouse.y };
        const keepAspect = lockAspect || me.shiftKey;

        const updates = startElements.map((startEl) => {
          const original = { x: startEl.x, y: startEl.y, w: startEl.w, h: startEl.h };
          const newRect = applyResize(handleId, delta, original, keepAspect ? aspect : undefined);
          const patch: ElementPatch = {
            x: newRect.x,
            y: newRect.y,
            w: newRect.w,
            h: newRect.h,
          };
          // Text: chỉ scale cỡ chữ khi kéo handle góc, và làm chậm tốc độ tăng.
          if (startEl.type === "text" && startEl.h > 0 && CORNER_HANDLES.has(handleId)) {
            const rawScale = newRect.h / startEl.h;
            const dampedScale = 1 + (rawScale - 1) * FONT_SCALE_DAMPING;
            patch.fontSize = Math.max(
              6,
              Math.min(200, Math.round(startEl.fontSize * dampedScale))
            );
          }
          return { id: startEl.id, patch };
        });

        transientUpdate(updates);
      };

      const handleUp = () => {
        if (moved) useEditorStore.getState().pushSnapshot(snap);
        window.removeEventListener("mousemove", handleMove);
        window.removeEventListener("mouseup", handleUp);
      };

      window.addEventListener("mousemove", handleMove);
      window.addEventListener("mouseup", handleUp);
    },
    [selectedElements, bbox, lockAspect, toCanvas, transientUpdate]
  );

  const handleRotateStart = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();

      const center = getCenter(bbox);
      const ids = selectedElements.map((el) => el.id);
      const snap = startSnapshot();
      let moved = false;

      const handleMove = (me: MouseEvent) => {
        moved = true;
        const mousePos = toCanvas(me.clientX, me.clientY);
        let newRotation = applyRotation(center, mousePos);
        if (me.shiftKey) newRotation = Math.round(newRotation / 15) * 15;
        transientUpdate(ids.map((id) => ({ id, patch: { rotation: newRotation } })));
      };

      const handleUp = () => {
        if (moved) useEditorStore.getState().pushSnapshot(snap);
        window.removeEventListener("mousemove", handleMove);
        window.removeEventListener("mouseup", handleUp);
      };

      window.addEventListener("mousemove", handleMove);
      window.addEventListener("mouseup", handleUp);
    },
    [bbox, selectedElements, toCanvas, transientUpdate]
  );

  const handleEndpointStart = useCallback(
    (e: React.MouseEvent, which: "start" | "end") => {
      e.stopPropagation();
      e.preventDefault();
      if (!single || (single.type !== "line" && single.type !== "arrow")) return;
      const el = single as LineElement;
      const id = el.id;
      const snap = startSnapshot();
      let moved = false;

      const handleMove = (me: MouseEvent) => {
        moved = true;
        const p = toCanvas(me.clientX, me.clientY);
        const x1 = which === "start" ? p.x : el.x1;
        const y1 = which === "start" ? p.y : el.y1;
        const x2 = which === "end" ? p.x : el.x2;
        const y2 = which === "end" ? p.y : el.y2;
        transientUpdate([{ id, patch: elemFromEndpoints(x1, y1, x2, y2, el) }]);
      };

      const handleUp = () => {
        if (moved) useEditorStore.getState().pushSnapshot(snap);
        window.removeEventListener("mousemove", handleMove);
        window.removeEventListener("mouseup", handleUp);
      };

      window.addEventListener("mousemove", handleMove);
      window.addEventListener("mouseup", handleUp);
    },
    [single, toCanvas, transientUpdate]
  );

  if (!slide || selectedElements.length === 0) return null;
  if (bbox.w === 0 || bbox.h === 0) return null;

  // Line/arrow đơn: hiện 2 endpoint thay cho 8 handle.
  if (single && isLine && !locked) {
    const el = single as LineElement;
    return (
      <svg
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          overflow: "visible",
          pointerEvents: "none",
          zIndex: SELECTION_LAYER_Z_INDEX,
        }}
      >
        <circle
          cx={el.x1}
          cy={el.y1}
          r={6}
          fill="#ffffff"
          stroke="#3b82f6"
          strokeWidth={2}
          style={{ cursor: "grab", pointerEvents: "auto" }}
          onMouseDown={(e) => handleEndpointStart(e, "start")}
        />
        <circle
          cx={el.x2}
          cy={el.y2}
          r={6}
          fill="#3b82f6"
          stroke="#ffffff"
          strokeWidth={2}
          style={{ cursor: "grab", pointerEvents: "auto" }}
          onMouseDown={(e) => handleEndpointStart(e, "end")}
        />
      </svg>
    );
  }

  return (
    <div
      style={{
        position: "absolute",
        left: bbox.x,
        top: bbox.y,
        width: bbox.w,
        height: bbox.h,
        pointerEvents: "none",
        zIndex: SELECTION_LAYER_Z_INDEX,
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: -1,
          border: "2px solid #3b82f6",
          pointerEvents: "none",
        }}
      />

      {!locked && !isDraw && (
        <>
          {HANDLES.map((handle) => (
            <div
              key={handle.id}
              style={{
                position: "absolute",
                left: handle.x * bbox.w - HANDLE_SIZE / 2,
                top: handle.y * bbox.h - HANDLE_SIZE / 2,
                width: HANDLE_SIZE,
                height: HANDLE_SIZE,
                background: "white",
                border: "2px solid #3b82f6",
                borderRadius: 2,
                cursor: handle.cursor,
                pointerEvents: "auto",
              }}
              onMouseDown={(e) => handleResizeStart(e, handle.id)}
            />
          ))}

          <div
            style={{
              position: "absolute",
              left: bbox.w / 2 - 6,
              top: -ROTATE_HANDLE_OFFSET,
              width: 12,
              height: 12,
              background: "#3b82f6",
              borderRadius: "50%",
              cursor: "grab",
              pointerEvents: "auto",
            }}
            onMouseDown={handleRotateStart}
          />
          <div
            style={{
              position: "absolute",
              left: bbox.w / 2,
              top: -ROTATE_HANDLE_OFFSET + 6,
              width: 1,
              height: ROTATE_HANDLE_OFFSET - 6,
              background: "#3b82f6",
              pointerEvents: "none",
            }}
          />
        </>
      )}
    </div>
  );
}
