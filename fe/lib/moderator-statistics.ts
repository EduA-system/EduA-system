export type TeacherOverdueCount = {
  teacherId: string;
  teacherName: string | null;
  overdueCount: number;
};

export type OverdueByTeacher = { items: TeacherOverdueCount[] };

export type ReviewStatusCounts = { approved: number; rejected: number };

type AuthFetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

async function unpack<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { message?: string } | null;
    throw new Error(body?.message ?? "Không thể tải dữ liệu thống kê.");
  }
  return res.json() as Promise<T>;
}

/** Bar chart — task trễ hạn theo GV, filter theo tuần. weekStartDate: bất kỳ ngày nào trong tuần (server tự làm tròn về Thứ Hai). */
export function getOverdueByTeacherWeek(authFetch: AuthFetch, weekStartDate?: string) {
  const params = new URLSearchParams();
  if (weekStartDate) params.set("weekStartDate", weekStartDate);
  const qs = params.toString();
  return authFetch(`/api/moderator/statistics/overdue-by-teacher/week${qs ? `?${qs}` : ""}`).then(unpack<OverdueByTeacher>);
}

/** Bar chart — task trễ hạn theo GV, filter theo quý (cộng dồn). */
export function getOverdueByTeacherQuarter(authFetch: AuthFetch, year?: number, quarter?: number) {
  const params = new URLSearchParams();
  if (year) params.set("year", String(year));
  if (quarter) params.set("quarter", String(quarter));
  const qs = params.toString();
  return authFetch(`/api/moderator/statistics/overdue-by-teacher/quarter${qs ? `?${qs}` : ""}`).then(unpack<OverdueByTeacher>);
}

/** Donut — Duyệt/Từ chối Weekly Task, tổng từ trước đến nay. */
export function getWeeklyTaskReviewSummary(authFetch: AuthFetch) {
  return authFetch("/api/moderator/statistics/weekly-task-review-summary").then(unpack<ReviewStatusCounts>);
}

/** Donut — Duyệt/Từ chối Community Hub, tổng từ trước đến nay. */
export function getLibraryContentReviewSummary(authFetch: AuthFetch) {
  return authFetch("/api/moderator/statistics/library-content-review-summary").then(unpack<ReviewStatusCounts>);
}
