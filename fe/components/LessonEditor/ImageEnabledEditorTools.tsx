"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Editor } from "@tiptap/react";
import { uploadFile, type AuthFetch } from "@/lib/blog";
import { EditorTools } from "./EditorTools";

export function ImageEnabledEditorTools({ editor, authFetch }: { editor: Editor | null; authFetch: AuthFetch }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const uploadImage = useCallback(async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Chỉ có thể chèn tệp hình ảnh.");
      return;
    }
    setUploading(true);
    setError("");
    try {
      const url = await uploadFile(authFetch, file);
      editor?.chain().focus().setImage({ src: url }).run();
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Không thể tải ảnh. Vui lòng thử lại.");
    } finally {
      setUploading(false);
    }
  }, [authFetch, editor]);

  useEffect(() => {
    const element = editor?.view.dom;
    if (!element) return;
    const handlePaste = (event: ClipboardEvent) => {
      const imageFile = Array.from(event.clipboardData?.files ?? []).find((file) => file.type.startsWith("image/"));
      if (!imageFile) return;
      event.preventDefault();
      void uploadImage(imageFile);
    };
    element.addEventListener("paste", handlePaste, true);
    return () => element.removeEventListener("paste", handlePaste, true);
  }, [editor, uploadImage]);

  return (
    <div className="w-full">
      <EditorTools
        editor={editor}
        showImageUrlTool={false}
        onImageUpload={() => fileRef.current?.click()}
        imageUploadDisabled={uploading}
      />
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          void uploadImage(event.target.files?.[0]);
          event.target.value = "";
        }}
      />
      {error && <p className="mt-1 text-xs text-[#c0492b]" role="alert">{error}</p>}
    </div>
  );
}
