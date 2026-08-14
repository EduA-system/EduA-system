import { CANVAS_H, CANVAS_W, type DashStyle, type Slide, type SlideElement } from "@/components/slide-editor/types";
import { normalizedLetterSpacing } from "@/components/slide-editor/lib/text-spacing";

export type HtmlExportWarning = { source: string; reason: string };
export type OfflineHtmlExport = { html: string; warnings: HtmlExportWarning[] };

const PLACEHOLDER_IMAGE = "data:image/svg+xml," + encodeURIComponent("<svg xmlns='http://www.w3.org/2000/svg' width='800' height='450'><rect width='100%' height='100%' fill='#e8e2d9'/><text x='50%' y='50%' text-anchor='middle' dominant-baseline='middle' font-family='Arial,sans-serif' font-size='28' fill='#6b625a'>Hình ảnh không khả dụng offline</text></svg>");

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function css(value: string | number | undefined): string {
  return value == null ? "" : String(value).replace(/[;{}]/g, "");
}

function dash(value: DashStyle | undefined): string | undefined {
  return value === "dashed" ? "12 5" : value === "dotted" ? "3 5" : value === "fine" ? "1.5 3" : undefined;
}

function baseStyle(element: SlideElement): string {
  const transform = [element.rotation ? `rotate(${element.rotation}deg)` : "", element.type === "image" && element.flipH ? "scaleX(-1)" : "", element.type === "image" && element.flipV ? "scaleY(-1)" : ""].filter(Boolean).join(" ");
  return `position:absolute;left:${element.x}px;top:${element.y}px;width:${element.w}px;height:${element.h}px;z-index:${element.zIndex};opacity:${element.opacity};${transform ? `transform:${transform};` : ""}`;
}

function textHtml(element: Extract<SlideElement, { type: "text" }>): string {
  const text = escapeHtml(element.text).replace(/\n/g, "<br>");
  const decoration = [element.underline && "underline", element.strikethrough && "line-through"].filter(Boolean).join(" ") || "none";
  const style = `${baseStyle(element)}display:flex;align-items:${element.listStyle ? "flex-start" : "center"};justify-content:${element.align === "center" ? "center" : element.align === "right" ? "flex-end" : "flex-start"};box-sizing:border-box;padding:4px 0;overflow:visible;background:${css(element.textBg)};font-family:${css(element.fontFamily)};font-size:${element.fontSize}px;font-weight:${element.bold ? 700 : 400};font-style:${element.italic ? "italic" : "normal"};text-decoration:${decoration};color:${css(element.color)};text-align:${element.align};line-height:${element.lineHeight ?? 1.2};letter-spacing:${normalizedLetterSpacing(element.letterSpacing)}px;text-transform:${element.textTransform === "capitalize-words" ? "capitalize" : element.textTransform ?? "none"};text-shadow:${css(element.textShadow)};white-space:pre-wrap;overflow-wrap:anywhere;`;
  return `<div style="${style}">${text}</div>`;
}

function elementHtml(element: SlideElement, imageSources: Map<string, string>): string {
  if (element.hidden) return "";
  if (element.type === "text") return textHtml(element);
  if (element.type === "shape") {
    const radius = element.shape === "ellipse" ? "50%" : `${element.borderRadius}px`;
    const border = element.strokeW ? `${element.strokeW}px ${element.dashStyle === "dashed" ? "dashed" : element.dashStyle === "dotted" || element.dashStyle === "fine" ? "dotted" : "solid"} ${css(element.stroke)}` : "none";
    return `<div style="${baseStyle(element)}background:${css(element.fill)};border:${border};border-radius:${radius};box-sizing:border-box"></div>`;
  }
  if (element.type === "image") {
    const source = imageSources.get(element.src) ?? PLACEHOLDER_IMAGE;
    const filter = [element.brightness != null && element.brightness !== 100 ? `brightness(${element.brightness}%)` : "", element.contrast != null && element.contrast !== 100 ? `contrast(${element.contrast}%)` : ""].filter(Boolean).join(" ");
    return `<img src="${escapeHtml(source)}" alt="" style="${baseStyle(element)}object-fit:${element.fit};border-radius:${element.borderRadius}px;${filter ? `filter:${filter};` : ""}">`;
  }
  if (element.type === "draw") {
    return `<svg style="${baseStyle(element)}overflow:visible" viewBox="0 0 ${element.w} ${element.h}" preserveAspectRatio="none"><path d="${escapeHtml(element.points)}" fill="none" stroke="${escapeHtml(element.stroke)}" stroke-width="${element.strokeW}" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  }
  if (element.type === "poly") {
    const fill = element.fill.startsWith("linear-gradient") || element.fill.startsWith("radial-gradient") ? "#d97757" : element.fill;
    return `<svg style="${baseStyle(element)}overflow:visible" viewBox="${escapeHtml(element.svgViewBox || "0 0 100 100")}" preserveAspectRatio="none"><path d="${escapeHtml(element.svgPath)}" fill="${escapeHtml(fill)}" stroke="${escapeHtml(element.stroke === "transparent" ? "none" : element.stroke)}" stroke-width="${element.strokeW}" stroke-dasharray="${dash(element.dashStyle) ?? ""}" stroke-linecap="${element.strokeLinecap ?? "butt"}" stroke-linejoin="${element.strokeLinejoin ?? "miter"}"/></svg>`;
  }
  if (element.type === "simulation") {
    if (element.kind === "sandbox") {
      // Thí nghiệm vật lý cần Sandpack (bundler chạy trong iframe) — bản export
      // tĩnh không có runtime đó, nên chỉ còn poster ghi tên thí nghiệm.
      return `<div style="${baseStyle(element)}box-sizing:border-box;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;border-radius:16px;background:linear-gradient(135deg,#0f172a,#334155);color:#fff;text-align:center;padding:8px;overflow:hidden"><span style="font-size:28px">🔬</span><span style="font-size:13px;font-weight:600">${escapeHtml(element.title)}</span><span style="font-size:11px;opacity:.7">Thí nghiệm vật lý</span></div>`;
    }
    if (element.kind !== "molecule") {
      return `<div style="${baseStyle(element)}box-sizing:border-box;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;border-radius:16px;background:#fbfaf8;border:1px solid #d8d1c9;color:#2b2926;text-align:center;padding:8px;overflow:hidden"><span style="font-size:28px;font-weight:700">PT</span><span style="font-size:13px;font-weight:600">${escapeHtml(element.periodic.focus || "Bảng tuần hoàn")}</span><span style="font-size:11px;opacity:.7">${escapeHtml(element.periodic.elementSymbols.join(", "))}</span></div>`;
    }
    // Offline export has no React/Three.js runtime to host a live simulation — render a static poster.
    return `<div style="${baseStyle(element)}box-sizing:border-box;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;border-radius:16px;background:linear-gradient(135deg,#0f172a,#334155);color:#fff;text-align:center;padding:8px;overflow:hidden"><span style="font-size:28px">🧪</span><span style="font-size:13px;font-weight:600">${escapeHtml(element.molecule.name)}</span><span style="font-size:11px;opacity:.7">${escapeHtml(element.molecule.formula)}</span></div>`;
  }
  const markerId = `arrow-${escapeHtml(element.id)}`;
  const marker = element.type === "arrow" && element.arrowHead !== "none" ? `<marker id="${markerId}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto"><path d="M0 0L10 5 0 10z" fill="${escapeHtml(element.stroke)}"/></marker>` : "";
  return `<svg style="position:absolute;inset:0;width:${CANVAS_W}px;height:${CANVAS_H}px;z-index:${element.zIndex};opacity:${element.opacity};overflow:visible"><defs>${marker}</defs><line x1="${element.x1}" y1="${element.y1}" x2="${element.x2}" y2="${element.y2}" stroke="${escapeHtml(element.stroke)}" stroke-width="${element.strokeW}" stroke-dasharray="${dash(element.dashStyle) ?? ""}" stroke-linecap="round"${marker ? ` marker-end="url(#${markerId})"` : ""}/></svg>`;
}

export function buildOfflineHtml(slides: Slide[], title: string, imageSources = new Map<string, string>()): string {
  const slideMarkup = slides.map((slide, index) => `<section class="slide${index === 0 ? " active" : ""}" data-index="${index}" style="background:${css(slide.bg)}"><div class="canvas">${slide.elements.map((element) => elementHtml(element, imageSources)).join("")}</div></section>`).join("");
  const thumbnails = slides.map((_, index) => `<button data-go="${index}">Slide ${index + 1}</button>`).join("");
  return `<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title><style>*{box-sizing:border-box}body{margin:0;background:#171513;color:#fff;font-family:Arial,sans-serif;overflow:hidden}.slide{display:none;height:100vh;width:100vw;align-items:center;justify-content:center}.slide.active{display:flex}.canvas{position:relative;width:${CANVAS_W}px;height:${CANVAS_H}px;transform-origin:center;box-shadow:0 20px 60px #0007}.controls{position:fixed;z-index:20;inset:auto 0 18px;display:flex;justify-content:center;gap:10px}.controls button,#picker button{border:1px solid #ffffff55;background:#171513e6;color:#fff;border-radius:8px;padding:9px 14px;cursor:pointer;box-shadow:0 3px 14px #0004}.controls button:hover,#picker button:hover{background:#34302ce6}#hint{position:fixed;z-index:20;top:16px;left:50%;transform:translateX(-50%);border-radius:8px;background:#171513dc;padding:8px 12px;font-size:13px;color:#fff}#picker{display:none;position:fixed;z-index:30;inset:0;background:#171513f5;padding:32px;overflow:auto;gap:12px;align-content:start;grid-template-columns:repeat(auto-fit,minmax(140px,1fr))}#picker.open{display:grid}@media print{.controls,#picker,#hint{display:none}.slide{height:auto;display:flex;page-break-after:always}.canvas{transform:none!important}}</style></head><body>${slideMarkup}<p id="hint">Chọn “Toàn màn hình” để bắt đầu trình chiếu.</p><nav class="controls"><button id="prev">← Trước</button><button id="pick">Chọn slide</button><button id="full">Toàn màn hình</button><button id="next">Tiếp →</button></nav><div id="picker">${thumbnails}</div><script>const slides=[...document.querySelectorAll('.slide')],picker=document.querySelector('#picker'),hint=document.querySelector('#hint');let current=0;function scale(){const c=document.querySelector('.slide.active .canvas');if(!c)return;c.style.transform='scale('+Math.min(innerWidth/${CANVAS_W},innerHeight/${CANVAS_H})*0.94+')'}function show(i){current=Math.max(0,Math.min(i,slides.length-1));slides.forEach((s,n)=>s.classList.toggle('active',n===current));picker.classList.remove('open');scale()}document.querySelector('#prev').onclick=()=>show(current-1);document.querySelector('#next').onclick=()=>show(current+1);document.querySelector('#pick').onclick=()=>picker.classList.add('open');document.querySelector('#full').onclick=()=>document.fullscreenElement?document.exitFullscreen():document.documentElement.requestFullscreen();document.addEventListener('fullscreenchange',()=>hint.style.display=document.fullscreenElement?'none':'block');picker.onclick=e=>{const i=e.target.dataset.go;if(i!==undefined)show(+i)};addEventListener('resize',scale);addEventListener('keydown',e=>{if(e.key==='Escape'){picker.classList.remove('open');return}if(['ArrowRight','ArrowDown','PageDown',' ','Enter'].includes(e.key)){e.preventDefault();show(current+1)}if(['ArrowLeft','ArrowUp','PageUp','Backspace'].includes(e.key)){e.preventDefault();show(current-1)}});show(0)</script></body></html>`;
}

async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

async function embedImages(slides: Slide[]): Promise<{ sources: Map<string, string>; warnings: HtmlExportWarning[] }> {
  const sources = new Map<string, string>();
  const warnings: HtmlExportWarning[] = [];
  const urls = [...new Set(slides.flatMap((slide) => slide.elements).filter((element): element is Extract<SlideElement, { type: "image" }> => element.type === "image").map((element) => element.src))];
  await Promise.all(urls.map(async (source) => {
    if (source.startsWith("data:")) { sources.set(source, source); return; }
    try {
      if (!source || source.startsWith("blob:")) throw new Error("URL tạm thời không thể đóng gói");
      const response = await fetch(source);
      if (!response.ok) throw new Error(`Không thể tải ảnh (HTTP ${response.status})`);
      sources.set(source, await blobToDataUrl(await response.blob()));
    } catch (error) {
      sources.set(source, PLACEHOLDER_IMAGE);
      warnings.push({ source, reason: error instanceof Error ? error.message : "Không thể đóng gói ảnh" });
    }
  }));
  return { sources, warnings };
}

export async function exportOfflineHtml(slides: Slide[], title: string): Promise<OfflineHtmlExport> {
  const { sources, warnings } = await embedImages(slides);
  return { html: buildOfflineHtml(slides, title, sources), warnings };
}

export function downloadOfflineHtml(html: string, title: string): void {
  const filename = `${(title.trim() || "bo-slide").replace(/[\\/:*?"<>|]+/g, "-").slice(0, 80)}.html`;
  const url = URL.createObjectURL(new Blob([html], { type: "text/html;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
