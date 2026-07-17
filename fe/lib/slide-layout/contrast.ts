const DARK_TEXT = "#1f2937";
const LIGHT_TEXT = "#ffffff";

type Rgb = { r: number; g: number; b: number };

function rgbFromHex(color: string | undefined): Rgb | null {
  if (!color || !/^#[0-9a-f]{6}$/i.test(color)) return null;
  return {
    r: Number.parseInt(color.slice(1, 3), 16),
    g: Number.parseInt(color.slice(3, 5), 16),
    b: Number.parseInt(color.slice(5, 7), 16),
  };
}

function hexFromRgb({ r, g, b }: Rgb): string {
  return `#${[r, g, b].map((channel) => Math.round(channel).toString(16).padStart(2, "0")).join("")}`;
}

function relativeLuminance(color: string): number {
  const rgb = rgbFromHex(color);
  if (!rgb) return 1;
  return [rgb.r, rgb.g, rgb.b]
    .map((channel) => channel / 255)
    .map((channel) => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4)
    .reduce((sum, channel, index) => sum + channel * [0.2126, 0.7152, 0.0722][index], 0);
}

export function contrastRatio(first: string, second: string): number {
  const [lighter, darker] = [relativeLuminance(first), relativeLuminance(second)].sort((a, b) => b - a);
  return (lighter + 0.05) / (darker + 0.05);
}

/** Composite a translucent solid surface over a solid slide background. */
export function blendSurface(surface: string | undefined, background: string | undefined, opacity: number): string {
  const foreground = rgbFromHex(surface);
  const backdrop = rgbFromHex(background) ?? rgbFromHex("#ffffff")!;
  if (!foreground) return hexFromRgb(backdrop);
  const alpha = Math.max(0, Math.min(1, opacity));
  return hexFromRgb({
    r: foreground.r * alpha + backdrop.r * (1 - alpha),
    g: foreground.g * alpha + backdrop.g * (1 - alpha),
    b: foreground.b * alpha + backdrop.b * (1 - alpha),
  });
}

/** Keep a supplied color only when it is readable; otherwise use the stronger of dark/white text. */
export function contrastingTextColor(background: string | undefined, preferred?: string): string {
  const backdrop = rgbFromHex(background) ? background! : "#ffffff";
  if (rgbFromHex(preferred) && contrastRatio(preferred!, backdrop) >= 4.5) return preferred!;
  return contrastRatio(DARK_TEXT, backdrop) >= contrastRatio(LIGHT_TEXT, backdrop) ? DARK_TEXT : LIGHT_TEXT;
}
