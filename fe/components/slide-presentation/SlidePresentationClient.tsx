"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ElementView } from "@/components/slide-editor/ElementView";
import { CANVAS_H, CANVAS_W, type Slide } from "@/components/slide-editor/types";
import { loadSlides } from "@/components/slide-editor/lib/storage";
import { useAuth } from "@/lib/auth/AuthContext";
import { getLibraryContent } from "@/lib/library";
import { parseSlideDeck } from "@/lib/slide-deck-library";

function Chevron({ direction }: { direction: "left" | "right" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-5">
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

function SlideSurface({ slide }: { slide: Slide }) {
  return (
    <div className="relative overflow-hidden" style={{ width: CANVAS_W, height: CANVAS_H, background: slide.bg }}>
      {slide.elements.map((element) => <ElementView key={element.id} el={element} />)}
    </div>
  );
}

export function SlidePresentationClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { authFetch } = useAuth();
  const libraryId = searchParams.get("libraryId");
  const stageRef = useRef<HTMLDivElement>(null);
  const [slides, setSlides] = useState<Slide[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [scale, setScale] = useState(1);
  const [showPicker, setShowPicker] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const loadDeck = async () => {
      await Promise.resolve();
      if (cancelled) return;
      setActiveIndex(0);
      setError(null);

      if (!libraryId) {
        const localSlides = loadSlides();
        if (!localSlides) setError("Không tìm thấy bộ slide để trình chiếu. Hãy mở bộ slide từ thư viện hoặc trình soạn thảo.");
        else setSlides(localSlides);
        return;
      }

      try {
        const content = await getLibraryContent(authFetch, libraryId);
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
  }, [authFetch, libraryId]);

  const goTo = useCallback((index: number) => {
    setActiveIndex(() => Math.max(0, Math.min(index, Math.max(0, slides.length - 1))));
  }, [slides.length]);
  const previous = useCallback(() => goTo(activeIndex - 1), [activeIndex, goTo]);
  const next = useCallback(() => goTo(activeIndex + 1), [activeIndex, goTo]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (showPicker) setShowPicker(false);
        else router.back();
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
      if (event.key.toLowerCase() === "g") setShowPicker((value) => !value);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [next, previous, router, showPicker]);

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
      <header className="flex h-14 shrink-0 items-center justify-between px-4 sm:px-6">
        <button onClick={() => router.back()} className="rounded-lg px-3 py-2 text-sm text-white/75 hover:bg-white/10 hover:text-white">Thoát</button>
        <p className="text-sm font-medium tabular-nums text-white/80">{slides.length ? `${activeIndex + 1} / ${slides.length}` : "Đang tải..."}</p>
        <button onClick={toggleFullscreen} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-white/75 hover:bg-white/10 hover:text-white"><FullscreenIcon />{isFullscreen ? "Thu nhỏ" : "Toàn màn hình"}</button>
      </header>

      <section ref={stageRef} className="relative min-h-0 flex-1" aria-label="Slide hiện tại">
        {current ? (
          <div className="absolute left-1/2 top-1/2" style={{ width: CANVAS_W, height: CANVAS_H, transform: `translate(-50%, -50%) scale(${scale})`, transformOrigin: "center" }}>
            <SlideSurface slide={current} />
          </div>
        ) : <div className="grid h-full place-items-center text-sm text-white/60">Đang tải bộ slide...</div>}
      </section>

      <footer className="flex h-20 shrink-0 items-center justify-center gap-3 px-4">
        <button onClick={previous} disabled={activeIndex === 0} aria-label="Slide trước" className="grid size-11 place-items-center rounded-full border border-white/20 text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-30"><Chevron direction="left" /></button>
        <button onClick={() => setShowPicker(true)} className="min-w-28 rounded-lg bg-white/12 px-4 py-2 text-sm font-medium text-white hover:bg-white/20">Chọn slide</button>
        <button onClick={next} disabled={!slides.length || activeIndex === slides.length - 1} aria-label="Slide tiếp" className="grid size-11 place-items-center rounded-full border border-white/20 text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-30"><Chevron direction="right" /></button>
      </footer>

      {showPicker ? (
        <div className="fixed inset-0 z-50 overflow-auto bg-[#171513]/95 p-6" role="dialog" aria-modal="true" aria-label="Chọn slide">
          <div className="mx-auto max-w-6xl">
            <div className="mb-6 flex items-center justify-between"><h1 className="text-lg font-semibold">Chọn slide</h1><button onClick={() => setShowPicker(false)} className="rounded-lg px-3 py-2 text-sm text-white/75 hover:bg-white/10">Đóng</button></div>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {slides.map((slide, index) => (
                <button key={slide.id} onClick={() => { goTo(index); setShowPicker(false); }} className={`overflow-hidden rounded-xl border text-left transition ${index === activeIndex ? "border-[#f08a62] ring-2 ring-[#f08a62]" : "border-white/15 hover:border-white/50"}`}>
                  <div className="relative aspect-video overflow-hidden bg-white"><div style={{ width: CANVAS_W, height: CANVAS_H, transform: "scale(0.3)", transformOrigin: "top left" }}><SlideSurface slide={slide} /></div></div>
                  <span className="block px-3 py-2 text-sm text-white/80">Slide {index + 1}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
