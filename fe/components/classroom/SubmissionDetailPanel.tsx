"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AlertCircle, ArrowLeft, Download, Paperclip, Pencil } from "lucide-react";
import { RichView } from "@/components/blog/RichView";
import {
  type AuthFetch,
  type ClassResourceSummary,
  type TeacherSubmissionDetail,
  formatFileSize,
  getTeacherSubmissionDetail,
  submissionStatusLabel,
} from "@/lib/classroom";
import { formatDateTime } from "./shared";
import { rosterStatusClasses } from "./SubmissionsRosterPanel";

export function SubmissionDetailPanel({
  authFetch,
  classId,
  resource,
  studentId,
}: {
  authFetch: AuthFetch;
  classId: string;
  resource: ClassResourceSummary;
  studentId: string;
}) {
  const [detail, setDetail] = useState<TeacherSubmissionDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const found = await getTeacherSubmissionDetail(authFetch, classId, resource.id, studentId);
      setDetail(found);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không thể tải chi tiết bài nộp.");
    } finally {
      setLoading(false);
    }
  }, [authFetch, classId, resource.id, studentId]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const edited = detail ? detail.firstSubmittedAt !== detail.submittedAt : false;
  const backHref = `/class-detail/assignments/submissions?classId=${classId}&resourceId=${resource.id}`;

  return (
    <div className="mx-auto min-w-0 max-w-[860px]">
      <div className="flex items-center gap-2 text-[12px] font-medium text-[#6b6b6b]">
        <Link href={backHref} className="inline-flex items-center gap-1.5 transition hover:text-[#1f1f1f]">
          <ArrowLeft className="size-3.5" /> {resource.title}
        </Link>
        {detail && (
          <>
            <span className="text-[#c9c2b8]">/</span>
            <span className="text-[#1f1f1f]">{detail.studentName ?? "Học sinh"}</span>
          </>
        )}
      </div>

      {error && (
        <div className="mt-4 flex items-start gap-2 rounded-[12px] border border-[#e8b4a4] bg-[#fdf3ef] px-4 py-3 text-[13px] text-[#c0492b]">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading || !detail ? (
        !error && (
          <div className="mt-4 space-y-4">
            <div className="h-[140px] animate-pulse rounded-[14px] bg-[#e8e2db]" />
            <div className="h-[220px] animate-pulse rounded-[14px] bg-[#e8e2db]" />
          </div>
        )
      ) : (
        <div className="mt-4 rounded-[14px] border border-[#d8d1c9] bg-white p-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${rosterStatusClasses(detail.status)}`}>
              {submissionStatusLabel(detail.status)}
            </span>
            {edited && (
              <span className="inline-flex items-center gap-1 rounded-full border border-[#f0d9aa] bg-[#fff7df] px-2.5 py-1 text-[11px] font-medium text-[#9a661c]">
                <Pencil className="size-3" /> Đã chỉnh sửa
              </span>
            )}
          </div>

          <h1 className="font-libertine mt-3 text-[26px] font-normal leading-tight">Bài nộp của {detail.studentName ?? "học sinh"}</h1>

          {detail.textContent && (
            <div className="mt-4 rounded-[12px] border border-[#ede8e1] bg-[#faf9f7] p-3">
              <RichView html={detail.textContent} />
            </div>
          )}

          {detail.files.length > 0 && (
            <ul className="mt-4 flex flex-wrap gap-2">
              {detail.files.map((file) => (
                <li key={file.url}>
                  <a
                    href={file.url}
                    target="_blank"
                    rel="noreferrer"
                    download={file.fileName}
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

          {!detail.textContent && detail.files.length === 0 && (
            <p className="mt-4 text-[12.5px] text-[#6b6b6b]">Bài nộp không có nội dung hiển thị.</p>
          )}

          <div className="mt-4 space-y-1 border-t border-[#ede8e1] pt-3 text-[11.5px] text-[#8a837b]">
            <p>Nộp lần đầu lúc {formatDateTime(detail.firstSubmittedAt)}</p>
            {edited && <p>Chỉnh sửa lần cuối lúc {formatDateTime(detail.submittedAt)}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
