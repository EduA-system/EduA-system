"use client";

import { useEffect, useMemo } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import { createEditorExtensions } from "@/components/LessonEditor/editorConfig";
import type { TiptapNode } from "@/lib/tiptap-to-text";

/**
 * `variant="document"` reuses the "lesson-document-editor" CSS (headings, tables, math)
 * that /lesson-edit renders with, instead of the lighter blog prose styling — needed for
 * previewing a full lesson-plan document (which always has tables/formulas) read-only.
 */
export function RichView({ html, variant = "blog" }: { html: string | TiptapNode; variant?: "blog" | "document" }) {
  const contentKey = useMemo(() => (typeof html === "string" ? html : JSON.stringify(html)), [html]);
  const editor = useEditor({
    extensions: createEditorExtensions(),
    content: html,
    editable: false,
    immediatelyRender: false,
    editorProps:
      variant === "document" ? { attributes: { class: "lesson-document-editor text-[#2b2926]" } } : {},
  });

  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    if (typeof html === "string") {
      if (editor.getHTML() !== html) editor.commands.setContent(html);
      return;
    }
    if (JSON.stringify(editor.getJSON()) !== contentKey) editor.commands.setContent(html);
  }, [contentKey, editor, html]);

  return <EditorContent editor={editor} className={variant === "document" ? undefined : "tiptap"} />;
}
