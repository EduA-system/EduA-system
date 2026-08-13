import { fillSlideContent, generateSlideHtmlDesign, type SlideContentFillResponse, type SlideContentFillSlot } from "@/lib/api/slide-design";
import { buildMolecule } from "@/lib/api/molecule-build";
import { resolvePeriodicPayload } from "@/lib/periodic-table/resolve-periodic";
import { resolvePhysicsPreset } from "@/lib/slide-layout/resolve-physics-preset";
import { listSandboxExperiments } from "@/lib/api/sandbox-experiments";
import type { OutlinePart, SlideItem } from "@/lib/api/slides";
import { htmlToSlideElements } from "@/components/slide-editor/lib/html-to-slide";
import { pickBackground, pickDecoIcons } from "@/lib/slide-assets/resolve";
import type { SlideElement } from "@/components/slide-editor/types";
import { logSlideApi } from "@/lib/ws/slide-debug-log";
import { bodyTopFromSkinHtml, slideToLayoutInput } from "@/lib/slide-layout/adapter";
import { generateSlideLayout } from "@/lib/slide-layout/engine";
import { renderSlideLayout } from "@/lib/slide-layout/renderer";
import { randomRunNonce } from "@/lib/slide-layout/random";
import { blockText } from "@/lib/slide-layout/metrics";
import {
  getSlideDesignContext,
  setSlideDesignContext,
} from "@/lib/slide-create/design-session";
import { slidesWithQuizAnswerReveals } from "@/lib/slide-create/quiz-answer-slides";

export type DesignPipelineInput = {
  topic: string;
  subject?: string;
  styleHint?: string;
  parts: OutlinePart[];
};

export type StepCallbacks = {
  onSkinReady?: (skin: { bg: string; elements: SlideElement[] }) => void;
  onSlideFrames?: (slideId: string, result: { bg: string; elements: SlideElement[] }) => void;
  onSlideReady?: (slideId: string, result: SlideContentFillResponse, title: string) => void;
  onSlideFailed?: (slideId: string, message: string) => void;
};

export type StepRunResult = {
  failedSlideIds: string[];
};

function slideOutlineText(slide: SlideItem): string {
  const sections = slide.contentPlan.blocks.map((block) => `[${block.id}/${block.kind}] ${blockText(block)}`);
  if (slide.aiNote?.trim()) sections.push(`AI note: ${slide.aiNote.trim()}`);
  return [`${slide.title} (${slide.pedagogicalRole})`, ...sections].join("\n\n");
}

function flattenSlides(parts: OutlinePart[]): SlideItem[] {
  return slidesWithQuizAnswerReveals(parts);
}

function isTitleSlot(slot: { id: string; sourceBlockId: string }): boolean {
  return slot.id.endsWith(":title") || slot.sourceBlockId.endsWith(":title");
}

function paletteFromSkin(skinHtml: string): string[] {
  const skinWithoutSurfaceMetadata = skinHtml.replace(/data-surface-color=["']#[0-9a-fA-F]{6}["']/gi, "");
  const colors = skinWithoutSurfaceMetadata.match(/#[0-9a-fA-F]{6}/g) ?? [];
  const palette = [...new Set(colors.map((color) => color.toLowerCase()))].slice(0, 6);
  return palette.length ? palette : ["#2b2926", "#ffffff", "#d97757"];
}

function relativeLuminance(hex: string): number {
  const weights = [0.2126, 0.7152, 0.0722];
  return [1, 3, 5]
    .map((index) => Number.parseInt(hex.slice(index, index + 2), 16) / 255)
    .map((channel) => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4)
    .reduce((sum, channel, index) => sum + channel * weights[index], 0);
}

function surfaceColorFromSkin(skinHtml: string, palette: string[]): string {
  const selected = skinHtml.match(/data-surface-color=["'](#[0-9a-fA-F]{6})["']/i)?.[1];
  if (selected) return selected.toLowerCase();
  return [...palette].sort((left, right) => relativeLuminance(right) - relativeLuminance(left))[0] ?? "#ffffff";
}

const SLIDE_CONCURRENCY = 4;
const CONTENT_SLOT_BATCH_SIZE = 6;
const MAX_GENERATED_IMAGES_PER_DECK = 15;

async function runPool<T>(items: T[], limit: number, worker: (item: T) => Promise<void>): Promise<void> {
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) await worker(items[next++]);
    }),
  );
}

/** Keeps one AI response small enough to reliably finish its JSON object. */
async function fillContentInBatches(request: Parameters<typeof fillSlideContent>[0]): Promise<SlideContentFillResponse> {
  const responses: SlideContentFillResponse[] = [];
  for (let index = 0; index < request.slots.length; index += CONTENT_SLOT_BATCH_SIZE) {
    responses.push(await fillSlideContent({
      ...request,
      slots: request.slots.slice(index, index + CONTENT_SLOT_BATCH_SIZE),
    }));
  }
  return {
    slots: responses.flatMap((response) => response.slots),
    latencyMs: responses.reduce((total, response) => total + response.latencyMs, 0),
    modelUsed: [...new Set(responses.map((response) => response.modelUsed))].join(", "),
    warning: responses.map((response) => response.warning).find((warning) => warning != null) ?? null,
  };
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
    skinBg: "#ffffff",
    bodyTop: bodyTopFromSkinHtml(step1.html),
    deckSeed: `${topic}:${slides.map((slide) => slide.id).join(",")}`,
    layoutResultsBySlide: new Map(),
    contentSlotsBySlide: new Map(),
    bgImageUrl,
    decoIconUrls,
    slidesById: new Map(slides.map((slide) => [slide.id, slide])),
  });

  try {
    const { bg, elements, skipped } = await htmlToSlideElements(step1.html, { bgImageUrl, decoIconUrls });
    const current = getSlideDesignContext();
    if (current) current.skinBg = bg;
    if (skipped.length) logSlideApi("design step 1: skin skipped elements", { skipped });
    cb.onSkinReady?.({ bg, elements });
  } catch (error) {
    logSlideApi("design step 1: skin convert failed", {
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

/** Step 2: generate a constraint-based layout and render editor elements directly. */
export async function runStructuralStep(
  cb: Pick<StepCallbacks, "onSlideFrames" | "onSlideFailed"> = {},
): Promise<StepRunResult> {
  const ctx = getSlideDesignContext();
  if (!ctx) throw new Error("Chưa có kết quả Bước 1. Vui lòng chạy Bước 1 trước.");

  const failedSlideIds: string[] = [];
  const runNonce = randomRunNonce();
  ctx.layoutResultsBySlide.clear();
  ctx.contentSlotsBySlide.clear();
  await runPool([...ctx.slidesById.values()], SLIDE_CONCURRENCY, async (slide) => {
    try {
      const input = slideToLayoutInput(slide, { deckSeed: ctx.deckSeed, runNonce, bodyTop: ctx.bodyTop });
      const result = generateSlideLayout(input);
      // Molecule slots skip the fill-content request entirely (resolved via buildMolecule in Step 3,
      // reading `layoutResultsBySlide` directly) — keep the fill-content contract untouched.
      const slots = result.slots
        .filter((slot): slot is typeof slot & { kind: "text" | "image" } => slot.kind === "text" || slot.kind === "image")
        .map((slot) => ({
          id: slot.id,
          kind: slot.kind,
          zone: slot.zone,
          sourceBlockId: slot.sourceBlockId,
          sourcePartId: slot.sourcePartId,
          sourceText: slot.sourceText,
          maxChars: slot.maxChars,
          maxLines: slot.maxLines,
          hint: slot.contentHint,
          width: slot.rect.w,
          height: slot.rect.h,
        }));
      ctx.layoutResultsBySlide.set(slide.id, result);
      ctx.contentSlotsBySlide.set(slide.id, slots);
      logSlideApi("design step 2: dynamic layout generated", { slide: slide.id, family: result.family, topology: result.topology, seed: result.seed });
      const palette = paletteFromSkin(ctx.skinHtml);
      cb.onSlideFrames?.(slide.id, {
        bg: ctx.skinBg,
        elements: renderSlideLayout(result, {
          palette,
          surfaceColor: surfaceColorFromSkin(ctx.skinHtml, palette),
          backgroundColor: ctx.skinBg,
          headerLabel: [ctx.subject, ctx.topic].filter(Boolean).join(" · "),
        }),
      });
    } catch (error) {
      failedSlideIds.push(slide.id);
      cb.onSlideFailed?.(slide.id, error instanceof Error ? error.message : String(error));
    }
  });
  return { failedSlideIds };
}

/** Step 3: ask AI for compact slot content, then update the existing editor elements. */
export async function runContentFillStep(
  cb: Pick<StepCallbacks, "onSlideReady" | "onSlideFailed"> = {},
): Promise<StepRunResult> {
  const ctx = getSlideDesignContext();
  if (!ctx) throw new Error("Chưa có kết quả Bước 1. Vui lòng chạy Bước 1 trước.");

  const failedSlideIds: string[] = [];
  const imageGenerationSlotKeys = new Set<string>();
  for (const slide of ctx.slidesById.values()) {
    const slots = ctx.contentSlotsBySlide.get(slide.id) ?? [];
    for (const slot of slots) {
      if (imageGenerationSlotKeys.size >= MAX_GENERATED_IMAGES_PER_DECK) break;
      if (slot.kind === "image" && !isTitleSlot(slot)) imageGenerationSlotKeys.add(`${slide.id}:${slot.id}`);
    }
    if (imageGenerationSlotKeys.size >= MAX_GENERATED_IMAGES_PER_DECK) break;
  }
  await runPool([...ctx.slidesById.values()], SLIDE_CONCURRENCY, async (slide) => {
    try {
      const slots = ctx.contentSlotsBySlide.get(slide.id) ?? [];
      const layoutSlots = ctx.layoutResultsBySlide.get(slide.id)?.slots ?? [];
      if (!slots.length && !layoutSlots.length) throw new Error("Slide chưa có placeholder từ Bước 2.");
      const fillableSlots = slots.filter((slot) =>
        !isTitleSlot(slot) && (slot.kind !== "image" || imageGenerationSlotKeys.has(`${slide.id}:${slot.id}`)));
      const moleculeSlots = layoutSlots.filter((slot) => slot.kind === "molecule" && !isTitleSlot(slot));
      const periodicSlots = layoutSlots.filter((slot) => slot.kind === "periodic" && !isTitleSlot(slot));
      const physicsSlots = layoutSlots.filter((slot) => slot.kind === "physics" && !isTitleSlot(slot));

      if (!fillableSlots.length && !moleculeSlots.length && !periodicSlots.length && !physicsSlots.length) {
        cb.onSlideReady?.(slide.id, { slots: [], latencyMs: 0, modelUsed: "outline-title" }, slide.title);
        return;
      }

      // Danh mục thí nghiệm nạp một lần cho cả lượt chạy (client tự cache),
      // rồi truyền vào hàm thuần resolvePhysicsPreset.
      const physicsCatalogue = physicsSlots.length ? await listSandboxExperiments() : [];

      const [response, moleculeFills, periodicFills, physicsFills] = await Promise.all([
        fillableSlots.length
          ? fillContentInBatches({
              topic: ctx.topic,
              outline: slideOutlineText(slide),
              subject: ctx.subject,
              styleHint: ctx.styleHint,
              slots: fillableSlots,
              palette: paletteFromSkin(ctx.skinHtml),
            })
          : Promise.resolve<SlideContentFillResponse>({ slots: [], latencyMs: 0, modelUsed: "outline-title" }),
        Promise.all(moleculeSlots.map(async (slot): Promise<SlideContentFillSlot> => ({
          slotId: slot.id,
          text: null,
          imagePrompt: null,
          imageUrl: null,
          molecule: await buildMolecule(slot.sourceText),
        }))),
        Promise.all(periodicSlots.map(async (slot): Promise<SlideContentFillSlot | null> => {
          const sourceBlock = slide.contentPlan.blocks.find((block) => block.id === slot.sourceBlockId);
          const declaredSymbols = sourceBlock?.kind === "periodic" ? sourceBlock.elementSymbols : undefined;
          const periodic = resolvePeriodicPayload(slot.sourceText, declaredSymbols);
          if (!periodic) return null;
          return {
            slotId: slot.id,
            text: null,
            imagePrompt: null,
            imageUrl: null,
            periodic,
          };
        })),
        Promise.all(physicsSlots.map(async (slot): Promise<SlideContentFillSlot | null> => {
          // Không khớp được thì BỎ slot, không đoán bừa: chèn nhầm thí nghiệm
          // vào bài giảng tệ hơn hẳn so với để trống.
          const preset = resolvePhysicsPreset(slot.sourceText, physicsCatalogue);
          if (!preset) return null;
          return {
            slotId: slot.id,
            text: null,
            imagePrompt: null,
            imageUrl: null,
            sandbox: { experimentId: preset.id, presetId: preset.presetId, title: preset.title },
          };
        })),
      ]);

      const mergedSlots = [
        ...response.slots,
        ...moleculeFills,
        ...periodicFills.filter((slot): slot is SlideContentFillSlot => slot != null),
        ...physicsFills.filter((slot): slot is SlideContentFillSlot => slot != null),
      ];
      // Rỗng chỉ là lỗi khi slide có slot cần AI điền chữ. Molecule/periodic/
      // physics phân giải cục bộ và được phép không khớp — slide mô phỏng khi đó
      // vẫn giữ placeholder của Bước 2 thay vì bị đánh hỏng.
      if (!mergedSlots.length && fillableSlots.length) throw new Error("AI trả về rỗng, không có nội dung slot.");
      cb.onSlideReady?.(slide.id, { ...response, slots: mergedSlots }, slide.title);
    } catch (error) {
      failedSlideIds.push(slide.id);
      cb.onSlideFailed?.(slide.id, error instanceof Error ? error.message : String(error));
    }
  });
  return { failedSlideIds };
}
