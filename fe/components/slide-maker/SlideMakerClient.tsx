"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { SlideEditor } from "@/components/slide-editor/SlideEditor";
import { mapBeSlide, skeletonSlidesFromParts } from "@/components/slide-editor/lib/be-mapper";
import type { Slide } from "@/components/slide-editor/types";
import { generateParts } from "@/lib/api/slides";
import {
  clearActiveGeneration,
  readActiveGeneration,
  type ActiveGeneration,
} from "@/lib/slide-create/session";
import { connectSlideStream, type SlideEvent } from "@/lib/ws/slide-client";
import { logSlideApi } from "@/lib/ws/slide-debug-log";
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
  const [doneMessage, setDoneMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const replaceSlides = useEditorStore((s) => s.replaceSlides);
  const generationRef = useRef<{ sessionId: string; apiStarted: boolean } | null>(null);
  const disconnectRef = useRef<(() => void) | null>(null);
  const activeRef = useRef<ActiveGeneration | null>(null);

  const upsertSlide = useCallback((slide: Slide) => {
    useEditorStore.setState((state) => ({
      slides: state.slides.map((s) => (s.id === slide.id ? slide : s)),
    }));
  }, []);

  const handleEvent = useCallback(
    (event: SlideEvent, active: ActiveGeneration) => {
      if (event.type === "SLIDE_PART_READY") {
        const existing = useEditorStore.getState().slides.find((s) => s.id === event.partId);
        const title =
          existing?.aiPrompt ??
          active.parts.flatMap((p) => p.slides).find((s) => s.id === event.partId)?.title ??
          "";
        const mapped = mapBeSlide(event.partId, title, event.elements, event.background);
        upsertSlide(mapped);
        setProgress((p) => ({ ...p, ready: p.ready + 1 }));
      } else if (event.type === "SLIDE_PART_FAILED") {
        setProgress((p) => ({ ...p, ready: p.ready + 1 }));
      } else if (event.type === "LOG") {
        /* logged in slide-client */
      } else if (event.type === "DONE") {
        setStreaming(false);
        setDoneMessage("Sinh slide xong.");
        clearActiveGeneration();
        router.replace("/slide-maker");
      } else if (event.type === "ERROR") {
        setStreaming(false);
        setErrorMessage(event.message);
        clearActiveGeneration();
        router.replace("/slide-maker");
      }
    },
    [router, upsertSlide],
  );

  useEffect(() => {
    if (!generating) return;

    const active = initialBootstrap.active ?? readActiveGeneration();
    if (!active) {
      router.replace("/slide-maker");
      return;
    }

    activeRef.current = active;

    const isNewSession = generationRef.current?.sessionId !== active.sessionId;
    if (isNewSession) {
      generationRef.current = { sessionId: active.sessionId, apiStarted: false };
      replaceSlides(skeletonSlidesFromParts(active.parts));
    }

    const { disconnect } = connectSlideStream({
      topic: active.topic,
      onEvent: (event) => {
        const current = activeRef.current;
        if (current) handleEvent(event, current);
      },
      onClose: () => {
        disconnectRef.current = null;
      },
    });
    disconnectRef.current = disconnect;

    if (!generationRef.current?.apiStarted) {
      generationRef.current = {
        sessionId: active.sessionId,
        apiStarted: true,
      };
      logSlideApi("start generate-parts", {
        sessionId: active.sessionId,
        topic: active.topic,
        slideCount: countSlides(active),
        parts: active.parts,
      });

      void generateParts({
        sessionId: active.sessionId,
        lessonId: active.lessonId,
        lessonTitle: active.lessonTitle,
        lessonSummary: active.lessonSummary,
        grade: active.grade,
        styleHint: active.styleHint,
        parts: active.parts,
      }).catch((err) => {
        console.error("[EDUA slide] [API] generate-parts failed", err);
        setStreaming(false);
        setErrorMessage(err instanceof Error ? err.message : String(err));
        clearActiveGeneration();
        router.replace("/slide-maker");
      });
    }

    return () => {
      disconnectRef.current?.();
      disconnectRef.current = null;
    };
  }, [generating, handleEvent, initialBootstrap.active, replaceSlides, router]);

  useEffect(() => {
    if (!doneMessage) return;
    const t = setTimeout(() => setDoneMessage(null), 4000);
    return () => clearTimeout(t);
  }, [doneMessage]);

  return (
    <main className="h-screen w-full overflow-hidden bg-[#f5f1ec] text-[#171717]">
      <div className="flex h-full w-full flex-col">
        {streaming ? (
          <div className="flex h-9 shrink-0 items-center gap-3 border-b border-[#e8e0d8] bg-[#faf5ff] px-4 text-xs text-[#8200db]">
            <span className="size-3.5 animate-spin rounded-full border-2 border-[#8200db] border-t-transparent" />
            <span>
              Đang sinh slide… {progress.ready}/{progress.total}
            </span>
            <div className="h-1.5 max-w-xs flex-1 overflow-hidden rounded-full bg-[#e9d5ff]">
              <div
                className="h-full rounded-full bg-[#8200db] transition-all duration-300"
                style={{
                  width: progress.total > 0 ? `${(progress.ready / progress.total) * 100}%` : "0%",
                }}
              />
            </div>
          </div>
        ) : null}
        {doneMessage ? (
          <div className="flex h-9 shrink-0 items-center border-b border-green-100 bg-green-50 px-4 text-xs text-green-700">
            {doneMessage}
          </div>
        ) : null}
        {errorMessage ? (
          <div className="flex h-9 shrink-0 items-center border-b border-red-100 bg-red-50 px-4 text-xs text-red-700">
            {errorMessage}
          </div>
        ) : null}
        <div className="flex min-h-0 flex-1">
          <Sidebar activeHref="/slide-create" />
          <section className="min-w-0 flex-1 overflow-hidden">
            <SlideEditor skipInitialLoad={generating} />
          </section>
        </div>
      </div>
    </main>
  );
}
