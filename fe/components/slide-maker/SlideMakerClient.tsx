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
import { applyContentSlots } from "@/lib/slide-create/apply-content-slots";
import { mergeStep2LayoutElements } from "@/lib/slide-create/merge-step2-layout";
import type { SlideContentFillResponse } from "@/lib/api/slide-design";
import { useAuth } from "@/lib/auth/AuthContext";
import {
  createLibraryContent,
  getLibraryContent,
  updateLibraryContent,
  type LibrarySubject,
} from "@/lib/library";
import { parseSlideDeck, serializeSlideDeck } from "@/lib/slide-deck-library";
import { createSlideThumbnail } from "@/lib/library-thumbnail";
import { saveSlides } from "@/components/slide-editor/lib/storage";

type StepStates = {
  step1: DesignStepStatus;
  step2: DesignStepStatus;
  step3: DesignStepStatus;
};

const INITIAL_STEPS: StepStates = { step1: "idle", step2: "idle", step3: "idle" };

function stepLabel(step: 1 | 2 | 3) {
  return step === 1 ? "Bước 1: Giao diện deck" : step === 2 ? "Bước 2: Bố cục động" : "Bước 3: Điền nội dung";
}

export function SlideMakerClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { authFetch, user } = useAuth();
  const generating = searchParams.get("generating") === "1";
  const requestedLibraryId = searchParams.get("libraryId");
  const activeRef = useRef<ActiveGeneration | null>(generating ? readActiveGeneration() : null);
  const bootedSessionIdRef = useRef<string | null>(null);
  const loadedLibraryIdRef = useRef<string | null>(null);
  const [steps, setSteps] = useState<StepStates>(INITIAL_STEPS);
  const [message, setMessage] = useState<string | null>(null);
  const [libraryId, setLibraryId] = useState<string | null>(null);
  const [failedLibraryId, setFailedLibraryId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [deckTitle, setDeckTitle] = useState("");
  const [deckSubject, setDeckSubject] = useState<LibrarySubject>("PHYSICS");
  const replaceSlides = useEditorStore((s) => s.replaceSlides);

  useEffect(() => {
    if (!requestedLibraryId) {
      loadedLibraryIdRef.current = null;
      return;
    }
    if (loadedLibraryIdRef.current === requestedLibraryId) return;

    let cancelled = false;
    loadedLibraryIdRef.current = null;
    void getLibraryContent(authFetch, requestedLibraryId)
      .then((content) => {
        if (cancelled) return;
        if (content.type !== "SLIDE_DECK") throw new Error("Nội dung này không phải là bộ slide.");
        const slides = parseSlideDeck(content.payload);
        if (!slides) throw new Error("Bộ slide đã lưu có định dạng không hợp lệ.");
        replaceSlides(slides);
        loadedLibraryIdRef.current = content.id;
        setLibraryId(content.id);
        setFailedLibraryId(null);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setFailedLibraryId(requestedLibraryId);
        setMessage(error instanceof Error ? error.message : "Không thể mở bộ slide đã lưu.");
      });

    return () => {
      cancelled = true;
    };
  }, [authFetch, replaceSlides, requestedLibraryId]);

  const libraryLoading = Boolean(
    requestedLibraryId && libraryId !== requestedLibraryId && failedLibraryId !== requestedLibraryId,
  );
  const savedLibraryId = libraryId === requestedLibraryId ? libraryId : null;

  const handleSlideFrames = useCallback((slideId: string, result: { bg: string; elements: Slide["elements"] }) => {
    useEditorStore.setState((state) => ({
      slides: state.slides.map((slide) =>
        slide.id === slideId
          ? {
              ...slide,
              bg: result.bg,
              elements: mergeStep2LayoutElements(slide.elements, result.elements),
              generationStatus: "framing",
              generationError: undefined,
            }
          : slide,
      ),
      selectedIds: state.currentSlideId === slideId ? [] : state.selectedIds,
    }));
  }, []);

  const handleSlideReady = useCallback((slideId: string, result: SlideContentFillResponse, title: string) => {
    useEditorStore.setState((state) => ({
      slides: state.slides.map((slide) =>
        slide.id === slideId
          ? { ...slide, elements: applyContentSlots(slide.elements, result, slide.bg), aiPrompt: title, generationStatus: "ready", generationError: undefined }
          : slide,
      ),
      selectedIds: state.currentSlideId === slideId ? [] : state.selectedIds,
    }));
  }, []);

  const markSlidesPending = useCallback(() => {
    useEditorStore.setState((state) => ({
      slides: state.slides.map((slide) => ({ ...slide, generationStatus: "pending", generationError: undefined })),
      selectedIds: [],
    }));
  }, []);

  const handleSlideFailed = useCallback((slideId: string, message: string) => {
    useEditorStore.setState((state) => ({
      slides: state.slides.map((slide) =>
        slide.id === slideId ? { ...slide, generationStatus: "failed", generationError: message } : slide,
      ),
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

  const suggestedTitle = useCallback(() => {
    const current = useEditorStore.getState().currentSlide();
    return current?.aiPrompt?.trim() || "Bộ slide mới";
  }, []);

  const initialSubject: LibrarySubject =
    user?.subject === "MATH" || user?.subject === "CHEMISTRY" || user?.subject === "PHYSICS"
      ? user.subject
      : "PHYSICS";

  const saveDeck = useCallback(async (metadata?: { title: string; subject: LibrarySubject }) => {
    if (saving) return;
    setSaving(true);
    setMessage(null);
    const slides = serializeSlideDeck(useEditorStore.getState().slides);
    const thumbnailUrl = createSlideThumbnail(slides.slides);
    try {
      if (savedLibraryId) {
        await updateLibraryContent(authFetch, savedLibraryId, { payload: slides, thumbnailUrl: thumbnailUrl ?? undefined });
        setMessage("Đã cập nhật bộ slide trong thư viện cá nhân.");
      } else if (metadata) {
        const created = await createLibraryContent(authFetch, {
          type: "SLIDE_DECK",
          title: metadata.title,
          subject: metadata.subject,
          payload: slides,
          thumbnailUrl: thumbnailUrl ?? undefined,
        });
        loadedLibraryIdRef.current = created.id;
        setLibraryId(created.id);
        router.replace(`/slide-maker?libraryId=${created.id}`);
        setMessage("Đã lưu bộ slide vào thư viện cá nhân.");
      }
    } catch (error: unknown) {
      setMessage(error instanceof Error ? error.message : "Không thể lưu bộ slide.");
    } finally {
      setSaving(false);
    }
  }, [authFetch, router, savedLibraryId, saving]);

  const openSaveDialog = useCallback(() => {
    if (savedLibraryId) {
      void saveDeck();
      return;
    }
    setDeckTitle(suggestedTitle());
    setDeckSubject(initialSubject);
    setSaveDialogOpen(true);
  }, [initialSubject, saveDeck, savedLibraryId, suggestedTitle]);

  const createDeck = useCallback(() => {
    const title = deckTitle.trim();
    if (!title) return;
    setSaveDialogOpen(false);
    void saveDeck({ title, subject: deckSubject });
  }, [deckSubject, deckTitle, saveDeck]);

  const openPresentation = useCallback(() => {
    saveSlides(useEditorStore.getState().slides);
    const query = savedLibraryId ? `?libraryId=${encodeURIComponent(savedLibraryId)}` : "";
    router.push(`/slide-present${query}`);
  }, [router, savedLibraryId]);

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
    <main className="h-screen w-full overflow-hidden bg-white font-sans text-[#2b2926]">
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
          <section className="relative min-h-0 flex-1 overflow-hidden">
            {libraryLoading ? (
              <div className="grid h-full place-items-center bg-white text-sm text-[#6b625a]">Đang mở bộ slide...</div>
            ) : (
              <SlideEditor
                skipInitialLoad={generating || Boolean(requestedLibraryId)}
                designSteps={designSteps}
                onSaveToLibrary={openSaveDialog}
                savingToLibrary={saving}
                onPresent={openPresentation}
              />
            )}
          </section>
        </div>
      </div>
      {saveDialogOpen ? (
        <div className="fixed inset-0 z-[100] grid place-items-center bg-black/35 p-4" role="dialog" aria-modal="true" aria-labelledby="save-deck-title">
          <div className="w-full max-w-md rounded-xl border border-[#e8e2d9] bg-white p-5 shadow-xl">
            <h2 id="save-deck-title" className="text-base font-semibold text-[#2b2926]">Lưu bộ slide</h2>
            <label className="mt-4 block text-sm font-medium text-[#4f4943]">
              Tên bộ slide
              <input
                autoFocus
                value={deckTitle}
                onChange={(event) => setDeckTitle(event.target.value)}
                maxLength={255}
                className="mt-1.5 h-10 w-full rounded-lg border border-[#d8d1c9] px-3 text-sm outline-none focus:border-[#d97757]"
              />
            </label>
            <label className="mt-4 block text-sm font-medium text-[#4f4943]">
              Môn học
              <select
                value={deckSubject}
                onChange={(event) => setDeckSubject(event.target.value as LibrarySubject)}
                className="mt-1.5 h-10 w-full rounded-lg border border-[#d8d1c9] bg-white px-3 text-sm outline-none focus:border-[#d97757]"
              >
                <option value="MATH">Toán</option>
                <option value="CHEMISTRY">Hóa học</option>
                <option value="PHYSICS">Vật lý</option>
              </select>
            </label>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setSaveDialogOpen(false)} className="rounded-lg px-3 py-2 text-sm text-[#4f4943] hover:bg-[#f7f3ee]">Hủy</button>
              <button type="button" onClick={createDeck} disabled={!deckTitle.trim()} className="rounded-lg bg-[#d97757] px-4 py-2 text-sm font-medium text-white disabled:opacity-40">Lưu</button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
