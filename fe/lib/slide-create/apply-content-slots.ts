import type { SlideElement } from "@/components/slide-editor/types";
import type { SlideContentFillResponse } from "@/lib/api/slide-design";
import { textBoxMinHeight } from "@/components/slide-editor/lib/text-box";
import { blendSurface, contrastingTextColor } from "@/lib/slide-layout/contrast";

function overlapArea(first: SlideElement, second: SlideElement): number {
  const width = Math.max(0, Math.min(first.x + first.w, second.x + second.w) - Math.max(first.x, second.x));
  const height = Math.max(0, Math.min(first.y + first.h, second.y + second.h) - Math.max(first.y, second.y));
  return width * height;
}

function backgroundForText(elements: SlideElement[], text: SlideElement, slideBackground?: string): string {
  const surface = elements
    .filter((element): element is Extract<SlideElement, { type: "shape" }> => element.type === "shape" && element.zIndex < text.zIndex)
    .map((element) => ({ element, overlap: overlapArea(element, text) }))
    .sort((left, right) => right.overlap - left.overlap)[0];
  return surface?.overlap ? blendSurface(surface.element.fill, slideBackground, surface.element.opacity) : slideBackground ?? "#ffffff";
}

/** Applies validated AI content to the step-2 placeholder elements only. */
export function applyContentSlots(elements: SlideElement[], response: SlideContentFillResponse, slideBackground?: string): SlideElement[] {
  const fills = new Map(response.slots.map((slot) => [slot.slotId, slot]));
  return elements.map((element) => {
    const fill = element.contentSlot ? fills.get(element.contentSlot) : undefined;
    if (!fill) return element;

    if (element.type === "text") {
      if (element.contentSlot === "header-1") return element;
      const next = {
        ...element,
        text: fill.text ?? "",
        ...(fill.style?.fontSize != null ? { fontSize: fill.style.fontSize } : {}),
        ...(fill.style?.color ? { color: fill.style.color } : {}),
        ...(fill.style?.bold != null ? { bold: fill.style.bold } : {}),
        ...(fill.style?.italic != null ? { italic: fill.style.italic } : {}),
        ...(fill.style?.align ? { align: fill.style.align } : {}),
      };
      const color = contrastingTextColor(backgroundForText(elements, next, slideBackground), next.color);
      return { ...next, color, h: Math.max(next.h, textBoxMinHeight(next)) };
    }

    if (element.type === "image") {
      return { ...element, imagePrompt: fill.imagePrompt ?? undefined };
    }

    return element;
  });
}
