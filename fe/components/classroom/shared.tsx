"use client";

import Image from "next/image";
import {
  CalendarClock,
  ClipboardList,
  Download,
  Library,
  Loader2,
  Paperclip,
  Pencil,
  Trash2,
  UploadCloud,
} from "lucide-react";
import {
  type ClassResourceSummary,
  type ClassStatus,
  type ClassSummary,
  formatFileSize,
  sourceTypeLabel,
  statusLabel,
  submissionStatusLabel,
  subjectLabel,
} from "@/lib/classroom";

export function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function statusClasses(status: ClassStatus): string {
  return status === "ACTIVE"
    ? "border-[#b7e0c4] bg-[#f0faf3] text-[#287447]"
    : "border-[#e6d8cb] bg-[#f8f2ec] text-[#8a5a35]";
}

export function subjectBannerClasses(subject: ClassSummary["subject"]): string {
  if (subject === "MATH") return "bg-gradient-to-br from-[#2f8f57] to-[#1f6b40]";
  if (subject === "PHYSICS") return "bg-gradient-to-br from-[#4f63c2] to-[#33448f]";
  return "bg-gradient-to-br from-[#d97757] to-[#b85a3d]";
}

export function isOverdue(deadline: string | null): boolean {
  return Boolean(deadline) && new Date(deadline as string).getTime() < Date.now();
}

export function deadlineClasses(deadline: string | null): string {
  return isOverdue(deadline)
    ? "border-[#e8b4a4] bg-[#fdf3ef] text-[#c0492b]"
    : "border-[#c9d5ff] bg-[#f1f4ff] text-[#3f54a3]";
}

export function ClassPickerCard({
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

export function ResourceCard({
  resource,
  canManage,
  onEdit,
  onDelete,
  onOpen,
  deleting,
  classInactive,
}: {
  resource: ClassResourceSummary;
  canManage?: boolean;
  onEdit?: (resource: ClassResourceSummary) => void;
  onDelete?: (resource: ClassResourceSummary) => void;
  onOpen?: (resource: ClassResourceSummary) => void;
  deleting?: boolean;
  /** Lop INACTIVE: an het badge (nguon, trang thai nop bai, han nop) vi lop da dong. */
  classInactive?: boolean;
}) {
  const SourceIcon = resource.sourceType === "LIBRARY_SNAPSHOT" ? Library : UploadCloud;
  const showDeadline = Boolean(resource.deadline) && !classInactive;

  return (
    <article
      onClick={onOpen ? () => onOpen(resource) : undefined}
      onKeyDown={
        onOpen
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onOpen(resource);
              }
            }
          : undefined
      }
      role={onOpen ? "button" : undefined}
      tabIndex={onOpen ? 0 : undefined}
      className={`relative flex gap-4 rounded-[14px] border border-[#d8d1c9] bg-white p-4 transition hover:border-[#c9a998] hover:shadow-[0_10px_24px_rgba(31,31,31,0.06)] ${onOpen ? "cursor-pointer" : ""}`}
    >
      {canManage && (
        <div className="absolute right-3 top-3 z-10 flex items-center gap-1.5">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onEdit?.(resource);
            }}
            title="Sửa tài nguyên"
            className="group/tooltip relative flex size-8 items-center justify-center rounded-[10px] border border-[#d8d1c9] bg-white/95 text-[#6b6b6b] shadow-sm transition hover:bg-[#f5f1ec] hover:text-[#1f1f1f]"
          >
            <Pencil className="size-3.5" />
            <span role="tooltip" className="pointer-events-none absolute right-0 top-10 z-30 whitespace-nowrap rounded-md bg-[#2b2926] px-2 py-1 text-[11px] font-medium text-white opacity-0 shadow-lg transition-opacity group-hover/tooltip:opacity-100 group-focus-visible/tooltip:opacity-100">Sửa tài nguyên</span>
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onDelete?.(resource);
            }}
            disabled={deleting}
            title="Xóa tài nguyên"
            className="group/tooltip relative flex size-8 items-center justify-center rounded-[10px] border border-[#e8b4a4] bg-white/95 text-[#c0492b] shadow-sm transition hover:bg-[#fdf3ef] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {deleting ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
            <span role="tooltip" className="pointer-events-none absolute right-0 top-10 z-30 whitespace-nowrap rounded-md bg-[#2b2926] px-2 py-1 text-[11px] font-medium text-white opacity-0 shadow-lg transition-opacity group-hover/tooltip:opacity-100 group-focus-visible/tooltip:opacity-100">Xóa tài nguyên</span>
          </button>
        </div>
      )}

      {resource.thumbnailUrl ? (
        <div className="relative hidden size-[92px] shrink-0 overflow-hidden rounded-[10px] bg-[#f5f1ec] sm:block">
          <Image src={resource.thumbnailUrl} alt="" fill className="object-cover" unoptimized />
        </div>
      ) : (
        <div className="hidden size-[92px] shrink-0 items-center justify-center rounded-[10px] bg-[#f5f1ec] sm:flex">
          <SourceIcon className="size-7 text-[#c9a998]" />
        </div>
      )}

      <div className="min-w-0 flex-1">
        {!classInactive && (
          <div className="flex flex-wrap items-center gap-2 pr-16">
            <span className="inline-flex items-center gap-1 rounded-full border border-[#d8d1c9] bg-[#faf9f7] px-2.5 py-1 text-[11px] font-medium text-[#6b6b6b]">
              <SourceIcon className="size-3" /> {sourceTypeLabel(resource.sourceType)}
            </span>
            {resource.submissionEnabled && (
              <span className="inline-flex items-center gap-1 rounded-full border border-[#f0d9aa] bg-[#fff7df] px-2.5 py-1 text-[11px] font-medium text-[#9a661c]">
                <ClipboardList className="size-3" />{" "}
                {/* NOT_APPLICABLE ở đây luôn là do người xem là chủ lớp (giáo viên không tự nộp
                    bài của mình), không phải "tài nguyên không cần nộp bài" — badge chỉ hiện khi
                    submissionEnabled=true nên không nhầm với trường hợp còn lại của NOT_APPLICABLE. */}
                {resource.submissionStatus === "NOT_APPLICABLE" ? "Yêu cầu nộp bài" : submissionStatusLabel(resource.submissionStatus)}
              </span>
            )}
          </div>
        )}

        <h3 className={`text-[15px] font-semibold leading-snug text-[#1f1f1f] ${classInactive ? "pr-16" : "mt-2.5"}`}>{resource.title}</h3>
        {resource.description && (
          <p className="mt-1.5 line-clamp-2 text-[12.5px] leading-[19px] text-[#6b6b6b]">{resource.description}</p>
        )}

        {(resource.attachment?.url || showDeadline) && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {resource.attachment?.url && (
              <a
                href={resource.attachment.url}
                target="_blank"
                rel="noreferrer"
                onClick={(event) => event.stopPropagation()}
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
            {showDeadline && resource.deadline && (
              <span className={`inline-flex items-center gap-1.5 rounded-[10px] border px-2.5 py-1.5 text-[11.5px] font-medium ${deadlineClasses(resource.deadline)}`}>
                <CalendarClock className="size-3.5" />
                {isOverdue(resource.deadline) ? "Quá hạn" : "Hạn nộp"}: {formatDateTime(resource.deadline)}
              </span>
            )}
          </div>
        )}

        <div className="mt-3 flex items-center justify-between border-t border-[#ede8e1] pt-2.5 text-[11.5px] text-[#8a837b]">
          <span>{resource.postedByName ?? "Giáo viên"}</span>
          <span>{formatDateTime(resource.postedAt)}</span>
        </div>
      </div>
    </article>
  );
}
