"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { ElementView } from "@/components/slide-editor/ElementView";
import { CANVAS_H, CANVAS_W, type Slide } from "@/components/slide-editor/types";
import { ElementDetailPanel } from "@/components/periodic-table/element-detail-panel";
import type { Element as PeriodicElement } from "@/components/periodic-table/types";

type SlidePresentationOverlayProps = {
  slides: Slide[];
  onExit: () => void;
};

/**
 * Lớp phủ trình chiếu: chiếm trọn màn hình, không có thanh điều khiển.
 * Vào fullscreen ngay khi mount và chỉ thoát bằng phím Esc (hoặc khi rời fullscreen).
 */
export function SlidePresentationOverlay({ slides, onExit }: SlidePresentationOverlayProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [scale, setScale] = useState(1);
  const [selectedElement, setSelectedElement] = useState<PeriodicElement | null>(null);

  // Giữ callback thoát trong ref để các effect fullscreen chỉ chạy một lần khi mount.
  const exitRef = useRef(onExit);
  useEffect(() => {
    exitRef.current = onExit;
  }, [onExit]);

  const goTo = useCallback((index: number) => {
    setSelectedElement(null);
    setActiveIndex(() => Math.max(0, Math.min(index, Math.max(0, slides.length - 1))));
  }, [slides.length]);
  const previous = useCallback(() => goTo(activeIndex - 1), [activeIndex, goTo]);
  const next = useCallback(() => goTo(activeIndex + 1), [activeIndex, goTo]);

  // Vào fullscreen ngay lập tức; nếu trình duyệt từ chối (mở thẳng bằng URL, không có
  // thao tác người dùng) thì thử lại ở lần tương tác đầu tiên.
  useEffect(() => {
    let entered = Boolean(document.fullscreenElement);

    const enterFullscreen = () => {
      if (document.fullscreenElement) {
        entered = true;
        return;
      }
      const request = document.documentElement.requestFullscreen?.();
      if (request) request.then(() => { entered = true; }).catch(() => {});
    };

    const retry = (event: Event) => {
      if (event instanceof KeyboardEvent && event.key === "Escape") return;
      if (!document.fullscreenElement) enterFullscreen();
    };

    // Rời fullscreen (Esc do trình duyệt xử lý) đồng nghĩa với kết thúc trình chiếu.
    const onFullscreenChange = () => {
      if (entered && !document.fullscreenElement) exitRef.current();
    };

    enterFullscreen();
    window.addEventListener("pointerdown", retry, true);
    window.addEventListener("keydown", retry, true);
    document.addEventListener("fullscreenchange", onFullscreenChange);

    return () => {
      window.removeEventListener("pointerdown", retry, true);
      window.removeEventListener("keydown", retry, true);
      document.removeEventListener("fullscreenchange", onFullscreenChange);
      if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
    };
  }, []);

  // Khóa cuộn trang bên dưới trong lúc trình chiếu.
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previousOverflow; };
  }, []);

  // Lăn chuột trên vùng slide: xuống → slide tiếp, lên → slide trước.
  // Dùng native listener (non-passive) để chắc chắn bắt được wheel event.
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const onWheel = (e: WheelEvent) => {
      if (selectedElement) return;
      e.preventDefault();
      if (e.deltaY > 0) next();
      else if (e.deltaY < 0) previous();
    };
    stage.addEventListener("wheel", onWheel, { passive: false });
    return () => stage.removeEventListener("wheel", onWheel);
  }, [next, previous, selectedElement]);

  // Bắt phím ở pha capture và chặn lan truyền: khi lớp phủ mở trên trình soạn thảo,
  // các phím tắt của editor (mũi tên, Delete, Escape...) không được chạy theo.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        if (selectedElement) {
          setSelectedElement(null);
          return;
        }
        exitRef.current();
        return;
      }
      if (["ArrowRight", "ArrowDown", "PageDown", " ", "Enter"].includes(event.key)) {
        event.preventDefault();
        event.stopPropagation();
        next();
        return;
      }
      if (["ArrowLeft", "ArrowUp", "PageUp", "Backspace"].includes(event.key)) {
        event.preventDefault();
        event.stopPropagation();
        previous();
      }
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [next, previous, selectedElement]);

  useLayoutEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const resize = () => setScale(Math.min(stage.clientWidth / CANVAS_W, stage.clientHeight / CANVAS_H));
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(stage);
    return () => observer.disconnect();
  }, []);

  const current = slides[activeIndex];

  return (
    <div
      ref={stageRef}
      role="dialog"
      aria-modal="true"
      aria-label="Trình chiếu slide"
      className="fixed inset-0 z-[999] overflow-hidden bg-[#171513] text-white"
    >
      {current ? (
        <div
          className="absolute left-1/2 top-1/2"
          style={{ width: CANVAS_W, height: CANVAS_H, transform: `translate(-50%, -50%) scale(${scale})`, transformOrigin: "center" }}
        >
          <div className="relative overflow-hidden" style={{ width: CANVAS_W, height: CANVAS_H, background: current.bg }}>
            {current.elements.map((element) => (
              <ElementView
                key={element.id}
                el={element}
                interactive
                onSelectPeriodicElement={setSelectedElement}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="grid h-full place-items-center text-sm text-white/60">Đang tải bộ slide...</div>
      )}
      <ElementDetailPanel element={selectedElement} onClose={() => setSelectedElement(null)} />
    </div>
  );
}
