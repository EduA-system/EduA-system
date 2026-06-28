// Lưu/đọc slides vào localStorage. Chỉ gọi ở client (trong useEffect) để tránh
// mismatch hydration của Next.

import type { Slide } from "../types";

const LS_KEY = "slide-editor-v1";

function stripGenerationStatus(slides: Slide[]): Slide[] {
  return slides.map((slide) => {
    const clean = { ...slide };
    delete clean.generationStatus;
    return clean;
  });
}

export function loadSlides(): Slide[] | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    const slides: Slide[] = Array.isArray(data) ? data : data.slides;
    if (!Array.isArray(slides) || slides.length === 0) return null;
    return stripGenerationStatus(slides);
  } catch {
    return null;
  }
}

export function saveSlides(slides: Slide[]) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify({ slides: stripGenerationStatus(slides) }));
  } catch {
    // hết quota / chế độ private → bỏ qua
  }
}
