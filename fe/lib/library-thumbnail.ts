import { CANVAS_H, CANVAS_W, type Slide, type SlideElement } from "@/components/slide-editor/types";

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function dataUri(svg: string) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function textLines(value: string, maxLength: number, maxLines: number) {
  const words = value.replace(/\s+/g, " ").trim().split(" ");
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (next.length > maxLength && line) {
      lines.push(line);
      line = word;
      if (lines.length === maxLines) break;
    } else {
      line = next;
    }
  }
  if (line && lines.length < maxLines) lines.push(line);
  return lines;
}

function documentText(value: unknown): string[] {
  const result: string[] = [];
  const walk = (node: unknown) => {
    if (!node || typeof node !== "object" || result.length >= 3) return;
    const current = node as { text?: unknown; content?: unknown };
    if (typeof current.text === "string" && current.text.trim()) result.push(current.text.trim());
    if (Array.isArray(current.content)) current.content.forEach(walk);
  };
  walk(value);
  return result;
}

export function createLessonThumbnail(title: string, subject: string | null | undefined, document: unknown) {
  const excerpts = documentText(document).filter((item) => item !== title).slice(0, 2);
  const titleSvg = textLines(title, 28, 3).map((line, index) => `<text x="72" y="${180 + index * 64}" class="title">${escapeXml(line)}</text>`).join("");
  const excerptSvg = excerpts.map((excerpt, index) => `<text x="72" y="${408 + index * 34}" class="body">${escapeXml(textLines(excerpt, 55, 1)[0] ?? "")}</text>`).join("");
  return dataUri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 540"><defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#e4f7f4"/><stop offset="1" stop-color="#d7eafa"/></linearGradient></defs><style>.title{font:700 48px Arial,sans-serif;fill:#173d4a}.body{font:400 21px Arial,sans-serif;fill:#54717c}.label{font:700 18px Arial,sans-serif;letter-spacing:3px;fill:#19736e}</style><rect width="960" height="540" rx="36" fill="url(#bg)"/><path d="M690 0h270v540H520z" fill="#ffffff" opacity=".38"/><rect x="72" y="70" width="216" height="42" rx="21" fill="#ffffff" opacity=".8"/><text x="98" y="98" class="label">${escapeXml(subject ?? "GIÁO ÁN")}</text>${titleSvg}<line x1="72" y1="362" x2="370" y2="362" stroke="#7db8b2" stroke-width="6" stroke-linecap="round"/>${excerptSvg}</svg>`);
}

function slideBackground(background: string) {
  return background.startsWith("#") || background.startsWith("rgb") ? background : "#20334f";
}

function renderElement(element: SlideElement): string {
  const opacity = Number.isFinite(element.opacity) ? ` opacity="${element.opacity}"` : "";
  const transform = element.rotation ? ` transform="rotate(${element.rotation} ${element.x + element.w / 2} ${element.y + element.h / 2})"` : "";
  if (element.type === "text") {
    const lines = textLines(element.text, Math.max(12, Math.floor(element.w / Math.max(element.fontSize * 0.55, 1))), Math.max(1, Math.floor(element.h / Math.max(element.fontSize * 1.2, 1))));
    return `<text x="${element.x}" y="${element.y + element.fontSize}" fill="${escapeXml(element.color)}" font-family="${escapeXml(element.fontFamily ?? "Arial")}" font-size="${element.fontSize}" font-weight="${element.bold ? 700 : 400}"${opacity}${transform}>${lines.map((line, index) => `<tspan x="${element.x}" dy="${index ? element.fontSize * (element.lineHeight ?? 1.2) : 0}">${escapeXml(line)}</tspan>`).join("")}</text>`;
  }
  if (element.type === "shape") return element.shape === "ellipse" ? `<ellipse cx="${element.x + element.w / 2}" cy="${element.y + element.h / 2}" rx="${element.w / 2}" ry="${element.h / 2}" fill="${escapeXml(element.fill)}" stroke="${escapeXml(element.stroke)}" stroke-width="${element.strokeW}"${opacity}${transform}/>` : `<rect x="${element.x}" y="${element.y}" width="${element.w}" height="${element.h}" rx="${element.borderRadius}" fill="${escapeXml(element.fill)}" stroke="${escapeXml(element.stroke)}" stroke-width="${element.strokeW}"${opacity}${transform}/>`;
  if (element.type === "image") return `<image href="${escapeXml(element.src)}" x="${element.x}" y="${element.y}" width="${element.w}" height="${element.h}" preserveAspectRatio="xMidYMid slice"${opacity}${transform}/>`;
  if (element.type === "poly") return `<svg x="${element.x}" y="${element.y}" width="${element.w}" height="${element.h}" viewBox="${escapeXml(element.svgViewBox)}"${opacity}${transform}><path d="${escapeXml(element.svgPath)}" fill="${escapeXml(element.fill)}" stroke="${escapeXml(element.stroke)}" stroke-width="${element.strokeW}"/></svg>`;
  if (element.type === "draw") return `<path d="${escapeXml(element.points)}" fill="none" stroke="${escapeXml(element.stroke)}" stroke-width="${element.strokeW}" stroke-linecap="round" stroke-linejoin="round"${opacity}/>`;
  if (element.type === "line" || element.type === "arrow") return `<line x1="${element.x1}" y1="${element.y1}" x2="${element.x2}" y2="${element.y2}" stroke="${escapeXml(element.stroke)}" stroke-width="${element.strokeW}" stroke-linecap="round"${opacity}/>`;
  return "";
}

export function createSlideThumbnail(slides: Slide[]) {
  const slide = slides[0];
  if (!slide) return null;
  const elements = [...slide.elements].filter((element) => !element.hidden).sort((a, b) => a.zIndex - b.zIndex).map(renderElement).join("");
  return dataUri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${CANVAS_W} ${CANVAS_H}"><rect width="${CANVAS_W}" height="${CANVAS_H}" fill="${escapeXml(slideBackground(slide.bg))}"/>${elements}</svg>`);
}
