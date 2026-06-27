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
   * Stamp each step-2 body zone (data-layer="zone") as a bordered rect frame
   * (transparent fill) so the layout is previewable before content fills in.
   * Off for the final step-3 conversion (zones carry real content by then).
   */
  includeZoneFrames?: boolean;
};

let idCounter = 0;
function uid() {
  return `h2s-${Date.now()}-${++idCounter}`;
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
        color: s.color || "#1e293b",
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

    // Step-2 preview: stamp each body zone as a bordered frame (transparent
    // fill) so the layout is visible before content fills in. The zone div's
    // own dashed outline color/width becomes a solid stroke (the editor's
    // ShapeElement has no dashed style).
    const pushZoneFrame = (el: HTMLElement) => {
      const g = geom(el);
      if (g.w < 2 || g.h < 2) return;
      const s = cs(el);
      const ow = parseFloat(s.outlineWidth) || 2;
      const oc =
        s.outlineColor && s.outlineColor !== "transparent"
          ? s.outlineColor
          : "rgba(15, 23, 42, 0.45)";
      const brPx = parseFloat(s.borderTopLeftRadius) || 0;
      const frameEl: ShapeElement = {
        id: uid(),
        type: "shape",
        shape: "rect",
        x: g.x,
        y: g.y,
        w: g.w,
        h: g.h,
        rotation: 0,
        zIndex: z++,
        opacity: 1,
        locked: false,
        fill: "transparent",
        stroke: oc,
        strokeW: Math.max(1, Math.round(ow)),
        borderRadius: Math.round(brPx),
      };
      elements.push(frameEl);
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

    // 2b) Step-2 preview only: bordered zone frames (no content yet)
    if (opts?.includeZoneFrames) {
      root
        .querySelectorAll<HTMLElement>('[data-layer="zone"][data-region="body"]')
        .forEach((el) => pushZoneFrame(el));
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
