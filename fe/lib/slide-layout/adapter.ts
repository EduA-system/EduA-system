import type { SlideItem } from "@/lib/api/slides";
import { deriveDensity } from "./metrics";
import type { ContentBlock, SlideLayoutInput } from "./types";

export const SLIDE_LAYOUT_ALGORITHM_VERSION = 1;

export type LayoutRuntime = {
  deckSeed: string;
  runNonce: number;
  bodyTop: number;
  algorithmVersion?: number;
};

export function slideToLayoutInput(slide: SlideItem, runtime: LayoutRuntime): SlideLayoutInput {
  const titleBlock: ContentBlock = {
    id: `${slide.id}:title`,
    kind: "text",
    role: "hero",
    semanticType: "title",
    priority: "primary",
    required: true,
    text: slide.title,
  };
  const blocks = [titleBlock, ...slide.contentPlan.blocks];
  return {
    schemaVersion: 1,
    slideId: slide.id,
    deckSeed: runtime.deckSeed,
    runNonce: runtime.runNonce,
    algorithmVersion: runtime.algorithmVersion ?? SLIDE_LAYOUT_ALGORITHM_VERSION,
    slideType: slide.contentPlan.slideType,
    headerMode: slide.contentPlan.headerMode,
    canvas: { width: 960, height: 540 },
    bodyTop: runtime.bodyTop,
    density: deriveDensity(blocks),
    blocks,
    relationships: slide.contentPlan.relationships,
  };
}

export function bodyTopFromSkinHtml(html: string): number {
  const explicit = html.match(/data-body-top=["'](\d+(?:\.\d+)?)["']/i)?.[1];
  if (explicit) return Math.max(48, Math.min(180, Number(explicit)));
  const header = html.match(/data-region=["']header["'][^>]*data-bbox-(?:h|height)=["'](\d+(?:\.\d+)?)["']/i)?.[1];
  return header ? Math.max(64, Math.min(180, Number(header) + 24)) : 84;
}

