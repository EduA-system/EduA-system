"use client";

import { useEffect, useRef, useState } from "react";
import { useEditorStore } from "@/stores/slide-editor-store";
import { CANVAS_W, CANVAS_H } from "./types";
import { ElementView } from "./ElementView";

const ZOOM_MIN = 0.1;
const ZOOM_MAX = 4;

function GridIcon() {
  return (
    <svg className="size-[14px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  );
}

function ZoomOutIcon() {
  return (
    <svg className="size-[13px]" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
      <circle cx="7" cy="7" r="4.2" />
      <path d="M10.2 10.2 13 13" />
      <path d="M5.4 7h3.2" />
    </svg>
  );
}

function ZoomInIcon() {
  return (
    <svg className="size-[13px]" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
      <circle cx="7" cy="7" r="4.2" />
      <path d="M10.2 10.2 13 13" />
      <path d="M5.4 7h3.2" />
      <path d="M7 5.4v3.2" />
    </svg>
  );
}

function ExpandIcon() {
  return (
    <svg className="size-[14px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 3H3v5" />
      <path d="M21 8V3h-5" />
      <path d="M16 21h5v-5" />
      <path d="M3 16v5h5" />
    </svg>
  );
}

function CompressIcon() {
  return (
    <svg className="size-[14px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 9h5V4" />
      <path d="M20 9h-5V4" />
      <path d="M15 20v-5h5" />
      <path d="M4 15h5v5" />
    </svg>
  );
}

function GridOverview({ onClose }: { onClose: () => void }) {
  const slides = useEditorStore((s) => s.slides);
  const currentSlideId = useEditorStore((s) => s.currentSlideId);
  const setCurrentSlide = useEditorStore((s) => s.setCurrentSlide);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const THUMB_W = 220;
  const scale = THUMB_W / CANVAS_W;
  const thumbH = CANVAS_H * scale;

  return (
    <div className="fixed inset-0 z-[200] flex flex-col bg-[#2b2926]/60 backdrop-blur-[2px]" onMouseDown={onClose}>
      <div className="flex items-center justify-between px-6 py-4 text-white">
        <span className="text-[13px] font-medium">All slides ({slides.length})</span>
        <button onClick={onClose} className="rounded-md px-3 py-1 text-[13px] text-white/90 hover:bg-white/15">
          Close
        </button>
      </div>
      <div className="flex flex-wrap content-start justify-center gap-5 overflow-auto px-6 pb-8" onMouseDown={(e) => e.stopPropagation()}>
        {slides.map((slide, i) => (
          <button
            key={slide.id}
            onClick={() => {
              setCurrentSlide(slide.id);
              onClose();
            }}
            className="group flex flex-col items-start gap-1.5"
          >
            <div
              style={{ width: THUMB_W, height: thumbH }}
              className={`overflow-hidden rounded-[8px] bg-white transition ${
                slide.id === currentSlideId ? "ring-2 ring-white" : "ring-1 ring-white/20 group-hover:ring-white/60"
              }`}
            >
              <div
                style={{
                  width: CANVAS_W,
                  height: CANVAS_H,
                  transform: `scale(${scale})`,
                  transformOrigin: "top left",
                  background: slide.bg,
                }}
                className="relative"
              >
                {slide.elements.map((el) => (
                  <ElementView key={el.id} el={el} />
                ))}
              </div>
            </div>
            <span className="pl-0.5 text-[11px] leading-none text-white/70">{i + 1}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function BottomBar({
  onZoomModeChange,
  currentScale,
  showTray,
  onToggleTray,
}: {
  onZoomModeChange: (zoom: number) => void;
  currentScale: number;
  showTray: boolean;
  onToggleTray: () => void;
}) {
  const slides = useEditorStore((s) => s.slides);
  const currentSlideId = useEditorStore((s) => s.currentSlideId);
  const current = slides.findIndex((s) => s.id === currentSlideId) + 1;

  const [showGrid, setShowGrid] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      document.documentElement.requestFullscreen?.();
    }
  };

  const zoomPercent = Math.round(currentScale * 100);

  return (
    <>
      <div ref={ref} className="pointer-events-none absolute inset-x-0 bottom-3 z-30 flex items-center justify-center px-4">
        <div className="pointer-events-auto flex items-center gap-2 rounded-[14px] border border-[#e8e2d9] bg-white/92 px-3 py-1.5 text-[11px] shadow-[0_6px_18px_rgba(43,41,38,0.10)] backdrop-blur">
          <span className="size-1.5 rounded-full bg-[#d97757]" />
          <span className="font-semibold text-[#2b2926]">Slide {current || 1}</span>
          <span className="text-[#b8aea5]">/ {slides.length}</span>
          <button
            onClick={onToggleTray}
            title="Toggle slide tray"
            className={`ml-1 rounded-[8px] px-1.5 py-0.5 ${showTray ? "text-[#d97757]" : "text-[#b8aea5] hover:text-[#4f4943]"}`}
          >
            <GridIcon />
          </button>
        </div>
      </div>

      <div className="absolute bottom-3 right-4 z-30 flex items-center gap-1 rounded-[14px] border border-[#e8e2d9] bg-white/92 p-1 shadow-[0_6px_18px_rgba(43,41,38,0.10)] backdrop-blur">
        <button
          onClick={() => onZoomModeChange(Math.max(ZOOM_MIN, currentScale - 0.1))}
          className="flex size-8 items-center justify-center rounded-[10px] text-[#8a8178] hover:bg-[#f7f3ee] hover:text-[#4f4943]"
          title="Zoom out"
        >
          <ZoomOutIcon />
        </button>
        <button
          onClick={() => onZoomModeChange(1)}
          className="w-11 rounded-[10px] px-1 py-1 text-center text-[11px] font-semibold tabular-nums text-[#4f4943] hover:bg-[#f7f3ee]"
          title="Về 100%"
        >
          {zoomPercent}%
        </button>
        <button
          onClick={() => onZoomModeChange(Math.min(ZOOM_MAX, currentScale + 0.1))}
          className="flex size-8 items-center justify-center rounded-[10px] text-[#8a8178] hover:bg-[#f7f3ee] hover:text-[#4f4943]"
          title="Zoom in"
        >
          <ZoomInIcon />
        </button>
        <button
          onClick={() => setShowGrid(true)}
          className="flex size-8 items-center justify-center rounded-[10px] text-[#8a8178] hover:bg-[#f7f3ee] hover:text-[#4f4943]"
          title="All slides"
        >
          <GridIcon />
        </button>
        <button
          onClick={toggleFullscreen}
          className={`flex size-8 items-center justify-center rounded-[10px] ${isFullscreen ? "bg-[#f6eadf] text-[#d97757]" : "text-[#8a8178] hover:bg-[#f7f3ee] hover:text-[#4f4943]"}`}
          title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
        >
          {isFullscreen ? <CompressIcon /> : <ExpandIcon />}
        </button>
      </div>

      {showGrid && <GridOverview onClose={() => setShowGrid(false)} />}
    </>
  );
}
