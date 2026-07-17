"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useEditorStore } from "@/stores/slide-editor-store";
import { isSlideLockedForGeneration } from "./types";
import { TopBar, type DesignStepControls } from "./TopBar";
import { ContextualToolbar } from "./ContextualToolbar";
import { LeftPanel } from "./LeftPanel";
import { Canvas, type ActiveTool } from "./Canvas";
import { SlideTray } from "./SlideTray";
import { BottomBar } from "./BottomBar";
import { LayersPanel, type RightPanelTab } from "./LayersPanel";
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

export function SlideEditor({
  skipInitialLoad = false,
  designSteps,
  onSaveToLibrary,
  savingToLibrary = false,
}: {
  skipInitialLoad?: boolean;
  designSteps?: DesignStepControls;
  onSaveToLibrary?: () => void;
  savingToLibrary?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoomMode, setZoomMode] = useState<"fit" | number>("fit");
  const lockAspect = false;
  const [activeTool, setActiveTool] = useState<ActiveTool>("select");
  const [drawColor, setDrawColor] = useState("#2b2926");
  const [drawSize, setDrawSize] = useState(6);
  const [rightPanelTab, setRightPanelTab] = useState<RightPanelTab>("properties");
  const [showRightPanel, setShowRightPanel] = useState(true);
  const [showTray, setShowTray] = useState(true);
  const [currentScale, setCurrentScale] = useState(1);

  const clearSelection = useEditorStore((s) => s.clearSelection);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return;
      const target = e.target as HTMLElement;
      if (target === containerRef.current || target.dataset.canvas === "true") {
        clearSelection();
      }
    },
    [clearSelection],
  );

  useEffect(() => {
    if (skipInitialLoad) return;
    const saved = loadSlides();
    if (saved) {
      useEditorStore.setState({
        slides: saved,
        currentSlideId: saved[0].id,
        selectedIds: [],
        history: { past: [], future: [] },
      });
    }
  }, [skipInitialLoad]);

  useEffect(() => {
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

      const slideLocked = isSlideLockedForGeneration(store.currentSlide());
      const hasLockedSlides = store.slides.some(isSlideLockedForGeneration);

      if (e.key === "g" && (e.ctrlKey || e.metaKey)) {
        if (slideLocked) return;
        e.preventDefault();
        if (e.shiftKey) store.ungroupSelected();
        else store.groupSelected();
      }

      if (e.key === "Delete" || e.key === "Backspace") {
        if (slideLocked) return;
        if (store.selectedIds.length > 0) {
          e.preventDefault();
          store.removeElements(store.selectedIds);
        }
      }

      if (e.key === "c" && (e.ctrlKey || e.metaKey)) {
        if (slideLocked) return;
        e.preventDefault();
        store.copySelected();
      }

      if (e.key === "x" && (e.ctrlKey || e.metaKey)) {
        if (slideLocked) return;
        e.preventDefault();
        store.cutSelected();
      }

      if (e.key === "v" && (e.ctrlKey || e.metaKey)) {
        if (slideLocked) return;
        e.preventDefault();
        store.paste();
      }

      if (e.key === "l" && (e.ctrlKey || e.metaKey)) {
        if (slideLocked) return;
        e.preventDefault();
        if (store.selectedIds.length > 0) store.toggleLock(store.selectedIds);
      }

      if (e.key === "z" && (e.ctrlKey || e.metaKey) && !e.shiftKey) {
        if (hasLockedSlides) return;
        e.preventDefault();
        store.undo();
      }

      if (
        (e.key === "z" && (e.ctrlKey || e.metaKey) && e.shiftKey) ||
        (e.key === "y" && (e.ctrlKey || e.metaKey))
      ) {
        if (hasLockedSlides) return;
        e.preventDefault();
        store.redo();
      }

      if (e.key === "d" && (e.ctrlKey || e.metaKey)) {
        if (slideLocked) return;
        e.preventDefault();
        if (store.selectedIds.length > 0) {
          store.duplicateElements(store.selectedIds);
        }
      }

      if (e.key === "a" && (e.ctrlKey || e.metaKey)) {
        if (slideLocked) return;
        e.preventDefault();
        const slide = store.currentSlide();
        if (slide) {
          store.select(slide.elements.map((el) => el.id));
        }
      }

      if (e.key === "ArrowUp" || e.key === "ArrowDown" || e.key === "ArrowLeft" || e.key === "ArrowRight") {
        if (slideLocked) return;
        if (store.selectedIds.length > 0) {
          e.preventDefault();
          const step = e.shiftKey ? 10 : 1;
          const dx = e.key === "ArrowLeft" ? -step : e.key === "ArrowRight" ? step : 0;
          const dy = e.key === "ArrowUp" ? -step : e.key === "ArrowDown" ? step : 0;
          const slide = store.currentSlide();
          if (slide) {
            const updates = store.selectedIds.map((id) => {
              const el = slide.elements.find((item) => item.id === id);
              return el
                ? { id, patch: { x: el.x + dx, y: el.y + dy } }
                : { id, patch: {} };
            });
            store.batchUpdate(updates);
          }
        }
      }

      if (e.key === "]") {
        if (slideLocked) return;
        e.preventDefault();
        if (store.selectedIds.length === 1) {
          store.bringForward(store.selectedIds[0]);
        }
      }

      if (e.key === "[") {
        if (slideLocked) return;
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
      className="flex h-full min-h-0 flex-col bg-[#f5f1ec] font-sans"
      onMouseDown={handleMouseDown}
    >
      <TopBar
        showRightPanel={showRightPanel}
        onToggleRightPanel={() => setShowRightPanel((value) => !value)}
        designSteps={designSteps}
        onSaveToLibrary={onSaveToLibrary}
        savingToLibrary={savingToLibrary}
      />
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <LeftPanel
          activeTool={activeTool}
          onToolChange={setActiveTool}
          drawColor={drawColor}
          onDrawColorChange={setDrawColor}
          drawSize={drawSize}
          onDrawSizeChange={setDrawSize}
        />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <div className="relative min-h-0 flex-1 overflow-hidden">
            <ContextualToolbar
              onOpenProperties={() => {
                setShowRightPanel(true);
                setRightPanelTab("properties");
              }}
            />
            <Canvas
              dragRef={dragRefGlobal}
              zoomMode={zoomMode}
              lockAspect={lockAspect}
              activeTool={activeTool}
              drawColor={drawColor}
              drawSize={drawSize}
              onScaleChange={setCurrentScale}
              onZoomModeChange={setZoomMode}
            />
            <BottomBar
              zoomMode={zoomMode}
              onZoomModeChange={setZoomMode}
              currentScale={currentScale}
              showTray={showTray}
              onToggleTray={() => setShowTray((v) => !v)}
            />
          </div>
          {showTray && <SlideTray />}
        </div>
        {showRightPanel && <LayersPanel activeTab={rightPanelTab} onTabChange={setRightPanelTab} />}
      </div>
    </div>
  );
}
