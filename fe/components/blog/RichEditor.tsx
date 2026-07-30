"use client";

import { useEffect, useRef, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import { Loader2 } from "lucide-react";
import { EditorTools, createEditorExtensions } from "@/components/LessonEditor";
import { uploadFile, type AuthFetch } from "@/lib/blog";

// ---- editor dùng đúng cấu hình VÀ toolbar của LessonEditor (TipTap) ----
export function RichEditor({
  onChange,
  authFetch,
  initialContent = "",
  heightClassName = "min-h-[185px]",
  editorClassName = "",
  onUploadError,
  stickyToolbar = false,
}: {
  onChange: (html: string) => void;
  authFetch: AuthFetch;
  initialContent?: string;
  /** Tailwind height utility cho khung soạn thảo. Mặc định tự cao dần theo nội dung
   * (blog); truyền `"h-[280px] overflow-y-auto"` để có khung cao cố định + cuộn. */
  heightClassName?: string;
  /** Class bổ sung cho vùng nội dung, dùng khi cần bố cục dạng tài liệu dài. */
  editorClassName?: string;
  onUploadError?: (message: string) => void;
  stickyToolbar?: boolean;
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
      handlePaste: (_view, event) => {
        const imageFile = Array.from(event.clipboardData?.files ?? []).find((file) => file.type.startsWith("image/"));
        if (!imageFile) return false;

        void (async () => {
          try {
            const url = await uploadFile(authFetch, imageFile);
            editor?.chain().focus().setImage({ src: url }).run();
          } catch (err) {
            onUploadError?.(String(err));
          }
        })();
        return true;
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
      const url = await uploadFile(authFetch, file);
      editor?.chain().focus().setImage({ src: url }).run();
    } catch (err) {
      onUploadError?.(String(err));
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  return (
    <div>
      <div className={`${stickyToolbar ? "sticky top-3 z-30 rounded-xl bg-[#f3efe9] p-2 shadow-[0_8px_24px_rgba(43,41,38,0.12)]" : "relative z-20"} mb-1.5 flex flex-wrap items-center gap-2 overflow-visible`}>
        <div className="flex w-full rounded-lg border border-[#e8e2d9] bg-white px-2 py-1 shadow-sm">
          <EditorTools
            editor={editor}
            showImageUrlTool={false}
            onImageUpload={() => fileRef.current?.click()}
            imageUploadDisabled={uploading}
          />
        </div>
        <button
          onClick={() => fileRef.current?.click()}
          title="Tải ảnh từ máy lên và chèn vào bài"
          className="hidden"
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
        className={`tiptap ${heightClassName} rounded-[14px] border-[0.8px] border-[#eae2ce] bg-[#f7f7f5] p-[16.8px] text-[14px] ${editorClassName}`}
      />
    </div>
  );
}
