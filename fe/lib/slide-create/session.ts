import type { InlineLessonPlan } from "@/lib/api/slides";

export const SLIDE_CREATE_SESSION_KEY = "eduaSlide:create";

export type SlideGenerationSession = {
  lessonCardId: string;
  lessonTitle: string;
  lessonSummary: string;
  subject: string;
  grade: string;
  styleHint: string;
  slideCount: number;
  inlinePlan: InlineLessonPlan;
  sessionId?: string;
  topic?: string;
  outlineParts?: import("@/lib/api/slides").OutlinePart[];
};

export function readSlideCreateSession(): SlideGenerationSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(SLIDE_CREATE_SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SlideGenerationSession;
  } catch {
    return null;
  }
}

export function writeSlideCreateSession(session: SlideGenerationSession) {
  sessionStorage.setItem(SLIDE_CREATE_SESSION_KEY, JSON.stringify(session));
}

export function patchSlideCreateSession(patch: Partial<SlideGenerationSession>) {
  const current = readSlideCreateSession();
  if (!current) return;
  writeSlideCreateSession({ ...current, ...patch });
}

export const SLIDE_GENERATION_ACTIVE_KEY = "eduaSlide:generating";

export type ActiveGeneration = {
  sessionId: string;
  topic: string;
  lessonId: string;
  lessonTitle: string;
  lessonSummary: string;
  grade: string;
  styleHint: string;
  subject?: string;
  parts: import("@/lib/api/slides").OutlinePart[];
};

export function readActiveGeneration(): ActiveGeneration | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(SLIDE_GENERATION_ACTIVE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ActiveGeneration;
  } catch {
    return null;
  }
}

export function writeActiveGeneration(active: ActiveGeneration) {
  sessionStorage.setItem(SLIDE_GENERATION_ACTIVE_KEY, JSON.stringify(active));
}

export function clearActiveGeneration() {
  sessionStorage.removeItem(SLIDE_GENERATION_ACTIVE_KEY);
}
