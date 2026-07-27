export type ActivityLogCategory = "AUTH" | "ACCOUNT" | "MODERATION" | "CONFIG";

export type ActivityLogAction =
  | "LOGIN"
  | "LOGOUT"
  | "GRANT_MODERATOR"
  | "REPLACE_MODERATOR"
  | "REACTIVATE_MODERATOR"
  | "GRANT_IT_STAFF"
  | "REVOKE_IT_STAFF"
  | "REACTIVATE_IT_STAFF"
  | "GRANT_TEACHER"
  | "REVOKE_TEACHER"
  | "REACTIVATE_TEACHER"
  | "APPROVE_LIBRARY_CONTENT"
  | "REJECT_LIBRARY_CONTENT"
  | "REMOVE_BLOG_POST"
  | "APPROVE_WEEKLY_TASK"
  | "REJECT_WEEKLY_TASK"
  | "UPDATE_SYSTEM_PROMPT";

export type ActivityLogSummary = {
  id: string;
  actorId: string;
  actorName: string | null;
  actorRole: string | null;
  category: ActivityLogCategory;
  action: ActivityLogAction;
  targetType: string | null;
  targetId: string | null;
  metadata: string | null;
  createdAt: string;
};

export type ActivityLogPage = {
  items: ActivityLogSummary[];
  page: number;
  size: number;
  total: number;
};

type AuthFetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

async function unpack<T>(res: Response): Promise<T> {
  if (res.status === 204) return null as T;
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { message?: string } | null;
    throw new Error(body?.message ?? "Không thể tải nhật ký hoạt động.");
  }
  return res.json() as Promise<T>;
}

export function listActivityLogs(
  authFetch: AuthFetch,
  params: {
    actorId?: string;
    category?: ActivityLogCategory;
    from?: string;
    to?: string;
    page?: number;
    size?: number;
  } = {},
): Promise<ActivityLogPage> {
  const query = new URLSearchParams();
  if (params.actorId) query.set("actorId", params.actorId);
  if (params.category) query.set("category", params.category);
  if (params.from) query.set("from", params.from);
  if (params.to) query.set("to", params.to);
  query.set("page", String(params.page ?? 0));
  query.set("size", String(params.size ?? 20));
  return authFetch(`/api/it-staff/activity-log?${query}`).then(unpack<ActivityLogPage>);
}
