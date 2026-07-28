"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  CalendarClock,
  Download,
  Inbox,
  Paperclip,
  Pencil,
  RefreshCw,
  X,
} from "lucide-react";
import { RichView } from "@/components/blog/RichView";
import {
  type AuthFetch,
  type ClassResourceSummary,
  type SubmissionRoster,
  type SubmissionRosterEntry,
  type SubmissionStatus,
  type TeacherSubmissionDetail,
  formatFileSize,
  getTeacherSubmissionDetail,
  listResourceSubmissions,
  submissionStatusLabel,
} from "@/lib/classroom";
import { deadlineClasses, formatDateTime, isOverdue } from "./shared";

function rosterStatusClasses(status: SubmissionStatus): string {
  if (status === "ON_TIME") return "border-[#b7e0c4] bg-[#f0faf3] text-[#287447]";
  if (status === "LATE") return "border-[#e8b4a4] bg-[#fdf3ef] text-[#c0492b]";
  return "border-[#d8d1c9] bg-[#f7f5f2] text-[#6b6b6b]";
}

function wasEdited(entry: SubmissionRosterEntry): boolean {
  return Boolean(entry.firstSubmittedAt && entry.submittedAt && entry.firstSubmittedAt !== entry.submittedAt);
}

function SubmissionDetailModal({
  studentName,
  detail,
  loading,
  error,
  onClose,
}: {
  studentName: string;
  detail: TeacherSubmissionDetail | null;
  loading: boolean;
  error: string;
  onClose: () => void;
}) {
  useEffect(() => {
    document.body.style.overflow = "hidden";
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  const edited = detail ? detail.firstSubmittedAt !== detail.submittedAt : false;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 px-4 py-10"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[640px] rounded-[18px] bg-white shadow-[0_24px_64px_rgba(0,0,0,0.18)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[#ede8e1] px-6 py-4">
          <h3 className="text-[15px] font-semibold text-[#1f1f1f]">Bài nộp của {studentName}</h3>
          <button
            type="button"
            onClick={onClose}
            className="flex size-8 items-center justify-center rounded-[10px] text-[#8a837b] transition hover:bg-[#f5f1ec] hover:text-[#1f1f1f]"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="max-h-[70vh] space-y-4 overflow-y-auto px-6 py-5">
          {loading ? (
            <div className="space-y-3">
              <div className="h-[100px] animate-pulse rounded-[12px] bg-[#e8e2db]" />
              <div className="h-[40px] animate-pulse rounded-[12px] bg-[#e8e2db]" />
            </div>
          ) : error ? (
            <div className="flex items-start gap-2 rounded-[12px] border border-[#e8b4a4] bg-[#fdf3ef] px-4 py-3 text-[13px] text-[#c0492b]">
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              <span>{error}</span>
            </div>
          ) : detail ? (
            <>
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

              {detail.textContent && (
                <div className="rounded-[12px] border border-[#ede8e1] bg-[#faf9f7] p-3">
                  <RichView html={detail.textContent} />
                </div>
              )}

              {detail.files.length > 0 && (
                <ul className="flex flex-wrap gap-2">
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
                <p className="text-[12.5px] text-[#6b6b6b]">Bài nộp không có nội dung hiển thị.</p>
              )}

              <div className="space-y-1 border-t border-[#ede8e1] pt-3 text-[11.5px] text-[#8a837b]">
                <p>Nộp lần đầu lúc {formatDateTime(detail.firstSubmittedAt)}</p>
                {edited && <p>Chỉnh sửa lần cuối lúc {formatDateTime(detail.submittedAt)}</p>}
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function SubmissionsRosterPanel({
  authFetch,
  classId,
  resource,
}: {
  authFetch: AuthFetch;
  classId: string;
  resource: ClassResourceSummary;
}) {
  const [roster, setRoster] = useState<SubmissionRoster | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [selectedStudentName, setSelectedStudentName] = useState("");
  const [detail, setDetail] = useState<TeacherSubmissionDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await listResourceSubmissions(authFetch, classId, resource.id);
      setRoster(result);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không thể tải danh sách bài nộp.");
    } finally {
      setLoading(false);
    }
  }, [authFetch, classId, resource.id]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function openDetail(entry: SubmissionRosterEntry) {
    if (entry.status === "NOT_SUBMITTED") return;
    setSelectedStudentId(entry.studentId);
    setSelectedStudentName(entry.studentName || entry.studentEmail || "học sinh");
    setDetail(null);
    setDetailError("");
    setDetailLoading(true);
    try {
      const found = await getTeacherSubmissionDetail(authFetch, classId, resource.id, entry.studentId);
      setDetail(found);
    } catch (reason) {
      setDetailError(reason instanceof Error ? reason.message : "Không thể tải chi tiết bài nộp.");
    } finally {
      setDetailLoading(false);
    }
  }

  function closeDetail() {
    setSelectedStudentId(null);
    setDetail(null);
    setDetailError("");
  }

  const deadline = roster?.deadline ?? resource.deadline;

  return (
    <div className="min-w-0">
      <Link
        href={`/class-detail?classId=${classId}`}
        className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[#6b6b6b] transition hover:text-[#1f1f1f]"
      >
        <ArrowLeft className="size-3.5" /> Quay lại lớp học
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-libertine text-[24px] font-normal leading-tight text-[#1f1f1f]">{resource.title}</h2>
          {deadline && (
            <span className={`mt-2 inline-flex items-center gap-1.5 rounded-[10px] border px-2.5 py-1.5 text-[11.5px] font-medium ${deadlineClasses(deadline)}`}>
              <CalendarClock className="size-3.5" />
              {isOverdue(deadline) ? "Quá hạn" : "Hạn nộp"}: {formatDateTime(deadline)}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="inline-flex h-9 items-center gap-2 rounded-[10px] border border-[#d8d1c9] bg-white px-3 text-[12px] font-medium text-[#6b6b6b] transition hover:bg-[#f5f1ec] hover:text-[#1f1f1f]"
        >
          <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} /> Làm mới
        </button>
      </div>

      {error && (
        <div className="mt-4 flex items-start gap-2 rounded-[12px] border border-[#e8b4a4] bg-[#fdf3ef] px-4 py-3 text-[13px] text-[#c0492b]">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="mt-5">
        {loading && !roster ? (
          <div className="grid gap-3">
            {[1, 2, 3].map((item) => (
              <div key={item} className="h-[62px] animate-pulse rounded-[12px] bg-[#e8e2db]" />
            ))}
          </div>
        ) : roster && roster.items.length === 0 ? (
          <div className="rounded-[14px] border border-dashed border-[#d8d1c9] bg-white px-5 py-14 text-center">
            <Inbox className="mx-auto size-8 text-[#a8a097]" />
            <p className="mt-3 text-[13px] font-medium">Lớp chưa có học sinh nào</p>
          </div>
        ) : roster ? (
          <div className="overflow-hidden rounded-[12px] border border-[#ede8e1] bg-white">
            <table className="w-full text-left text-[13px]">
              <thead>
                <tr className="border-b border-[#ede8e1] text-[11px] uppercase tracking-[0.06em] text-[#6b6b6b]">
                  <th className="px-4 py-3 font-medium">Học sinh</th>
                  <th className="px-4 py-3 font-medium">Trạng thái</th>
                  <th className="px-4 py-3 font-medium">Nộp lần đầu</th>
                  <th className="px-4 py-3 font-medium">Sửa lần cuối</th>
                </tr>
              </thead>
              <tbody>
                {roster.items.map((entry) => {
                  const submitted = entry.status !== "NOT_SUBMITTED";
                  const edited = wasEdited(entry);
                  return (
                    <tr
                      key={entry.studentId}
                      onClick={submitted ? () => void openDetail(entry) : undefined}
                      className={`border-b border-[#f2efe9] last:border-0 ${submitted ? "cursor-pointer hover:bg-[#faf9f7]" : ""}`}
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium text-[#1f1f1f]">{entry.studentName || entry.studentEmail || "—"}</div>
                        {entry.studentName && entry.studentEmail && (
                          <div className="text-[12px] text-[#8a837b]">{entry.studentEmail}</div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${rosterStatusClasses(entry.status)}`}>
                            {submissionStatusLabel(entry.status)}
                          </span>
                          {edited && (
                            <span className="inline-flex items-center gap-1 rounded-full border border-[#f0d9aa] bg-[#fff7df] px-2 py-0.5 text-[10.5px] font-medium text-[#9a661c]">
                              <Pencil className="size-2.5" /> Đã sửa
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[#6b6b6b]">
                        {entry.firstSubmittedAt ? formatDateTime(entry.firstSubmittedAt) : "—"}
                      </td>
                      <td className="px-4 py-3 text-[#6b6b6b]">
                        {edited ? formatDateTime(entry.submittedAt as string) : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>

      {selectedStudentId && (
        <SubmissionDetailModal
          studentName={selectedStudentName}
          detail={detail}
          loading={detailLoading}
          error={detailError}
          onClose={closeDetail}
        />
      )}
    </div>
  );
}
