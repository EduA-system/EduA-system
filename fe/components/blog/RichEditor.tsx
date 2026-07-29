"use client";

import { useEffect, useRef, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import { Loader2 } from "lucide-react";
import { EditorTools, createEditorExtensions } from "@/components/LessonEditor";
import { uploadFile } from "@/lib/blog";

// ---- editor dùng đúng cấu hình VÀ toolbar của LessonEditor (TipTap) ----
export function RichEditor({
  onChange,
  token,
  initialContent = "",
  heightClassName = "min-h-[185px]",
}: {
  onChange: (html: string) => void;
  token: string;
  initialContent?: string;
  /** Tailwind height utility cho khung soạn thảo. Mặc định tự cao dần theo nội dung
   * (blog); truyền `"h-[280px] overflow-y-auto"` để có khung cao cố định + cuộn. */
  heightClassName?: string;
}) {
  const editor = useEditor({
    extensions: createEditorExtensions(),
    content: initialContent,
    immediatelyRender: false,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    // "lesson-document-editor" la class ProseMirror thuc su nhan (dat truc tiep len node
    // contenteditable qua editorProps, khac voi className tren <EditorContent> chi ap dung
    // cho div bao ngoai) - tai dung nguyen CSS dinh dang h1/h2/h3/list/bang/bold... da co
    // san cho /lesson-edit, thay vi de trong khong co style (khien Bold/Heading/List doi
    // the HTML dung nhung khong thay doi gi ve mat hien thi).
    editorProps: {
      attributes: {
        class: "lesson-document-editor outline-none",
      },
    },
  });
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  // CHỈ dùng để nạp nội dung ban đầu (hoặc reset khi đổi bài đang sửa) — component cha
  // KHÔNG được truyền lại chính giá trị lấy từ onChange vào initialContent, nếu không
  // mỗi lần gõ sẽ tự gọi setContent lại, làm mất vị trí con trỏ và lịch sử Undo/Redo.
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
      <div className="mb-1.5 flex flex-wrap items-center gap-2 overflow-x-auto">
        <div className="inline-flex max-w-full rounded-lg border border-[#e8e2d9] bg-white px-2 py-1 shadow-sm">
          <EditorTools editor={editor} />
        </div>
        <button
          onClick={() => fileRef.current?.click()}
          title="Tải ảnh từ máy lên và chèn vào bài"
          className="flex h-8 shrink-0 items-center gap-1.5 rounded-md border border-[#e8e2d9] bg-white px-2.5 text-[12px] font-medium text-[#4f4943] transition hover:bg-[#f3efe9] disabled:cursor-not-allowed disabled:opacity-50"
          type="button"
          disabled={uploading}
        >
          {uploading ? <Loader2 className="size-3.5 animate-spin" /> : "Chèn ảnh"}
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
        className={`tiptap ${heightClassName} rounded-[14px] border-[0.8px] border-[#eae2ce] bg-[#f7f7f5] p-[16.8px] text-[14px]`}
      />
    </div>
  );
}
