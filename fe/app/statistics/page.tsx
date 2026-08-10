"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CalendarClock, CheckCircle2, ChevronLeft, ChevronRight } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Sidebar } from "@/components/layout/Sidebar";
import { useAuth } from "@/lib/auth/AuthContext";
import { RouteGuard } from "@/lib/auth/RouteGuard";
import {
  getLibraryContentReviewSummary,
  getOverdueByTeacherQuarter,
  getOverdueByTeacherWeek,
  getWeeklyTaskReviewSummary,
  type OverdueByTeacher,
  type ReviewStatusCounts,
} from "@/lib/moderator-statistics";

const APPROVED_COLOR = "#5a7a4a";
const REJECTED_COLOR = "#c2483c";
const BAR_COLOR = "#d97757";

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

function StatisticsScreen() {
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

  return (
    <main className="min-h-screen bg-[#f7f5f2] text-[#2b2926]">
      <div className="flex min-h-screen">
        <Sidebar activeHref="/statistics" />
        <section className="min-w-0 flex-1 px-5 py-6 sm:px-8 lg:px-10">
          <header className="border-b border-[#e4ddd4] pb-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-[#d97757]">Quản trị</p>
            <h1 className="mt-1 text-[30px] font-semibold leading-tight">Thống kê</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#6b6b6b]">
              Theo dõi tiến độ nộp giáo án theo tuần và tỉ lệ duyệt nội dung của giáo viên cùng môn.
            </p>
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

export default function Page() {
  return (
    <RouteGuard pathname="/statistics">
      <StatisticsScreen />
    </RouteGuard>
  );
}
