import { generateSlideHtmlDesign } from "@/lib/api/slide-design";
import { slideRoleLabel, type OutlinePart, type SlideItem } from "@/lib/api/slides";
import { htmlToSlideElements } from "@/components/slide-editor/lib/html-to-slide";
import { pickBackground, pickDecoIcons } from "@/lib/slide-assets/resolve";
import type { SlideElement } from "@/components/slide-editor/types";
import { logSlideApi } from "@/lib/ws/slide-debug-log";

export type DesignPipelineInput = {
  topic: string;
  subject?: string;
  styleHint?: string;
  parts: OutlinePart[];
};

export type DesignPipelineCallbacks = {
  /**
   * Step 1 (deck skin) finished and was converted once — reusable bg +
   * decoration. Used to stamp a preview onto all skeleton slides before
   * per-slide layout frames finish.
   */
  onSkinReady?: (skin: { bg: string; elements: SlideElement[] }) => void;
  /**
   * Step 2 done for a slide: bordered zone frames stamped as a layout preview.
   * Kept for incremental UI updates; Step 2 is also the temporary final result.
   */
  onSlideFrames?: (
    slideId: string,
    result: { bg: string; elements: SlideElement[] },
  ) => void;
  /** A slide finished the currently enabled design steps and was converted to editor elements. */
  onSlideReady: (
    slideId: string,
    result: { bg: string; elements: SlideElement[] },
    title: string,
  ) => void;
  onSlideFailed?: (slideId: string, message: string) => void;
  onProgress?: (ready: number, total: number) => void;
  /** Fatal error (step 1 failed / empty) — pipeline stops. */
  onError?: (message: string) => void;
};

/**
 * Build the per-slide outline text fed to step 2. Beyond title + role, we
 * include the real lesson content bound to this slide so the layout AI can
 * choose zone count, ratios, and capacity from the teacher's plan.
 */
function slideOutlineText(slide: SlideItem): string {
  const role = slideRoleLabel(slide);
  const title = slide.title.trim();
  const head = role && role !== title ? `${title} (${role})` : title;
  const sections: string[] = [];
  const body = slide.content?.trim();
  if (body) sections.push(`Nội dung hiển thị:\n${body}`);
  if (slide.requiredFacts?.length) {
    sections.push(`Dữ kiện bắt buộc:\n${slide.requiredFacts.map((fact) => `- ${fact}`).join("\n")}`);
  }
  if (slide.quizItems?.length) {
    const quizText = slide.quizItems
      .map((quiz, index) => {
        const lines = [`${index + 1}. ${quiz.question}`];
        if (quiz.choices?.length) lines.push(...quiz.choices.map((choice) => `   ${choice}`));
        if (quiz.answer?.trim()) lines.push(`   Đáp án: ${quiz.answer.trim()}`);
        if (quiz.explanation?.trim()) lines.push(`   Giải thích: ${quiz.explanation.trim()}`);
        return lines.join("\n");
      })
      .join("\n");
    sections.push(`Câu hỏi luyện tập / phiếu học tập:\n${quizText}`);
  }
  if (slide.visual && slide.visual.type !== "none" && slide.visual.spec.trim()) {
    sections.push(`Trực quan cần có (${slide.visual.type}):\n${slide.visual.spec.trim()}`);
  }
  if (slide.aiNote?.trim()) {
    sections.push(`AI note:\n${slide.aiNote.trim()}`);
  }
  return sections.length ? `${head}\n\n${sections.join("\n\n")}` : head;
}

function flattenSlides(parts: OutlinePart[]): SlideItem[] {
  return parts.flatMap((part) => part.slides);
}

/**
 * Max slides whose step-2 layout calls run concurrently. Bounded to avoid
 * AI-provider rate limits (429) and the browser's ~6 conn/host cap on
 * HTTP/1.1. Raise carefully if the provider tier allows more throughput.
 */
const SLIDE_CONCURRENCY = 4;

/** Run `worker` over `items` with at most `limit` in flight at once. */
async function runPool<T>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<void>,
): Promise<void> {
  let next = 0;
  const runners = Array.from(
    { length: Math.min(limit, items.length) },
    async () => {
      while (next < items.length) {
        const item = items[next++];
        await worker(item);
      }
    },
  );
  await Promise.all(runners);
}

/**
 * Run the currently enabled HTML design pipeline for a whole deck:
 *   step1 (bg_deco) once  →  deck skin
 *   per slide: step2 (structural) → convert → onSlideReady
 *
 * Step 3 (content_fill) is intentionally disabled for now so the editor shows
 * the ratio-partitioned content frames from Step 2.
 */
export async function runDesignPipeline(
  input: DesignPipelineInput,
  cb: DesignPipelineCallbacks,
): Promise<void> {
  const { topic, subject, styleHint, parts } = input;
  const slides = flattenSlides(parts);
  const total = slides.length;
  let ready = 0;

  // Decorative chrome for the whole deck (stable per topic) so every slide
  // shares it: one background pattern + a few faint corner icons. Stamped
  // under all content during conversion.
  const bgImageUrl = pickBackground(topic);
  const decoIconUrls = pickDecoIcons(topic);

  // ── Step 1: deck skin (once) ────────────────────────────────
  let skinHtml: string;
  try {
    const step1 = await generateSlideHtmlDesign({
      topic,
      outline: "",
      subject,
      styleHint,
      step: "bg_deco",
    });
    if (!step1.html.trim()) {
      cb.onError?.("Step 1 (deck skin) trả về rỗng.");
      return;
    }
    skinHtml = step1.html;
  } catch (e) {
    cb.onError?.(e instanceof Error ? e.message : String(e));
    return;
  }

  // Convert the skin once and hand it to the client so it can stamp a
  // bg + decoration preview onto every still-empty skeleton slide.
  try {
    const { bg, elements, skipped } = await htmlToSlideElements(skinHtml, { bgImageUrl, decoIconUrls });
    if (skipped.length > 0) {
      logSlideApi("design pipeline: skin skipped elements", { skipped });
    }
    cb.onSkinReady?.({ bg, elements });
  } catch (e) {
    logSlideApi("design pipeline: skin convert failed", {
      message: e instanceof Error ? e.message : String(e),
    });
  }

  // ── Step 2 per slide (parallel, bounded) ────────────────────
  await runPool(slides, SLIDE_CONCURRENCY, async (slide) => {
    const outline = slideOutlineText(slide);
    try {
      const step2 = await generateSlideHtmlDesign({
        topic,
        outline,
        subject,
        styleHint,
        step: "structural",
        priorHtml: skinHtml,
      });
      if (!step2.html.trim()) {
        throw new Error(step2.warning || "Step 2 không tạo được HTML layout.");
      }
      const { bg, elements, skipped } = await htmlToSlideElements(step2.html, {
        bgImageUrl,
        decoIconUrls,
        includeZoneFrames: true,
      });
      if (skipped.length > 0) {
        logSlideApi("design pipeline: skipped elements", { slide: slide.id, skipped });
      }
      cb.onSlideFrames?.(slide.id, { bg, elements });
      cb.onSlideReady(slide.id, { bg, elements }, slide.title);
    } catch (e) {
      console.error("[EDUA slide] [API] design pipeline slide failed", slide.id, e);
      cb.onSlideFailed?.(slide.id, e instanceof Error ? e.message : String(e));
    } finally {
      ready += 1;
      cb.onProgress?.(ready, total);
    }
  });
}
