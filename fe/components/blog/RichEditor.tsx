"use client";

import { useEffect, useRef, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import { createEditorExtensions } from "@/components/LessonEditor/editorConfig";
import { uploadFile } from "@/lib/blog";

// ---- editor dùng đúng cấu hình lesson (TipTap) ----
export function RichEditor({ onChange, token, initialContent = "" }: { onChange: (html: string) => void; token: string; initialContent?: string }) {
  const editor = useEditor({
    extensions: createEditorExtensions(),
    content: initialContent,
    immediatelyRender: false,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (editor && editor.getHTML() !== initialContent) editor.commands.setContent(initialContent);
  }, [editor, initialContent]);

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadFile(token, file);
      editor?.chain().focus().setImage({ src: url }).run();
    } catch (err) {
      alert(String(err));
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  return (
    <div>
      <div className="mb-1 flex gap-1">
        <button
          onClick={() => fileRef.current?.click()}
          className="rounded border border-[#eaeae7] px-2 py-1 text-xs text-[#4a4b5e] disabled:opacity-50"
          type="button"
          disabled={uploading}
        >
          {uploading ? "Đang tải…" : "Chèn ảnh"}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".png,.jpg,.jpeg"
          className="hidden"
          onChange={handleImageUpload}
        />
      </div>
      <EditorContent
        editor={editor}
        className="tiptap min-h-[185px] rounded-[14px] border-[0.8px] border-[#eae2ce] bg-[#f7f7f5] p-[16.8px] text-[14px]"
      />
    </div>
  );
}
