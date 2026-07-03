import { generateSlideHtmlDesign } from "@/lib/api/slide-design";
import { slideRoleLabel, type OutlinePart, type SlideItem } from "@/lib/api/slides";
import { htmlToSlideElements } from "@/components/slide-editor/lib/html-to-slide";
import { pickBackground, pickDecoIcons } from "@/lib/slide-assets/resolve";
import type { SlideElement } from "@/components/slide-editor/types";
import { logSlideApi } from "@/lib/ws/slide-debug-log";
import {
  getSlideDesignContext,
  setSlideDesignContext,
  type SlideDesignContext,
} from "@/lib/slide-create/design-session";

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
   * per-slide content fills in.
   */
  onSkinReady?: (skin: { bg: string; elements: SlideElement[] }) => void;
  /**
   * Step 2 done for a slide: bordered zone frames stamped as a layout preview.
   * Replaced by onSlideReady once step 3 fills the content.
   */
  onSlideFrames?: (
    slideId: string,
    result: { bg: string; elements: SlideElement[] },
  ) => void;
  /** A slide finished steps 2+3 and was converted to editor elements. */
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
 * Build the per-slide outline text fed to step 2 + step 3. Beyond title + role,
 * we include the real lesson content bound to this slide at the outline step
 * (cách B) so the design AI fills the slide from the teacher's plan instead of
 * inventing unrelated examples.
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
 * Max slides whose step2→step3 chains run concurrently. Bounded to avoid
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
 * Run step 2 (structural) + step 3 (content_fill) + iframe conversion for a
 * single slide, given a ready deck skin. Shared by the full-deck pipeline
 * below and by retrySlideDesign (regenerate one slide from the header retry
 * button) so both paths behave identically.
 */
async function runSlideDesignSteps(
  slide: SlideItem,
  ctx: Pick<SlideDesignContext, "topic" | "subject" | "styleHint" | "skinHtml" | "bgImageUrl" | "decoIconUrls">,
  cb: Pick<DesignPipelineCallbacks, "onSlideFrames" | "onSlideReady" | "onSlideFailed">,
): Promise<void> {
  const { topic, subject, styleHint, skinHtml, bgImageUrl, decoIconUrls } = ctx;
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
    // Preview the step-2 layout: stamp bordered zone frames before content.
    if (cb.onSlideFrames) {
      try {
        const frames = await htmlToSlideElements(step2.html, {
          bgImageUrl,
          decoIconUrls,
          includeZoneFrames: true,
        });
        cb.onSlideFrames(slide.id, { bg: frames.bg, elements: frames.elements });
      } catch (e) {
        logSlideApi("design pipeline: frame preview failed", {
          slide: slide.id,
          message: e instanceof Error ? e.message : String(e),
        });
      }
    }
    const step3 = await generateSlideHtmlDesign({
      topic,
      outline,
      subject,
      styleHint,
      step: "content_fill",
      priorHtml: step2.html,
    });
    const { bg, elements, skipped } = await htmlToSlideElements(step3.html, { bgImageUrl, decoIconUrls });
    if (skipped.length > 0) {
      logSlideApi("design pipeline: skipped elements", { slide: slide.id, skipped });
    }
    if (elements.length === 0) {
      // AI trả HTTP 200 nhưng HTML rỗng/hỏng (không parse ra được element nào) —
      // coi như thất bại thay vì âm thầm hiện slide trắng như "ready".
      throw new Error("AI trả về slide rỗng, không có nội dung nào được tạo.");
    }
    cb.onSlideReady(slide.id, { bg, elements }, slide.title);
  } catch (e) {
    console.error("[EDUA slide] [API] design pipeline slide failed", slide.id, e);
    cb.onSlideFailed?.(slide.id, e instanceof Error ? e.message : String(e));
  }
}

/**
 * Regenerate a single slide (header "retry" button) using the deck skin and
 * outline captured by the last runDesignPipeline call. Returns without
 * calling the AI if that context isn't available (e.g. page was reloaded).
 */
export async function retrySlideDesign(
  slideId: string,
  cb: Pick<DesignPipelineCallbacks, "onSlideFrames" | "onSlideReady" | "onSlideFailed">,
): Promise<void> {
  const ctx = getSlideDesignContext();
  if (!ctx) {
    cb.onSlideFailed?.(slideId, "Không thể tạo lại: đã mất dữ liệu phiên tạo slide (thử tải lại trang vừa tạo deck).");
    return;
  }
  const slide = ctx.slidesById.get(slideId);
  if (!slide) {
    cb.onSlideFailed?.(slideId, "Không tìm thấy outline gốc cho slide này để tạo lại.");
    return;
  }
  await runSlideDesignSteps(slide, ctx, cb);
}

/**
 * Run the 3-step HTML design pipeline for a whole deck:
 *   step1 (bg_deco) once  →  deck skin
 *   per slide: step2 (structural) → step3 (content_fill) → convert → onSlideReady
 *
 * step2→step3 stay sequential within a slide (hard dependency), but slides
 * run in parallel with bounded concurrency (SLIDE_CONCURRENCY) so the deck
 * generates faster; each slide still reveals itself as it completes.
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

  // Snapshot this run so a single slide can be retried later without
  // redoing step 1 or re-asking the caller for the outline.
  setSlideDesignContext({
    topic,
    subject,
    styleHint,
    skinHtml,
    bgImageUrl,
    decoIconUrls,
    slidesById: new Map(slides.map((slide) => [slide.id, slide])),
  });

  // ── Steps 2+3 per slide (parallel, bounded) ─────────────────
  await runPool(slides, SLIDE_CONCURRENCY, async (slide) => {
    try {
      await runSlideDesignSteps(
        slide,
        { topic, subject, styleHint, skinHtml, bgImageUrl, decoIconUrls },
        cb,
      );
    } finally {
      ready += 1;
      cb.onProgress?.(ready, total);
    }
  });
}
