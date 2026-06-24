"use client";

// Thanh dưới của editor (kiểu Canva). Bước 1: chỉ số trang là thật (đọc store);
// các control còn lại để dạng chrome tĩnh, chừa chỗ cho bước sau.

import { useEditorStore } from "@/stores/slide-editor-store";

const ICON = "size-[18px] shrink-0";

function PencilIcon() {
  return (
    <svg className={ICON} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg className={ICON} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

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

function HelpIcon() {
  return (
    <svg className={ICON} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9a2.5 2.5 0 0 1 4.5 1.5c0 1.5-2 2-2 3" />
      <path d="M12 17h.01" />
    </svg>
  );
}

export function BottomBar() {
  const slides = useEditorStore((s) => s.slides);
  const currentSlideId = useEditorStore((s) => s.currentSlideId);
  const current = slides.findIndex((s) => s.id === currentSlideId) + 1;

  const leftBtn =
    "flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[13px] font-medium text-[#5f6368] hover:bg-black/5";
  const iconBtn =
    "flex size-8 items-center justify-center rounded-lg text-[#5f6368] hover:bg-black/5";

  return (
    <footer className="flex h-[52px] shrink-0 items-center justify-between border-t border-black/10 bg-white px-3">
      {/* trái: Notes / Timer */}
      <div className="flex items-center gap-1">
        <button className={leftBtn}>
          <PencilIcon />
          Notes
        </button>
        <button className={leftBtn}>
          <ClockIcon />
          Timer
        </button>
      </div>

      {/* phải: zoom · Pages · số trang · view */}
      <div className="flex items-center gap-2">
        <div className="hidden items-center gap-2 pr-1 sm:flex">
          <div className="relative h-1 w-24 rounded-full bg-[#dadce0]">
            <div className="absolute left-0 top-0 h-1 w-1/2 rounded-full bg-[#9aa0a6]" />
            <div className="absolute -top-[5px] left-1/2 size-[14px] -translate-x-1/2 rounded-full bg-white shadow ring-1 ring-black/15" />
          </div>
          <span className="w-10 text-right text-[13px] tabular-nums text-[#5f6368]">
            100%
          </span>
        </div>

        <button className="flex items-center gap-2 rounded-lg bg-[#e8eaed] px-3 py-1.5 text-[13px] font-medium text-[#1f1f1f]">
          <GridIcon />
          Pages
        </button>

        <span className="px-1 text-[13px] tabular-nums text-[#5f6368]">
          {current} / {slides.length}
        </span>

        <button className={iconBtn} aria-label="Lưới slide">
          <GridIcon />
        </button>
        <button className={iconBtn} aria-label="Toàn màn hình">
          <ExpandIcon />
        </button>
        <button className={iconBtn} aria-label="Trợ giúp">
          <HelpIcon />
        </button>
      </div>
    </footer>
  );
}
