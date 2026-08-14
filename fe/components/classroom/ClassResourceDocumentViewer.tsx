"use client";

import { useEffect, useState } from "react";
import { generateHTML } from "@tiptap/core";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AlertCircle, ArrowLeft, Download, Loader2 } from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import { createEditorExtensions } from "@/components/LessonEditor/editorConfig";
import { RichView } from "@/components/blog/RichView";
import { useAuth } from "@/lib/auth/AuthContext";
import { getClassResourceLibraryContent, type ClassResourceLibraryContent } from "@/lib/classroom";
import { exportDocumentPdf, openExportedPdf } from "@/lib/document-export";
import type { TiptapNode } from "@/lib/tiptap-to-text";

type DocumentKind = "lesson" | "exam";
type ViewerState = {
  key: string;
  content: ClassResourceLibraryContent | null;
  document: TiptapNode | string | null;
  error: string;
};

function getLessonDocument(payload: unknown): TiptapNode | string | null {
  if (!payload || typeof payload !== "object") return null;
  const record = payload as { format?: unknown; document?: unknown; html?: unknown; documentHtml?: unknown };
  if (record.format === "tiptap-json" && record.document && typeof record.document === "object") {
    return record.document as TiptapNode;
  }
  if (typeof record.documentHtml === "string") return record.documentHtml;
  if (typeof record.html === "string") return record.html;
  return null;
}

function getExamDocument(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const record = payload as { documentHtml?: unknown; html?: unknown };
  if (typeof record.documentHtml === "string") return record.documentHtml;
  if (typeof record.html === "string") return record.html;
  return null;
}

function resolveDocument(content: ClassResourceLibraryContent, kind: DocumentKind): TiptapNode | string | null {
  if (kind === "lesson") return getLessonDocument(content.payload);
  return getExamDocument(content.payload);
}

function documentToHtml(document: TiptapNode | string): string {
  return typeof document === "string"
    ? document
    : generateHTML(document, createEditorExtensions());
}

function viewerErrorMessage(reason: unknown): string {
  const message = reason instanceof Error ? reason.message : "Không thể mở tài nguyên.";
  if (message === "Class resource not found.") {
    return "Không tìm thấy tài nguyên. Tài nguyên này có thể đã bị giáo viên xóa.";
  }
  return message;
}

export function ClassResourceDocumentViewer({ kind }: { kind: DocumentKind }) {
  const { authFetch, user } = useAuth();
  const params = useSearchParams();
  const classId = params.get("classId") ?? "";
  const resourceId = params.get("resourceId") ?? "";
  const missingParams = !classId || !resourceId;
  const assignmentDetailHref = `${user?.role === "STUDENT" ? "/detail-resource" : "/class-detail"}?${new URLSearchParams({ classId, resourceId }).toString()}`;
  const requestKey = `${kind}:${classId}:${resourceId}`;
  const [viewer, setViewer] = useState<ViewerState>({ key: "", content: null, document: null, error: "" });
  const [exportingPdf, setExportingPdf] = useState(false);
  const [exportError, setExportError] = useState("");

  useEffect(() => {
    let cancelled = false;
    if (missingParams) return;

    void getClassResourceLibraryContent(authFetch, classId, resourceId)
      .then((item) => {
        if (cancelled) return;
        const resolved = resolveDocument(item, kind);
        if (!resolved) throw new Error(kind === "lesson" ? "Giáo án này không có nội dung để hiển thị." : "Bài kiểm tra này không có nội dung để hiển thị.");
        setViewer({ key: requestKey, content: item, document: resolved, error: "" });
      })
      .catch((reason: unknown) => {
        if (cancelled) return;
        setViewer({
          key: requestKey,
          content: null,
          document: null,
          error: viewerErrorMessage(reason),
        });
      });

    return () => {
      cancelled = true;
    };
  }, [authFetch, classId, kind, missingParams, requestKey, resourceId]);

  const stale = viewer.key !== requestKey;
  const displayError = missingParams ? "Thiếu thông tin lớp hoặc tài nguyên." : stale ? "" : viewer.error;
  const loading = !missingParams && stale;

  async function exportPdf() {
    if (!viewer.document || !viewer.content) return;
    setExportingPdf(true);
    setExportError("");
    try {
      const result = await exportDocumentPdf(authFetch, {
        type: kind === "lesson" ? "LESSON_PLAN" : "TEST",
        title: viewer.content.title,
        documentHtml: documentToHtml(viewer.document),
      });
      openExportedPdf(result);
    } catch (reason) {
      setExportError(reason instanceof Error ? reason.message : "Không thể xuất PDF.");
    } finally {
      setExportingPdf(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f7f5f2] text-[#2b2926]">
      <div className="flex min-h-screen">
        <Sidebar />
        <section className="min-w-0 flex-1 px-4 py-8 sm:px-6 lg:px-10">
          <div className="mx-auto max-w-[980px]">
            {!missingParams && (
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <Link
                  href={assignmentDetailHref}
                  className="inline-flex items-center gap-2 rounded-lg border border-[#d8d1c9] bg-white px-3 py-2 text-sm font-medium text-[#4f4943] transition hover:border-[#d97757] hover:bg-[#fff4ed] hover:text-[#c96545]"
                >
                  <ArrowLeft className="size-4" />
                  Quay lại chi tiết bài tập
                </Link>
                {user?.role === "STUDENT" && viewer.document && viewer.content && (
                  <button
                    type="button"
                    onClick={() => void exportPdf()}
                    disabled={exportingPdf}
                    className="inline-flex items-center gap-2 rounded-lg bg-[#d97757] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[#c96545] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {exportingPdf ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
                    {exportingPdf ? "Đang xuất..." : "Xuất PDF"}
                  </button>
                )}
              </div>
            )}
            {exportError && (
              <p role="alert" className="mb-5 rounded-lg border border-[#e8b4a4] bg-[#fdf3ef] px-3 py-2 text-sm text-[#c0492b]">
                {exportError}
              </p>
            )}
            {displayError ? (
              <div className="flex min-h-[280px] items-center justify-center gap-2 rounded-xl border border-[#e8b4a4] bg-[#fdf3ef] px-5 text-sm text-[#c0492b]">
                <AlertCircle className="size-4 shrink-0" />
                {displayError}
              </div>
            ) : loading ? (
              <div className="flex min-h-[360px] items-center justify-center gap-2 rounded-xl border border-[#e8e2d9] bg-white text-sm text-[#6b6b6b]">
                <Loader2 className="size-4 animate-spin" />
                Đang mở tài nguyên...
              </div>
            ) : viewer.document ? (
              <article className="bg-white px-8 py-10 shadow-[0_1px_2px_rgba(43,41,38,0.06),0_8px_28px_rgba(43,41,38,0.08)] sm:px-12 lg:px-16">
                {viewer.content?.title ? <h1 className="sr-only">{viewer.content.title}</h1> : null}
                <RichView html={viewer.document} variant="document" />
              </article>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}
