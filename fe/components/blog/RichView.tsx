"use client";

import { EditorContent, useEditor } from "@tiptap/react";
import { createEditorExtensions } from "@/components/LessonEditor/editorConfig";
import type { TiptapNode } from "@/lib/tiptap-to-text";

/**
 * `variant="document"` reuses the "lesson-document-editor" CSS (headings, tables, math)
 * that /lesson-edit renders with, instead of the lighter blog prose styling — needed for
 * previewing a full lesson-plan document (which always has tables/formulas) read-only.
 */
export function RichView({ html, variant = "blog" }: { html: string | TiptapNode; variant?: "blog" | "document" }) {
  const editor = useEditor({
    extensions: createEditorExtensions(),
    content: html,
    editable: false,
    immediatelyRender: false,
    editorProps:
      variant === "document"
        ? { attributes: { class: "lesson-document-editor text-[#2b2926]" } }
        : undefined,
  });
  return <EditorContent editor={editor} className={variant === "document" ? undefined : "tiptap"} />;
}
