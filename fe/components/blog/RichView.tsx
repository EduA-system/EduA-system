"use client";

import { generateHTML, type JSONContent } from "@tiptap/core";
import { createEditorExtensions } from "@/components/LessonEditor/editorConfig";
import type { TiptapNode } from "@/lib/tiptap-to-text";

function toHtml(content: string | TiptapNode): string {
  if (typeof content === "string") return content;
  return generateHTML(content as JSONContent, createEditorExtensions());
}

/**
 * `variant="document"` reuses the "lesson-document-editor" CSS (headings, tables, math)
 * that /lesson-edit renders with, instead of the lighter blog prose styling — needed for
 * previewing a full lesson-plan document (which always has tables/formulas) read-only.
 */
export function RichView({ html, variant = "blog" }: { html: string | TiptapNode; variant?: "blog" | "document" }) {
  return (
    <div
      className={variant === "document" ? "lesson-document-editor text-[#2b2926]" : "tiptap"}
      dangerouslySetInnerHTML={{ __html: toHtml(html) }}
    />
  );
}
