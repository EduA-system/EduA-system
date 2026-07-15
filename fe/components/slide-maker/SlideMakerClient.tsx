"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { SlideEditor } from "@/components/slide-editor/SlideEditor";
import type { DesignStepControls, DesignStepStatus } from "@/components/slide-editor/TopBar";
import { skeletonSlidesFromParts } from "@/components/slide-editor/lib/be-mapper";
import type { Slide } from "@/components/slide-editor/types";
import { readActiveGeneration, type ActiveGeneration } from "@/lib/slide-create/session";
import {
  runContentFillStep,
  runDeckSkinStep,
  runStructuralStep,
} from "@/lib/slide-create/run-design-pipeline";
import { useEditorStore } from "@/stores/slide-editor-store";

type StepStates = {
  step1: DesignStepStatus;
  step2: DesignStepStatus;
  step3: DesignStepStatus;
};

const INITIAL_STEPS: StepStates = { step1: "idle", step2: "idle", step3: "idle" };

function stepLabel(step: 1 | 2 | 3) {
  return step === 1 ? "Bước 1: Giao diện deck" : step === 2 ? "Bước 2: Bố cục slide" : "Bước 3: Điền nội dung";
}

export function SlideMakerClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const generating = searchParams.get("generating") === "1";
  const activeRef = useRef<ActiveGeneration | null>(generating ? readActiveGeneration() : null);
  const bootedSessionIdRef = useRef<string | null>(null);
  const [steps, setSteps] = useState<StepStates>(INITIAL_STEPS);
  const [message, setMessage] = useState<string | null>(null);
  const replaceSlides = useEditorStore((s) => s.replaceSlides);

  const upsertSlide = useCallback((slide: Slide) => {
    useEditorStore.setState((state) => ({
      slides: state.slides.map((current) => (current.id === slide.id ? slide : current)),
      selectedIds: state.currentSlideId === slide.id ? [] : state.selectedIds,
    }));
  }, []);

  const handleSlideFrames = useCallback((slideId: string, result: { bg: string; elements: Slide["elements"] }) => {
    useEditorStore.setState((state) => ({
      slides: state.slides.map((slide) =>
        slide.id === slideId
          ? { ...slide, bg: result.bg, elements: result.elements.map((element) => ({ ...element })), generationStatus: "framing" }
          : slide,
      ),
      selectedIds: state.currentSlideId === slideId ? [] : state.selectedIds,
    }));
  }, []);

  const handleSlideReady = useCallback((slideId: string, result: { bg: string; elements: Slide["elements"] }, title: string) => {
    upsertSlide({ id: slideId, bg: result.bg, elements: result.elements, aiPrompt: title, generationStatus: "ready" });
  }, [upsertSlide]);

  const markSlidesPending = useCallback(() => {
    useEditorStore.setState((state) => ({
      slides: state.slides.map((slide) => ({ ...slide, generationStatus: "pending" })),
      selectedIds: [],
    }));
  }, []);

  const handleSlideFailed = useCallback((slideId: string) => {
    useEditorStore.setState((state) => ({
      slides: state.slides.map((slide) => slide.id === slideId ? { ...slide, generationStatus: "failed" } : slide),
      selectedIds: state.currentSlideId === slideId ? [] : state.selectedIds,
    }));
  }, []);

  useEffect(() => {
    if (!generating) return;
    const active = readActiveGeneration();
    if (!active) {
      router.replace("/slide-maker");
      return;
    }
    activeRef.current = active;
    if (bootedSessionIdRef.current !== active.sessionId) {
      bootedSessionIdRef.current = active.sessionId;
      replaceSlides(skeletonSlidesFromParts(active.parts));
    }
  }, [generating, replaceSlides, router]);

  const finishStep = useCallback((step: 1 | 2 | 3, failedSlideIds: string[] = []) => {
    const key = `step${step}` as keyof StepStates;
    setSteps((current) => ({ ...current, [key]: failedSlideIds.length ? "error" : "complete" }));
    setMessage(
      failedSlideIds.length
        ? `${stepLabel(step)} lỗi ở ${failedSlideIds.length} slide. Bạn có thể chạy lại bước này.`
        : `${stepLabel(step)} hoàn tất.`,
    );
  }, []);

  const runStep = useCallback(async (step: 1 | 2 | 3) => {
    const active = activeRef.current;
    if (!active) {
      setMessage("Không tìm thấy phiên tạo slide. Vui lòng quay lại tạo outline.");
      return;
    }

    const key = `step${step}` as keyof StepStates;
    setMessage(null);
    setSteps((current) => ({ ...current, [key]: "running" }));
    try {
      if (step === 1) {
        await runDeckSkinStep(active, {
          onSkinReady: (skin) => {
            useEditorStore.setState((state) => ({
              slides: state.slides.map((slide) =>
                slide.elements.length === 0
                  ? { ...slide, bg: skin.bg, elements: skin.elements.map((element) => ({ ...element })) }
                  : slide,
              ),
            }));
          },
        });
        finishStep(1);
        return;
      }

      if (step === 2) {
        markSlidesPending();
        const result = await runStructuralStep({ onSlideFrames: handleSlideFrames, onSlideFailed: handleSlideFailed });
        finishStep(2, result.failedSlideIds);
        return;
      }

      const result = await runContentFillStep({ onSlideReady: handleSlideReady, onSlideFailed: handleSlideFailed });
      finishStep(3, result.failedSlideIds);
    } catch (error) {
      setSteps((current) => ({ ...current, [key]: "error" }));
      setMessage(error instanceof Error ? error.message : String(error));
    }
  }, [finishStep, handleSlideFailed, handleSlideFrames, handleSlideReady, markSlidesPending]);

  const designSteps: DesignStepControls | undefined = generating
    ? { ...steps, onRunStep: (step) => void runStep(step) }
    : undefined;
  const runningStep = ([1, 2, 3] as const).find((step) => steps[`step${step}`] === "running");

  return (
    <main className="h-screen w-full overflow-hidden bg-[#f5f1ec] font-sans text-[#2b2926]">
      <div className="flex h-full w-full">
        <Sidebar activeHref="/slide-create" />
        <div className="flex min-w-0 flex-1 flex-col">
          {runningStep ? (
            <div className="flex h-9 shrink-0 items-center gap-3 border-b border-[#eadfd7] bg-[#fff7f1] px-4 text-xs text-[#9f5a3e]">
              <span className="size-3.5 animate-spin rounded-full border-2 border-[#d97757] border-t-transparent" />
              <span>Đang chạy {stepLabel(runningStep)} cho toàn bộ deck…</span>
            </div>
          ) : null}
          {message ? (
            <div className="flex h-9 shrink-0 items-center border-b border-[#d8d1c9] bg-[#f7f3ee] px-4 text-xs text-[#4f4943]">
              {message}
            </div>
          ) : null}
          <section className="min-h-0 flex-1 overflow-hidden">
            <SlideEditor skipInitialLoad={generating} designSteps={designSteps} />
          </section>
        </div>
      </div>
    </main>
  );
}
