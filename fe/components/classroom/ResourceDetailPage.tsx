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
  Pencil,
  RotateCcw,
  Send,
  UploadCloud,
  X,
} from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import { RichEditor } from "@/components/blog/RichEditor";
import { RichView } from "@/components/blog/RichView";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useAuth } from "@/lib/auth/AuthContext";
import {
  type ClassDetail,
  type ClassResourceSummary,
  type SubmissionDetail,
  type SubmissionFileItem,
  ClassApiError,
  formatFileSize,
  getClassDetail,
  getMySubmission,
  isClassAccessRevoked,
  listClassResources,
  sourceTypeLabel,
  submissionStatusLabel,
  submitAssignment,
  unsubmitAssignment,
  uploadClassResourceFile,
} from "@/lib/classroom";
import { deadlineClasses, formatDateTime, isOverdue } from "./shared";

const AUTOSAVE_DEBOUNCE_MS = 800;
const REDIRECT_SECONDS = 3;

type SubmissionDraft = {
  textContent: string;
  files: SubmissionFileItem[];
  savedAt: string;
};

function hasTextContent(html: string): boolean {
  return html.replace(/<[^>]*>/g, "").trim().length > 0;
}

/**
 * 403 ở đây gần như luôn là "lớp đã bị giáo viên chuyển sang lưu trữ" (BE trả message tiếng
 * Anh "Class is inactive and read-only."). Trang được tải trước khi lớp đổi trạng thái nên UI
 * không biết, vì vậy sau lần 403 đầu tiên ta khóa luôn các nút ghi thay vì để học sinh bấm lại.
 */
function isWriteForbidden(reason: unknown): boolean {
  return reason instanceof ClassApiError && reason.status === 403;
}

const WRITE_FORBIDDEN_MESSAGE =
  "Lớp đã được giáo viên chuyển sang chế độ lưu trữ nên không thể nộp bài hoặc thu hồi bài nữa. " +
  "Nội dung bạn soạn dở vẫn được lưu ở máy, tải lại trang để xem lại bài đã nộp.";

function legacyDraftStorageKey(classId: string, resourceId: string): string {
  return `edua:submission-draft:${classId}:${resourceId}`;
}

function draftStorageKey(classId: string, resourceId: string, userId: string): string {
  return `edua:submission-draft:${userId}:${classId}:${resourceId}`;
}

/** Nháp tự lưu ở localStorage — chỉ để khôi phục khi mất trang, không thay cho việc Nộp bài thật. */
function readDraft(classId: string, resourceId: string, userId: string): SubmissionDraft | null {
  try {
    const raw = window.localStorage.getItem(draftStorageKey(classId, resourceId, userId));
    return raw ? (JSON.parse(raw) as SubmissionDraft) : null;
  } catch {
    return null;
  }
}

function writeDraft(classId: string, resourceId: string, userId: string, draft: SubmissionDraft): void {
  try {
    window.localStorage.setItem(draftStorageKey(classId, resourceId, userId), JSON.stringify(draft));
  } catch {
    // localStorage khong kha dung (che do an danh, het dung luong...) - bo qua, khong chan luong nop bai.
  }
}

function clearDraft(classId: string, resourceId: string, userId: string): void {
  try {
    window.localStorage.removeItem(draftStorageKey(classId, resourceId, userId));
    window.localStorage.removeItem(legacyDraftStorageKey(classId, resourceId));
  } catch {
    // ignore
  }
}

function shouldUseDraft(draft: SubmissionDraft | null, submission: SubmissionDetail | null): draft is SubmissionDraft {
  if (!draft) return false;
  if (!submission) return true;
  return new Date(draft.savedAt).getTime() > new Date(submission.submittedAt).getTime();
}

function formatSavedTime(iso: string): string {
  return new Intl.DateTimeFormat("vi-VN", { hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
}

/** Xem lại bài đã nộp (chỉ đọc) — dùng cho cả màn lớp đã lưu trữ lẫn màn mặc định trước khi bấm "Chỉnh sửa bài". */
function SubmissionSummary({ submission }: { submission: SubmissionDetail }) {
  return (
    <div className="mt-4 space-y-3">
      {submission.textContent && (
        <div className="rounded-[12px] border border-[#ede8e1] bg-[#faf9f7] p-3">
          <RichView html={submission.textContent} />
        </div>
      )}
      {submission.files.length > 0 && (
        <ul className="flex flex-wrap gap-2">
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
  );
}

export function ResourceDetailPage() {
  const { user, authFetch } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const classId = searchParams.get("classId") ?? "";
  const resourceId = searchParams.get("resourceId") ?? "";
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [classDetail, setClassDetail] = useState<ClassDetail | null>(null);
  const [resource, setResource] = useState<ClassResourceSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [accessRevoked, setAccessRevoked] = useState(false);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [countdown, setCountdown] = useState(REDIRECT_SECONDS);

  const [submission, setSubmission] = useState<SubmissionDetail | null>(null);
  const [submissionLoading, setSubmissionLoading] = useState(false);

  // `initialText` chỉ đổi khi nạp dữ liệu (server hoặc nháp cục bộ) — KHÔNG được gán lại
  // từ `textContent` (giá trị đang gõ), nếu không RichEditor sẽ tự reset nội dung mỗi lần
  // gõ, làm mất vị trí con trỏ và lịch sử Undo/Redo.
  const [initialText, setInitialText] = useState("");
  const [textContent, setTextContent] = useState("");
  const [files, setFiles] = useState<SubmissionFileItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [unsubmitting, setUnsubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [savedAt, setSavedAt] = useState<string | null>(null);
  // Đã có bài nộp thì mặc định chỉ xem lại (read-only) — phải bấm "Chỉnh sửa bài" mới vào
  // form sửa/nộp lại, tránh sửa nhầm bài đã nộp.
  const [isEditing, setIsEditing] = useState(false);
  const [submitConfirmOpen, setSubmitConfirmOpen] = useState(false);
  const [unsubmitConfirmOpen, setUnsubmitConfirmOpen] = useState(false);
  // Bật sau khi server từ chối (403) — khóa mọi nút ghi cho tới khi tải lại trang.
  const [writeLocked, setWriteLocked] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const userEditedRef = useRef(false);
  const loadSeqRef = useRef(0);

  const load = useCallback(async () => {
    if (!classId || !resourceId || !user?.id) return;
    const requestId = loadSeqRef.current + 1;
    loadSeqRef.current = requestId;
    const isCurrentRequest = () => loadSeqRef.current === requestId;
    setLoading(true);
    setError("");
    setSuccessMessage("");
    setAccessRevoked(false);
    setWriteLocked(false);
    try {
      const [detail, resourcePage] = await Promise.all([
        getClassDetail(authFetch, classId),
        listClassResources(authFetch, classId, 0, 200),
      ]);
      if (!isCurrentRequest()) return;
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
          if (!isCurrentRequest()) return;
          setSubmission(own);
          const draft = readDraft(classId, resourceId, user.id);
          const useDraft = shouldUseDraft(draft, own);
          setIsEditing(!own || useDraft);
          if (useDraft) {
            setInitialText(draft.textContent);
            setTextContent(draft.textContent);
            setFiles(draft.files);
            setSavedAt(draft.savedAt);
            setSaveStatus("saved");
          } else {
            if (draft && own) {
              clearDraft(classId, resourceId, user.id);
            }
            setInitialText(own?.textContent ?? "");
            setTextContent(own?.textContent ?? "");
            setFiles(own?.files ?? []);
            setSavedAt(null);
            setSaveStatus("idle");
          }
          userEditedRef.current = false;
        } finally {
          if (isCurrentRequest()) {
            setSubmissionLoading(false);
          }
        }
      }
    } catch (reason) {
      if (!isCurrentRequest()) return;
      if (isClassAccessRevoked(reason)) {
        setAccessRevoked(true);
        setError("");
      } else {
        setError(reason instanceof Error ? reason.message : "Không thể tải tài nguyên. Lớp hoặc tài nguyên có thể không tồn tại.");
      }
    } finally {
      if (isCurrentRequest()) {
        setLoading(false);
      }
    }
  }, [authFetch, classId, resourceId, user?.id]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => {
      window.clearTimeout(timer);
      loadSeqRef.current += 1;
    };
  }, [load]);

  useEffect(() => {
    if (!accessRevoked) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCountdown(REDIRECT_SECONDS);
    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          if (countdownRef.current) clearInterval(countdownRef.current);
          router.replace("/list-class");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [accessRevoked, classId, router]);

  // Tự động lưu (autosave): chỉ lưu nháp cục bộ (localStorage) sau khi người dùng thực sự
  // chỉnh sửa (userEditedRef), không tự nộp bài lên server — "Nộp bài" vẫn là hành động
  // tường minh riêng (có xác nhận), autosave chỉ để không mất bài khi lỡ tắt/tải lại trang.
  useEffect(() => {
    if (!userEditedRef.current || !classId || !resourceId || !user?.id) return;
    setSaveStatus("saving");
    const timer = window.setTimeout(() => {
      const now = new Date().toISOString();
      writeDraft(classId, resourceId, user.id, { textContent, files, savedAt: now });
      setSavedAt(now);
      setSaveStatus("saved");
    }, AUTOSAVE_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [textContent, files, classId, resourceId, user?.id]);

  function handleTextChange(html: string) {
    userEditedRef.current = true;
    setTextContent(html);
  }

  async function handleAddFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setUploading(true);
    setFormError("");
    try {
      const uploaded = await uploadClassResourceFile(authFetch, file);
      userEditedRef.current = true;
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
    userEditedRef.current = true;
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  function requestSubmit() {
    if (!classId || !resourceId) return;
    if (!hasTextContent(textContent) && files.length === 0) {
      setFormError("Bạn cần nhập nội dung hoặc đính kèm ít nhất 1 tệp để nộp bài.");
      return;
    }
    setSubmitConfirmOpen(true);
  }

  async function handleSubmit() {
    if (!classId || !resourceId || !user?.id) return;
    setSubmitting(true);
    setFormError("");
    setSuccessMessage("");
    try {
      const saved = await submitAssignment(authFetch, classId, resourceId, {
        textContent: hasTextContent(textContent) ? textContent : null,
        files,
      });
      setSubmission(saved);
      setInitialText(saved.textContent ?? "");
      clearDraft(classId, resourceId, user.id);
      userEditedRef.current = false;
      setSaveStatus("idle");
      setSavedAt(null);
      setIsEditing(false);
      setSuccessMessage("Nộp bài thành công.");
    } catch (reason) {
      if (isWriteForbidden(reason)) {
        setWriteLocked(true);
        setFormError(WRITE_FORBIDDEN_MESSAGE);
      } else {
        setFormError(reason instanceof Error ? reason.message : "Không thể nộp bài.");
      }
    } finally {
      setSubmitting(false);
      // Luôn đóng để thông báo lỗi/thành công phía dưới không bị lớp phủ của dialog che mất.
      setSubmitConfirmOpen(false);
    }
  }

  function requestUnsubmit() {
    if (!classId || !resourceId) return;
    setUnsubmitConfirmOpen(true);
  }

  async function handleUnsubmit() {
    if (!classId || !resourceId || !user?.id) return;
    setUnsubmitting(true);
    setFormError("");
    setSuccessMessage("");
    try {
      await unsubmitAssignment(authFetch, classId, resourceId);
      setSubmission(null);
      setTextContent("");
      setInitialText("");
      setFiles([]);
      clearDraft(classId, resourceId, user.id);
      userEditedRef.current = false;
      setSaveStatus("idle");
      setSavedAt(null);
      setIsEditing(true);
      setSuccessMessage("Đã thu hồi bài nộp.");
    } catch (reason) {
      if (isWriteForbidden(reason)) {
        setWriteLocked(true);
        setFormError(WRITE_FORBIDDEN_MESSAGE);
      } else {
        setFormError(reason instanceof Error ? reason.message : "Không thể thu hồi bài nộp.");
      }
    } finally {
      setUnsubmitting(false);
      setUnsubmitConfirmOpen(false);
    }
  }

  function handleGoBackNow() {
    if (countdownRef.current) clearInterval(countdownRef.current);
    router.replace("/list-class");
  }

  if (!user) return null;

  const classInactive = classDetail?.status === "INACTIVE";
  const SourceIcon = resource?.sourceType === "LIBRARY_SNAPSHOT" ? Library : UploadCloud;

  return (
    <main className="min-h-screen bg-white text-[#1f1f1f]">
      <header className="sticky top-0 z-30 flex h-14 items-center border-b border-[#d8d1c9] bg-[#f7f5f2] px-4 md:hidden">
        <button
          type="button"
          onClick={() => setMobileMenuOpen(true)}
          className="group/tooltip relative inline-flex size-9 items-center justify-center rounded-lg text-[#1f1f1f] transition hover:bg-[#edeae5]"
          aria-label="Mở menu chức năng"
          title="Mở menu chức năng"
        >
          <span className="flex w-4 flex-col gap-1" aria-hidden>
            <span className="h-0.5 w-full rounded bg-current" />
            <span className="h-0.5 w-full rounded bg-current" />
            <span className="h-0.5 w-full rounded bg-current" />
          </span>
          <span role="tooltip" className="pointer-events-none absolute left-1/2 top-full z-[70] mt-2 -translate-x-1/2 whitespace-nowrap rounded-md bg-[#2b2926] px-2 py-1 text-[11px] font-medium text-white opacity-0 shadow-lg transition-opacity group-hover/tooltip:opacity-100 group-focus-visible/tooltip:opacity-100">Mở menu chức năng</span>
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

            {loading ? (
              <div className="mt-4 space-y-4">
                <div className="h-[140px] animate-pulse rounded-[14px] bg-[#e8e2db]" />
                <div className="h-[220px] animate-pulse rounded-[14px] bg-[#e8e2db]" />
              </div>
            ) : accessRevoked ? (
              <div className="mt-6 rounded-[14px] border border-[#e8b4a4] bg-[#fdf3ef] px-5 py-6 text-center">
                <AlertCircle className="mx-auto size-8 text-[#c0492b]" />
                <p className="mt-3 text-[15px] font-semibold text-[#c0492b]">Bạn không còn quyền truy cập lớp học này</p>
                <p className="mt-2 text-[13px] text-[#6b6b6b]">
                  Giáo viên đã xóa bạn khỏi lớp. Trang sẽ quay về danh sách lớp sau{" "}
                  <span className="font-semibold text-[#c0492b]">{countdown}</span> giây.
                </p>
                <div className="mt-5 flex justify-center gap-3">
                  <button
                    type="button"
                    onClick={handleGoBackNow}
                    className="inline-flex h-9 items-center gap-2 rounded-[10px] bg-[#1f1f1f] px-4 text-[13px] font-medium text-white transition hover:bg-[#333]"
                  >
                    Quay lại ngay
                  </button>
                </div>
              </div>
            ) : resource ? (
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
                    {resource.sourceType === "LIBRARY_SNAPSHOT" && (
                      <button
                        type="button"
                        onClick={() => router.push(`/class-resource-content?classId=${encodeURIComponent(classId)}&resourceId=${encodeURIComponent(resource.id)}`)}
                        className="inline-flex items-center gap-1.5 rounded-[10px] bg-[#d97757] px-2.5 py-1.5 text-[11.5px] font-medium text-white transition hover:bg-[#c96545]"
                      >
                        <Library className="size-3.5" /> Mở tài nguyên
                      </button>
                    )}
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
                        Lớp đang ở chế độ lưu trữ — bạn chỉ có thể xem lại bài đã nộp, không thể nộp mới hoặc thu hồi.
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
                        <SubmissionSummary submission={submission} />
                      ) : (
                        <p className="mt-3 text-[12.5px] text-[#6b6b6b]">Bạn chưa nộp bài cho tài nguyên này trước khi lớp bị lưu trữ.</p>
                      )
                    ) : !isEditing && submission ? (
                      <>
                        <SubmissionSummary submission={submission} />
                        <div className="mt-4 flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setIsEditing(true)}
                            disabled={writeLocked}
                            className="inline-flex h-10 items-center gap-2 rounded-[10px] bg-[#d97757] px-4 text-[13px] font-medium text-white transition hover:bg-[#c96a4c] disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <Pencil className="size-4" />
                            Chỉnh sửa bài
                          </button>
                          <button
                            type="button"
                            onClick={requestUnsubmit}
                            disabled={unsubmitting || writeLocked}
                            className="inline-flex h-10 items-center gap-2 rounded-[10px] border border-[#e8b4a4] bg-white px-4 text-[13px] font-medium text-[#c0492b] transition hover:bg-[#fdf3ef] disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {unsubmitting ? <Loader2 className="size-4 animate-spin" /> : <RotateCcw className="size-4" />}
                            Thu hồi bài nộp
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="mt-4">
                          <RichEditor
                            authFetch={authFetch}
                            initialContent={initialText}
                            onChange={handleTextChange}
                            heightClassName="h-[280px] overflow-y-auto"
                          />
                        </div>
                        {saveStatus !== "idle" && (
                          <p className="mt-1.5 text-[11px] text-[#8a837b]">
                            {saveStatus === "saving"
                              ? "Đang lưu nháp..."
                              : savedAt
                                ? `Đã lưu nháp lúc ${formatSavedTime(savedAt)}`
                                : "Đã lưu nháp."}
                          </p>
                        )}

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
                                title="Xóa tệp"
                                className="group/tooltip relative text-[#8a837b] transition hover:text-[#c0492b]"
                              >
                                <X className="size-3.5" />
                                <span role="tooltip" className="pointer-events-none absolute bottom-6 right-0 z-30 whitespace-nowrap rounded-md bg-[#2b2926] px-2 py-1 text-[11px] font-medium text-white opacity-0 shadow-lg transition-opacity group-hover/tooltip:opacity-100 group-focus-visible/tooltip:opacity-100">Xóa tệp</span>
                              </button>
                            </span>
                          ))}
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploading || writeLocked}
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
                            onClick={requestSubmit}
                            disabled={submitting || uploading || writeLocked}
                            className="inline-flex h-10 items-center gap-2 rounded-[10px] bg-[#d97757] px-4 text-[13px] font-medium text-white transition hover:bg-[#c96a4c] disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {submitting ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                            {submission ? "Nộp lại" : "Nộp bài"}
                          </button>
                          {submission && (
                            <>
                              <button
                                type="button"
                                onClick={() => setIsEditing(false)}
                                disabled={submitting}
                                className="inline-flex h-10 items-center gap-2 rounded-[10px] border border-[#d8d1c9] bg-white px-4 text-[13px] font-medium text-[#6b6b6b] transition hover:bg-[#f5f1ec] hover:text-[#1f1f1f] disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                Hủy
                              </button>
                              <button
                                type="button"
                                onClick={requestUnsubmit}
                                disabled={unsubmitting || writeLocked}
                                className="inline-flex h-10 items-center gap-2 rounded-[10px] border border-[#e8b4a4] bg-white px-4 text-[13px] font-medium text-[#c0492b] transition hover:bg-[#fdf3ef] disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {unsubmitting ? <Loader2 className="size-4 animate-spin" /> : <RotateCcw className="size-4" />}
                                Thu hồi bài nộp
                              </button>
                            </>
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
            ) : (
              <div className="mt-6 rounded-[14px] border border-dashed border-[#d8d1c9] bg-white px-5 py-14 text-center">
                <p className="text-[13px] font-medium">Không tìm thấy tài nguyên</p>
                <p className="mt-1 text-[12px] text-[#6b6b6b]">Tài nguyên này có thể đã bị xóa hoặc bạn chưa được cấp quyền.</p>
              </div>
            )}
          </div>
        </section>
      </div>
      <ConfirmDialog
        open={submitConfirmOpen}
        onClose={() => setSubmitConfirmOpen(false)}
        onConfirm={() => void handleSubmit()}
        loading={submitting}
        title={submission ? "Nộp lại bài?" : "Nộp bài?"}
        description={
          submission
            ? "Bài nộp trước đó sẽ bị thay thế bằng nội dung hiện tại. Bạn vẫn có thể xem trạng thái sau khi nộp."
            : "Bài làm hiện tại sẽ được gửi cho giáo viên chấm/xem xét."
        }
        confirmLabel={submission ? "Nộp lại" : "Nộp bài"}
        variant="default"
      />
      <ConfirmDialog
        open={unsubmitConfirmOpen}
        onClose={() => setUnsubmitConfirmOpen(false)}
        onConfirm={() => void handleUnsubmit()}
        loading={unsubmitting}
        title="Thu hồi bài nộp?"
        description="Bài nộp hiện tại sẽ bị gỡ khỏi danh sách giáo viên thấy. Bạn có thể nộp lại sau nếu lớp và hạn nộp còn cho phép."
        confirmLabel="Thu hồi"
        variant="danger"
      />
    </main>
  );
}
