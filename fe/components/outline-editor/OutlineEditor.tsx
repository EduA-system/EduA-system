"use client";

import { useEffect, useRef, useState } from "react";
import {
  slideRoleLabel,
  slideRoleTone,
  validateContentPlan,
  type OutlinePart,
  type SlideItem,
} from "@/lib/api/slides";
import { SlideBasicFields } from "@/components/outline-editor/SlideDetailModal";

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

function slugifyFileName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/gi, "d")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase() || "outline";
}

function downloadOutlineJson(lessonTitle: string, parts: OutlinePart[]) {
  const payload = { lessonTitle, exportedAt: new Date().toISOString(), parts };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `outline-${slugifyFileName(lessonTitle)}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}


/** Auto-growing single-line title input that blends into the page until hovered/focused, so it reads as an editable field. */
function TitleInput({
  value,
  onChange,
  autoFocus,
  className,
  ariaLabel,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  autoFocus?: boolean;
  className?: string;
  ariaLabel?: string;
  placeholder?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (autoFocus) {
      ref.current?.focus();
      ref.current?.select();
    }
  }, [autoFocus]);
  return (
    <span className="group/title relative block">
      <input
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={ariaLabel}
        placeholder={placeholder}
        className={`w-full rounded-lg border border-[rgba(26,26,46,0.08)] bg-white/50 px-2.5 py-1.5 pr-7 outline-none transition placeholder:text-[#b7b5c6] hover:border-[rgba(26,26,46,0.2)] hover:bg-white focus:border-[#8200db] focus:bg-white focus:shadow-[0_0_0_3px_rgba(130,0,219,0.12)] ${className ?? ""}`}
      />
      <span
        aria-hidden
        className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[11px] text-[#c9c6d6] transition group-hover/title:text-[#8200db] group-focus-within/title:text-[#8200db]"
      >
        ✎
      </span>
    </span>
  );
}

export function OutlineEditor({
  lessonTitle,
  parts,
  onChange,
  onConfirm,
  confirming = false,
  expandingPartIds = [],
  expandingSlideIds = [],
  failedPartMessages: rawFailedPartMessages = {},
  failedSlideMessages: rawFailedSlideMessages = {},
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
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(() => {
    const first = parts[0];
    if (!first) return new Set();
    return new Set((first.slides ?? []).map((slide) => `${first.id}:${slide.id}`));
  });
  const [focusPartId, setFocusPartId] = useState<string | null>(null);
  const dragPartIndex = useRef<number | null>(null);

  const totalSlides = parts.reduce((sum, p) => sum + (p.slides?.length ?? 0), 0);
  const expanding = expandingPartIds.length > 0 || expandingSlideIds.length > 0;
  const currentPartIds = new Set(parts.map((part) => part.id));
  const currentSlideKeys = new Set(
    parts.flatMap((part) => (part.slides ?? []).map((slide) => `${part.id}:${slide.id}`)),
  );
  const activeFailedPartMessages = Object.fromEntries(
    Object.entries(rawFailedPartMessages).filter(([partId]) => currentPartIds.has(partId)),
  );
  const activeFailedSlideMessages = Object.fromEntries(
    Object.entries(rawFailedSlideMessages).filter(([key]) => currentSlideKeys.has(key)),
  );
  const failedPartMessages = activeFailedPartMessages;
  const failedSlideMessages = activeFailedSlideMessages;
  const failedPartIds = new Set(Object.keys(activeFailedPartMessages));
  const failedSlideIds = new Set(Object.keys(activeFailedSlideMessages));
  const failedPartCount = failedPartIds.size;
  const failedSlideCount = failedSlideIds.size;
  const hasBlockingFailures = failedPartCount > 0 || failedSlideCount > 0;
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
    const id = `p-${Date.now()}`;
    const newPart: OutlinePart = {
      id,
      title: "Phần mới",
      slides: [createDefaultSlide(`${id}-s1`)],
    };
    update([...parts, newPart]);
    setFocusPartId(id);
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
    setExpandedKeys((prev) => new Set(prev).add(`${partId}:${newSlide.id}`));
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <div className="overflow-hidden rounded-2xl border border-[rgba(26,26,46,0.09)] bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-[rgba(26,26,46,0.07)] px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#faf5ff]">
              <span className="text-[#8200db] text-xs font-bold">AI</span>
            </div>
            <span className="font-medium text-[#1a1a2e]">{lessonTitle}</span>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className="rounded-lg bg-[#f9f8f3] px-2.5 py-1 text-xs font-medium text-[#5c5b6e]">
              {parts.length} phần · {totalSlides} slides
            </span>
            <button
              type="button"
              onClick={() => downloadOutlineJson(lessonTitle, parts)}
              disabled={totalSlides === 0}
              className="rounded-lg border border-[rgba(26,26,46,0.12)] px-2.5 py-1 text-xs font-medium text-[#5c5b6e] transition hover:border-[#8200db]/40 hover:text-[#8200db] disabled:cursor-not-allowed disabled:opacity-50"
              title="Xuất toàn bộ outline ra file JSON"
            >
              Xuất JSON
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-[#faf9f5] px-5 py-2 text-[11px] text-[#9998be]">
          <span aria-hidden>✎</span>
          <span>Bấm vào tiêu đề phần hoặc slide để sửa trực tiếp; mở “Chi tiết” để chỉnh nội dung.</span>
        </div>

        <div className="space-y-4 px-4 py-4">
          {parts.map((part, partIndex) => {
            const partSlideKeys = (part.slides ?? []).map((slide) => `${part.id}:${slide.id}`);
            const partExpanding = expandingPartIds.includes(part.id) || partSlideKeys.some((key) => expandingSlideSet.has(key));
            const failureMessage = activeFailedPartMessages[part.id];
            const partHasFailedSlide = partSlideKeys.some((key) => failedSlideIds.has(key));
            return (
              <section
                key={part.id}
                className="rounded-xl border border-[rgba(26,26,46,0.08)] bg-[#fdfdfb]"
              >
                <div
                  draggable
                  onDragStart={() => onPartDragStart(partIndex)}
                  onDragOver={(e) => onPartDragOver(e, partIndex)}
                  onDragEnd={onPartDragEnd}
                  className="flex items-center gap-2 border-b border-[rgba(26,26,46,0.06)] px-3 py-2.5"
                >
                  <span
                    className="cursor-grab select-none text-[#c9c6d6] active:cursor-grabbing"
                    title="Kéo để đổi thứ tự phần"
                  >
                    ⠿
                  </span>
                  <span className="shrink-0 rounded-md bg-[#faf5ff] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#8200db]">
                    Phần {partIndex + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <TitleInput
                      value={part.title}
                      onChange={(title) => updatePartTitle(part.id, title)}
                      autoFocus={focusPartId === part.id}
                      ariaLabel={`Tiêu đề phần ${partIndex + 1}`}
                      placeholder="Tên phần"
                      className="text-sm font-semibold text-[#1a1a2e]"
                    />
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
                    title="Xóa phần"
                  >
                    ×
                  </button>
                </div>

                {failureMessage ? (
                  <div role="alert" className="mx-3 mt-3 rounded-lg bg-red-50 px-3 py-2 text-left">
                    <p className="text-xs leading-5 text-red-700">
                      <span className="font-medium">Chưa thể soạn nội dung: </span>
                      {failureMessage}
                    </p>
                  </div>
                ) : null}

                <div className="space-y-2 px-3 py-3">
                  {(part.slides ?? []).map((slide) => {
                    const key = `${part.id}:${slide.id}`;
                    const label = slideRoleLabel(slide);
                    const tone = slideRoleTone(slide);
                    const slideExpanding = expandingSlideSet.has(key);
                    const slideFailure = activeFailedSlideMessages[key];
                    const validationErrors = !failureMessage && !slideExpanding ? validateContentPlan(slide.contentPlan) : [];
                    const invalid = !slideFailure && validationErrors.length > 0;
                    const retryMessage = slideFailure || (invalid ? validationErrors.join("\n") : undefined);
                    const expanded = expandedKeys.has(key);
                    const toggleDetail = () =>
                      setExpandedKeys((prev) => {
                        const next = new Set(prev);
                        if (next.has(key)) next.delete(key);
                        else next.add(key);
                        return next;
                      });
                    return (
                      <article
                        key={slide.id}
                        className={`rounded-lg border bg-white px-3 py-2.5 transition ${
                          invalid || slideFailure
                            ? "border-red-200"
                            : expanded
                              ? "border-[#8200db]/40 shadow-sm"
                              : "border-[rgba(26,26,46,0.09)] hover:border-[#8200db]/30"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${tone}`}>
                            {label}
                          </span>
                          {slide.aiNote ? (
                            <span
                              title={slide.aiNote}
                              className="shrink-0 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700"
                            >
                              AI
                            </span>
                          ) : null}
                          {invalid || slideFailure ? (
                            <span className="shrink-0 rounded bg-red-50 px-1.5 py-0.5 text-[10px] text-red-600">Lỗi</span>
                          ) : null}
                          {slideExpanding ? (
                            <span className="flex shrink-0 items-center gap-1.5 text-[10px] text-[#9998be]">
                              <span className="size-3 animate-spin rounded-full border-2 border-[#8200db] border-t-transparent" />
                              đang soạn…
                            </span>
                          ) : null}
                          <div className="min-w-0 flex-1">
                            {expanded ? (
                              <span className="block truncate px-2.5 py-1.5 text-sm font-medium text-[#1a1a2e]">
                                {slide.title || "Slide chưa đặt tên"}
                              </span>
                            ) : (
                              <TitleInput
                                value={slide.title}
                                onChange={(title) => updateSlide(part.id, slide.id, { title })}
                                ariaLabel="Tiêu đề slide"
                                placeholder="Tiêu đề slide"
                                className="text-sm text-[#1a1a2e]"
                              />
                            )}
                          </div>
                          {retryMessage ? (
                            <button
                              type="button"
                              onClick={() => onRetrySlide?.(part.id, slide.id)}
                              className="shrink-0 rounded-md bg-red-50 px-2 py-1 text-[10px] font-medium text-red-600 transition hover:bg-red-100 disabled:opacity-50"
                              disabled={!onRetrySlide}
                              title={retryMessage}
                            >
                              Thử lại
                            </button>
                          ) : null}
                          <button
                            type="button"
                            onClick={toggleDetail}
                            aria-expanded={expanded}
                            className={`flex shrink-0 items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-medium transition ${
                              expanded
                                ? "border-[#8200db]/40 bg-[#faf5ff] text-[#8200db]"
                                : "border-[rgba(26,26,46,0.12)] text-[#5c5b6e] hover:border-[#8200db]/40 hover:text-[#8200db]"
                            }`}
                          >
                            <span className={`text-[9px] transition-transform ${expanded ? "rotate-90" : ""}`}>▸</span>
                            {expanded ? "Thu gọn" : "Chi tiết"}
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteSlide(part.id, slide.id)}
                            className="shrink-0 rounded p-1 text-[#aeacb8] transition hover:bg-red-50 hover:text-red-500"
                            aria-label="Xóa slide"
                            title="Xóa slide"
                          >
                            ×
                          </button>
                        </div>

                        {expanded ? (
                          <div className="mt-3 border-t border-[rgba(26,26,46,0.08)] pt-3">
                            <SlideBasicFields
                              slide={slide}
                              onChange={(updated) => updateSlide(part.id, slide.id, updated)}
                            />
                          </div>
                        ) : null}
                      </article>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => addSlide(part.id)}
                    className="w-full rounded-lg border border-dashed border-[rgba(26,26,46,0.15)] py-1.5 text-xs text-[#9998be] transition hover:border-[#8200db]/40 hover:text-[#8200db]"
                  >
                    + Thêm slide
                  </button>
                </div>
              </section>
            );
          })}

          <button
            type="button"
            onClick={addPart}
            className="w-full rounded-xl border border-dashed border-[rgba(26,26,46,0.15)] py-2.5 text-sm text-[#9998be] transition hover:border-[#8200db]/40 hover:text-[#8200db]"
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
            disabled={totalSlides === 0 || confirming || expanding || hasBlockingFailures || invalidSlides.length > 0}
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

    </div>
  );
}
