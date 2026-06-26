"use client";

import { useMemo, useRef } from "react";
import { lessonMock } from "@/data/lessonMock";
import type { Lesson } from "@/data/lessonMock";

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function lessonToDocumentHtml(lesson: Lesson) {
  const sections = lesson.sections
    .map((section, index) => {
      const items = section.items
        .map((item) => `<li>${escapeHtml(item.text)}</li>`)
        .join("");

      return `
        <section>
          <h2>${index + 1}. ${escapeHtml(section.title)}</h2>
          <ul>${items}</ul>
        </section>
      `;
    })
    .join("");

  return `
    <h1>${escapeHtml(lesson.title)}</h1>
    <p class="document-meta">${escapeHtml(lesson.subject)} / Lop ${escapeHtml(lesson.grade)} / ${escapeHtml(lesson.duration)}</p>
    ${sections}
  `;
}

interface LessonEditorProps {
  margins: { left: number; right: number };
}

export function LessonEditor({ margins }: LessonEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const initialHtml = useMemo(() => lessonToDocumentHtml(lessonMock), []);

  const handleInput = () => {
    // Keep the handler for future autosave hooks without making typing controlled.
  };

  return (
    <div className="pb-10">
      <div className="mx-auto w-full max-w-[816px]">
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          spellCheck={false}
          className="lesson-document-editor min-h-[calc(100vh-188px)] bg-white py-14 text-[#2b2926] shadow-[0_1px_2px_rgba(43,41,38,0.06),0_4px_14px_rgba(43,41,38,0.05)] outline-none"
          style={{
            paddingLeft: margins.left,
            paddingRight: margins.right,
          }}
          dangerouslySetInnerHTML={{ __html: initialHtml }}
          onInput={handleInput}
        />
      </div>
    </div>
  );
}