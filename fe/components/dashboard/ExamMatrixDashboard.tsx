"use client";

import { useState } from "react";
import { useEditor } from "@tiptap/react";
import { AssistantPanel } from "../layout/AssistantPanel";
import { Sidebar } from "../layout/Sidebar";
import { EditorTools, Ruler } from "../LessonEditor";
import { createEditorExtensions } from "../LessonEditor/editorConfig";

export interface ExamMatrixSession {
  subject: string;
  subjectLabel: string;
  grade: string;
  examType: string;
  examTypeLabel: string;
}

const SESSION_KEY = "edua:examMatrixSession";

export function storeExamMatrixSession(session: ExamMatrixSession): void {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function readExamMatrixSession(): ExamMatrixSession | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as ExamMatrixSession) : null;
  } catch {
    return null;
  }
}

export function clearExamMatrixSession(): void {
  sessionStorage.removeItem(SESSION_KEY);
}

export function ExamMatrixDashboard() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [aiCollapsed, setAiCollapsed] = useState(false);
  const [margins, setMargins] = useState({ left: 80, right: 80 });
  const [session] = useState(() => readExamMatrixSession());

  const [extensions] = useState(() => createEditorExtensions());
  const editor = useEditor({
    extensions,
    content: "<p></p>",
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: "lesson-document-editor min-h-[calc(100vh-188px)] text-[#2b2926] outline-none",
      },
    },
  });

  return (
    <main className="relative h-screen w-full overflow-hidden bg-[#F7F5F2] text-[#2b2926]">
      <div className="flex h-full w-full">
        <Sidebar collapsed={sidebarCollapsed} />

        <section className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <header className="z-30 shrink-0 border-b border-[#e8e2d9] bg-[#fbfaf8] shadow-[0_1px_2px_rgba(43,41,38,0.06)]">
            <div className="@container flex h-12 items-center gap-2 px-3">
              <button
                type="button"
                onClick={() => setSidebarCollapsed((current) => !current)}
                className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-[#e8e2d9] bg-white text-[#6b6b6b] shadow-sm transition hover:bg-[#f3efe9] hover:text-[#2b2926]"
                aria-label={sidebarCollapsed ? "Show sidebar" : "Hide sidebar"}
              >
                <SidebarToggleIcon />
              </button>

              <div className="flex shrink-0 items-center gap-1.5">
                <HeaderActionButton label="Lưu">
                  <SaveIcon />
                </HeaderActionButton>
                <HeaderActionButton label="Tạo đề thi" primary>
                  <CreateExamIcon />
                </HeaderActionButton>
              </div>

              <div className="flex min-w-0 flex-1 items-center justify-center px-2">
                <EditorTools editor={editor} />
              </div>

              <button
                type="button"
                onClick={() => setAiCollapsed((current) => !current)}
                className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-[#e8e2d9] bg-white text-[#d97757] shadow-sm transition hover:bg-[#fff4ed]"
                aria-label={aiCollapsed ? "Show AI sidebar" : "Hide AI sidebar"}
              >
                <AiToggleIcon />
              </button>
            </div>
            <Ruler bare margins={margins} onMarginsChange={setMargins} />
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-8 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-[980px]">
              {session && (
                <p className="mb-4 text-[13px] text-[#6b6b6b]">
                  {session.subjectLabel} — Lớp {session.grade} — {session.examTypeLabel}
                </p>
              )}
              <div className="rounded-[14px] border border-[#d8d1c9] bg-white px-7 py-[22px]">
                <div className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-[#6b6b6b]">
                  Khung ma trận đề kiểm tra
                </div>
                <p className="mt-4 text-[13px] leading-[22px] text-[#6b6b6b]">
                  Ma trận sẽ được hiển thị và chỉnh sửa tại đây.
                </p>
              </div>
            </div>
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
  primary = false,
}: {
  children: React.ReactNode;
  label: string;
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      title={label}
      className={`flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-[13px] font-medium shadow-sm transition @min-[1100px]:px-3 ${
        primary
          ? "border border-[#d97757] bg-[#d97757] text-white hover:bg-[#c96545]"
          : "border border-[#e8e2d9] bg-white text-[#4f4943] hover:bg-[#f3efe9] hover:text-[#2b2926]"
      }`}
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

function CreateExamIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <rect x="9" y="3" width="6" height="4" rx="1" stroke="currentColor" strokeWidth="1.7" />
      <path d="M9 12h6M9 16h4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
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
