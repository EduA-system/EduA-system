"use client";

// Thanh dưới của editor (kiểu Canva). Số trang đọc từ store; zoom điều khiển thật
// qua slider; Pages bật/tắt dải thumbnail; nút lưới mở overview; nút mở rộng vào
// fullscreen; nút trợ giúp mở bảng phím tắt.

import { useEffect, useRef, useState } from "react";
import { useEditorStore } from "@/stores/slide-editor-store";
import { CANVAS_W, CANVAS_H } from "./types";
import { ElementView } from "./ElementView";

const ICON = "size-[18px] shrink-0";

const ZOOM_MIN = 0.1;
const ZOOM_MAX = 4;

function GridIcon() {
  return (
    <svg className={ICON} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  );
}

function ExpandIcon() {
  return (
    <svg className={ICON} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 3H3v5" />
      <path d="M21 8V3h-5" />
      <path d="M16 21h5v-5" />
      <path d="M3 16v5h5" />
    </svg>
  );
}

function CompressIcon() {
  return (
    <svg className={ICON} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 9h5V4" />
      <path d="M20 9h-5V4" />
      <path d="M15 20v-5h5" />
      <path d="M4 15h5v5" />
    </svg>
  );
}

function HelpIcon() {
  return (
    <svg className={ICON} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9a2.5 2.5 0 0 1 4.5 1.5c0 1.5-2 2-2 3" />
      <path d="M12 17h.01" />
    </svg>
  );
}

const SHORTCUTS: { keys: string; label: string }[] = [
  { keys: "Ctrl + Z", label: "Hoàn tác" },
  { keys: "Ctrl + Shift + Z", label: "Làm lại" },
  { keys: "Ctrl + C / V", label: "Sao chép / Dán" },
  { keys: "Ctrl + D", label: "Nhân bản" },
  { keys: "Ctrl + A", label: "Chọn tất cả" },
  { keys: "Ctrl + G / Shift + G", label: "Nhóm / Bỏ nhóm" },
  { keys: "Ctrl + L", label: "Khóa / Mở khóa" },
  { keys: "Delete", label: "Xóa" },
  { keys: "← ↑ → ↓", label: "Di chuyển 1px (Shift: 10px)" },
  { keys: "[ / ]", label: "Đưa xuống / lên một lớp" },
  { keys: "Esc", label: "Bỏ chọn" },
];

// Overview toàn bộ slide dạng lưới; click để nhảy tới slide, Esc/nền để đóng.
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
    <div
      className="fixed inset-0 z-[200] flex flex-col bg-black/55 backdrop-blur-[2px]"
      onMouseDown={onClose}
    >
      <div className="flex items-center justify-between px-6 py-4 text-white">
        <span className="text-[13px] font-medium">
          Tất cả slide ({slides.length})
        </span>
        <button
          onClick={onClose}
          className="rounded-md px-3 py-1 text-[13px] text-white/90 hover:bg-white/15"
        >
          Đóng
        </button>
      </div>
      <div
        className="flex flex-wrap content-start justify-center gap-5 overflow-auto px-6 pb-8"
        onMouseDown={(e) => e.stopPropagation()}
      >
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
              className={`overflow-hidden rounded-lg bg-white transition ${
                slide.id === currentSlideId
                  ? "ring-2 ring-white"
                  : "ring-1 ring-white/20 group-hover:ring-white/60"
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
            <span className="pl-0.5 text-[11px] leading-none text-white/70">
              {i + 1}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function BottomBar({
  zoomMode,
  onZoomModeChange,
  currentScale,
  showTray,
  onToggleTray,
}: {
  zoomMode: "fit" | number;
  onZoomModeChange: (zoom: "fit" | number) => void;
  currentScale: number;
  showTray: boolean;
  onToggleTray: () => void;
}) {
  const slides = useEditorStore((s) => s.slides);
  const currentSlideId = useEditorStore((s) => s.currentSlideId);
  const current = slides.findIndex((s) => s.id === currentSlideId) + 1;

  const [showGrid, setShowGrid] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const helpRef = useRef<HTMLDivElement>(null);

  // Đồng bộ trạng thái fullscreen với trình duyệt (kể cả khi thoát bằng Esc).
  useEffect(() => {
    const onChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  // Đóng popover trợ giúp khi click ra ngoài.
  useEffect(() => {
    if (!showHelp) return;
    const handler = (e: MouseEvent) => {
      if (helpRef.current && !helpRef.current.contains(e.target as Node)) {
        setShowHelp(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showHelp]);

  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      document.documentElement.requestFullscreen?.();
    }
  };

  const sliderValue = Math.min(Math.max(currentScale, ZOOM_MIN), ZOOM_MAX);
  const zoomPercent = Math.round(currentScale * 100);

  const iconBtn =
    "flex size-8 items-center justify-center rounded-lg text-[#5f6368] hover:bg-black/5";
  const iconBtnActive =
    "flex size-8 items-center justify-center rounded-lg bg-[#e8eaed] text-[#1f1f1f]";

  return (
    <footer className="flex h-[52px] shrink-0 items-center justify-end gap-2 border-t border-black/10 bg-white px-3">
      {/* zoom: slider + % (click % để Fit) */}
      <div className="hidden items-center gap-2 pr-1 sm:flex">
        <input
          type="range"
          min={ZOOM_MIN}
          max={ZOOM_MAX}
          step={0.01}
          value={sliderValue}
          onChange={(e) => onZoomModeChange(Number(e.target.value))}
          aria-label="Mức phóng to"
          className="h-1 w-28 cursor-pointer accent-[#5f6368]"
        />
        <button
          onClick={() => onZoomModeChange("fit")}
          title="Vừa màn hình"
          className="w-12 rounded-md px-1 py-0.5 text-right text-[13px] tabular-nums text-[#5f6368] hover:bg-black/5"
        >
          {zoomMode === "fit" ? "Fit" : `${zoomPercent}%`}
        </button>
      </div>

      <button
        onClick={onToggleTray}
        title="Hiện/ẩn dải slide"
        className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-[13px] font-medium ${
          showTray
            ? "bg-[#e8eaed] text-[#1f1f1f]"
            : "text-[#5f6368] hover:bg-black/5"
        }`}
      >
        <GridIcon />
        Pages
      </button>

      <span className="px-1 text-[13px] tabular-nums text-[#5f6368]">
        {current} / {slides.length}
      </span>

      <button
        onClick={() => setShowGrid(true)}
        className={iconBtn}
        aria-label="Xem lưới tất cả slide"
        title="Xem lưới tất cả slide"
      >
        <GridIcon />
      </button>
      <button
        onClick={toggleFullscreen}
        className={isFullscreen ? iconBtnActive : iconBtn}
        aria-label="Toàn màn hình"
        title={isFullscreen ? "Thoát toàn màn hình" : "Toàn màn hình"}
      >
        {isFullscreen ? <CompressIcon /> : <ExpandIcon />}
      </button>

      <div ref={helpRef} className="relative">
        <button
          onClick={() => setShowHelp((v) => !v)}
          className={showHelp ? iconBtnActive : iconBtn}
          aria-label="Phím tắt"
          title="Phím tắt"
        >
          <HelpIcon />
        </button>
        {showHelp && (
          <div className="absolute bottom-full right-0 z-50 mb-2 w-64 overflow-hidden rounded-[10px] border border-black/10 bg-white py-2 shadow-[0_8px_30px_rgba(0,0,0,0.14)]">
            <div className="px-3 pb-1.5 text-[12px] font-semibold text-[#1f1f1f]">
              Phím tắt
            </div>
            {SHORTCUTS.map((s) => (
              <div
                key={s.keys}
                className="flex items-center justify-between gap-3 px-3 py-1 text-[12px]"
              >
                <span className="text-[#5f6368]">{s.label}</span>
                <kbd className="rounded bg-[#f1f3f4] px-1.5 py-0.5 font-mono text-[11px] text-[#3c4043]">
                  {s.keys}
                </kbd>
              </div>
            ))}
          </div>
        )}
      </div>

      {showGrid && <GridOverview onClose={() => setShowGrid(false)} />}
    </footer>
  );
}
