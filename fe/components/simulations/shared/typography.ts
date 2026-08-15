const FALLBACK_FONT_FAMILY = "Arial, Helvetica, sans-serif";
let cachedFontFamily: string | null = null;

/**
 * Next/font tự host Inter dưới một tên family đã băm. Canvas và Konva không
 * kế thừa font từ DOM, nên phải đọc family thật từ biến CSS thay vì ghi cứng
 * `Inter` (máy không cài Inter sẽ rơi về font hệ thống và hiển thị khác nhau).
 */
export function getSimulationFontFamily(): string {
  if (typeof window === "undefined") return FALLBACK_FONT_FAMILY;
  if (cachedFontFamily) return cachedFontFamily;
  cachedFontFamily =
    window
      .getComputedStyle(document.documentElement)
      .getPropertyValue("--font-inter")
      .trim() || FALLBACK_FONT_FAMILY;
  return cachedFontFamily;
}

export function simulationCanvasFont(
  size: string,
  weight: 400 | 500 | 600 | 700 = 400,
): string {
  return `${weight} ${size} ${getSimulationFontFamily()}`;
}
