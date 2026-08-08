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
import "./tailwind.css";
import "./styles.css";
import App from "./App";

createRoot(document.getElementById("root")!).render(<App />);
`;

/**
 * Khung HTML của dự án Sandpack. Ghi đè bản của template chỉ để đổi ngôn ngữ
 * và tiêu đề — Tailwind KHÔNG nạp qua CDN ở đây, xem lib/sandbox/app-css.ts.
 */
const INDEX_HTML = `<!DOCTYPE html>
<html lang="vi">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Thí nghiệm</title>
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>
`;

/** Reset tối thiểu; mọi utility đến từ CSS Tailwind của app (xem app-css.ts). */
const STYLES_CSS = `* { box-sizing: border-box; }
html, body, #root { height: 100%; margin: 0; }
body { font-family: system-ui, -apple-system, "Segoe UI", sans-serif; }
`;

const WORKSPACE_HEIGHT = "calc(100vh - 116px)";

export function SandboxWorkbench({
  experiments,
  unsupported,
  tailwindCss,
}: {
  experiments: WorkbenchExperiment[];
  unsupported: { id: string; title: string; kind: string }[];
  /** CSS Tailwind app đã biên dịch; null nếu chưa tìm thấy (xem app-css.ts). */
  tailwindCss: string | null;
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
    "/public/index.html": { code: INDEX_HTML, hidden: true },
    // Tailwind của app. Nếu chưa tìm được file CSS đã build thì để rỗng —
    // thí nghiệm vẫn chạy, chỉ mất bố cục; xem cảnh báo ở thanh trên.
    "/tailwind.css": { code: tailwindCss ?? "", hidden: true },
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
        {!tailwindCss && (
          <span
            title="Không tìm thấy CSS đã build trong .next — chạy npm run dev hoặc npm run build rồi tải lại trang. Thiếu nó thì bố cục thí nghiệm sẽ vỡ."
            className="shrink-0 rounded-full bg-red-50 px-2.5 py-1 text-[11px] font-medium text-red-700"
          >
            Thiếu CSS
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
