"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useEditor } from "@tiptap/react";
import type { JSONContent } from "@tiptap/core";
import { useSearchParams } from "next/navigation";
import { lessonPlan5512Mock } from "@/data/lessonPlan5512Mock";
import {
  readLessonPlanSession,
  type LessonPlanSession,
} from "@/services/lessonPlanService";
import {
  createLibraryContent,
  getLibraryContent,
  updateLibraryContent,
  type LibrarySubject,
} from "@/lib/library";
import { getClassResourceLibraryContent } from "@/lib/classroom";
import { useAuth } from "@/lib/auth/AuthContext";
import { AssistantPanel } from "../layout/AssistantPanel";
import { Sidebar } from "../layout/Sidebar";
import { ImageEnabledEditorTools } from "../LessonEditor";
import { LessonEditor, generatingLessonPlanSkeletonHtml, lessonPlan5512ToHtml } from "../LessonEditor";
import { createEditorExtensions, type MathClickInfo } from "../LessonEditor/editorConfig";
import { MathEditPopup } from "../LessonEditor/MathEditPopup";
import { useLessonPlanStream } from "../LessonEditor/useLessonPlanStream";
import { Ruler } from "../LessonEditor/Ruler";
import { openLessonPlanPrintDialog } from "@/lib/lesson-plan-pdf-export";
import { createLessonThumbnail } from "@/lib/library-thumbnail";

export function LessonEditDashboard() {
  const { authFetch } = useAuth();
  const searchParams = useSearchParams();
  const libraryId = searchParams.get("libraryId");
  const classId = searchParams.get("classId");
  const resourceId = searchParams.get("resourceId");
  const readOnlyClassResource = Boolean(classId && resourceId);
  const [aiCollapsed, setAiCollapsed] = useState(false);
  const [margins, setMargins] = useState({ left: 80, right: 80 });
  // Đọc một lần lúc mount (lazy initializer) — tránh đọc lại sau khi
  // `useLessonPlanStream` đã `clearLessonPlanSession()`, khiến `editable` bị tính lại.
  const [pendingSession] = useState(() => readLessonPlanSession());
  const [lessonSession, setLessonSession] = useState<LessonPlanSession | null>(pendingSession);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const libraryContentIdRef = useRef<string | null>(null);
  const librarySubjectRef = useRef<LibrarySubject | undefined>(undefined);
  const savingRef = useRef(false);
  const revisionRef = useRef(0);
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
    editable: !pendingSession && !libraryId && !readOnlyClassResource,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: "lesson-document-editor min-h-[calc(100vh-188px)] text-[#2b2926] outline-none",
      },
    },
  });

  useEffect(() => {
    if (!editor) return;

    const markDirty = () => {
      revisionRef.current += 1;
      setIsDirty(true);
    };
    editor.on("update", markDirty);
    return () => {
      editor.off("update", markDirty);
    };
  }, [editor]);

  useEffect(() => {
    if ((!libraryId && !readOnlyClassResource) || !editor) return;

    let cancelled = false;
    editor.setEditable(false);

    void (readOnlyClassResource
      ? getClassResourceLibraryContent(authFetch, classId!, resourceId!)
      : getLibraryContent(authFetch, libraryId!))
      .then((content) => {
        if (cancelled) return;
        const document = getLessonPlanDocument(content.payload);
        if (!document) throw new Error("Giáo án đã lưu có định dạng không hợp lệ.");

        libraryContentIdRef.current = content.id;
        librarySubjectRef.current = content.subject ?? undefined;
        editor.commands.setContent(document);
        revisionRef.current = 0;
        setIsDirty(false);
        editor.setEditable(!readOnlyClassResource);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setSaveStatus("error");
        setSaveError(error instanceof Error ? error.message : "Không thể mở giáo án đã lưu.");
        editor.setEditable(!readOnlyClassResource);
      });

    return () => {
      cancelled = true;
    };
  }, [authFetch, classId, editor, libraryId, readOnlyClassResource, resourceId]);

  useEffect(() => {
    if (!isDirty) return;

    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warnBeforeUnload);
    return () => window.removeEventListener("beforeunload", warnBeforeUnload);
  }, [isDirty]);

  const saveLesson = useCallback(
    async (session: LessonPlanSession | null = lessonSession) => {
      if (!editor || savingRef.current) return;

      savingRef.current = true;
      setSaveStatus("saving");
      setSaveError(null);
      const title = editor.state.doc.firstChild?.textContent.trim() || session?.display?.title || "Giáo án mới";
      const subject = (session?.display?.subjectCode as LibrarySubject | undefined) ?? librarySubjectRef.current;
      const revisionAtSave = revisionRef.current;
      const payload = {
        format: "tiptap-json",
        version: 1,
        document: editor.getJSON(),
        source: session
          ? {
              bookId: session.bookId,
              chapterId: session.chapterId,
              lessonId: session.lessonId,
              userPrompt: session.userPrompt,
            }
          : undefined,
      };
      const thumbnailUrl = createLessonThumbnail(title, subject, payload.document);

      try {
        if (libraryContentIdRef.current) {
          await updateLibraryContent(authFetch, libraryContentIdRef.current, { title, subject, payload, thumbnailUrl });
        } else {
          const created = await createLibraryContent(authFetch, {
            type: "LESSON_PLAN",
            title,
            subject,
            payload,
            thumbnailUrl,
          });
          libraryContentIdRef.current = created.id;
          librarySubjectRef.current = created.subject ?? undefined;
        }
        setSaveStatus("saved");
        if (revisionRef.current === revisionAtSave) setIsDirty(false);
      } catch (error: unknown) {
        setSaveStatus("error");
        setSaveError(error instanceof Error ? error.message : "Không thể lưu giáo án.");
      } finally {
        savingRef.current = false;
      }
    },
    [authFetch, editor, lessonSession],
  );

  const exportPdf = useCallback(() => {
    if (!editor) return;
    const title = editor.state.doc.firstChild?.textContent.trim() || "Giáo án";
    if (!openLessonPlanPrintDialog(title, editor.getHTML())) {
      setSaveStatus("error");
      setSaveError("Trình duyệt đã chặn cửa sổ in. Hãy cho phép popup rồi thử lại.");
    }
  }, [editor]);

  // Khi AI đã hoàn thành toàn bộ activity, lưu bản giáo án đầu tiên vào thư viện.
  useLessonPlanStream(editor, (session) => {
    setLessonSession(session);
    void saveLesson(session);
  }, !libraryId && !readOnlyClassResource);

  return (
    <main className="relative h-screen w-full overflow-hidden bg-[#F7F5F2] text-[#2b2926]">
      <div className="flex h-full w-full">
        <Sidebar />

        <section className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <header className="z-30 shrink-0 border-b border-[#e8e2d9] bg-[#fbfaf8] shadow-[0_1px_2px_rgba(43,41,38,0.06)]">
            <div className="@container flex min-h-12 items-center justify-between gap-3 px-3 py-1.5">
              <div className="flex min-w-0 shrink-0 items-center gap-1.5">
                {!readOnlyClassResource && <>
                <HeaderActionButton onClick={() => void saveLesson()} label={saveStatus === "saving" ? "Đang lưu..." : "Lưu"}>
                  <SaveIcon />
                </HeaderActionButton>
                <HeaderActionButton onClick={exportPdf} label="Xuất PDF">
                  <PrintIcon />
                </HeaderActionButton>
                <HeaderActionButton onClick={() => undefined} label="Tạo giáo án" primary>
                  <CreateLessonIcon />
                </HeaderActionButton>
                </>}
                {readOnlyClassResource && <span className="text-xs font-medium text-[#6b6b6b]">Chế độ chỉ xem</span>}
              </div>

              {!readOnlyClassResource && <button
                type="button"
                onClick={() => setAiCollapsed((current) => !current)}
                className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-[#e8e2d9] bg-white text-[#d97757] shadow-sm transition hover:bg-[#fff4ed]"
                aria-label={aiCollapsed ? "Show AI sidebar" : "Hide AI sidebar"}
              >
                <AiToggleIcon />
              </button>}
            </div>
            {!readOnlyClassResource && <div className="overflow-x-auto border-t border-[#efe8df] px-3 py-1.5">
              <div className="flex w-full justify-center">
                <div className="inline-flex max-w-full rounded-lg border border-[#e8e2d9] bg-white px-2 py-1 shadow-sm">
                  <ImageEnabledEditorTools editor={editor} authFetch={authFetch} />
                </div>
              </div>
            </div>}
            {saveStatus !== "idle" && (
              <p
                className={`px-3 pb-2 text-[11px] ${
                  saveStatus === "error" ? "text-[#c0492b]" : "text-[#6b6b6b]"
                }`}
                role={saveStatus === "error" ? "alert" : "status"}
              >
                {saveStatus === "saving"
                  ? "Đang lưu giáo án..."
                  : saveStatus === "saved"
                    ? "Đã lưu vào thư viện."
                    : saveError}
              </p>
            )}
            <Ruler bare margins={margins} onMarginsChange={setMargins} />
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-8 sm:px-6 lg:px-8">
            <LessonEditor margins={margins} editor={editor} />
          </div>
        </section>

        {!readOnlyClassResource && <AssistantPanel collapsed={aiCollapsed} />}
      </div>

      {editor && mathClick ? (
        <MathEditPopup editor={editor} info={mathClick} onClose={() => setMathClick(null)} />
      ) : null}
    </main>
  );
}

function getLessonPlanDocument(payload: unknown): JSONContent | null {
  if (!payload || typeof payload !== "object") return null;
  const document = (payload as { document?: unknown }).document;
  if (!document || typeof document !== "object") return null;
  return document as JSONContent;
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

function PrintIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M7 8V3h10v5M6 18H4V9h16v9h-2M7 14h10v7H7z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
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
