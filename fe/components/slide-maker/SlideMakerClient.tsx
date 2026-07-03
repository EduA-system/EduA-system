"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { SlideEditor } from "@/components/slide-editor/SlideEditor";
import { skeletonSlidesFromParts } from "@/components/slide-editor/lib/be-mapper";
import type { Slide } from "@/components/slide-editor/types";
import {
  clearActiveGeneration,
  readActiveGeneration,
  type ActiveGeneration,
} from "@/lib/slide-create/session";
import { logSlideApi } from "@/lib/ws/slide-debug-log";
import { runDesignPipeline, retrySlideDesign } from "@/lib/slide-create/run-design-pipeline";
import { useEditorStore } from "@/stores/slide-editor-store";

function countSlides(active: ActiveGeneration) {
  return active.parts.reduce((sum, part) => sum + part.slides.length, 0);
}

function readGenerationBootstrap(generating: boolean) {
  if (!generating) {
    return { active: null as ActiveGeneration | null, total: 0 };
  }
  const active = readActiveGeneration();
  return { active, total: active ? countSlides(active) : 0 };
}

function markGeneratingSlidesFailed() {
  useEditorStore.setState((state) => ({
    slides: state.slides.map((slide) =>
      slide.generationStatus === "pending" || slide.generationStatus === "framing"
        ? { ...slide, generationStatus: "failed" }
        : slide,
    ),
    selectedIds: [],
  }));
}

export function SlideMakerClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const generating = searchParams.get("generating") === "1";
  const initialBootstrap = readGenerationBootstrap(generating);

  const [progress, setProgress] = useState({
    ready: 0,
    total: initialBootstrap.total,
  });
  const [streaming, setStreaming] = useState(
    () => generating && initialBootstrap.active !== null,
  );
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [doneMessage, setDoneMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [retryError, setRetryError] = useState<string | null>(null);

  const replaceSlides = useEditorStore((s) => s.replaceSlides);
  const generationRef = useRef<{ sessionId: string; designStarted: boolean } | null>(null);

  const upsertSlide = useCallback((slide: Slide) => {
    useEditorStore.setState((state) => ({
      slides: state.slides.map((s) => (s.id === slide.id ? slide : s)),
      selectedIds: state.currentSlideId === slide.id ? [] : state.selectedIds,
    }));
  }, []);

  const handleSlideFrames = useCallback(
    (slideId: string, result: { bg: string; elements: Slide["elements"] }) => {
      useEditorStore.setState((state) => ({
        slides: state.slides.map((s) =>
          s.id === slideId
            ? {
                ...s,
                bg: result.bg,
                elements: result.elements.map((e) => ({ ...e })),
                generationStatus: "framing",
              }
            : s,
        ),
        selectedIds: state.currentSlideId === slideId ? [] : state.selectedIds,
      }));
    },
    [],
  );

  const handleSlideReady = useCallback(
    (slideId: string, result: { bg: string; elements: Slide["elements"] }, title: string) => {
      upsertSlide({
        id: slideId,
        bg: result.bg,
        elements: result.elements,
        aiPrompt: title,
        generationStatus: "ready",
      });
    },
    [upsertSlide],
  );

  const handleSlideFailed = useCallback((slideId: string) => {
    useEditorStore.setState((state) => ({
      slides: state.slides.map((s) =>
        s.id === slideId ? { ...s, generationStatus: "failed" } : s,
      ),
      selectedIds: state.currentSlideId === slideId ? [] : state.selectedIds,
    }));
  }, []);

  // Retry AI generation for a single slide (header toolbar button), reusing
  // the deck skin + outline captured by the last full pipeline run.
  const retrySlide = useCallback(
    (slideId: string) => {
      setRetryError(null);
      useEditorStore.setState((state) => ({
        slides: state.slides.map((s) =>
          s.id === slideId ? { ...s, generationStatus: "pending" } : s,
        ),
      }));
      void retrySlideDesign(slideId, {
        onSlideFrames: handleSlideFrames,
        onSlideReady: handleSlideReady,
        onSlideFailed: (id, message) => {
          handleSlideFailed(id);
          setRetryError(message);
        },
      });
    },
    [handleSlideFrames, handleSlideReady, handleSlideFailed],
  );

  useEffect(() => {
    if (!retryError) return;
    const t = setTimeout(() => setRetryError(null), 6000);
    return () => clearTimeout(t);
  }, [retryError]);

  useEffect(() => {
    if (!generating) return;

    const active = initialBootstrap.active ?? readActiveGeneration();
    if (!active) {
      router.replace("/slide-maker");
      return;
    }

    const isNewSession = generationRef.current?.sessionId !== active.sessionId;
    if (isNewSession) {
      generationRef.current = { sessionId: active.sessionId, designStarted: false };
      replaceSlides(skeletonSlidesFromParts(active.parts));
    }

    // Client-side 3-step HTML design pipeline. Strict Mode chạy effect 2 lần nhưng
    // pipeline lần 1 vẫn chạy nền; designStarted chỉ chặn khởi động trùng.
    if (generationRef.current?.designStarted) return;

    let pipelineErrored = false;
    generationRef.current = { sessionId: active.sessionId, designStarted: true };
    logSlideApi("start design pipeline", {
      sessionId: active.sessionId,
      topic: active.topic,
      slideCount: countSlides(active),
    });
    void runDesignPipeline(
      {
        topic: active.topic,
        subject: active.subject,
        styleHint: active.styleHint,
        parts: active.parts,
      },
      {
        onSkinReady: (skin) => {
          useEditorStore.setState((state) => ({
            slides: state.slides.map((s) =>
              s.elements.length === 0
                ? { ...s, bg: skin.bg, elements: skin.elements.map((e) => ({ ...e })) }
                : s,
            ),
          }));
        },
        onSlideFrames: handleSlideFrames,
        onSlideReady: handleSlideReady,
        onSlideFailed: handleSlideFailed,
        onProgress: (ready, total) => setProgress({ ready, total }),
        onError: (message) => {
          pipelineErrored = true;
          setStreaming(false);
          setErrorMessage(message);
          markGeneratingSlidesFailed();
          clearActiveGeneration();
          router.replace("/slide-maker");
        },
      },
    ).then(() => {
      if (pipelineErrored) return;
      setStreaming(false);
      setDoneMessage("Sinh slide xong.");
      clearActiveGeneration();
      router.replace("/slide-maker");
    });
  }, [
    generating,
    initialBootstrap.active,
    replaceSlides,
    router,
    handleSlideFrames,
    handleSlideReady,
    handleSlideFailed,
  ]);

  useEffect(() => {
    if (!doneMessage) return;
    const t = setTimeout(() => setDoneMessage(null), 4000);
    return () => clearTimeout(t);
  }, [doneMessage]);

  return (
    <main className="h-screen w-full overflow-hidden bg-[#f5f1ec] font-sans text-[#2b2926]">
      <div className="flex h-full w-full">
        <Sidebar collapsed={sidebarCollapsed} activeHref="/slide-create" />
        <div className="flex min-w-0 flex-1 flex-col">
          {streaming ? (
            <div className="flex h-9 shrink-0 items-center gap-3 border-b border-[#eadfd7] bg-[#fff7f1] px-4 text-xs text-[#9f5a3e]">
              <span className="size-3.5 animate-spin rounded-full border-2 border-[#d97757] border-t-transparent" />
              <span>
                Đang sinh slide… {progress.ready}/{progress.total}
              </span>
              <div className="h-1.5 max-w-xs flex-1 overflow-hidden rounded-full bg-[#f6eadf]">
                <div
                  className="h-full rounded-full bg-[#d97757] transition-all duration-300"
                  style={{
                    width: progress.total > 0 ? `${(progress.ready / progress.total) * 100}%` : "0%",
                  }}
                />
              </div>
            </div>
          ) : null}
          {doneMessage ? (
            <div className="flex h-9 shrink-0 items-center border-b border-[#d8d1c9] bg-[#f7f3ee] px-4 text-xs text-[#4f4943]">
              {doneMessage}
            </div>
          ) : null}
          {errorMessage ? (
            <div className="flex h-9 shrink-0 items-center border-b border-red-100 bg-red-50 px-4 text-xs text-red-700">
              {errorMessage}
            </div>
          ) : null}
          {retryError ? (
            <div className="flex h-9 shrink-0 items-center border-b border-red-100 bg-red-50 px-4 text-xs text-red-700">
              Tạo lại slide thất bại: {retryError}
            </div>
          ) : null}
          <section className="min-h-0 flex-1 overflow-hidden">
            <SlideEditor
              skipInitialLoad={generating}
              onRetrySlide={retrySlide}
              pageSidebarCollapsed={sidebarCollapsed}
              onTogglePageSidebar={() => setSidebarCollapsed((current) => !current)}
            />
          </section>
        </div>
      </div>
    </main>
  );
}
