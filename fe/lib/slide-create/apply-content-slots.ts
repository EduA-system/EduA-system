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

function bulletListText(text: string): { text: string; listStyle?: "bullet" } {
  const lines = text.split("\n");
  const bulletLines = lines.filter((line) => /^\s*(?:•|-|–)\s+/.test(line));
  if (lines.length < 2 || bulletLines.length !== lines.length) return { text };
  return { text: lines.map((line) => line.replace(/^\s*(?:•|-|–)\s+/, "")).join("\n"), listStyle: "bullet" };
}

/** Makes flattened multiple-choice source text readable in a normal text slot. */
function formatMultipleChoiceLines(text: string): string {
  const choiceCount = [...text.matchAll(/(?:^|\s)[A-D]\.\s+/g)].length;
  if (choiceCount < 2) return text;
  return text
    .replace(/\s+([A-D])\.\s+/g, "\n$1. ")
    .replace(/\s+(Đáp án:|Giải thích:)/g, "\n$1");
}

function maximumFontSize(fontSize: number): number {
  if (fontSize <= 11) return 18;
  if (fontSize <= 12) return 20;
  if (fontSize <= 16) return 28;
  if (fontSize <= 24) return 34;
  return 48;
}

/** Applies validated AI content to the step-2 placeholder elements only. */
export function applyContentSlots(elements: SlideElement[], response: SlideContentFillResponse, slideBackground?: string): SlideElement[] {
  const fills = new Map(response.slots.map((slot) => [slot.slotId, slot]));
  const titleElements = elements.filter((element): element is Extract<SlideElement, { type: "text" }> =>
    element.type === "text" && Boolean(element.contentSlot?.endsWith(":title")));
  if (titleElements.some((element) => !element.text.trim())) throw new Error("Slide không có tiêu đề hợp lệ.");

  const contentElements = elements.filter((element) => element.contentSlot && !element.contentSlot.endsWith(":title") && element.contentSlot !== "header-1");
  if (contentElements.length > 0 && !contentElements.some((element) => {
    const fill = fills.get(element.contentSlot!);
    return element.type === "text"
      ? Boolean(fill?.text?.trim() || element.text.trim())
      : element.type === "image"
        ? Boolean(fill?.imagePrompt?.trim() || element.imagePrompt?.trim())
        : false;
  })) throw new Error("AI không điền nội dung cho slide.");

  return elements.map((element) => {
    const fill = element.contentSlot ? fills.get(element.contentSlot) : undefined;
    if (!fill) return element;

    if (element.type === "text") {
      if (element.contentSlot === "header-1") return element;
      const supplied = fill.text != null ? bulletListText(formatMultipleChoiceLines(fill.text)) : undefined;
      const next = {
        ...element,
        ...(fill.text == null ? { text: formatMultipleChoiceLines(element.text) } : {}),
        ...(supplied ?? {}),
        ...(fill.style?.color ? { color: fill.style.color } : {}),
        ...(fill.style?.bold != null ? { bold: fill.style.bold } : {}),
        ...(fill.style?.italic != null ? { italic: fill.style.italic } : {}),
        ...(fill.style?.align ? { align: fill.style.align } : {}),
      };
      const color = contrastingTextColor(backgroundForText(elements, next, slideBackground), next.color);
      const minimumFontSize = next.fontSize >= 28 ? 24 : next.fontSize >= 20 ? 18 : next.fontSize >= 14 ? 14 : 11;
      let fontSize = next.fontSize;
      while (fontSize > minimumFontSize && textBoxMinHeight({ ...next, fontSize }) > next.h) fontSize -= 1;
      if (textBoxMinHeight({ ...next, fontSize }) > next.h) {
        throw new Error("Nội dung vượt khung ngay cả ở cỡ chữ tối thiểu.");
      }
      const maximum = maximumFontSize(next.fontSize);
      while (fontSize < maximum && textBoxMinHeight({ ...next, fontSize: fontSize + 1 }) <= next.h) fontSize += 1;
      return { ...next, color, fontSize };
    }

    if (element.type === "image") {
      return { ...element, ...(fill.imagePrompt != null ? { imagePrompt: fill.imagePrompt } : {}) };
    }

    return element;
  });
}
