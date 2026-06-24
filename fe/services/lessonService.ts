import type { Lesson } from "@/data/lessonMock";
import { lessonMock } from "@/data/lessonMock";

// This service is designed for future API replacement.
// All functions currently use mock data and simulate async behavior.

/** Fetch a lesson by id. TODO: replace with GET /api/lessons/:id */
export async function fetchLesson(id: string): Promise<Lesson> {
  void id;
  await delay(150);
  return structuredClone(lessonMock);
}

/** Save lesson. TODO: replace with PUT /api/lessons/:id */
export async function saveLesson(lesson: Lesson): Promise<Lesson> {
  await delay(400);
  console.log("[lessonService] Saving lesson:", lesson);
  return lesson;
}

/** Generate slides from lesson. TODO: replace with POST /api/lessons/:id/generate-slides */
export async function generateSlides(lesson: Lesson): Promise<void> {
  console.log("[lessonService] generateSlides called with:", lesson);
}

function delay(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}
