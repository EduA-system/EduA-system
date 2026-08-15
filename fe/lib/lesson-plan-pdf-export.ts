import katex from "katex";

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function openLessonPlanPrintDialog(title: string, documentHtml: string): boolean {
  return openDocumentPrintDialog(title, documentHtml);
}

type PrintOptions = {
  marginLeft?: number;
  marginRight?: number;
};

function splitBlockLatex(latex: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = "";
  for (let index = 0; index < latex.length; index += 1) {
    const character = latex[index];
    if (character === "{") depth += 1;
    if (character === "}") depth = Math.max(0, depth - 1);
    current += character;
    if (depth === 0 && (character === "+" || character === "-" || character === "=")) {
      parts.push(current.trim());
      current = "";
    }
  }
  if (current.trim()) parts.push(current.trim());
  return parts.length > 1 ? parts : [latex];
}

function renderedDocumentHtml(documentHtml: string): string {
  const documentForPrint = new DOMParser().parseFromString(documentHtml, "text/html");
  for (const mathNode of documentForPrint.querySelectorAll<HTMLElement>("[data-type='inline-math'], [data-type='block-math']")) {
    const latex = mathNode.dataset.latex;
    if (!latex) continue;

    const displayMode = mathNode.dataset.type === "block-math";
    mathNode.className = `tiptap-mathematics-render${displayMode ? " tiptap-mathematics-render--block" : ""}`;
    const render = (value: string) => katex.renderToString(value, {
      displayMode: false,
      throwOnError: false,
      strict: "ignore",
    });
    mathNode.innerHTML = displayMode
      ? `<span class="katex-wrap">${splitBlockLatex(latex).map(render).join("")}</span>`
      : render(latex);
  }
  return documentForPrint.body.innerHTML;
}

function currentPageStyles(): string {
  return Array.from(document.querySelectorAll("link[rel='stylesheet'], style"))
    .map((style) => style.outerHTML)
    .join("");
}

export function openDocumentPrintDialog(title: string, documentHtml: string, options: PrintOptions = {}): boolean {
  const printFrame = document.createElement("iframe");
  printFrame.setAttribute("aria-hidden", "true");
  printFrame.style.cssText = "position:fixed;left:-10000px;top:0;width:1px;height:1px;border:0;opacity:0;pointer-events:none;";
  document.body.append(printFrame);
  const printWindow = printFrame.contentWindow;
  if (!printWindow) {
    printFrame.remove();
    return false;
  }
  printWindow.addEventListener("afterprint", () => printFrame.remove(), { once: true });

  // The editor ruler is tuned for a wide on-screen canvas. Applying it at the
  // same pixel value on top of A4 page margins made the printed text column
  // much narrower than its editor counterpart.
  const marginLeft = Math.max(0, Math.min(Math.round((options.marginLeft ?? 80) * 0.25), 40));
  const marginRight = Math.max(0, Math.min(Math.round((options.marginRight ?? 80) * 0.25), 40));
  const printableHtml = renderedDocumentHtml(documentHtml);
  printWindow.document.write(`<!doctype html><html lang="vi"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title>${currentPageStyles()}<style>@page{size:A4 portrait;margin:12mm}*{box-sizing:border-box}html,body{margin:0;background:#fff!important}.document-page{width:100%;max-width:186mm;margin:0 auto;padding-left:${marginLeft}px;padding-right:${marginRight}px}.document-page .lesson-document-editor{min-height:0!important}.katex-wrap{display:flex;max-width:100%;flex-wrap:wrap;justify-content:center;align-items:baseline}.katex-wrap>.katex{white-space:nowrap}@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}.document-page{padding-left:${marginLeft}px;padding-right:${marginRight}px}.tableWrapper,.tiptap-mathematics-render{overflow:visible!important}.tiptap-mathematics-render{max-width:100%!important}}</style></head><body><main class="document-page"><article class="lesson-document-editor">${printableHtml}</article></main><script>function fitMath(){document.querySelectorAll('.tiptap-mathematics-render').forEach((node)=>{if(node.querySelector('.katex-wrap'))return;const formula=node.querySelector('.katex');if(!formula||node.clientWidth===0)return;let scale=1;while(formula.getBoundingClientRect().width>node.clientWidth&&scale>.55){scale-=.05;node.style.fontSize=scale+'em';}})}window.onload=()=>{document.querySelectorAll('img[loading]').forEach((image)=>image.loading='eager');fitMath();setTimeout(()=>{window.focus();window.print();},150);}</script></body></html>`);
  printWindow.document.close();
  return true;
}
