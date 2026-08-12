// Blog calls the backend through the same-origin /api proxy.
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

export type Summary = { id: string; title: string; subject: string; authorId: string; authorName: string; authorAvatarUrl: string | null; createdAt: string; commentCount: number; excerpt: string; thumbnailUrl: string | null };
export type Comment = { id: string; content: string; authorId: string; parentCommentId: string | null; authorName: string; authorAvatarUrl: string | null; createdAt: string; hidden?: boolean };
export type Detail = { id: string; title: string; content: string; thumbnailUrl: string | null; subject: string; authorId: string; authorName: string; authorAvatarUrl: string | null; createdAt: string; comments: Comment[] };

// ---- gọi BE: thêm Bearer + JSON, ném lỗi kèm message từ BE ----
export type AuthFetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export async function api<T>(authFetch: AuthFetch, path: string, init: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = { ...(init.headers as Record<string, string>) };
  if (init.body) headers["Content-Type"] = "application/json";
  const res = await authFetch(`/api${path}`, { ...init, headers });
  if (res.status === 204) return null as T;
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error((data as { message?: string })?.message ?? res.statusText);
  return data as T;
}

export async function uploadFile(authFetch: AuthFetch, file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await authFetch(`/api/uploads`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error((data as { message?: string })?.message ?? "Upload thất bại");
  }
  const data = await res.json();
  return data.url as string;
}

/** Tạo ảnh đại diện WebP nhẹ hơn trước khi upload (cạnh dài tối đa 1280 px). */
export async function optimizeBlogCover(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || typeof document === "undefined") return file;
  const sourceUrl = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = sourceUrl;
    await image.decode();
    const scale = Math.min(1, 1280 / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    canvas.getContext("2d")?.drawImage(image, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.78));
    if (!blob) return file;
    return new File([blob], `${file.name.replace(/\.[^.]+$/, "")}.webp`, { type: "image/webp" });
  } catch {
    return file;
  } finally {
    URL.revokeObjectURL(sourceUrl);
  }
}
