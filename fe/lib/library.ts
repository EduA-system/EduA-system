export type LibraryType = "LESSON_PLAN" | "SLIDE_DECK" | "TEST" | "SIMULATION";
export type LibrarySubject = "MATH" | "CHEMISTRY" | "PHYSICS";
export type LibraryContent = {
  id: string;
  type: LibraryType;
  title: string;
  subject: LibrarySubject | null;
  grade: number | null;
  status: "PRIVATE";
  thumbnailUrl: string | null;
  createdAt: string;
  updatedAt: string;
  payload?: unknown;
};
export type LibraryPage = {
  items: LibraryContent[];
  page: number;
  size: number;
  total: number;
};
async function unpack<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const b = (await res.json().catch(() => null)) as {
      message?: string;
    } | null;
    throw new Error(b?.message ?? "Không thể xử lý thư viện.");
  }
  return res.json() as Promise<T>;
}
export function listLibrary(
  authFetch: (i: RequestInfo | URL, init?: RequestInit) => Promise<Response>,
  params: URLSearchParams,
) {
  return authFetch(`/api/library/contents?${params}`).then(unpack<LibraryPage>);
}
export function getLibraryContent(
  authFetch: (i: RequestInfo | URL, init?: RequestInit) => Promise<Response>,
  id: string,
) {
  return authFetch(`/api/library/contents/${id}`).then(unpack<LibraryContent>);
}
export function createLibraryContent(
  authFetch: (i: RequestInfo | URL, init?: RequestInit) => Promise<Response>,
  body: {
    type: LibraryType;
    title: string;
    subject?: LibrarySubject;
    grade?: number;
    payload?: unknown;
  },
) {
  return authFetch("/api/library/contents", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).then(unpack<LibraryContent>);
}
export function updateLibraryContent(
  authFetch: (i: RequestInfo | URL, init?: RequestInit) => Promise<Response>,
  id: string,
  body: { title?: string; subject?: LibrarySubject; grade?: number; payload?: unknown },
) {
  return authFetch(`/api/library/contents/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).then(unpack<LibraryContent>);
}
export async function deleteLibraryContent(
  authFetch: (i: RequestInfo | URL, init?: RequestInit) => Promise<Response>,
  id: string,
) {
  const res = await authFetch(`/api/library/contents/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Không thể xóa nội dung.");
}
