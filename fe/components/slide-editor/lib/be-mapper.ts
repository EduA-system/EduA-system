import type { Slide } from "@/components/slide-editor/types";

export const PLACEHOLDER_IMAGE =
  "data:image/svg+xml," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="320" height="240"><rect width="100%" height="100%" fill="#e2e8f0"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#64748b" font-size="14" font-family="sans-serif">Ảnh minh hoạ</text></svg>',
  );

export function skeletonSlidesFromParts(
  parts: { slides: { id: string; title: string }[] }[],
): Slide[] {
  return parts.flatMap((part) =>
    part.slides.map((sl) => ({
      id: sl.id,
      bg: "#ffffff",
      elements: [],
      aiPrompt: sl.title,
      generationStatus: "pending" as const,
    })),
  );
}
