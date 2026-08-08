"use client";

import { BookOpen, Check } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Modal } from "@/components/ui/Modal";
import { DatePicker } from "@/components/ui/DatePicker";
import { MonthPicker } from "@/components/ui/MonthPicker";
import { GradeSelect } from "@/components/ui/GradeSelect";
import { Dropdown } from "@/components/ui/Dropdown";
import { RouteGuard } from "@/lib/auth/RouteGuard";
import { useAuth } from "@/lib/auth/AuthContext";
import { hasAnyRole } from "@/lib/auth/permissions";
import { subjectLabel } from "@/lib/blog";
import { listLibrary, type LibraryContent } from "@/lib/library";
import { useTextbookPicker } from "@/lib/textbook-picker";
import {
  bulkCreateWeeklyTasks,
  getWeeklySchedule,
  submitWeeklyTask,
  unsubmitWeeklyTask,
  updateWeeklyTask,
  type WeeklyTaskGrade,
  type WeeklyTaskReviewStatus,
  type WeeklyTaskSchedule,
  type WeeklyTaskSummary,
} from "@/lib/weekly-task";

type TeacherOption = { id: string; fullName: string | null; email: string; status: string; grades: number[] };

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

type LessonGroup = {
  key: string;
  scopeDescription: string;
  chapterName: string;
  lessonName: string;
  deadline: string;
  tasks: WeeklyTaskSummary[];
};

/** Mỗi ô lịch tuần = 1 bài (BR-53) — nhóm theo lessonCode (không phải text tiêu đề), sắp theo thứ tự tạo. */
function groupByLesson(tasks: WeeklyTaskSummary[]): LessonGroup[] {
  const map = new Map<string, LessonGroup>();
  for (const t of tasks) {
    const existing = map.get(t.lessonCode);
    if (existing) {
      existing.tasks.push(t);
    } else {
      map.set(t.lessonCode, {
        key: t.lessonCode,
        scopeDescription: t.scopeDescription,
        chapterName: t.chapterName,
        lessonName: t.lessonName,
        deadline: t.deadline,
        tasks: [t],
      });
    }
  }
  return Array.from(map.values()).sort((a, b) => a.tasks[0].createdAt.localeCompare(b.tasks[0].createdAt));
}

/** Đúng 2 ô cố định/tuần (BR-53) — null nghĩa là ô còn trống, chưa giao bài. */
function weekSlots(tasks: WeeklyTaskSummary[]): (LessonGroup | null)[] {
  const groups = groupByLesson(tasks);
  return [groups[0] ?? null, groups[1] ?? null];
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function toDateOnly(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/**
 * BR-52: "tuần" là tuần lịch thực Thứ 2 → Chủ Nhật, không phải quy ước 1/8/15/22 cũ. Trả về mọi Thứ 2
 * phủ tháng đang xem (kể cả tuần đầu/cuối tháng bị "cắt" — tuần đó vẫn hiển thị, chấp nhận thiếu ngày).
 */
function mondaysInMonth(year: number, month: number): string[] {
  const firstOfMonth = new Date(year, month, 1);
  const mondayOffset = (firstOfMonth.getDay() + 6) % 7; // 0 = Thứ 2
  const cursor = new Date(year, month, 1 - mondayOffset);
  const lastOfMonth = new Date(year, month + 1, 0);
  const mondays: string[] = [];
  while (cursor <= lastOfMonth) {
    mondays.push(toDateOnly(cursor));
    cursor.setDate(cursor.getDate() + 7);
  }
  return mondays;
}

function monthRange(year: number, month: number): { from: string; to: string } {
  const lastDay = new Date(year, month + 1, 0).getDate();
  return {
    from: `${year}-${pad2(month + 1)}-01`,
    to: `${year}-${pad2(month + 1)}-${pad2(lastDay)}`,
  };
}

function buildMonthSchedule(weeks: WeeklyTaskSchedule["weeks"], year: number, month: number): WeeklyTaskSchedule["weeks"] {
  const byDate = new Map(weeks.map((w) => [w.weekStartDate, w]));
  return mondaysInMonth(year, month).map((date) => byDate.get(date) ?? { weekStartDate: date, tasks: [] });
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("vi");
}

function formatShortDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
}

/** Nhãn 1 tuần lịch thực: khoảng ngày Thứ 2 → Chủ Nhật, vd "06/08 - 09/08" cho tuần bị cắt đầu tháng. */
function weekLabel(weekStartDate: string): string {
  if (!weekStartDate) return "";
  const start = new Date(`${weekStartDate}T00:00:00`);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const fmt = (d: Date) => `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}`;
  return `${fmt(start)} - ${fmt(end)}`;
}

/** Xem trước hạn nộp (BR-52) trước khi task được tạo — server tính lại giá trị chính thức. */
function weekDeadlinePreview(weekStartDate: string): string {
  if (!weekStartDate) return "";
  const start = new Date(`${weekStartDate}T00:00:00`);
  const sunday = new Date(start);
  sunday.setDate(sunday.getDate() + 6);
  return `Chủ Nhật ${pad2(sunday.getDate())}/${pad2(sunday.getMonth() + 1)}/${sunday.getFullYear()} lúc 23:59`;
}

function isPastDeadline(iso: string): boolean {
  return new Date(iso).getTime() <= Date.now();
}

/** Thứ Hai của tuần chứa hôm nay (giờ máy khách) — dùng để xác định "tuần đang diễn ra". */
function currentWeekStartDate(): string {
  const now = new Date();
  const mondayOffset = (now.getDay() + 6) % 7; // 0 = Thứ 2
  now.setDate(now.getDate() - mondayOffset);
  return toDateOnly(now);
}

/** Chỉ tuần chứa hôm nay mới được thao tác (giao bài/nộp bài) — tuần tương lai/quá khứ bị khoá. */
function isCurrentWeek(weekStartDate: string): boolean {
  return weekStartDate === currentWeekStartDate();
}

/** Tuần đã kết thúc (qua hết Chủ Nhật) — dùng để bỏ hẳn các tuần quá khứ khỏi lưới lịch. */
function weekHasEnded(weekStartDate: string): boolean {
  if (!weekStartDate) return false;
  const end = new Date(`${weekStartDate}T00:00:00`);
  end.setDate(end.getDate() + 7); // đầu Thứ 2 tuần sau = hết tuần này
  return end.getTime() <= Date.now();
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
          <p className="text-sm font-medium">{group.scopeDescription}</p>
          <p className="mt-0.5 text-xs text-[#6b6b6b]">
            {group.chapterName} · {group.lessonName}
          </p>
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
  const { user, authFetch } = useAuth();
  const isModerator = hasAnyRole(user, ["MODERATOR"]);

  const [schedule, setSchedule] = useState<WeeklyTaskSchedule>({ weeks: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");

  const [teachers, setTeachers] = useState<TeacherOption[]>([]);
  const [expandedGroupKey, setExpandedGroupKey] = useState<string | null>(null);
  const [viewYear, setViewYear] = useState(() => new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(() => new Date().getMonth());
  // BR-51: Mod luôn thao tác trong phạm vi đúng 1 khối đã chọn.
  const [modGrade, setModGrade] = useState<WeeklyTaskGrade>(10);
  // Teacher xem lịch của mình mọi khối (BR-51 vẫn cho phép dạy nhiều khối) — filter khối chỉ để lọc hiển
  // thị, không bắt buộc như Mod, nên mặc định "Tất cả khối" (null).
  const [teacherGradeFilter, setTeacherGradeFilter] = useState<number | null>(null);

  // ── Sửa 1 giáo viên trong 1 tuần (Moderator) ──────────────────────────
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formTeacherId, setFormTeacherId] = useState("");
  const [formWeekStart, setFormWeekStart] = useState("");
  const [formTitle, setFormTitle] = useState("");
  const [formGrade, setFormGrade] = useState<WeeklyTaskGrade>(10);
  const [saving, setSaving] = useState(false);
  const editPicker = useTextbookPicker(user?.subject ?? undefined, formGrade, formOpen);

  // ── Giao 1 bài cho cả khối (Moderator) — mỗi ô lịch tuần = 1 bài (BR-53) ─
  const [createOpen, setCreateOpen] = useState(false);
  const [createWeekStart, setCreateWeekStart] = useState("");
  const [createTitle, setCreateTitle] = useState("");
  const [createSaving, setCreateSaving] = useState(false);
  const createPicker = useTextbookPicker(user?.subject ?? undefined, modGrade, createOpen);

  // ── Nộp giáo án (Teacher) — chỉ từ thư viện cá nhân, chọn qua popup dạng thẻ (không còn tải tệp lên) ──
  const [submittingTask, setSubmittingTask] = useState<WeeklyTaskSummary | null>(null);
  const [resubmittingId, setResubmittingId] = useState<string | null>(null);
  const [ownedLessonPlans, setOwnedLessonPlans] = useState<LibraryContent[]>([]);
  const [selectedLessonPlanId, setSelectedLessonPlanId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  // Popup mặc định chỉ lọc đúng Khối/Môn/Chương được giao; bật cờ này khi GV chủ động mở rộng vì
  // giáo án cũ (tạo trước khi có lọc theo chương) chưa có metadata nên không khớp filter.
  const [showAllLessonPlans, setShowAllLessonPlans] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const range = monthRange(viewYear, viewMonth);
      const data = isModerator
        ? await getWeeklySchedule(authFetch, range.from, range.to, modGrade)
        : await getWeeklySchedule(authFetch, range.from, range.to);
      setSchedule(data);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không thể tải lịch tuần.");
    } finally {
      setLoading(false);
    }
  }, [authFetch, isModerator, viewYear, viewMonth, modGrade]);

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
    setFormTitle(t.scopeDescription);
    setFormGrade(t.grade);
    editPicker.reset();
    editPicker.setBookCode(t.textbookCode);
    editPicker.setChapterCode(t.chapterCode);
    editPicker.setLessonCode(t.lessonCode);
    setFormOpen(true);
  }

  async function handleSaveTask() {
    if (
      !editingId ||
      !formTeacherId ||
      !formWeekStart ||
      !formTitle.trim() ||
      !editPicker.bookCode ||
      !editPicker.chapterCode ||
      !editPicker.lessonCode
    )
      return;
    setSaving(true);
    try {
      await updateWeeklyTask(authFetch, editingId, {
        teacherId: formTeacherId,
        weekStartDate: formWeekStart,
        scopeDescription: formTitle.trim(),
        textbookCode: editPicker.bookCode,
        chapterCode: editPicker.chapterCode,
        lessonCode: editPicker.lessonCode,
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

  function openCreatePanel(weekStartDate: string) {
    setCreateWeekStart(weekStartDate);
    setCreateTitle("");
    createPicker.reset();
    setCreateOpen(true);
  }

  async function handleCreateLesson() {
    if (!createWeekStart || !createTitle.trim() || !createPicker.bookCode || !createPicker.chapterCode || !createPicker.lessonCode) return;
    setCreateSaving(true);
    try {
      await bulkCreateWeeklyTasks(authFetch, {
        weekStartDate: createWeekStart,
        grade: modGrade,
        textbookCode: createPicker.bookCode,
        lessons: [{ scopeDescription: createTitle.trim(), chapterCode: createPicker.chapterCode, lessonCode: createPicker.lessonCode }],
      });
      setMsg(`Đã giao bài cho khối ${modGrade}.`);
      setCreateOpen(false);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không thể giao bài.");
    } finally {
      setCreateSaving(false);
    }
  }

  function loadOwnedLessonPlans(t: WeeklyTaskSummary, all: boolean) {
    const params = all
      ? new URLSearchParams({ type: "LESSON_PLAN", size: "100" })
      : new URLSearchParams({
          type: "LESSON_PLAN",
          subject: t.subject,
          grade: String(t.grade),
          textbookCode: t.textbookCode,
          chapterCode: t.chapterCode,
          size: "100",
        });
    listLibrary(authFetch, params)
      .then((data) => setOwnedLessonPlans(data.items))
      .catch(() => setOwnedLessonPlans([]));
  }

  function openSubmitPanel(t: WeeklyTaskSummary) {
    setSubmittingTask(t);
    setSelectedLessonPlanId("");
    setShowAllLessonPlans(false);
    // Lọc tự động theo đúng Khối + Môn + Chương Mod đã giao (BR-53/BR-51) — giáo viên chỉ cần bấm
    // "Nộp giáo án" là thấy ngay các giáo án phù hợp, không phải tự lọc giữa toàn bộ thư viện.
    loadOwnedLessonPlans(t, false);
  }

  async function handleSubmitTask() {
    if (!submittingTask || !selectedLessonPlanId) return;
    setSubmitting(true);
    try {
      await submitWeeklyTask(authFetch, submittingTask.id, { libraryContentId: selectedLessonPlanId });
      setMsg("Đã nộp giáo án.");
      setSubmittingTask(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không thể nộp giáo án.");
    } finally {
      setSubmitting(false);
    }
  }

  // Bị từ chối + đã từng nộp từ thư viện → nộp lại đúng giáo án cũ, không bắt chọn lại dropdown (dễ bấm
  // nhầm dưa bài khác vào). Chỉ áp dụng khi nguồn cũ là thư viện (sourceLibraryContentId có giá trị) —
  // nộp bằng tệp tải lên thì vẫn phải mở panel chọn/tải lại như cũ.
  async function handleResubmit(t: WeeklyTaskSummary) {
    if (!t.sourceLibraryContentId) return;
    setResubmittingId(t.id);
    try {
      await submitWeeklyTask(authFetch, t.id, { libraryContentId: t.sourceLibraryContentId });
      setMsg("Đã nộp lại giáo án.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không thể nộp lại giáo án.");
    } finally {
      setResubmittingId(null);
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

  // Task của giáo viên gộp mọi khối họ dạy trong 1 lịch — lọc theo `teacherGradeFilter` để không lẫn lộn
  // khối 10/11 trong cùng 1 tuần; tuần nào rỗng sau khi lọc thì bỏ hẳn, không hiện dòng trống.
  const teacherWeeks = schedule.weeks
    .map((week) => ({
      ...week,
      tasks: teacherGradeFilter === null ? week.tasks : week.tasks.filter((t) => t.grade === teacherGradeFilter),
    }))
    .filter((week) => week.tasks.length > 0);

  return (
    <main className="min-h-screen bg-white text-[#2b2926]">
      <div className="flex min-h-screen">
        <Sidebar activeHref="/weekly-schedule" />
        <section className="min-w-0 flex-1 p-5 sm:p-8">
          <header className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-[#e8724a]">Content</p>
              <h1 className="mt-1 text-3xl font-semibold">Lịch tuần</h1>
              <p className="mt-2 text-sm text-[#6b6b6b]">
                {isModerator
                  ? "Lịch giáo án tuần theo khối, áp dụng cho giáo viên dạy khối đó cùng môn."
                  : "Nhiệm vụ giáo án tuần được giao cho bạn."}
              </p>
            </div>
          </header>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <MonthPicker
              year={viewYear}
              month={viewMonth}
              onChange={(y, m) => {
                setViewYear(y);
                setViewMonth(m);
              }}
            />
            {isModerator ? (
              <GradeSelect value={modGrade} onChange={(g) => g !== null && setModGrade(g as WeeklyTaskGrade)} />
            ) : (
              <GradeSelect value={teacherGradeFilter} onChange={setTeacherGradeFilter} includeAll />
            )}
          </div>

          <Modal
            open={createOpen}
            onClose={() => setCreateOpen(false)}
            title={`Giao bài — Khối ${modGrade}`}
            description="Áp dụng tự động cho mọi giáo viên đang hoạt động, cùng môn và dạy đúng khối này."
            maxWidthClassName="max-w-5xl"
          >
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
              <div className="space-y-4">
                <p className="w-full rounded-xl border border-[#e4ddd4] bg-[#f7f3ee] px-4 py-3 text-sm text-[#4f4943]">
                  Tuần <span className="font-semibold text-[#2b2926]">{weekLabel(createWeekStart)}</span> · Hạn nộp:{" "}
                  <span className="font-semibold text-[#2b2926]">{weekDeadlinePreview(createWeekStart)}</span>
                </p>
                <label className="text-xs font-medium text-[#6b6b6b]">Tiêu đề</label>
                <textarea
                  value={createTitle}
                  onChange={(e) => setCreateTitle(e.target.value)}
                  placeholder="Vd: Ôn tập cuối chương, Kiểm tra 15 phút..."
                  rows={7}
                  className="mt-1.5 w-full resize-none rounded-xl border border-[#d8d1c9] bg-[#fffdfb] p-3 text-sm leading-6 outline-none transition focus:border-[#e8724a] focus:ring-2 focus:ring-[#e8724a]/15"
                />
              </div>
              <div className="space-y-4 rounded-xl border border-[#ebe4dc] bg-[#fffdfb] p-4">
                {createPicker.matchingBooks.length > 1 ? (
                  <div>
                    <label className="text-xs font-medium text-[#6b6b6b]">Sách giáo khoa</label>
                    <div className="mt-1.5">
                      <Dropdown
                        placeholder="Chọn sách..."
                        value={createPicker.bookCode || null}
                        options={createPicker.matchingBooks.map((b) => ({ value: b.id, label: b.name }))}
                        onChange={createPicker.setBookCode}
                      />
                    </div>
                  </div>
                ) : null}
                <div>
                  <label className="text-xs font-medium text-[#6b6b6b]">Chương</label>
                  <div className="mt-1.5">
                    <Dropdown
                      placeholder="Chọn chương..."
                      value={createPicker.chapterCode || null}
                      options={createPicker.chapters.map((c) => ({ value: c.id, label: c.name }))}
                      onChange={createPicker.setChapterCode}
                      disabled={!createPicker.bookCode}
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-[#6b6b6b]">Bài</label>
                  <div className="mt-1.5">
                    <Dropdown
                      placeholder="Chọn bài..."
                      value={createPicker.lessonCode || null}
                      options={createPicker.lessons.map((l) => ({ value: l.id, label: l.name }))}
                      onChange={createPicker.setLessonCode}
                      disabled={!createPicker.chapterCode}
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2 border-t border-[#f0ece5] pt-4">
              <button onClick={() => setCreateOpen(false)} className="rounded-xl px-4 py-2 text-sm hover:bg-[#f5f1ec]">
                Hủy
              </button>
              <button
                onClick={() => void handleCreateLesson()}
                disabled={
                  createSaving || !createTitle.trim() || !createPicker.bookCode || !createPicker.chapterCode || !createPicker.lessonCode
                }
                className="rounded-xl bg-[#e8724a] px-4 py-2 text-sm text-white transition hover:bg-[#d9633b] disabled:opacity-50"
              >
                {createSaving ? "Đang giao..." : "Giao bài"}
              </button>
            </div>
          </Modal>

          <Modal
            open={formOpen}
            onClose={() => setFormOpen(false)}
            title="Sửa nhiệm vụ tuần"
            maxWidthClassName="max-w-2xl"
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <span className="flex items-center rounded-xl border bg-[#f5f1ec] px-3 py-2 text-sm text-[#4f4943] sm:col-span-2">
                Khối {formGrade} (không đổi được — tạo nhiệm vụ khối khác thì tạo lịch mới)
              </span>
              <select
                value={formTeacherId}
                onChange={(e) => setFormTeacherId(e.target.value)}
                className="rounded-xl border p-2 text-sm"
              >
                <option value="">Chọn giáo viên...</option>
                {teachers
                  .filter((t) => (t.status === "ACTIVE" || t.id === formTeacherId) && t.grades.includes(formGrade))
                  .map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.fullName ?? t.email}
                    </option>
                  ))}
              </select>
              <DatePicker value={formWeekStart} onChange={setFormWeekStart} placeholder="Chọn tuần" />
              <p className="text-xs text-[#8a8178] sm:col-span-2">
                Hệ thống tự làm tròn về Thứ 2 của tuần chứa ngày này. Hạn nộp: {weekDeadlinePreview(formWeekStart)}.
              </p>
              <div className="sm:col-span-2">
                <label className="text-xs font-medium text-[#6b6b6b]">Tiêu đề</label>
                <textarea
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="Vd: Ôn tập cuối chương, Kiểm tra 15 phút..."
                  rows={2}
                  className="mt-1 w-full rounded-xl border p-2 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-[#6b6b6b]">Chương</label>
                <div className="mt-1">
                  <Dropdown
                    placeholder="Chọn chương..."
                    value={editPicker.chapterCode || null}
                    options={editPicker.chapters.map((c) => ({ value: c.id, label: c.name }))}
                    onChange={editPicker.setChapterCode}
                    disabled={!editPicker.bookCode}
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-[#6b6b6b]">Bài</label>
                <div className="mt-1">
                  <Dropdown
                    placeholder="Chọn bài..."
                    value={editPicker.lessonCode || null}
                    options={editPicker.lessons.map((l) => ({ value: l.id, label: l.name }))}
                    onChange={editPicker.setLessonCode}
                    disabled={!editPicker.chapterCode}
                  />
                </div>
              </div>
            </div>
            <div className="mt-3 flex justify-end gap-2">
              <button onClick={() => setFormOpen(false)} className="rounded-xl px-4 py-2 text-sm">
                Hủy
              </button>
              <button
                onClick={() => void handleSaveTask()}
                disabled={
                  saving || !formTeacherId || !formWeekStart || !formTitle.trim() || !editPicker.chapterCode || !editPicker.lessonCode
                }
                className="rounded-xl bg-[#e8724a] px-4 py-2 text-sm text-white disabled:opacity-50"
              >
                {saving ? "Đang lưu..." : "Lưu"}
              </button>
            </div>
          </Modal>

          <Modal
            open={submittingTask !== null}
            onClose={() => setSubmittingTask(null)}
            title="Chọn giáo án để nộp"
            description={
              submittingTask
                ? showAllLessonPlans
                  ? `Nộp cho "${submittingTask.scopeDescription}" · Khối ${submittingTask.grade} — chọn 1 giáo án trong thư viện của bạn.`
                  : `Nộp cho "${submittingTask.scopeDescription}" · Khối ${submittingTask.grade} — chỉ hiện giáo án thuộc "${submittingTask.chapterName}".`
                : undefined
            }
            maxWidthClassName="max-w-4xl"
          >
            {ownedLessonPlans.length === 0 ? (
              <div className="rounded-xl border border-dashed p-6 text-center text-sm text-[#8a8178]">
                <p>
                  {showAllLessonPlans
                    ? "Chưa có giáo án nào trong thư viện của bạn."
                    : "Không có giáo án nào thuộc chương này trong thư viện của bạn."}
                </p>
                {!showAllLessonPlans && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowAllLessonPlans(true);
                      if (submittingTask) loadOwnedLessonPlans(submittingTask, true);
                    }}
                    className="mt-2 text-[#e8724a] underline"
                  >
                    Xem tất cả giáo án của tôi
                  </button>
                )}
              </div>
            ) : (
              <div className="grid gap-3 p-1 sm:grid-cols-2">
                {ownedLessonPlans.map((c) => {
                  const isSelected = selectedLessonPlanId === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setSelectedLessonPlanId(c.id)}
                      className={`relative rounded-2xl border p-3 text-left transition ${
                        isSelected ? "border-[#e8724a] bg-[#fff7f2] ring-2 ring-[#e8724a]/30" : "border-[#e4ddd4] bg-white hover:border-[#e8724a]/50"
                      }`}
                    >
                      <span
                        aria-hidden
                        className={`absolute right-3 top-3 z-10 flex size-5 items-center justify-center rounded-full border-2 ${
                          isSelected ? "border-[#e8724a] bg-[#e8724a] text-white" : "border-[#d8d1c9] bg-white"
                        }`}
                      >
                        {isSelected ? <Check className="size-3" strokeWidth={3} /> : null}
                      </span>
                      <div className="aspect-[16/9] overflow-hidden rounded-xl bg-gradient-to-br from-amber-100 via-orange-50 to-stone-100">
                        {c.thumbnailUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={c.thumbnailUrl} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full items-center justify-center text-[#c9a98a]">
                            <BookOpen className="size-8" />
                          </div>
                        )}
                      </div>
                      <p className="mt-2 line-clamp-2 text-sm font-semibold text-[#2b2926]">{c.title}</p>
                      <p className="mt-1 text-xs text-[#8a8178]">
                        {c.grade ? `Khối ${c.grade} · ` : ""}Cập nhật {formatShortDate(c.updatedAt)}
                      </p>
                    </button>
                  );
                })}
              </div>
            )}
            <div className="mt-4 flex justify-end gap-2 border-t border-[#f0ece5] pt-4">
              <button onClick={() => setSubmittingTask(null)} className="rounded-xl px-4 py-2 text-sm hover:bg-[#f5f1ec]">
                Hủy
              </button>
              <button
                onClick={() => void handleSubmitTask()}
                disabled={submitting || !selectedLessonPlanId}
                className="rounded-xl bg-[#e8724a] px-4 py-2 text-sm text-white transition hover:bg-[#d9633b] disabled:opacity-50"
              >
                {submitting ? "Đang nộp..." : "Nộp"}
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
                  {buildMonthSchedule(schedule.weeks, viewYear, viewMonth)
                    .filter((week) => !weekHasEnded(week.weekStartDate))
                    .map((week) => {
                      const current = isCurrentWeek(week.weekStartDate);
                      return (
                        <tr key={week.weekStartDate} className="border-t border-[#e8e2db] align-top">
                          <td className="border-r border-[#e8e2db] p-3">
                            <p className="text-sm font-medium">{weekLabel(week.weekStartDate)}</p>
                            {current ? (
                              <span className="mt-1 inline-block rounded-full bg-[#e8724a]/10 px-2 py-0.5 text-[11px] font-medium text-[#b85c3b]">
                                Đang diễn ra
                              </span>
                            ) : null}
                          </td>
                          <td className="p-3">
                            <div className="grid gap-3 sm:grid-cols-2">
                              {weekSlots(week.tasks).map((group, slotIndex) =>
                                group ? (
                                  <LessonGroupCard
                                    key={group.key}
                                    group={group}
                                    expanded={expandedGroupKey === group.key}
                                    onToggle={() => setExpandedGroupKey((k) => (k === group.key ? null : group.key))}
                                    onEditTeacher={openEditForm}
                                  />
                                ) : current ? (
                                  <button
                                    key={`empty-${slotIndex}`}
                                    type="button"
                                    onClick={() => openCreatePanel(week.weekStartDate)}
                                    className="flex h-20 items-center justify-center rounded-2xl border border-dashed p-2 text-center text-xs text-[#8a8178] hover:bg-[#f5f1ec]"
                                  >
                                    {slotIndex === 0 ? "Ấn để thêm bài thứ nhất" : "Ấn để thêm bài thứ hai"}
                                  </button>
                                ) : (
                                  <div
                                    key={`empty-${slotIndex}`}
                                    title="Chỉ có thể giao bài cho tuần đang diễn ra"
                                    className="flex h-20 cursor-not-allowed items-center justify-center rounded-2xl border border-dashed bg-[#f5f1ec] p-2 text-center text-xs text-[#c2bcb3]"
                                  >
                                    Đã khoá
                                  </div>
                                ),
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          ) : teacherWeeks.length === 0 ? (
            <div className="mt-8 rounded-2xl border border-dashed bg-white p-12 text-center text-sm text-[#6b6b6b]">
              {teacherGradeFilter !== null ? `Chưa có nhiệm vụ tuần nào cho khối ${teacherGradeFilter}.` : "Chưa có nhiệm vụ tuần nào."}
            </div>
          ) : (
            <div className="mt-6 overflow-x-auto rounded-2xl border bg-white">
              <table className="w-full min-w-[520px] table-fixed border-collapse text-sm">
                <colgroup>
                  <col className="w-32" />
                  <col />
                </colgroup>
                <tbody>
                  {teacherWeeks.map((week) => {
                    const currentWeek = isCurrentWeek(week.weekStartDate);
                    return (
                      <tr key={week.weekStartDate} className="border-t border-[#e8e2db] align-top">
                        <td className="border-r border-[#e8e2db] p-3">
                          <p className="text-sm font-medium">{weekLabel(week.weekStartDate)}</p>
                          {currentWeek ? (
                            <span className="mt-1 inline-block rounded-full bg-[#e8724a]/10 px-2 py-0.5 text-[11px] font-medium text-[#b85c3b]">
                              Đang diễn ra
                            </span>
                          ) : null}
                        </td>
                        <td className="p-3">
                          <div className="grid gap-3 sm:grid-cols-2">
                            {week.tasks.map((t) => {
                              const expired = isPastDeadline(t.deadline);
                              const current = isCurrentWeek(t.weekStartDate);
                              return (
                                <article key={t.id} className="rounded-2xl border bg-white p-4">
                                  <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div className="min-w-0">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusClasses[t.reviewStatus]}`}>
                                          {statusLabels[t.reviewStatus]}
                                        </span>
                                        <span className="rounded-full bg-[#edf4ff] px-2 py-0.5 text-xs font-semibold text-[#2f5f9b]">
                                          Khối {t.grade}
                                        </span>
                                        <span className="text-xs text-[#6b6b6b]">{subjectLabel(t.subject)}</span>
                                      </div>
                                      <p className="mt-2 text-sm font-medium">{t.scopeDescription}</p>
                                      <p className="mt-0.5 text-xs text-[#6b6b6b]">
                                        {t.chapterName} · {t.lessonName}
                                      </p>
                                      <p className="mt-2 text-xs text-[#6b6b6b]">
                                        Hạn nộp: {formatDateTime(t.deadline)}
                                        {expired ? " (đã quá hạn)" : ""}
                                      </p>
                                    </div>
                                    <div className="flex shrink-0 items-center gap-2 text-sm">
                                      {current && !expired && t.reviewStatus === "REJECTED" && t.sourceLibraryContentId ? (
                                        <button
                                          onClick={() => void handleResubmit(t)}
                                          disabled={resubmittingId === t.id}
                                          title="Nộp lại đúng giáo án đã chọn trước đó"
                                          className="text-[#b85c3b] underline disabled:opacity-50"
                                        >
                                          {resubmittingId === t.id ? "Đang nộp lại..." : "Nộp lại"}
                                        </button>
                                      ) : current &&
                                        !expired &&
                                        (t.reviewStatus === "NOT_SUBMITTED" || (t.reviewStatus === "REJECTED" && !t.sourceLibraryContentId)) ? (
                                        <button onClick={() => openSubmitPanel(t)} className="text-[#b85c3b] underline">
                                          Nộp giáo án
                                        </button>
                                      ) : null}
                                      {current && !expired && t.reviewStatus === "SUBMITTED" ? (
                                        <button onClick={() => void handleUnsubmit(t.id, t.scopeDescription)} className="text-red-600 underline">
                                          Hủy nộp
                                        </button>
                                      ) : null}
                                      {!current ? (
                                        <span
                                          className="text-xs text-[#8a8178]"
                                          title="Chỉ có thể nộp/rút giáo án trong tuần đang diễn ra"
                                        >
                                          {weekHasEnded(t.weekStartDate) ? "Đã qua tuần" : "Chưa tới tuần"}
                                        </span>
                                      ) : null}
                                    </div>
                                  </div>
                                </article>
                              );
                            })}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
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
