"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { slideRoleLabel, type SlideItem, type SlideVisual } from "@/lib/api/slides";
import { SLIDE_LAYOUT_TEMPLATES, SLIDE_LAYOUT_VARIANTS, type SlideLayoutTemplate } from "@/lib/slide-create/layout-templates";

const VISUAL_TYPES: { value: SlideVisual["type"]; label: string }[] = [
  { value: "none", label: "Không" },
  { value: "image", label: "Ảnh" },
  { value: "formula", label: "Công thức" },
  { value: "table", label: "Bảng" },
];

const LAYOUT_LABELS: Record<SlideLayoutTemplate, string> = {
  title: "Tiêu đề",
  content: "Nội dung",
  "text-image": "Chữ và hình",
  comparison: "So sánh",
  formula: "Công thức",
  process: "Quy trình",
  "exercise-quiz": "Bài tập / trắc nghiệm",
  summary: "Tổng kết",
};

const inputClass =
  "w-full rounded-lg border border-[rgba(26,26,46,0.12)] px-3 py-2 text-sm text-[#1a1a2e] outline-none transition focus:border-[#c27aff]/60 focus:ring-1 focus:ring-[#8200db]";

function linesToArray(value: string): string[] | undefined {
  const items = value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  return items.length > 0 ? items : undefined;
}

function normalizeQuizItems(value: unknown): SlideItem["quizItems"] {
  if (!Array.isArray(value)) return undefined;
  const items = value
    .filter((item): item is Record<string, unknown> => !!item && typeof item === "object")
    .map((item) => ({
      question: typeof item.question === "string" ? item.question : "",
      choices: Array.isArray(item.choices)
        ? item.choices.filter((choice): choice is string => typeof choice === "string")
        : undefined,
      answer: typeof item.answer === "string" ? item.answer : undefined,
      explanation: typeof item.explanation === "string" ? item.explanation : undefined,
    }))
    .filter((item) => item.question.trim());
  return items.length > 0 ? items : undefined;
}

function QuizItemsField({
  slide,
  onChange,
}: {
  slide: SlideItem;
  onChange: (slide: SlideItem) => void;
}) {
  const [quizJson, setQuizJson] = useState(() =>
    slide.quizItems ? JSON.stringify(slide.quizItems, null, 2) : "",
  );
  const [quizJsonError, setQuizJsonError] = useState<string | null>(null);

  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-[#5c5b6e]">Câu hỏi luyện tập / phiếu học tập (JSON)</span>
      <textarea
        value={quizJson}
        onChange={(e) => {
          const next = e.target.value;
          setQuizJson(next);
          if (!next.trim()) {
            setQuizJsonError(null);
            onChange({ ...slide, quizItems: undefined });
            return;
          }
          try {
            const parsed = JSON.parse(next);
            if (!Array.isArray(parsed)) {
              setQuizJsonError("JSON phải là một mảng câu hỏi.");
              return;
            }
            const normalized = normalizeQuizItems(parsed);
            setQuizJsonError(null);
            onChange({ ...slide, quizItems: normalized });
          } catch {
            setQuizJsonError("JSON chưa hợp lệ.");
          }
        }}
        rows={5}
        placeholder='[{"question":"...","choices":["A. ..."],"answer":"A","explanation":"..."}]'
        className={`${inputClass} resize-y font-mono text-xs leading-relaxed`}
      />
      {quizJsonError ? <span className="text-[11px] text-red-500">{quizJsonError}</span> : null}
    </label>
  );
}

export function SlideDetailModal({
  slide,
  onChange,
  onClose,
}: {
  slide: SlideItem;
  onChange: (slide: SlideItem) => void;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-8"
      onClick={onClose}
    >
      <div
        className="flex max-h-full w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[rgba(26,26,46,0.08)] px-5 py-4">
          <div className="flex items-center gap-2">
            <span className="rounded bg-[#faf5ff] px-2 py-0.5 text-[11px] font-medium text-[#8200db]">
              {slideRoleLabel(slide)}
            </span>
            <span className="text-sm font-semibold text-[#1a1a2e]">Chi tiết slide</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-[#aeacb8] transition hover:bg-[#f3f1ec] hover:text-[#1a1a2e]"
            aria-label="Đóng"
          >
            ✕
          </button>
        </div>

        <div className="flex flex-col gap-4 overflow-y-auto px-5 py-4">
          {slide.aiNote ? (
            <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-[12px] leading-relaxed text-amber-800">
              <span className="font-semibold">AI bổ sung — cần duyệt: </span>
              {slide.aiNote}
            </div>
          ) : null}

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-[#5c5b6e]">Tiêu đề slide</span>
            <input
              value={slide.title}
              onChange={(e) => onChange({ ...slide, title: e.target.value })}
              className={inputClass}
            />
          </label>

          <label className="flex w-56 flex-col gap-1.5">
            <span className="text-xs font-medium text-[#5c5b6e]">Bố cục</span>
            <select
              value={SLIDE_LAYOUT_TEMPLATES.includes(slide.layoutHint as SlideLayoutTemplate) ? slide.layoutHint : ""}
              onChange={(e) => onChange({ ...slide, layoutHint: e.target.value || undefined, layoutVariant: undefined })}
              className={inputClass}
            >
              <option value="">Tự chọn theo nội dung</option>
              {SLIDE_LAYOUT_TEMPLATES.map((template) => (
                <option key={template} value={template}>{LAYOUT_LABELS[template]}</option>
              ))}
            </select>
          </label>

          <label className="flex w-full flex-col gap-1.5">
            <span className="text-xs font-medium text-[#5c5b6e]">Kiểu thiết kế</span>
            <select
              value={slide.layoutVariant ?? ""}
              onChange={(e) => {
                const variant = SLIDE_LAYOUT_VARIANTS.find((item) => item.id === e.target.value);
                onChange({
                  ...slide,
                  layoutVariant: variant?.id || undefined,
                  layoutHint: variant?.template ?? slide.layoutHint,
                });
              }}
              className={inputClass}
            >
              <option value="">Tự chọn thông minh</option>
              {SLIDE_LAYOUT_TEMPLATES.map((template) => (
                <optgroup key={template} label={LAYOUT_LABELS[template]}>
                  {SLIDE_LAYOUT_VARIANTS.filter((variant) => variant.template === template).map((variant) => (
                    <option key={variant.id} value={variant.id}>{variant.label}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-[#5c5b6e]">Nội dung hiển thị</span>
            <textarea
              value={slide.content ?? ""}
              onChange={(e) => onChange({ ...slide, content: e.target.value })}
              rows={7}
              placeholder="Nội dung sẽ hiển thị trên slide…"
              className={`${inputClass} resize-y leading-relaxed`}
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-[#5c5b6e]">Dữ kiện bắt buộc</span>
            <textarea
              value={slide.requiredFacts?.join("\n") ?? ""}
              onChange={(e) => onChange({ ...slide, requiredFacts: linesToArray(e.target.value) })}
              rows={4}
              placeholder="Mỗi dòng một dữ kiện/câu hỏi/đáp án/công thức cần giữ..."
              className={`${inputClass} resize-y leading-relaxed`}
            />
          </label>

          <QuizItemsField key={slide.id} slide={slide} onChange={onChange} />

          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-[#5c5b6e]">Phần trực quan</span>
            <div className="flex flex-col gap-2">
              <select
                value={slide.visual?.type ?? "none"}
                onChange={(e) => {
                  const type = e.target.value as SlideVisual["type"];
                  onChange({ ...slide, visual: { type, spec: slide.visual?.spec ?? "" } });
                }}
                className={`${inputClass} w-40`}
              >
                {VISUAL_TYPES.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              {slide.visual && slide.visual.type !== "none" ? (
                <textarea
                  value={slide.visual.spec}
                  onChange={(e) =>
                    onChange({
                      ...slide,
                      visual: { type: slide.visual?.type ?? "image", spec: e.target.value },
                    })
                  }
                  rows={2}
                  placeholder="Mô tả ảnh/công thức/bảng cần hiển thị…"
                  className={`${inputClass} resize-y leading-relaxed`}
                />
              ) : null}
            </div>
          </div>

          <label className="flex w-40 flex-col gap-1.5">
            <span className="text-xs font-medium text-[#5c5b6e]">Thời lượng (phút)</span>
            <input
              type="number"
              min={0}
              value={slide.durationMinutes ?? ""}
              onChange={(e) =>
                onChange({
                  ...slide,
                  durationMinutes: e.target.value === "" ? undefined : Number(e.target.value),
                })
              }
              className={inputClass}
            />
          </label>
        </div>

        <div className="border-t border-[rgba(26,26,46,0.08)] px-5 py-3 text-right">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-[#1c1b2e] px-5 py-2 text-sm font-medium text-[#f9f8f3] transition hover:bg-[#2a2940]"
          >
            Xong
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
