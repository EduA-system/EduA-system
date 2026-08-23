"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CalendarClock, CheckCircle2, ChevronLeft, ChevronRight, Download, Loader2, UsersRound } from "lucide-react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Sidebar } from "@/components/layout/Sidebar";
import { useAuth } from "@/lib/auth/AuthContext";
import { RouteGuard } from "@/lib/auth/RouteGuard";
import { openExportedPdf } from "@/lib/document-export";
import {
  exportModeratorStatisticsReport,
  getLibraryContentReviewSummary,
  getOverdueByTeacherQuarter,
  getOverdueByTeacherWeek,
  getWeeklyTaskReviewSummary,
  type OverdueByTeacher,
  type ReviewStatusCounts,
} from "@/lib/moderator-statistics";
import {
  exportPrincipalStatisticsReport,
  getAccountsByRole,
  getAiContentTrend,
  getCommunityHubReview,
  getContentBySubject,
  getWeeklyTaskStatus,
  type AccountsByRole,
  type AiContentTrend,
  type CommunityHubReview,
  type ContentBySubject,
  type Subject,
  type WeeklyTaskStatus,
} from "@/lib/principal-statistics";

const APPROVED_COLOR = "#5a7a4a";
const REJECTED_COLOR = "#c2483c";
const BAR_COLOR = "#d97757";
const TYPE_COLORS = {
  lessonPlan: "#3f6f8f",
  slide: "#d97757",
  test: "#7f6aa3",
  simulation: "#5a7a4a",
} as const;
const PENDING_COLOR = "#d8a340";
const INACTIVE_COLOR = "#a8a29e";

const SUBJECT_LABELS: Record<Subject, string> = {
  MATH: "Toán",
  PHYSICS: "Lý",
  CHEMISTRY: "Hóa",
};

const ROLE_LABELS: Record<string, string> = {
  TEACHER: "Teacher",
  MODERATOR: "Moderator",
  IT_STAFF: "IT Support",
  STUDENT: "Student",
};

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function toISODate(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function mondayOf(d: Date): Date {
  const copy = new Date(d);
  const offset = (copy.getDay() + 6) % 7; // 0 = Thứ 2
  copy.setDate(copy.getDate() - offset);
  return copy;
}

function currentWeekStartISO(): string {
  return toISODate(mondayOf(new Date()));
}

/** Nhãn tuần lịch thực: Thứ 2 → Chủ Nhật, vd "06/08 - 09/08" (cùng convention với weekly-schedule/lesson-plan-approval). */
function weekLabel(weekStartDate: string): string {
  const start = new Date(`${weekStartDate}T00:00:00`);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const fmt = (d: Date) => `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}`;
  return `${fmt(start)} - ${fmt(end)}`;
}

function addWeeks(weekStartDate: string, delta: number): string {
  const d = new Date(`${weekStartDate}T00:00:00`);
  d.setDate(d.getDate() + delta * 7);
  return toISODate(d);
}

function currentQuarter(): { year: number; quarter: number } {
  const now = new Date();
  return { year: now.getFullYear(), quarter: Math.floor(now.getMonth() / 3) + 1 };
}

function sumOverdue(data: OverdueByTeacher | null): number {
  return data ? data.items.reduce((total, item) => total + item.overdueCount, 0) : 0;
}

function approvalRate(counts: ReviewStatusCounts | null): string {
  if (!counts) return "—";
  const total = counts.approved + counts.rejected;
  if (total === 0) return "—";
  return `${Math.round((counts.approved / total) * 100)}%`;
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[#d8d1c9] bg-[#fbfaf8] p-4 shadow-[0_2px_8px_rgba(43,41,38,0.04)]">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#8a8178]">
        {icon}
        {label}
      </div>
      <div className="mt-3 text-2xl font-semibold text-[#1f1f1f]">{value}</div>
    </div>
  );
}

function ReviewDonut({ title, counts }: { title: string; counts: ReviewStatusCounts | null }) {
  const total = counts ? counts.approved + counts.rejected : 0;
  const pct = total > 0 && counts ? Math.round((counts.approved / total) * 100) : null;
  const data = counts
    ? [
        { name: "Đã duyệt", value: counts.approved },
        { name: "Từ chối", value: counts.rejected },
      ]
    : [];

  return (
    <div className="rounded-lg border border-[#d8d1c9] bg-[#fbfaf8] p-4 shadow-[0_2px_8px_rgba(43,41,38,0.04)]">
      <h2 className="text-sm font-semibold text-[#2b2926]">{title}</h2>
      {counts === null ? (
        <div className="flex h-[220px] items-center justify-center text-sm text-[#8a8178]">Đang tải...</div>
      ) : total === 0 ? (
        <div className="flex h-[220px] items-center justify-center text-sm text-[#8a8178]">Chưa có dữ liệu.</div>
      ) : (
        <div className="relative">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={data} dataKey="value" nameKey="name" innerRadius={60} outerRadius={85} paddingAngle={2} stroke="none">
                <Cell fill={APPROVED_COLOR} />
                <Cell fill={REJECTED_COLOR} />
              </Pie>
              <Tooltip
                formatter={(value, name) => {
                  const num = typeof value === "number" ? value : Number(value);
                  return [`${num} (${Math.round((num / total) * 100)}%)`, String(name)];
                }}
              />
              <Legend verticalAlign="bottom" height={28} formatter={(value: string) => <span className="text-xs text-[#4f4943]">{value}</span>} />
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center pb-7">
            <span className="text-2xl font-semibold text-[#1f1f1f]">{pct}%</span>
            <span className="text-[11px] text-[#8a8178]">đã duyệt</span>
          </div>
        </div>
      )}
    </div>
  );
}

type FilterMode = "WEEK" | "QUARTER";

function ModeratorStatisticsScreen() {
  const { authFetch } = useAuth();

  // 3 ô số liệu + 2 donut: luôn phản ánh tuần/quý hiện tại, độc lập với filter của bar chart bên dưới.
  const [weeklyTaskSummary, setWeeklyTaskSummary] = useState<ReviewStatusCounts | null>(null);
  const [libraryContentSummary, setLibraryContentSummary] = useState<ReviewStatusCounts | null>(null);
  const [currentWeekOverdue, setCurrentWeekOverdue] = useState<OverdueByTeacher | null>(null);
  const [currentQuarterOverdue, setCurrentQuarterOverdue] = useState<OverdueByTeacher | null>(null);

  const [filterMode, setFilterMode] = useState<FilterMode>("WEEK");
  const [weekStartDate, setWeekStartDate] = useState(currentWeekStartISO());
  const [{ year, quarter }, setQuarterSelection] = useState(currentQuarter());
  // Kèm theo "key" của request đã sinh ra data — cho phép suy ra trạng thái đang tải (key hiện tại !=
  // key đang chọn) mà không cần setState đồng bộ ngay khi effect chạy (tránh cascading render).
  const requestKey = filterMode === "WEEK" ? `week:${weekStartDate}` : `quarter:${year}:${quarter}`;
  const [chartResult, setChartResult] = useState<{ key: string; data: OverdueByTeacher } | null>(null);
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const { year: curYear, quarter: curQuarter } = currentQuarter();
    Promise.all([
      getWeeklyTaskReviewSummary(authFetch),
      getLibraryContentReviewSummary(authFetch),
      getOverdueByTeacherWeek(authFetch, currentWeekStartISO()),
      getOverdueByTeacherQuarter(authFetch, curYear, curQuarter),
    ])
      .then(([weeklyTask, libraryContent, weekOverdue, quarterOverdue]) => {
        if (cancelled) return;
        setWeeklyTaskSummary(weeklyTask);
        setLibraryContentSummary(libraryContent);
        setCurrentWeekOverdue(weekOverdue);
        setCurrentQuarterOverdue(quarterOverdue);
      })
      .catch((e: Error) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [authFetch]);

  useEffect(() => {
    let cancelled = false;
    const key = requestKey;
    const request =
      filterMode === "WEEK" ? getOverdueByTeacherWeek(authFetch, weekStartDate) : getOverdueByTeacherQuarter(authFetch, year, quarter);
    request
      .then((data) => {
        if (!cancelled) setChartResult({ key, data });
      })
      .catch((e: Error) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [authFetch, filterMode, weekStartDate, year, quarter, requestKey]);

  const chartLoading = chartResult?.key !== requestKey;
  const barData = useMemo(() => {
    if (!chartResult || chartResult.key !== requestKey) return [];
    return chartResult.data.items.map((item) => ({ name: item.teacherName ?? "—", overdueCount: item.overdueCount }));
  }, [chartResult, requestKey]);

  async function exportReport() {
    if (exporting) return;
    setExporting(true);
    setError("");
    try {
      const result = await exportModeratorStatisticsReport(authFetch, filterMode, weekStartDate, year, quarter);
      openExportedPdf(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không thể xuất báo cáo PDF.");
    } finally {
      setExporting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f7f5f2] text-[#2b2926]">
      <div className="flex min-h-screen">
        <Sidebar activeHref="/statistics" />
        <section className="min-w-0 flex-1 px-5 py-6 sm:px-8 lg:px-10">
          <header className="flex flex-wrap items-end justify-between gap-4 border-b border-[#e4ddd4] pb-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-[#d97757]">Quản trị</p>
              <h1 className="mt-1 text-[30px] font-semibold leading-tight">Thống kê</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[#6b6b6b]">
                Theo dõi tiến độ nộp giáo án theo tuần và tỉ lệ duyệt nội dung của giáo viên cùng môn.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void exportReport()}
              disabled={exporting}
              className="inline-flex items-center gap-2 rounded-lg bg-[#1f1f1f] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#343434] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {exporting ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
              {exporting ? "Đang xuất..." : "Xuất PDF"}
            </button>
          </header>

          {error && (
            <div className="mt-4 rounded-lg border border-[#f0c9c4] bg-[#fdeceb] px-4 py-3 text-sm text-[#c2483c]">{error}</div>
          )}

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <Metric
              icon={<AlertTriangle className="size-4" aria-hidden />}
              label="GV trễ hạn (tuần này)"
              value={currentWeekOverdue ? String(currentWeekOverdue.items.length) : "…"}
            />
            <Metric
              icon={<CalendarClock className="size-4" aria-hidden />}
              label="Tổng task trễ hạn (quý này)"
              value={currentQuarterOverdue ? String(sumOverdue(currentQuarterOverdue)) : "…"}
            />
            <Metric
              icon={<CheckCircle2 className="size-4" aria-hidden />}
              label="Tỷ lệ duyệt Weekly Task"
              value={approvalRate(weeklyTaskSummary)}
            />
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <ReviewDonut title="Duyệt vs Từ chối — Weekly Task" counts={weeklyTaskSummary} />
            <ReviewDonut title="Duyệt vs Từ chối — Community Hub" counts={libraryContentSummary} />
          </div>

          <div className="mt-4 rounded-lg border border-[#d8d1c9] bg-[#fbfaf8] p-4 shadow-[0_2px_8px_rgba(43,41,38,0.04)]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-[#2b2926]">Task trễ hạn theo giáo viên</h2>
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex rounded-lg border border-[#d8d1c9] bg-white p-0.5 text-xs font-medium">
                  {(["WEEK", "QUARTER"] as FilterMode[]).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setFilterMode(mode)}
                      className={`rounded-md px-3 py-1.5 transition ${
                        filterMode === mode ? "bg-[#d97757] text-white" : "text-[#6b6b6b] hover:bg-[#f4efe9]"
                      }`}
                    >
                      {mode === "WEEK" ? "Theo tuần" : "Theo quý"}
                    </button>
                  ))}
                </div>
                {filterMode === "WEEK" ? (
                  <div className="flex items-center gap-1 text-sm">
                    <button
                      type="button"
                      onClick={() => setWeekStartDate((w) => addWeeks(w, -1))}
                      className="rounded-md border border-[#d8d1c9] p-1 hover:bg-[#f4efe9]"
                      aria-label="Tuần trước"
                    >
                      <ChevronLeft className="size-4" />
                    </button>
                    <span className="min-w-[110px] text-center font-medium text-[#4f4943]">{weekLabel(weekStartDate)}</span>
                    <button
                      type="button"
                      onClick={() => setWeekStartDate((w) => addWeeks(w, 1))}
                      className="rounded-md border border-[#d8d1c9] p-1 hover:bg-[#f4efe9]"
                      aria-label="Tuần sau"
                    >
                      <ChevronRight className="size-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-sm">
                    <select
                      value={quarter}
                      onChange={(e) => setQuarterSelection((s) => ({ ...s, quarter: Number(e.target.value) }))}
                      className="rounded-md border border-[#d8d1c9] bg-white px-2 py-1"
                    >
                      {[1, 2, 3, 4].map((q) => (
                        <option key={q} value={q}>
                          Quý {q}
                        </option>
                      ))}
                    </select>
                    <select
                      value={year}
                      onChange={(e) => setQuarterSelection((s) => ({ ...s, year: Number(e.target.value) }))}
                      className="rounded-md border border-[#d8d1c9] bg-white px-2 py-1"
                    >
                      {[year, year - 1].map((y) => (
                        <option key={y} value={y}>
                          {y}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>

            {chartLoading ? (
              <div className="flex h-[340px] items-center justify-center text-sm text-[#8a8178]">Đang tải...</div>
            ) : barData.length === 0 ? (
              <div className="flex h-[340px] items-center justify-center text-sm text-[#8a8178]">
                Không có giáo viên nào trễ hạn trong khoảng thời gian này.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={340}>
                <BarChart data={barData} margin={{ left: 8, right: 16, top: 16, bottom: barData.length > 6 ? 60 : 24 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e8e2d9" vertical={false} />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: "#4f4943", fontSize: 12 }}
                    axisLine={{ stroke: "#c3c2b7" }}
                    interval={0}
                    angle={barData.length > 6 ? -30 : 0}
                    textAnchor={barData.length > 6 ? "end" : "middle"}
                    height={barData.length > 6 ? 70 : 30}
                  />
                  <YAxis allowDecimals={false} tick={{ fill: "#8a8178", fontSize: 12 }} axisLine={{ stroke: "#c3c2b7" }} />
                  <Tooltip
                    formatter={(value) => {
                      const num = typeof value === "number" ? value : Number(value);
                      return [`${num} task`, "Trễ hạn"];
                    }}
                    cursor={{ fill: "#f4efe9" }}
                  />
                  <Bar dataKey="overdueCount" name="Trễ hạn" fill={BAR_COLOR} radius={[4, 4, 0, 0]} maxBarSize={48} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

function totalContent(data: AiContentTrend | ContentBySubject | null): number {
  if (!data) return 0;
  return data.items.reduce((sum, item) => sum + item.lessonPlan + item.slide + item.test + item.simulation, 0);
}

function PrincipalReviewDonut({ review }: { review: CommunityHubReview | null }) {
  const total = review ? review.pending + review.approved + review.rejected : 0;
  const data = review
    ? [
        { name: "Chờ duyệt", value: review.pending, fill: PENDING_COLOR },
        { name: "Đã đăng", value: review.approved, fill: APPROVED_COLOR },
        { name: "Từ chối", value: review.rejected, fill: REJECTED_COLOR },
      ]
    : [];

  return (
    <div className="rounded-lg border border-[#d8d1c9] bg-[#fbfaf8] p-4 shadow-[0_2px_8px_rgba(43,41,38,0.04)]">
      <h2 className="text-sm font-semibold text-[#2b2926]">Kiểm duyệt Community Hub</h2>
      {review === null ? (
        <div className="flex h-[280px] items-center justify-center text-sm text-[#8a8178]">Đang tải...</div>
      ) : total === 0 ? (
        <div className="flex h-[280px] items-center justify-center text-sm text-[#8a8178]">Chưa có dữ liệu.</div>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" innerRadius={72} outerRadius={104} paddingAngle={2} stroke="none">
              {data.map((item) => (
                <Cell key={item.name} fill={item.fill} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value, name) => {
                const num = typeof value === "number" ? value : Number(value);
                return [`${num} (${Math.round((num / total) * 100)}%)`, String(name)];
              }}
            />
            <Legend verticalAlign="bottom" height={28} formatter={(value: string) => <span className="text-xs text-[#4f4943]">{value}</span>} />
          </PieChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

function PrincipalStatisticsScreen() {
  const { authFetch } = useAuth();
  const [trend, setTrend] = useState<AiContentTrend | null>(null);
  const [bySubject, setBySubject] = useState<ContentBySubject | null>(null);
  const [weeklyStatus, setWeeklyStatus] = useState<WeeklyTaskStatus | null>(null);
  const [hubReview, setHubReview] = useState<CommunityHubReview | null>(null);
  const [accounts, setAccounts] = useState<AccountsByRole | null>(null);
  const [weeklySubject, setWeeklySubject] = useState<Subject | "">("");
  const [accountSubject, setAccountSubject] = useState<Subject | "">("");
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getAiContentTrend(authFetch, 6), getContentBySubject(authFetch), getCommunityHubReview(authFetch)])
      .then(([nextTrend, nextBySubject, nextHubReview]) => {
        if (cancelled) return;
        setTrend(nextTrend);
        setBySubject(nextBySubject);
        setHubReview(nextHubReview);
      })
      .catch((e: Error) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [authFetch]);

  useEffect(() => {
    let cancelled = false;
    getWeeklyTaskStatus(authFetch, undefined, undefined, weeklySubject)
      .then((data) => {
        if (!cancelled) setWeeklyStatus(data);
      })
      .catch((e: Error) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [authFetch, weeklySubject]);

  useEffect(() => {
    let cancelled = false;
    getAccountsByRole(authFetch, accountSubject)
      .then((data) => {
        if (!cancelled) setAccounts(data);
      })
      .catch((e: Error) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [accountSubject, authFetch]);

  const trendData = useMemo(
    () =>
      trend?.items.map((item) => ({
        ...item,
        label: `${item.month.slice(5)}/${item.month.slice(2, 4)}`,
      })) ?? [],
    [trend],
  );
  const subjectData = useMemo(() => bySubject?.items.map((item) => ({ ...item, label: SUBJECT_LABELS[item.subject] })) ?? [], [bySubject]);
  const weeklyData = useMemo(
    () =>
      weeklyStatus?.items.map((item) => ({
        ...item,
        label: weekLabel(item.weekStartDate),
      })) ?? [],
    [weeklyStatus],
  );
  const accountData = useMemo(() => accounts?.items.map((item) => ({ ...item, label: ROLE_LABELS[item.role] ?? item.role })) ?? [], [accounts]);
  const activeAccounts = accounts?.items.reduce((sum, item) => sum + item.active, 0);

  async function exportReport() {
    if (exporting) return;
    setExporting(true);
    setError("");
    try {
      const result = await exportPrincipalStatisticsReport(authFetch, weeklySubject, accountSubject);
      openExportedPdf(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không thể xuất báo cáo PDF.");
    } finally {
      setExporting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f7f5f2] text-[#2b2926]">
      <div className="flex min-h-screen">
        <Sidebar activeHref="/statistics" />
        <section className="min-w-0 flex-1 px-5 py-6 sm:px-8 lg:px-10">
          <header className="flex flex-wrap items-end justify-between gap-4 border-b border-[#e4ddd4] pb-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-[#d97757]">Quản trị</p>
              <h1 className="mt-1 text-[30px] font-semibold leading-tight">Thống kê toàn trường</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[#6b6b6b]">
                Theo dõi xu hướng tạo học liệu, tiến độ Weekly Task, kiểm duyệt Community Hub và tình trạng tài khoản.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void exportReport()}
              disabled={exporting}
              className="inline-flex items-center gap-2 rounded-lg bg-[#1f1f1f] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#343434] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {exporting ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
              {exporting ? "Đang xuất..." : "Xuất PDF"}
            </button>
          </header>

          {error && <div className="mt-4 rounded-lg border border-[#f0c9c4] bg-[#fdeceb] px-4 py-3 text-sm text-[#c2483c]">{error}</div>}

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <Metric icon={<CalendarClock className="size-4" aria-hidden />} label="Nội dung AI (6 tháng)" value={trend ? String(totalContent(trend)) : "…"} />
            <Metric icon={<CheckCircle2 className="size-4" aria-hidden />} label="Hub đã đăng" value={hubReview ? String(hubReview.approved) : "…"} />
            <Metric icon={<UsersRound className="size-4" aria-hidden />} label="Tài khoản active" value={activeAccounts !== undefined ? String(activeAccounts) : "…"} />
          </div>

          <div className="mt-4 rounded-lg border border-[#d8d1c9] bg-[#fbfaf8] p-4 shadow-[0_2px_8px_rgba(43,41,38,0.04)]">
            <h2 className="text-sm font-semibold text-[#2b2926]">Nội dung sinh bằng AI theo thời gian</h2>
            {trend === null ? (
              <div className="flex h-[320px] items-center justify-center text-sm text-[#8a8178]">Đang tải...</div>
            ) : totalContent(trend) === 0 ? (
              <div className="flex h-[320px] items-center justify-center text-sm text-[#8a8178]">Chưa có dữ liệu.</div>
            ) : (
              <ResponsiveContainer width="100%" height={320}>
                <AreaChart data={trendData} margin={{ left: 8, right: 16, top: 16, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e8e2d9" vertical={false} />
                  <XAxis dataKey="label" tick={{ fill: "#4f4943", fontSize: 12 }} axisLine={{ stroke: "#c3c2b7" }} />
                  <YAxis allowDecimals={false} tick={{ fill: "#8a8178", fontSize: 12 }} axisLine={{ stroke: "#c3c2b7" }} />
                  <Tooltip />
                  <Legend verticalAlign="bottom" height={28} formatter={(value: string) => <span className="text-xs text-[#4f4943]">{value}</span>} />
                  <Area type="monotone" dataKey="lessonPlan" stackId="1" name="Lesson Plan" stroke={TYPE_COLORS.lessonPlan} fill={TYPE_COLORS.lessonPlan} fillOpacity={0.72} />
                  <Area type="monotone" dataKey="slide" stackId="1" name="Slide" stroke={TYPE_COLORS.slide} fill={TYPE_COLORS.slide} fillOpacity={0.72} />
                  <Area type="monotone" dataKey="test" stackId="1" name="Test" stroke={TYPE_COLORS.test} fill={TYPE_COLORS.test} fillOpacity={0.72} />
                  <Area type="monotone" dataKey="simulation" stackId="1" name="Simulation" stroke={TYPE_COLORS.simulation} fill={TYPE_COLORS.simulation} fillOpacity={0.72} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="mt-4 grid gap-3 xl:grid-cols-2">
            <div className="rounded-lg border border-[#d8d1c9] bg-[#fbfaf8] p-4 shadow-[0_2px_8px_rgba(43,41,38,0.04)]">
              <h2 className="text-sm font-semibold text-[#2b2926]">Nội dung sinh theo môn</h2>
              {bySubject === null ? (
                <div className="flex h-[300px] items-center justify-center text-sm text-[#8a8178]">Đang tải...</div>
              ) : totalContent(bySubject) === 0 ? (
                <div className="flex h-[300px] items-center justify-center text-sm text-[#8a8178]">Chưa có dữ liệu.</div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={subjectData} margin={{ left: 8, right: 16, top: 16, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e8e2d9" vertical={false} />
                    <XAxis dataKey="label" tick={{ fill: "#4f4943", fontSize: 12 }} axisLine={{ stroke: "#c3c2b7" }} />
                    <YAxis allowDecimals={false} tick={{ fill: "#8a8178", fontSize: 12 }} axisLine={{ stroke: "#c3c2b7" }} />
                    <Tooltip />
                    <Legend verticalAlign="bottom" height={28} formatter={(value: string) => <span className="text-xs text-[#4f4943]">{value}</span>} />
                    <Bar dataKey="lessonPlan" name="Lesson Plan" fill={TYPE_COLORS.lessonPlan} radius={[4, 4, 0, 0]} maxBarSize={28} />
                    <Bar dataKey="slide" name="Slide" fill={TYPE_COLORS.slide} radius={[4, 4, 0, 0]} maxBarSize={28} />
                    <Bar dataKey="test" name="Test" fill={TYPE_COLORS.test} radius={[4, 4, 0, 0]} maxBarSize={28} />
                    <Bar dataKey="simulation" name="Simulation" fill={TYPE_COLORS.simulation} radius={[4, 4, 0, 0]} maxBarSize={28} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
            <PrincipalReviewDonut review={hubReview} />
          </div>

          <div className="mt-4 grid gap-3 xl:grid-cols-2">
            <div className="rounded-lg border border-[#d8d1c9] bg-[#fbfaf8] p-4 shadow-[0_2px_8px_rgba(43,41,38,0.04)]">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-sm font-semibold text-[#2b2926]">Trạng thái duyệt Weekly Task</h2>
                <select value={weeklySubject} onChange={(e) => setWeeklySubject(e.target.value as Subject | "")} className="rounded-md border border-[#d8d1c9] bg-white px-2 py-1 text-sm">
                  <option value="">Tất cả môn</option>
                  <option value="MATH">Toán</option>
                  <option value="PHYSICS">Lý</option>
                  <option value="CHEMISTRY">Hóa</option>
                </select>
              </div>
              {weeklyStatus === null ? (
                <div className="flex h-[320px] items-center justify-center text-sm text-[#8a8178]">Đang tải...</div>
              ) : weeklyData.length === 0 ? (
                <div className="flex h-[320px] items-center justify-center text-sm text-[#8a8178]">Chưa có dữ liệu.</div>
              ) : (
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={weeklyData} margin={{ left: 8, right: 16, top: 16, bottom: 46 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e8e2d9" vertical={false} />
                    <XAxis dataKey="label" tick={{ fill: "#4f4943", fontSize: 11 }} axisLine={{ stroke: "#c3c2b7" }} interval={1} angle={-25} textAnchor="end" height={58} />
                    <YAxis allowDecimals={false} tick={{ fill: "#8a8178", fontSize: 12 }} axisLine={{ stroke: "#c3c2b7" }} />
                    <Tooltip />
                    <Legend verticalAlign="bottom" height={28} formatter={(value: string) => <span className="text-xs text-[#4f4943]">{value}</span>} />
                    <Bar dataKey="notSubmitted" name="Chưa nộp" stackId="status" fill={REJECTED_COLOR} />
                    <Bar dataKey="submitted" name="Đã nộp" stackId="status" fill={PENDING_COLOR} />
                    <Bar dataKey="approved" name="Đã duyệt" stackId="status" fill={APPROVED_COLOR} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="rounded-lg border border-[#d8d1c9] bg-[#fbfaf8] p-4 shadow-[0_2px_8px_rgba(43,41,38,0.04)]">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-sm font-semibold text-[#2b2926]">Quản lý tài khoản</h2>
                <select value={accountSubject} onChange={(e) => setAccountSubject(e.target.value as Subject | "")} className="rounded-md border border-[#d8d1c9] bg-white px-2 py-1 text-sm">
                  <option value="">Tất cả môn</option>
                  <option value="MATH">Toán</option>
                  <option value="PHYSICS">Lý</option>
                  <option value="CHEMISTRY">Hóa</option>
                </select>
              </div>
              {accounts === null ? (
                <div className="flex h-[320px] items-center justify-center text-sm text-[#8a8178]">Đang tải...</div>
              ) : accountData.length === 0 ? (
                <div className="flex h-[320px] items-center justify-center text-sm text-[#8a8178]">Chưa có dữ liệu.</div>
              ) : (
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={accountData} layout="vertical" margin={{ left: 24, right: 16, top: 16, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e8e2d9" horizontal={false} />
                    <XAxis type="number" allowDecimals={false} tick={{ fill: "#8a8178", fontSize: 12 }} axisLine={{ stroke: "#c3c2b7" }} />
                    <YAxis type="category" dataKey="label" width={82} tick={{ fill: "#4f4943", fontSize: 12 }} axisLine={{ stroke: "#c3c2b7" }} />
                    <Tooltip />
                    <Legend verticalAlign="bottom" height={28} formatter={(value: string) => <span className="text-xs text-[#4f4943]">{value}</span>} />
                    <Bar dataKey="active" name="Active" stackId="account" fill={APPROVED_COLOR} radius={[0, 0, 0, 0]} />
                    <Bar dataKey="inactive" name="Inactive" stackId="account" fill={INACTIVE_COLOR} radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function StatisticsScreen() {
  const { user } = useAuth();
  const roles = user?.roles?.length ? user.roles : user?.role ? [user.role] : [];
  return roles.includes("PRINCIPAL") ? <PrincipalStatisticsScreen /> : <ModeratorStatisticsScreen />;
}

export default function Page() {
  return (
    <RouteGuard pathname="/statistics">
      <StatisticsScreen />
    </RouteGuard>
  );
}
