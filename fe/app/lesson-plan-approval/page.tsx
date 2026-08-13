"use client";

import { AlertCircle, BookOpen, CalendarClock, CheckCircle2, Eye, Filter, Inbox, Library, Loader2, UserRound, X, XCircle } from "lucide-react";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { RichView } from "@/components/blog/RichView";
import { ConfirmDialog, TextPromptDialog } from "@/components/ui/ConfirmDialog";
import { GradeSelect } from "@/components/ui/GradeSelect";
import { Dropdown } from "@/components/ui/Dropdown";
import { resolveWeeklyTaskLessonDocument } from "@/components/weeklytask/WeeklyTaskDocumentViewer";
import { RouteGuard } from "@/lib/auth/RouteGuard";
import { useAuth } from "@/lib/auth/AuthContext";
import { subjectLabel } from "@/lib/blog";
import { useTextbookPicker } from "@/lib/textbook-picker";
import {
  approveWeeklyTask,
  getWeeklyTask,
  listWeeklyTaskModerationQueue,
  rejectWeeklyTask,
  type WeeklyTaskDetail,
  type WeeklyTaskSummary,
} from "@/lib/weekly-task";
import type { TiptapNode } from "@/lib/tiptap-to-text";

function formatDateTime(iso: string | null): string {
  return iso ? new Date(iso).toLocaleString("vi") : "-";
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** Nhãn tuần lịch thực (BR-52): Thứ 2 → Chủ Nhật, vd "06/08 - 09/08". */
function weekLabel(weekStartDate: string): string {
  const start = new Date(`${weekStartDate}T00:00:00`);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const fmt = (d: Date) => `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}`;
  return `${fmt(start)} - ${fmt(end)}`;
}

function LessonPlanApprovalScreen() {
  const { user, authFetch } = useAuth();
  const searchParams = useSearchParams();
  // Deep-link từ notification "Giáo án chờ duyệt" (WeeklyTaskService.submit): mang theo taskId để tự mở
  // đúng submission được nộp, thay vì chỉ đưa Moderator tới danh sách chung — cần thiết vì nhiều giáo viên
  // có thể nộp gần như cùng lúc và mỗi notification phải phân biệt đúng bài của ai.
  const focusTaskId = searchParams.get("taskId");
  const autoPreview = searchParams.get("preview") === "1";
  const focusedRef = useRef(false);

  const [items, setItems] = useState<WeeklyTaskSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");

  // BR-51/BR-53: filter theo khối rồi Chương/Bài — chọn từ dropdown danh mục SGK, không phải tìm tự do.
  const [gradeFilter, setGradeFilter] = useState<number | null>(null);
  const picker = useTextbookPicker(user?.subject ?? undefined, gradeFilter, gradeFilter !== null);

  function handleGradeChange(grade: number | null) {
    setGradeFilter(grade);
    picker.reset();
  }

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const detailRequestSeq = useRef(0);
  const [detail, setDetail] = useState<WeeklyTaskDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [preview, setPreview] = useState<{ title: string; document: TiptapNode | string } | null>(null);
  const [approveTarget, setApproveTarget] = useState<WeeklyTaskSummary | null>(null);
  const [rejectTarget, setRejectTarget] = useState<WeeklyTaskSummary | null>(null);
  const [reviewingId, setReviewingId] = useState<string | null>(null);

  const openSubmittedLessonPreview = useCallback((taskDetail: WeeklyTaskDetail) => {
    const document = resolveWeeklyTaskLessonDocument(taskDetail.sourceLibraryContentPayload);
    if (!document) {
      setMsg("");
      setError("Nhiệm vụ này không có nội dung giáo án để hiển thị.");
      return;
    }
    setPreview({
      title: taskDetail.sourceLibraryContentTitle ?? "Giáo án đã nộp",
      document,
    });
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ size: "50" });
      if (gradeFilter !== null) params.set("grade", String(gradeFilter));
      if (picker.chapterCode) params.set("chapterCode", picker.chapterCode);
      if (picker.lessonCode) params.set("lessonCode", picker.lessonCode);
      const data = await listWeeklyTaskModerationQueue(authFetch, params);
      setItems(data.items);
      setError("");
    } catch (e) {
      setMsg("");
      setError(e instanceof Error ? e.message : "Không thể tải danh sách chờ duyệt.");
    } finally {
      setLoading(false);
    }
  }, [authFetch, gradeFilter, picker.chapterCode, picker.lessonCode]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  // Đổi bộ lọc (khối/chương/bài) là đổi ngữ cảnh — thông báo "Đã duyệt."/"Đã từ chối." của lần thao tác
  // trước không còn liên quan, phải xoá ngay chứ không để trôi sang tới khi F5 mới mất.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMsg("");
    setError("");
  }, [gradeFilter, picker.chapterCode, picker.lessonCode]);

  const handleExpand = useCallback(
    async (id: string, options?: { preview?: boolean }) => {
      if (expandedId === id) {
        if (options?.preview && detail?.id === id) openSubmittedLessonPreview(detail);
        if (options?.preview) return;
        detailRequestSeq.current += 1;
        setExpandedId(null);
        setDetail(null);
        setDetailLoading(false);
        return;
      }
      const requestSeq = detailRequestSeq.current + 1;
      detailRequestSeq.current = requestSeq;
      setExpandedId(id);
      setDetail(null);
      setDetailLoading(true);
      try {
        const d = await getWeeklyTask(authFetch, id);
        if (detailRequestSeq.current === requestSeq) {
          setDetail(d);
          if (options?.preview) openSubmittedLessonPreview(d);
        }
      } catch (e) {
        if (detailRequestSeq.current === requestSeq) {
          setMsg("");
          setError(e instanceof Error ? e.message : "Không thể tải chi tiết giáo án.");
        }
      } finally {
        if (detailRequestSeq.current === requestSeq) setDetailLoading(false);
      }
    },
    [authFetch, detail, expandedId, openSubmittedLessonPreview],
  );

  // Sau khi hàng đợi tải xong lần đầu, nếu có taskId từ notification thì tự mở rộng + cuộn tới đúng thẻ đó.
  // Nếu không tìm thấy (đã được xử lý bởi Moderator khác, hoặc bị lọc mất) thì báo rõ thay vì im lặng.
  useEffect(() => {
    if (!focusTaskId || focusedRef.current || loading) return;
    focusedRef.current = true;
    const target = items.find((t) => t.id === focusTaskId);
    if (!target) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMsg("");
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setError("Không tìm thấy nhiệm vụ được thông báo trong hàng đợi hiện tại — có thể đã được xử lý.");
      return;
    }
    void handleExpand(target.id, { preview: autoPreview });
    requestAnimationFrame(() => {
      document.getElementById(`weekly-task-${target.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }, [autoPreview, focusTaskId, items, loading, handleExpand]);

  async function handleApprove(id: string) {
    setReviewingId(id);
    try {
      await approveWeeklyTask(authFetch, id);
      setError("");
      setMsg("Đã duyệt.");
      setExpandedId(null);
      setApproveTarget(null);
      await load();
    } catch (e) {
      setMsg("");
      setError(e instanceof Error ? e.message : "Không thể duyệt giáo án.");
    } finally {
      setReviewingId(null);
    }
  }

  async function handleReject(id: string, reason: string) {
    if (!reason.trim()) return;
    setReviewingId(id);
    try {
      await rejectWeeklyTask(authFetch, id, reason.trim());
      setError("");
      setMsg("Đã từ chối.");
      setExpandedId(null);
      setRejectTarget(null);
      await load();
    } catch (e) {
      setMsg("");
      setError(e instanceof Error ? e.message : "Không thể từ chối giáo án.");
    } finally {
      setReviewingId(null);
    }
  }

  return (
    <main className="min-h-screen bg-[#f7f5f2] text-[#2b2926]">
      <div className="flex min-h-screen">
        <Sidebar activeHref="/lesson-plan-approval" />
        <section className="min-w-0 flex-1 px-5 py-6 sm:px-8 lg:px-10">
          <header className="flex flex-wrap items-end justify-between gap-4 border-b border-[#e4ddd4] pb-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-[#d97757]">Management</p>
              <h1 className="mt-1 text-[30px] font-semibold leading-tight">Duyệt giáo án tuần</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[#6b6b6b]">
                Kiểm tra giáo án giáo viên đã nộp theo khối, chương và bài trước khi duyệt trong lịch nộp giáo án.
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-[#e4ddd4] bg-white px-4 py-3 shadow-sm">
              <Inbox className="size-4 text-[#d97757]" />
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wide text-[#8a8178]">Chờ duyệt</p>
                <p className="text-lg font-semibold leading-none">{items.length}</p>
              </div>
            </div>
          </header>

          <div className="mt-5 flex flex-wrap items-center gap-2.5 rounded-xl border border-[#e4ddd4] bg-white p-3 shadow-sm sm:px-4">
            <div className="flex shrink-0 items-center gap-2 rounded-lg bg-[#fff7f2] px-2.5 py-2 text-sm font-medium text-[#7a4a37]">
              <Filter className="size-4 text-[#d97757]" />
              Bộ lọc
            </div>
            <div className="hidden h-7 w-px bg-[#e8e2d9] sm:block" />
            <GradeSelect value={gradeFilter} onChange={handleGradeChange} includeAll className="shrink-0" />
            <div className="min-w-0 flex-1 basis-56 sm:max-w-64">
              <Dropdown
                placeholder="Chọn chương..."
                value={picker.chapterCode || null}
                options={picker.chapters.map((c) => ({ value: c.id, label: c.name }))}
                onChange={picker.setChapterCode}
                disabled={!picker.bookCode}
              />
            </div>
            <div className="min-w-0 flex-1 basis-56 sm:max-w-64">
              <Dropdown
                placeholder="Chọn bài..."
                value={picker.lessonCode || null}
                options={picker.lessons.map((l) => ({ value: l.id, label: l.name }))}
                onChange={picker.setLessonCode}
                disabled={!picker.chapterCode}
              />
            </div>
            {picker.chapterCode || picker.lessonCode ? (
              <button type="button" onClick={picker.reset} className="shrink-0 rounded-lg px-3 py-2 text-sm font-medium text-[#b85c3b] hover:bg-[#fff4ed]">
                Xóa bộ lọc chương/bài
              </button>
            ) : null}
          </div>

          {msg ? (
            <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              <CheckCircle2 className="size-4 shrink-0" />
              {msg}
            </div>
          ) : null}
          {error ? (
            <div className="mt-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              <AlertCircle className="size-4 shrink-0" />
              {error}
            </div>
          ) : null}

          {loading ? (
            <div className="mt-6 space-y-3">
              {[1, 2, 3].map((x) => (
                <div key={x} className="h-28 animate-pulse rounded-xl border border-[#e4ddd4] bg-white" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="mt-8 flex min-h-[320px] flex-col items-center justify-center rounded-xl border border-dashed border-[#d8d1c9] bg-white px-6 text-center shadow-sm">
              <Inbox className="size-10 text-[#c8beb4]" />
              <h2 className="mt-4 text-lg font-semibold">Không có giáo án nào chờ duyệt</h2>
              <p className="mt-2 max-w-md text-sm leading-6 text-[#6b6b6b]">
                Khi giáo viên nộp giáo án trong lịch nộp giáo án, danh sách sẽ xuất hiện tại đây.
              </p>
            </div>
          ) : (
            <div className="mt-6 space-y-4">
              {items.map((t) => (
                <article
                  key={t.id}
                  id={`weekly-task-${t.id}`}
                  className={`overflow-hidden rounded-xl border bg-white shadow-sm transition ${
                    focusTaskId === t.id ? "border-[#e8724a] ring-2 ring-[#e8724a]/25" : "border-[#e4ddd4]"
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-4 p-5">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 text-sm font-semibold">
                          <UserRound className="size-4 text-[#8a8178]" />
                          {t.teacherName ?? "Giáo viên"}
                        </span>
                        <span className="rounded-full bg-[#edf4ff] px-2.5 py-1 text-xs font-semibold text-[#2f5f9b]">
                          Khối {t.grade}
                        </span>
                        <span className="rounded-full bg-[#f5f1ec] px-2.5 py-1 text-xs font-medium text-[#6b6259]">
                          {subjectLabel(t.subject)}
                        </span>
                      </div>
                      <h2 className="mt-3 text-base font-semibold leading-6">{t.scopeDescription}</h2>
                      <p className="mt-1 flex items-center gap-1.5 text-sm text-[#6b6b6b]">
                        <BookOpen className="size-4 shrink-0 text-[#a69b90]" />
                        {t.chapterName} · {t.lessonName}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2 text-xs text-[#6b6b6b]">
                        <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#faf9f7] px-2.5 py-1.5">
                          <CalendarClock className="size-3.5 text-[#a69b90]" />
                          Tuần {weekLabel(t.weekStartDate)}
                        </span>
                        <span className="inline-flex items-center rounded-lg bg-[#faf9f7] px-2.5 py-1.5">
                          Nộp lúc {formatDateTime(t.submittedAt)}
                        </span>
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2 text-sm">
                      <button
                        type="button"
                        onClick={() => void handleExpand(t.id)}
                        className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#d8d1c9] bg-white px-3 font-medium text-[#4f4943] transition hover:bg-[#f5f1ec]"
                      >
                        <Eye className="size-4" />
                        {expandedId === t.id ? "Ẩn chi tiết" : "Xem chi tiết"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setApproveTarget(t)}
                        className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-emerald-600 px-3 font-medium text-white transition hover:bg-emerald-700"
                      >
                        <CheckCircle2 className="size-4" />
                        Duyệt
                      </button>
                      <button
                        type="button"
                        onClick={() => setRejectTarget(t)}
                        className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 font-medium text-red-700 transition hover:bg-red-100"
                      >
                        <XCircle className="size-4" />
                        Từ chối
                      </button>
                    </div>
                  </div>

                  {expandedId === t.id ? (
                    <div className="border-t border-[#eee7df] bg-[#fbfaf8] px-5 py-4 text-sm">
                      {detailLoading || !detail || detail.id !== t.id ? (
                        <p className="flex items-center gap-2 text-[#6b6b6b]">
                          <Loader2 className="size-4 animate-spin" />
                          Đang tải chi tiết...
                        </p>
                      ) : (
                        <div className="space-y-3">
                          <p className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-2 text-[#4f4943]">
                            <CalendarClock className="size-4 text-[#a69b90]" />
                            <span className="text-[#6b6b6b]">Hạn nộp:</span> {formatDateTime(detail.deadline)}
                          </p>
                          {detail.sourceDocumentUrl ? (
                            <p>
                              <a
                                href={detail.sourceDocumentUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1.5 rounded-lg bg-[#e8724a] px-3 py-2 text-xs font-medium text-white transition hover:bg-[#d9633b]"
                              >
                                <Library className="size-3.5" />
                                Xem tài liệu đã tải lên{detail.sourceDocumentName ? ` (${detail.sourceDocumentName})` : ""}
                              </a>
                            </p>
                          ) : detail.sourceLibraryContentId ? (
                            <div className="space-y-2">
                              <p className="text-[#6b6b6b]">Nguồn: {detail.sourceLibraryContentTitle ?? "Giáo án trong thư viện của giáo viên"}.</p>
                              {detail.sourceLibraryContentPayload ? (
                                <button
                                  type="button"
                                  onClick={() => openSubmittedLessonPreview(detail)}
                                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#e8724a] px-3 py-2 text-xs font-medium text-white transition hover:bg-[#d9633b]"
                                >
                                  <Library className="size-3.5" /> Mở tài nguyên
                                </button>
                              ) : null}
                            </div>
                          ) : null}
                        </div>
                      )}
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          )}

          {preview ? (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-[2px]"
              role="dialog"
              aria-modal="true"
              aria-labelledby="approval-preview-title"
              onMouseDown={() => setPreview(null)}
            >
              <div
                className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl bg-[#f7f5f2] shadow-2xl"
                onMouseDown={(event) => event.stopPropagation()}
              >
                <header className="flex shrink-0 items-center justify-between gap-3 border-b border-[#e4ddd4] bg-white px-5 py-3">
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-[#d97757]">Xem giáo án đã nộp</p>
                    <h2 id="approval-preview-title" className="truncate text-base font-semibold">
                      {preview.title}
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPreview(null)}
                    aria-label="Đóng"
                    className="flex size-9 shrink-0 items-center justify-center rounded-lg text-[#6b6259] transition hover:bg-[#f5f1ec]"
                  >
                    <X className="size-5" />
                  </button>
                </header>
                <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-6">
                  <article className="mx-auto max-w-[860px] bg-white px-8 py-10 shadow-[0_1px_2px_rgba(43,41,38,0.06),0_8px_28px_rgba(43,41,38,0.08)] sm:px-12 lg:px-16">
                    <RichView html={preview.document} variant="document" />
                  </article>
                </div>
              </div>
            </div>
          ) : null}
        </section>
      </div>
      <ConfirmDialog
        open={approveTarget !== null}
        onClose={() => setApproveTarget(null)}
        onConfirm={() => approveTarget && void handleApprove(approveTarget.id)}
        loading={Boolean(approveTarget && reviewingId === approveTarget.id)}
        title="Duyệt giáo án?"
        description={
          <>
            Giáo án <span className="font-semibold text-[#1f1f1f]">&quot;{approveTarget?.scopeDescription}&quot;</span> của {approveTarget?.teacherName ?? "giáo viên"} sẽ được duyệt.
          </>
        }
        confirmLabel="Duyệt"
        variant="success"
      />
      <TextPromptDialog
        open={rejectTarget !== null}
        onClose={() => setRejectTarget(null)}
        onConfirm={(reason) => rejectTarget && void handleReject(rejectTarget.id, reason)}
        loading={Boolean(rejectTarget && reviewingId === rejectTarget.id)}
        title="Từ chối giáo án?"
        description={
          <>
            Nhập lý do để giáo viên biết cần chỉnh sửa phần nào trong <span className="font-semibold text-[#1f1f1f]">&quot;{rejectTarget?.scopeDescription}&quot;</span>.
          </>
        }
        label="Lý do từ chối"
        placeholder="Ví dụ: Thiếu hoạt động vận dụng, cần bổ sung tiêu chí đánh giá..."
        confirmLabel="Từ chối"
        minLength={1}
      />
    </main>
  );
}

export default function Page() {
  return (
    <RouteGuard pathname="/lesson-plan-approval">
      <Suspense
        fallback={
          <main className="flex min-h-screen items-center justify-center bg-[#f7f5f2] text-sm text-[#6b6b6b]">
            Đang tải hàng đợi duyệt...
          </main>
        }
      >
        <LessonPlanApprovalScreen />
      </Suspense>
    </RouteGuard>
  );
}
