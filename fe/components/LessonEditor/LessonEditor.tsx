"use client";

import { EditorContent, type Editor } from "@tiptap/react";

interface LessonEditorProps {
  margins: { left: number; right: number };
  editor: Editor | null;
}

export function LessonEditor({ margins, editor }: LessonEditorProps) {
  return (
    <div className="pb-10">
      <div className="mx-auto w-full max-w-[816px]">
        <EditorContent
          editor={editor}
          className="bg-white py-14 shadow-[0_1px_2px_rgba(43,41,38,0.06),0_4px_14px_rgba(43,41,38,0.05)]"
          style={{
            paddingLeft: margins.left,
            paddingRight: margins.right,
          }}
        />
      </div>
    </div>
  );
}
