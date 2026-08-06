"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ElementView } from "@/components/slide-editor/ElementView";
import { CANVAS_H, CANVAS_W, type Slide } from "@/components/slide-editor/types";
import { loadSlides } from "@/components/slide-editor/lib/storage";
import { useAuth } from "@/lib/auth/AuthContext";
import { getLibraryContent } from "@/lib/library";
import { getClassResourceLibraryContent } from "@/lib/classroom";
import { parseSlideDeck } from "@/lib/slide-deck-library";

function Chevron({ direction, className = "size-5" }: { direction: "left" | "right"; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      {direction === "left" ? <path d="m15 18-6-6 6-6" /> : <path d="m9 18 6-6-6-6" />}
    </svg>
  );
}

function FullscreenIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="size-4">
      <path d="M8 3H3v5M16 3h5v5M3 16v5h5M21 16v5h-5" />
    </svg>
  );
}

function SlideSurface({ slide, interactive }: { slide: Slide; interactive?: boolean }) {
  return (
    <div className="relative overflow-hidden" style={{ width: CANVAS_W, height: CANVAS_H, background: slide.bg }}>
      {slide.elements.map((element) => <ElementView key={element.id} el={element} interactive={interactive} />)}
    </div>
  );
}

export function SlidePresentationClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { authFetch } = useAuth();
  const libraryId = searchParams.get("libraryId");
  const classId = searchParams.get("classId");
  const resourceId = searchParams.get("resourceId");
  const stageRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const [slides, setSlides] = useState<Slide[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [scale, setScale] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const loadDeck = async () => {
      await Promise.resolve();
      if (cancelled) return;
      setActiveIndex(0);
      setError(null);

      if (!libraryId && (!classId || !resourceId)) {
        const localSlides = loadSlides();
        if (!localSlides) setError("Không tìm thấy bộ slide để trình chiếu. Hãy mở bộ slide từ thư viện hoặc trình soạn thảo.");
        else setSlides(localSlides);
        return;
      }

      try {
        const content = classId && resourceId
          ? await getClassResourceLibraryContent(authFetch, classId, resourceId)
          : await getLibraryContent(authFetch, libraryId!);
        if (cancelled) return;
        if (content.type !== "SLIDE_DECK") throw new Error("Nội dung này không phải là bộ slide.");
        const deck = parseSlideDeck(content.payload);
        if (!deck) throw new Error("Bộ slide đã lưu có định dạng không hợp lệ.");
        setSlides(deck);
      } catch (reason: unknown) {
        if (!cancelled) setError(reason instanceof Error ? reason.message : "Không thể mở bộ slide.");
      }
    };

    void loadDeck();

    return () => { cancelled = true; };
  }, [authFetch, classId, libraryId, resourceId]);

  const goTo = useCallback((index: number) => {
    setActiveIndex(() => Math.max(0, Math.min(index, Math.max(0, slides.length - 1))));
  }, [slides.length]);
  const previous = useCallback(() => goTo(activeIndex - 1), [activeIndex, goTo]);
  const next = useCallback(() => goTo(activeIndex + 1), [activeIndex, goTo]);

  // Lăn chuột trên vùng slide: xuống → slide tiếp, lên → slide trước.
  // Dùng native listener (non-passive) để chắc chắn bắt được wheel event.
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (e.deltaY > 0) next();
      else if (e.deltaY < 0) previous();
    };
    stage.addEventListener("wheel", onWheel, { passive: false });
    return () => stage.removeEventListener("wheel", onWheel);
  }, [next, previous]);

  // Lăn chuột trên timeline: cuộn ngang danh sách thumbnail.
  useEffect(() => {
    const timeline = timelineRef.current;
    if (!timeline) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      timeline.scrollLeft += e.deltaY + e.deltaX;
    };
    timeline.addEventListener("wheel", onWheel, { passive: false });
    return () => timeline.removeEventListener("wheel", onWheel);
  }, []);

  // Tự cuộn timeline để slide đang trình chiếu luôn nằm trong tầm nhìn.
  useEffect(() => {
    const timeline = timelineRef.current;
    if (!timeline) return;
    const thumb = timeline.querySelector<HTMLElement>(`[data-slide-idx="${activeIndex}"]`);
    thumb?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }, [activeIndex]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        router.back();
        return;
      }
      if (["ArrowRight", "ArrowDown", "PageDown", " ", "Enter"].includes(event.key)) {
        event.preventDefault();
        next();
      }
      if (["ArrowLeft", "ArrowUp", "PageUp", "Backspace"].includes(event.key)) {
        event.preventDefault();
        previous();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [next, previous, router]);

  useLayoutEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const resize = () => setScale(Math.min(stage.clientWidth / CANVAS_W, stage.clientHeight / CANVAS_H));
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(stage);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const onChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const toggleFullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void document.documentElement.requestFullscreen?.();
  };

  const current = slides[activeIndex];
  if (error) {
    return <main className="grid min-h-screen place-items-center bg-[#171513] p-6 text-center text-white"><div><p className="text-lg font-semibold">Không thể trình chiếu</p><p className="mt-2 text-sm text-white/65">{error}</p><button onClick={() => router.back()} className="mt-6 rounded-lg bg-white px-4 py-2 text-sm font-medium text-[#2b2926]">Quay lại</button></div></main>;
  }

  return (
    <main className="flex min-h-screen flex-col overflow-hidden bg-[#171513] text-white">
      <section
        ref={stageRef}
        className="relative min-h-0 flex-1"
        aria-label="Slide hiện tại"
      >
        {current ? (
          <div className="absolute left-1/2 top-1/2" style={{ width: CANVAS_W, height: CANVAS_H, transform: `translate(-50%, -50%) scale(${scale})`, transformOrigin: "center" }}>
            <SlideSurface slide={current} interactive />
          </div>
        ) : <div className="grid h-full place-items-center text-sm text-white/60">Đang tải bộ slide...</div>}
      </section>

      <footer className="flex h-24 shrink-0 items-center justify-between gap-3 px-4 pb-3 pt-4">
        <button onClick={() => router.back()} className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-white/75 transition hover:bg-white/10 hover:text-white">
          <Chevron direction="left" className="size-4" />
          Thoát
        </button>
        <div className="flex flex-col items-center gap-2.5">
          <div
            ref={timelineRef}
            className="scrollbar-none flex max-w-[520px] items-center gap-2 overflow-x-auto px-2 pb-1"
          >
            {slides.map((slide, index) => (
              <button
                key={slide.id}
                data-slide-idx={index}
                onClick={() => goTo(index)}
                title={`Slide ${index + 1}`}
                aria-label={`Slide ${index + 1}`}
                aria-current={index === activeIndex ? "true" : undefined}
                className={`relative shrink-0 overflow-hidden rounded-md transition-all duration-200 ${
                  index === activeIndex
                    ? "ring-2 ring-[#f08a62]"
                    : "opacity-55 ring-1 ring-white/20 hover:opacity-90 hover:ring-white/50"
                }`}
                style={{ width: 88, height: 50 }}
              >
                <div style={{ width: CANVAS_W, height: CANVAS_H, transform: "scale(0.0917)", transformOrigin: "top left", background: slide.bg }}>
                  {slide.elements.map((element) => <ElementView key={element.id} el={element} />)}
                </div>
                {index === activeIndex && (
                  <span className="absolute bottom-0.5 right-1 rounded bg-[#f08a62] px-1 text-[9px] font-semibold text-white">
                    {index + 1}
                  </span>
                )}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <button onClick={previous} disabled={activeIndex === 0} aria-label="Slide trước" className="grid size-9 place-items-center rounded-full border border-white/20 text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-30"><Chevron direction="left" /></button>
            <p className="min-w-24 text-center text-sm font-medium tabular-nums text-white/85">{activeIndex + 1} / {slides.length || "–"}</p>
            <button onClick={next} disabled={!slides.length || activeIndex === slides.length - 1} aria-label="Slide tiếp" className="grid size-9 place-items-center rounded-full border border-white/20 text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-30"><Chevron direction="right" /></button>
          </div>
        </div>
        <button onClick={toggleFullscreen} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-white/75 transition hover:bg-white/10 hover:text-white"><FullscreenIcon />{isFullscreen ? "Thu nhỏ" : "Toàn màn hình"}</button>
      </footer>
    </main>
  );
}
