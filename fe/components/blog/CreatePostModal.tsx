"use client";

import { useEffect, useRef, useState } from "react";
import { api, optimizeBlogCover, SUBJECTS, subjectLabel, uploadFile, type AuthFetch, type Detail, type SubjectValue } from "@/lib/blog";
import { RichEditor } from "./RichEditor";

const MAX_TITLE_LENGTH = 255;

type FieldErrors = {
  title?: string;
  content?: string;
};

function hasRequiredEditorContent(value: string): boolean {
  if (!value.trim()) return false;
  const document = new DOMParser().parseFromString(value, "text/html");
  const text = document.body.textContent?.replace(/\u00a0/g, " ").trim();
  return Boolean(text || document.body.querySelector("img, video, iframe"));
}

export function CreatePostModal({
  open,
  onClose,
  authFetch,
  onCreated,
  onPostUnavailable,
  post,
}: {
  open: boolean;
  onClose: () => void;
  authFetch: AuthFetch;
  onCreated: (savedPost: Detail) => void;
  onPostUnavailable?: () => void;
  post?: Detail | null;
}) {
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState<SubjectValue>(SUBJECTS[0]);
  const [content, setContent] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    queueMicrotask(() => {
      setTitle(post?.title ?? "");
      setSubject((post?.subject as SubjectValue | undefined) ?? SUBJECTS[0]);
      setContent(post?.content ?? "");
      setCoverImageUrl(post?.thumbnailUrl ?? null);
      setFieldErrors({});
      setError("");
    });
    document.body.style.overflow = "hidden";
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose, post]);

  function reset() {
    setTitle("");
    setSubject(SUBJECTS[0]);
    setContent("");
    setCoverImageUrl(null);
    setFieldErrors({});
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
      setCoverImageUrl(await uploadFile(authFetch, await optimizeBlogCover(file)));
    } catch (err) {
      if (post && err instanceof Error && err.message.includes("Blog post not found")) {
        onPostUnavailable?.();
        return;
      }
      setError(String(err));
    } finally {
      setUploadingCover(false);
    }
  }

  async function handleSubmit() {
    const validationErrors: FieldErrors = {
      title: !title.trim()
        ? "Vui lòng nhập tiêu đề bài viết."
        : title.length > MAX_TITLE_LENGTH
          ? `Tiêu đề không được vượt quá ${MAX_TITLE_LENGTH} ký tự.`
          : undefined,
      content: hasRequiredEditorContent(content) ? undefined : "Vui lòng nhập nội dung bài viết.",
    };
    if (validationErrors.title || validationErrors.content) {
      setFieldErrors(validationErrors);
      setError("");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const savedPost = await api<Detail>(authFetch, post ? `/blog-posts/${post.id}` : "/blog-posts", {
        method: post ? "PATCH" : "POST",
        body: JSON.stringify({ title, content, subject, thumbnailUrl: coverImageUrl ?? "" }),
      });
      onCreated(savedPost);
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
          <h2 className="text-[15px] font-bold text-[#1c1e2e]">{post ? "Sửa bài" : "Tạo bài viết mới"}</h2>
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
            <span className="text-[11px] font-bold uppercase tracking-[0.55px] text-[#9b9caf]">Tiêu đề <span className="text-red-600" aria-hidden="true">*</span></span>
            <input
              required
              value={title}
              onChange={(e) => { const value = e.target.value; setTitle(value); setFieldErrors((current) => ({ ...current, title: value.length > MAX_TITLE_LENGTH ? `Tiêu đề không được vượt quá ${MAX_TITLE_LENGTH} ký tự.` : undefined })); }}
              placeholder="Nhập tiêu đề bài viết..."
              aria-invalid={Boolean(fieldErrors.title)}
              aria-describedby={fieldErrors.title ? "edit-blog-title-error" : undefined}
              className={`mt-1.5 h-11 w-full rounded-[14px] border-[0.8px] bg-[#f7f7f5] px-4 text-[15px] text-[#1c1e2e] placeholder:text-[#c0c1d0] focus:outline-none ${fieldErrors.title ? "border-red-500" : "border-[#eaeae7]"}`}
            />
            {fieldErrors.title && <p id="edit-blog-title-error" className="mt-1.5 text-[13px] text-red-600" role="alert">{fieldErrors.title}</p>}
          </label>

          <label className="mt-4 block">
            <span className="text-[11px] font-bold uppercase tracking-[0.55px] text-[#9b9caf]">Chủ đề</span>
            <select
              value={subject}
              onChange={(e) => setSubject(e.target.value as SubjectValue)}
              disabled={Boolean(post)}
              className="mt-1.5 h-11 w-full rounded-[14px] border-[0.8px] border-[#eaeae7] bg-[#f7f7f5] px-4 text-[15px] text-[#1c1e2e] focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
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
                <div className="flex w-full items-center gap-3 px-3 text-left text-[12px] text-[#4a4b5e]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={coverImageUrl} alt="Ảnh đại diện bài viết" className="h-16 w-24 rounded-lg object-cover" />
                  <div>
                    <p>Ảnh đại diện đã sẵn sàng.</p>
                    <div className="mt-1.5 flex gap-3">
                      <button type="button" onClick={() => fileRef.current?.click()} className="font-semibold text-[#7661b3] underline">Đổi ảnh</button>
                      <button type="button" onClick={() => setCoverImageUrl(null)} className="font-semibold text-[#b45309] underline">Xóa ảnh</button>
                    </div>
                  </div>
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
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(e) => {
                  void handleCoverFile(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
            </div>
          </div>

          <div className="mt-4">
            <span className="text-[11px] font-bold uppercase tracking-[0.55px] text-[#9b9caf]">Nội dung <span className="text-red-600" aria-hidden="true">*</span></span>
            <div className={`mt-1.5 rounded-[14px] border ${fieldErrors.content ? "border-red-500" : "border-transparent"}`} aria-invalid={Boolean(fieldErrors.content)} aria-describedby={fieldErrors.content ? "edit-blog-content-error" : undefined}>
              <RichEditor authFetch={authFetch} initialContent={post?.content ?? ""} onChange={(value) => { setContent(value); setFieldErrors((current) => ({ ...current, content: undefined })); }} />
            </div>
            {fieldErrors.content && <p id="edit-blog-content-error" className="mt-1.5 text-[13px] text-red-600" role="alert">{fieldErrors.content}</p>}
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
