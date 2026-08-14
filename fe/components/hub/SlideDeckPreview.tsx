"use client";

// Xem trước cả bộ slide (lưới thumbnail + trình chiếu toàn màn hình) cho các
// màn hình chỉ đọc payload thư viện: kiểm duyệt Hub và trang chi tiết Hub.

import { useState } from "react";
import { Maximize2, Presentation } from "lucide-react";
import { ElementView } from "@/components/slide-editor/ElementView";
import { CANVAS_H, CANVAS_W, type Slide } from "@/components/slide-editor/types";
import { SlidePresentationOverlay } from "@/components/slide-presentation/SlidePresentationOverlay";

const THUMB_W = 216;
const THUMB_SCALE = THUMB_W / CANVAS_W;
const THUMB_H = CANVAS_H * THUMB_SCALE;

export function SlideDeckPreview({ slides, caption }: { slides: Slide[]; caption: string }) {
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  return (
    <div className="rounded-xl border border-[#e8e2d9] bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[#30343d]">Bộ slide</p>
          <p className="text-xs text-stone-500">{caption}</p>
        </div>
        <button
          type="button"
          onClick={() => setViewerIndex(0)}
          className="inline-flex items-center gap-2 rounded-xl border border-stone-200 px-3 py-2 text-sm font-semibold text-[#30343d] transition hover:bg-stone-50"
        >
          <Presentation className="size-4 text-rose-700" />
          Trình chiếu
        </button>
      </div>

      <div className="mt-4 flex max-h-[62vh] flex-wrap gap-3 overflow-y-auto pr-1">
        {slides.map((slide, index) => (
          <button
            key={slide.id}
            type="button"
            onClick={() => setViewerIndex(index)}
            title={`Slide ${index + 1}`}
            style={{ width: THUMB_W, height: THUMB_H }}
            className="group relative shrink-0 overflow-hidden rounded-lg bg-white ring-1 ring-[#e8e2d9] transition hover:ring-2 hover:ring-[#e8724a]"
          >
            <div
              className="relative"
              style={{
                width: CANVAS_W,
                height: CANVAS_H,
                transform: `scale(${THUMB_SCALE})`,
                transformOrigin: "top left",
                background: slide.bg,
              }}
            >
              {slide.elements.map((element) => (
                <ElementView key={element.id} el={element} />
              ))}
            </div>
            <span className="pointer-events-none absolute bottom-1 left-1 flex h-4 min-w-4 items-center justify-center rounded-[4px] bg-white/85 px-1 text-[10px] font-medium leading-none text-[#4f4943] ring-1 ring-[#e8e2d9]">
              {index + 1}
            </span>
            <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-[#2b2926]/35 text-white opacity-0 transition group-hover:opacity-100">
              <Maximize2 className="size-5" />
            </span>
          </button>
        ))}
      </div>

      {viewerIndex !== null && (
        <SlidePresentationOverlay slides={slides} initialIndex={viewerIndex} onExit={() => setViewerIndex(null)} />
      )}
    </div>
  );
}
