export type PracticeQuestionType = "MULTIPLE_CHOICE" | "TRUE_FALSE" | "SHORT_ANSWER" | "ESSAY";

export type PracticeExamRequest = {
  title: string;
  subject: "PHYSICS" | "CHEMISTRY" | "MATH";
  grade: number;
  durationMinutes: number;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  totalQuestionCount: number;
  totalScoreCentiPoints: number;
  teacherConfirmedWarning: boolean;
  questionTypes: { type: PracticeQuestionType; questionCount: number; totalScoreCentiPoints: number; itemsPerQuestion?: number }[];
  knowledgeScope: { bookCode: string; lessonRefs: { chapterCode: string; lessonCode: string }[] };
  objective?: string;
};

export type PracticeExam = {
  title: string;
  instructions: string;
  durationMinutes: number;
  totalScoreCentiPoints: number;
  questions: { order: number; type: PracticeQuestionType; content: string; options?: { key: string; content: string }[]; answer: Record<string, unknown>; explanation: string; scoreCentiPoints: number; rubric?: { criterion: string; scoreCentiPoints: number }[]; sourceLessonRefs: { bookCode: string; chapterCode: string; lessonCode: string }[] }[];
};

export type PracticeExamValidation = { status: "FEASIBLE" | "WARNING" | "INFEASIBLE"; estimatedMinutes: number; workingMinutes: number; overrunMinutes: number; message: string };

type RequestFetcher = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

async function request<T>(path: string, payload: unknown, fetcher: RequestFetcher = fetch): Promise<T> {
  const response = await fetcher(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  if (response.ok) return response.json() as Promise<T>;
  const error = await response.json().catch(() => null) as { message?: string } | null;
  throw new Error(error?.message ?? `Yêu cầu thất bại (HTTP ${response.status}).`);
}

export function validatePracticeExam(config: PracticeExamRequest, fetcher?: RequestFetcher) { return request<PracticeExamValidation>("/api/practice-exams/validate-configuration", config, fetcher); }

export type AuthFetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

// ---- Streaming (POST /api/practice-exams/generate-stream) ----------------
// Kickoff async: BE trả 202 ngay rồi đẩy tiến trình qua STOMP
// (/topic/practice-exam/{sessionId}). FE không đọc body — chỉ kiểm 2xx.
export async function startPracticeExamStream(
  session: { sessionId: string; request: PracticeExamRequest },
  authFetch: AuthFetch,
): Promise<void> {
  const res = await authFetch("/api/practice-exams/generate-stream", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(session),
  });
  if (!res.ok) {
    let message = `Khởi tạo bài tập thất bại (HTTP ${res.status}).`;
    try {
      const body = (await res.json()) as { message?: string };
      if (body?.message) message = body.message;
    } catch {
      // body không phải JSON — giữ message mặc định.
    }
    throw new Error(message);
  }
}

// ---- Sinh lại 1 câu (POST /api/practice-exams/regenerate-question) -------
export async function regenerateQuestion(
  req: { request: PracticeExamRequest; order: number; type: PracticeQuestionType; scoreCentiPoints: number },
  accessToken: string,
): Promise<PracticeExam["questions"][number]> {
  const res = await fetch("/api/practice-exams/regenerate-question", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(req),
  });
  if (!res.ok) {
    let message = `Sinh lại câu hỏi thất bại (HTTP ${res.status}).`;
    try {
      const body = (await res.json()) as { message?: string };
      if (body?.message) message = body.message;
    } catch {
      // body không phải JSON — giữ message mặc định.
    }
    throw new Error(message);
  }
  return res.json() as Promise<PracticeExam["questions"][number]>;
}

// ---- Bàn giao phiên giữa /exam-create-new và /exam-edit-new --------------
// Luồng streaming: /exam-create-new chỉ kickoff rồi truyền NGỮ CẢNH PHIÊN
// (sessionId + request + display) qua sessionStorage; /exam-edit-new dùng
// sessionId để mở STOMP và fill dần.
const EXAM_SESSION_KEY = "edua:practiceExamSession";

export type PracticeExamDisplayMetadata = {
  /** Tên giáo viên đặt để nhận diện trong thư viện; không gửi tới API tạo AI. */
  libraryTitle?: string;
  subject: string;
  grade: string;
  duration: number;
  difficulty: string;
};

export type PracticeExamSession = {
  sessionId: string;
  request: PracticeExamRequest;
  display: PracticeExamDisplayMetadata;
};

export function storePracticeExamSession(session: PracticeExamSession): void {
  sessionStorage.setItem(EXAM_SESSION_KEY, JSON.stringify(session));
}

export function readPracticeExamSession(): PracticeExamSession | null {
  try {
    const raw = sessionStorage.getItem(EXAM_SESSION_KEY);
    return raw ? (JSON.parse(raw) as PracticeExamSession) : null;
  } catch {
    return null;
  }
}

/** Xoá phiên sau khi đã tiêu thụ (tránh mở lại stream khi reload/quay lại). */
export function clearPracticeExamSession(): void {
  sessionStorage.removeItem(EXAM_SESSION_KEY);
}
