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
import { useAuth } from "@/lib/auth/AuthContext";
import { AssistantPanel } from "../layout/AssistantPanel";
import { Sidebar } from "../layout/Sidebar";
import { ImageEnabledEditorTools } from "../LessonEditor";
import { LessonEditor, generatingLessonPlanSkeletonHtml, lessonPlan5512ToHtml } from "../LessonEditor";
import { createEditorExtensions, type MathClickInfo } from "../LessonEditor/editorConfig";
import { resolveDeadPendingActivities } from "../LessonEditor/pendingActivityNode";
import { scanPendingDiffs } from "../LessonEditor/sectionDiff";
import { MathEditPopup } from "../LessonEditor/MathEditPopup";
import { useLessonPlanStream } from "../LessonEditor/useLessonPlanStream";
import { Ruler } from "../LessonEditor/Ruler";
import { createLessonThumbnail } from "@/lib/library-thumbnail";
import { exportDocumentPdf, openExportedPdf } from "@/lib/document-export";

function parseLessonGrade(value: string | undefined): number | undefined {
  const match = value?.match(/\b(10|11|12)\b/);
  return match ? Number(match[1]) : undefined;
}

/** Nguồn SGK của giáo án — dùng để BE nạp lại `knowledge_json` khi AssistantPanel viết mới
 * hoàn toàn một mục còn trống. Khớp `source` trong payload lưu ở Personal Library. */
type LessonSource = { bookId: string; chapterId: string; lessonId: string };

export function LessonEditDashboard() {
  const { authFetch } = useAuth();
  const searchParams = useSearchParams();
  const libraryId = searchParams.get("libraryId");
  const [aiCollapsed, setAiCollapsed] = useState(false);
  const [margins, setMargins] = useState({ left: 80, right: 80 });
  // Đọc một lần lúc mount (lazy initializer) — tránh đọc lại sau khi
  // `useLessonPlanStream` đã `clearLessonPlanSession()`, khiến `editable` bị tính lại.
  const [pendingSession] = useState(() => readLessonPlanSession());
  const [lessonSession, setLessonSession] = useState<LessonPlanSession | null>(pendingSession);
  // Nguồn SGK khi mở lại giáo án đã lưu (không có phiên streaming sống nên không có
  // `lessonSession`) — đọc từ `payload.source` lúc load, dùng để BE nạp lại `knowledge_json`
  // cho AssistantPanel (xem `getLessonPlanSource`).
  const [lessonSource, setLessonSource] = useState<LessonSource | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [documentReady, setDocumentReady] = useState(!libraryId);
  const [isGeneratingLesson, setIsGeneratingLesson] = useState(Boolean(pendingSession));
  const [isDirty, setIsDirty] = useState(false);
  // Còn đề xuất AI (đang hiện diff đỏ/xanh trong tài liệu) chưa Chấp nhận/Bỏ — chặn "Lưu" khi
  // true, tránh lưu một bản giáo án dở dang có cả nội dung cũ/mới lẫn lộn mà sau khi mở lại
  // không còn cách nào chấp nhận/bỏ nữa (AssistantPanel dựng lại UI duyệt diff từ chính tài
  // liệu nên vẫn phục hồi được, nhưng tốt hơn là ngăn từ đầu). Suy từ chính tài liệu qua
  // `scanPendingDiffs`, không phải state riêng của AssistantPanel — đúng cho cả trường hợp
  // diff "mồ côi" (vd còn sót lại sau Ctrl+Z hồi sinh một diff đã xử lý).
  const [hasPendingAiDiff, setHasPendingAiDiff] = useState(false);
  const libraryContentIdRef = useRef<string | null>(null);
  const librarySubjectRef = useRef<LibrarySubject | undefined>(undefined);
  const libraryGradeRef = useRef<number | undefined>(undefined);
  const libraryTextbookCodeRef = useRef<string | undefined>(undefined);
  const libraryChapterCodeRef = useRef<string | undefined>(undefined);
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
    editable: !pendingSession && !libraryId,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: "lesson-document-editor min-h-[calc(100vh-188px)] text-[#2b2926] outline-none",
      },
    },
  });

  useEffect(() => {
    if (!editor) return;

    const syncPendingAiDiff = () => setHasPendingAiDiff(scanPendingDiffs(editor).length > 0);
    const markDirty = () => {
      revisionRef.current += 1;
      setIsDirty(true);
      syncPendingAiDiff();
    };
    editor.on("update", markDirty);
    // Quét ngay lúc gắn listener (qua hàm riêng, không gọi `markDirty` — không muốn đánh dấu
    // "dirty" chỉ vì mount) — nội dung ban đầu (mock/skeleton) không có diff nên thường là
    // false, nhưng khi mở lại từ Personal Library (`editor.commands.setContent` ở effect bên
    // dưới) vẫn phát sự kiện "update" nên `markDirty` tự chạy lại và bắt được cả trường hợp
    // một giáo án đã lưu TỪ TRƯỚC lỡ dính diff dở dang (vd do bug đã sửa).
    syncPendingAiDiff();
    return () => {
      editor.off("update", markDirty);
    };
  }, [editor]);

  useEffect(() => {
    if (!libraryId || !editor) return;

    let cancelled = false;
    // Hoãn sang microtask: setState đồng bộ trong thân effect gây cascading render
    // (react-hooks/set-state-in-effect), cùng cách đã dùng ở các màn khác.
    queueMicrotask(() => {
      if (!cancelled) setDocumentReady(false);
    });
    editor.setEditable(false);

    void getLibraryContent(authFetch, libraryId)
      .then((content) => {
        if (cancelled) return;
        const document = getLessonPlanDocument(content.payload);
        if (!document) throw new Error("Giáo án đã lưu có định dạng không hợp lệ.");
        // Mở lại từ Library là chắc chắn không còn phiên streaming sống — mọi node
        // pendingActivity còn sót lại (đang soạn dở hoặc đã lỗi) không thể tự phục hồi nữa,
        // nên "hoá" thành heading + "Mời soạn tay." thường để GV/AI chat sửa được ngay.
        const healedDocument = resolveDeadPendingActivities(document, true);
        const source = getLessonPlanSource(content.payload);
        if (source) setLessonSource(source);

        libraryContentIdRef.current = content.id;
        librarySubjectRef.current = content.subject ?? undefined;
        libraryGradeRef.current = content.grade ?? undefined;
        libraryTextbookCodeRef.current = content.textbookCode ?? undefined;
        libraryChapterCodeRef.current = content.chapterCode ?? undefined;
        editor.commands.setContent(healedDocument);
        revisionRef.current = 0;
        setIsDirty(false);
        editor.setEditable(true);
        setDocumentReady(true);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setSaveStatus("error");
        setSaveError(error instanceof Error ? error.message : "Không thể mở giáo án đã lưu.");
        editor.setEditable(true);
        setDocumentReady(false);
      });

    return () => {
      cancelled = true;
    };
  }, [authFetch, editor, libraryId]);

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
    async (session: LessonPlanSession | null = lessonSession, allowDuringGeneration = false) => {
      if (!editor || savingRef.current) return;
      if (isGeneratingLesson && !allowDuringGeneration) {
        setSaveStatus("error");
        setSaveError("Giáo án đang được tạo, vui lòng chờ hoàn tất trước khi lưu.");
        return;
      }
      // Chặn lưu khi tài liệu còn diff AI chưa Chấp nhận/Bỏ — quét trực tiếp thay vì tin
      // `hasPendingAiDiff` (state React có thể chưa kịp đồng bộ ngay sau lần "update" cuối)
      // để đảm bảo không bao giờ lưu một bản có cả nội dung cũ/mới lẫn lộn.
      if (scanPendingDiffs(editor).length > 0) {
        setSaveStatus("error");
        setSaveError("Còn đề xuất chỉnh sửa AI chưa Chấp nhận/Bỏ — hãy xử lý xong ở khung EDUA AI rồi lưu lại.");
        return;
      }

      savingRef.current = true;
      setSaveStatus("saving");
      setSaveError(null);
      const title = editor.state.doc.firstChild?.textContent.trim() || session?.display?.title || "Giáo án mới";
      const subject = (session?.display?.subjectCode as LibrarySubject | undefined) ?? librarySubjectRef.current;
      const grade = parseLessonGrade(session?.display?.grade) ?? libraryGradeRef.current;
      // Chương giao qua Mod (/weekly-schedule) so khớp đúng cặp (Sách, Chương) này để lọc tự động
      // trong popup "Chọn giáo án để nộp" — giữ nguyên giá trị cũ khi lưu lại không kèm session mới
      // (vd sửa nội dung rồi bấm Lưu) thay vì để trống.
      const textbookCode = session?.bookId ?? libraryTextbookCodeRef.current;
      const chapterCode = session?.chapterId ?? libraryChapterCodeRef.current;
      const revisionAtSave = revisionRef.current;
      // Chỉ thay node ĐÃ "failed" — node còn "pending" có thể vẫn đang sinh THẬT trong phiên
      // hiện tại (vd bấm "Lưu" tay giữa lúc generate), không được đụng vào (xem
      // `resolveDeadPendingActivities`). Chỉ transform bản JSON gửi đi lưu, không sửa editor
      // đang sống — luồng streaming vẫn cần node gốc để patch khi ACTIVITY_READY/FAILED về.
      const payload = {
        format: "tiptap-json",
        version: 1,
        document: resolveDeadPendingActivities(editor.getJSON(), false),
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
          await updateLibraryContent(authFetch, libraryContentIdRef.current, { title, subject, grade, textbookCode, chapterCode, payload, thumbnailUrl });
        } else {
          const created = await createLibraryContent(authFetch, {
            type: "LESSON_PLAN",
            title,
            subject,
            grade,
            textbookCode,
            chapterCode,
            payload,
            thumbnailUrl,
          });
          libraryContentIdRef.current = created.id;
          librarySubjectRef.current = created.subject ?? undefined;
          libraryGradeRef.current = created.grade ?? undefined;
          libraryTextbookCodeRef.current = created.textbookCode ?? undefined;
          libraryChapterCodeRef.current = created.chapterCode ?? undefined;
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
    [authFetch, editor, isGeneratingLesson, lessonSession],
  );

  const exportPdf = useCallback(async () => {
    if (!editor) return;
    if (!documentReady) {
      setSaveStatus("error");
      setSaveError("Giáo án đang tải, vui lòng đợi trong giây lát rồi xuất PDF.");
      return;
    }
    if (isGeneratingLesson) {
      setSaveStatus("error");
      setSaveError("Giáo án đang được tạo, vui lòng chờ hoàn tất trước khi xuất PDF.");
      return;
    }
    const title = editor.state.doc.firstChild?.textContent.trim() || "Giáo án";
    setExportingPdf(true);
    setSaveStatus("idle");
    setSaveError(null);
    try {
      const result = await exportDocumentPdf(authFetch, {
        type: "LESSON_PLAN",
        title,
        documentHtml: editor.getHTML(),
        marginLeft: margins.left,
        marginRight: margins.right,
      });
      openExportedPdf(result);
    } catch (error) {
      setSaveStatus("error");
      setSaveError(error instanceof Error ? error.message : "Không thể xuất PDF.");
    } finally {
      setExportingPdf(false);
    }
  }, [authFetch, documentReady, editor, isGeneratingLesson, margins.left, margins.right]);

  // Khi AI đã hoàn thành toàn bộ activity, lưu bản giáo án đầu tiên vào thư viện.
  useLessonPlanStream(editor, (session) => {
    setLessonSession(session);
    void saveLesson(session, true);
  }, () => setIsGeneratingLesson(false), !libraryId);

  // Ưu tiên phiên streaming đang sống (mới nhất); mở lại từ Library thì dùng `lessonSource`
  // đọc từ payload đã lưu.
  const activeSource: LessonSource | null = lessonSession
    ? { bookId: lessonSession.bookId, chapterId: lessonSession.chapterId, lessonId: lessonSession.lessonId }
    : lessonSource;

  return (
    <main className="relative h-screen w-full overflow-hidden bg-[#F7F5F2] text-[#2b2926]">
      <div className="flex h-full w-full">
        <Sidebar />

        <section className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <header className="z-30 shrink-0 border-b border-[#e8e2d9] bg-[#fbfaf8] shadow-[0_1px_2px_rgba(43,41,38,0.06)]">
            <div className="@container flex min-h-12 items-center justify-between gap-3 px-3 py-1.5">
              <div className="flex min-w-0 shrink-0 items-center gap-1.5">
                {!libraryId && (
                  <HeaderActionButton
                    onClick={() => void saveLesson()}
                    disabled={isGeneratingLesson || hasPendingAiDiff}
                    label={
                      isGeneratingLesson
                        ? "Đang tạo giáo án..."
                        : saveStatus === "saving"
                        ? "Đang lưu..."
                        : hasPendingAiDiff
                          ? "Còn đề xuất AI chưa duyệt"
                          : "Lưu"
                    }
                  >
                    <SaveIcon />
                  </HeaderActionButton>
                )}
                <HeaderActionButton
                  onClick={() => void exportPdf()}
                  disabled={isGeneratingLesson || exportingPdf || !documentReady}
                  label={isGeneratingLesson ? "Đang tạo giáo án..." : !documentReady ? "Đang tải giáo án..." : exportingPdf ? "Đang xuất..." : "Xuất PDF"}
                >
                  <PrintIcon />
                </HeaderActionButton>
              </div>

              {/* Trước đây chỉ có icon lấp lánh trơ trọi + `aria-label` tiếng Anh — không có
               * tooltip, không có chữ, GV nhìn vào không đoán được đây là nút bật/tắt trợ lý AI.
               * Giờ dùng đúng khuôn `HeaderActionButton` (title + nhãn hiện ở màn rộng) như 2 nút
               * bên trái, cộng thêm viền/nền đổi màu theo trạng thái đang mở/đóng để rõ cả 2 chiều
               * (đang bấm thì trông "nhấn xuống", không phải đoán qua icon suông). */}
              <HeaderActionButton
                onClick={() => setAiCollapsed((current) => !current)}
                active={!aiCollapsed}
                label={aiCollapsed ? "Mở trợ lý AI" : "Đóng trợ lý AI"}
              >
                <AiToggleIcon />
              </HeaderActionButton>
            </div>
            {/* KHÔNG đặt overflow-x-auto ở đây — theo spec CSS, "nếu overflow-x không phải
             * `visible` mà overflow-y LÀ `visible` (dù khai tường minh hay để mặc định), trình
             * duyệt tự đổi overflow-y thành `auto`" — nghĩa là dù có ghi thêm overflow-y-visible
             * (đã thử, KHÔNG ăn thua vì quy tắc trên xét trên GIÁ TRỊ visible chứ không phân biệt
             * khai tường minh hay mặc định) thì trục dọc vẫn bị ép thành auto, tự sinh thanh cuộn
             * dọc bất cứ khi nào chiều cao nội dung nhích quá khoảng chừa. `overflow-x-auto` ở
             * đây từ đầu cũng THỪA: EditorTools.tsx đã tự `flex-wrap` xuống dòng khi hẹp (không
             * cần cuộn ngang) — bỏ hẳn overflow-x-auto vừa hết vướng quy tắc trên, vừa đúng ý:
             * khối công cụ là khối cứng, không cuộn hướng nào, chỉ cao thêm khi bọc xuống dòng. */}
            <div className="border-t border-[#efe8df] px-3 py-1.5">
              <div className="flex w-full justify-center">
                <div className="inline-flex max-w-full rounded-lg border border-[#e8e2d9] bg-white px-2 py-1 shadow-sm">
                  <ImageEnabledEditorTools editor={editor} authFetch={authFetch} />
                </div>
              </div>
            </div>
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

        <AssistantPanel
          collapsed={aiCollapsed}
          onClose={() => setAiCollapsed(true)}
          editor={editor}
          authFetch={authFetch}
          bookId={activeSource?.bookId}
          chapterId={activeSource?.chapterId}
          lessonId={activeSource?.lessonId}
          lessonGenerationComplete={!isGeneratingLesson}
        />
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

function getLessonPlanSource(payload: unknown): LessonSource | null {
  if (!payload || typeof payload !== "object") return null;
  const source = (payload as { source?: unknown }).source;
  if (!source || typeof source !== "object") return null;
  const { bookId, chapterId, lessonId } = source as Record<string, unknown>;
  if (typeof bookId !== "string" || typeof chapterId !== "string" || typeof lessonId !== "string") return null;
  if (!bookId || !chapterId || !lessonId) return null;
  return { bookId, chapterId, lessonId };
}

function HeaderActionButton({
  children,
  label,
  onClick,
  primary = false,
  disabled = false,
  active = false,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  primary?: boolean;
  disabled?: boolean;
  /** Trạng thái "đang bật" cho nút kiểu toggle (vd mở/đóng panel AI) — khác `primary` (dành
   * cho nút hành động chính, luôn tô đặc màu cam bất kể trạng thái). `active` chỉ tô nhạt +
   * viền cam khi đang bật, để phân biệt trực quan với lúc tắt mà không lẫn với CTA chính. */
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-pressed={active}
      className={`flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-[13px] font-medium shadow-sm transition @min-[1100px]:px-3 disabled:cursor-not-allowed disabled:opacity-50 ${
        primary
          ? "border border-[#d97757] bg-[#d97757] text-white hover:bg-[#c96545]"
          : active
            ? "border border-[#d97757] bg-[#fff4ed] text-[#d97757] hover:bg-[#ffe9dc]"
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
