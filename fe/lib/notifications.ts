export type NotificationSummary = {
  id: string;
  title: string;
  content: string;
  subject: string;
  senderName: string | null;
  createdAt: string;
  targetType: string | null;
  targetUrl: string | null;
  read: boolean;
};

export type NotificationPage = {
  items: NotificationSummary[];
  page: number;
  size: number;
  total: number;
  unreadCount: number;
};

type AuthFetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

async function unpack<T>(res: Response): Promise<T> {
  if (res.status === 204) return null as T;
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { message?: string } | null;
    throw new Error(body?.message ?? "Không thể xử lý thông báo.");
  }
  return res.json() as Promise<T>;
}

export function listNotifications(
  authFetch: AuthFetch,
  params: { unread?: boolean; page?: number; size?: number } = {},
): Promise<NotificationPage> {
  const query = new URLSearchParams();
  if (params.unread) query.set("unread", "true");
  query.set("page", String(params.page ?? 0));
  query.set("size", String(params.size ?? 20));
  return authFetch(`/api/notifications?${query}`).then(unpack<NotificationPage>);
}

export function getUnreadCount(authFetch: AuthFetch): Promise<{ count: number }> {
  return authFetch("/api/notifications/unread-count").then(unpack<{ count: number }>);
}

export function createNotification(
  authFetch: AuthFetch,
  body: { title: string; content: string },
): Promise<NotificationSummary & { recipientCount: number }> {
  return authFetch("/api/notifications", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).then(unpack<NotificationSummary & { recipientCount: number }>);
}

export function markNotificationRead(authFetch: AuthFetch, id: string): Promise<void> {
  return authFetch(`/api/notifications/${id}/read`, { method: "PATCH" }).then(unpack<void>);
}

export function markAllNotificationsRead(authFetch: AuthFetch): Promise<void> {
  return authFetch("/api/notifications/read-all", { method: "POST" }).then(unpack<void>);
}
