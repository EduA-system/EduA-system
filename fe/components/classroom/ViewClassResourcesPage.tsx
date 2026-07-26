"use client";

import { type ChangeEvent, type FormEvent, useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  BookOpen,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Download,
  FileText,
  Inbox,
  Library,
  Loader2,
  Paperclip,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import { useAuth } from "@/lib/auth/AuthContext";
import {
  RESOURCE_SOURCE_TYPES,
  type AuthFetch,
  type ClassDetail,
  type ClassResourceAttachmentInput,
  type ClassResourceSummary,
  type ClassStatus,
  type ClassSummary,
  type ResourceSourceType,
  deleteClassResource,
  formatFileSize,
  getClassDetail,
  listClassResources,
  listClasses,
  listEnrolledClasses,
  postClassResource,
  sourceTypeLabel,
  statusLabel,
  submissionStatusLabel,
  subjectLabel,
  updateClassResource,
  uploadClassResourceFile,
} from "@/lib/classroom";
import { listLibrary, type LibraryContent } from "@/lib/library";

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function statusClasses(status: ClassStatus): string {
  return status === "ACTIVE"
    ? "border-[#b7e0c4] bg-[#f0faf3] text-[#287447]"
    : "border-[#e6d8cb] bg-[#f8f2ec] text-[#8a5a35]";
}

function subjectBannerClasses(subject: ClassSummary["subject"]): string {
  if (subject === "MATH") return "bg-gradient-to-br from-[#2f8f57] to-[#1f6b40]";
  if (subject === "PHYSICS") return "bg-gradient-to-br from-[#4f63c2] to-[#33448f]";
  return "bg-gradient-to-br from-[#d97757] to-[#b85a3d]";
}

function ClassPickerCard({
  item,
  active,
  onSelect,
}: {
  item: ClassSummary;
  active: boolean;
  onSelect: (id: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(item.id)}
      className={`overflow-hidden rounded-[14px] border bg-white text-left transition ${
        active
          ? "border-[#d97757] shadow-[0_10px_24px_rgba(217,119,87,0.15)]"
          : "border-[#d8d1c9] hover:border-[#c9a998] hover:shadow-[0_10px_24px_rgba(31,31,31,0.06)]"
      }`}
    >
      <div className={`relative h-[104px] overflow-hidden px-4 pb-3 pt-4 text-white ${subjectBannerClasses(item.subject)}`}>
        <div className="pointer-events-none absolute -right-4 -top-6 size-24 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -bottom-6 -right-10 size-20 rounded-full bg-white/10" />
        <h3 className="relative line-clamp-2 pr-2 text-[16px] font-semibold leading-snug">{item.name}</h3>
        <p className="relative mt-1 text-[11.5px] text-white/85">
          {subjectLabel(item.subject)} · Khối {item.grade}
        </p>
      </div>
      <div className="flex items-center justify-between px-4 py-3">
        <span className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${statusClasses(item.status)}`}>
          {statusLabel(item.status)}
        </span>
        <span className="text-[11.5px] text-[#8a837b]">{item.memberCount} thành viên</span>
      </div>
    </button>
  );
}

function isOverdue(deadline: string | null): boolean {
  return Boolean(deadline) && new Date(deadline as string).getTime() < Date.now();
}

function deadlineClasses(deadline: string | null): string {
  return isOverdue(deadline)
    ? "border-[#e8b4a4] bg-[#fdf3ef] text-[#c0492b]"
    : "border-[#c9d5ff] bg-[#f1f4ff] text-[#3f54a3]";
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

function ResourceCard({
  resource,
  canManage,
  onEdit,
  onDelete,
  deleting,
}: {
  resource: ClassResourceSummary;
  canManage?: boolean;
  onEdit?: (resource: ClassResourceSummary) => void;
  onDelete?: (resource: ClassResourceSummary) => void;
  deleting?: boolean;
}) {
  const SourceIcon = resource.sourceType === "LIBRARY_SNAPSHOT" ? Library : UploadCloud;

  return (
    <article className="relative overflow-hidden rounded-[14px] border border-[#d8d1c9] bg-white transition hover:border-[#c9a998] hover:shadow-[0_10px_24px_rgba(31,31,31,0.06)]">
      {canManage && (
        <div className="absolute right-3 top-3 z-10 flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onEdit?.(resource)}
            title="Sửa tài nguyên"
            className="flex size-8 items-center justify-center rounded-[10px] border border-[#d8d1c9] bg-white/95 text-[#6b6b6b] shadow-sm transition hover:bg-[#f5f1ec] hover:text-[#1f1f1f]"
          >
            <Pencil className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onDelete?.(resource)}
            disabled={deleting}
            title="Xóa tài nguyên"
            className="flex size-8 items-center justify-center rounded-[10px] border border-[#e8b4a4] bg-white/95 text-[#c0492b] shadow-sm transition hover:bg-[#fdf3ef] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {deleting ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
          </button>
        </div>
      )}
      {resource.thumbnailUrl ? (
        <div className="relative h-[140px] w-full bg-[#f5f1ec]">
          <Image src={resource.thumbnailUrl} alt="" fill className="object-cover" unoptimized />
        </div>
      ) : (
        <div className="flex h-[96px] w-full items-center justify-center bg-[#f5f1ec]">
          <SourceIcon className="size-8 text-[#c9a998]" />
        </div>
      )}

      <div className="p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full border border-[#d8d1c9] bg-[#faf9f7] px-2.5 py-1 text-[11px] font-medium text-[#6b6b6b]">
            <SourceIcon className="size-3" /> {sourceTypeLabel(resource.sourceType)}
          </span>
          {resource.submissionEnabled && (
            <span className="inline-flex items-center gap-1 rounded-full border border-[#f0d9aa] bg-[#fff7df] px-2.5 py-1 text-[11px] font-medium text-[#9a661c]">
              <ClipboardList className="size-3" /> {submissionStatusLabel(resource.submissionStatus)}
            </span>
          )}
        </div>

        <h3 className="mt-3 text-[15px] font-semibold leading-snug text-[#1f1f1f]">{resource.title}</h3>
        {resource.description && (
          <p className="mt-1.5 line-clamp-2 text-[12.5px] leading-[19px] text-[#6b6b6b]">{resource.description}</p>
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
              <span className="max-w-[160px] truncate">{resource.attachment.fileName ?? "Tệp đính kèm"}</span>
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

        <div className="mt-4 flex items-center justify-between border-t border-[#ede8e1] pt-3 text-[11.5px] text-[#8a837b]">
          <span>{resource.postedByName ?? "Giáo viên"}</span>
          <span>{formatDateTime(resource.postedAt)}</span>
        </div>
      </div>
    </article>
  );
}

function ResourceFormPanel({
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
  const [deadline, setDeadline] = useState(toDatetimeLocalValue(initial?.deadline ?? null));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEdit || sourceType !== "LIBRARY_SNAPSHOT") return;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      if (cancelled) return;
      setLibraryLoading(true);
      const params = new URLSearchParams({ page: "0", size: "30" });
      if (libraryQuery.trim()) params.set("q", libraryQuery.trim());
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
  }, [authFetch, isEdit, libraryQuery, sourceType]);

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
    <div className="mt-6 rounded-[14px] border border-[#d8d1c9] bg-white p-5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-[14px] font-semibold">{isEdit ? "Sửa tài nguyên" : "Đăng tài liệu / bài tập mới"}</h3>
        <button
          type="button"
          onClick={onCancel}
          className="flex size-8 items-center justify-center rounded-[10px] text-[#8a837b] transition hover:bg-[#f5f1ec] hover:text-[#1f1f1f]"
        >
          <X className="size-4" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
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
            <label className="block text-[12px] font-medium text-[#6b6b6b]">
              Tìm trong thư viện cá nhân
              <input
                value={libraryQuery}
                onChange={(event) => setLibraryQuery(event.target.value)}
                placeholder="Tìm theo tiêu đề..."
                className="mt-2 h-10 w-full rounded-lg border border-[#d8d1c9] bg-[#faf9f7] px-3 text-[13px] outline-none transition placeholder:text-[#a8a097] focus:border-[#d97757]"
              />
            </label>
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
                    <span className="ml-2 shrink-0 text-[11px] text-[#8a837b]">{item.type}</span>
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
            className={`relative h-6 w-11 shrink-0 rounded-full transition ${submissionEnabled ? "bg-[#d97757]" : "bg-[#d8d1c9]"}`}
          >
            <span
              className={`absolute top-0.5 size-5 rounded-full bg-white transition ${submissionEnabled ? "left-[22px]" : "left-0.5"}`}
            />
          </button>
        </div>

        {submissionEnabled && (
          <label className="block text-[12px] font-medium text-[#6b6b6b]">
            Hạn nộp bài
            <input
              type="datetime-local"
              value={deadline}
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

        <div className="flex items-center gap-3">
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
  );
}

export function ViewClassResourcesPage() {
  const { user, status, authFetch } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const classId = searchParams.get("classId") ?? "";
  const isTeacher = user?.role === "TEACHER";

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [classes, setClasses] = useState<ClassSummary[]>([]);
  const [classesLoading, setClassesLoading] = useState(false);
  const [selectedClass, setSelectedClass] = useState<ClassDetail | null>(null);
  const [classLoading, setClassLoading] = useState(false);

  const [resources, setResources] = useState<ClassResourceSummary[]>([]);
  const [resourcesTotal, setResourcesTotal] = useState(0);
  const [resourcesLoading, setResourcesLoading] = useState(false);

  const [formTarget, setFormTarget] = useState<"create" | ClassResourceSummary | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadClasses = useCallback(async () => {
    if (status !== "authenticated") return;
    setClassesLoading(true);
    try {
      const result = isTeacher
        ? await listClasses(authFetch, { size: 100 })
        : await listEnrolledClasses(authFetch, { size: 100 });
      setClasses(result.items);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không thể tải danh sách lớp.");
    } finally {
      setClassesLoading(false);
    }
  }, [authFetch, isTeacher, status]);

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
    const timer = window.setTimeout(() => {
      void loadClasses();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadClasses]);

  useEffect(() => {
    if (!classId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedClass(null);
      setResources([]);
      setResourcesTotal(0);
      return;
    }
    void loadClassDetail(classId);
  }, [classId, loadClassDetail]);

  function selectClass(id: string) {
    setError("");
    setFormTarget(null);
    router.replace(id ? `/view-class-resources?classId=${id}` : "/view-class-resources");
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

  if (!user) return null;

  const canManage = isTeacher && selectedClass?.status === "ACTIVE";

  const submissionCount = resources.filter((item) => item.submissionEnabled).length;
  const libraryCount = resources.filter((item) => item.sourceType === "LIBRARY_SNAPSHOT").length;

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
        <Sidebar activeHref="/create-class" responsive mobileOpen={mobileMenuOpen} />

        <section className="min-w-0 flex-1 px-5 py-8 sm:px-8 lg:px-10 lg:py-12">
          <div className="mx-auto w-full max-w-[1220px]">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                {isTeacher && (
                  <Link
                    href="/create-class"
                    className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[#6b6b6b] transition hover:text-[#1f1f1f]"
                  >
                    <ArrowLeft className="size-3.5" /> Quay lại quản lý lớp
                  </Link>
                )}
                <div className="mt-3 inline-flex h-[26px] items-center gap-1.5 rounded-full border border-[#cdd7ef] bg-[#f1f4ff] px-3 text-[11px] font-medium text-[#3f54a3]">
                  <BookOpen className="size-3.5" /> Class Hub
                </div>
                <h1 className="font-libertine mt-4 text-[44px] font-normal leading-none sm:text-[60px]">Tài nguyên lớp học</h1>
                <p className="mt-4 max-w-[620px] text-[13px] leading-[23px] text-[#6b6b6b]">
                  Tài liệu và bài tập giáo viên đã đăng trong lớp, kèm hạn nộp và trạng thái nộp bài của bạn.
                </p>
              </div>

              {selectedClass && (
                <div className="grid w-full grid-cols-3 gap-3 sm:w-auto">
                  <div className="rounded-[14px] border border-[#d8d1c9] bg-white px-4 py-3">
                    <p className="text-[11px] text-[#6b6b6b]">Tổng tài nguyên</p>
                    <p className="mt-1 text-xl font-semibold">{resourcesTotal}</p>
                  </div>
                  <div className="rounded-[14px] border border-[#f0d9aa] bg-[#fff7df] px-4 py-3">
                    <p className="text-[11px] text-[#9a661c]">Cần nộp bài</p>
                    <p className="mt-1 text-xl font-semibold text-[#9a661c]">{submissionCount}</p>
                  </div>
                  <div className="rounded-[14px] border border-[#c9d5ff] bg-[#f1f4ff] px-4 py-3">
                    <p className="text-[11px] text-[#3f54a3]">Từ thư viện</p>
                    <p className="mt-1 text-xl font-semibold text-[#3f54a3]">{libraryCount}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 rounded-[14px] border border-[#d8d1c9] bg-white p-5">
              <h2 className="text-[14px] font-semibold text-[#1f1f1f]">Chọn lớp</h2>
              {classesLoading && classes.length === 0 ? (
                <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {[1, 2, 3].map((item) => (
                    <div key={item} className="h-[168px] animate-pulse rounded-[14px] bg-[#e8e2db]" />
                  ))}
                </div>
              ) : classes.length === 0 ? (
                <p className="mt-3 text-[12px] text-[#6b6b6b]">
                  {isTeacher ? "Bạn chưa sở hữu lớp nào." : "Bạn chưa được thêm vào lớp nào."}
                </p>
              ) : (
                <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {classes.map((item) => (
                    <ClassPickerCard key={item.id} item={item} active={item.id === classId} onSelect={selectClass} />
                  ))}
                </div>
              )}
            </div>

            {(error || message) && (
              <div
                className={`mt-6 flex items-start gap-2 rounded-[12px] border px-4 py-3 text-[13px] ${
                  error ? "border-[#e8b4a4] bg-[#fdf3ef] text-[#c0492b]" : "border-[#bfdcc8] bg-[#f1faf3] text-[#287447]"
                }`}
              >
                {error ? <AlertCircle className="mt-0.5 size-4 shrink-0" /> : <CheckCircle2 className="mt-0.5 size-4 shrink-0" />}
                <span>{error || message}</span>
              </div>
            )}

            {classLoading ? (
              <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {[1, 2, 3].map((item) => (
                  <div key={item} className="h-[260px] animate-pulse rounded-[14px] bg-[#e8e2db]" />
                ))}
              </div>
            ) : selectedClass ? (
              <section className="mt-8">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-[16px] font-semibold">{selectedClass.name}</h2>
                    <p className="mt-1 text-[12px] text-[#6b6b6b]">
                      {subjectLabel(selectedClass.subject)} · Khối {selectedClass.grade} · Chủ lớp:{" "}
                      {selectedClass.ownerName ?? "Giáo viên"}
                    </p>
                  </div>
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

                {selectedClass.status === "INACTIVE" && (
                  <p className="mt-4 rounded-[10px] border border-[#e6d8cb] bg-[#f8f2ec] px-3 py-2 text-[12px] leading-5 text-[#8a5a35]">
                    Lớp đang ở chế độ lưu trữ (Inactive) — tài nguyên cũ vẫn xem và tải được bình thường.
                  </p>
                )}

                <div className="mt-5">
                  {resourcesLoading && resources.length === 0 ? (
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                      {[1, 2, 3].map((item) => (
                        <div key={item} className="h-[260px] animate-pulse rounded-[14px] bg-[#e8e2db]" />
                      ))}
                    </div>
                  ) : resources.length === 0 ? (
                    <div className="rounded-[14px] border border-dashed border-[#d8d1c9] bg-white px-5 py-14 text-center">
                      <Inbox className="mx-auto size-8 text-[#a8a097]" />
                      <p className="mt-3 text-[13px] font-medium">Không tìm thấy kết quả</p>
                      <p className="mt-1 text-[12px] text-[#6b6b6b]">Lớp này chưa có tài nguyên hoặc bài tập nào được đăng.</p>
                    </div>
                  ) : (
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
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
                          deleting={deletingId === resource.id}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </section>
            ) : (
              <div className="mt-8 rounded-[14px] border border-dashed border-[#d8d1c9] bg-white px-5 py-14 text-center">
                <FileText className="mx-auto size-8 text-[#a8a097]" />
                <p className="mt-3 text-[13px] font-medium">Chọn một lớp ở trên để xem tài nguyên</p>
                <p className="mt-1 text-[12px] text-[#6b6b6b]">
                  {isTeacher ? "Danh sách lớp bạn sở hữu hiển thị ở ô chọn phía trên." : "Danh sách lớp bạn đã tham gia hiển thị ở ô chọn phía trên."}
                </p>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
