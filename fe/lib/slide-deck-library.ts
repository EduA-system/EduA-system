import type { Slide } from "@/components/slide-editor/types";

export type SlideDeckLibraryPayload = {
  version: 1;
  slides: Slide[];
};

export function serializeSlideDeck(slides: Slide[]): SlideDeckLibraryPayload {
  return {
    version: 1,
    slides: slides.map((slide) => {
      const clean = structuredClone(slide);
      delete clean.generationStatus;
      return clean;
    }),
  };
}

function isSlide(value: unknown): value is Slide {
  if (!value || typeof value !== "object") return false;
  const slide = value as { id?: unknown; bg?: unknown; elements?: unknown };
  return typeof slide.id === "string" && typeof slide.bg === "string" && Array.isArray(slide.elements);
}

export function parseSlideDeck(payload: unknown): Slide[] | null {
  if (!payload || typeof payload !== "object") return null;
  const data = payload as { version?: unknown; slides?: unknown };
  if (data.version !== 1 || !Array.isArray(data.slides) || data.slides.length === 0) return null;
  return data.slides.every(isSlide) ? data.slides : null;
}
