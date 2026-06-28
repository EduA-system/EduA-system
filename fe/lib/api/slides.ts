import { logSlideApi } from "@/lib/ws/slide-debug-log";

const BE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

export type SlideVisual = {
  type: "image" | "formula" | "table" | "none";
  spec: string;
};

export type SlideItem = {
  id: string;
  title: string;
  kind: string;
  pedagogicalRole?: string;
  layoutHint?: string;
  /** Nội dung thật của slide, trích từ giáo án ở bước outline (cách B). */
  content?: string;
  /** Thời lượng dự kiến của slide (phút). */
  durationMinutes?: number;
  /** Đặc tả phần trực quan slide cần (ảnh/công thức/bảng) — pha 3 dàn theo đây. */
  visual?: SlideVisual;
  /** Câu ghi chú phần AI bổ sung ngoài giáo án để GV duyệt; rỗng nếu bám 100% giáo án. */
  aiNote?: string;
};

export type OutlinePart = { id: string; title: string; slides: SlideItem[] };
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

export function resolveSlideMetadata(slide: Pick<SlideItem, "kind" | "pedagogicalRole" | "layoutHint">) {
  const role = slide.pedagogicalRole?.trim();
  const layout = slide.layoutHint?.trim();
  const legacyKind = slide.kind?.trim();
  const kind =
    legacyKind ||
    (role === "hook"
      ? "intro"
      : role === "explain"
        ? "concept"
        : role === "derive"
          ? "formula"
          : role === "practice"
            ? "example"
            : role === "recap"
              ? "summary"
              : role) ||
    "concept";
  return {
    kind,
    pedagogicalRole: role || undefined,
    layoutHint: layout || undefined,
  };
}

export function slideRoleLabel(slide: Pick<SlideItem, "kind" | "pedagogicalRole">) {
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
    default:
      switch (slide.kind) {
        case "intro":
          return "Mở đầu";
        case "concept":
          return "Khái niệm";
        case "formula":
          return "Công thức";
        case "example":
          return "Ví dụ";
        case "summary":
          return "Tổng kết";
        default:
          return role || slide.kind || "Slide";
      }
  }
}

export function slideRoleTone(slide: Pick<SlideItem, "kind" | "pedagogicalRole">) {
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
    default:
      switch (slide.kind) {
        case "intro":
          return "bg-blue-50 text-blue-600";
        case "concept":
          return "bg-purple-50 text-purple-600";
        case "formula":
          return "bg-orange-50 text-orange-600";
        case "example":
          return "bg-green-50 text-green-600";
        case "summary":
          return "bg-slate-100 text-slate-600";
        default:
          return "bg-slate-100 text-slate-600";
      }
  }
}

export async function generateOutline(request: {
  lessonId: string;
  lessonTitle: string;
  lessonSummary?: string;
  grade?: string;
  subject?: string;
  plan: InlineLessonPlan;
  userPrompt?: string;
  styleHint?: string;
}): Promise<GenerateOutlineResponse> {
  logSlideApi("POST /api/slides/generate-outline", request);
  const res = await fetch(`${BE}/api/slides/generate-outline`, {
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
  logSlideApi("generate-outline OK", {
    sessionId: data.sessionId,
    topic: data.topic,
    partCount: data.outline.parts.length,
    slideCount: data.outline.parts.reduce((sum, part) => sum + part.slides.length, 0),
  });
  return data;
}

export async function generateParts(request: {
  sessionId: string;
  lessonId: string;
  lessonTitle: string;
  lessonSummary?: string;
  grade?: string;
  userPrompt?: string;
  styleHint?: string;
  parts: OutlinePart[];
}): Promise<void> {
  logSlideApi("POST /api/slides/generate-parts", {
    sessionId: request.sessionId,
    lessonId: request.lessonId,
    partCount: request.parts.length,
    slideCount: request.parts.reduce((sum, part) => sum + part.slides.length, 0),
  });
  const res = await fetch(`${BE}/api/slides/generate-parts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    const message = `POST /api/slides/generate-parts ${res.status}: ${detail || res.statusText}`;
    console.error("[EDUA slide] [API] generate-parts failed", message);
    throw new Error(message);
  }
  logSlideApi("generate-parts accepted (202)", { sessionId: request.sessionId });
}
