import { toCanvas } from "html-to-image";

/**
 * Captures the current rendered appearance of an element as a canvas.
 *
 * Uses `html-to-image` (walks computed styles, inlines fonts/images) instead
 * of a hand-rolled SVG `foreignObject` snapshot — the manual approach loses
 * all Tailwind styling because the cloned markup has no access to the host
 * page's stylesheet once serialized into a standalone SVG image, making the
 * warp overlay render as an invisible/unstyled blob. Any failure still
 * returns null so callers fall back to the plain instant collapse instead
 * of showing a broken snapshot.
 */
export async function snapshotSidebar(element: HTMLElement): Promise<HTMLCanvasElement | null> {
  try {
    const rect = element.getBoundingClientRect();
    const width = Math.max(1, Math.round(rect.width));
    const height = Math.max(1, Math.round(rect.height));
    if (width <= 1 || height <= 1) return null;

    return await toCanvas(element, { width, height, pixelRatio: 1, cacheBust: true });
  } catch {
    return null;
  }
}
