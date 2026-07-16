"use client";

import {
  buildStructuralTemplateHtml,
  SLIDE_LAYOUT_VARIANTS,
  type SlideLayoutTemplate,
  type SlideLayoutVariant,
} from "@/lib/slide-create/layout-templates";
import type { SlideItem } from "@/lib/api/slides";

const LABELS: Record<SlideLayoutTemplate, string> = {
  title: "Tiêu đề",
  content: "Nội dung",
  "text-image": "Chữ và hình",
  comparison: "So sánh",
  formula: "Công thức",
  process: "Quy trình",
  "exercise-quiz": "Bài tập / trắc nghiệm",
  summary: "Tổng kết",
};

const SKIN = `<div data-layer="bg" style="position:relative;width:960px;height:540px;overflow:hidden;font-family:Inter,Arial,sans-serif;background:#faf7f2;color:#102a43;">
  <div data-layer="deco" data-slide-el="shape" style="position:absolute;z-index:5;left:-45px;top:400px;width:180px;height:180px;border-radius:50%;background:#f04455;opacity:.10;"></div>
  <div data-layer="deco" data-slide-el="text" style="position:absolute;z-index:5;right:24px;top:84px;font-size:210px;font-weight:800;color:#102a43;opacity:.05;line-height:1;">01</div>
  <div data-layer="struct" data-region="header" data-slide-el="shape" data-body-top="88" style="position:absolute;z-index:35;left:38px;top:22px;width:884px;height:44px;border-bottom:1px solid rgba(16,42,67,.16);display:flex;align-items:center;font-size:11px;font-weight:700;letter-spacing:.08em;color:#102a43;">HÓA HỌC · ẢNH HƯỞNG CỦA ÁP SUẤT</div>
</div>`;

function sampleSlide(template: SlideLayoutTemplate, variant: SlideLayoutVariant): SlideItem {
  return {
    id: template,
    title: "Ảnh hưởng của áp suất đến tốc độ phản ứng",
    kind: template === "formula" ? "formula" : template === "summary" ? "summary" : "concept",
    layoutHint: template,
    layoutVariant: variant.id,
    content: "Khi áp suất tăng, nồng độ chất khí tăng nên số va chạm hiệu quả tăng và tốc độ phản ứng tăng.",
    visual: template === "text-image" ? { type: "image", spec: "Sơ đồ va chạm phân tử" } : undefined,
    quizItems: template === "exercise-quiz" ? [{ question: "Áp suất ảnh hưởng thế nào đến tốc độ phản ứng?", choices: ["Tăng", "Giảm", "Không đổi"] }] : undefined,
  };
}

function previewDocument(template: SlideLayoutTemplate, variant: SlideLayoutVariant): string {
  const { html } = buildStructuralTemplateHtml(SKIN, sampleSlide(template, variant));
  const content = JSON.stringify({
    hero: "Ảnh hưởng của áp suất đến tốc độ phản ứng",
    body: [
      "Áp suất tăng → nồng độ chất khí tăng → va chạm hiệu quả nhiều hơn.",
      "So sánh hai trường hợp, nêu dữ kiện và kết luận riêng cho từng phần.",
      "Bước 1: Tăng áp suất. Bước 2: Tăng va chạm. Bước 3: Tốc độ tăng.",
    ],
    aside: "Sơ đồ / hình minh họa",
    caption: "Kết luận: tốc độ phản ứng tăng.",
    formula: "v ∝ [A]ᵐ[B]ⁿ",
  });
  return `<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;overflow:hidden}*{box-sizing:border-box}</style></head><body>${html}<script>const copy=${content};const counts={};document.querySelectorAll('[data-layer="zone"]').forEach(zone=>{const key=zone.dataset.zone;const n=counts[key]||0;counts[key]=n+1;const item=document.createElement(key==='aside'?'div':key==='hero'?'h1':key==='formula'?'div':'p');item.dataset.layer='content';item.textContent=Array.isArray(copy[key])?copy[key][n]||copy[key][0]:copy[key]||'';item.style.cssText=key==='hero'?'margin:12px 0 0;font-size:34px;line-height:1.08;font-weight:800;color:#ef3f4f;letter-spacing:-.03em;':key==='formula'?'margin:22px 0 0;width:100%;text-align:center;font-size:32px;font-weight:700;color:#102a43;':key==='aside'?'margin:16px 0 0;width:100%;height:70%;display:flex;align-items:center;justify-content:center;border:1px dashed #9aa7b4;background:rgba(255,255,255,.45);font-size:14px;font-style:italic;':key==='caption'?'margin:14px 0 0;font-size:16px;font-weight:700;line-height:1.35;color:#ef3f4f;':'margin:14px 0 0;font-size:16px;line-height:1.5;color:#102a43;';zone.append(item);});</script></body></html>`;
}

export default function ViewSlideTemplatePage() {
  return (
    <main className="min-h-screen bg-[#f5f1ec] px-6 py-8 font-sans text-[#2b2926]">
      <div className="mx-auto max-w-[1180px]">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#d97757]">EDUA · internal preview</p>
        <h1 className="mt-2 text-3xl font-semibold">Thư viện bố cục slide</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[#675f57]">Bước 2 không gọi AI. Đây là khung template với nội dung minh họa để kiểm tra tỷ lệ và vùng nội dung; skin thật sẽ đến từ Bước 1.</p>

        <section className="mt-7 grid gap-6 md:grid-cols-2">
          {SLIDE_LAYOUT_VARIANTS.map((variant) => {
            const template = variant.template;
            return (
            <article key={variant.id} className="overflow-hidden rounded-2xl border border-[#e2d9cf] bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-[#eee7df] px-4 py-3">
                <div>
                  <h2 className="text-sm font-semibold">{LABELS[template]}</h2>
                  <p className="mt-0.5 text-[11px] text-[#786e65]">{variant.label}</p>
                </div>
                <code className="rounded bg-[#f7f2ed] px-2 py-1 text-[11px] text-[#786e65]">{variant.id}</code>
              </div>
              <div className="flex justify-center bg-[#eee8df] p-3">
                <div className="h-[270px] w-[480px] overflow-hidden rounded-lg border border-[#ddd3c8] bg-white shadow-sm">
                  <iframe title={`Template ${variant.id}`} srcDoc={previewDocument(template, variant)} className="h-[540px] w-[960px] origin-top-left scale-50 border-0" />
                </div>
              </div>
            </article>
          )})}
        </section>
      </div>
    </main>
  );
}
