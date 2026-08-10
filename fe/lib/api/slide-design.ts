import type { Molecule } from "@/components/molecules/types";
import type { PeriodicSimulationPayload } from "@/components/slide-editor/types";
import { BACKEND_HTTP_URL } from "@/lib/backend-url";
import { logSlideApi } from "@/lib/ws/slide-debug-log";

const BE = BACKEND_HTTP_URL;

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
  /** Real generated illustration URL (OpenAI Images → R2), null/absent when not yet/failed to generate. */
  imageUrl?: string | null;
  style?: SlideContentStyle | null;
  /** Frontend-only: set locally by runContentFillStep for molecule slots, never sent to/from the backend. */
  molecule?: Molecule;
  /** Frontend-only: set locally by runContentFillStep for periodic slots, never sent to/from the backend. */
  periodic?: PeriodicSimulationPayload;
  /** Frontend-only: preset thí nghiệm vật lý mà runContentFillStep phân giải được, không đi qua backend. */
  sandbox?: { experimentId: string; presetId: string; title: string };
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

export type SlideContentSlot = {
  id: string;
  kind: "text" | "image";
  zone: string;
  sourceBlockId: string;
  sourcePartId?: string;
  sourceText: string;
  maxChars: number;
  maxLines: number;
  hint: string;
  /** Slot's actual box size in px (from the layout engine) — lets the BE pick a matching
   * OpenAI image size (landscape/portrait/square) instead of always generating a square. */
  width?: number;
  height?: number;
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

export type SlideImageGenerateRequest = {
  /** Mô tả ảnh — chính là `imagePrompt` mà bước 3 đã gắn vào element placeholder. */
  prompt: string;
  /** Kích thước khung ảnh trên canvas (px) để BE chọn tỉ lệ ảnh khớp khung. */
  width?: number;
  height?: number;
};

export type SlideImageGenerateResponse = {
  imageUrl: string;
};

/**
 * Sinh lại một ảnh minh hoạ lẻ cho slot bị lỗi ở bước 3, gọi từ nút "tạo lại ảnh" trong
 * slide editor. Khác `fillSlideContent`: không chạm tới text/slot khác nên không tốn call AI
 * text nào, và lỗi trả về 502 thay vì bị nuốt thành ảnh rỗng.
 */
export async function generateSlideImage(req: SlideImageGenerateRequest): Promise<SlideImageGenerateResponse> {
  logSlideApi("POST /api/slide-design/generate-image", {
    promptChars: req.prompt.length,
    width: req.width ?? null,
    height: req.height ?? null,
  });
  const res = await fetch(`${BE}/api/slide-design/generate-image`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`POST /api/slide-design/generate-image ${res.status}: ${detail || res.statusText}`);
  }
  const data = (await res.json()) as SlideImageGenerateResponse;
  logSlideApi("generate-image OK", { imageUrl: data.imageUrl });
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
