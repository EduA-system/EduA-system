"use client";

// Bảng Layers: list element theo zIndex (cao → thấp), click chọn, ẩn/hiện, khóa.
// Đọc store trực tiếp (như ContextualToolbar).

import type { ReactElement } from "react";
import { useEditorStore } from "@/stores/slide-editor-store";
import type { SlideElement } from "./types";

const TYPE_ICONS: Record<string, ReactElement> = {
  text: (
    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 7V4h16v3M9 20h6M12 4v16" />
    </svg>
  ),
  shape: (
    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
    </svg>
  ),
  poly: (
    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l9 6v6l-9 6-9-6V9z" />
    </svg>
  ),
  image: (
    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" />
    </svg>
  ),
  line: (
    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M4 20L20 4" />
    </svg>
  ),
  arrow: (
    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  ),
  draw: (
    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 21c3-1 5-3 8-8M14 5l5 5M12 7l5 5-9 4z" />
    </svg>
  ),
};

function EyeIcon({ hidden }: { hidden?: boolean }) {
  return hidden ? (
    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24M1 1l22 22" />
    </svg>
  ) : (
    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function LockIcon({ locked }: { locked?: boolean }) {
  return locked ? (
    <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0110 0v4" />
    </svg>
  ) : (
    <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 019.9-1" />
    </svg>
  );
}

function elemLabel(el: SlideElement): string {
  if (el.type === "text") return el.text.slice(0, 22) || "Text trống";
  if (el.type === "image") return el.src ? "Ảnh" : "Ảnh (chưa có)";
  if (el.type === "poly") return "Hình";
  if (el.type === "draw") return "Nét vẽ";
  if (el.type === "shape") return el.shape === "ellipse" ? "Hình elip" : "Hình chữ nhật";
  if (el.type === "line") return "Đường kẻ";
  if (el.type === "arrow") return "Mũi tên";
  return el.type;
}

export function LayersPanel() {
  const slide = useEditorStore((s) => s.slides.find((sl) => sl.id === s.currentSlideId));
  const selectedIds = useEditorStore((s) => s.selectedIds);
  const select = useEditorStore((s) => s.select);
  const updateElement = useEditorStore((s) => s.updateElement);

  const elements = slide?.elements ?? [];
  const sorted = [...elements].sort((a, b) => b.zIndex - a.zIndex);

  return (
    <div className="flex w-[200px] shrink-0 flex-col border-l border-black/10 bg-white">
      <div className="flex h-[40px] shrink-0 items-center border-b border-black/10 px-3">
        <svg className="mr-2 h-[15px] w-[15px] shrink-0 text-[#777]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
        </svg>
        <span className="text-[12px] font-semibold text-[#1f1f1f]">Layers</span>
        <span className="ml-auto rounded-full bg-black/5 px-1.5 py-0.5 text-[10px] font-medium text-[#777] tabular-nums">
          {elements.length}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto">
        {sorted.length === 0 && (
          <div className="px-3 py-8 text-center text-[10px] text-[#999]">Chưa có layer nào</div>
        )}
        {sorted.map((el) => {
          const isSelected = selectedIds.includes(el.id);
          return (
            <div
              key={el.id}
              onClick={() => select([el.id])}
              className={`group flex cursor-pointer items-center gap-2 border-l-2 px-2.5 py-[7px] transition-colors ${
                isSelected ? "border-[#3b82f6] bg-[#eff6ff]" : "border-transparent hover:bg-black/5"
              } ${el.hidden ? "opacity-40" : ""}`}
            >
              <span className={`shrink-0 ${isSelected ? "text-[#3b82f6]" : "text-[#999]"}`}>
                {TYPE_ICONS[el.type] ?? TYPE_ICONS.shape}
              </span>
              <span
                className={`flex-1 truncate text-[11px] ${isSelected ? "font-medium text-[#1d4ed8]" : "text-[#5f6368]"}`}
                title={elemLabel(el)}
              >
                {elemLabel(el)}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  updateElement(el.id, { hidden: !el.hidden });
                }}
                title={el.hidden ? "Hiện" : "Ẩn"}
                className={`shrink-0 rounded p-0.5 transition-colors hover:text-[#3b82f6] ${
                  el.hidden ? "text-[#777]" : "text-[#bbb] opacity-0 group-hover:opacity-100"
                }`}
              >
                <EyeIcon hidden={el.hidden} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  updateElement(el.id, { locked: !el.locked });
                }}
                title={el.locked ? "Mở khóa" : "Khóa"}
                className={`shrink-0 rounded p-0.5 transition-colors hover:text-[#3b82f6] ${
                  el.locked ? "text-[#555]" : "text-[#bbb] opacity-0 group-hover:opacity-100"
                }`}
              >
                <LockIcon locked={el.locked} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
