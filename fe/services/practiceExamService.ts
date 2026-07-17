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

async function request<T>(path: string, payload: PracticeExamRequest, fetcher: RequestFetcher = fetch): Promise<T> {
  const response = await fetcher(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  if (response.ok) return response.json() as Promise<T>;
  const error = await response.json().catch(() => null) as { message?: string } | null;
  throw new Error(error?.message ?? `Yêu cầu thất bại (HTTP ${response.status}).`);
}

export function validatePracticeExam(config: PracticeExamRequest, fetcher?: RequestFetcher) { return request<PracticeExamValidation>("/api/practice-exams/validate-configuration", config, fetcher); }
export function generatePracticeExam(config: PracticeExamRequest, fetcher?: RequestFetcher) { return request<PracticeExam>("/api/practice-exams/generate", config, fetcher); }

const SESSION_KEY = "edua:practiceExamDraft";
export function storePracticeExam(exam: PracticeExam) { sessionStorage.setItem(SESSION_KEY, JSON.stringify(exam)); }
export function readPracticeExam(): PracticeExam | null { try { const value = sessionStorage.getItem(SESSION_KEY); return value ? JSON.parse(value) as PracticeExam : null; } catch { return null; } }
