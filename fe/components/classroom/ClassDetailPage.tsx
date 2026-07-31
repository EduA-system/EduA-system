"use client";

import { type ChangeEvent, type FormEvent, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  Archive,
  ArrowLeft,
  CheckCircle2,
  Inbox,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  UploadCloud,
  UserPlus,
  X,
} from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import { useAuth } from "@/lib/auth/AuthContext";
import {
  CLASS_SUBJECTS,
  RESOURCE_SOURCE_TYPES,
  type AuthFetch,
  type ClassDetail,
  type ClassResourceAttachmentInput,
  type ClassResourceSummary,
  type ClassStatus,
  type ClassSubject,
  type ResourceSourceType,
  deleteClassResource,
  formatFileSize,
  getClassDetail,
  listClassResources,
  postClassResource,
  sourceTypeLabel,
  subjectLabel,
  updateClass,
  updateClassResource,
  updateClassStatus,
  uploadClassResourceFile,
} from "@/lib/classroom";
import { LIBRARY_TYPE_LABELS, listLibrary, type LibraryContent, type LibraryType } from "@/lib/library";
import { ResourceCard, statusClasses, subjectBannerClasses } from "./shared";
import { SubmissionDetailPanel } from "./SubmissionDetailPanel";
import { SubmissionsRosterPanel } from "./SubmissionsRosterPanel";

const GRADES = [10, 11, 12] as const;

type FormState = {
  name: string;
  subject: ClassSubject;
  grade: number;
  description: string;
};

function toFormState(detail: ClassDetail): FormState {
  return {
    name: detail.name,
    subject: detail.subject,
    grade: detail.grade,
    description: detail.description ?? "",
  };
}

function toDatetimeLocalValue(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function toIsoOrNull(datetimeLocal: string): string | null {
  if (!datetimeLocal) return null;
  const date = new Date(datetimeLocal);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function ResourceFormPanel({
  classId,
  authFetch,
  initial,
  onSaved,
  onCancel,
}: {
  classId: string;
  authFetch: AuthFetch;
  initial: ClassResourceSummary | null;
  onSaved: (resource: ClassResourceSummary) => void;
  onCancel: () => void;
}) {
  const isEdit = Boolean(initial);
  const editableAttachment = !isEdit || initial?.sourceType === "FILE_UPLOAD";

  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [sourceType, setSourceType] = useState<ResourceSourceType>(initial?.sourceType ?? "LIBRARY_SNAPSHOT");
  const [sourceLibraryContentId, setSourceLibraryContentId] = useState<string | null>(null);
  const [libraryQuery, setLibraryQuery] = useState("");
  const [libraryType, setLibraryType] = useState<LibraryType | "">("");
  const [libraryItems, setLibraryItems] = useState<LibraryContent[]>([]);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [attachment, setAttachment] = useState<ClassResourceAttachmentInput | null>(
    initial?.attachment?.url
      ? {
          url: initial.attachment.url,
          fileName: initial.attachment.fileName ?? "",
          contentType: initial.attachment.contentType ?? "",
          sizeBytes: initial.attachment.sizeBytes ?? 0,
        }
      : null,
  );
  const [uploading, setUploading] = useState(false);
  const [submissionEnabled, setSubmissionEnabled] = useState(initial?.submissionEnabled ?? false);
  const initialDeadlineValue = toDatetimeLocalValue(initial?.deadline ?? null);
  const [deadline, setDeadline] = useState(initialDeadlineValue);
  const [minDeadline, setMinDeadline] = useState(() => toDatetimeLocalValue(new Date().toISOString()));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setMinDeadline(toDatetimeLocalValue(new Date().toISOString()));
    }, 15000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (isEdit || sourceType !== "LIBRARY_SNAPSHOT") return;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      if (cancelled) return;
      setLibraryLoading(true);
      const params = new URLSearchParams({ page: "0", size: "30" });
      if (libraryQuery.trim()) params.set("q", libraryQuery.trim());
      if (libraryType) params.set("type", libraryType);
      listLibrary(authFetch, params)
        .then((result) => {
          if (!cancelled) setLibraryItems(result.items);
        })
        .catch((reason: unknown) => {
          if (!cancelled) setError(reason instanceof Error ? reason.message : "Không thể tải thư viện cá nhân.");
        })
        .finally(() => {
          if (!cancelled) setLibraryLoading(false);
        });
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [authFetch, isEdit, libraryQuery, libraryType, sourceType]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onCancel();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [onCancel]);

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const uploaded = await uploadClassResourceFile(authFetch, file);
      setAttachment({
        url: uploaded.url,
        fileName: uploaded.fileName,
        contentType: uploaded.contentType,
        sizeBytes: uploaded.sizeBytes,
      });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không thể tải tệp lên.");
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving || uploading) return;
    setError("");

    if (!isEdit && sourceType === "LIBRARY_SNAPSHOT" && !sourceLibraryContentId) {
      setError("Vui lòng chọn một tài liệu từ thư viện cá nhân.");
      return;
    }
    if (!isEdit && sourceType === "FILE_UPLOAD" && (!title.trim() || !attachment)) {
      setError("Vui lòng nhập tiêu đề và tải lên tệp đính kèm.");
      return;
    }
    if (submissionEnabled && !deadline) {
      setError("Vui lòng nhập hạn nộp bài.");
      return;
    }
    if (submissionEnabled && deadline && deadline !== initialDeadlineValue && new Date(deadline).getTime() <= Date.now()) {
      setError("Hạn nộp bài phải ở trong tương lai.");
      return;
    }

    setSaving(true);
    try {
      if (isEdit && initial) {
        const updated = await updateClassResource(authFetch, classId, initial.id, {
          title: title.trim() || undefined,
          description: description.trim() || null,
          attachment: editableAttachment ? attachment : undefined,
          submissionEnabled,
          deadline: submissionEnabled ? toIsoOrNull(deadline) : null,
        });
        onSaved(updated);
      } else {
        const created = await postClassResource(authFetch, classId, {
          title: title.trim() || null,
          description: description.trim() || null,
          sourceType,
          sourceLibraryContentId: sourceType === "LIBRARY_SNAPSHOT" ? sourceLibraryContentId : null,
          attachment: sourceType === "FILE_UPLOAD" ? attachment : null,
          submissionEnabled,
          deadline: submissionEnabled ? toIsoOrNull(deadline) : null,
        });
        onSaved(created);
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không thể lưu tài nguyên.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 px-4 py-10"
      role="dialog"
      aria-modal="true"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-[640px] rounded-[18px] bg-white shadow-[0_24px_64px_rgba(0,0,0,0.18)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[#ede8e1] px-6 py-4">
          <h3 className="text-[15px] font-semibold text-[#1f1f1f]">{isEdit ? "Sửa tài nguyên" : "Đăng tài liệu / bài tập mới"}</h3>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Đóng biểu mẫu"
            title="Đóng biểu mẫu"
            className="group/tooltip relative flex size-8 items-center justify-center rounded-[10px] text-[#8a837b] transition hover:bg-[#f5f1ec] hover:text-[#1f1f1f]"
          >
            <X className="size-4" />
            <span role="tooltip" className="pointer-events-none absolute right-0 top-10 z-[70] whitespace-nowrap rounded-md bg-[#2b2926] px-2 py-1 text-[11px] font-medium text-white opacity-0 shadow-lg transition-opacity group-hover/tooltip:opacity-100 group-focus-visible/tooltip:opacity-100">Đóng biểu mẫu</span>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="max-h-[65vh] space-y-4 overflow-y-auto px-6 py-5">
            {!isEdit && (
          <div>
            <span className="block text-[12px] font-medium text-[#6b6b6b]">Nguồn tài liệu</span>
            <div className="mt-2 grid grid-cols-2 gap-3">
              {RESOURCE_SOURCE_TYPES.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => {
                    setSourceType(type);
                    setError("");
                  }}
                  className={`h-11 rounded-lg border px-3 text-[12.5px] font-medium transition ${
                    sourceType === type
                      ? "border-[#d97757] bg-[#fdf1ec] text-[#c96545]"
                      : "border-[#d8d1c9] bg-[#faf9f7] text-[#6b6b6b] hover:bg-[#f5f1ec]"
                  }`}
                >
                  {sourceTypeLabel(type)}
                </button>
              ))}
            </div>
          </div>
        )}

        {!isEdit && sourceType === "LIBRARY_SNAPSHOT" && (
          <div>
            <span className="block text-[12px] font-medium text-[#6b6b6b]">Tìm trong thư viện cá nhân</span>
            <div className="mt-2 flex gap-2">
              <input
                value={libraryQuery}
                onChange={(event) => setLibraryQuery(event.target.value)}
                placeholder="Tìm theo tiêu đề..."
                className="h-10 w-full flex-1 rounded-lg border border-[#d8d1c9] bg-[#faf9f7] px-3 text-[13px] outline-none transition placeholder:text-[#a8a097] focus:border-[#d97757]"
              />
              <select
                value={libraryType}
                onChange={(event) => setLibraryType(event.target.value as LibraryType | "")}
                className="h-10 w-[152px] shrink-0 rounded-lg border border-[#d8d1c9] bg-[#faf9f7] px-2 text-[13px] outline-none transition focus:border-[#d97757]"
              >
                <option value="">Tất cả thể loại</option>
                {(Object.entries(LIBRARY_TYPE_LABELS) as [LibraryType, string][]).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div className="mt-2 max-h-[220px] space-y-1.5 overflow-y-auto rounded-lg border border-[#ede8e1] p-2">
              {libraryLoading ? (
                <p className="px-2 py-3 text-[12px] text-[#8a837b]">Đang tải...</p>
              ) : libraryItems.length === 0 ? (
                <p className="px-2 py-3 text-[12px] text-[#8a837b]">Không có tài liệu phù hợp trong thư viện cá nhân.</p>
              ) : (
                libraryItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSourceLibraryContentId(item.id)}
                    className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-[12.5px] transition ${
                      sourceLibraryContentId === item.id ? "bg-[#fdf1ec] text-[#c96545]" : "hover:bg-[#f5f1ec]"
                    }`}
                  >
                    <span className="truncate">{item.title}</span>
                    <span className="ml-2 shrink-0 text-[11px] text-[#8a837b]">{LIBRARY_TYPE_LABELS[item.type]}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        )}

        <label className="block text-[12px] font-medium text-[#6b6b6b]">
          Tiêu đề{!isEdit && sourceType === "LIBRARY_SNAPSHOT" ? " (để trống sẽ lấy tên tài liệu gốc)" : ""}
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={255}
            placeholder="Ví dụ: Bài tập chương 1 - Phản ứng oxi hóa khử"
            className="mt-2 h-11 w-full rounded-lg border border-[#d8d1c9] bg-[#faf9f7] px-3 text-[13px] outline-none transition placeholder:text-[#a8a097] focus:border-[#d97757]"
          />
        </label>

        <label className="block text-[12px] font-medium text-[#6b6b6b]">
          Mô tả (tùy chọn)
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={3}
            placeholder="Hướng dẫn hoặc ghi chú cho học sinh..."
            className="mt-2 w-full resize-none rounded-lg border border-[#d8d1c9] bg-[#faf9f7] px-3 py-2.5 text-[13px] leading-5 outline-none transition placeholder:text-[#a8a097] focus:border-[#d97757]"
          />
        </label>

        {editableAttachment && (sourceType === "FILE_UPLOAD" || isEdit) && (
          <div>
            <span className="block text-[12px] font-medium text-[#6b6b6b]">Tệp đính kèm</span>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#d8d1c9] bg-[#faf9f7] px-3 text-[12.5px] font-medium text-[#1f1f1f] transition hover:bg-[#f5f1ec] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {uploading ? <Loader2 className="size-3.5 animate-spin" /> : <UploadCloud className="size-3.5" />}
                {uploading ? "Đang tải lên..." : attachment ? "Thay tệp khác" : "Chọn tệp"}
              </button>
              {attachment && (
                <span className="truncate text-[12px] text-[#6b6b6b]">
                  {attachment.fileName} · {formatFileSize(attachment.sizeBytes)}
                </span>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".docx,.pdf,.pptx,.png,.jpg,.jpeg"
              className="hidden"
              onChange={(event) => void handleFileChange(event)}
            />
          </div>
        )}

        <div className="flex items-center justify-between rounded-lg border border-[#d8d1c9] bg-[#faf9f7] px-3 py-2.5">
          <span className="text-[12.5px] font-medium text-[#1f1f1f]">Yêu cầu học sinh nộp bài</span>
          <button
            type="button"
            onClick={() => setSubmissionEnabled((current) => !current)}
            aria-label={submissionEnabled ? "Tắt yêu cầu nộp bài" : "Bật yêu cầu nộp bài"}
            title={submissionEnabled ? "Tắt yêu cầu nộp bài" : "Bật yêu cầu nộp bài"}
            className={`group/tooltip relative h-6 w-11 shrink-0 rounded-full transition ${submissionEnabled ? "bg-[#d97757]" : "bg-[#d8d1c9]"}`}
          >
            <span
              className={`absolute top-0.5 size-5 rounded-full bg-white transition ${submissionEnabled ? "left-[22px]" : "left-0.5"}`}
            />
            <span role="tooltip" className="pointer-events-none absolute right-0 top-8 z-[70] whitespace-nowrap rounded-md bg-[#2b2926] px-2 py-1 text-[11px] font-medium text-white opacity-0 shadow-lg transition-opacity group-hover/tooltip:opacity-100 group-focus-visible/tooltip:opacity-100">{submissionEnabled ? "Tắt yêu cầu nộp bài" : "Bật yêu cầu nộp bài"}</span>
          </button>
        </div>

        {submissionEnabled && (
          <label className="block text-[12px] font-medium text-[#6b6b6b]">
            Hạn nộp bài
            <input
              type="datetime-local"
              value={deadline}
              min={minDeadline}
              onChange={(event) => setDeadline(event.target.value)}
              className="mt-2 h-11 w-full rounded-lg border border-[#d8d1c9] bg-[#faf9f7] px-3 text-[13px] outline-none transition focus:border-[#d97757]"
            />
          </label>
        )}

            {error && (
              <div className="flex items-start gap-2 rounded-[10px] border border-[#e8b4a4] bg-[#fdf3ef] px-3 py-2.5 text-[12.5px] text-[#c0492b]">
                <AlertCircle className="mt-0.5 size-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 border-t border-[#ede8e1] px-6 py-4">
            <button
              type="submit"
              disabled={saving || uploading}
              className="flex h-11 items-center justify-center gap-2 rounded-[11px] bg-[#d97757] px-5 text-[13px] font-medium text-white shadow-[0_4px_8px_rgba(217,119,87,0.25)] transition hover:bg-[#c96545] disabled:cursor-not-allowed disabled:bg-[#e8b9a7]"
            >
              {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              {saving ? "Đang lưu..." : isEdit ? "Lưu thay đổi" : "Đăng tài liệu"}
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="flex h-11 items-center justify-center rounded-[11px] border border-[#d8d1c9] px-5 text-[13px] font-medium text-[#6b6b6b] transition hover:bg-[#f5f1ec]"
            >
              Hủy
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function ClassDetailPage() {
  const { user, authFetch } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const classId = searchParams.get("classId") ?? "";
  const resourceId = searchParams.get("resourceId") ?? "";
  const studentId = searchParams.get("studentId") ?? "";

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState<ClassDetail | null>(null);
  const [classLoading, setClassLoading] = useState(false);
  const [editForm, setEditForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [busyStatus, setBusyStatus] = useState(false);

  const [resources, setResources] = useState<ClassResourceSummary[]>([]);
  const [resourcesTotal, setResourcesTotal] = useState(0);
  const [resourcesLoading, setResourcesLoading] = useState(false);

  const [formTarget, setFormTarget] = useState<"create" | ClassResourceSummary | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadResources = useCallback(
    async (id: string) => {
      setResourcesLoading(true);
      try {
        const result = await listClassResources(authFetch, id, 0, 100);
        setResources(result.items);
        setResourcesTotal(result.total);
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : "Không thể tải danh sách tài nguyên.");
      } finally {
        setResourcesLoading(false);
      }
    },
    [authFetch],
  );

  const loadClassDetail = useCallback(
    async (id: string) => {
      setClassLoading(true);
      setError("");
      try {
        const detail = await getClassDetail(authFetch, id);
        setSelectedClass(detail);
        setEditForm(toFormState(detail));
        await loadResources(id);
      } catch (reason) {
        setSelectedClass(null);
        setError(reason instanceof Error ? reason.message : "Không thể mở lớp. Lớp có thể không tồn tại hoặc bạn chưa được cấp quyền truy cập.");
      } finally {
        setClassLoading(false);
      }
    },
    [authFetch, loadResources],
  );

  useEffect(() => {
    if (!classId) return;
    const timer = window.setTimeout(() => {
      void loadClassDetail(classId);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [classId, loadClassDetail]);

  async function handleSaveDetail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedClass || !editForm || saving || selectedClass.status === "INACTIVE") return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const updated = await updateClass(authFetch, selectedClass.id, {
        name: editForm.name.trim(),
        subject: editForm.subject,
        grade: editForm.grade,
        description: editForm.description.trim() || null,
      });
      setSelectedClass(updated);
      setEditForm(toFormState(updated));
      setMessage("Đã lưu thay đổi lớp.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không thể lưu lớp.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus() {
    if (!selectedClass || busyStatus) return;
    const nextStatus: ClassStatus = selectedClass.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    setBusyStatus(true);
    setError("");
    setMessage("");
    try {
      const updated = await updateClassStatus(authFetch, selectedClass.id, nextStatus);
      setSelectedClass(updated);
      setEditForm(toFormState(updated));
      setMessage(nextStatus === "INACTIVE" ? "Lớp đã chuyển sang chế độ chỉ đọc." : "Lớp đã được kích hoạt lại.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không thể đổi trạng thái lớp.");
    } finally {
      setBusyStatus(false);
    }
  }

  function handleResourceSaved(resource: ClassResourceSummary) {
    setFormTarget(null);
    setMessage(formTarget === "create" ? "Đã đăng tài nguyên mới." : "Đã lưu thay đổi tài nguyên.");
    setResources((current) => {
      const exists = current.some((item) => item.id === resource.id);
      return exists ? current.map((item) => (item.id === resource.id ? resource : item)) : [resource, ...current];
    });
    setResourcesTotal((current) => (formTarget === "create" ? current + 1 : current));
  }

  async function handleDeleteResource(resource: ClassResourceSummary) {
    if (!selectedClass || deletingId) return;
    if (!window.confirm(`Xóa "${resource.title}"? Toàn bộ bài nộp liên quan (nếu có) cũng sẽ bị xóa vĩnh viễn.`)) return;
    setDeletingId(resource.id);
    setError("");
    try {
      await deleteClassResource(authFetch, selectedClass.id, resource.id);
      setResources((current) => current.filter((item) => item.id !== resource.id));
      setResourcesTotal((current) => Math.max(0, current - 1));
      setMessage("Đã xóa tài nguyên.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không thể xóa tài nguyên.");
    } finally {
      setDeletingId(null);
    }
  }

  function openSubmissions(resource: ClassResourceSummary) {
    router.push(`/class-detail?classId=${classId}&resourceId=${resource.id}`);
  }

  if (!user) return null;

  const canManage = selectedClass?.status === "ACTIVE";
  const activeResource = resourceId ? resources.find((item) => item.id === resourceId) ?? null : null;

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
          <div className="mx-auto w-full max-w-[1220px]">
            <Link
              href="/list-class"
              className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[#6b6b6b] transition hover:text-[#1f1f1f]"
            >
              <ArrowLeft className="size-3.5" /> Quay lại danh sách lớp
            </Link>

            {(error || message) && (
              <div
                className={`mt-4 flex items-start gap-2 rounded-[12px] border px-4 py-3 text-[13px] ${
                  error ? "border-[#e8b4a4] bg-[#fdf3ef] text-[#c0492b]" : "border-[#bfdcc8] bg-[#f1faf3] text-[#287447]"
                }`}
              >
                {error ? <AlertCircle className="mt-0.5 size-4 shrink-0" /> : <CheckCircle2 className="mt-0.5 size-4 shrink-0" />}
                <span>{error || message}</span>
              </div>
            )}

            {!classId ? (
              <div className="mt-8 rounded-[14px] border border-dashed border-[#d8d1c9] bg-white px-5 py-14 text-center">
                <p className="text-[13px] font-medium">Thiếu thông tin lớp</p>
                <p className="mt-1 text-[12px] text-[#6b6b6b]">
                  Vào từ <Link href="/list-class" className="font-medium text-[#d97757] underline">danh sách lớp</Link> để mở đúng lớp cần quản lý.
                </p>
              </div>
            ) : classLoading || !selectedClass || !editForm ? (
              <div className="mt-6 space-y-4">
                <div className="h-[180px] animate-pulse rounded-[14px] bg-[#e8e2db]" />
                <div className="h-[320px] animate-pulse rounded-[14px] bg-[#e8e2db]" />
              </div>
            ) : (
              <>
                <div className={`relative mt-6 overflow-hidden rounded-[16px] px-6 py-7 text-white ${subjectBannerClasses(selectedClass.subject)}`}>
                  <div className="pointer-events-none absolute -right-8 -top-10 size-40 rounded-full bg-white/10" />
                  <div className="pointer-events-none absolute -bottom-14 -right-6 size-32 rounded-full bg-white/10" />
                  <div className="relative flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <span className="rounded-full border border-white/40 bg-white/10 px-2.5 py-1 text-[11px] font-medium">
                        {subjectLabel(selectedClass.subject)}
                      </span>
                      <h1 className="font-libertine mt-3 text-[34px] font-normal leading-tight sm:text-[42px]">{selectedClass.name}</h1>
                      <p className="mt-2 text-[12.5px] text-white/85">
                        Khối {selectedClass.grade} · Chủ lớp: {selectedClass.ownerName ?? "Bạn"}
                      </p>
                    </div>
                    <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-medium ${statusClasses(selectedClass.status)}`}>
                      {selectedClass.status === "ACTIVE" ? "Đang hoạt động" : "Đã lưu trữ"}
                    </span>
                  </div>

                  <div className="relative mt-6 grid grid-cols-3 gap-3 sm:max-w-[420px]">
                    <div className="rounded-[12px] bg-white/10 px-3 py-2.5">
                      <p className="text-[11px] text-white/75">Thành viên</p>
                      <p className="mt-1 text-lg font-semibold">{selectedClass.memberCount}</p>
                    </div>
                    <div className="rounded-[12px] bg-white/10 px-3 py-2.5">
                      <p className="text-[11px] text-white/75">Tài nguyên</p>
                      <p className="mt-1 text-lg font-semibold">{resourcesTotal}</p>
                    </div>
                    <div className="rounded-[12px] bg-white/10 px-3 py-2.5">
                      <p className="text-[11px] text-white/75">Bài nộp</p>
                      <p className="mt-1 text-lg font-semibold">0</p>
                    </div>
                  </div>
                </div>

                {resourceId ? (
                  activeResource ? (
                    <div className="mt-6">
                      {studentId ? (
                        <SubmissionDetailPanel
                          authFetch={authFetch}
                          classId={selectedClass.id}
                          resource={activeResource}
                          studentId={studentId}
                        />
                      ) : (
                        <SubmissionsRosterPanel authFetch={authFetch} classId={selectedClass.id} resource={activeResource} />
                      )}
                    </div>
                  ) : resourcesLoading ? (
                    <div className="mt-6 h-[320px] animate-pulse rounded-[14px] bg-[#e8e2db]" />
                  ) : (
                    <div className="mt-6 rounded-[14px] border border-dashed border-[#d8d1c9] bg-white px-5 py-14 text-center">
                      <p className="text-[13px] font-medium">Không tìm thấy tài nguyên này</p>
                      <p className="mt-1 text-[12px] text-[#6b6b6b]">
                        Tài nguyên có thể đã bị xóa.{" "}
                        <Link href={`/class-detail?classId=${selectedClass.id}`} className="font-medium text-[#d97757] underline">
                          Quay lại lớp học
                        </Link>
                        .
                      </p>
                    </div>
                  )
                ) : (
                <div className="mt-6 grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
                  <aside className="rounded-[14px] border border-[#d8d1c9] bg-white p-5">
                    <form onSubmit={handleSaveDetail}>
                      <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[#6b6b6b]">Chi tiết lớp</p>

                      <label className="mt-4 block text-[12px] font-medium text-[#6b6b6b]">
                        Tên lớp
                        <input
                          value={editForm.name}
                          disabled={selectedClass.status === "INACTIVE"}
                          onChange={(event) => setEditForm((current) => (current ? { ...current, name: event.target.value } : current))}
                          className="mt-2 h-10 w-full rounded-lg border border-[#d8d1c9] bg-[#faf9f7] px-3 text-[13px] outline-none transition disabled:text-[#8a837b] focus:border-[#d97757]"
                        />
                      </label>

                      <div className="mt-4 grid grid-cols-2 gap-3">
                        <label className="block text-[12px] font-medium text-[#6b6b6b]">
                          Môn
                          <select
                            value={editForm.subject}
                            disabled={selectedClass.status === "INACTIVE"}
                            onChange={(event) =>
                              setEditForm((current) => (current ? { ...current, subject: event.target.value as ClassSubject } : current))
                            }
                            className="mt-2 h-10 w-full rounded-lg border border-[#d8d1c9] bg-[#faf9f7] px-3 text-[13px] outline-none disabled:text-[#8a837b] focus:border-[#d97757]"
                          >
                            {CLASS_SUBJECTS.map((subject) => (
                              <option key={subject} value={subject}>
                                {subjectLabel(subject)}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="block text-[12px] font-medium text-[#6b6b6b]">
                          Khối
                          <select
                            value={editForm.grade}
                            disabled={selectedClass.status === "INACTIVE"}
                            onChange={(event) =>
                              setEditForm((current) => (current ? { ...current, grade: Number(event.target.value) } : current))
                            }
                            className="mt-2 h-10 w-full rounded-lg border border-[#d8d1c9] bg-[#faf9f7] px-3 text-[13px] outline-none disabled:text-[#8a837b] focus:border-[#d97757]"
                          >
                            {GRADES.map((grade) => (
                              <option key={grade} value={grade}>
                                Khối {grade}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>

                      <label className="mt-4 block text-[12px] font-medium text-[#6b6b6b]">
                        Mô tả
                        <textarea
                          value={editForm.description}
                          disabled={selectedClass.status === "INACTIVE"}
                          rows={5}
                          onChange={(event) =>
                            setEditForm((current) => (current ? { ...current, description: event.target.value } : current))
                          }
                          className="mt-2 w-full resize-none rounded-lg border border-[#d8d1c9] bg-[#faf9f7] px-3 py-2.5 text-[13px] leading-5 outline-none disabled:text-[#8a837b] focus:border-[#d97757]"
                        />
                      </label>

                      {selectedClass.status === "INACTIVE" && (
                        <p className="mt-4 rounded-[10px] border border-[#e6d8cb] bg-[#f8f2ec] px-3 py-2 text-[12px] leading-5 text-[#8a5a35]">
                          Lớp đang ở chế độ chỉ đọc. Kích hoạt lại lớp để chỉnh sửa thông tin.
                        </p>
                      )}

                      <div className="mt-5 flex flex-col gap-3">
                        <button
                          type="submit"
                          disabled={saving || selectedClass.status === "INACTIVE" || !editForm.name.trim()}
                          className="flex h-10 items-center justify-center gap-2 rounded-[10px] bg-[#1f1f1f] px-4 text-[13px] font-medium text-white transition hover:bg-[#34312d] disabled:cursor-not-allowed disabled:bg-[#b8b0a8]"
                        >
                          {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                          Lưu thông tin
                        </button>
                        <Link
                          href={`/add-student?classId=${selectedClass.id}`}
                          className="flex h-10 items-center justify-center gap-2 rounded-[10px] bg-[#d97757] px-4 text-[13px] font-medium text-white shadow-[0_4px_8px_rgba(217,119,87,0.25)] transition hover:bg-[#c96545]"
                        >
                          <UserPlus className="size-4" />
                          Quản lý học sinh
                        </Link>
                        <button
                          type="button"
                          onClick={() => void toggleStatus()}
                          disabled={busyStatus}
                          className="flex h-10 items-center justify-center gap-2 rounded-[10px] border border-[#d8d1c9] px-4 text-[13px] font-medium text-[#6b6b6b] transition hover:bg-[#f5f1ec] hover:text-[#1f1f1f] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {busyStatus ? <Loader2 className="size-4 animate-spin" /> : selectedClass.status === "ACTIVE" ? <Archive className="size-4" /> : <RefreshCw className="size-4" />}
                          {selectedClass.status === "ACTIVE" ? "Lưu trữ lớp" : "Kích hoạt lại lớp"}
                        </button>
                      </div>
                    </form>
                  </aside>

                  <div className="min-w-0">
                    <div className="flex items-center justify-between gap-3">
                      <h2 className="text-[14px] font-semibold text-[#1f1f1f]">Tài nguyên & bài tập</h2>
                      <div className="flex items-center gap-2">
                        {canManage && (
                          <button
                            type="button"
                            onClick={() => {
                              setError("");
                              setMessage("");
                              setFormTarget("create");
                            }}
                            className="inline-flex h-9 items-center gap-2 rounded-[10px] bg-[#d97757] px-3 text-[12px] font-medium text-white shadow-[0_4px_8px_rgba(217,119,87,0.25)] transition hover:bg-[#c96545]"
                          >
                            <Plus className="size-3.5" /> Đăng tài liệu
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => void loadResources(selectedClass.id)}
                          className="inline-flex h-9 items-center gap-2 rounded-[10px] border border-[#d8d1c9] bg-white px-3 text-[12px] font-medium text-[#6b6b6b] transition hover:bg-[#f5f1ec] hover:text-[#1f1f1f]"
                        >
                          <RefreshCw className={`size-3.5 ${resourcesLoading ? "animate-spin" : ""}`} /> Làm mới
                        </button>
                      </div>
                    </div>

                    {formTarget && (
                      <ResourceFormPanel
                        classId={selectedClass.id}
                        authFetch={authFetch}
                        initial={formTarget === "create" ? null : formTarget}
                        onSaved={handleResourceSaved}
                        onCancel={() => setFormTarget(null)}
                      />
                    )}

                    <div className="mt-5">
                      {resourcesLoading && resources.length === 0 ? (
                        <div className="space-y-4">
                          {[1, 2].map((item) => (
                            <div key={item} className="h-[124px] animate-pulse rounded-[14px] bg-[#e8e2db]" />
                          ))}
                        </div>
                      ) : resources.length === 0 ? (
                        <div className="rounded-[14px] border border-dashed border-[#d8d1c9] bg-white px-5 py-14 text-center">
                          <Inbox className="mx-auto size-8 text-[#a8a097]" />
                          <p className="mt-3 text-[13px] font-medium">Chưa có tài nguyên nào</p>
                          <p className="mt-1 text-[12px] text-[#6b6b6b]">Đăng tài liệu hoặc bài tập đầu tiên cho lớp này.</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {resources.map((resource) => (
                            <ResourceCard
                              key={resource.id}
                              resource={resource}
                              canManage={canManage}
                              onEdit={(target) => {
                                setError("");
                                setMessage("");
                                setFormTarget(target);
                              }}
                              onDelete={(target) => void handleDeleteResource(target)}
                              onOpen={resource.submissionEnabled ? openSubmissions : undefined}
                              deleting={deletingId === resource.id}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                )}
              </>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
