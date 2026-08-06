import type { LibrarySubject } from "@/lib/library";

export type WeeklyTaskReviewStatus = "NOT_SUBMITTED" | "SUBMITTED" | "APPROVED" | "REJECTED";

/** Khối — mỗi Weekly Task thuộc đúng 1 khối (BR-51). */
export type WeeklyTaskGrade = 10 | 11 | 12;

export type WeeklyTaskSummary = {
  id: string;
  teacherId: string;
  teacherName: string | null;
  subject: LibrarySubject;
  grade: WeeklyTaskGrade;
  weekStartDate: string;
  scopeDescription: string;
  /** Chương/Bài chọn từ danh mục SGK (BR-53) — không phải mô tả tự do. */
  textbookCode: string;
  chapterCode: string;
  chapterName: string;
  lessonCode: string;
  lessonName: string;
  deadline: string;
  reviewStatus: WeeklyTaskReviewStatus;
  submittedAt: string | null;
  createdAt: string;
};

export type WeeklyTaskDetail = {
  id: string;
  moderatorId: string;
  moderatorName: string | null;
  subject: LibrarySubject;
  grade: WeeklyTaskGrade;
  teacherId: string;
  teacherName: string | null;
  weekStartDate: string;
  scopeDescription: string;
  textbookCode: string;
  chapterCode: string;
  chapterName: string;
  lessonCode: string;
  lessonName: string;
  deadline: string;
  reviewStatus: WeeklyTaskReviewStatus;
  sourceLibraryContentId: string | null;
  sourceLibraryContentTitle: string | null;
  sourceLibraryContentPayload: unknown | null;
  sourceDocumentUrl: string | null;
  sourceDocumentName: string | null;
  submittedAt: string | null;
  reviewedBy: string | null;
  reviewedByName: string | null;
  reviewedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
};

export type WeeklyTaskWeek = { weekStartDate: string; tasks: WeeklyTaskSummary[] };
export type WeeklyTaskSchedule = { weeks: WeeklyTaskWeek[] };
export type WeeklyTaskPage = { items: WeeklyTaskSummary[]; page: number; size: number; total: number };

export type WeeklyTaskBulkResult = { created: WeeklyTaskSummary[]; teacherCount: number; lessonCount: number };

type AuthFetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

async function unpack<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { message?: string } | null;
    throw new Error(body?.message ?? "Không thể xử lý yêu cầu nhiệm vụ tuần.");
  }
  return res.json() as Promise<T>;
}

export function getWeeklySchedule(authFetch: AuthFetch, from?: string, to?: string, grade?: WeeklyTaskGrade) {
  const params = new URLSearchParams();
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  if (grade) params.set("grade", String(grade));
  const qs = params.toString();
  return authFetch(`/api/weekly-tasks${qs ? `?${qs}` : ""}`).then(unpack<WeeklyTaskSchedule>);
}

export function getWeeklyTask(authFetch: AuthFetch, id: string) {
  return authFetch(`/api/weekly-tasks/${id}`).then(unpack<WeeklyTaskDetail>);
}

export function createWeeklyTask(
  authFetch: AuthFetch,
  body: {
    teacherId: string;
    weekStartDate: string;
    grade: WeeklyTaskGrade;
    scopeDescription: string;
    textbookCode: string;
    chapterCode: string;
    lessonCode: string;
  },
) {
  return authFetch("/api/weekly-tasks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).then(unpack<WeeklyTaskDetail>);
}

export function bulkCreateWeeklyTasks(
  authFetch: AuthFetch,
  body: {
    weekStartDate: string;
    grade: WeeklyTaskGrade;
    textbookCode: string;
    lessons: { scopeDescription: string; chapterCode: string; lessonCode: string }[];
  },
) {
  return authFetch("/api/weekly-tasks/bulk", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).then(unpack<WeeklyTaskBulkResult>);
}

export function updateWeeklyTask(
  authFetch: AuthFetch,
  id: string,
  body: {
    teacherId: string;
    weekStartDate: string;
    scopeDescription: string;
    textbookCode: string;
    chapterCode: string;
    lessonCode: string;
  },
) {
  return authFetch(`/api/weekly-tasks/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).then(unpack<WeeklyTaskDetail>);
}

export function submitWeeklyTask(
  authFetch: AuthFetch,
  id: string,
  body: { libraryContentId?: string; documentUrl?: string; documentName?: string },
) {
  return authFetch(`/api/weekly-tasks/${id}/submission`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).then(unpack<WeeklyTaskDetail>);
}

export function unsubmitWeeklyTask(authFetch: AuthFetch, id: string) {
  return authFetch(`/api/weekly-tasks/${id}/submission`, { method: "DELETE" }).then(unpack<WeeklyTaskDetail>);
}

export function listWeeklyTaskModerationQueue(authFetch: AuthFetch, params: URLSearchParams) {
  return authFetch(`/api/weekly-tasks/moderation-queue?${params}`).then(unpack<WeeklyTaskPage>);
}

export function approveWeeklyTask(authFetch: AuthFetch, id: string) {
  return authFetch(`/api/weekly-tasks/${id}/approval`, { method: "POST" }).then(unpack<WeeklyTaskDetail>);
}

export function rejectWeeklyTask(authFetch: AuthFetch, id: string, reason: string) {
  return authFetch(`/api/weekly-tasks/${id}/rejection`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reason }),
  }).then(unpack<WeeklyTaskDetail>);
}
