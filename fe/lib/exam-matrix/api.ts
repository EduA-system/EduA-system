import type { ExamMatrixWorkspace, ExamScope, GenerateExamMatrixPayload } from "./types";

type AuthFetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

async function post<T>(authFetch: AuthFetch, path: string, body: unknown): Promise<T> {
  const clientRequestId = typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `exam-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const started = performance.now();
  console.info("[exam-api] REQUEST_START", { clientRequestId, path });
  const response = await authFetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json", "X-Client-Request-ID": clientRequestId },
    body: JSON.stringify(body),
  });
  const serverRequestId = response.headers.get("X-Exam-Request-ID") ?? clientRequestId;
  if (!response.ok) {
    const rawBody = await response.text();
    let error: { message?: string; requestId?: string } | null = null;
    try { error = JSON.parse(rawBody) as { message?: string; requestId?: string }; } catch { /* keep raw body for diagnostics */ }
    const requestId = error?.requestId ?? serverRequestId;
    console.error("[exam-api] REQUEST_FAILED", {
      clientRequestId, requestId, path, status: response.status,
      durationMs: Math.round(performance.now() - started), responseBody: rawBody,
    });
    throw new Error(`[${requestId}] ${error?.message ?? `HTTP ${response.status}: ${rawBody || "Không có response body"}`}`);
  }
  const result = await response.json() as T;
  console.info("[exam-api] REQUEST_SUCCESS", {
    clientRequestId, requestId: serverRequestId, path, status: response.status,
    durationMs: Math.round(performance.now() - started),
  });
  return result;
}

export function previewExamScope(authFetch: AuthFetch, subject: string, grade: number, examType: string) {
  return post<ExamScope>(authFetch, "/api/exams/scope-preview", { subject, grade, examType });
}

export function generateExamMatrix(authFetch: AuthFetch, payload: GenerateExamMatrixPayload) {
  return post<ExamMatrixWorkspace>(authFetch, "/api/exams/matrix-specification/generate", payload);
}
