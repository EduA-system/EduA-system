"use client";

/**
 * Bàn chạy thử mô phỏng — chạy MÃ NGUỒN THẬT của `components/simulations/`.
 *
 * Các file mô phỏng do Server Component đọc từ đĩa lúc build và truyền xuống
 * qua prop (xem lib/sandbox/collect-files.ts). Ở đây không có bản chép nào:
 * sửa `components/simulations/` là trang này đổi theo.
 *
 * Sandpack bundle bằng create-react-app trong trình duyệt, chạy trong iframe
 * preview riêng — không gọi API nào của EDUA.
 */

import { useState } from "react";
import {
  SandpackProvider,
  SandpackLayout,
  SandpackCodeEditor,
  SandpackPreview,
  SandpackConsole,
} from "@codesandbox/sandpack-react";

export type WorkbenchExperiment = {
  id: string;
  title: string;
  domain: string;
  kind: string;
  files: Record<string, string>;
  focusPath: string;
  fileCount: number;
};

/** Khớp phiên bản với fe/package.json để hành vi trong sandbox không lệch app. */
const DEPENDENCIES = {
  konva: "^10.3.0",
  tweakpane: "^4.0.5",
  "lucide-react": "^1.23.0",
};

/** Bỏ StrictMode của template: app thật không dùng, và StrictMode gọi effect
 *  hai lần nên renderer Konva (imperative) sẽ dựng stage hai lần. */
const INDEX_TSX = `import { createRoot } from "react-dom/client";
import "./styles.css";
import App from "./App";

createRoot(document.getElementById("root")!).render(<App />);
`;

/**
 * Shim Tailwind cho sandbox.
 *
 * App thật dùng Tailwind v4 qua PostCSS; dự án Sandpack thì không có. Thiếu
 * nó thì `h-full` vô nghĩa → `useContainerSize` đọc clientHeight = 0 →
 * SceneKonva2D thoát sớm và KHÔNG dựng stage → canvas trắng.
 *
 * Chỉ định nghĩa 87 class mà `renderers/` và `shared/` thật sự dùng (đã quét
 * từ mã nguồn), thay vì kéo cả Tailwind hay script CDN — nhẹ hơn và không bị
 * trình chặn quảng cáo cắt mất.
 */
const STYLES_CSS = `* { box-sizing: border-box; }
html, body, #root { height: 100%; margin: 0; }
body { font-family: system-ui, -apple-system, "Segoe UI", sans-serif; }

/* layout — nhóm quyết định canvas có kích thước hay không */
.relative { position: relative; }
.absolute { position: absolute; }
.inset-0 { inset: 0; }
.inset-x-0 { left: 0; right: 0; }
.bottom-3 { bottom: .75rem; }
.left-3 { left: .75rem; }
.h-full { height: 100%; }
.w-full { width: 100%; }
.min-w-0 { min-width: 0; }
.h-3 { height: .75rem; } .w-3 { width: .75rem; }
.h-4 { height: 1rem; }  .w-4 { width: 1rem; }
.h-8 { height: 2rem; }  .w-8 { width: 2rem; }
.w-11 { width: 2.75rem; }
.overflow-hidden { overflow: hidden; }
.flex { display: flex; }
.flex-wrap { flex-wrap: wrap; }
.grid { display: grid; }
.grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.items-center { align-items: center; }
.items-start { align-items: flex-start; }
.justify-center { justify-content: center; }
.justify-between { justify-content: space-between; }
.gap-0\\.5 { gap: .125rem; }
.gap-2 { gap: .5rem; }
.gap-2\\.5 { gap: .625rem; }
.gap-3 { gap: .75rem; }
.space-y-0\\.5 > * + * { margin-top: .125rem; }
.space-y-3 > * + * { margin-top: .75rem; }
.space-y-5 > * + * { margin-top: 1.25rem; }
.ml-1 { margin-left: .25rem; }
.mt-0\\.5 { margin-top: .125rem; }
.mt-3 { margin-top: .75rem; }
.px-1 { padding-left: .25rem; padding-right: .25rem; }
.px-3 { padding-left: .75rem; padding-right: .75rem; }
.py-1 { padding-top: .25rem; padding-bottom: .25rem; }
.py-2 { padding-top: .5rem; padding-bottom: .5rem; }
.pt-0\\.5 { padding-top: .125rem; }

/* nền và viền */
.bg-\\[\\#06111b\\] { background: #06111b; }
.bg-\\[\\#080d14\\] { background: #080d14; }
.bg-\\[\\#0f172a\\] { background: #0f172a; }
.bg-\\[\\#0f172a\\]\\/90 { background: rgba(15,23,42,.9); }
.bg-\\[\\#f7faf9\\] { background: #f7faf9; }
.bg-\\[\\#faf9f7\\] { background: #faf9f7; }
.bg-black\\/50 { background: rgba(0,0,0,.5); }
.bg-slate-900 { background: #0f172a; }
.border { border-width: 1px; border-style: solid; }
.border-white\\/10 { border-color: rgba(255,255,255,.1); }
.rounded-lg { border-radius: .5rem; }
.rounded-\\[8px\\] { border-radius: 8px; }
.rounded-\\[10px\\] { border-radius: 10px; }
.shadow-lg { box-shadow: 0 10px 15px -3px rgba(0,0,0,.1), 0 4px 6px -4px rgba(0,0,0,.1); }
.backdrop-blur { backdrop-filter: blur(8px); }

/* chữ */
.font-mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
.font-normal { font-weight: 400; }
.font-semibold { font-weight: 600; }
.text-center { text-align: center; }
.uppercase { text-transform: uppercase; }
.tracking-wide { letter-spacing: .025em; }
.leading-none { line-height: 1; }
.leading-snug { line-height: 1.375; }
.leading-relaxed { line-height: 1.625; }
.text-\\[10px\\] { font-size: 10px; }
.text-\\[10\\.5px\\] { font-size: 10.5px; }
.text-\\[11px\\] { font-size: 11px; }
.text-\\[13px\\] { font-size: 13px; }
.text-\\[14px\\] { font-size: 14px; }
.text-\\[\\#171717\\] { color: #171717; }
.text-\\[\\#6b6b6b\\] { color: #6b6b6b; }
.text-\\[\\#8a8178\\] { color: #8a8178; }
.text-\\[\\#c96545\\] { color: #c96545; }
.text-emerald-400 { color: #34d399; }
.text-slate-200 { color: #e2e8f0; }
.text-slate-300 { color: #cbd5e1; }
.text-slate-400 { color: #94a3b8; }

/* tương tác */
.pointer-events-none { pointer-events: none; }
.pointer-events-auto { pointer-events: auto; }
.select-none { user-select: none; }
.touch-none { touch-action: none; }
.transition-colors { transition-property: color, background-color, border-color; }
.duration-150 { transition-duration: .15s; }
.ease-out { transition-timing-function: cubic-bezier(0,0,.2,1); }
.hover\\:bg-white\\/10:hover { background: rgba(255,255,255,.1); }
.hover\\:text-white:hover { color: #fff; }
`;

const WORKSPACE_HEIGHT = "calc(100vh - 116px)";

export function SandboxWorkbench({
  experiments,
  unsupported,
}: {
  experiments: WorkbenchExperiment[];
  unsupported: { id: string; title: string; kind: string }[];
}) {
  const [activeId, setActiveId] = useState(experiments[0]?.id ?? "");
  const [showEditor, setShowEditor] = useState(false);
  const [showConsole, setShowConsole] = useState(false);

  const experiment =
    experiments.find((e) => e.id === activeId) ?? experiments[0];

  if (!experiment) {
    return (
      <div className="flex flex-1 items-center justify-center text-[13px] text-[#6b6b6b]">
        Không tìm thấy preset nào trong components/simulations/presets.
      </div>
    );
  }

  const files: Record<string, { code: string; hidden?: boolean }> = {
    ...Object.fromEntries(
      Object.entries(experiment.files).map(([path, code]) => [path, { code }]),
    ),
    "/index.tsx": { code: INDEX_TSX, hidden: true },
    "/styles.css": { code: STYLES_CSS, hidden: true },
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex h-[60px] shrink-0 items-center gap-2 border-b border-[#e8e2d9] bg-white px-4">
        <select
          value={experiment.id}
          onChange={(e) => setActiveId(e.target.value)}
          className="max-w-[420px] shrink-0 rounded-[10px] border border-[#e8e2d9] px-3 py-1.5 text-[13px] font-medium text-[#171717] outline-none focus:border-[#e8724a]"
        >
          {experiments.map((e) => (
            <option key={e.id} value={e.id}>
              {e.title} — {e.domain}
            </option>
          ))}
        </select>

        <span className="shrink-0 rounded-full bg-[#f5f1ec] px-2.5 py-1 text-[11px] font-medium text-[#6b6b6b]">
          {experiment.kind}
        </span>
        <span
          title="Số file thật đọc từ components/simulations/ cho thí nghiệm này"
          className="hidden shrink-0 text-[11px] text-[#8a8178] lg:inline"
        >
          {experiment.fileCount} file thật + 1 file vỏ
        </span>
        {unsupported.length > 0 && (
          <span
            title={unsupported.map((u) => `${u.title} (${u.kind})`).join("\n")}
            className="hidden shrink-0 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-amber-700 xl:inline"
          >
            {unsupported.length} preset chưa hỗ trợ
          </span>
        )}

        <button
          onClick={() => setShowEditor((v) => !v)}
          className={`ml-auto shrink-0 rounded-[10px] border px-3 py-1.5 text-[12px] font-semibold transition-colors duration-150 ease-out ${
            showEditor
              ? "border-[#e8724a] bg-[#fff4ef] text-[#c96545]"
              : "border-[#e8e2d9] text-[#4f4943] hover:bg-[#f7f3ee]"
          }`}
        >
          Mã nguồn
        </button>
        <button
          onClick={() => setShowConsole((v) => !v)}
          className={`shrink-0 rounded-[10px] border px-3 py-1.5 text-[12px] font-semibold transition-colors duration-150 ease-out ${
            showConsole
              ? "border-[#e8724a] bg-[#fff4ef] text-[#c96545]"
              : "border-[#e8e2d9] text-[#4f4943] hover:bg-[#f7f3ee]"
          }`}
        >
          Console
        </button>
      </div>

      {/* `key` buộc Sandpack dựng lại khi đổi thí nghiệm — nếu không, file đã
          bị sửa trong editor sẽ đè lên mã của thí nghiệm mới. */}
      <div className="min-h-0 flex-1">
        <SandpackProvider
          key={experiment.id}
          template="react-ts"
          files={files}
          theme="dark"
          customSetup={{ dependencies: DEPENDENCIES }}
          options={{
            activeFile: experiment.focusPath,
            visibleFiles: [experiment.focusPath, "/App.tsx"],
            recompileMode: "delayed",
            recompileDelay: 700,
          }}
        >
          <SandpackLayout>
            {showEditor && (
              <SandpackCodeEditor
                showLineNumbers
                showTabs
                showInlineErrors
                closableTabs={false}
                style={{ height: WORKSPACE_HEIGHT, flexGrow: 1, flexBasis: 0 }}
              />
            )}
            <div
              style={{
                height: WORKSPACE_HEIGHT,
                flexGrow: 1,
                flexBasis: 0,
                minWidth: 0,
              }}
              className="flex flex-col"
            >
              <SandpackPreview
                showNavigator={false}
                showOpenInCodeSandbox={false}
                showRefreshButton
                style={{ flex: showConsole ? "1 1 0" : "1 1 100%", minHeight: 0 }}
              />
              {showConsole && (
                <SandpackConsole
                  resetOnPreviewRestart
                  style={{ height: "30%", minHeight: 0 }}
                />
              )}
            </div>
          </SandpackLayout>
        </SandpackProvider>
      </div>
    </div>
  );
}
