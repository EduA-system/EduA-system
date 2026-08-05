"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CalendarClock, ClipboardList, Download, Library, Loader2, Paperclip, UploadCloud } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthContext";
import { type ClassResourceSummary, formatFileSize, listClassResources, sourceTypeLabel } from "@/lib/classroom";
import { ClassHubFrame } from "./ClassHubFrame";
import { deadlineClasses, formatDateTime, isOverdue } from "./shared";

export function TeacherResourceDetailPage() {
  const { authFetch } = useAuth();
  const params = useSearchParams();
  const classId = params.get("classId") ?? "";
  const resourceId = params.get("resourceId") ?? "";
  const [resource, setResource] = useState<ClassResourceSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!classId || !resourceId) return;
    setLoading(true);
    setError("");
    try {
      const page = await listClassResources(authFetch, classId, 0, 200);
      const found = page.items.find((item) => item.id === resourceId) ?? null;
      if (!found) {
        setError("Không tìm thấy tài nguyên này trong lớp.");
        return;
      }
      setResource(found);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không thể tải chi tiết tài nguyên.");
    } finally {
      setLoading(false);
    }
  }, [authFetch, classId, resourceId]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  return (
    <ClassHubFrame
      classId={classId}
      active="resources"
      breadcrumbItems={[{ label: resource?.title ?? "Chi tiết tài nguyên" }]}
      header={<div><h1 className="max-w-[900px] break-words font-libertine text-[40px] font-normal leading-[1.02] tracking-[-0.025em] sm:text-[52px]">{resource?.title ?? "Chi tiết tài nguyên"}</h1><p className="mt-3 text-[14px] leading-6 text-[#6b6b6b]">Thông tin và tệp đính kèm được chia sẻ trong lớp.</p></div>}
    >
      <div className="mt-6">
        <Link href={`/class-detail/resources?classId=${classId}`} className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[#817a72] transition hover:text-[#1f1f1f]"><ArrowLeft className="size-3.5" /> Quay lại tài nguyên</Link>
        {loading ? <div className="mt-6 flex items-center gap-2 text-sm text-[#6b6b6b]"><Loader2 className="size-4 animate-spin" /> Đang tải tài nguyên...</div> : error ? <div className="mt-6 rounded-[14px] border border-dashed border-[#e8b4a4] bg-[#fdf3ef] px-5 py-12 text-center text-[13px] text-[#c0492b]">{error}</div> : resource ? <ResourceDetail resource={resource} classId={classId} /> : <div className="mt-6 rounded-[14px] border border-dashed border-[#d8d1c9] px-5 py-12 text-center text-[13px] text-[#6b6b6b]">Chọn một tài nguyên để xem chi tiết.</div>}
      </div>
    </ClassHubFrame>
  );
}

function ResourceDetail({ resource, classId }: { resource: ClassResourceSummary; classId: string }) {
  const SourceIcon = resource.sourceType === "LIBRARY_SNAPSHOT" ? Library : UploadCloud;
  return <article className="mt-5 rounded-[14px] border border-[#d8d1c9] bg-white p-5 sm:p-7">
    <div className="flex flex-wrap items-center gap-2">
      <span className="inline-flex items-center gap-1 rounded-full border border-[#d8d1c9] bg-[#faf9f7] px-2.5 py-1 text-[11px] font-medium text-[#6b6b6b]"><SourceIcon className="size-3" /> {sourceTypeLabel(resource.sourceType)}</span>
      {resource.submissionEnabled && <span className="inline-flex items-center gap-1 rounded-full border border-[#f0d9aa] bg-[#fff7df] px-2.5 py-1 text-[11px] font-medium text-[#9a661c]"><ClipboardList className="size-3" /> Yêu cầu nộp bài</span>}
    </div>
    <h2 className="mt-4 text-[25px] font-semibold leading-tight text-[#1f1f1f]">{resource.title}</h2>
    {resource.description && <p className="mt-4 max-w-3xl whitespace-pre-wrap text-[14px] leading-7 text-[#5f5953]">{resource.description}</p>}
    <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-[#ede8e1] pt-4 text-[12px] text-[#817a72]">
      <span>Đăng bởi {resource.postedByName ?? "Giáo viên"}</span>
      <span aria-hidden>·</span>
      <span>{formatDateTime(resource.postedAt)}</span>
      {resource.deadline && <><span aria-hidden>·</span><span className={`inline-flex items-center gap-1.5 rounded-[10px] border px-2.5 py-1.5 font-medium ${deadlineClasses(resource.deadline)}`}><CalendarClock className="size-3.5" />{isOverdue(resource.deadline) ? "Quá hạn" : "Hạn nộp"}: {formatDateTime(resource.deadline)}</span></>}
    </div>
    {resource.attachment?.url && <a href={resource.attachment.url} target="_blank" rel="noreferrer" className="mt-6 inline-flex items-center gap-2 rounded-[10px] border border-[#d8d1c9] bg-[#faf9f7] px-3 py-2 text-[12px] font-medium text-[#1f1f1f] transition hover:bg-[#f5f1ec]"><Paperclip className="size-4 text-[#8a837b]" /><span className="max-w-[280px] truncate">{resource.attachment.fileName ?? "Tệp đính kèm"}</span>{resource.attachment.sizeBytes !== null && <span className="text-[#8a837b]">· {formatFileSize(resource.attachment.sizeBytes)}</span>}<Download className="size-3.5 text-[#8a837b]" /></a>}
    {resource.sourceType === "LIBRARY_SNAPSHOT" && <Link href={`/class-resource-content?classId=${encodeURIComponent(classId)}&resourceId=${encodeURIComponent(resource.id)}`} className="mt-6 inline-flex items-center gap-2 rounded-[10px] bg-[#d97757] px-3 py-2 text-[12px] font-medium text-white transition hover:bg-[#c96545]"><Library className="size-4" /> Mở tài nguyên</Link>}
  </article>;
}
