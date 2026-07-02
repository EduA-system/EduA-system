"use client";

import { useState } from "react";
import { useEditor } from "@tiptap/react";
import { lessonPlan5512Mock } from "@/data/lessonPlan5512Mock";
import { readLessonPlanSession } from "@/services/lessonPlanService";
import { AssistantPanel } from "../layout/AssistantPanel";
import { Sidebar } from "../layout/Sidebar";
import { EditorTools } from "../LessonEditor";
import { LessonEditor, generatingLessonPlanSkeletonHtml, lessonPlan5512ToHtml } from "../LessonEditor";
import { createEditorExtensions, type MathClickInfo } from "../LessonEditor/editorConfig";
import { MathEditPopup } from "../LessonEditor/MathEditPopup";
import { useLessonPlanStream } from "../LessonEditor/useLessonPlanStream";
import { Ruler } from "../LessonEditor/Ruler";

export function LessonEditDashboard() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [aiCollapsed, setAiCollapsed] = useState(false);
  const [margins, setMargins] = useState({ left: 80, right: 80 });
  // Đọc một lần lúc mount (lazy initializer) — tránh đọc lại sau khi
  // `useLessonPlanStream` đã `clearLessonPlanSession()`, khiến `editable` bị tính lại.
  const [pendingSession] = useState(() => readLessonPlanSession());
  // Công thức AI sinh ra (hoặc chèn qua toolbar) là node atom — bấm vào sẽ mở
  // popup này để sửa/xoá LaTeX thay vì phải xoá cả node rồi chèn lại từ đầu.
  const [mathClick, setMathClick] = useState<MathClickInfo | null>(null);
  // `extensions` PHẢI ổn định giữa các lần render — tạo lại mảng này mỗi render
  // (vd gọi `createEditorExtensions(...)` trực tiếp trong `useEditor`) khiến
  // Tiptap phát hiện thay đổi và đồng bộ lại editor mỗi lần re-render (kể cả
  // những re-render không liên quan, như đổi lề trang hay bấm ra ngoài), có thể
  // làm mất nội dung GV vừa sửa. `setMathClick` là setter ổn định nên tạo 1 lần
  // là đủ, không cần đưa vào deps.
  const [extensions] = useState(() => createEditorExtensions({ onMathClick: setMathClick }));
  const editor = useEditor({
    extensions,
    content: pendingSession
      ? generatingLessonPlanSkeletonHtml(pendingSession.display)
      : lessonPlan5512ToHtml(lessonPlan5512Mock),
    editable: !pendingSession,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: "lesson-document-editor min-h-[calc(100vh-188px)] text-[#2b2926] outline-none",
      },
    },
  });

  // Mở STOMP và fill dần giáo án vào editor (nếu đến từ /lesson-create qua phiên streaming).
  useLessonPlanStream(editor);

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
                <HeaderActionButton onClick={() => undefined} label="Lưu">
                  <SaveIcon />
                </HeaderActionButton>
                <HeaderActionButton onClick={() => undefined} label="Tạo giáo án" primary>
                  <CreateLessonIcon />
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
            <LessonEditor margins={margins} editor={editor} />
          </div>
        </section>

        <AssistantPanel collapsed={aiCollapsed} />
      </div>

      {editor && mathClick ? (
        <MathEditPopup editor={editor} info={mathClick} onClose={() => setMathClick(null)} />
      ) : null}
    </main>
  );
}

function HeaderActionButton({
  children,
  label,
  onClick,
  primary = false,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
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

function CreateLessonIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 4l1.3 4.4L18 10l-4.7 1.6L12 16l-1.3-4.4L6 10l4.7-1.6L12 4z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M5 17h4M7 15v4M17 17h2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
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
