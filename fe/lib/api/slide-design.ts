import { logSlideApi } from "@/lib/ws/slide-debug-log";
import type { SlideContentSlot } from "@/lib/slide-create/layout-templates";

const BE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

export type SlideDesignStep = "bg_deco" | "structural" | "content_fill";

export type SlideHtmlDesignRequest = {
  topic: string;
  outline: string;
  styleHint?: string;
  subject?: string;
  /** Required: the BE only supports the 3-step pipeline (no single-call design). */
  step: SlideDesignStep;
  /** Required when step === "structural" or "content_fill": prior step's HTML. */
  priorHtml?: string;
};

export type SlideHtmlDesignResponse = {
  html: string;
  latencyMs: number;
  modelUsed: string;
  warning?: string | null;
};

export type SlideContentStyle = {
  fontSize?: number | null;
  color?: string | null;
  bold?: boolean | null;
  italic?: boolean | null;
  align?: "left" | "center" | "right" | null;
};

export type SlideContentFillSlot = {
  slotId: string;
  text: string | null;
  imagePrompt: string | null;
  style?: SlideContentStyle | null;
};

export type SlideContentFillResponse = {
  slots: SlideContentFillSlot[];
  latencyMs: number;
  modelUsed: string;
  warning?: string | null;
};

export type SlideContentFillRequest = {
  topic: string;
  outline: string;
  styleHint?: string;
  subject?: string;
  slots: SlideContentSlot[];
  palette: string[];
};

export async function generateSlideHtmlDesign(
  req: SlideHtmlDesignRequest,
): Promise<SlideHtmlDesignResponse> {
  logSlideApi("POST /api/slide-design/generate-html", {
    step: req.step,
    topic: req.topic,
    priorHtmlChars: req.priorHtml?.length ?? 0,
  });
  const res = await fetch(`${BE}/api/slide-design/generate-html`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    const message = `POST /api/slide-design/generate-html ${res.status}: ${detail || res.statusText}`;
    console.error("[EDUA slide] [API] generate-html failed", message);
    throw new Error(message);
  }
  const data = (await res.json()) as SlideHtmlDesignResponse;
  logSlideApi("generate-html OK", {
    step: req.step,
    htmlChars: data.html.length,
    latencyMs: data.latencyMs,
    warning: data.warning ?? null,
  });
  return data;
}

export async function fillSlideContent(req: SlideContentFillRequest): Promise<SlideContentFillResponse> {
  logSlideApi("POST /api/slide-design/fill-content", {
    topic: req.topic,
    slots: req.slots.map((slot) => slot.id),
    outlineChars: req.outline.length,
  });
  const res = await fetch(`${BE}/api/slide-design/fill-content`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`POST /api/slide-design/fill-content ${res.status}: ${detail || res.statusText}`);
  }
  const data = (await res.json()) as SlideContentFillResponse;
  logSlideApi("fill-content OK", {
    slots: data.slots.length,
    latencyMs: data.latencyMs,
    warning: data.warning ?? null,
  });
  return data;
}
