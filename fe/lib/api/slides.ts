import { BACKEND_HTTP_URL } from "@/lib/backend-url";
import { logSlideApi } from "@/lib/ws/slide-debug-log";
import type { SlideContentPlan } from "@/lib/slide-layout/types";

export type { ContentBlock, ContentRelationship, SlideContentPlan, SlideType } from "@/lib/slide-layout/types";

const BE = BACKEND_HTTP_URL;

type AuthFetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export type SlideItem = {
  id: string;
  title: string;
  pedagogicalRole: string;
  durationMinutes?: number;
  aiNote?: string;
  contentPlan: SlideContentPlan;
};

export type OutlinePart = { id: string; title: string; slides: SlideItem[]; sourceChunkIds?: string[] };
export type OutlineData = { lessonId: string; lessonTitle: string; parts: OutlinePart[] };

export type InlineActivity = {
  id: string;
  name: string;
  durationMinutes: number;
  goal: string;
  teacherActions: string;
  studentActions: string;
  evaluation: string;
};

export type InlineLessonPlan = {
  lessonTitle: string;
  gradeLevel: number;
  totalDurationMinutes: number;
  objectives: string[];
  teachingMethods: string[];
  activities: InlineActivity[];
  consolidation: string;
  homework: string;
};

export type GenerateOutlineResponse = {
  sessionId: string;
  topic: string;
  /** Topic STOMP để nhận nội dung từng phần (pha 2 expand). */
  outlineTopic: string;
  outline: OutlineData;
};

export function slideRoleLabel(slide: Pick<SlideItem, "pedagogicalRole" | "contentPlan">) {
  const role = slide.pedagogicalRole?.trim();
  switch (role) {
    case "hook":
      return "Mở bài";
    case "explain":
      return "Giải thích";
    case "derive":
      return "Suy luận";
    case "demonstrate":
      return "Minh họa";
    case "practice":
      return "Luyện tập";
    case "recap":
      return "Tổng kết";
    case "other":
      return "Khác";
    default:
      switch (slide.contentPlan.slideType) {
        case "intro":
          return "Mở đầu";
        case "concept":
          return "Khái niệm";
        case "formula":
          return "Công thức";
        case "exercise":
        case "quiz":
          return "Ví dụ";
        case "summary":
          return "Tổng kết";
        default:
          return role || slide.contentPlan.slideType || "Slide";
      }
  }
}

export function slideRoleTone(slide: Pick<SlideItem, "pedagogicalRole" | "contentPlan">) {
  switch (slide.pedagogicalRole) {
    case "hook":
      return "bg-blue-50 text-blue-600";
    case "explain":
      return "bg-purple-50 text-purple-600";
    case "derive":
      return "bg-orange-50 text-orange-600";
    case "demonstrate":
      return "bg-cyan-50 text-cyan-600";
    case "practice":
      return "bg-green-50 text-green-600";
    case "recap":
      return "bg-slate-100 text-slate-600";
    case "other":
      return "bg-slate-100 text-slate-600";
    default:
      switch (slide.contentPlan.slideType) {
        case "intro":
          return "bg-blue-50 text-blue-600";
        case "concept":
          return "bg-purple-50 text-purple-600";
        case "formula":
          return "bg-orange-50 text-orange-600";
        case "exercise":
        case "quiz":
          return "bg-green-50 text-green-600";
        case "summary":
          return "bg-slate-100 text-slate-600";
        default:
          return "bg-slate-100 text-slate-600";
      }
  }
}

export function validateContentPlan(plan: SlideContentPlan): string[] {
  const errors: string[] = [];
  if (!plan || !plan.slideType || !plan.headerMode) return ["Thiếu contentPlan hợp lệ."];
  if (!Array.isArray(plan.blocks) || plan.blocks.length === 0) errors.push("Slide phải có ít nhất một block nội dung.");
  const ids = new Set<string>();
  for (const block of plan.blocks ?? []) {
    if (!block.id.trim()) errors.push("Mỗi block phải có ID.");
    else if (ids.has(block.id)) errors.push(`ID block bị trùng: ${block.id}.`);
    ids.add(block.id);
    if (block.kind === "text" && !block.text.trim()) errors.push(`Block ${block.id} chưa có nội dung.`);
    if (block.kind === "visual" && !block.description.trim()) errors.push(`Block ${block.id} chưa mô tả trực quan.`);
    if (block.kind === "sequence" && (!block.steps.length || block.steps.some((step) => !step.id || !step.text.trim()))) errors.push(`Quy trình ${block.id} có bước không hợp lệ.`);
    if (block.kind === "comparison") {
      if (block.items.length < 2 || block.criteria.length === 0) errors.push(`So sánh ${block.id} cần ít nhất 2 đối tượng và 1 tiêu chí.`);
      if (block.values.length !== block.criteria.length || block.values.some((row) => row.length !== block.items.length)) errors.push(`Ma trận so sánh ${block.id} sai kích thước.`);
    }
    if (block.kind === "table" && (!block.columns.length || block.rows.some((row) => row.cells.length !== block.columns.length))) errors.push(`Bảng ${block.id} sai số ô.`);
    if (block.kind === "formula" && !block.expression.trim()) errors.push(`Công thức ${block.id} đang trống.`);
    if (block.kind === "quiz" && !block.question.trim()) errors.push(`Câu hỏi ${block.id} đang trống.`);
  }
  for (const relationship of plan.relationships ?? []) {
    const refs = relationship.type === "illustrates"
      ? [relationship.visualBlockId, relationship.targetBlockId]
      : relationship.type === "supports"
        ? [relationship.supportingBlockId, relationship.targetBlockId]
        : [relationship.beforeBlockId, relationship.afterBlockId];
    if (refs.some((id) => !ids.has(id))) errors.push(`Quan hệ ${relationship.type} tham chiếu block không tồn tại.`);
  }
  return errors;
}

export type GenerateOutlineRequest = {
  lessonId: string;
  libraryContentId?: string;
  lessonTitle: string;
  lessonSummary?: string;
  grade?: string;
  subject?: string;
  lessonContent?: string;
  plan?: InlineLessonPlan;
  userPrompt?: string;
  styleHint?: string;
};

export async function generateOutline(authFetch: AuthFetch, request: GenerateOutlineRequest): Promise<GenerateOutlineResponse> {
  logSlideApi("generate-outline: started");
  const res = await authFetch(`${BE}/api/slides/generate-outline`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    const message = `POST /api/slides/generate-outline ${res.status}: ${detail || res.statusText}`;
    console.error("[EDUA slide] [API] generate-outline failed", message);
    throw new Error(message);
  }
  const data = (await res.json()) as GenerateOutlineResponse;
  logSlideApi("generate-outline: succeeded");
  return data;
}

export async function retryOutlinePart(authFetch: AuthFetch, request: {
  sessionId: string;
  generationRequest: GenerateOutlineRequest;
  outline: OutlineData;
  partId: string;
}): Promise<void> {
  const res = await authFetch(`${BE}/api/slides/retry-outline-part`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Không thể thử lại phần đề cương: ${detail || res.statusText}`);
  }
}

export async function startOutlineSession(authFetch: AuthFetch, sessionId: string): Promise<void> {
  const res = await authFetch(`${BE}/api/slides/outline-sessions/${sessionId}/start`, { method: "POST" });
  if (!res.ok) throw new Error(`Không thể bắt đầu tạo outline: ${await res.text().catch(() => res.statusText)}`);
}

export async function retryOutlineSessionSlide(authFetch: AuthFetch, sessionId: string, partId: string, slideId: string): Promise<void> {
  const res = await authFetch(`${BE}/api/slides/retry-outline-session-slide`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId, partId, slideId }),
  });
  if (!res.ok) throw new Error(`Không thể thử lại slide đề cương: ${await res.text().catch(() => res.statusText)}`);
}
