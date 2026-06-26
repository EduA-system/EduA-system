"use client";

import { useState } from "react";
import { AssistantPanel } from "../layout/AssistantPanel";
import { Sidebar } from "../layout/Sidebar";
import { EditorToolbar, EditorTopTools, EditorBottomTools, LessonEditor } from "../LessonEditor";
import { Ruler } from "../LessonEditor/Ruler";

const DEFAULT_TITLE = "Giáo án môn Toán - Lớp 5";

export function LessonEditDashboard() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [aiCollapsed, setAiCollapsed] = useState(false);
  const [margins, setMargins] = useState({ left: 80, right: 80 });
  const [title, setTitle] = useState(DEFAULT_TITLE);

  return (
    <main className="relative h-screen w-full overflow-hidden bg-[#F7F5F2] text-[#2b2926]">
      <div className="flex h-full w-full">
        <Sidebar collapsed={sidebarCollapsed} />

        <section className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <EditorToolbar>
            <header className="z-30 shrink-0 border-b border-[#e8e2d9] bg-[#fbfaf8] shadow-[0_1px_2px_rgba(43,41,38,0.06)]">
              {/* HÀNG TRÊN: toggle + Lưu + tiêu đề + (format hàng trên) + AI toggle */}
              <div className="@container flex h-11 items-center gap-2 px-3">
                {/* Nhóm trái: toggle + Lưu + tiêu đề (lệch trái) */}
                <div className="flex min-w-0 shrink items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSidebarCollapsed((current) => !current)}
                    className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-[#e8e2d9] bg-white text-[#6b6b6b] shadow-sm transition hover:bg-[#f3efe9] hover:text-[#2b2926]"
                    aria-label={sidebarCollapsed ? "Show sidebar" : "Hide sidebar"}
                  >
                    <SidebarToggleIcon />
                  </button>

                  <HeaderActionButton onClick={() => undefined} label="Lưu">
                    <SaveIcon />
                  </HeaderActionButton>

                  <input
                    type="text"
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder={DEFAULT_TITLE}
                    aria-label="Lesson title"
                    className="h-8 w-[200px] shrink rounded-lg border border-transparent bg-transparent px-2 text-left text-[14px] font-medium text-[#2b2926] outline-none transition hover:border-[#e8e2d9] focus:border-[#e8e2d9] focus:bg-white"
                  />
                </div>

                {/* Nhóm giữa: công cụ (căn giữa phần còn lại của hàng) */}
                <div className="flex min-w-0 flex-1 items-center justify-center">
                  <div className="hidden shrink-0 items-center md:flex">
                    <EditorTopTools />
                  </div>
                </div>

                {/* Nhóm phải: AI toggle */}
                <div className="flex shrink-0 items-center">
                  <button
                    type="button"
                    onClick={() => setAiCollapsed((current) => !current)}
                    className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-[#e8e2d9] bg-white text-[#d97757] shadow-sm transition hover:bg-[#fff4ed]"
                    aria-label={aiCollapsed ? "Show AI sidebar" : "Hide AI sidebar"}
                  >
                    <AiToggleIcon />
                  </button>
                </div>
              </div>

              {/* HÀNG DƯỚI: format đầy đủ */}
              <div className="flex h-10 items-center justify-center gap-1.5 overflow-x-auto border-t border-[#e8e2d9] px-3">
                <EditorBottomTools />
              </div>

              <Ruler bare margins={margins} onMarginsChange={setMargins} />
            </header>
          </EditorToolbar>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-8 sm:px-6 lg:px-8">
            <LessonEditor margins={margins} />
          </div>
        </section>

        <AssistantPanel collapsed={aiCollapsed} />
      </div>
    </main>
  );
}

function HeaderActionButton({
  children,
  label,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      className="flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-[#e8e2d9] bg-white px-2.5 text-[13px] font-medium text-[#4f4943] shadow-sm transition hover:bg-[#f3efe9] hover:text-[#2b2926] @min-[1100px]:px-3"
    >
      {children}
      <span className="hidden @min-[1100px]:inline">{label}</span>
    </button>
  );
}

function SidebarToggleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <rect x="2.5" y="3" width="11" height="10" rx="2" stroke="currentColor" strokeWidth="1.3" />
      <path d="M6 3v10" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}

function SaveIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M5 4h12l2 2v14H5V4z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M8 4v6h8V4M8 20v-6h8v6" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    </svg>
  );
}

function AiToggleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 3l1.5 5.2L19 10l-5.5 1.8L12 17l-1.5-5.2L5 10l5.5-1.8L12 3z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M19 15l.7 2.3L22 18l-2.3.7L19 21l-.7-2.3L16 18l2.3-.7L19 15z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}