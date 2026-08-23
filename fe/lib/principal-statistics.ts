import type { ExportPdfResponse } from "@/lib/document-export";

export type Subject = "MATH" | "PHYSICS" | "CHEMISTRY";
export type Role = "TEACHER" | "MODERATOR" | "IT_STAFF" | "STUDENT";

export type AiContentTrendBucket = {
  month: string;
  monthStartDate: string;
  lessonPlan: number;
  slide: number;
  test: number;
  simulation: number;
};

export type AiContentTrend = { items: AiContentTrendBucket[] };

export type SubjectContentCount = {
  subject: Subject;
  lessonPlan: number;
  slide: number;
  test: number;
  simulation: number;
};

export type ContentBySubject = { items: SubjectContentCount[] };

export type WeeklyTaskStatusBucket = {
  weekStartDate: string;
  notSubmitted: number;
  submitted: number;
  approved: number;
};

export type WeeklyTaskStatus = { items: WeeklyTaskStatusBucket[] };

export type CommunityHubReview = {
  pending: number;
  approved: number;
  rejected: number;
};

export type AccountRoleStatus = {
  role: Role;
  active: number;
  inactive: number;
};

export type AccountsByRole = { items: AccountRoleStatus[] };

type AuthFetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

async function unpack<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { message?: string } | null;
    throw new Error(body?.message ?? "Không thể tải dữ liệu thống kê.");
  }
  return res.json() as Promise<T>;
}

export function getAiContentTrend(authFetch: AuthFetch, months = 6) {
  return authFetch(`/api/principal/statistics/ai-content-trend?months=${months}`).then(unpack<AiContentTrend>);
}

export function getContentBySubject(authFetch: AuthFetch) {
  return authFetch("/api/principal/statistics/content-by-subject").then(unpack<ContentBySubject>);
}

export function getWeeklyTaskStatus(authFetch: AuthFetch, from?: string, to?: string, subject?: Subject | "") {
  const params = new URLSearchParams();
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  if (subject) params.set("subject", subject);
  const qs = params.toString();
  return authFetch(`/api/principal/statistics/weekly-task-status${qs ? `?${qs}` : ""}`).then(unpack<WeeklyTaskStatus>);
}

export function getCommunityHubReview(authFetch: AuthFetch) {
  return authFetch("/api/principal/statistics/community-hub-review").then(unpack<CommunityHubReview>);
}

export function getAccountsByRole(authFetch: AuthFetch, subject?: Subject | "") {
  const qs = subject ? `?subject=${subject}` : "";
  return authFetch(`/api/principal/statistics/accounts-by-role${qs}`).then(unpack<AccountsByRole>);
}

export function exportPrincipalStatisticsReport(authFetch: AuthFetch, weeklySubject?: Subject | "", accountSubject?: Subject | "") {
  const params = new URLSearchParams();
  if (weeklySubject) params.set("weeklySubject", weeklySubject);
  if (accountSubject) params.set("accountSubject", accountSubject);
  const qs = params.toString();
  return authFetch(`/api/principal/statistics/report/pdf${qs ? `?${qs}` : ""}`).then(unpack<ExportPdfResponse>);
}
