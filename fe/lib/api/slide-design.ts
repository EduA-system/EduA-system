import { logSlideApi } from "@/lib/ws/slide-debug-log";

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
