import type { SlideElement } from "@/components/slide-editor/types";
import type { SlideContentFillResponse } from "@/lib/api/slide-design";

/** Applies validated AI content to the step-2 placeholder elements only. */
export function applyContentSlots(elements: SlideElement[], response: SlideContentFillResponse): SlideElement[] {
  const fills = new Map(response.slots.map((slot) => [slot.slotId, slot]));
  return elements.map((element) => {
    const fill = element.contentSlot ? fills.get(element.contentSlot) : undefined;
    if (!fill) return element;

    if (element.type === "text") {
      if (element.contentSlot === "header-1") return element;
      return {
        ...element,
        text: fill.text ?? "",
        ...(fill.style?.fontSize != null ? { fontSize: fill.style.fontSize } : {}),
        ...(fill.style?.color ? { color: fill.style.color } : {}),
        ...(fill.style?.bold != null ? { bold: fill.style.bold } : {}),
        ...(fill.style?.italic != null ? { italic: fill.style.italic } : {}),
        ...(fill.style?.align ? { align: fill.style.align } : {}),
      };
    }

    if (element.type === "image") {
      return { ...element, imagePrompt: fill.imagePrompt ?? undefined };
    }

    return element;
  });
}
