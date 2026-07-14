"use client";

import { EditorContent, useEditor } from "@tiptap/react";
import { createEditorExtensions } from "@/components/LessonEditor/editorConfig";

export function RichView({ html }: { html: string }) {
  const editor = useEditor({
    extensions: createEditorExtensions(),
    content: html,
    editable: false,
    immediatelyRender: false,
  });
  return <EditorContent editor={editor} className="tiptap" />;
}
