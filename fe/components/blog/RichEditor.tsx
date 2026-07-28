"use client";

import { useEffect, useRef, useState } from "react";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import {
  Bold,
  Heading2,
  Italic,
  List,
  ListOrdered,
  Loader2,
  Strikethrough,
  Underline as UnderlineIcon,
} from "lucide-react";
import { createEditorExtensions } from "@/components/LessonEditor/editorConfig";
import { uploadFile } from "@/lib/blog";

function ToolbarButton({
  active,
  label,
  onClick,
  children,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`flex size-7 items-center justify-center rounded border text-[#4a4b5e] transition ${
        active ? "border-[#d97757] bg-[#fdf0ea] text-[#d97757]" : "border-[#eaeae7] hover:bg-[#f5f5f3]"
      }`}
    >
      {children}
    </button>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  return (
    <>
      <ToolbarButton label="Đậm" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}>
        <Bold className="size-3.5" />
      </ToolbarButton>
      <ToolbarButton label="Nghiêng" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}>
        <Italic className="size-3.5" />
      </ToolbarButton>
      <ToolbarButton label="Gạch chân" active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()}>
        <UnderlineIcon className="size-3.5" />
      </ToolbarButton>
      <ToolbarButton label="Gạch ngang" active={editor.isActive("strike")} onClick={() => editor.chain().focus().toggleStrike().run()}>
        <Strikethrough className="size-3.5" />
      </ToolbarButton>
      <ToolbarButton
        label="Tiêu đề"
        active={editor.isActive("heading", { level: 2 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      >
        <Heading2 className="size-3.5" />
      </ToolbarButton>
      <ToolbarButton label="Danh sách" active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}>
        <List className="size-3.5" />
      </ToolbarButton>
      <ToolbarButton
        label="Danh sách số"
        active={editor.isActive("orderedList")}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        <ListOrdered className="size-3.5" />
      </ToolbarButton>
    </>
  );
}

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
      <div className="mb-1 flex flex-wrap items-center gap-1">
        {editor && <Toolbar editor={editor} />}
        <span className="mx-1 h-5 w-px bg-[#eaeae7]" />
        <button
          onClick={() => fileRef.current?.click()}
          className="rounded border border-[#eaeae7] px-2 py-1 text-xs text-[#4a4b5e] disabled:opacity-50"
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
        className="tiptap min-h-[185px] rounded-[14px] border-[0.8px] border-[#eae2ce] bg-[#f7f7f5] p-[16.8px] text-[14px]"
      />
    </div>
  );
}
