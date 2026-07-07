"use client";

import { useEffect, useRef, useState } from "react";
import { api, SUBJECTS, subjectLabel, uploadFile, type Detail, type SubjectValue } from "@/lib/blog";
import { RichEditor } from "./RichEditor";

export function CreatePostModal({
  open,
  onClose,
  token,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  token: string;
  onCreated: () => void;
}) {
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState<SubjectValue>(SUBJECTS[0]);
  const [content, setContent] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  function reset() {
    setTitle("");
    setSubject(SUBJECTS[0]);
    setContent("");
    setCoverImageUrl(null);
    setError("");
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function handleCoverFile(file: File | undefined) {
    if (!file) return;
    setUploadingCover(true);
    try {
      setCoverImageUrl(await uploadFile(token, file));
    } catch (err) {
      setError(String(err));
    } finally {
      setUploadingCover(false);
    }
  }

  async function handleSubmit() {
    if (!title.trim() || !content.trim()) {
      setError("Vui lòng nhập tiêu đề và nội dung.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const finalContent = coverImageUrl
        ? `<p><img src="${coverImageUrl}" alt="" /></p>${content}`
        : content;
      await api<Detail>("/blog-posts", token, {
        method: "POST",
        body: JSON.stringify({ title, content: finalContent, subject }),
      });
      onCreated();
      handleClose();
    } catch (err) {
      setError(String(err));
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 px-4 py-12"
      role="dialog"
      aria-modal="true"
      onClick={handleClose}
    >
      <div
        className="w-full max-w-[672px] rounded-2xl bg-white shadow-[0px_24px_64px_0px_rgba(0,0,0,0.12),0px_4px_16px_0px_rgba(0,0,0,0.06)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b-[0.8px] border-[#eaeae7] px-6 py-4">
          <h2 className="text-[15px] font-bold text-[#1c1e2e]">Tạo bài viết mới</h2>
          <button
            type="button"
            onClick={handleClose}
            className="flex size-8 items-center justify-center rounded-[14px] text-[#9b9caf] hover:bg-[#f7f7f5]"
          >
            ✕
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-6">
          <label className="block">
            <span className="text-[11px] font-bold uppercase tracking-[0.55px] text-[#9b9caf]">Tiêu đề</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Nhập tiêu đề bài viết..."
              className="mt-1.5 h-11 w-full rounded-[14px] border-[0.8px] border-[#eaeae7] bg-[#f7f7f5] px-4 text-[15px] text-[#1c1e2e] placeholder:text-[#c0c1d0] focus:outline-none"
            />
          </label>

          <label className="mt-4 block">
            <span className="text-[11px] font-bold uppercase tracking-[0.55px] text-[#9b9caf]">Chủ đề</span>
            <select
              value={subject}
              onChange={(e) => setSubject(e.target.value as SubjectValue)}
              className="mt-1.5 h-11 w-full rounded-[14px] border-[0.8px] border-[#eaeae7] bg-[#f7f7f5] px-4 text-[15px] text-[#1c1e2e] focus:outline-none"
            >
              {SUBJECTS.map((s) => (
                <option key={s} value={s}>{subjectLabel(s)}</option>
              ))}
            </select>
          </label>

          <div className="mt-4">
            <span className="text-[11px] font-bold uppercase tracking-[0.55px] text-[#9b9caf]">
              Ảnh đại diện <span className="font-normal normal-case text-[#c0c1d0]">(tuỳ chọn)</span>
            </span>
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                void handleCoverFile(e.dataTransfer.files?.[0]);
              }}
              className="mt-1.5 flex h-24 flex-col items-center justify-center gap-2 rounded-[14px] border-[1.6px] border-dashed border-[#d8d8d5] text-center"
            >
              {coverImageUrl ? (
                <div className="flex items-center gap-2 text-[12px] text-[#4a4b5e]">
                  <span>Đã tải ảnh lên</span>
                  <button type="button" onClick={() => setCoverImageUrl(null)} className="text-[#b45309] underline">
                    Xoá ảnh
                  </button>
                </div>
              ) : (
                <p className="text-[12px] text-[#9b9caf]">
                  {uploadingCover ? "Đang tải..." : (
                    <>
                      Kéo thả hoặc{" "}
                      <button type="button" onClick={() => fileRef.current?.click()} className="font-semibold text-[#f5a623]">
                        chọn file
                      </button>
                    </>
                  )}
                </p>
              )}
              <input
                ref={fileRef}
                type="file"
                accept=".png,.jpg,.jpeg"
                className="hidden"
                onChange={(e) => {
                  void handleCoverFile(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
            </div>
          </div>

          <div className="mt-4">
            <span className="text-[11px] font-bold uppercase tracking-[0.55px] text-[#9b9caf]">Nội dung</span>
            <div className="mt-1.5">
              <RichEditor token={token} onChange={setContent} />
            </div>
          </div>

          {error && <p className="mt-3 text-[13px] text-red-600">{error}</p>}
        </div>

        <div className="flex items-center justify-between border-t-[0.8px] border-[#eaeae7] bg-[#fcfcfb] px-6 py-4">
          <p className="text-[12px] text-[#c0c1d0]">Bài viết sẽ được đăng công khai</p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleClose}
              className="h-9 rounded-[14px] border-[0.8px] border-[#eaeae7] px-4 text-[13px] font-semibold text-[#4a4b5e]"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="h-9 rounded-[14px] bg-[#1c1e2e] px-5 text-[13px] font-semibold text-white disabled:opacity-50"
            >
              {submitting ? "Đang đăng..." : "Đăng bài"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
