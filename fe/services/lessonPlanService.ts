import type { Objectives } from "@/data/lessonPlan5512Mock";

// API client cho luồng tạo giáo án 5512. Gọi qua same-origin `/api/*`
// (proxy tới backend cấu hình ở next.config.ts) nên không vướng CORS.

// ---- Catalog SGK (GET /api/textbooks) -----------------------------------
// Lưu ý: backend serialize `code` thành field `id` trong JSON.
export interface CatalogLesson {
  id: string;
  name: string;
  page: number | null;
}

export interface CatalogChapter {
  id: string;
  name: string;
  lessons: CatalogLesson[];
}

export interface CatalogBook {
  id: string;
  name: string;
  grade: number;
  source?: string;
  chapters: CatalogChapter[];
}

export interface TextbookCatalog {
  books: CatalogBook[];
}

// ---- Generate (POST /api/lesson-plans/generate) -------------------------
export interface GenerateLessonPlanRequest {
  bookId: string;
  chapterId: string;
  lessonId: string;
  userPrompt?: string;
}

/** Phản hồi hiện tại của BE: mới có title + phần I. Mục tiêu. */
export interface GeneratedLessonPlan {
  title: string | null;
  objectives: Objectives;
}

export async function fetchTextbookCatalog(): Promise<TextbookCatalog> {
  const res = await fetch("/api/textbooks", { headers: { Accept: "application/json" } });
  if (!res.ok) {
    throw new Error(`Không tải được danh mục SGK (HTTP ${res.status}).`);
  }
  return res.json();
}

export async function generateLessonPlan(
  req: GenerateLessonPlanRequest,
): Promise<GeneratedLessonPlan> {
  const res = await fetch("/api/lesson-plans/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
  if (!res.ok) {
    let message = `Tạo giáo án thất bại (HTTP ${res.status}).`;
    try {
      const body = (await res.json()) as { message?: string };
      if (body?.message) message = body.message;
    } catch {
      // body không phải JSON — giữ message mặc định.
    }
    throw new Error(message);
  }
  return res.json();
}

// ---- Bàn giao giữa /lesson-create và /lesson-edit -----------------------
// Chưa lưu DB nên truyền giáo án vừa sinh qua sessionStorage.
const STORAGE_KEY = "edua:generatedLessonPlan";

export function storeGeneratedLessonPlan(plan: GeneratedLessonPlan): void {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(plan));
}

export function readGeneratedLessonPlan(): GeneratedLessonPlan | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as GeneratedLessonPlan) : null;
  } catch {
    return null;
  }
}
