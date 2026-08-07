"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { useAuth } from "@/lib/auth/AuthContext";
import { api, optimizeBlogCover, SUBJECTS, subjectLabel, uploadFile, type Detail, type SubjectValue } from "@/lib/blog";
import { RichEditor } from "./RichEditor";

const DRAFT_STORAGE_KEY = "edua:blog-create-draft";

type BlogDraft = {
  title: string;
  subject: SubjectValue;
  content: string;
  coverImageUrl: string | null;
};

function readStoredDraft(): BlogDraft | null {
  if (typeof window === "undefined") return null;
  const saved = window.localStorage.getItem(DRAFT_STORAGE_KEY);
  if (!saved) return null;
  try {
    const draft = JSON.parse(saved) as Partial<BlogDraft>;
    return {
      title: draft.title ?? "",
      subject: SUBJECTS.includes(draft.subject as SubjectValue) ? draft.subject as SubjectValue : SUBJECTS[0],
      content: draft.content ?? "",
      coverImageUrl: draft.coverImageUrl ?? null,
    };
  } catch {
    window.localStorage.removeItem(DRAFT_STORAGE_KEY);
    return null;
  }
}

export function CreateBlogPostPage() {
  const router = useRouter();
  const { authFetch } = useAuth();
  const [storedDraft] = useState(readStoredDraft);
  const [title, setTitle] = useState(() => storedDraft?.title ?? "");
  const [subject, setSubject] = useState<SubjectValue>(() => storedDraft?.subject ?? SUBJECTS[0]);
  const [content, setContent] = useState(() => storedDraft?.content ?? "");
  const [initialEditorContent, setInitialEditorContent] = useState(() => storedDraft?.content ?? "");
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(() => storedDraft?.coverImageUrl ?? null);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [draftRestored, setDraftRestored] = useState(() => Boolean(storedDraft));
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saveTimer = window.setTimeout(() => {
      if (!title.trim() && !content.trim() && !coverImageUrl) return;
      const draft: BlogDraft = { title, subject, content, coverImageUrl };
      window.localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
    }, 500);
    return () => window.clearTimeout(saveTimer);
  }, [title, subject, content, coverImageUrl]);

  async function handleCoverFile(file: File | undefined) {
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      setError("Ảnh đại diện chỉ hỗ trợ định dạng PNG, JPG hoặc WebP.");
      return;
    }
    setUploadingCover(true);
    setError("");
    try {
      setCoverImageUrl(await uploadFile(authFetch, await optimizeBlogCover(file)));
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
      await api<Detail>(authFetch, "/blog-posts", {
        method: "POST",
        body: JSON.stringify({ title, content, subject, thumbnailUrl: coverImageUrl }),
      });
      window.localStorage.removeItem(DRAFT_STORAGE_KEY);
      router.push("/blog?toast=created");
    } catch (err) {
      setError(String(err));
    } finally {
      setSubmitting(false);
    }
  }

  function discardDraft() {
    window.localStorage.removeItem(DRAFT_STORAGE_KEY);
    setTitle("");
    setSubject(SUBJECTS[0]);
    setContent("");
    setInitialEditorContent("");
    setCoverImageUrl(null);
    setDraftRestored(false);
  }

  return (
    <div className="flex min-h-screen bg-white">
      <Sidebar activeHref="/blog" />
      <main className="min-w-0 flex-1 px-6 py-8">
        <div className="mx-auto max-w-[1104px]">
          <Link href="/blog" className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[#77798c] transition hover:text-[#1c1e2e]">
            <span aria-hidden="true">←</span> Quay lại Blog
          </Link>
          <header className="mt-5 border-b border-[#eaeae7] pb-5">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#7661b3]">Cộng đồng giáo viên</p>
            <h1 className="mt-1 text-[30px] font-bold tracking-[-0.04em] text-[#1c1e2e]">Tạo bài viết mới</h1>
            <p className="mt-1 text-[14px] text-[#77798c]">Chia sẻ ý tưởng và kinh nghiệm giảng dạy với cộng đồng EDUA.</p>
          </header>

          <section className="mt-6">
            {draftRestored && (
              <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-[#ddd4f5] bg-[#f7f4ff] px-4 py-3 text-sm text-[#4d3c83] sm:flex-row sm:items-center sm:justify-between">
                <span>Đã khôi phục bản nháp chưa đăng của bạn.</span>
                <button type="button" onClick={discardDraft} className="self-start font-semibold underline sm:self-auto">Bỏ bản nháp</button>
              </div>
            )}
            <div className="rounded-2xl border border-[#eaeae7] bg-white p-5 shadow-sm sm:p-7">
              <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_260px]">
                <label className="block">
              <span className="text-[11px] font-bold uppercase tracking-[0.55px] text-[#9b9caf]">Tiêu đề</span>
              <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Nhập tiêu đề bài viết..." className="mt-1.5 h-11 w-full rounded-[14px] border-[0.8px] border-[#eaeae7] bg-[#f7f7f5] px-4 text-[15px] text-[#1c1e2e] placeholder:text-[#c0c1d0] focus:outline-none" />
                </label>

                <label className="block">
              <span className="text-[11px] font-bold uppercase tracking-[0.55px] text-[#9b9caf]">Chủ đề</span>
              <select value={subject} onChange={(event) => setSubject(event.target.value as SubjectValue)} className="mt-1.5 h-11 w-full rounded-[14px] border-[0.8px] border-[#eaeae7] bg-[#f7f7f5] px-4 text-[15px] text-[#1c1e2e] focus:outline-none">
                {SUBJECTS.map((item) => <option key={item} value={item}>{subjectLabel(item)}</option>)}
              </select>
                </label>
              </div>

              <div className="mt-5">
              <span className="text-[11px] font-bold uppercase tracking-[0.55px] text-[#9b9caf]">Ảnh đại diện <span className="font-normal normal-case text-[#c0c1d0]">(tùy chọn)</span></span>
              <div onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); void handleCoverFile(event.dataTransfer.files?.[0]); }} className="mt-1.5 rounded-[14px] border-[1.6px] border-dashed border-[#d8d8d5] p-3 text-center">
                {coverImageUrl ? <div className="flex flex-col items-center gap-3 sm:flex-row sm:text-left"><img src={coverImageUrl} alt="Ảnh đại diện bài viết" className="h-20 w-32 rounded-lg object-cover" /><div className="text-[12px] text-[#4a4b5e]"><p>Ảnh đại diện đã sẵn sàng.</p><div className="mt-2 flex justify-center gap-3 sm:justify-start"><button type="button" onClick={() => fileRef.current?.click()} className="font-semibold text-[#7661b3] underline">Đổi ảnh</button><button type="button" onClick={() => setCoverImageUrl(null)} className="font-semibold text-[#b45309] underline">Xóa ảnh</button></div></div></div> : <div className="flex h-20 flex-col items-center justify-center gap-2 text-[12px] text-[#9b9caf]">{uploadingCover ? "Đang tải ảnh..." : <>Kéo thả ảnh PNG/JPG hoặc <button type="button" onClick={() => fileRef.current?.click()} className="font-semibold text-[#f5a623]">chọn file</button></>}</div>}
                <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(event) => { void handleCoverFile(event.target.files?.[0]); event.target.value = ""; }} />
              </div>
              </div>
            </div>

            <div className="mt-7">
              <span className="text-[11px] font-bold uppercase tracking-[0.55px] text-[#9b9caf]">Nội dung</span>
              <p className="mt-1 text-[13px] text-[#9b9caf]">Soạn bài viết chi tiết như một tài liệu. Bạn có thể chèn tiêu đề, danh sách, bảng, công thức và dán ảnh trực tiếp.</p>
              <div className="mt-3 rounded-2xl border border-[#e8e2d9] bg-[#f3efe9] p-2 shadow-sm sm:p-3">
                <RichEditor
                  authFetch={authFetch}
                  initialContent={initialEditorContent}
                  onChange={setContent}
                  onUploadError={setError}
                  stickyToolbar
                  heightClassName="min-h-[calc(100vh-380px)]"
                  editorClassName="bg-white px-6 py-8 text-[16px] shadow-[0_1px_2px_rgba(43,41,38,0.06),0_4px_14px_rgba(43,41,38,0.05)] sm:px-12 sm:py-12"
                />
              </div>
            </div>

            {error && <p className="mt-4 text-[13px] text-red-600">{error}</p>}

            <div className="mt-7 flex items-center justify-between border-t border-[#eaeae7] pt-5">
              <p className="text-[12px] text-[#9b9caf]">Tự động lưu bản nháp trên thiết bị này.</p>
              <div className="flex items-center gap-2"><Link href="/blog" className="h-10 rounded-[14px] border border-[#eaeae7] px-4 py-2.5 text-[13px] font-semibold text-[#4a4b5e]">Quay lại</Link><button type="button" onClick={handleSubmit} disabled={submitting || uploadingCover} className="h-10 rounded-[14px] bg-[#1c1e2e] px-5 text-[13px] font-semibold text-white disabled:opacity-50">{submitting ? "Đang đăng..." : "Đăng bài"}</button></div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
