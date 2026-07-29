"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowLeft, CalendarClock, Inbox, Pencil, RefreshCw } from "lucide-react";
import {
  type AuthFetch,
  type ClassResourceSummary,
  type SubmissionRoster,
  type SubmissionRosterEntry,
  type SubmissionStatus,
  listResourceSubmissions,
  submissionStatusLabel,
} from "@/lib/classroom";
import { deadlineClasses, formatDateTime, isOverdue } from "./shared";

export function rosterStatusClasses(status: SubmissionStatus): string {
  if (status === "ON_TIME") return "border-[#b7e0c4] bg-[#f0faf3] text-[#287447]";
  if (status === "LATE") return "border-[#e8b4a4] bg-[#fdf3ef] text-[#c0492b]";
  return "border-[#d8d1c9] bg-[#f7f5f2] text-[#6b6b6b]";
}

function wasEdited(entry: SubmissionRosterEntry): boolean {
  return Boolean(entry.firstSubmittedAt && entry.submittedAt && entry.firstSubmittedAt !== entry.submittedAt);
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
  const router = useRouter();
  const [roster, setRoster] = useState<SubmissionRoster | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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

  function openDetail(entry: SubmissionRosterEntry) {
    if (entry.status === "NOT_SUBMITTED") return;
    router.push(`/class-detail?classId=${classId}&resourceId=${resource.id}&studentId=${entry.studentId}`);
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
                      onClick={submitted ? () => openDetail(entry) : undefined}
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
    </div>
  );
}
