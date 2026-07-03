"use client";

// Dải thumbnail trên nền canvas. Click thumbnail để chuyển slide.
// Hover hiện nút nhân bản / xóa; nút "+" ở cuối để thêm slide.
// Kéo-thả thumbnail để sắp xếp lại thứ tự slide.

import { Fragment, useState } from "react";
import { useEditorStore } from "@/stores/slide-editor-store";
import { CANVAS_W, CANVAS_H, isSlideLockedForGeneration, type Slide } from "./types";
import { ElementView } from "./ElementView";

const THUMB_W = 112;
const THUMB_SCALE = THUMB_W / CANVAS_W;
const THUMB_H = CANVAS_H * THUMB_SCALE;

function Thumbnail({
  slide,
  index,
  active,
  canDelete,
  structureLocked,
  dragging,
  dropBefore,
  dropAfter,
  onClick,
  onDuplicate,
  onDelete,
  onDragStart,
  onDragOver,
  onDragEnd,
  onDrop,
}: {
  slide: Slide;
  index: number;
  active: boolean;
  canDelete: boolean;
  structureLocked: boolean;
  dragging: boolean;
  dropBefore: boolean;
  dropAfter: boolean;
  onClick: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onDragStart: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragEnd: () => void;
  onDrop: () => void;
}) {
  const locked = isSlideLockedForGeneration(slide);
  const actionsDisabled = locked || structureLocked;

  return (
    <div
      draggable={!actionsDisabled}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      onDrop={(e) => {
        e.preventDefault();
        onDrop();
      }}
      className={`group relative flex shrink-0 flex-col items-start gap-1.5 ${
        dragging ? "opacity-40" : ""
      }`}
    >
      {dropBefore && (
        <span className="pointer-events-none absolute -left-2 top-0 w-0.5 rounded bg-[#d97757]" style={{ height: THUMB_H }} />
      )}
      {dropAfter && (
        <span className="pointer-events-none absolute -right-2 top-0 w-0.5 rounded bg-[#d97757]" style={{ height: THUMB_H }} />
      )}
      <button
        onClick={onClick}
        style={{ width: THUMB_W, height: THUMB_H }}
        className={`overflow-hidden rounded-[8px] bg-white transition ${
          active
            ? "shadow-[0_4px_14px_rgba(43,41,38,0.13)] ring-2 ring-[#d97757]"
            : "shadow-[0_1px_3px_rgba(43,41,38,0.08)] ring-1 ring-[#e8e2d9] group-hover:ring-[#d8d1c9]"
        }`}
      >
        <div
          style={{
            width: CANVAS_W,
            height: CANVAS_H,
            transform: `scale(${THUMB_SCALE})`,
            transformOrigin: "top left",
            background: slide.bg,
          }}
          className="relative"
        >
          {slide.elements.map((el) => (
            <ElementView key={el.id} el={el} />
          ))}
          {locked && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/45">
              <span className="size-6 animate-spin rounded-full border-[3px] border-[#d97757] border-t-transparent" />
            </div>
          )}
          {slide.generationStatus === "failed" && (
            <div className="absolute right-1 top-1 rounded bg-red-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
              !
            </div>
          )}
        </div>
      </button>

      <div className="pointer-events-none absolute right-1 top-1 flex gap-1 opacity-0 transition group-hover:opacity-100">
        <button
          onClick={onDuplicate}
          disabled={actionsDisabled}
          title="Nhân bản slide"
          className="pointer-events-auto flex h-5 w-5 items-center justify-center rounded bg-white/90 text-[11px] text-[#4f4943] shadow ring-1 ring-[#d8d1c9] hover:bg-white disabled:pointer-events-none disabled:opacity-30"
        >
          ⧉
        </button>
        <button
          onClick={onDelete}
          disabled={!canDelete || actionsDisabled}
          title="Xóa slide"
          className="pointer-events-auto flex h-5 w-5 items-center justify-center rounded bg-white/90 text-[11px] text-[#b42318] shadow ring-1 ring-[#d8d1c9] hover:bg-white disabled:opacity-30"
        >
          ×
        </button>
      </div>

      <span
        className={`pl-0.5 text-[11px] leading-none ${
          active ? "font-semibold text-[#2b2926]" : "text-[#b8aea5]"
        }`}
      >
        {index + 1}
      </span>
    </div>
  );
}

// Khe giữa 2 thumbnail: hover hiện vạch dọc + nút "+" để chèn slide trống vào giữa.
function InsertGap({ disabled = false, onInsert }: { disabled?: boolean; onInsert: () => void }) {
  return (
    <div
      onClick={() => {
        if (!disabled) onInsert();
      }}
      title="Chèn slide trống vào đây"
      style={{ width: 26, height: THUMB_H }}
      className={`group/insert relative flex shrink-0 items-center justify-center self-start ${
        disabled ? "cursor-not-allowed opacity-40" : "cursor-pointer"
      }`}
    >
      <span className="pointer-events-none absolute inset-y-1.5 left-1/2 w-0.5 -translate-x-1/2 rounded bg-[#d97757] opacity-0 transition group-hover/insert:opacity-100" />
      <span className="relative flex h-5 w-5 items-center justify-center rounded-full bg-[#d97757] text-sm leading-none text-white opacity-0 shadow transition group-hover/insert:opacity-100">
        +
      </span>
    </div>
  );
}

export function SlideTray() {
  const slides = useEditorStore((s) => s.slides);
  const currentSlideId = useEditorStore((s) => s.currentSlideId);
  const setCurrentSlide = useEditorStore((s) => s.setCurrentSlide);
  const addBlankSlide = useEditorStore((s) => s.addBlankSlide);
  const duplicateSlide = useEditorStore((s) => s.duplicateSlide);
  const deleteSlide = useEditorStore((s) => s.deleteSlide);
  const reorderSlides = useEditorStore((s) => s.reorderSlides);
  const hasLockedSlides = slides.some(isSlideLockedForGeneration);

  // dragIndex: thumbnail đang kéo; overIndex + after: vị trí sẽ thả vào.
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const [after, setAfter] = useState(false);

  const resetDrag = () => {
    setDragIndex(null);
    setOverIndex(null);
    setAfter(false);
  };

  const handleDrop = () => {
    if (hasLockedSlides) return resetDrag();
    if (dragIndex === null || overIndex === null) return resetDrag();
    // Vị trí chèn trong mảng gốc, trước khi gỡ phần tử đang kéo.
    let target = after ? overIndex + 1 : overIndex;
    if (target > dragIndex) target -= 1;
    if (target !== dragIndex) reorderSlides(dragIndex, target);
    resetDrag();
  };

  return (
    <div className="scrollbar-none flex h-[116px] shrink-0 items-end overflow-x-auto border-t border-[#e8e2d9] bg-white/84 px-5 pb-3 pt-2">
      {slides.map((slide, i) => {
        const showIndicator = dragIndex !== null && overIndex === i;
        return (
          <Fragment key={slide.id}>
            <Thumbnail
              slide={slide}
              index={i}
              active={slide.id === currentSlideId}
              canDelete={slides.length > 1}
              structureLocked={hasLockedSlides}
              dragging={dragIndex === i}
              dropBefore={showIndicator && !after}
              dropAfter={showIndicator && after}
              onClick={() => setCurrentSlide(slide.id)}
              onDuplicate={() => duplicateSlide(slide.id)}
              onDelete={() => deleteSlide(slide.id)}
              onDragStart={() => {
                if (hasLockedSlides || isSlideLockedForGeneration(slide)) return;
                setDragIndex(i);
              }}
              onDragOver={(e) => {
                if (hasLockedSlides) return;
                e.preventDefault();
                if (dragIndex === null) return;
                const rect = e.currentTarget.getBoundingClientRect();
                const isAfter = e.clientX > rect.left + rect.width / 2;
                if (overIndex !== i) setOverIndex(i);
                if (after !== isAfter) setAfter(isAfter);
              }}
              onDragEnd={resetDrag}
              onDrop={handleDrop}
            />
            {i < slides.length - 1 && (
              <InsertGap disabled={hasLockedSlides} onInsert={() => addBlankSlide(slide.id)} />
            )}
          </Fragment>
        );
      })}

      <button
        onClick={() => addBlankSlide(currentSlideId)}
        disabled={hasLockedSlides}
        title="Thêm slide"
        style={{ height: THUMB_H }}
        className="ml-3 flex w-9 shrink-0 items-center justify-center self-start rounded-[8px] bg-white text-xl text-[#b8aea5] ring-1 ring-[#e8e2d9] transition hover:text-[#2b2926] hover:ring-[#d8d1c9] disabled:pointer-events-none disabled:opacity-40"
      >
        +
      </button>
    </div>
  );
}
