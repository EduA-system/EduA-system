"use client";

import { useRef, useState } from "react";
import {
  resolveSlideMetadata,
  slideRoleLabel,
  slideRoleTone,
  type OutlinePart,
  type SlideItem,
} from "@/lib/api/slides";

function createDefaultSlide(id: string): SlideItem {
  return {
    id,
    title: "Slide mới",
    kind: "concept",
    pedagogicalRole: "explain",
    layoutHint: "bullets",
  };
}

export function OutlineEditor({
  lessonTitle,
  initialParts,
  onConfirm,
  confirming = false,
}: {
  lessonTitle: string;
  initialParts: OutlinePart[];
  onConfirm: (parts: OutlinePart[]) => void;
  confirming?: boolean;
}) {
  const [parts, setParts] = useState<OutlinePart[]>(initialParts);
  const [editingId, setEditingId] = useState<string | null>(null);
  const dragPartIndex = useRef<number | null>(null);

  const totalSlides = parts.reduce((sum, p) => sum + (p.slides?.length ?? 0), 0);

  function updatePartTitle(partId: string, title: string) {
    setParts((prev) => prev.map((p) => (p.id === partId ? { ...p, title } : p)));
  }

  function deletePart(partId: string) {
    setParts((prev) => prev.filter((p) => p.id !== partId));
  }

  function addPart() {
    const newPart: OutlinePart = {
      id: `p-${Date.now()}`,
      title: "Phần mới",
      slides: [createDefaultSlide(`p-${Date.now()}-s1`)],
    };
    setParts((prev) => [...prev, newPart]);
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
    setParts(next);
  }
  function onPartDragEnd() {
    dragPartIndex.current = null;
  }

  function updateSlideTitle(partId: string, slideId: string, title: string) {
    setParts((prev) =>
      prev.map((p) =>
        p.id !== partId
          ? p
          : {
              ...p,
              slides: p.slides.map((s) => (s.id === slideId ? { ...s, title } : s)),
            },
      ),
    );
  }

  function deleteSlide(partId: string, slideId: string) {
    setParts((prev) =>
      prev.map((p) =>
        p.id !== partId ? p : { ...p, slides: p.slides.filter((s) => s.id !== slideId) },
      ),
    );
  }

  function addSlide(partId: string) {
    const newSlide = createDefaultSlide(`${partId}-s${Date.now()}`);
    setParts((prev) =>
      prev.map((p) => (p.id !== partId ? p : { ...p, slides: [...p.slides, newSlide] })),
    );
    setEditingId(newSlide.id);
  }

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
          {parts.map((part, partIndex) => (
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
                <button
                  type="button"
                  onClick={() => deletePart(part.id)}
                  className="shrink-0 rounded-lg p-1 text-[#aeacb8] transition hover:bg-red-50 hover:text-red-500"
                  aria-label="Xóa phần"
                >
                  ×
                </button>
              </div>

              <ul className="mt-2 space-y-1 pl-6">
                {(part.slides ?? []).map((slide) => {
                  const metadata = resolveSlideMetadata(slide);
                  const label = slideRoleLabel({
                    kind: metadata.kind,
                    pedagogicalRole: metadata.pedagogicalRole,
                  });
                  const tone = slideRoleTone({
                    kind: metadata.kind,
                    pedagogicalRole: metadata.pedagogicalRole,
                  });
                  return (
                    <li key={slide.id} className="flex items-center gap-2">
                      <span className="text-[#d8d1c9]">└</span>
                      <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${tone}`}>
                        {label}
                      </span>
                      <div className="min-w-0 flex-1">
                        {editingId === slide.id ? (
                          <input
                            autoFocus
                            value={slide.title}
                            onChange={(e) => updateSlideTitle(part.id, slide.id, e.target.value)}
                            onBlur={() => setEditingId(null)}
                            onKeyDown={(e) => e.key === "Enter" && setEditingId(null)}
                            className="w-full rounded border border-[#c27aff]/40 px-2 py-0.5 text-xs text-[#1a1a2e] outline-none focus:ring-1 focus:ring-[#8200db]"
                          />
                        ) : (
                          <button
                            type="button"
                            onClick={() => setEditingId(slide.id)}
                            className="block w-full truncate text-left text-xs text-[#5c5b6e] hover:text-[#1a1a2e]"
                          >
                            {slide.title}
                          </button>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => deleteSlide(part.id, slide.id)}
                        className="shrink-0 text-[#aeacb8] hover:text-red-500"
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
          ))}
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
          <button
            type="button"
            onClick={() => onConfirm(parts)}
            disabled={totalSlides === 0 || confirming}
            className="flex h-[44px] w-full items-center justify-center rounded-xl bg-[#1c1b2e] text-sm font-medium text-[#f9f8f3] transition enabled:hover:bg-[#2a2940] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {confirming ? "Đang bắt đầu sinh slide…" : `Tạo ${totalSlides} slides →`}
          </button>
        </div>
      </div>
    </div>
  );
}
