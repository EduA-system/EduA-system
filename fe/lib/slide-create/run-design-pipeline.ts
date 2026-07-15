import { generateSlideHtmlDesign } from "@/lib/api/slide-design";
import { slideRoleLabel, type OutlinePart, type SlideItem } from "@/lib/api/slides";
import { htmlToSlideElements } from "@/components/slide-editor/lib/html-to-slide";
import { pickBackground, pickDecoIcons } from "@/lib/slide-assets/resolve";
import type { SlideElement } from "@/components/slide-editor/types";
import { logSlideApi } from "@/lib/ws/slide-debug-log";
import {
  getSlideDesignContext,
  setSlideDesignContext,
} from "@/lib/slide-create/design-session";

export type DesignPipelineInput = {
  topic: string;
  subject?: string;
  styleHint?: string;
  parts: OutlinePart[];
};

export type StepCallbacks = {
  onSkinReady?: (skin: { bg: string; elements: SlideElement[] }) => void;
  onSlideFrames?: (slideId: string, result: { bg: string; elements: SlideElement[] }) => void;
  onSlideReady?: (slideId: string, result: { bg: string; elements: SlideElement[] }, title: string) => void;
  onSlideFailed?: (slideId: string, message: string) => void;
};

export type StepRunResult = {
  failedSlideIds: string[];
};

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
  if (slide.aiNote?.trim()) sections.push(`AI note:\n${slide.aiNote.trim()}`);
  return sections.length ? `${head}\n\n${sections.join("\n\n")}` : head;
}

function flattenSlides(parts: OutlinePart[]): SlideItem[] {
  return parts.flatMap((part) => part.slides);
}

const SLIDE_CONCURRENCY = 4;

async function runPool<T>(items: T[], limit: number, worker: (item: T) => Promise<void>): Promise<void> {
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) await worker(items[next++]);
    }),
  );
}

/** Step 1: create the shared deck skin and retain its context for the next steps. */
export async function runDeckSkinStep(
  input: DesignPipelineInput,
  cb: Pick<StepCallbacks, "onSkinReady"> = {},
): Promise<void> {
  const { topic, subject, styleHint, parts } = input;
  const slides = flattenSlides(parts);
  const bgImageUrl = pickBackground(topic);
  const decoIconUrls = pickDecoIcons(topic);
  const step1 = await generateSlideHtmlDesign({ topic, outline: "", subject, styleHint, step: "bg_deco" });
  if (!step1.html.trim()) throw new Error("Bước 1 (giao diện deck) trả về rỗng.");

  setSlideDesignContext({
    topic,
    subject,
    styleHint,
    skinHtml: step1.html,
    structuralHtmlBySlide: new Map(),
    bgImageUrl,
    decoIconUrls,
    slidesById: new Map(slides.map((slide) => [slide.id, slide])),
  });

  try {
    const { bg, elements, skipped } = await htmlToSlideElements(step1.html, { bgImageUrl, decoIconUrls });
    if (skipped.length) logSlideApi("design step 1: skin skipped elements", { skipped });
    cb.onSkinReady?.({ bg, elements });
  } catch (error) {
    logSlideApi("design step 1: skin convert failed", {
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

/** Step 2: generate structural HTML for every slide and render zone previews. */
export async function runStructuralStep(
  cb: Pick<StepCallbacks, "onSlideFrames" | "onSlideFailed"> = {},
): Promise<StepRunResult> {
  const ctx = getSlideDesignContext();
  if (!ctx) throw new Error("Chưa có kết quả Bước 1. Vui lòng chạy Bước 1 trước.");

  const failedSlideIds: string[] = [];
  await runPool([...ctx.slidesById.values()], SLIDE_CONCURRENCY, async (slide) => {
    try {
      const response = await generateSlideHtmlDesign({
        topic: ctx.topic,
        outline: slideOutlineText(slide),
        subject: ctx.subject,
        styleHint: ctx.styleHint,
        step: "structural",
        priorHtml: ctx.skinHtml,
      });
      if (!response.html.trim()) throw new Error("AI trả về bố cục rỗng.");
      ctx.structuralHtmlBySlide.set(slide.id, response.html);

      try {
        const frames = await htmlToSlideElements(response.html, {
          bgImageUrl: ctx.bgImageUrl,
          decoIconUrls: ctx.decoIconUrls,
          includeZoneFrames: true,
        });
        cb.onSlideFrames?.(slide.id, { bg: frames.bg, elements: frames.elements });
      } catch (error) {
        logSlideApi("design step 2: frame preview failed", {
          slide: slide.id,
          message: error instanceof Error ? error.message : String(error),
        });
      }
    } catch (error) {
      failedSlideIds.push(slide.id);
      cb.onSlideFailed?.(slide.id, error instanceof Error ? error.message : String(error));
    }
  });
  return { failedSlideIds };
}

/** Step 3: fill the structural HTML with slide content and convert it for the editor. */
export async function runContentFillStep(
  cb: Pick<StepCallbacks, "onSlideReady" | "onSlideFailed"> = {},
): Promise<StepRunResult> {
  const ctx = getSlideDesignContext();
  if (!ctx) throw new Error("Chưa có kết quả Bước 1. Vui lòng chạy Bước 1 trước.");

  const failedSlideIds: string[] = [];
  await runPool([...ctx.slidesById.values()], SLIDE_CONCURRENCY, async (slide) => {
    try {
      const structuralHtml = ctx.structuralHtmlBySlide.get(slide.id);
      if (!structuralHtml) throw new Error("Slide chưa có bố cục từ Bước 2.");
      const response = await generateSlideHtmlDesign({
        topic: ctx.topic,
        outline: slideOutlineText(slide),
        subject: ctx.subject,
        styleHint: ctx.styleHint,
        step: "content_fill",
        priorHtml: structuralHtml,
      });
      const { bg, elements, skipped } = await htmlToSlideElements(response.html, {
        bgImageUrl: ctx.bgImageUrl,
        decoIconUrls: ctx.decoIconUrls,
      });
      if (skipped.length) logSlideApi("design step 3: skipped elements", { slide: slide.id, skipped });
      if (!elements.length) throw new Error("AI trả về slide rỗng, không có nội dung.");
      cb.onSlideReady?.(slide.id, { bg, elements }, slide.title);
    } catch (error) {
      failedSlideIds.push(slide.id);
      cb.onSlideFailed?.(slide.id, error instanceof Error ? error.message : String(error));
    }
  });
  return { failedSlideIds };
}
