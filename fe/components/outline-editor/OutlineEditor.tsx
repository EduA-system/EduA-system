"use client";

import { useRef, useState } from "react";
import {
  slideRoleLabel,
  slideRoleTone,
  validateContentPlan,
  type OutlinePart,
  type SlideItem,
} from "@/lib/api/slides";
import { SlideDetailModal } from "@/components/outline-editor/SlideDetailModal";

function createDefaultSlide(id: string): SlideItem {
  return {
    id,
    title: "Slide mới",
    pedagogicalRole: "explain",
    contentPlan: {
      slideType: "concept",
      headerMode: "fixed",
      blocks: [{
        id: `${id}-b1`, kind: "text", role: "body", semanticType: "explanation",
        priority: "primary", required: true, text: "Nội dung slide",
      }],
      relationships: [],
    },
  };
}

function contentPreview(slide: SlideItem): string {
  const block = slide.contentPlan.blocks[0];
  if (!block) return "";
  const value = block.kind === "text" ? block.text : block.kind === "visual" ? block.description : block.kind === "formula" ? block.expression : block.kind === "quiz" ? block.question : "Nội dung có cấu trúc";
  return value.replace(/\s+/g, " ").trim();
}

export function OutlineEditor({
  lessonTitle,
  parts,
  onChange,
  onConfirm,
  confirming = false,
  expandingPartIds = [],
  expandingSlideIds = [],
  failedPartMessages = {},
  failedSlideMessages = {},
  onRetrySlide,
}: {
  lessonTitle: string;
  parts: OutlinePart[];
  onChange: (parts: OutlinePart[]) => void;
  onConfirm: (parts: OutlinePart[]) => void;
  confirming?: boolean;
  expandingPartIds?: string[];
  expandingSlideIds?: string[];
  failedPartMessages?: Record<string, string>;
  failedSlideMessages?: Record<string, string>;
  onRetrySlide?: (partId: string, slideId: string) => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [detail, setDetail] = useState<{ partId: string; slideId: string } | null>(null);
  const dragPartIndex = useRef<number | null>(null);

  const totalSlides = parts.reduce((sum, p) => sum + (p.slides?.length ?? 0), 0);
  const expanding = expandingPartIds.length > 0 || expandingSlideIds.length > 0;
  const failedPartIds = new Set(Object.keys(failedPartMessages));
  const failedSlideIds = new Set(Object.keys(failedSlideMessages));
  const expandingSlideSet = new Set(expandingSlideIds);
  const invalidSlides = parts.flatMap((part) =>
    failedPartIds.has(part.id)
      ? []
      : part.slides.filter((slide) => {
          const key = `${part.id}:${slide.id}`;
          return !expandingPartIds.includes(part.id)
            && !expandingSlideSet.has(key)
            && !failedSlideIds.has(key)
            && validateContentPlan(slide.contentPlan).length > 0;
        }),
  );

  function update(next: OutlinePart[]) {
    onChange(next);
  }

  function updatePartTitle(partId: string, title: string) {
    update(parts.map((p) => (p.id === partId ? { ...p, title } : p)));
  }

  function deletePart(partId: string) {
    update(parts.filter((p) => p.id !== partId));
  }

  function addPart() {
    const newPart: OutlinePart = {
      id: `p-${Date.now()}`,
      title: "Phần mới",
      slides: [createDefaultSlide(`p-${Date.now()}-s1`)],
    };
    update([...parts, newPart]);
    setEditingId(newPart.id);
  }

  function onPartDragStart(index: number) {
    dragPartIndex.current = index;
  }
  function onPartDragOver(e: React.DragEvent, index: number) {
    e.preventDefault();
    const from = dragPartIndex.current;
    if (from === null || from === index) return;
    const next = [...parts];
    const [moved] = next.splice(from, 1);
    next.splice(index, 0, moved);
    dragPartIndex.current = index;
    update(next);
  }
  function onPartDragEnd() {
    dragPartIndex.current = null;
  }

  function updateSlide(partId: string, slideId: string, patch: Partial<SlideItem>) {
    update(
      parts.map((p) =>
        p.id !== partId
          ? p
          : {
              ...p,
              slides: p.slides.map((s) => (s.id === slideId ? { ...s, ...patch } : s)),
            },
      ),
    );
  }

  function deleteSlide(partId: string, slideId: string) {
    update(
      parts.map((p) =>
        p.id !== partId ? p : { ...p, slides: p.slides.filter((s) => s.id !== slideId) },
      ),
    );
  }

  function addSlide(partId: string) {
    const newSlide = createDefaultSlide(`${partId}-s${Date.now()}`);
    update(parts.map((p) => (p.id !== partId ? p : { ...p, slides: [...p.slides, newSlide] })));
    setDetail({ partId, slideId: newSlide.id });
  }

  const detailSlide = detail
    ? parts.find((p) => p.id === detail.partId)?.slides.find((s) => s.id === detail.slideId)
    : undefined;

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <div className="overflow-hidden rounded-2xl border border-[rgba(26,26,46,0.09)] bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-[rgba(26,26,46,0.07)] px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#faf5ff]">
              <span className="text-[#8200db] text-xs font-bold">AI</span>
            </div>
            <span className="font-medium text-[#1a1a2e]">{lessonTitle}</span>
          </div>
          <span className="rounded-lg bg-[#f9f8f3] px-2.5 py-1 text-xs font-medium text-[#5c5b6e]">
            {parts.length} phần · {totalSlides} slides
          </span>
        </div>

        <div className="divide-y divide-[rgba(26,26,46,0.06)]">
          {parts.map((part, partIndex) => {
            const partSlideKeys = (part.slides ?? []).map((slide) => `${part.id}:${slide.id}`);
            const partExpanding = expandingPartIds.includes(part.id) || partSlideKeys.some((key) => expandingSlideSet.has(key));
            const failureMessage = failedPartMessages[part.id];
            const partHasFailedSlide = partSlideKeys.some((key) => failedSlideIds.has(key));
            return (
              <div
                key={part.id}
                draggable
                onDragStart={() => onPartDragStart(partIndex)}
                onDragOver={(e) => onPartDragOver(e, partIndex)}
                onDragEnd={onPartDragEnd}
                className="px-4 py-3"
              >
                <div className="flex items-center gap-2.5">
                  <span className="cursor-grab text-[#aeacb8] select-none active:cursor-grabbing">⋮⋮</span>
                  <div className="min-w-0 flex-1">
                    {editingId === part.id ? (
                      <input
                        autoFocus
                        value={part.title}
                        onChange={(e) => updatePartTitle(part.id, e.target.value)}
                        onBlur={() => setEditingId(null)}
                        onKeyDown={(e) => e.key === "Enter" && setEditingId(null)}
                        className="w-full rounded-md border border-[#c27aff]/40 px-2 py-0.5 text-sm font-semibold text-[#1a1a2e] outline-none focus:ring-1 focus:ring-[#8200db]"
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={() => setEditingId(part.id)}
                        className="block w-full truncate text-left text-sm font-semibold text-[#1a1a2e] hover:text-[#8200db]"
                      >
                        {part.title}
                      </button>
                    )}
                  </div>
                  {partExpanding ? (
                    <span className="flex shrink-0 items-center gap-1.5 text-[11px] text-[#9998be]">
                      <span className="size-3 animate-spin rounded-full border-2 border-[#8200db] border-t-transparent" />
                      đang soạn…
                    </span>
                  ) : null}
                  {!partExpanding && !failureMessage && partHasFailedSlide ? (
                    <span className="shrink-0 rounded-lg bg-red-50 px-2 py-1 text-[11px] font-medium text-red-600">
                      Có slide lỗi
                    </span>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => deletePart(part.id)}
                    className="shrink-0 rounded-lg p-1 text-[#aeacb8] transition hover:bg-red-50 hover:text-red-500"
                    aria-label="Xóa phần"
                  >
                    ×
                  </button>
                </div>

                {failureMessage ? (
                  <div role="alert" className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-left">
                    <p className="text-xs leading-5 text-red-700">
                      <span className="font-medium">Chưa thể soạn nội dung: </span>
                      {failureMessage}
                    </p>
                  </div>
                ) : null}

                <ul className="mt-2 space-y-1 pl-6">
                  {(part.slides ?? []).map((slide) => {
                    const key = `${part.id}:${slide.id}`;
                    const label = slideRoleLabel(slide);
                    const tone = slideRoleTone(slide);
                    const preview = contentPreview(slide);
                    const slideExpanding = expandingSlideSet.has(key);
                    const slideFailure = failedSlideMessages[key];
                    const validationErrors = !failureMessage && !slideExpanding ? validateContentPlan(slide.contentPlan) : [];
                    const invalid = !slideFailure && validationErrors.length > 0;
                    const retryMessage = slideFailure || (invalid ? validationErrors.join("\n") : undefined);
                    return (
                      <li key={slide.id} className="flex items-start gap-2">
                        <span className="mt-1 text-[#d8d1c9]">└</span>
                        <span
                          className={`mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${tone}`}
                        >
                          {label}
                        </span>
                        {slide.aiNote ? (
                          <span
                            title={slide.aiNote}
                            className="mt-0.5 shrink-0 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700"
                          >
                            AI
                          </span>
                        ) : null}
                        {invalid || slideFailure ? <span className="mt-0.5 rounded bg-red-50 px-1.5 py-0.5 text-[10px] text-red-600">Lỗi</span> : null}
                        <button
                          type="button"
                          onClick={() => setDetail({ partId: part.id, slideId: slide.id })}
                          className="min-w-0 flex-1 text-left"
                        >
                          <span className="block truncate text-xs text-[#5c5b6e] hover:text-[#1a1a2e]">
                            {slide.title}
                          </span>
                          {preview ? (
                            <span className="block truncate text-[11px] text-[#aeacb8]">{preview}</span>
                          ) : (
                            <span className="block text-[11px] text-[#c9c6d6]">
                              {slideExpanding
                                ? "đang soạn nội dung…"
                                : slideFailure || failureMessage
                                  ? "nội dung chưa được tạo"
                                  : "bấm để soạn nội dung"}
                            </span>
                          )}
                        </button>
                        {retryMessage ? (
                          <button
                            type="button"
                            onClick={() => onRetrySlide?.(part.id, slide.id)}
                            className="mt-0.5 shrink-0 rounded-md bg-red-50 px-2 py-1 text-[10px] font-medium text-red-600 transition hover:bg-red-100 disabled:opacity-50"
                            disabled={!onRetrySlide}
                            title={retryMessage}
                          >
                            Thử lại
                          </button>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => deleteSlide(part.id, slide.id)}
                          className="mt-0.5 shrink-0 text-[#aeacb8] hover:text-red-500"
                          aria-label="Xóa slide"
                        >
                          ×
                        </button>
                      </li>
                    );
                  })}
                  <li>
                    <button
                      type="button"
                      onClick={() => addSlide(part.id)}
                      className="pl-5 text-xs text-[#9998be] transition hover:text-[#8200db]"
                    >
                      + Thêm slide
                    </button>
                  </li>
                </ul>
              </div>
            );
          })}
        </div>

        <div className="border-t border-[rgba(26,26,46,0.07)] px-4 py-3">
          <button
            type="button"
            onClick={addPart}
            className="text-sm text-[#9998be] transition hover:text-[#8200db]"
          >
            + Thêm phần
          </button>
        </div>

        <div className="border-t border-[rgba(26,26,46,0.09)] px-5 py-4">
          {Object.keys(failedPartMessages).length ? <p className="mb-2 text-center text-xs text-red-600">Có phần chưa soạn được; hãy thử lại trước khi tạo slide.</p> : null}
          {invalidSlides.length ? <p className="mb-2 text-center text-xs text-red-600">Có {invalidSlides.length} slide chứa block hoặc quan hệ chưa hợp lệ.</p> : null}
          {Object.keys(failedSlideMessages).length ? <p className="mb-2 text-center text-xs text-red-600">Có {Object.keys(failedSlideMessages).length} slide chưa soạn được; hãy thử lại trước khi tạo slide.</p> : null}
          <button
            type="button"
            onClick={() => onConfirm(parts)}
            disabled={totalSlides === 0 || confirming || expanding || Object.keys(failedPartMessages).length > 0 || Object.keys(failedSlideMessages).length > 0 || invalidSlides.length > 0}
            className="flex h-[44px] w-full items-center justify-center rounded-xl bg-[#1c1b2e] text-sm font-medium text-[#f9f8f3] transition enabled:hover:bg-[#2a2940] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {confirming
              ? "Đang bắt đầu sinh slide…"
              : expanding
                ? "Đang soạn nội dung…"
                : `Tạo ${totalSlides} slides →`}
          </button>
        </div>
      </div>

      {detail && detailSlide ? (
        <SlideDetailModal
          slide={detailSlide}
          onChange={(updated) => updateSlide(detail.partId, detail.slideId, updated)}
          onClose={() => setDetail(null)}
        />
      ) : null}
    </div>
  );
}
