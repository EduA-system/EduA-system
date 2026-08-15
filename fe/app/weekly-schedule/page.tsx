"use client";

import { AlertCircle, BookOpen, Check, ExternalLink, Loader2, Users, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { RichView } from "@/components/blog/RichView";
import { Sidebar } from "@/components/layout/Sidebar";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Modal } from "@/components/ui/Modal";
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
  getWeeklyTask,
  submitWeeklyTask,
  unsubmitWeeklyTask,
  updateWeeklyTask,
  type WeeklyTaskGrade,
  type WeeklyTaskDetail,
  type WeeklyTaskReviewStatus,
  type WeeklyTaskSchedule,
  type WeeklyTaskSummary,
} from "@/lib/weekly-task";
import { resolveWeeklyTaskLessonDocument } from "@/components/weeklytask/WeeklyTaskDocumentViewer";
import type { TiptapNode } from "@/lib/tiptap-to-text";

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
  weekStartDate: string;
  deadline: string;
  tasks: WeeklyTaskSummary[];
};

/** Mỗi ô lịch nộp giáo án = 1 bài (BR-53) — nhóm theo lessonCode (không phải text tiêu đề), sắp theo thứ tự tạo. */
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
        weekStartDate: t.weekStartDate,
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
  const firstOfMonth = new Date(year, month, 1);
  const mondayOffset = (firstOfMonth.getDay() + 6) % 7;
  const firstVisibleMonday = new Date(year, month, 1 - mondayOffset);
  return {
    // Lấy cả Thứ 2 của tuần đầu tháng để task của tuần giao hai tháng (vd 31/08–06/09)
    // xuất hiện nhất quán ở cả tháng 8 lẫn tháng 9.
    from: toDateOnly(firstVisibleMonday),
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

function teachingWeekLabel(submissionWeekStartDate: string): string {
  if (!submissionWeekStartDate) return "";
  const start = new Date(`${submissionWeekStartDate}T00:00:00`);
  start.setDate(start.getDate() + 7);
  return weekLabel(toDateOnly(start));
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

/** Tuần chứa hôm nay — dùng để gắn nhãn và khóa thao tác nộp/rút của Teacher. */
function isCurrentWeek(weekStartDate: string): boolean {
  return weekStartDate === currentWeekStartDate();
}

/** Tuần đã kết thúc (qua hết Chủ Nhật) — tuần quá khứ không còn được giao bài. */
function weekHasEnded(weekStartDate: string): boolean {
  if (!weekStartDate) return false;
  const end = new Date(`${weekStartDate}T00:00:00`);
  end.setDate(end.getDate() + 7); // đầu Thứ 2 tuần sau = hết tuần này
  return end.getTime() <= Date.now();
}

/** Moderator được giao bài cho tuần hiện tại và các tuần tương lai. */
function canAssignWeek(weekStartDate: string): boolean {
  return !weekHasEnded(weekStartDate);
}

function LessonGroupCard({
  group,
  canEdit,
  onEditGroup,
  onOpenGroup,
}: {
  group: LessonGroup;
  canEdit: boolean;
  onEditGroup: (t: WeeklyTaskSummary) => void;
  onOpenGroup: (group: LessonGroup) => void;
}) {
  const submittedCount = group.tasks.filter((t) => t.reviewStatus !== "NOT_SUBMITTED").length;
  const pendingCount = group.tasks.filter((t) => t.reviewStatus === "SUBMITTED").length;
  const approvedCount = group.tasks.filter((t) => t.reviewStatus === "APPROVED").length;
  const canEditGroup = canEdit && approvedCount === 0;
  const anchorTask = group.tasks[0];
  return (
    <article className="overflow-hidden rounded-lg border border-[#e4ddd4] bg-white shadow-[0_1px_2px_rgba(43,41,38,0.04)] transition hover:border-[#e8724a]/60 hover:shadow-[0_8px_22px_rgba(43,41,38,0.08)]">
      <button type="button" onClick={() => onOpenGroup(group)} className="block w-full p-4 text-left">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="line-clamp-2 text-sm font-semibold leading-5 text-[#2b2926]">{group.scopeDescription}</p>
            <p className="mt-1 truncate text-xs font-medium uppercase text-[#7b736b]">
              {group.chapterName} · {group.lessonName}
            </p>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#f5f1ec] px-2.5 py-1 text-xs font-semibold text-[#6b6259]">
            <Users className="size-3.5" />
            {submittedCount}/{group.tasks.length}
          </span>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-md bg-[#faf7f3] px-2 py-1 text-[#6b6259]">Dạy: {teachingWeekLabel(group.weekStartDate)}</span>
          <span className="rounded-md bg-[#faf7f3] px-2 py-1 text-[#6b6259]">Hạn: {formatDateTime(group.deadline)}</span>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-full bg-amber-100 px-2.5 py-1 font-medium text-amber-800">{pendingCount} chờ duyệt</span>
          <span className="rounded-full bg-emerald-100 px-2.5 py-1 font-medium text-emerald-800">{approvedCount} đã duyệt</span>
        </div>
      </button>
      <div className="flex items-center justify-between gap-3 border-t border-[#f0ece5] px-4 py-2 text-xs">
        <span className="text-[#8a8178]">Bấm card để xem giáo viên</span>
        <span className="flex shrink-0 items-center gap-2">
          {anchorTask ? (
            <button
              type="button"
              disabled={!canEditGroup}
              onClick={() => onEditGroup(anchorTask)}
              title={
                !canEdit
                  ? "Lịch nộp đã kết thúc, không thể sửa"
                  : approvedCount > 0
                    ? "Đã có giáo án được duyệt, không thể sửa"
                    : "Sửa lịch nộp giáo án"
              }
              className="rounded-md border border-[#e4ddd4] bg-white px-2.5 py-1 font-medium text-[#b85c3b] transition hover:border-[#e8724a] hover:bg-[#fff7f2] disabled:cursor-not-allowed disabled:border-[#e8e2d9] disabled:bg-[#f5f1ec] disabled:text-[#b8afa6]"
            >
              Sửa
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => onOpenGroup(group)}
            className="rounded-md bg-[#e8724a] px-2.5 py-1 font-medium text-white transition hover:bg-[#d9633b]"
          >
            Chi tiết
          </button>
        </span>
      </div>
    </article>
  );
}

function WeeklyScheduleScreen() {
  const router = useRouter();
  const { user, authFetch } = useAuth();
  const isModerator = hasAnyRole(user, ["MODERATOR"]);

  const [schedule, setSchedule] = useState<WeeklyTaskSchedule>({ weeks: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");

  const [selectedLessonGroup, setSelectedLessonGroup] = useState<LessonGroup | null>(null);
  // Xem lại giáo án đã duyệt ngay từ popup danh sách nộp. Popup này nằm trên popup
  // danh sách; đóng nó chỉ quay về danh sách để Mod tiếp tục xem giáo viên khác.
  const [viewingApprovedTask, setViewingApprovedTask] = useState<WeeklyTaskSummary | null>(null);
  const [approvedLessonDocument, setApprovedLessonDocument] = useState<TiptapNode | string | null>(null);
  const [approvedLessonDetail, setApprovedLessonDetail] = useState<WeeklyTaskDetail | null>(null);
  const [approvedLessonError, setApprovedLessonError] = useState("");
  const [approvedLessonLoading, setApprovedLessonLoading] = useState(false);
  const approvedLessonRequestRef = useRef(0);
  const [viewYear, setViewYear] = useState(() => new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(() => new Date().getMonth());
  // BR-51: Mod luôn thao tác trong phạm vi đúng 1 khối đã chọn.
  const [modGrade, setModGrade] = useState<WeeklyTaskGrade>(10);
  // Teacher xem lịch của mình mọi khối (BR-51 vẫn cho phép dạy nhiều khối) — filter khối chỉ để lọc hiển
  // thị, không bắt buộc như Mod, nên mặc định "Tất cả khối" (null).
  const [teacherGradeFilter, setTeacherGradeFilter] = useState<number | null>(null);

  // ── Sửa 1 lịch nộp giáo án theo cụm giáo viên (Moderator) ─────────────
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formTeacherId, setFormTeacherId] = useState("");
  const [formWeekStart, setFormWeekStart] = useState("");
  const [formTitle, setFormTitle] = useState("");
  const [formGrade, setFormGrade] = useState<WeeklyTaskGrade>(10);
  const [saving, setSaving] = useState(false);
  const editPicker = useTextbookPicker(user?.subject ?? undefined, formGrade, formOpen);

  // ── Giao 1 bài cho cả khối (Moderator) — mỗi ô lịch nộp giáo án = 1 bài (BR-53) ─
  const [createOpen, setCreateOpen] = useState(false);
  const [createWeekStart, setCreateWeekStart] = useState("");
  const [createTitle, setCreateTitle] = useState("");
  const [createSaving, setCreateSaving] = useState(false);
  const createPicker = useTextbookPicker(user?.subject ?? undefined, modGrade, createOpen);

  // ── Nộp giáo án (Teacher) — chỉ từ thư viện cá nhân, chọn qua popup dạng thẻ (không còn tải tệp lên) ──
  const [submittingTask, setSubmittingTask] = useState<WeeklyTaskSummary | null>(null);
  const [ownedLessonPlans, setOwnedLessonPlans] = useState<LibraryContent[]>([]);
  const [selectedLessonPlanId, setSelectedLessonPlanId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  // Popup mặc định chỉ lọc đúng Khối/Môn/Chương được giao; bật cờ này khi GV chủ động mở rộng vì
  // giáo án cũ (tạo trước khi có lọc theo chương) chưa có metadata nên không khớp filter.
  const [showAllLessonPlans, setShowAllLessonPlans] = useState(false);
  const [unsubmitTarget, setUnsubmitTarget] = useState<{ id: string; title: string } | null>(null);

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
      setError(e instanceof Error ? e.message : "Không thể tải lịch nộp giáo án.");
    } finally {
      setLoading(false);
    }
  }, [authFetch, isModerator, viewYear, viewMonth, modGrade]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

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

  async function handleUnsubmit(taskId: string) {
    try {
      await unsubmitWeeklyTask(authFetch, taskId);
      setMsg("Đã rút giáo án.");
      setUnsubmitTarget(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không thể rút giáo án.");
    }
  }

  function openSubmittedTaskApproval(taskId: string) {
    router.push(`/lesson-plan-approval?taskId=${encodeURIComponent(taskId)}&preview=1`);
  }

  function openApprovedLessonViewer(task: WeeklyTaskSummary) {
    const requestId = ++approvedLessonRequestRef.current;
    setViewingApprovedTask(task);
    setApprovedLessonDocument(null);
    setApprovedLessonDetail(null);
    setApprovedLessonError("");
    setApprovedLessonLoading(true);

    void getWeeklyTask(authFetch, task.id)
      .then((detail) => {
        if (requestId !== approvedLessonRequestRef.current) return;
        const document = resolveWeeklyTaskLessonDocument(detail.sourceLibraryContentPayload);
        if (!document) throw new Error("Giáo án này không có nội dung có thể xem lại.");
        setApprovedLessonDetail(detail);
        setApprovedLessonDocument(document);
      })
      .catch((reason: unknown) => {
        if (requestId !== approvedLessonRequestRef.current) return;
        setApprovedLessonError(reason instanceof Error ? reason.message : "Không thể mở giáo án đã duyệt.");
      })
      .finally(() => {
        if (requestId === approvedLessonRequestRef.current) setApprovedLessonLoading(false);
      });
  }

  function closeApprovedLessonViewer() {
    approvedLessonRequestRef.current += 1;
    setViewingApprovedTask(null);
    setApprovedLessonDocument(null);
    setApprovedLessonDetail(null);
    setApprovedLessonError("");
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
    <main className="min-h-screen bg-white text-[#171717]">
      <div className="flex min-h-screen">
        <Sidebar activeHref="/weekly-schedule" />
        <section className="min-w-0 flex-1 bg-white px-5 py-8 sm:px-8 lg:px-10 lg:py-12">
          <header className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="inline-flex h-[26px] items-center gap-1.5 rounded-full border border-[#eadfd7] bg-[#fff7f1] px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#d97757]"><BookOpen aria-hidden className="size-3.5" /> Quản lý tiến độ giáo án</p>
              <h1 className="mt-3 font-libertine text-[42px] font-normal leading-[1.08] text-[#1f1f1f] sm:text-[48px]">Lịch nộp giáo án</h1>
              <p className="mt-3 text-[13px] leading-[23px] text-[#6b6b6b]">
                {isModerator
                  ? "Lịch nộp giáo án theo khối, áp dụng cho giáo viên dạy khối đó cùng môn."
                  : "Lịch nộp giáo án được giao cho bạn."}
              </p>
            </div>
          </header>

          <div className="mt-9 flex flex-wrap items-center gap-3 rounded-[14px] border border-[#d8d1c9] bg-white px-4 py-3">
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
                  Lịch nộp <span className="font-semibold text-[#2b2926]">{weekLabel(createWeekStart)}</span>{" "}
                  <span className="font-semibold text-[#2b2926]">
                    (lịch dạy thực tế: {teachingWeekLabel(createWeekStart)})
                  </span>{" "}
                  · Hạn nộp:{" "}
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
            title="Sửa lịch nộp giáo án"
            description={`Khối ${formGrade} - tạo nhiệm vụ khối khác thì tạo lịch mới.`}
            maxWidthClassName="max-w-5xl"
          >
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
              <div className="space-y-4">
                <p className="w-full rounded-xl border border-[#e4ddd4] bg-[#f7f3ee] px-4 py-3 text-sm text-[#4f4943]">
                  Lịch nộp <span className="font-semibold text-[#2b2926]">{weekLabel(formWeekStart)}</span>{" "}
                  <span className="font-semibold text-[#2b2926]">
                    (lịch dạy thực tế: {teachingWeekLabel(formWeekStart)})
                  </span>{" "}
                  · Hạn nộp:{" "}
                  <span className="font-semibold text-[#2b2926]">{weekDeadlinePreview(formWeekStart)}</span>
                </p>
                <label className="text-xs font-medium text-[#6b6b6b]">Tiêu đề</label>
                <textarea
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="Vd: Ôn tập cuối chương, Kiểm tra 15 phút..."
                  rows={7}
                  className="mt-1.5 w-full resize-none rounded-xl border border-[#d8d1c9] bg-[#fffdfb] p-3 text-sm leading-6 outline-none transition focus:border-[#e8724a] focus:ring-2 focus:ring-[#e8724a]/15"
                />
              </div>
              <div className="space-y-4 rounded-xl border border-[#ebe4dc] bg-[#fffdfb] p-4">
                {editPicker.matchingBooks.length > 1 ? (
                  <div>
                    <label className="text-xs font-medium text-[#6b6b6b]">Sách giáo khoa</label>
                    <div className="mt-1.5">
                      <Dropdown
                        placeholder="Chọn sách..."
                        value={editPicker.bookCode || null}
                        options={editPicker.matchingBooks.map((b) => ({ value: b.id, label: b.name }))}
                        onChange={editPicker.setBookCode}
                      />
                    </div>
                  </div>
                ) : null}
                <div>
                  <label className="text-xs font-medium text-[#6b6b6b]">Chương</label>
                  <div className="mt-1.5">
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
                  <div className="mt-1.5">
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
            </div>
            <div className="mt-6 flex justify-end gap-2 border-t border-[#f0ece5] pt-4">
              <button onClick={() => setFormOpen(false)} className="rounded-xl px-4 py-2 text-sm hover:bg-[#f5f1ec]">
                Hủy
              </button>
              <button
                onClick={() => void handleSaveTask()}
                disabled={
                  saving ||
                  !formTeacherId ||
                  !formWeekStart ||
                  !formTitle.trim() ||
                  !editPicker.bookCode ||
                  !editPicker.chapterCode ||
                  !editPicker.lessonCode
                }
                className="rounded-xl bg-[#e8724a] px-4 py-2 text-sm text-white transition hover:bg-[#d9633b] disabled:opacity-50"
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

          <Modal
            open={selectedLessonGroup !== null}
            onClose={() => setSelectedLessonGroup(null)}
            title={selectedLessonGroup?.scopeDescription ?? "Tình trạng nộp giáo án"}
            description={
              selectedLessonGroup
                ? `${selectedLessonGroup.chapterName} · ${selectedLessonGroup.lessonName} · Lịch dạy thực tế: ${teachingWeekLabel(selectedLessonGroup.weekStartDate)}`
                : undefined
            }
            maxWidthClassName="max-w-3xl"
          >
            {selectedLessonGroup ? (
              <div className="space-y-3">
                <div className="grid gap-2 rounded-lg border border-[#e4ddd4] bg-[#faf9f7] px-4 py-3 text-xs text-[#6b6259] sm:grid-cols-3">
                  <span>Tổng: <strong className="text-[#2b2926]">{selectedLessonGroup.tasks.length}</strong></span>
                  <span>Chờ duyệt: <strong className="text-amber-800">{selectedLessonGroup.tasks.filter((t) => t.reviewStatus === "SUBMITTED").length}</strong></span>
                  <span>Đã duyệt: <strong className="text-emerald-800">{selectedLessonGroup.tasks.filter((t) => t.reviewStatus === "APPROVED").length}</strong></span>
                </div>
                {selectedLessonGroup.tasks.map((t) => {
                  const canOpenApproval = t.reviewStatus === "SUBMITTED";
                  const canViewApprovedLesson = t.reviewStatus === "APPROVED";
                  const content = (
                    <>
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#f5f1ec] text-xs font-bold text-[#8a5a44]">
                          {(t.teacherName ?? "GV").trim().charAt(0).toUpperCase()}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-[#2b2926]">{t.teacherName ?? "Giáo viên"}</p>
                          <p className="mt-1 text-xs text-[#8a8178]">Nộp lúc {t.submittedAt ? formatDateTime(t.submittedAt) : "-"}</p>
                        </div>
                      </div>
                      <span className="flex shrink-0 items-center gap-2 self-start sm:self-center">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusClasses[t.reviewStatus]}`}>
                          {statusLabels[t.reviewStatus]}
                        </span>
                        {canOpenApproval ? <ExternalLink className="size-4 text-[#b85c3b]" /> : null}
                      </span>
                    </>
                  );

                  return canOpenApproval ? (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => openSubmittedTaskApproval(t.id)}
                      className="flex w-full flex-col justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50/60 px-4 py-3 text-left transition hover:border-[#e8724a] hover:bg-[#fff7f2] sm:flex-row sm:items-center"
                    >
                      {content}
                    </button>
                  ) : canViewApprovedLesson ? (
                    <div
                      key={t.id}
                      className="flex w-full flex-col justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50/50 px-4 py-3 sm:flex-row sm:items-center"
                    >
                      {content}
                      <button
                        type="button"
                        onClick={() => openApprovedLessonViewer(t)}
                        className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-[#e8724a] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#d9633b]"
                      >
                        <BookOpen className="size-3.5" />
                        Mở tài nguyên
                      </button>
                    </div>
                  ) : (
                    <div key={t.id} className="flex flex-col justify-between gap-3 rounded-lg border border-[#e4ddd4] bg-white px-4 py-3 sm:flex-row sm:items-center">
                      {content}
                    </div>
                  );
                })}
              </div>
            ) : null}
          </Modal>

          {viewingApprovedTask ? (
            <div
              className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-[2px]"
              role="dialog"
              aria-modal="true"
              aria-labelledby="approved-lesson-preview-title"
              onMouseDown={closeApprovedLessonViewer}
            >
              <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl bg-[#f7f5f2] shadow-2xl" onMouseDown={(event) => event.stopPropagation()}>
                <header className="flex shrink-0 items-center justify-between gap-3 border-b border-[#e4ddd4] bg-white px-5 py-3">
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-[#d97757]">Giáo án đã duyệt · {viewingApprovedTask.teacherName ?? "Giáo viên"}</p>
                    <h2 id="approved-lesson-preview-title" className="truncate text-base font-semibold">
                      {approvedLessonDetail?.sourceLibraryContentTitle ?? viewingApprovedTask.scopeDescription}
                    </h2>
                  </div>
                  <button type="button" onClick={closeApprovedLessonViewer} aria-label="Quay lại danh sách nộp" className="flex size-9 shrink-0 items-center justify-center rounded-lg text-[#6b6259] transition hover:bg-[#f5f1ec]">
                    <X className="size-5" />
                  </button>
                </header>
                <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-6">
                  {approvedLessonLoading ? (
                    <div className="flex min-h-72 items-center justify-center gap-2 text-sm text-[#6b6b6b]">
                      <Loader2 className="size-4 animate-spin" />
                      Đang mở giáo án...
                    </div>
                  ) : approvedLessonError ? (
                    <div className="mx-auto flex min-h-40 max-w-[860px] items-center justify-center gap-2 rounded-xl border border-[#e8b4a4] bg-[#fdf3ef] px-5 text-sm text-[#c0492b]">
                      <AlertCircle className="size-4 shrink-0" />
                      {approvedLessonError}
                    </div>
                  ) : approvedLessonDocument ? (
                    <article className="mx-auto min-h-[1123px] max-w-[794px] bg-white px-8 py-10 shadow-[0_1px_2px_rgba(43,41,38,0.06),0_8px_28px_rgba(43,41,38,0.08)] sm:px-12 lg:px-16">
                      <RichView html={approvedLessonDocument} variant="document" />
                    </article>
                  ) : null}
                </div>
                <footer className="flex shrink-0 justify-end border-t border-[#e4ddd4] bg-white px-5 py-3">
                  <button type="button" onClick={closeApprovedLessonViewer} className="rounded-lg border border-[#d8d1c9] px-4 py-2 text-sm font-medium text-[#4f4943] transition hover:bg-[#f5f1ec]">
                    Quay lại danh sách nộp
                  </button>
                </footer>
              </div>
            </div>
          ) : null}

          {msg ? <p className="mt-4 text-sm text-emerald-700">{msg}</p> : null}
          {error ? <p className="mt-4 text-sm text-red-700">{error}</p> : null}

          {loading ? (
            <div className="mt-6 space-y-3">
              {[1, 2, 3].map((x) => (
                <div key={x} className="h-24 animate-pulse rounded-[14px] bg-[#f0ece7]" />
              ))}
            </div>
          ) : isModerator ? (
            <div className="mt-6 overflow-hidden rounded-lg border border-[#e4ddd4] bg-white shadow-sm">
              <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] table-fixed border-collapse text-sm">
                <colgroup>
                  <col className="w-36" />
                  <col />
                </colgroup>
                <tbody>
                  {buildMonthSchedule(schedule.weeks, viewYear, viewMonth).map((week) => {
                    const current = isCurrentWeek(week.weekStartDate);
                    const canAssign = canAssignWeek(week.weekStartDate);
                    return (
                      <tr key={week.weekStartDate} className="border-t border-[#eee7df] align-top first:border-t-0">
                        <td className="border-r border-[#eee7df] bg-[#fbfaf8] p-3">
                          <p className="text-sm font-semibold leading-5">
                            Lịch nộp {weekLabel(week.weekStartDate)}
                          </p>
                          <p className="mt-1 text-xs leading-5 text-[#6b6b6b]">Dạy: {teachingWeekLabel(week.weekStartDate)}</p>
                          {current ? (
                            <span className="mt-2 inline-block rounded-full bg-[#e8724a]/10 px-2 py-0.5 text-[11px] font-medium text-[#b85c3b]">
                              Tuần nộp
                            </span>
                          ) : null}
                        </td>
                        <td className="bg-white p-3">
                          <div className="grid gap-3 sm:grid-cols-2">
                            {weekSlots(week.tasks).map((group, slotIndex) =>
                              group ? (
                                <LessonGroupCard
                                  key={group.key}
                                  group={group}
                                  canEdit={canAssign}
                                  onEditGroup={openEditForm}
                                  onOpenGroup={setSelectedLessonGroup}
                                />
                              ) : canAssign ? (
                                <button
                                  key={`empty-${slotIndex}`}
                                  type="button"
                                  onClick={() => openCreatePanel(week.weekStartDate)}
                                  className="flex min-h-24 items-center justify-center rounded-lg border border-dashed border-[#d8d1c9] bg-[#fffdfb] p-2 text-center text-xs font-medium text-[#8a8178] transition hover:border-[#e8724a]/60 hover:bg-[#fff7f2] hover:text-[#b85c3b]"
                                >
                                  {slotIndex === 0 ? "Ấn để thêm bài thứ nhất" : "Ấn để thêm bài thứ hai"}
                                </button>
                              ) : (
                                <div
                                  key={`empty-${slotIndex}`}
                                  title="Tuần đã kết thúc, không thể giao bài"
                                  className="flex min-h-24 cursor-not-allowed items-center justify-center rounded-lg border border-dashed border-[#d8d1c9] bg-[#f5f1ec] p-2 text-center text-xs text-[#b8afa6]"
                                >
                                  Đã qua hạn
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
            </div>
          ) : teacherWeeks.length === 0 ? (
            <div className="mt-8 rounded-[14px] border border-dashed border-[#d8d1c9] bg-[#faf9f7] p-12 text-center text-sm text-[#6b6b6b]">
              {teacherGradeFilter !== null
                ? `Chưa có lịch nộp giáo án nào cho khối ${teacherGradeFilter}.`
                : "Chưa có lịch nộp giáo án nào."}
            </div>
          ) : (
            <div className="mt-6 overflow-x-auto rounded-[14px] border border-[#d8d1c9] bg-white">
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
                          <p className="text-sm font-medium">
                            Lịch nộp {weekLabel(week.weekStartDate)}{" "}
                            <span className="text-xs font-normal text-[#6b6b6b]">
                              (lịch dạy thực tế: {teachingWeekLabel(week.weekStartDate)})
                            </span>
                          </p>
                          {currentWeek ? (
                            <span className="mt-1 inline-block rounded-full bg-[#e8724a]/10 px-2 py-0.5 text-[11px] font-medium text-[#b85c3b]">
                              Tuần nộp
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
                                      <p className="mt-1 text-xs text-[#6b6b6b]">
                                        Lịch dạy thực tế: {teachingWeekLabel(t.weekStartDate)}
                                      </p>
                                      <p className="mt-2 text-xs text-[#6b6b6b]">
                                        Hạn nộp: {formatDateTime(t.deadline)}
                                        {expired ? " (đã quá hạn)" : ""}
                                      </p>
                                    </div>
                                    <div className="flex shrink-0 items-center gap-2 text-sm">
                                      {current &&
                                      !expired &&
                                      (t.reviewStatus === "NOT_SUBMITTED" || t.reviewStatus === "REJECTED") ? (
                                        <button onClick={() => openSubmitPanel(t)} className="text-[#b85c3b] underline">
                                          Nộp giáo án
                                        </button>
                                      ) : null}
                                      {current && !expired && t.reviewStatus === "SUBMITTED" ? (
                                        <button onClick={() => setUnsubmitTarget({ id: t.id, title: t.scopeDescription })} className="text-red-600 underline">
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
      <ConfirmDialog
        open={unsubmitTarget !== null}
        onClose={() => setUnsubmitTarget(null)}
        onConfirm={() => unsubmitTarget && void handleUnsubmit(unsubmitTarget.id)}
        title="Rút giáo án đã nộp?"
        description={
          <>
            Giáo án cho <span className="font-semibold text-[#1f1f1f]">&quot;{unsubmitTarget?.title}&quot;</span> sẽ rời khỏi hàng chờ duyệt. Bạn có thể nộp lại nếu lịch nộp còn cho phép.
          </>
        }
        confirmLabel="Rút giáo án"
        variant="danger"
      />
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
