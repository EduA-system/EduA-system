"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { EditorContent, useEditor } from "@tiptap/react";
import { Sidebar } from "@/components/layout/Sidebar";
import { useAuth } from "@/lib/auth/AuthContext";
import { createLibraryContent, getLibraryContent, updateLibraryContent, type LibrarySubject } from "@/lib/library";
import { getClassResourceLibraryContent } from "@/lib/classroom";
import {
  ImageEnabledEditorTools,
  MathEditPopup,
  Ruler,
  createEditorExtensions,
  type MathClickInfo,
} from "@/components/LessonEditor";
import { usePracticeExamStream } from "@/components/LessonEditor/usePracticeExamStream";
import {
  readPracticeExamSession,
  type PracticeExam,
} from "@/services/practiceExamService";
import { examHtml, examLoadingSkeletonHtml, type Metadata } from "@/lib/practice-exam-html";
import { exportDocumentPdf, openExportedPdf } from "@/lib/document-export";

function draftMetadata(): Metadata {
  const fallback: Metadata = { subject: "Vật lí", grade: "10", duration: 15, difficulty: "MEDIUM" };
  if (typeof window === "undefined") return fallback;
  return readPracticeExamSession()?.display ?? fallback;
}

export function PracticeExamEditDashboard() {
  const { authFetch } = useAuth();
  const searchParams = useSearchParams();
  const classId = searchParams.get("classId");
  const resourceId = searchParams.get("resourceId");
  const readOnlyClassResource = Boolean(classId && resourceId);
  const [hasStreamingSession] = useState(() =>
    typeof window !== "undefined" && Boolean(readPracticeExamSession()),
  );
  const [metadata, setMetadata] = useState(draftMetadata);
  const [margins, setMargins] = useState({ left: 80, right: 80 });
  const [mathClick, setMathClick] = useState<MathClickInfo | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [libraryId, setLibraryId] = useState<string | null>(null);
  const [savedExam, setSavedExam] = useState<PracticeExam | null>(null);
  const [streamedExam, setStreamedExam] = useState<PracticeExam | null>(null);
  const [saving, setSaving] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [documentReady, setDocumentReady] = useState(() => !(typeof window !== "undefined" && new URLSearchParams(window.location.search).get("libraryId")));
  const [extensions] = useState(() =>
    createEditorExtensions({ onMathClick: setMathClick }),
  );
  const editor = useEditor({
    extensions,
    content: hasStreamingSession ? examLoadingSkeletonHtml(metadata) : examHtml(metadata, null),
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          "lesson-document-editor min-h-[calc(100vh-230px)] text-[#2b2926] outline-none",
      },
    },
  });
  usePracticeExamStream(editor, (exam) => setStreamedExam(exam), !readOnlyClassResource);

  useEffect(() => {
    const contentId = searchParams.get("libraryId");
    if ((!contentId && !readOnlyClassResource) || !editor) {
      if (editor) setDocumentReady(true);
      return;
    }
    setDocumentReady(false);
    const contentRequest = readOnlyClassResource
      ? getClassResourceLibraryContent(authFetch, classId!, resourceId!)
      : contentId ? getLibraryContent(authFetch, contentId) : null;
    if (!contentRequest) return;
    void contentRequest.then((content) => {
      const payload = content.payload as { exam?: PracticeExam; documentHtml?: string; grade?: number } | undefined;
      if (!payload?.documentHtml) return;
      editor.commands.setContent(payload.documentHtml);
      setSavedExam(payload.exam ?? null);
      setLibraryId(content.id);
      setMetadata((current) => ({
        ...current,
        subject: content.subject ?? current.subject,
        grade: payload.grade ? String(payload.grade) : current.grade,
      }));
      setNotice("Đang mở bài kiểm tra đã lưu từ thư viện.");
      if (readOnlyClassResource) editor.setEditable(false);
      setDocumentReady(true);
    }).catch(() => {
      setNotice("Không thể mở bài kiểm tra đã lưu.");
      setDocumentReady(false);
    });
  }, [authFetch, classId, editor, readOnlyClassResource, resourceId, searchParams]);

  async function saveDraft() {
    const exam = savedExam ?? streamedExam;
    if (!exam || !editor) { setNotice("Chưa có đề để lưu."); return; }
    const grade = Number(metadata.grade);
    if (![10, 11, 12].includes(grade)) { setNotice("Không xác định được lớp của đề. Vui lòng tạo đề lại từ màn cấu hình."); return; }
    setSaving(true);
    try {
      const payload = { exam, documentHtml: editor.getHTML(), grade };
      const subject = metadata.subject as LibrarySubject;
      const saved = libraryId
        ? await updateLibraryContent(authFetch, libraryId, { title: exam.title, subject, payload })
        : await createLibraryContent(authFetch, { type: "TEST", title: exam.title, subject, payload });
      setLibraryId(saved.id);
      setNotice("Đề đã được lưu vào Thư viện của tôi · Bài kiểm tra.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Không thể lưu đề vào thư viện.");
    } finally { setSaving(false); }
  }

  async function exportPdf() {
    if (!editor) { setNotice("Chưa có đề để xuất PDF."); return; }
    if (!documentReady) { setNotice("Đề kiểm tra đang tải, vui lòng đợi trong giây lát rồi xuất PDF."); return; }
    const title = editor.state.doc.firstChild?.textContent.trim() || savedExam?.title || streamedExam?.title || "Đề kiểm tra";
    setExportingPdf(true);
    setNotice(null);
    try {
      const result = await exportDocumentPdf(authFetch, {
        type: "TEST",
        title,
        documentHtml: editor.getHTML(),
        marginLeft: margins.left,
        marginRight: margins.right,
      });
      openExportedPdf(result);
      setNotice("Đã xuất PDF bài kiểm tra.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Không thể xuất PDF bài kiểm tra.");
    } finally {
      setExportingPdf(false);
    }
  }

  return (
    <main className="relative h-screen overflow-hidden bg-white text-[#2b2926]">
      <div className="flex h-full">
        <Sidebar activeHref="/exam-create-new" />
        <section className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <header className="z-30 shrink-0 border-b border-[#e8e2d9] bg-[#fbfaf8] shadow-[0_1px_2px_rgba(43,41,38,0.06)]">
            <div className="@container flex h-12 items-center justify-between gap-2 px-3">
              <div className="flex min-w-0 shrink-0 items-center gap-2">
                {!readOnlyClassResource && <Link
                  href="/exam-create-new"
                  className="hidden shrink-0 rounded-lg border border-[#e8e2d9] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#5f5750] hover:bg-[#f3efe9] @min-[850px]:inline-flex"
                >
                  ← Cấu hình
                </Link>}
                {!readOnlyClassResource && <button
                  type="button"
                  onClick={saveDraft}
                  disabled={saving}
                  className="hidden shrink-0 rounded-lg border border-[#e8e2d9] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#5f5750] hover:bg-[#f3efe9] @min-[750px]:inline-flex"
                >
                  {saving ? "Đang lưu..." : "Lưu"}
                </button>}
              </div>
              {readOnlyClassResource && <div className="flex min-w-0 flex-1 justify-center text-xs font-medium text-[#6b6b6b]">Chế độ chỉ xem</div>}
              {!readOnlyClassResource && <button
                type="button"
                onClick={() => void exportPdf()}
                disabled={exportingPdf || !documentReady}
                className="shrink-0 rounded-lg bg-[#d97757] px-2.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-[#c96545]"
              >
                {!documentReady ? "Đang tải..." : exportingPdf ? "Đang xuất..." : "Xuất đề"}
              </button>}
            </div>
            {/* Không đặt overflow-x-auto — EditorTools.tsx đã tự flex-wrap khi hẹp nên không cần
             * cuộn ngang, và overflow-x-auto một mình từng ép overflow-y thành auto theo spec CSS
             * (kể cả có khai overflow-y-visible tường minh cũng không chặn được, xem ghi chú ở
             * LessonEditDashboard.tsx) — bỏ hẳn để khối công cụ luôn là khối cứng. */}
            {!readOnlyClassResource && <div className="border-t border-[#efe8df] px-3 py-1.5">
              <div className="flex w-full justify-center">
                <div className="inline-flex max-w-full rounded-lg border border-[#e8e2d9] bg-white px-2 py-1 shadow-sm">
                  <ImageEnabledEditorTools editor={editor} authFetch={authFetch} />
                </div>
              </div>
            </div>}
            <Ruler bare margins={margins} onMarginsChange={setMargins} />
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {notice ? (
              <div className="mx-auto max-w-[1440px] px-5 pt-5 lg:px-8">
                <p
                  role="status"
                  className="rounded-lg bg-[#fff4ed] p-3 text-xs leading-5 text-[#8b5945]"
                >
                  {notice}
                </p>
              </div>
            ) : null}
            <div className={`mx-auto grid max-w-[1440px] gap-5 p-5 lg:p-8 ${readOnlyClassResource ? "max-w-[920px]" : ""}`}>
              <main className="min-w-0">
                <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#d97757]">
                      Soạn thảo trực tiếp
                    </p>
                    <h1 className="font-libertine mt-2 text-3xl sm:text-4xl">
                      Đề kiểm tra luyện tập
                    </h1>
                    <p className="mt-2 text-xs text-[#81776e]">
                      Dùng thanh công cụ để định dạng, chèn bảng, công thức, ảnh
                      và ký hiệu.
                    </p>
                  </div>
                  {!readOnlyClassResource && <span className="rounded-full bg-[#e8f5eb] px-3 py-1.5 text-xs font-semibold text-[#34704b]">
                    Đang chỉnh sửa
                  </span>}
                </div>
                <div className="mx-auto max-w-[816px] pb-10">
                  <div
                    className="bg-white py-14 shadow-[0_1px_2px_rgba(43,41,38,0.06),0_4px_14px_rgba(43,41,38,0.05)]"
                    style={{
                      paddingLeft: margins.left,
                      paddingRight: margins.right,
                    }}
                  >
                    <EditorContent editor={editor} />
                  </div>
                </div>
              </main>
            </div>
          </div>
        </section>
      </div>
      {editor && mathClick ? (
        <MathEditPopup
          editor={editor}
          info={mathClick}
          onClose={() => setMathClick(null)}
        />
      ) : null}
    </main>
  );
}
