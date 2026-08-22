import { CANVAS_H, CANVAS_W, type DashStyle, type Slide, type SimulationElement, type SlideElement } from "@/components/slide-editor/types";
import { normalizedLetterSpacing } from "@/components/slide-editor/lib/text-spacing";
import { ELEMENTS } from "@/components/periodic-table/data";
import { CATEGORY_COLORS } from "@/components/periodic-table/types";
import type { Molecule, RenderMode } from "@/components/molecules/types";
import katex from "katex";
import JSZip from "jszip";

export type HtmlExportWarning = { source: string; reason: string };
export type OfflineHtmlExport = { html: string; warnings: HtmlExportWarning[] };
export type OfflineZipExport = { blob: Blob; warnings: HtmlExportWarning[] };

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

const INLINE_MATH_PATTERN = /(\$\$)([\s\S]+?)\1|(?<!\\)(\$)([^\n$]+?)(?<!\\)\3|\\\(([\s\S]+?)\\\)|\\\[([\s\S]+?)\\\]/g;

function textWithInlineMathHtml(value: string): string {
  let output = "";
  let cursor = 0;
  for (const match of value.matchAll(INLINE_MATH_PATTERN)) {
    const index = match.index;
    output += escapeHtml(value.slice(cursor, index)).replace(/\n/g, "<br>");
    const latex = match[2] ?? match[4] ?? match[5] ?? match[6] ?? "";
    const displayMode = match[1] === "$$" || match[6] != null;
    const rendered = katex.renderToString(latex.trim(), {
      displayMode,
      output: "mathml",
      throwOnError: false,
      strict: "ignore",
    });
    output += displayMode ? `<span style="display:block">${rendered}</span>` : rendered;
    cursor = index + match[0].length;
  }
  output += escapeHtml(value.slice(cursor)).replace(/\n/g, "<br>");
  return output;
}

function textHtml(element: Extract<SlideElement, { type: "text" }>): string {
  const text = textWithInlineMathHtml(element.text);
  const decoration = [element.underline && "underline", element.strikethrough && "line-through"].filter(Boolean).join(" ") || "none";
  const style = `${baseStyle(element)}display:flex;align-items:${element.listStyle ? "flex-start" : "center"};justify-content:${element.align === "center" ? "center" : element.align === "right" ? "flex-end" : "flex-start"};box-sizing:border-box;padding:4px 0;overflow:visible;background:${css(element.textBg)};font-family:${css(element.fontFamily)};font-size:${element.fontSize}px;font-weight:${element.bold ? 700 : 400};font-style:${element.italic ? "italic" : "normal"};text-decoration:${decoration};color:${css(element.color)};text-align:${element.align};line-height:${element.lineHeight ?? 1.2};letter-spacing:${normalizedLetterSpacing(element.letterSpacing)}px;text-transform:${element.textTransform === "capitalize-words" ? "capitalize" : element.textTransform ?? "none"};text-shadow:${css(element.textShadow)};white-space:pre-wrap;overflow-wrap:anywhere;`;
  return `<div style="${style}"><div style="width:100%">${text}</div></div>`;
}

function simulationCaption(element: SimulationElement): string {
  if (element.kind === "molecule") return `${element.molecule.name} · ${element.molecule.formula}`;
  if (element.kind === "sandbox") return element.title;
  return element.periodic.focus || "Bảng tuần hoàn";
}

function elementHtml(element: SlideElement, imageSources: Map<string, string>, simulationSources: Map<string, string>): string {
  if (element.hidden) return "";
  if (element.type === "text") return textHtml(element);
  if (element.type === "latex") {
    const style = `${baseStyle(element)}display:flex;align-items:center;justify-content:${element.align === "center" ? "center" : element.align === "right" ? "flex-end" : "flex-start"};color:${css(element.color)};font-size:${element.fontSize}px;overflow:hidden;`;
    return `<div style="${style}">${katex.renderToString(element.latex || "\\text{Công thức}", { displayMode: true, output: "mathml", throwOnError: false, strict: "ignore" })}</div>`;
  }
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
    const mediaPath = simulationSources.get(element.id);
    if (mediaPath) {
      const caption = simulationCaption(element);
      const fit = element.kind === "periodic-element" ? "contain" : "cover";
      return `<div style="${baseStyle(element)}box-sizing:border-box;position:relative;border-radius:16px;overflow:hidden;background:#0f172a"><img src="${escapeHtml(mediaPath)}" alt="${escapeHtml(caption)}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:${fit};background:#fff"><div style="position:absolute;left:0;right:0;bottom:0;padding:5px 10px;background:rgba(15,23,42,.72);color:#fff;font-family:Arial,sans-serif;font-size:12px;text-align:center;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHtml(caption)}</div></div>`;
    }
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

export function buildOfflineHtml(slides: Slide[], title: string, imageSources = new Map<string, string>(), simulationSources = new Map<string, string>()): string {
  const slideMarkup = slides.map((slide, index) => `<section class="slide${index === 0 ? " active" : ""}" data-index="${index}" style="background:${css(slide.bg)}"><div class="canvas">${slide.elements.map((element) => elementHtml(element, imageSources, simulationSources)).join("")}</div></section>`).join("");
  const thumbnails = slides.map((_, index) => `<button data-go="${index}">Slide ${index + 1}</button>`).join("");
  return `<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title><style>*{box-sizing:border-box}body{margin:0;background:#171513;color:#fff;font-family:Arial,sans-serif;overflow:hidden}.slide{display:none;height:100vh;width:100vw;align-items:center;justify-content:center}.slide.active{display:flex}.canvas{position:relative;width:${CANVAS_W}px;height:${CANVAS_H}px;transform-origin:center;box-shadow:0 20px 60px #0007}.controls{position:fixed;z-index:20;inset:auto 0 18px;display:flex;justify-content:center;gap:10px}.controls button,#picker button{border:1px solid #ffffff55;background:#171513e6;color:#fff;border-radius:8px;padding:9px 14px;cursor:pointer;box-shadow:0 3px 14px #0004}.controls button:hover,#picker button:hover{background:#34302ce6}#hint{position:fixed;z-index:20;top:16px;left:50%;transform:translateX(-50%);border-radius:8px;background:#171513dc;padding:8px 12px;font-size:13px;color:#fff}#picker{display:none;position:fixed;z-index:30;inset:0;background:#171513f5;padding:32px;overflow:auto;gap:12px;align-content:start;grid-template-columns:repeat(auto-fit,minmax(140px,1fr))}#picker.open{display:grid}@media print{.controls,#picker,#hint{display:none}.slide{height:auto;display:flex;page-break-after:always}.canvas{transform:none!important}}</style></head><body>${slideMarkup}<p id="hint">Chọn “Toàn màn hình” để bắt đầu trình chiếu.</p><nav class="controls"><button id="prev">← Trước</button><button id="pick">Chọn slide</button><button id="full">Toàn màn hình</button><button id="next">Tiếp →</button></nav><div id="picker">${thumbnails}</div><script>const slides=[...document.querySelectorAll('.slide')],picker=document.querySelector('#picker'),hint=document.querySelector('#hint');let current=0;function scale(){const c=document.querySelector('.slide.active .canvas');if(!c)return;c.style.transform='scale('+Math.min(innerWidth/${CANVAS_W},innerHeight/${CANVAS_H})*0.94+')'}function show(i){current=Math.max(0,Math.min(i,slides.length-1));slides.forEach((s,n)=>s.classList.toggle('active',n===current));picker.classList.remove('open');scale()}document.querySelector('#prev').onclick=()=>show(current-1);document.querySelector('#next').onclick=()=>show(current+1);document.querySelector('#pick').onclick=()=>picker.classList.add('open');document.querySelector('#full').onclick=()=>document.fullscreenElement?document.exitFullscreen():document.documentElement.requestFullscreen();document.addEventListener('fullscreenchange',()=>hint.style.display=document.fullscreenElement?'none':'block');picker.onclick=e=>{const i=e.target.dataset.go;if(i!==undefined)show(+i)};addEventListener('resize',scale);addEventListener('keydown',e=>{if(e.key==='Escape'){picker.classList.remove('open');return}if(['ArrowRight','ArrowDown','PageDown',' ','Enter'].includes(e.key)){e.preventDefault();show(current+1)}if(['ArrowLeft','ArrowUp','PageUp','Backspace'].includes(e.key)){e.preventDefault();show(current-1)}});show(0)</script></body></html>`;
}

function safeFileBase(title: string): string {
  return (title.trim() || "bo-slide").replace(/[\\/:*?"<>|]+/g, "-").slice(0, 80);
}

const CONTENT_TYPE_EXT: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/gif": "gif",
  "image/webp": "webp",
  "image/svg+xml": "svg",
  "image/bmp": "bmp",
  "image/avif": "avif",
};

function extFromUrl(source: string): string | null {
  try {
    const pathname = new URL(source, "http://placeholder.local").pathname;
    const match = pathname.match(/\.([a-zA-Z0-9]+)$/);
    return match ? match[1].toLowerCase() : null;
  } catch {
    return null;
  }
}

function guessExtension(source: string, blob: Blob): string {
  return CONTENT_TYPE_EXT[blob.type] ?? extFromUrl(source) ?? "png";
}

async function fetchImageBlob(source: string): Promise<Blob> {
  if (source.startsWith("data:")) return (await fetch(source)).blob();

  try {
    const response = await fetch(source);
    if (!response.ok) throw new Error(`Không thể tải ảnh (HTTP ${response.status})`);
    return response.blob();
  } catch (directError) {
    let url: URL;
    try {
      url = new URL(source);
    } catch {
      throw directError;
    }
    if (url.protocol !== "http:" && url.protocol !== "https:") throw directError;

    const response = await fetch("/api/slide-export-image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source }),
    });
    if (!response.ok) {
      const detail = await response.json().catch(() => null) as { message?: string } | null;
      throw new Error(detail?.message || `Không thể tải ảnh qua proxy (HTTP ${response.status})`);
    }
    return response.blob();
  }
}

async function collectImageFiles(slides: Slide[]): Promise<{ sources: Map<string, string>; files: Map<string, Blob>; warnings: HtmlExportWarning[] }> {
  const sources = new Map<string, string>();
  const files = new Map<string, Blob>();
  const warnings: HtmlExportWarning[] = [];
  const urls = [...new Set(slides.flatMap((slide) => slide.elements).filter((element): element is Extract<SlideElement, { type: "image" }> => element.type === "image").map((element) => element.src))];
  let counter = 0;
  await Promise.all(urls.map(async (source) => {
    try {
      if (!source || source.startsWith("blob:")) throw new Error("URL tạm thời không thể đóng gói");
      const blob = await fetchImageBlob(source);
      counter += 1;
      const relativePath = `images/img-${counter}.${guessExtension(source, blob)}`;
      files.set(relativePath, blob);
      sources.set(source, relativePath);
    } catch (error) {
      sources.set(source, PLACEHOLDER_IMAGE);
      warnings.push({ source, reason: error instanceof Error ? error.message : "Không thể đóng gói ảnh" });
    }
  }));
  return { sources, files, warnings };
}

function periodicHighlighted(el: Extract<SimulationElement, { kind: "periodic-element" | "periodic-table" }>) {
  const requested = new Set(el.periodic.elementSymbols);
  return ELEMENTS.filter((element) => requested.has(element.symbol));
}

function periodicElementCardSvg(element: (typeof ELEMENTS)[number]): string {
  const colors = CATEGORY_COLORS[element.category];
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 300"><rect width="240" height="300" rx="20" fill="${colors.bg}" stroke="${colors.border}" stroke-width="3"/><text x="18" y="34" font-family="Arial,sans-serif" font-size="18" font-weight="700" fill="${colors.text}">${element.atomicNumber}</text><text x="120" y="150" text-anchor="middle" font-family="Georgia,serif" font-size="72" font-weight="700" fill="${colors.text}">${escapeHtml(element.symbol)}</text><text x="120" y="190" text-anchor="middle" font-family="Arial,sans-serif" font-size="18" font-weight="600" fill="${colors.text}">${escapeHtml(element.nameVi || element.name)}</text><text x="120" y="212" text-anchor="middle" font-family="Arial,sans-serif" font-size="13" fill="${colors.text}" opacity="0.75">${escapeHtml(element.name)}</text><text x="120" y="270" text-anchor="middle" font-family="Arial,sans-serif" font-size="13" fill="${colors.text}">Chu kỳ ${element.period} · Nhóm ${element.group ?? "-"}</text></svg>`;
}

function periodicTableSvg(highlighted: (typeof ELEMENTS)[number][], focus: string | undefined): string {
  const highlightedNumbers = new Set(highlighted.map((element) => element.atomicNumber));
  const cell = 22;
  const pad = 6;
  const titleH = 22;
  const width = 18 * cell + pad * 2;
  const height = 10 * cell + pad * 2 + titleH;
  const cells = ELEMENTS.map((element) => {
    const active = highlightedNumbers.has(element.atomicNumber);
    const colors = CATEGORY_COLORS[element.category];
    const x = pad + (element.gridCol - 1) * cell;
    const y = pad + titleH + (element.gridRow - 1) * cell;
    const fill = active ? colors.bg : "#ffffff";
    const stroke = active ? colors.border : "#e8e2d9";
    const textColor = active ? colors.text : "#b7aea5";
    return `<g opacity="${active ? 1 : 0.5}"><rect x="${x}" y="${y}" width="${cell - 1.5}" height="${cell - 1.5}" rx="2" fill="${fill}" stroke="${stroke}"/><text x="${x + (cell - 1.5) / 2}" y="${y + (cell - 1.5) / 2 + 3}" text-anchor="middle" font-family="Arial,sans-serif" font-size="8" font-weight="700" fill="${textColor}">${escapeHtml(element.symbol)}</text></g>`;
  }).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}"><rect width="${width}" height="${height}" rx="12" fill="#fbfaf8"/><text x="${pad}" y="${pad + 14}" font-family="Arial,sans-serif" font-size="13" font-weight="700" fill="#2b2926">${escapeHtml(focus || "Bảng tuần hoàn")}</text>${cells}</svg>`;
}

function buildPeriodicSvg(el: Extract<SimulationElement, { kind: "periodic-element" | "periodic-table" }>): string | null {
  const highlighted = periodicHighlighted(el);
  if (el.kind === "periodic-element") return highlighted[0] ? periodicElementCardSvg(highlighted[0]) : null;
  return highlighted.length ? periodicTableSvg(highlighted, el.periodic.focus) : null;
}

async function renderSandboxThumbSvg(presetId: string): Promise<string> {
  const [{ Thumb }, React, ReactDOMServer] = await Promise.all([
    import("@/components/simulations/shared/simulation-thumb"),
    import("react"),
    import("react-dom/server"),
  ]);
  return ReactDOMServer.renderToStaticMarkup(React.createElement(Thumb, { id: presetId }));
}

/**
 * Vẽ lại phân tử vào một Canvas ẩn ngoài màn hình rồi chụp khung hình đầu tiên.
 * `preserveDrawingBuffer` (bật qua `captureMode`) là bắt buộc: mặc định trình
 * duyệt có thể xoá drawing buffer WebGL ngay sau khi composite, nên gọi
 * `toBlob` muộn hơn một nhịp có thể chỉ đọc được khung trống.
 */
async function captureMoleculeSnapshot(molecule: Molecule, mode: RenderMode): Promise<Blob | null> {
  const [React, ReactDOMClient, { MoleculeViewer }] = await Promise.all([
    import("react"),
    import("react-dom/client"),
    import("@/components/molecules/MoleculeViewer"),
  ]);
  const container = document.createElement("div");
  container.style.cssText = "position:fixed;left:-9999px;top:0;width:480px;height:480px;pointer-events:none";
  document.body.appendChild(container);
  const root = ReactDOMClient.createRoot(container);
  try {
    const canvas = await new Promise<HTMLCanvasElement>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("Hết thời gian dựng mô phỏng 3D")), 8000);
      root.render(
        React.createElement(MoleculeViewer, {
          molecule,
          mode,
          rotating: false,
          interactive: false,
          captureMode: true,
          onCanvasReady: (canvasEl: HTMLCanvasElement) => {
            requestAnimationFrame(() => requestAnimationFrame(() => {
              clearTimeout(timer);
              resolve(canvasEl);
            }));
          },
        }),
      );
    });
    return await new Promise<Blob | null>((resolve) => canvas.toBlob((b) => resolve(b), "image/png"));
  } finally {
    root.unmount();
    container.remove();
  }
}

async function collectSimulationFiles(slides: Slide[]): Promise<{ sources: Map<string, string>; files: Map<string, Blob>; warnings: HtmlExportWarning[] }> {
  const sources = new Map<string, string>();
  const files = new Map<string, Blob>();
  const warnings: HtmlExportWarning[] = [];
  const elements = slides.flatMap((slide) => slide.elements).filter((element): element is SimulationElement => element.type === "simulation");

  let counter = 0;
  for (const element of elements) {
    counter += 1;
    try {
      if (element.kind === "molecule") {
        const blob = await captureMoleculeSnapshot(element.molecule, element.mode);
        if (!blob) throw new Error("Không chụp được ảnh mô hình phân tử");
        const path = `images/sim-molecule-${counter}.png`;
        files.set(path, blob);
        sources.set(element.id, path);
      } else if (element.kind === "sandbox") {
        const svg = await renderSandboxThumbSvg(element.presetId);
        const path = `images/sim-sandbox-${counter}.svg`;
        files.set(path, new Blob([svg], { type: "image/svg+xml" }));
        sources.set(element.id, path);
      } else {
        const svg = buildPeriodicSvg(element);
        if (!svg) throw new Error("Không xác định được nguyên tố để minh hoạ");
        const path = `images/sim-periodic-${counter}.svg`;
        files.set(path, new Blob([svg], { type: "image/svg+xml" }));
        sources.set(element.id, path);
      }
    } catch (error) {
      warnings.push({ source: `Mô phỏng ở slide (id ${element.id})`, reason: error instanceof Error ? error.message : "Không thể tạo ảnh minh hoạ mô phỏng" });
    }
  }
  return { sources, files, warnings };
}

export async function exportOfflineZip(slides: Slide[], title: string): Promise<OfflineZipExport> {
  const [imageResult, simulationResult] = await Promise.all([
    collectImageFiles(slides),
    collectSimulationFiles(slides),
  ]);
  const html = buildOfflineHtml(slides, title, imageResult.sources, simulationResult.sources);
  const zip = new JSZip();
  zip.file(`${safeFileBase(title)}.html`, html);
  const imagesFolder = zip.folder("images");
  for (const [path, blob] of [...imageResult.files, ...simulationResult.files]) {
    imagesFolder?.file(path.replace(/^images\//, ""), new Uint8Array(await blob.arrayBuffer()));
  }
  const blob = await zip.generateAsync({ type: "blob" });
  return { blob, warnings: [...imageResult.warnings, ...simulationResult.warnings] };
}

export function downloadOfflineZip(blob: Blob, title: string): void {
  const filename = `${safeFileBase(title)}.zip`;
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
