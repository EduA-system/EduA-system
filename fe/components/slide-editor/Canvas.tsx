"use client";

// Khung canvas đúng 960×540, co giãn (contain) theo vùng hiển thị.
// Đọc store qua selector hẹp; render read-only ở Bước 1 (không bắt chuột).

import { useLayoutEffect, useRef, useState } from "react";
import { useEditorStore } from "@/stores/slide-editor-store";
import { CANVAS_W, CANVAS_H } from "./types";
import { ElementView } from "./ElementView";

const PADDING = 40; // khoảng đệm quanh canvas trong vùng hiển thị

export function Canvas() {
  const slide = useEditorStore((s) => s.currentSlide());

  const areaRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    const area = areaRef.current;
    if (!area) return;

    const fit = () => {
      const aw = area.clientWidth - PADDING * 2;
      const ah = area.clientHeight - PADDING * 2;
      setScale(Math.min(aw / CANVAS_W, ah / CANVAS_H, 1));
    };

    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(area);
    return () => ro.disconnect();
  }, []);

  return (
    <div
      ref={areaRef}
      className="flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-[#edeff2]"
    >
      <div
        style={{
          width: CANVAS_W * scale,
          height: CANVAS_H * scale,
        }}
        className="shrink-0 overflow-hidden rounded-[6px] shadow-[0_10px_34px_rgba(15,23,42,0.14)]"
      >
        <div
          style={{
            width: CANVAS_W,
            height: CANVAS_H,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
            background: slide?.bg ?? "#ffffff",
          }}
          className="relative"
        >
          {slide?.elements.map((el) => (
            <ElementView key={el.id} el={el} />
          ))}
        </div>
      </div>
    </div>
  );
}
