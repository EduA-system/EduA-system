"use client";

// Rail dọc + flyout panel để CHÈN element (port + adapt từ /test-slide).
// Đọc store để addElement; state tab/url là UI cục bộ (không vào store).

import { useRef, useState, type ReactNode } from "react";
import { useEditorStore } from "@/stores/slide-editor-store";
import { CANVAS_W, CANVAS_H, type ElementPatch } from "./types";
import { makeByType, makeImage, makePoly, type AddType } from "./lib/factory";
import { SHAPE_LIBRARY } from "./lib/shapes";
import { ColorPicker } from "./ColorPicker";
import type { ActiveTool } from "./Canvas";

type Tab = null | "shapes" | "text" | "upload" | "tools" | "bg";

const SHORTCUTS: [string, string][] = [
  ["Xóa phần tử", "Delete"],
  ["Hoàn tác / Làm lại", "Ctrl+Z / Ctrl+Y"],
  ["Sao chép / Dán", "Ctrl+C / Ctrl+V"],
  ["Nhân đôi", "Ctrl+D"],
  ["Chọn tất cả", "Ctrl+A"],
  ["Khóa / Mở khóa", "Ctrl+L"],
  ["Lên trên / Xuống dưới", "] / ["],
  ["Di chuyển 1px / 10px", "Mũi tên / Shift+Mũi tên"],
  ["Sửa nội dung chữ", "Double-click"],
  ["Giữ tỉ lệ khi resize", "Shift kéo góc"],
  ["Snap góc xoay 15°", "Shift khi xoay"],
  ["Bỏ chọn", "Esc"],
];

const ICON_TABS: { id: Exclude<Tab, null>; label: string; icon: ReactNode }[] = [
  {
    id: "shapes",
    label: "Hình",
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="3" y="3" width="8" height="8" rx="1" />
        <circle cx="17" cy="7" r="4" />
        <path d="M3 21l5-8 5 8z" />
      </svg>
    ),
  },
  {
    id: "text",
    label: "Chữ",
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M4 6h16M4 12h8M4 18h12" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: "upload",
    label: "Ảnh",
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    id: "tools",
    label: "Công cụ",
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="3" y="6" width="18" height="12" rx="2" />
        <path d="M7 10h.01M11 10h.01M15 10h.01M8 14h8" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: "bg",
    label: "Nền",
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M3 15l5-5 4 4 3-3 6 6" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="9" cy="8" r="1.4" />
      </svg>
    ),
  },
];

const SHAPE_PRESETS: { type: AddType; label: string; preview: ReactNode; extra?: ElementPatch }[] = [
  { type: "rect", label: "Rect", preview: <div style={{ width: 32, height: 22, background: "#7c3aed", borderRadius: 3 }} />, extra: { fill: "#7c3aed" } },
  { type: "rect", label: "Tròn", preview: <div style={{ width: 32, height: 22, background: "#0ea5e9", borderRadius: 11 }} />, extra: { fill: "#0ea5e9", borderRadius: 30 } },
  { type: "ellipse", label: "Ellipse", preview: <div style={{ width: 32, height: 22, background: "#10b981", borderRadius: "50%" }} />, extra: { fill: "#10b981" } },
  { type: "rect", label: "Viền", preview: <div style={{ width: 32, height: 22, background: "transparent", border: "2.5px solid #f59e0b", borderRadius: 3 }} />, extra: { fill: "transparent", stroke: "#f59e0b", strokeW: 3 } },
  { type: "line", label: "Line", preview: <div style={{ width: 32, height: 3, background: "#94a3b8", marginTop: 10 }} /> },
  {
    type: "arrow",
    label: "Mũi tên",
    preview: (
      <svg width="32" height="22" viewBox="0 0 32 22">
        <line x1="2" y1="11" x2="28" y2="11" stroke="#94a3b8" strokeWidth="2.5" markerEnd="url(#prev-arrow)" />
        <defs>
          <marker id="prev-arrow" markerWidth="6" markerHeight="5" refX="5" refY="2.5" orient="auto">
            <path d="M0,0 L6,2.5 L0,5 Z" fill="#94a3b8" />
          </marker>
        </defs>
      </svg>
    ),
  },
  {
    type: "arrow",
    label: "2 đầu",
    preview: (
      <svg width="32" height="22" viewBox="0 0 32 22">
        <line x1="4" y1="11" x2="28" y2="11" stroke="#94a3b8" strokeWidth="2.5" markerEnd="url(#pa2)" markerStart="url(#pa2s)" />
        <defs>
          <marker id="pa2" markerWidth="6" markerHeight="5" refX="5" refY="2.5" orient="auto">
            <path d="M0,0 L6,2.5 L0,5 Z" fill="#94a3b8" />
          </marker>
          <marker id="pa2s" markerWidth="6" markerHeight="5" refX="1" refY="2.5" orient="auto-start-reverse">
            <path d="M0,0 L6,2.5 L0,5 Z" fill="#94a3b8" />
          </marker>
        </defs>
      </svg>
    ),
    extra: { arrowHead: "both" },
  },
];

const TEXT_PRESETS: { label: string; fontSize: number; bold: boolean; italic?: boolean; color?: string }[] = [
  { label: "Tiêu đề lớn", fontSize: 60, bold: true },
  { label: "Tiêu đề vừa", fontSize: 40, bold: true },
  { label: "Tiêu đề nhỏ", fontSize: 28, bold: false },
  { label: "Đoạn văn", fontSize: 20, bold: false },
  { label: "Chú thích", fontSize: 14, bold: false, italic: true, color: "#64748b" },
];

interface LeftPanelProps {
  activeTool: ActiveTool;
  onToolChange: (t: ActiveTool) => void;
  drawColor: string;
  onDrawColorChange: (c: string) => void;
  drawSize: number;
  onDrawSizeChange: (n: number) => void;
}

const BG_PRESETS = [
  "#ffffff", "#f8fafc", "#f1f5f9", "#fef3c7", "#fee2e2", "#dcfce7",
  "#dbeafe", "#ede9fe", "#1e293b", "#0f172a", "#000000", "#fafaf9",
];

const DRAW_TOOLS: { id: ActiveTool; label: string }[] = [
  { id: "brush", label: "Cọ vẽ" },
  { id: "pencil", label: "Bút chì" },
  { id: "eraser", label: "Tẩy" },
];

export function LeftPanel({
  activeTool,
  onToolChange,
  drawColor,
  onDrawColorChange,
  drawSize,
  onDrawSizeChange,
}: LeftPanelProps) {
  const [tab, setTab] = useState<Tab>(null);
  const [urlInput, setUrlInput] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const addElement = useEditorStore((s) => s.addElement);
  const slideBg = useEditorStore((s) => s.slides.find((sl) => sl.id === s.currentSlideId)?.bg ?? "#ffffff");
  const setSlideBackground = useEditorStore((s) => s.setSlideBackground);

  function addImageSized(src: string) {
    const img = new Image();
    img.onload = () => {
      const r = img.naturalHeight / img.naturalWidth;
      const w = Math.min(480, img.naturalWidth || 320);
      const h = Math.round(w * r) || 240;
      addElement({ ...makeImage(src), w, h, x: CANVAS_W / 2 - w / 2, y: CANVAS_H / 2 - h / 2 });
    };
    img.onerror = () =>
      addElement({ ...makeImage(src), w: 320, h: 240, x: CANVAS_W / 2 - 160, y: CANVAS_H / 2 - 120 });
    img.src = src;
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => addImageSized(ev.target?.result as string);
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  function addImageFromUrl() {
    const src = urlInput.trim();
    if (!src) return;
    addImageSized(src);
    setUrlInput("");
  }

  return (
    <div className="flex shrink-0 border-r border-black/10 bg-white">
      <input ref={fileRef} type="file" accept="image/*" onChange={onFile} className="hidden" />

      {/* RAIL */}
      <nav className="flex w-[56px] shrink-0 flex-col items-center gap-1 py-2">
        {ICON_TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(tab === t.id ? null : t.id)}
            title={t.label}
            className={`flex w-12 flex-col items-center gap-0.5 rounded-[8px] py-2 text-[10px] transition-colors ${
              tab === t.id ? "bg-[#eef0f3] text-[#1f1f1f]" : "text-[#5f6368] hover:bg-black/5"
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </nav>

      {/* FLYOUT */}
      {tab && (
        <div className="w-[240px] shrink-0 overflow-y-auto border-l border-black/10">
          {tab === "shapes" && (
            <div className="p-3">
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[#777]">Hình cơ bản</div>
              <div className="grid grid-cols-3 gap-2">
                {SHAPE_PRESETS.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => addElement(makeByType(s.type, s.extra))}
                    className="flex flex-col items-center gap-1 rounded-lg p-2 text-[10px] text-[#5f6368] hover:bg-black/5 hover:text-[#1f1f1f]"
                  >
                    <div className="flex h-8 w-full items-center justify-center">{s.preview}</div>
                    <span>{s.label}</span>
                  </button>
                ))}
              </div>

              {SHAPE_LIBRARY.map((cat) => (
                <div key={cat.id} className="mt-3">
                  <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-[#777]">
                    {cat.label}
                  </div>
                  <div className="grid grid-cols-4 gap-1.5">
                    {cat.shapes.map((sh) => (
                      <button
                        key={sh.id}
                        title={sh.label}
                        onClick={() =>
                          addElement(
                            makePoly({
                              svgPath: sh.path,
                              svgViewBox: sh.viewBox ?? "0 0 100 100",
                              shapeId: sh.id,
                              fill: sh.defaultFill ?? "#1e293b",
                              stroke: sh.defaultStroke ?? "transparent",
                              strokeW: sh.defaultStroke ? 2 : 0,
                            })
                          )
                        }
                        className="flex aspect-square items-center justify-center rounded-lg p-1.5 text-[#5f6368] hover:bg-black/5 hover:text-[#1f1f1f]"
                      >
                        <svg width="100%" height="100%" viewBox={sh.viewBox ?? "0 0 100 100"} preserveAspectRatio="xMidYMid meet">
                          <path d={sh.path} fill="currentColor" fillRule="evenodd" />
                        </svg>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === "text" && (
            <div className="space-y-2 p-3">
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[#777]">Kiểu chữ</div>
              {TEXT_PRESETS.map((t, i) => (
                <button
                  key={i}
                  onClick={() =>
                    addElement(
                      makeByType("text", {
                        text: t.label,
                        fontSize: t.fontSize,
                        bold: t.bold,
                        italic: t.italic ?? false,
                        color: t.color ?? "#1e293b",
                        w: 360,
                        h: Math.max(60, t.fontSize * 1.6),
                      })
                    )
                  }
                  className="w-full rounded-lg px-3 py-2 text-left transition-colors hover:bg-black/5"
                  style={{
                    fontSize: Math.min(t.fontSize, 24),
                    fontWeight: t.bold ? 700 : 400,
                    fontStyle: t.italic ? "italic" : "normal",
                    color: t.color ?? "#1e293b",
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>
          )}

          {tab === "upload" && (
            <div className="space-y-3 p-3">
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[#777]">Tải ảnh lên</div>
              <button
                onClick={() => fileRef.current?.click()}
                className="w-full rounded-lg border-2 border-dashed border-black/15 py-6 text-center text-xs text-[#777] transition-colors hover:border-[#1f1f1f] hover:text-[#1f1f1f]"
              >
                <svg className="mx-auto mb-2 h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Click để chọn ảnh
              </button>
              <div>
                <div className="mb-1 text-[10px] uppercase text-[#777]">URL ảnh</div>
                <div className="flex gap-1">
                  <input
                    type="text"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addImageFromUrl()}
                    placeholder="https://..."
                    className="flex-1 rounded border border-black/15 bg-black/[0.03] px-2 py-1 text-xs text-[#1f1f1f] placeholder-[#999] focus:border-[#1f1f1f] focus:outline-none"
                  />
                  <button
                    onClick={addImageFromUrl}
                    className="rounded bg-[#1f1f1f] px-2.5 text-xs text-white hover:opacity-90"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          )}

          {tab === "tools" && (
            <div className="p-3">
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[#777]">Vẽ tay</div>
              <div className="mb-3 grid grid-cols-4 gap-1.5">
                <button
                  onClick={() => onToolChange("select")}
                  className={`flex flex-col items-center gap-0.5 rounded-lg py-2 text-[10px] transition-colors ${
                    activeTool === "select" ? "bg-[#eef0f3] text-[#1f1f1f]" : "text-[#5f6368] hover:bg-black/5"
                  }`}
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M5 3l14 9-6 1-1 6z" strokeLinejoin="round" />
                  </svg>
                  Chọn
                </button>
                {DRAW_TOOLS.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => onToolChange(activeTool === t.id ? "select" : t.id)}
                    className={`flex flex-col items-center gap-0.5 rounded-lg py-2 text-[10px] transition-colors ${
                      activeTool === t.id ? "bg-[#eef0f3] text-[#1f1f1f]" : "text-[#5f6368] hover:bg-black/5"
                    }`}
                  >
                    <span className="text-base leading-none">
                      {t.id === "brush" ? "🖌" : t.id === "pencil" ? "✏" : "🧽"}
                    </span>
                    {t.label}
                  </button>
                ))}
              </div>

              {activeTool !== "select" && (
                <div className="mb-3 space-y-2 rounded-lg bg-black/[0.03] p-2.5">
                  {activeTool !== "eraser" && (
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-[#5f6368]">Màu nét</span>
                      <ColorPicker value={drawColor} onChange={onDrawColorChange} allowGradient={false} allowTransparent={false} />
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-[#5f6368]">Cỡ</span>
                    <input
                      type="range"
                      min={1}
                      max={activeTool === "eraser" ? 80 : 50}
                      value={drawSize}
                      onChange={(e) => onDrawSizeChange(Number(e.target.value))}
                      className="flex-1"
                    />
                    <span className="w-6 text-right text-[11px] text-[#777]">{drawSize}</span>
                  </div>
                </div>
              )}

              <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[#777]">Phím tắt</div>
              <div className="space-y-1">
                {SHORTCUTS.map(([label, key], i) => (
                  <div key={i} className="flex items-center justify-between gap-2 rounded px-1.5 py-1 text-[11px]">
                    <span className="text-[#5f6368]">{label}</span>
                    <kbd className="shrink-0 rounded border border-black/15 bg-black/[0.03] px-1.5 py-0.5 text-[10px] text-[#1f1f1f]">
                      {key}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === "bg" && (
            <div className="space-y-3 p-3">
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[#777]">Nền slide</div>
              <div className="flex items-center justify-between rounded-lg bg-black/[0.03] p-2.5">
                <span className="text-[11px] text-[#5f6368]">Màu nền</span>
                <ColorPicker value={slideBg} onChange={(v) => setSlideBackground(v)} />
              </div>
              <div>
                <div className="mb-1.5 text-[10px] uppercase text-[#777]">Màu nhanh</div>
                <div className="grid grid-cols-6 gap-1.5">
                  {BG_PRESETS.map((c) => (
                    <button
                      key={c}
                      onClick={() => setSlideBackground(c)}
                      title={c}
                      className={`aspect-square rounded-md border transition-transform hover:scale-110 ${
                        slideBg === c ? "border-[#1f1f1f] ring-1 ring-[#1f1f1f]" : "border-black/15"
                      }`}
                      style={{ background: c }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
