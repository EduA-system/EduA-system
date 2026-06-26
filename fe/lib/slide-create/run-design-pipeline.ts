import { generateSlideHtmlDesign } from "@/lib/api/slide-design";
import { slideRoleLabel, type OutlinePart, type SlideItem } from "@/lib/api/slides";
import { htmlToSlideElements } from "@/components/slide-editor/lib/html-to-slide";
import type { SlideElement } from "@/components/slide-editor/types";
import { logSlideApi } from "@/lib/ws/slide-debug-log";

export type DesignPipelineInput = {
  topic: string;
  subject?: string;
  styleHint?: string;
  parts: OutlinePart[];
};

export type DesignPipelineCallbacks = {
  /** Step 1 (deck skin) finished — reusable bg + decoration + header. */
  onSkinReady?: (skinHtml: string) => void;
  /** A slide finished steps 2+3 and was converted to editor elements. */
  onSlideReady: (
    slideId: string,
    result: { bg: string; elements: SlideElement[] },
    title: string,
  ) => void;
  onProgress?: (ready: number, total: number) => void;
  /** Fatal error (step 1 failed / empty) — pipeline stops. */
  onError?: (message: string) => void;
};

/** Build the per-slide outline text from the only data we have: the slide title + role. */
function slideOutlineText(slide: SlideItem): string {
  const role = slideRoleLabel(slide);
  const title = slide.title.trim();
  return role && role !== title ? `${title} (${role})` : title;
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
    cb.onSkinReady?.(skinHtml);
  } catch (e) {
    cb.onError?.(e instanceof Error ? e.message : String(e));
    return;
  }

  // ── Steps 2+3 per slide (parallel, bounded) ─────────────────
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
      const step3 = await generateSlideHtmlDesign({
        topic,
        outline,
        subject,
        styleHint,
        step: "content_fill",
        priorHtml: step2.html,
      });
      const { bg, elements, skipped } = await htmlToSlideElements(step3.html);
      if (skipped.length > 0) {
        logSlideApi("design pipeline: skipped elements", { slide: slide.id, skipped });
      }
      cb.onSlideReady(slide.id, { bg, elements }, slide.title);
    } catch (e) {
      console.error("[EDUA slide] [API] design pipeline slide failed", slide.id, e);
    } finally {
      ready += 1;
      cb.onProgress?.(ready, total);
    }
  });
}
