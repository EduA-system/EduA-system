"use client";

import { useCallback, useEffect, useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { GradeSelect } from "@/components/ui/GradeSelect";
import { Dropdown } from "@/components/ui/Dropdown";
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
  const [detail, setDetail] = useState<WeeklyTaskDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

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
      setError(e instanceof Error ? e.message : "Không thể tải danh sách chờ duyệt.");
    } finally {
      setLoading(false);
    }
  }, [authFetch, gradeFilter, picker.chapterCode, picker.lessonCode]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  async function handleExpand(id: string) {
    if (expandedId === id) {
      setExpandedId(null);
      setDetail(null);
      return;
    }
    setExpandedId(id);
    setDetail(null);
    setDetailLoading(true);
    try {
      const d = await getWeeklyTask(authFetch, id);
      setDetail(d);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không thể tải chi tiết giáo án.");
    } finally {
      setDetailLoading(false);
    }
  }

  async function handleApprove(id: string) {
    if (!confirm("Duyệt giáo án này?")) return;
    try {
      await approveWeeklyTask(authFetch, id);
      setMsg("Đã duyệt.");
      setExpandedId(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không thể duyệt giáo án.");
    }
  }

  async function handleReject(id: string) {
    const reason = window.prompt("Lý do từ chối:");
    if (!reason?.trim()) return;
    try {
      await rejectWeeklyTask(authFetch, id, reason.trim());
      setMsg("Đã từ chối.");
      setExpandedId(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không thể từ chối giáo án.");
    }
  }

  return (
    <main className="min-h-screen bg-white text-[#2b2926]">
      <div className="flex min-h-screen">
        <Sidebar activeHref="/lesson-plan-approval" />
        <section className="min-w-0 flex-1 p-5 sm:p-8">
          <header>
            <p className="text-xs font-semibold uppercase tracking-widest text-[#e8724a]">Management</p>
            <h1 className="mt-1 text-3xl font-semibold">Duyệt giáo án tuần</h1>
            <p className="mt-2 text-sm text-[#6b6b6b]">Giáo án giáo viên đã nộp cho nhiệm vụ tuần, chờ duyệt.</p>
          </header>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <GradeSelect value={gradeFilter} onChange={handleGradeChange} includeAll />
            <div className="w-48">
              <Dropdown
                placeholder="Chọn chương..."
                value={picker.chapterCode || null}
                options={picker.chapters.map((c) => ({ value: c.id, label: c.name }))}
                onChange={picker.setChapterCode}
                disabled={!picker.bookCode}
              />
            </div>
            <div className="w-48">
              <Dropdown
                placeholder="Chọn bài..."
                value={picker.lessonCode || null}
                options={picker.lessons.map((l) => ({ value: l.id, label: l.name }))}
                onChange={picker.setLessonCode}
                disabled={!picker.chapterCode}
              />
            </div>
            {picker.chapterCode || picker.lessonCode ? (
              <button type="button" onClick={picker.reset} className="text-sm text-[#b85c3b] underline">
                Xóa bộ lọc chương/bài
              </button>
            ) : null}
          </div>

          {msg ? <p className="mt-4 text-sm text-emerald-700">{msg}</p> : null}
          {error ? <p className="mt-4 text-sm text-red-700">{error}</p> : null}

          {loading ? (
            <div className="mt-6 space-y-3">
              {[1, 2, 3].map((x) => (
                <div key={x} className="h-20 animate-pulse rounded-2xl bg-[#e8e2db]" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="mt-8 rounded-2xl border border-dashed bg-white p-12 text-center text-sm text-[#6b6b6b]">
              Không có giáo án nào chờ duyệt.
            </div>
          ) : (
            <div className="mt-6 space-y-3">
              {items.map((t) => (
                <article key={t.id} className="rounded-2xl border bg-white p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold">{t.teacherName ?? "Giáo viên"}</p>
                        <span className="rounded-full bg-[#edf4ff] px-2 py-0.5 text-xs font-semibold text-[#2f5f9b]">
                          Khối {t.grade}
                        </span>
                      </div>
                      <p className="mt-1 text-sm">{t.scopeDescription}</p>
                      <p className="mt-0.5 text-xs text-[#6b6b6b]">
                        {t.chapterName} · {t.lessonName}
                      </p>
                      <p className="mt-2 text-xs text-[#6b6b6b]">
                        {subjectLabel(t.subject)} · Tuần {weekLabel(t.weekStartDate)} · Nộp lúc {formatDateTime(t.submittedAt)}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-3 text-sm">
                      <button onClick={() => void handleExpand(t.id)} className="text-[#b85c3b] underline">
                        {expandedId === t.id ? "Ẩn chi tiết" : "Xem chi tiết"}
                      </button>
                      <button onClick={() => void handleApprove(t.id)} className="text-emerald-700 underline">
                        Duyệt
                      </button>
                      <button onClick={() => void handleReject(t.id)} className="text-red-600 underline">
                        Từ chối
                      </button>
                    </div>
                  </div>

                  {expandedId === t.id ? (
                    <div className="mt-4 rounded-xl border bg-[#f9f7f4] p-3 text-sm">
                      {detailLoading || !detail ? (
                        <p className="text-[#6b6b6b]">Đang tải chi tiết...</p>
                      ) : (
                        <>
                          <p>
                            <span className="text-[#6b6b6b]">Hạn nộp:</span> {formatDateTime(detail.deadline)}
                          </p>
                          {detail.sourceDocumentUrl ? (
                            <p className="mt-1">
                              <a
                                href={detail.sourceDocumentUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[#b85c3b] underline"
                              >
                                Xem tài liệu đã tải lên{detail.sourceDocumentName ? ` (${detail.sourceDocumentName})` : ""}
                              </a>
                            </p>
                          ) : detail.sourceLibraryContentId ? (
                            <div className="mt-3">
                              <p className="text-[#6b6b6b]">Nguồn: {detail.sourceLibraryContentTitle ?? "Giáo án trong thư viện của giáo viên"}.</p>
                              {detail.sourceLibraryContentPayload ? (
                                <details className="mt-2 rounded-lg border bg-white p-2">
                                  <summary className="cursor-pointer font-medium text-[#b85c3b]">Xem bản giáo án đã nộp</summary>
                                  <pre className="mt-2 max-h-96 overflow-auto whitespace-pre-wrap text-xs text-[#3f3b36]">{JSON.stringify(detail.sourceLibraryContentPayload, null, 2)}</pre>
                                </details>
                              ) : null}
                            </div>
                          ) : null}
                        </>
                      )}
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

export default function Page() {
  return (
    <RouteGuard pathname="/lesson-plan-approval">
      <LessonPlanApprovalScreen />
    </RouteGuard>
  );
}
