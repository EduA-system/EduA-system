import type { SlideItem } from "@/lib/api/slides";

/**
 * In-memory snapshot of the last design pipeline run, kept around after
 * runDesignPipeline finishes so a single slide can be regenerated later
 * (retry button) without re-running step 1 (deck skin) or re-fetching the
 * outline. Lost on full page reload — that's fine, the deck is already on
 * screen and step 1 is expensive/deck-wide to redo just for one slide.
 */
export type SlideDesignContext = {
  topic: string;
  subject?: string;
  styleHint?: string;
  skinHtml: string;
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
