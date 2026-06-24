"use client";

// Dải thumbnail trên nền canvas. Click thumbnail để chuyển slide.

import { useEditorStore } from "@/stores/slide-editor-store";
import { CANVAS_W, CANVAS_H, type Slide } from "./types";
import { ElementView } from "./ElementView";

const THUMB_W = 132;
const THUMB_SCALE = THUMB_W / CANVAS_W;
const THUMB_H = CANVAS_H * THUMB_SCALE;

function Thumbnail({
  slide,
  index,
  active,
  onClick,
}: {
  slide: Slide;
  index: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group flex shrink-0 flex-col items-start gap-1.5"
    >
      <div
        style={{ width: THUMB_W, height: THUMB_H }}
        className={`overflow-hidden rounded-lg bg-white transition ${
          active
            ? "shadow-[0_6px_16px_rgba(15,23,42,0.18)] ring-2 ring-[#3c4043]"
            : "shadow-[0_1px_3px_rgba(15,23,42,0.12)] ring-1 ring-black/5 group-hover:ring-black/15"
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
        </div>
      </div>
      <span
        className={`pl-0.5 text-[11px] leading-none ${
          active ? "font-semibold text-[#1f1f1f]" : "text-[#9aa0a6]"
        }`}
      >
        {index + 1}
      </span>
    </button>
  );
}

export function SlideTray() {
  const slides = useEditorStore((s) => s.slides);
  const currentSlideId = useEditorStore((s) => s.currentSlideId);
  const setCurrentSlide = useEditorStore((s) => s.setCurrentSlide);

  return (
    <div className="flex shrink-0 items-end gap-3 overflow-x-auto bg-[#edeff2] px-5 pb-4 pt-1">
      {slides.map((slide, i) => (
        <Thumbnail
          key={slide.id}
          slide={slide}
          index={i}
          active={slide.id === currentSlideId}
          onClick={() => setCurrentSlide(slide.id)}
        />
      ))}
    </div>
  );
}
