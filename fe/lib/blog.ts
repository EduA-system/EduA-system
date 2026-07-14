// Client ID public (giống app/auth). BE gọi qua proxy /api/* (next.config rewrites) → same-origin.
export const GOOGLE_CLIENT_ID =
  "98078357098-pknisf1ub7kg5nop658jpeo31clhid2f.apps.googleusercontent.com";
export const TOKEN_KEY = "edua_access_token";
export const SUBJECTS = ["MATH", "CHEMISTRY", "PHYSICS"] as const;
export type SubjectValue = (typeof SUBJECTS)[number];

export const SUBJECT_LABELS: Record<SubjectValue, string> = {
  MATH: "Toán học",
  CHEMISTRY: "Hóa học",
  PHYSICS: "Vật lý",
};

export const SUBJECT_BADGE_CLASSES: Record<SubjectValue, string> = {
  MATH: "bg-[#ecfdf5] text-[#047857]",
  CHEMISTRY: "bg-[#fffbeb] text-[#b45309]",
  PHYSICS: "bg-[#eef2ff] text-[#4338ca]",
};

export function subjectLabel(subject: string): string {
  return SUBJECT_LABELS[subject as SubjectValue] ?? subject;
}

export function subjectBadgeClasses(subject: string): string {
  return SUBJECT_BADGE_CLASSES[subject as SubjectValue] ?? "bg-[#f0f0ee] text-[#4a4b5e]";
}

const AVATAR_COLORS = [
  "#4f46e5", // indigo
  "#0d9488", // teal
  "#7c3aed", // violet
  "#059669", // emerald
  "#b45309", // amber
  "#be185d", // pink
];

export function avatarColorFor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[parts.length - 2][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "Vừa xong";
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} ngày trước`;
  return new Date(iso).toLocaleDateString("vi");
}

export type User = { id: string; email: string; fullName: string | null; role: string; subject: string | null };
export type Summary = { id: string; title: string; subject: string; authorId: string; authorName: string; createdAt: string; commentCount: number; excerpt: string; thumbnailUrl: string | null };
export type Comment = { id: string; content: string; authorId: string; authorName: string; createdAt: string };
export type Detail = { id: string; title: string; content: string; subject: string; authorId: string; authorName: string; createdAt: string; comments: Comment[] };

// ---- gọi BE: thêm Bearer + JSON, ném lỗi kèm message từ BE ----
export async function api<T>(path: string, token: string | null, init: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = { ...(init.headers as Record<string, string>) };
  if (init.body) headers["Content-Type"] = "application/json";
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`/api${path}`, { ...init, headers, credentials: "include" });
  if (res.status === 204) return null as T;
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error((data as { message?: string })?.message ?? res.statusText);
  return data as T;
}

export async function uploadFile(token: string, file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(`/api/uploads`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
    credentials: "include",
  });
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error((data as { message?: string })?.message ?? "Upload thất bại");
  }
  const data = await res.json();
  return data.url as string;
}

export interface GIS {
  accounts: { id: {
    initialize: (c: { client_id: string; callback: (r: { credential: string }) => void }) => void;
    renderButton: (el: HTMLElement, o: { theme: string; size: string }) => void;
  } };
}

export function getGoogleIdentity(): GIS | undefined {
  return (window as Window & { google?: GIS }).google;
}
