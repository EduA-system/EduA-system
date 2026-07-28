"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  Download,
  Library,
  Loader2,
  Paperclip,
  RotateCcw,
  Send,
  UploadCloud,
  X,
} from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import { RichEditor } from "@/components/blog/RichEditor";
import { RichView } from "@/components/blog/RichView";
import { useAuth } from "@/lib/auth/AuthContext";
import {
  type ClassDetail,
  type ClassResourceSummary,
  type SubmissionDetail,
  type SubmissionFileItem,
  formatFileSize,
  getClassDetail,
  getMySubmission,
  listClassResources,
  sourceTypeLabel,
  submissionStatusLabel,
  submitAssignment,
  unsubmitAssignment,
  uploadClassResourceFile,
} from "@/lib/classroom";
import { deadlineClasses, formatDateTime, isOverdue } from "./shared";

function hasTextContent(html: string): boolean {
  return html.replace(/<[^>]*>/g, "").trim().length > 0;
}

export function ResourceDetailPage() {
  const { user, authFetch, accessToken } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const classId = searchParams.get("classId") ?? "";
  const resourceId = searchParams.get("resourceId") ?? "";
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [classDetail, setClassDetail] = useState<ClassDetail | null>(null);
  const [resource, setResource] = useState<ClassResourceSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [submission, setSubmission] = useState<SubmissionDetail | null>(null);
  const [submissionLoading, setSubmissionLoading] = useState(false);

  const [textContent, setTextContent] = useState("");
  const [files, setFiles] = useState<SubmissionFileItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [unsubmitting, setUnsubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    if (!classId || !resourceId) return;
    setLoading(true);
    setError("");
    setSuccessMessage("");
    try {
      const [detail, resourcePage] = await Promise.all([
        getClassDetail(authFetch, classId),
        listClassResources(authFetch, classId, 0, 200),
      ]);
      setClassDetail(detail);
      const found = resourcePage.items.find((item) => item.id === resourceId) ?? null;
      setResource(found);
      if (!found) {
        setError("Không tìm thấy tài nguyên này trong lớp.");
        return;
      }
      if (found.submissionEnabled) {
        setSubmissionLoading(true);
        try {
          const own = await getMySubmission(authFetch, classId, resourceId);
          setSubmission(own);
          setTextContent(own?.textContent ?? "");
          setFiles(own?.files ?? []);
        } finally {
          setSubmissionLoading(false);
        }
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không thể tải tài nguyên. Lớp hoặc tài nguyên có thể không tồn tại.");
    } finally {
      setLoading(false);
    }
  }, [authFetch, classId, resourceId]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function handleAddFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setUploading(true);
    setFormError("");
    try {
      const uploaded = await uploadClassResourceFile(authFetch, file);
      setFiles((prev) => [
        ...prev,
        { fileName: uploaded.fileName, url: uploaded.url, contentType: uploaded.contentType, sizeBytes: uploaded.sizeBytes },
      ]);
    } catch (reason) {
      setFormError(reason instanceof Error ? reason.message : "Không thể tải tệp lên.");
    } finally {
      setUploading(false);
    }
  }

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit() {
    if (!classId || !resourceId) return;
    if (!hasTextContent(textContent) && files.length === 0) {
      setFormError("Bạn cần nhập nội dung hoặc đính kèm ít nhất 1 tệp để nộp bài.");
      return;
    }
    setSubmitting(true);
    setFormError("");
    setSuccessMessage("");
    try {
      const saved = await submitAssignment(authFetch, classId, resourceId, {
        textContent: hasTextContent(textContent) ? textContent : null,
        files,
      });
      setSubmission(saved);
      setSuccessMessage("Nộp bài thành công.");
    } catch (reason) {
      setFormError(reason instanceof Error ? reason.message : "Không thể nộp bài.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUnsubmit() {
    if (!classId || !resourceId) return;
    if (!window.confirm("Bạn có chắc chắn muốn thu hồi bài nộp này không? Bạn có thể nộp lại sau.")) return;
    setUnsubmitting(true);
    setFormError("");
    setSuccessMessage("");
    try {
      await unsubmitAssignment(authFetch, classId, resourceId);
      setSubmission(null);
      setTextContent("");
      setFiles([]);
      setSuccessMessage("Đã thu hồi bài nộp.");
    } catch (reason) {
      setFormError(reason instanceof Error ? reason.message : "Không thể thu hồi bài nộp.");
    } finally {
      setUnsubmitting(false);
    }
  }

  if (!user) return null;

  const classInactive = classDetail?.status === "INACTIVE";
  const SourceIcon = resource?.sourceType === "LIBRARY_SNAPSHOT" ? Library : UploadCloud;

  return (
    <main className="min-h-screen bg-[#f5f1ec] text-[#1f1f1f]">
      <header className="sticky top-0 z-30 flex h-14 items-center border-b border-[#d8d1c9] bg-[#f7f5f2] px-4 md:hidden">
        <button
          type="button"
          onClick={() => setMobileMenuOpen(true)}
          className="inline-flex size-9 items-center justify-center rounded-lg text-[#1f1f1f] transition hover:bg-[#edeae5]"
          aria-label="Mở menu chức năng"
        >
          <span className="flex w-4 flex-col gap-1" aria-hidden>
            <span className="h-0.5 w-full rounded bg-current" />
            <span className="h-0.5 w-full rounded bg-current" />
            <span className="h-0.5 w-full rounded bg-current" />
          </span>
        </button>
        <div className="ml-3 flex items-center gap-2 text-sm font-semibold">EDUA</div>
      </header>

      {mobileMenuOpen && (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-black/25 md:hidden"
          aria-label="Đóng menu chức năng"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <div className="flex min-h-[calc(100vh-3.5rem)] md:min-h-screen">
        <Sidebar activeHref="/list-class" responsive mobileOpen={mobileMenuOpen} />

        <section className="min-w-0 flex-1 px-5 py-8 sm:px-8 lg:px-10 lg:py-12">
          <div className="mx-auto w-full max-w-[860px]">
            <div className="flex items-center gap-2 text-[12px] font-medium text-[#6b6b6b]">
              <button
                type="button"
                onClick={() => router.push(classId ? `/list-class?classId=${classId}` : "/list-class")}
                className="inline-flex items-center gap-1.5 transition hover:text-[#1f1f1f]"
              >
                <ArrowLeft className="size-3.5" /> {classDetail?.name ?? "Lớp học"}
              </button>
              {resource && (
                <>
                  <span className="text-[#c9c2b8]">/</span>
                  <span className="text-[#1f1f1f]">{resource.title}</span>
                </>
              )}
            </div>

            {error && (
              <div className="mt-4 flex items-start gap-2 rounded-[12px] border border-[#e8b4a4] bg-[#fdf3ef] px-4 py-3 text-[13px] text-[#c0492b]">
                <AlertCircle className="mt-0.5 size-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {loading || !resource ? (
              <div className="mt-4 space-y-4">
                <div className="h-[140px] animate-pulse rounded-[14px] bg-[#e8e2db]" />
                <div className="h-[220px] animate-pulse rounded-[14px] bg-[#e8e2db]" />
              </div>
            ) : (
              <>
                <div className="mt-4 rounded-[14px] border border-[#d8d1c9] bg-white p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded-full border border-[#d8d1c9] bg-[#faf9f7] px-2.5 py-1 text-[11px] font-medium text-[#6b6b6b]">
                      <SourceIcon className="size-3" /> {sourceTypeLabel(resource.sourceType)}
                    </span>
                    {resource.submissionEnabled && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-[#f0d9aa] bg-[#fff7df] px-2.5 py-1 text-[11px] font-medium text-[#9a661c]">
                        {submissionStatusLabel(submission ? submission.status : "NOT_SUBMITTED")}
                      </span>
                    )}
                  </div>

                  <h1 className="font-libertine mt-3 text-[28px] font-normal leading-tight">{resource.title}</h1>
                  {resource.description && (
                    <p className="mt-2 text-[13px] leading-[21px] text-[#6b6b6b]">{resource.description}</p>
                  )}

                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    {resource.attachment?.url && (
                      <a
                        href={resource.attachment.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-[10px] border border-[#d8d1c9] bg-[#faf9f7] px-2.5 py-1.5 text-[11.5px] font-medium text-[#1f1f1f] transition hover:bg-[#f5f1ec]"
                      >
                        <Paperclip className="size-3.5 text-[#8a837b]" />
                        <span className="max-w-[220px] truncate">{resource.attachment.fileName ?? "Tệp đính kèm"}</span>
                        {resource.attachment.sizeBytes !== null && (
                          <span className="text-[#8a837b]">· {formatFileSize(resource.attachment.sizeBytes)}</span>
                        )}
                        <Download className="size-3.5 text-[#8a837b]" />
                      </a>
                    )}
                    {resource.deadline && (
                      <span className={`inline-flex items-center gap-1.5 rounded-[10px] border px-2.5 py-1.5 text-[11.5px] font-medium ${deadlineClasses(resource.deadline)}`}>
                        <CalendarClock className="size-3.5" />
                        {isOverdue(resource.deadline) ? "Quá hạn" : "Hạn nộp"}: {formatDateTime(resource.deadline)}
                      </span>
                    )}
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-[#ede8e1] pt-2.5 text-[11.5px] text-[#8a837b]">
                    <span>{resource.postedByName ?? "Giáo viên"}</span>
                    <span>{formatDateTime(resource.postedAt)}</span>
                  </div>
                </div>

                {resource.submissionEnabled ? (
                  <div className="mt-6 rounded-[14px] border border-[#d8d1c9] bg-white p-5">
                    <h2 className="text-[14px] font-semibold text-[#1f1f1f]">Bài nộp của bạn</h2>

                    {classInactive && (
                      <p className="mt-3 rounded-[10px] border border-[#e6d8cb] bg-[#f8f2ec] px-3 py-2 text-[12px] leading-5 text-[#8a5a35]">
                        Lớp đang ở chế độ lưu trữ (Inactive) — bạn chỉ có thể xem lại bài đã nộp, không thể nộp mới hoặc thu hồi.
                      </p>
                    )}

                    {formError && (
                      <div className="mt-3 flex items-start gap-2 rounded-[12px] border border-[#e8b4a4] bg-[#fdf3ef] px-4 py-3 text-[13px] text-[#c0492b]">
                        <AlertCircle className="mt-0.5 size-4 shrink-0" />
                        <span>{formError}</span>
                      </div>
                    )}
                    {successMessage && (
                      <div className="mt-3 flex items-start gap-2 rounded-[12px] border border-[#b7e0c4] bg-[#f0faf3] px-4 py-3 text-[13px] text-[#287447]">
                        <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
                        <span>{successMessage}</span>
                      </div>
                    )}

                    {submissionLoading ? (
                      <div className="mt-4 h-[120px] animate-pulse rounded-[12px] bg-[#e8e2db]" />
                    ) : classInactive ? (
                      submission ? (
                        <div className="mt-4 space-y-3">
                          {submission.textContent && (
                            <div className="rounded-[12px] border border-[#ede8e1] bg-[#faf9f7] p-3">
                              <RichView html={submission.textContent} />
                            </div>
                          )}
                          {submission.files.length > 0 && (
                            <ul className="space-y-2">
                              {submission.files.map((file) => (
                                <li key={file.url}>
                                  <a
                                    href={file.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1.5 rounded-[10px] border border-[#d8d1c9] bg-[#faf9f7] px-2.5 py-1.5 text-[11.5px] font-medium text-[#1f1f1f] transition hover:bg-[#f5f1ec]"
                                  >
                                    <Paperclip className="size-3.5 text-[#8a837b]" />
                                    <span className="max-w-[220px] truncate">{file.fileName}</span>
                                    <span className="text-[#8a837b]">· {formatFileSize(file.sizeBytes)}</span>
                                    <Download className="size-3.5 text-[#8a837b]" />
                                  </a>
                                </li>
                              ))}
                            </ul>
                          )}
                          <p className="text-[11.5px] text-[#8a837b]">Đã nộp lúc {formatDateTime(submission.submittedAt)}</p>
                        </div>
                      ) : (
                        <p className="mt-3 text-[12.5px] text-[#6b6b6b]">Bạn chưa nộp bài cho tài nguyên này trước khi lớp bị lưu trữ.</p>
                      )
                    ) : (
                      <>
                        <div className="mt-4">
                          <RichEditor token={accessToken ?? ""} initialContent={textContent} onChange={setTextContent} />
                        </div>

                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          {files.map((file, index) => (
                            <span
                              key={`${file.url}-${index}`}
                              className="inline-flex items-center gap-1.5 rounded-[10px] border border-[#d8d1c9] bg-[#faf9f7] px-2.5 py-1.5 text-[11.5px] font-medium text-[#1f1f1f]"
                            >
                              <Paperclip className="size-3.5 text-[#8a837b]" />
                              <span className="max-w-[180px] truncate">{file.fileName}</span>
                              <span className="text-[#8a837b]">· {formatFileSize(file.sizeBytes)}</span>
                              <button
                                type="button"
                                onClick={() => removeFile(index)}
                                aria-label="Xóa tệp"
                                className="text-[#8a837b] transition hover:text-[#c0492b]"
                              >
                                <X className="size-3.5" />
                              </button>
                            </span>
                          ))}
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploading}
                            className="inline-flex h-9 items-center gap-2 rounded-[10px] border border-[#d8d1c9] bg-white px-3 text-[12px] font-medium text-[#6b6b6b] transition hover:bg-[#f5f1ec] hover:text-[#1f1f1f] disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {uploading ? <Loader2 className="size-3.5 animate-spin" /> : <Paperclip className="size-3.5" />}
                            {uploading ? "Đang tải tệp..." : "Đính kèm tệp"}
                          </button>
                          <input ref={fileInputRef} type="file" className="hidden" onChange={(event) => void handleAddFile(event)} />
                        </div>

                        <div className="mt-4 flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => void handleSubmit()}
                            disabled={submitting || uploading}
                            className="inline-flex h-10 items-center gap-2 rounded-[10px] bg-[#d97757] px-4 text-[13px] font-medium text-white transition hover:bg-[#c96a4c] disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {submitting ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                            {submission ? "Nộp lại" : "Nộp bài"}
                          </button>
                          {submission && (
                            <button
                              type="button"
                              onClick={() => void handleUnsubmit()}
                              disabled={unsubmitting}
                              className="inline-flex h-10 items-center gap-2 rounded-[10px] border border-[#e8b4a4] bg-white px-4 text-[13px] font-medium text-[#c0492b] transition hover:bg-[#fdf3ef] disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {unsubmitting ? <Loader2 className="size-4 animate-spin" /> : <RotateCcw className="size-4" />}
                              Thu hồi bài nộp
                            </button>
                          )}
                        </div>

                        {submission && (
                          <p className="mt-3 text-[11.5px] text-[#8a837b]">Lần nộp gần nhất: {formatDateTime(submission.submittedAt)}</p>
                        )}
                      </>
                    )}
                  </div>
                ) : (
                  <p className="mt-6 rounded-[12px] border border-dashed border-[#d8d1c9] bg-white px-4 py-3 text-[12.5px] text-[#6b6b6b]">
                    Tài nguyên này không yêu cầu nộp bài.
                  </p>
                )}
              </>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
