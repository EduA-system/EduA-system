import type { SlideItem } from "@/lib/api/slides";
import type { SlideContentSlot } from "@/lib/api/slide-design";
import type { SlideLayoutResult } from "@/lib/slide-layout/types";

/**
 * In-memory state shared by the three manually triggered design steps.
 * It is intentionally lost on a full page reload, which restarts the flow
 * from step 1.
 */
export type SlideDesignContext = {
  topic: string;
  subject?: string;
  styleHint?: string;
  skinHtml: string;
  skinBg: string;
  bodyTop: number;
  deckSeed: string;
  layoutResultsBySlide: Map<string, SlideLayoutResult>;
  contentSlotsBySlide: Map<string, SlideContentSlot[]>;
  bgImageUrl: string | null;
  decoIconUrls: string[];
  slidesById: Map<string, SlideItem>;
};

let current: SlideDesignContext | null = null;

export function setSlideDesignContext(ctx: SlideDesignContext) {
  current = ctx;
}

export function getSlideDesignContext(): SlideDesignContext | null {
  return current;
}
