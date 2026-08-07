import type {
  SlideElement,
  TextElement,
  ShapeElement,
  ImageElement,
} from "@/components/slide-editor/types";
import { PLACEHOLDER_IMAGE } from "@/components/slide-editor/lib/be-mapper";

/**
 * Convert an AI-generated slide HTML fragment (output of the 3-step
 * /api/slide-design pipeline) into the editor's SlideElement[] model.
 *
 * Strategy: mount the HTML in a hidden 960×540 iframe so the browser
 * computes real layout, then walk the meaningful nodes and read their
 * absolute geometry (getBoundingClientRect) + computed style. Debug
 * chrome (dashed zone/header overlays) is skipped — we only pull
 * `data-layer="content"` children, decoration, and body structural
 * shapes. LaTeX formulas are skipped for now (logged in `skipped`).
 */

const DOC_HEAD = `<script src="https://cdn.tailwindcss.com"></script>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Newsreader:wght@400;500;600;700&family=Roboto:wght@400;500;700&family=JetBrains+Mono&display=swap" rel="stylesheet">
<style>html,body{margin:0;padding:0;}</style>`;

export type ConvertResult = { bg: string; elements: SlideElement[]; skipped: string[] };

/** Optional deck-level options applied during conversion. */
export type ConvertOptions = {
  /** Full-canvas background image (e.g. a slide-asset pattern) placed at z=0. */
  bgImageUrl?: string | null;
  /** Small decorative icon URLs scattered in the canvas corners (z=0, faint). */
  decoIconUrls?: string[];
  /**
   * Materialize each step-2 body zone as an editable editor element. Text
   * zones receive a short label and illustration zones receive an image
   * placeholder. Off for the final step-3 conversion, where zones carry AI
   * generated content instead.
   */
  materializeZonePlaceholders?: boolean;
  /** Static label rendered in the reserved deck header during step 2. */
  headerLabel?: string;
};

let idCounter = 0;
function uid() {
  return `h2s-${Date.now()}-${++idCounter}`;
}

type ZoneGeometry = { x: number; y: number; w: number; h: number };

const ZONE_TEXT_PLACEHOLDERS: Record<string, string> = {
  hero: "Tiêu đề",
  body: "Nội dung",
  caption: "Ghi chú",
  formula: "Công thức",
};

/** Convert a structural zone into the editable element displayed after step 2. */
export function createZonePlaceholder(
  zoneId: string,
  geometry: ZoneGeometry,
  zIndex: number,
  color: string,
): TextElement | ImageElement {
  if (zoneId === "aside") {
    return {
      id: uid(),
      type: "image",
      ...geometry,
      rotation: 0,
      zIndex,
      opacity: 1,
      locked: false,
      contentSlot: zoneId,
      src: PLACEHOLDER_IMAGE,
      fit: "cover",
      borderRadius: 0,
    };
  }

  return {
    id: uid(),
    type: "text",
    ...geometry,
    rotation: 0,
    zIndex,
    opacity: 1,
    locked: false,
    contentSlot: zoneId,
    text: ZONE_TEXT_PLACEHOLDERS[zoneId] ?? "Nội dung",
    fontSize: zoneId === "hero" ? 36 : zoneId === "formula" ? 28 : 18,
    bold: zoneId === "hero" || zoneId === "formula",
    italic: false,
    color: color || "#2b2926",
    align: "left",
    fontFamily: "Inter, sans-serif",
    lineHeight: 1.2,
  };
}

function paint(cs: CSSStyleDeclaration): string {
  const img = cs.backgroundImage;
  if (img && img !== "none") return img; // gradient string survives in fill
  const c = cs.backgroundColor;
  if (!c || c === "rgba(0, 0, 0, 0)" || c === "transparent") return "transparent";
  return c;
}

function alignOf(cs: CSSStyleDeclaration): "left" | "center" | "right" {
  const ta = cs.textAlign;
  if (ta === "center") return "center";
  if (ta === "right" || ta === "end") return "right";
  return "left";
}

function isLatex(el: HTMLElement): boolean {
  if (el.getAttribute("data-slide-el") === "latex") return true;
  const t = el.textContent ?? "";
  return /\\\(|\\\[|\$\$/.test(t);
}

/**
 * Step 3 supplies absolute zones with a finite content budget. Before copying
 * browser-computed geometry into the editor, reduce generated text just enough
 * to fit its own zone. Failing loudly is safer than silently clipping a fact.
 */
function fitZoneContent(root: HTMLElement, win: Window): string[] {
  const failures: string[] = [];
  const minimumFontSize: Record<string, number> = {
    hero: 22,
    body: 12,
    caption: 10,
    formula: 14,
    aside: 10,
  };

  root.querySelectorAll<HTMLElement>('[data-layer="zone"][data-region="body"]').forEach((zone) => {
    const zoneId = zone.dataset.zone ?? "body";
    const content = Array.from(zone.querySelectorAll<HTMLElement>(':scope > [data-layer="content"]'))
      .filter((element) => element.getAttribute("data-slide-el") !== "image" && !element.hasAttribute("data-image-prompt"));
    for (const element of content) {
      const min = minimumFontSize[zoneId] ?? 12;
      let fontSize = parseFloat(win.getComputedStyle(element).fontSize) || min;
      let attempts = 0;
      while (
        attempts < 18 &&
        (element.scrollHeight > zone.clientHeight - 10 || element.scrollWidth > zone.clientWidth - 10) &&
        fontSize > min
      ) {
        fontSize = Math.max(min, Math.floor(fontSize * 0.92 * 10) / 10);
        element.style.fontSize = `${fontSize}px`;
        attempts += 1;
      }
      if (element.scrollHeight > zone.clientHeight - 10 || element.scrollWidth > zone.clientWidth - 10) {
        failures.push(`${zoneId} cannot fit generated content at ${min}px`);
      }
    }
  });
  return failures;
}

export async function htmlToSlideElements(
  html: string,
  opts?: ConvertOptions,
): Promise<ConvertResult> {
  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.cssText =
    "position:fixed;left:-99999px;top:0;width:960px;height:540px;border:0;visibility:hidden;";
  document.body.appendChild(iframe);

  const skipped: string[] = [];
  try {
    const doc = iframe.contentDocument;
    const win = iframe.contentWindow;
    if (!doc || !win) return { bg: "#ffffff", elements: [], skipped: ["no iframe doc"] };

    doc.open();
    doc.write(
      `<!doctype html><html><head><meta charset="utf-8">${DOC_HEAD}</head><body>${html}</body></html>`,
    );
    doc.close();

    // Wait for layout + Tailwind CDN + webfonts to settle.
    await new Promise<void>((res) => {
      if (doc.readyState === "complete") res();
      else iframe.addEventListener("load", () => res(), { once: true });
    });
    await new Promise((r) => setTimeout(r, 400));
    try {
      await (doc as Document & { fonts?: FontFaceSet }).fonts?.ready;
    } catch {
      /* ignore */
    }

    const root =
      (doc.querySelector('[data-layer="bg"]') as HTMLElement | null) ??
      (doc.body.firstElementChild as HTMLElement | null);
    if (!root) return { bg: "#ffffff", elements: [], skipped: ["no root <div data-layer=bg>"] };

    const fitFailures = fitZoneContent(root, win);
    if (fitFailures.length) throw new Error(`Nội dung vượt quá vùng template: ${fitFailures.join(", ")}`);

    const rootRect = root.getBoundingClientRect();
    const cs = (el: Element) => win.getComputedStyle(el);
    const bgPaint = paint(cs(root));
    const bg = bgPaint === "transparent" ? "#ffffff" : bgPaint;

    const elements: SlideElement[] = [];
    let z = 1;

    const geom = (el: HTMLElement) => {
      const r = el.getBoundingClientRect();
      return {
        x: Math.round(r.left - rootRect.left),
        y: Math.round(r.top - rootRect.top),
        w: Math.round(r.width),
        h: Math.round(r.height),
      };
    };

    const pushText = (el: HTMLElement, text: string) => {
      const t = text.trim();
      if (!t) return;
      const g = geom(el);
      if (g.w < 2 || g.h < 2) return;
      const s = cs(el);
      const fontSize = Math.round(parseFloat(s.fontSize)) || 24;
      // Carry the metrics the editor would otherwise default differently
      // (line-height 1.2, no letter-spacing, page font) so its re-render
      // matches the geometry we measured here — otherwise tighter
      // line-height/letter-spacing text overflows its fixed, clipped box.
      const lhPx = parseFloat(s.lineHeight);
      const lineHeight =
        Number.isFinite(lhPx) && fontSize > 0
          ? Math.round((lhPx / fontSize) * 100) / 100
          : undefined;
      const lsPx = parseFloat(s.letterSpacing);
      const letterSpacing = Number.isFinite(lsPx) && lsPx !== 0 ? lsPx : undefined;
      // The editor caps font-weight to 400/700 and uses its own page font, so
      // re-rendered text can be a hair wider than measured and wrap one extra
      // line into the clipped box (notably weight-600 labels rounded up to
      // 700). Pad the width to absorb that without forcing the re-wrap.
      const padW = Math.min(28, Math.ceil(g.w * 0.06) + 2);
      const textEl: TextElement = {
        id: uid(),
        type: "text",
        x: g.x,
        y: g.y,
        w: g.w + padW,
        h: g.h + 2, // headroom against sub-pixel rounding in the editor render
        rotation: 0,
        zIndex: z++,
        opacity: parseFloat(s.opacity) || 1,
        locked: false,
        text: t,
        fontSize,
        bold: (parseInt(s.fontWeight, 10) || 400) >= 600,
        italic: s.fontStyle === "italic",
        color: s.color || "#2b2926",
        align: alignOf(s),
        fontFamily: s.fontFamily || undefined,
        lineHeight,
        letterSpacing,
      };
      elements.push(textEl);
    };

    const pushShape = (el: HTMLElement) => {
      const g = geom(el);
      if (g.w < 2 || g.h < 2) return;
      const s = cs(el);
      const inlineBr = el.style.borderRadius || "";
      const brPx = parseFloat(s.borderTopLeftRadius) || 0;
      const ellipse =
        inlineBr.includes("50%") || (brPx > 0 && brPx >= (Math.min(g.w, g.h) / 2) * 0.9);
      const bw = parseFloat(s.borderTopWidth) || 0;
      const shapeEl: ShapeElement = {
        id: uid(),
        type: "shape",
        shape: ellipse ? "ellipse" : "rect",
        x: g.x,
        y: g.y,
        w: g.w,
        h: g.h,
        rotation: 0,
        zIndex: z++,
        opacity: parseFloat(s.opacity) || 1,
        locked: false,
        fill: paint(s),
        stroke: bw > 0 ? s.borderTopColor : "transparent",
        strokeW: Math.round(bw),
        borderRadius: ellipse ? 0 : Math.round(brPx),
      };
      elements.push(shapeEl);
    };

    const pushImage = (
      el: HTMLElement,
      src: string,
      fit: ImageElement["fit"],
    ) => {
      const g = geom(el);
      if (g.w < 2 || g.h < 2) return;
      const imgEl: ImageElement = {
        id: uid(),
        type: "image",
        x: g.x,
        y: g.y,
        w: g.w,
        h: g.h,
        rotation: 0,
        zIndex: z++,
        opacity: 1,
        locked: false,
        src,
        fit,
        borderRadius: 0,
      };
      elements.push(imgEl);
    };

    // Step 2 turns zones into editable text/image elements instead of keeping
    // them as a wireframe. Step 3 replaces these placeholders with AI content.
    const pushZonePlaceholder = (el: HTMLElement) => {
      const g = geom(el);
      if (g.w < 2 || g.h < 2) return;
      const s = cs(el);
      const placeholder = createZonePlaceholder(el.dataset.zone ?? "body", g, z++, s.color);
      placeholder.contentSlot = el.dataset.slot ?? `${el.dataset.zone ?? "body"}-1`;
      elements.push(placeholder);
    };

    const pushHeaderPlaceholder = (el: HTMLElement, label: string) => {
      const g = geom(el);
      if (g.w < 2 || g.h < 2) return;
      const s = cs(el);
      elements.push({
        id: uid(), type: "text", x: g.x + 12, y: g.y + 8, w: Math.max(2, g.w - 24), h: Math.max(2, g.h - 16),
        rotation: 0, zIndex: z++, opacity: 1, locked: false, contentSlot: "header-1", text: label,
        fontSize: 14, bold: true, italic: false, color: s.color || "#2b2926", align: "left", fontFamily: "Inter, sans-serif", lineHeight: 1.2,
      });
    };

    // 1) L1 decoration (flat: text numerals + geometric shapes)
    root.querySelectorAll<HTMLElement>('[data-layer="deco"]').forEach((el) => {
      if (el.getAttribute("data-slide-el") === "text")
        pushText(el, el.innerText ?? el.textContent ?? "");
      else pushShape(el);
    });

    // 2) L2 body structural shapes (card / sidebar / divider) — skip header band (debug)
    root
      .querySelectorAll<HTMLElement>('[data-layer="struct"][data-region="body"]')
      .forEach((el) => pushShape(el));

    // 2b) Step-2 only: editable text/image placeholders for each content zone.
    if (opts?.materializeZonePlaceholders) {
      root
        .querySelectorAll<HTMLElement>('[data-layer="zone"][data-region="body"]')
        .forEach((el) => pushZonePlaceholder(el));
      if (opts.headerLabel) {
        const header = root.querySelector<HTMLElement>('[data-region="header"]');
        if (header) pushHeaderPlaceholder(header, opts.headerLabel);
      }
    }

    // 3) Header content label (SUBJECT · TOPIC)
    root
      .querySelectorAll<HTMLElement>('[data-region="header"] [data-layer="content"]')
      .forEach((el) => pushText(el, el.innerText ?? el.textContent ?? ""));

    // 4) L3 content inside zones (hero / body / aside / caption / formula)
    root.querySelectorAll<HTMLElement>('[data-layer="zone"] [data-layer="content"]').forEach((el) => {
      const tag = el.tagName.toLowerCase();
      const slideEl = el.getAttribute("data-slide-el");
      if (slideEl === "image" || el.hasAttribute("data-image-prompt")) {
        // The real illustration is added manually / in a later step. Keep a
        // gray placeholder here and log the prompt so that step knows what
        // image to insert. Decorative icons are NOT used as content images.
        const prompt = el.getAttribute("data-image-prompt");
        if (prompt) skipped.push(`image-prompt(unstored): ${prompt.slice(0, 60)}`);
        pushImage(el, PLACEHOLDER_IMAGE, "cover");
        return;
      }
      if (isLatex(el)) {
        skipped.push(`latex(skipped): ${(el.textContent ?? "").trim().slice(0, 40)}`);
        return;
      }
      if (tag === "ul" || tag === "ol") {
        const items = Array.from(el.querySelectorAll("li"))
          .map((li) => "• " + (li.textContent ?? "").trim())
          .filter((s) => s.length > 2);
        pushText(el, items.join("\n"));
        return;
      }
      pushText(el, el.innerText ?? el.textContent ?? "");
    });

    // Deck-level decorative icons: a few faint science icons scattered in the
    // canvas corners (doodle style). z=0 + low opacity so they sit above the
    // background pattern but behind all content (content z ≥ 1) — they peek out
    // in the margins and never cover text. Locked. Unshifted BEFORE the
    // background so the background ends up at array index 0 (bottom-most).
    const DECO_SLOTS = [
      { x: 24, y: 430, w: 86, h: 86, rotation: -8 }, // bottom-left
      { x: 850, y: 442, w: 80, h: 80, rotation: 6 }, // bottom-right
      { x: 854, y: 96, w: 78, h: 78, rotation: 10 }, // top-right
    ];
    (opts?.decoIconUrls ?? []).slice(0, DECO_SLOTS.length).forEach((src, i) => {
      const slot = DECO_SLOTS[i];
      elements.unshift({
        id: uid(),
        type: "image",
        x: slot.x,
        y: slot.y,
        w: slot.w,
        h: slot.h,
        rotation: slot.rotation,
        zIndex: 0,
        opacity: 0.16,
        locked: true,
        src,
        fit: "contain",
        borderRadius: 0,
      });
    });

    // Deck-level decorative background pattern: a full-canvas image under
    // everything (z=0). The pattern SVG is transparent so the mood color (bg)
    // still shows through. Locked so the user does not drag it by accident.
    if (opts?.bgImageUrl) {
      elements.unshift({
        id: uid(),
        type: "image",
        x: 0,
        y: 0,
        w: 960,
        h: 540,
        rotation: 0,
        zIndex: 0,
        opacity: 1,
        locked: true,
        src: opts.bgImageUrl,
        fit: "cover",
        borderRadius: 0,
      });
    }

    return { bg, elements, skipped };
  } finally {
    iframe.remove();
  }
}
