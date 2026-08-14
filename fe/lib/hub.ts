import type { LibraryContent, LibrarySubject, LibraryType } from "@/lib/library";

export type HubContentStatus = "PRIVATE" | "SUBMITTED" | "APPROVED" | "REJECTED";

export type HubComment = { id: string; content: string; authorId: string; parentCommentId: string | null; authorName: string | null; createdAt: string; updatedAt: string };

export type HubContentSummary = {
  id: string;
  type: LibraryType;
  title: string;
  subject: LibrarySubject | null;
  ownerId: string;
  ownerName: string | null;
  thumbnailUrl: string | null;
  reviewedAt: string | null;
  commentCount: number;
};

export type HubContentDetail = {
  id: string;
  type: LibraryType;
  title: string;
  subject: LibrarySubject | null;
  ownerId: string;
  ownerName: string | null;
  payload: unknown;
  thumbnailUrl: string | null;
  reviewedAt: string | null;
  comments: HubComment[];
};

export type HubPage<T> = { items: T[]; page: number; size: number; total: number };

type AuthFetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export const HUB_CONTENT_COMMENTS_CHANGED_EVENT = "hub-content-comments-changed";

export function notifyHubContentCommentsChanged() {
  window.dispatchEvent(new Event(HUB_CONTENT_COMMENTS_CHANGED_EVENT));
}

async function unpack<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { message?: string } | null;
    throw new Error(body?.message ?? "Không thể xử lý yêu cầu Community Hub.");
  }
  return res.json() as Promise<T>;
}

export function listHubContents(authFetch: AuthFetch, params: URLSearchParams) {
  return authFetch(`/api/hub/contents?${params}`, { cache: "no-store" }).then(unpack<HubPage<HubContentSummary>>);
}

export function getHubContent(authFetch: AuthFetch, id: string) {
  return authFetch(`/api/hub/contents/${id}`).then(unpack<HubContentDetail>);
}

export function customizeHubContent(authFetch: AuthFetch, id: string) {
  return authFetch(`/api/hub/contents/${id}/customize`, { method: "POST" }).then(unpack<LibraryContent>);
}

export async function deleteHubContent(authFetch: AuthFetch, id: string) {
  const res = await authFetch(`/api/hub/contents/${id}`, { method: "DELETE" });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { message?: string } | null;
    throw new Error(body?.message ?? "Không thể xóa bài viết.");
  }
}

export function createHubComment(authFetch: AuthFetch, contentId: string, content: string, parentCommentId?: string | null) {
  return authFetch(`/api/hub/contents/${contentId}/comments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content, parentCommentId: parentCommentId ?? null }),
  }).then(unpack<HubComment>);
}

export function updateHubComment(authFetch: AuthFetch, commentId: string, content: string) {
  return authFetch(`/api/hub/comments/${commentId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content }),
  }).then(unpack<HubComment>);
}

export async function deleteHubComment(authFetch: AuthFetch, commentId: string) {
  const res = await authFetch(`/api/hub/comments/${commentId}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Không thể xóa bình luận.");
}

export async function hideHubComment(authFetch: AuthFetch, commentId: string) {
  const res = await authFetch(`/api/hub/comments/${commentId}/hide`, { method: "POST" });
  if (!res.ok) throw new Error("Không thể ẩn bình luận.");
}

export function listModerationQueue(authFetch: AuthFetch, params: URLSearchParams) {
  return authFetch(`/api/library/contents/moderation-queue?${params}`).then(unpack<HubPage<LibraryContent>>);
}

export function getModerationContent(authFetch: AuthFetch, id: string) {
  return authFetch(`/api/library/contents/moderation-queue/${id}`).then(unpack<LibraryContent>);
}

export function approveContent(authFetch: AuthFetch, id: string) {
  return authFetch(`/api/library/contents/${id}/approval`, { method: "POST" }).then(unpack<LibraryContent>);
}

export function rejectContent(authFetch: AuthFetch, id: string, reason: string) {
  return authFetch(`/api/library/contents/${id}/rejection`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reason }),
  }).then(unpack<LibraryContent>);
}
