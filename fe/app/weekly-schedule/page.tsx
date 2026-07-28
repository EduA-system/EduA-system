"use client";

import { useCallback, useEffect, useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Modal } from "@/components/ui/Modal";
import { DatePicker } from "@/components/ui/DatePicker";
import { MonthPicker } from "@/components/ui/MonthPicker";
import { RouteGuard } from "@/lib/auth/RouteGuard";
import { useAuth } from "@/lib/auth/AuthContext";
import { hasAnyRole } from "@/lib/auth/permissions";
import { subjectLabel, uploadFile } from "@/lib/blog";
import { listLibrary, type LibraryContent } from "@/lib/library";
import {
  bulkCreateWeeklyTasks,
  getWeeklySchedule,
  submitWeeklyTask,
  unsubmitWeeklyTask,
  updateWeeklyTask,
  type WeeklyTaskReviewStatus,
  type WeeklyTaskSchedule,
  type WeeklyTaskSummary,
} from "@/lib/weekly-task";

type TeacherOption = { id: string; fullName: string | null; email: string; status: string };

const statusLabels: Record<WeeklyTaskReviewStatus, string> = {
  NOT_SUBMITTED: "Chưa nộp",
  SUBMITTED: "Đã nộp · chờ duyệt",
  APPROVED: "Đã duyệt",
  REJECTED: "Bị từ chối",
};

const statusClasses: Record<WeeklyTaskReviewStatus, string> = {
  NOT_SUBMITTED: "bg-[#f0f0ee] text-[#4a4b5e]",
  SUBMITTED: "bg-amber-100 text-amber-800",
  APPROVED: "bg-emerald-100 text-emerald-800",
  REJECTED: "bg-red-100 text-red-800",
};

type LessonGroup = { key: string; scopeDescription: string; deadline: string; tasks: WeeklyTaskSummary[] };

function groupByLesson(tasks: WeeklyTaskSummary[]): LessonGroup[] {
  const map = new Map<string, LessonGroup>();
  for (const t of tasks) {
    const key = `${t.scopeDescription}__${t.deadline}`;
    const existing = map.get(key);
    if (existing) {
      existing.tasks.push(t);
    } else {
      map.set(key, { key, scopeDescription: t.scopeDescription, deadline: t.deadline, tasks: [t] });
    }
  }
  return Array.from(map.values()).sort((a, b) => a.deadline.localeCompare(b.deadline));
}

/** Ngày bắt đầu của 4 tuần cố định (1/8/15/22) trong 1 tháng — khớp cách chia PPCT theo tuần. */
function monthWeekStarts(year: number, month: number): string[] {
  return [1, 8, 15, 22].map((day) => `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`);
}

function monthRange(year: number, month: number): { from: string; to: string } {
  const lastDay = new Date(year, month + 1, 0).getDate();
  return {
    from: `${year}-${String(month + 1).padStart(2, "0")}-01`,
    to: `${year}-${String(month + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`,
  };
}

function buildMonthSchedule(weeks: WeeklyTaskSchedule["weeks"], year: number, month: number): WeeklyTaskSchedule["weeks"] {
  const byDate = new Map(weeks.map((w) => [w.weekStartDate, w]));
  return monthWeekStarts(year, month).map((date) => byDate.get(date) ?? { weekStartDate: date, tasks: [] });
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("vi");
}

function formatWeek(dateOnly: string): string {
  return new Date(`${dateOnly}T00:00:00`).toLocaleDateString("vi");
}

function toDatetimeLocalValue(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function isPastDeadline(iso: string): boolean {
  return new Date(iso).getTime() <= Date.now();
}

function LessonGroupCard({
  group,
  expanded,
  onToggle,
  onEditTeacher,
}: {
  group: LessonGroup;
  expanded: boolean;
  onToggle: () => void;
  onEditTeacher: (t: WeeklyTaskSummary) => void;
}) {
  const submittedCount = group.tasks.filter((t) => t.reviewStatus !== "NOT_SUBMITTED").length;
  return (
    <div className="rounded-2xl border bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm">{group.scopeDescription}</p>
          <p className="mt-1 text-xs text-[#6b6b6b]">Hạn nộp: {formatDateTime(group.deadline)}</p>
        </div>
        <button type="button" onClick={onToggle} className="shrink-0 text-xs text-[#b85c3b] underline">
          {submittedCount}/{group.tasks.length} đã nộp {expanded ? "▲" : "▼"}
        </button>
      </div>
      {expanded ? (
        <div className="mt-3 space-y-2 border-t pt-3">
          {group.tasks.map((t) => (
            <div key={t.id} className="flex items-center justify-between gap-2 text-xs">
              <span className="min-w-0 truncate">{t.teacherName ?? "Giáo viên"}</span>
              <span className="flex shrink-0 items-center gap-2">
                <span className={`rounded-full px-2 py-0.5 font-medium ${statusClasses[t.reviewStatus]}`}>
                  {statusLabels[t.reviewStatus]}
                </span>
                <button type="button" onClick={() => onEditTeacher(t)} className="text-[#b85c3b] underline">
                  Sửa
                </button>
              </span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function WeeklyScheduleScreen() {
  const { user, accessToken, authFetch } = useAuth();
  const isModerator = hasAnyRole(user, ["MODERATOR"]);

  const [schedule, setSchedule] = useState<WeeklyTaskSchedule>({ weeks: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");

  const [teachers, setTeachers] = useState<TeacherOption[]>([]);
  const [expandedGroupKey, setExpandedGroupKey] = useState<string | null>(null);
  const [viewYear, setViewYear] = useState(() => new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(() => new Date().getMonth());

  // ── Sửa 1 giáo viên trong 1 tuần (Moderator) ──────────────────────────
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formTeacherId, setFormTeacherId] = useState("");
  const [formWeekStart, setFormWeekStart] = useState("");
  const [formScope, setFormScope] = useState("");
  const [formDeadline, setFormDeadline] = useState("");
  const [saving, setSaving] = useState(false);

  // ── Tạo lịch tuần chung cho cả môn (Moderator, bulk-assign) ───────────
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkWeekStart, setBulkWeekStart] = useState("");
  const [bulkLessons, setBulkLessons] = useState<{ scope: string; deadline: string }[]>([{ scope: "", deadline: "" }]);
  const [bulkSaving, setBulkSaving] = useState(false);

  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [submitMode, setSubmitMode] = useState<"library" | "upload">("library");
  const [ownedLessonPlans, setOwnedLessonPlans] = useState<LibraryContent[]>([]);
  const [selectedLessonPlanId, setSelectedLessonPlanId] = useState("");
  const [uploadFileObj, setUploadFileObj] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const range = monthRange(viewYear, viewMonth);
      const data = isModerator
        ? await getWeeklySchedule(authFetch, range.from, range.to)
        : await getWeeklySchedule(authFetch);
      setSchedule(data);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không thể tải lịch tuần.");
    } finally {
      setLoading(false);
    }
  }, [authFetch, isModerator, viewYear, viewMonth]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  useEffect(() => {
    if (!isModerator) return;
    authFetch("/api/moderator/teachers?size=100")
      .then((res) => res.json())
      .then((data: { content?: TeacherOption[] }) => setTeachers(data.content ?? []))
      .catch(() => setTeachers([]));
  }, [authFetch, isModerator]);

  function openEditForm(t: WeeklyTaskSummary) {
    setEditingId(t.id);
    setFormTeacherId(t.teacherId);
    setFormWeekStart(t.weekStartDate);
    setFormScope(t.scopeDescription);
    setFormDeadline(toDatetimeLocalValue(t.deadline));
    setFormOpen(true);
  }

  async function handleSaveTask() {
    if (!editingId || !formTeacherId || !formWeekStart || !formScope.trim() || !formDeadline) return;
    setSaving(true);
    try {
      await updateWeeklyTask(authFetch, editingId, {
        teacherId: formTeacherId,
        weekStartDate: formWeekStart,
        scopeDescription: formScope.trim(),
        deadline: new Date(formDeadline).toISOString(),
      });
      setMsg("Đã cập nhật nhiệm vụ.");
      setFormOpen(false);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không thể lưu nhiệm vụ.");
    } finally {
      setSaving(false);
    }
  }

  function openBulkPanel(weekStartDate: string) {
    setBulkWeekStart(weekStartDate);
    setBulkLessons([{ scope: "", deadline: "" }]);
    setBulkOpen(true);
  }

  function updateBulkLesson(index: number, field: "scope" | "deadline", value: string) {
    setBulkLessons((prev) => prev.map((l, i) => (i === index ? { ...l, [field]: value } : l)));
  }

  function addBulkLesson() {
    setBulkLessons((prev) => [...prev, { scope: "", deadline: "" }]);
  }

  async function handleBulkCreate() {
    const lessons = bulkLessons.filter((l) => l.scope.trim() && l.deadline);
    if (!bulkWeekStart || lessons.length === 0) return;
    setBulkSaving(true);
    try {
      await bulkCreateWeeklyTasks(authFetch, {
        weekStartDate: bulkWeekStart,
        lessons: lessons.map((l) => ({ scopeDescription: l.scope.trim(), deadline: new Date(l.deadline).toISOString() })),
      });
      setMsg("Đã tạo lịch tuần cho cả môn.");
      setBulkOpen(false);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không thể tạo lịch tuần.");
    } finally {
      setBulkSaving(false);
    }
  }

  function openSubmitPanel(t: WeeklyTaskSummary) {
    setSubmittingId(t.id);
    setSubmitMode("library");
    setSelectedLessonPlanId("");
    setUploadFileObj(null);
    listLibrary(authFetch, new URLSearchParams({ type: "LESSON_PLAN", size: "100" }))
      .then((data) => setOwnedLessonPlans(data.items))
      .catch(() => setOwnedLessonPlans([]));
  }

  async function handleSubmitTask(taskId: string) {
    setSubmitting(true);
    try {
      if (submitMode === "library") {
        if (!selectedLessonPlanId) return;
        await submitWeeklyTask(authFetch, taskId, { libraryContentId: selectedLessonPlanId });
      } else {
        if (!uploadFileObj || !accessToken) return;
        const url = await uploadFile(accessToken, uploadFileObj);
        await submitWeeklyTask(authFetch, taskId, { documentUrl: url, documentName: uploadFileObj.name });
      }
      setMsg("Đã nộp giáo án.");
      setSubmittingId(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không thể nộp giáo án.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUnsubmit(taskId: string, title: string) {
    if (!confirm(`Rút giáo án đã nộp cho "${title}"?`)) return;
    try {
      await unsubmitWeeklyTask(authFetch, taskId);
      setMsg("Đã rút giáo án.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không thể rút giáo án.");
    }
  }

  return (
    <main className="min-h-screen bg-[#f5f1ec] text-[#2b2926]">
      <div className="flex min-h-screen">
        <Sidebar activeHref="/weekly-schedule" />
        <section className="min-w-0 flex-1 p-5 sm:p-8">
          <header className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-[#e8724a]">Content</p>
              <h1 className="mt-1 text-3xl font-semibold">Lịch tuần</h1>
              <p className="mt-2 text-sm text-[#6b6b6b]">
                {isModerator
                  ? "Lịch giáo án tuần áp dụng chung cho mọi giáo viên cùng môn."
                  : "Nhiệm vụ giáo án tuần được giao cho bạn."}
              </p>
            </div>
          </header>

          {isModerator ? (
            <div className="mt-4 flex items-center gap-3">
              <MonthPicker
                year={viewYear}
                month={viewMonth}
                onChange={(y, m) => {
                  setViewYear(y);
                  setViewMonth(m);
                }}
              />
            </div>
          ) : null}

          <Modal
            open={bulkOpen}
            onClose={() => setBulkOpen(false)}
            title="Tạo lịch tuần"
            description="Áp dụng tự động cho mọi giáo viên đang hoạt động cùng môn với bạn."
            maxWidthClassName="max-w-2xl"
          >
            <p className="w-full rounded-xl border bg-[#f5f1ec] p-2 text-sm sm:w-64">Tuần bắt đầu {formatWeek(bulkWeekStart)}</p>
            <div className="mt-3 space-y-3">
              {bulkLessons.map((lesson, i) => (
                <div key={i} className="grid gap-3 rounded-xl border border-dashed p-3 sm:grid-cols-2">
                  <p className="text-xs font-medium text-[#6b6b6b] sm:col-span-2">Bài {i + 1}</p>
                  <textarea
                    value={lesson.scope}
                    onChange={(e) => updateBulkLesson(i, "scope", e.target.value)}
                    placeholder="Yêu cầu giáo án (vd: Chương 3 - Định luật Newton, Vật lý 10)"
                    rows={2}
                    className="rounded-xl border p-2 text-sm sm:col-span-2"
                  />
                  <DatePicker
                    withTime
                    value={lesson.deadline}
                    onChange={(v) => updateBulkLesson(i, "deadline", v)}
                    placeholder="Chọn hạn nộp"
                    className="sm:col-span-2"
                  />
                </div>
              ))}
            </div>
            <div className="mt-3 flex items-center justify-between">
              <button type="button" onClick={addBulkLesson} className="text-sm text-[#b85c3b] underline">
                + Thêm bài
              </button>
              <div className="flex justify-end gap-2">
                <button onClick={() => setBulkOpen(false)} className="rounded-xl px-4 py-2 text-sm">
                  Hủy
                </button>
                <button
                  onClick={() => void handleBulkCreate()}
                  disabled={bulkSaving || !bulkWeekStart || bulkLessons.every((l) => !l.scope.trim() || !l.deadline)}
                  className="rounded-xl bg-[#e8724a] px-4 py-2 text-sm text-white disabled:opacity-50"
                >
                  {bulkSaving ? "Đang tạo..." : "Tạo lịch"}
                </button>
              </div>
            </div>
          </Modal>

          <Modal open={formOpen} onClose={() => setFormOpen(false)} title="Sửa nhiệm vụ tuần">
            <div className="grid gap-3 sm:grid-cols-2">
              <select
                value={formTeacherId}
                onChange={(e) => setFormTeacherId(e.target.value)}
                className="rounded-xl border p-2 text-sm"
              >
                <option value="">Chọn giáo viên...</option>
                {teachers
                  .filter((t) => t.status === "ACTIVE" || t.id === formTeacherId)
                  .map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.fullName ?? t.email}
                    </option>
                  ))}
              </select>
              <DatePicker value={formWeekStart} onChange={setFormWeekStart} placeholder="Chọn tuần" />
              <DatePicker withTime value={formDeadline} onChange={setFormDeadline} placeholder="Chọn hạn nộp" className="sm:col-span-2" />
              <textarea
                value={formScope}
                onChange={(e) => setFormScope(e.target.value)}
                placeholder="Yêu cầu giáo án (vd: Chương 3 - Định luật Newton, Vật lý 10)"
                rows={3}
                className="rounded-xl border p-2 text-sm sm:col-span-2"
              />
            </div>
            <div className="mt-3 flex justify-end gap-2">
              <button onClick={() => setFormOpen(false)} className="rounded-xl px-4 py-2 text-sm">
                Hủy
              </button>
              <button
                onClick={() => void handleSaveTask()}
                disabled={saving || !formTeacherId || !formWeekStart || !formScope.trim() || !formDeadline}
                className="rounded-xl bg-[#e8724a] px-4 py-2 text-sm text-white disabled:opacity-50"
              >
                {saving ? "Đang lưu..." : "Lưu"}
              </button>
            </div>
          </Modal>

          {msg ? <p className="mt-4 text-sm text-emerald-700">{msg}</p> : null}
          {error ? <p className="mt-4 text-sm text-red-700">{error}</p> : null}

          {loading ? (
            <div className="mt-6 space-y-3">
              {[1, 2, 3].map((x) => (
                <div key={x} className="h-24 animate-pulse rounded-2xl bg-[#e8e2db]" />
              ))}
            </div>
          ) : isModerator ? (
            <div className="mt-6 overflow-x-auto rounded-2xl border bg-white">
              <table className="w-full min-w-[520px] table-fixed border-collapse text-sm">
                <colgroup>
                  <col className="w-32" />
                  <col />
                </colgroup>
                <tbody>
                  {buildMonthSchedule(schedule.weeks, viewYear, viewMonth).map((week, i) => {
                    const groups = groupByLesson(week.tasks);
                    return (
                      <tr key={week.weekStartDate} className="border-t border-[#e8e2db] align-top">
                        <td className="border-r border-[#e8e2db] p-3">
                          <p className="text-sm font-medium">Tuần {i + 1}</p>
                          <p className="mt-1 text-xs text-[#8a8178]">{formatWeek(week.weekStartDate)}</p>
                        </td>
                        <td className="p-3">
                          <div className="grid gap-3 sm:grid-cols-2">
                            {groups.length === 0 ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => openBulkPanel(week.weekStartDate)}
                                  className="flex h-20 items-center justify-center rounded-2xl border border-dashed p-2 text-center text-xs text-[#8a8178] hover:bg-[#f5f1ec]"
                                >
                                  Ấn để thêm bài 1 cho tuần này
                                </button>
                                <button
                                  type="button"
                                  onClick={() => openBulkPanel(week.weekStartDate)}
                                  className="flex h-20 items-center justify-center rounded-2xl border border-dashed p-2 text-center text-xs text-[#8a8178] hover:bg-[#f5f1ec]"
                                >
                                  Ấn để thêm bài 2 cho tuần này
                                </button>
                              </>
                            ) : (
                              groups.map((g) => (
                                <LessonGroupCard
                                  key={g.key}
                                  group={g}
                                  expanded={expandedGroupKey === g.key}
                                  onToggle={() => setExpandedGroupKey((k) => (k === g.key ? null : g.key))}
                                  onEditTeacher={openEditForm}
                                />
                              ))
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : schedule.weeks.length === 0 ? (
            <div className="mt-8 rounded-2xl border border-dashed bg-white p-12 text-center text-sm text-[#6b6b6b]">
              Chưa có nhiệm vụ tuần nào.
            </div>
          ) : (
            <div className="mt-6 space-y-6">
              {schedule.weeks.map((week) => (
                <div key={week.weekStartDate}>
                  <h2 className="mb-3 text-sm font-semibold text-[#6b6b6b]">Tuần bắt đầu {formatWeek(week.weekStartDate)}</h2>
                  <div className="space-y-3">
                    {week.tasks.map((t) => {
                      const expired = isPastDeadline(t.deadline);
                      return (
                        <article key={t.id} className="rounded-2xl border bg-white p-4">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusClasses[t.reviewStatus]}`}>
                                  {statusLabels[t.reviewStatus]}
                                </span>
                                <span className="text-xs text-[#6b6b6b]">{subjectLabel(t.subject)}</span>
                              </div>
                              <p className="mt-2 text-sm">{t.scopeDescription}</p>
                              <p className="mt-2 text-xs text-[#6b6b6b]">
                                Hạn nộp: {formatDateTime(t.deadline)}
                                {expired ? " (đã quá hạn)" : ""}
                              </p>
                            </div>
                            <div className="flex shrink-0 gap-2 text-sm">
                              {!expired && (t.reviewStatus === "NOT_SUBMITTED" || t.reviewStatus === "REJECTED") ? (
                                <button onClick={() => openSubmitPanel(t)} className="text-[#b85c3b] underline">
                                  Nộp giáo án
                                </button>
                              ) : null}
                              {!expired && t.reviewStatus === "SUBMITTED" ? (
                                <button onClick={() => void handleUnsubmit(t.id, t.scopeDescription)} className="text-red-600 underline">
                                  Hủy nộp
                                </button>
                              ) : null}
                            </div>
                          </div>

                          {submittingId === t.id ? (
                            <div className="mt-4 rounded-xl border bg-[#f9f7f4] p-3">
                              <div className="flex gap-4 text-sm">
                                <label className="flex items-center gap-1.5">
                                  <input
                                    type="radio"
                                    checked={submitMode === "library"}
                                    onChange={() => setSubmitMode("library")}
                                  />
                                  Chọn từ thư viện
                                </label>
                                <label className="flex items-center gap-1.5">
                                  <input
                                    type="radio"
                                    checked={submitMode === "upload"}
                                    onChange={() => setSubmitMode("upload")}
                                  />
                                  Tải tệp lên
                                </label>
                              </div>
                              {submitMode === "library" ? (
                                <select
                                  value={selectedLessonPlanId}
                                  onChange={(e) => setSelectedLessonPlanId(e.target.value)}
                                  className="mt-3 w-full rounded-xl border p-2 text-sm"
                                >
                                  <option value="">Chọn giáo án...</option>
                                  {ownedLessonPlans.map((c) => (
                                    <option key={c.id} value={c.id}>
                                      {c.title}
                                    </option>
                                  ))}
                                </select>
                              ) : (
                                <input
                                  type="file"
                                  onChange={(e) => setUploadFileObj(e.target.files?.[0] ?? null)}
                                  className="mt-3 w-full text-sm"
                                />
                              )}
                              <div className="mt-3 flex justify-end gap-2">
                                <button onClick={() => setSubmittingId(null)} className="rounded-xl px-4 py-2 text-sm">
                                  Hủy
                                </button>
                                <button
                                  onClick={() => void handleSubmitTask(t.id)}
                                  disabled={submitting || (submitMode === "library" ? !selectedLessonPlanId : !uploadFileObj)}
                                  className="rounded-xl bg-[#e8724a] px-4 py-2 text-sm text-white disabled:opacity-50"
                                >
                                  {submitting ? "Đang nộp..." : "Nộp"}
                                </button>
                              </div>
                            </div>
                          ) : null}
                        </article>
                      );
                    })}
                  </div>
                </div>
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
    <RouteGuard pathname="/weekly-schedule">
      <WeeklyScheduleScreen />
    </RouteGuard>
  );
}
