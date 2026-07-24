export const CLASS_SUBJECTS = ["MATH", "CHEMISTRY", "PHYSICS"] as const;
export type ClassSubject = (typeof CLASS_SUBJECTS)[number];

export const CLASS_STATUSES = ["ACTIVE", "INACTIVE"] as const;
export type ClassStatus = (typeof CLASS_STATUSES)[number];

export const SUBJECT_LABELS: Record<ClassSubject, string> = {
  MATH: "Toán học",
  CHEMISTRY: "Hóa học",
  PHYSICS: "Vật lý",
};

export const STATUS_LABELS: Record<ClassStatus, string> = {
  ACTIVE: "Đang hoạt động",
  INACTIVE: "Đã lưu trữ",
};

export type AuthFetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export type ClassSummary = {
  id: string;
  name: string;
  subject: ClassSubject;
  grade: number;
  memberCount: number;
  status: ClassStatus;
  createdAt: string;
  updatedAt: string;
};

export type ClassDetail = ClassSummary & {
  description: string | null;
  ownerId: string;
  ownerName: string | null;
  resourceCount: number;
  assignmentCount: number;
  submissionCount: number;
};

export type ClassPage = {
  items: ClassSummary[];
  page: number;
  size: number;
  total: number;
};

export type ClassFilters = {
  q?: string;
  subject?: ClassSubject | "";
  grade?: number | "";
  status?: ClassStatus | "";
  page?: number;
  size?: number;
};

export type CreateClassPayload = {
  name: string;
  subject: ClassSubject;
  grade: number;
  description?: string | null;
};

export type UpdateClassPayload = Partial<CreateClassPayload>;

async function request<T>(authFetch: AuthFetch, path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !(init.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  const response = await authFetch(`/api/classes${path}`, { ...init, headers });
  if (response.status === 204) return null as T;
  const data = (await response.json().catch(() => null)) as { message?: string } | T | null;
  if (!response.ok) {
    throw new Error(
      data && typeof data === "object" && "message" in data
        ? String(data.message)
        : response.statusText || "Không thể hoàn tất yêu cầu.",
    );
  }
  return data as T;
}

export function subjectLabel(subject: string): string {
  return SUBJECT_LABELS[subject as ClassSubject] ?? subject;
}

export function statusLabel(status: string): string {
  return STATUS_LABELS[status as ClassStatus] ?? status;
}

export function isClassSubject(value: string | null | undefined): value is ClassSubject {
  return CLASS_SUBJECTS.includes(value as ClassSubject);
}

export async function listClasses(authFetch: AuthFetch, filters: ClassFilters = {}): Promise<ClassPage> {
  const params = new URLSearchParams();
  if (filters.q?.trim()) params.set("q", filters.q.trim());
  if (filters.subject) params.set("subject", filters.subject);
  if (filters.grade) params.set("grade", String(filters.grade));
  if (filters.status) params.set("status", filters.status);
  params.set("page", String(filters.page ?? 0));
  params.set("size", String(filters.size ?? 20));
  return request<ClassPage>(authFetch, `?${params.toString()}`);
}

export function createClass(authFetch: AuthFetch, payload: CreateClassPayload): Promise<ClassDetail> {
  return request<ClassDetail>(authFetch, "", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getClassDetail(authFetch: AuthFetch, id: string): Promise<ClassDetail> {
  return request<ClassDetail>(authFetch, `/${id}`);
}

export function updateClass(authFetch: AuthFetch, id: string, payload: UpdateClassPayload): Promise<ClassDetail> {
  return request<ClassDetail>(authFetch, `/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function updateClassStatus(authFetch: AuthFetch, id: string, status: ClassStatus): Promise<ClassDetail> {
  return request<ClassDetail>(authFetch, `/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}
