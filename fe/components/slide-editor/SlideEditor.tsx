"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useEditorStore } from "@/stores/slide-editor-store";
import { TopBar } from "./TopBar";
import { ContextualToolbar } from "./ContextualToolbar";
import { LeftPanel } from "./LeftPanel";
import { Canvas, type ActiveTool } from "./Canvas";
import { SlideTray } from "./SlideTray";
import { BottomBar } from "./BottomBar";
import { LayersPanel } from "./LayersPanel";
import { loadSlides, saveSlides } from "./lib/storage";

interface DragState {
  kind: "move" | "resize" | "rotate";
  ids: string[];
  startPositions: Map<
    string,
    { x: number; y: number; w: number; h: number; rotation: number }
  >;
  startMouse: { x: number; y: number };
}

export const dragRefGlobal = {
  current: null as DragState | null,
};

export function SlideEditor() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoomMode, setZoomMode] = useState<"fit" | number>("fit");
  const [lockAspect, setLockAspect] = useState(false);
  const [activeTool, setActiveTool] = useState<ActiveTool>("select");
  const [drawColor, setDrawColor] = useState("#1e293b");
  const [drawSize, setDrawSize] = useState(6);
  const [showLayers, setShowLayers] = useState(false);

  const clearSelection = useEditorStore((s) => s.clearSelection);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return;
      const target = e.target as HTMLElement;
      if (target === containerRef.current || target.dataset.canvas === "true") {
        clearSelection();
      }
    },
    [clearSelection]
  );

  // Nạp slides đã lưu + auto-save (debounce) qua subscribe để không re-render khi kéo.
  useEffect(() => {
    const saved = loadSlides();
    if (saved) {
      useEditorStore.setState({
        slides: saved,
        currentSlideId: saved[0].id,
        selectedIds: [],
        history: { past: [], future: [] },
      });
    }
    let t: ReturnType<typeof setTimeout> | null = null;
    const unsub = useEditorStore.subscribe((state, prev) => {
      if (state.slides === prev.slides) return;
      if (t) clearTimeout(t);
      t = setTimeout(() => saveSlides(useEditorStore.getState().slides), 400);
    });
    return () => {
      if (t) clearTimeout(t);
      unsub();
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      const store = useEditorStore.getState();

      if (e.key === "Escape") {
        store.clearSelection();
        setActiveTool("select");
        return;
      }

      if (e.key === "g" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        if (e.shiftKey) store.ungroupSelected();
        else store.groupSelected();
      }

      if (e.key === "Delete" || e.key === "Backspace") {
        if (store.selectedIds.length > 0) {
          e.preventDefault();
          store.removeElements(store.selectedIds);
        }
      }

      if (e.key === "c" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        store.copySelected();
      }

      if (e.key === "v" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        store.paste();
      }

      if (e.key === "l" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        if (store.selectedIds.length > 0) store.toggleLock(store.selectedIds);
      }

      if (e.key === "z" && (e.ctrlKey || e.metaKey) && !e.shiftKey) {
        e.preventDefault();
        store.undo();
      }

      if (
        (e.key === "z" && (e.ctrlKey || e.metaKey) && e.shiftKey) ||
        (e.key === "y" && (e.ctrlKey || e.metaKey))
      ) {
        e.preventDefault();
        store.redo();
      }

      if (e.key === "d" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        if (store.selectedIds.length > 0) {
          store.duplicateElements(store.selectedIds);
        }
      }

      if (e.key === "a" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        const slide = store.currentSlide();
        if (slide) {
          store.select(slide.elements.map((el) => el.id));
        }
      }

      if (e.key === "ArrowUp" || e.key === "ArrowDown" || e.key === "ArrowLeft" || e.key === "ArrowRight") {
        if (store.selectedIds.length > 0) {
          e.preventDefault();
          const step = e.shiftKey ? 10 : 1;
          const dx = e.key === "ArrowLeft" ? -step : e.key === "ArrowRight" ? step : 0;
          const dy = e.key === "ArrowUp" ? -step : e.key === "ArrowDown" ? step : 0;
          const slide = store.currentSlide();
          if (slide) {
            const updates = store.selectedIds.map((id) => {
              const el = slide.elements.find((e) => e.id === id);
              return el
                ? { id, patch: { x: el.x + dx, y: el.y + dy } }
                : { id, patch: {} };
            });
            store.batchUpdate(updates);
          }
        }
      }

      if (e.key === "]") {
        e.preventDefault();
        if (store.selectedIds.length === 1) {
          store.bringForward(store.selectedIds[0]);
        }
      }

      if (e.key === "[") {
        e.preventDefault();
        if (store.selectedIds.length === 1) {
          store.sendBackward(store.selectedIds[0]);
        }
      }
    };

    const handleMouseUp = () => {
      dragRefGlobal.current = null;
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="flex h-full min-h-0 flex-col bg-[#edeff2]"
      onMouseDown={handleMouseDown}
    >
      <TopBar
        zoomMode={zoomMode}
        onZoomModeChange={setZoomMode}
        lockAspect={lockAspect}
        onToggleLockAspect={() => setLockAspect((v) => !v)}
        showLayers={showLayers}
        onToggleLayers={() => setShowLayers((v) => !v)}
      />
      <div className="flex min-h-0 flex-1">
        <LeftPanel
          activeTool={activeTool}
          onToolChange={setActiveTool}
          drawColor={drawColor}
          onDrawColorChange={setDrawColor}
          drawSize={drawSize}
          onDrawSizeChange={setDrawSize}
        />
        <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
          <ContextualToolbar />
          <Canvas
            dragRef={dragRefGlobal}
            zoomMode={zoomMode}
            lockAspect={lockAspect}
            activeTool={activeTool}
            drawColor={drawColor}
            drawSize={drawSize}
          />
          <SlideTray />
        </div>
        {showLayers && <LayersPanel />}
      </div>
      <BottomBar />
    </div>
  );
}
