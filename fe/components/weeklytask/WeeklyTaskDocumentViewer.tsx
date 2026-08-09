"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AlertCircle, Loader2 } from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import { RichView } from "@/components/blog/RichView";
import { useAuth } from "@/lib/auth/AuthContext";
import { getWeeklyTask, type WeeklyTaskDetail } from "@/lib/weekly-task";
import type { TiptapNode } from "@/lib/tiptap-to-text";

type ViewerState = { key: string; detail: WeeklyTaskDetail | null; document: TiptapNode | string | null; error: string };

/** Cùng shape payload với `LibraryContent` (`ClassResourceDocumentViewer.getLessonDocument`) — giáo án
 * nộp qua "chọn từ thư viện" luôn ở dạng `{ format: "tiptap-json", document: {...} }`. */
export function resolveWeeklyTaskLessonDocument(payload: unknown): TiptapNode | string | null {
  if (!payload || typeof payload !== "object") return null;
  const record = payload as { format?: unknown; document?: unknown; documentHtml?: unknown; html?: unknown };
  if (record.format === "tiptap-json" && record.document && typeof record.document === "object") {
    return record.document as TiptapNode;
  }
  if (typeof record.documentHtml === "string") return record.documentHtml;
  if (typeof record.html === "string") return record.html;
  return null;
}

/**
 * Xem read-only giáo án đã nộp cho 1 Weekly Task — dùng chung pattern hiển thị với
 * `ClassResourceDocumentViewer` (Sidebar + `RichView variant="document"`), thay vì dump thẳng JSON như
 * trước ở `/lesson-plan-approval`.
 *
 * Khác `ClassResourceDocumentViewer`: không fetch lại `LibraryContent` gốc theo id (Moderator không sở
 * hữu nội dung của Teacher, `GET /api/library/contents/{id}` sẽ 403) — dùng thẳng
 * `sourceLibraryContentPayload` đã denormalize sẵn vào `WeeklyTask` lúc Teacher nộp
 * (`WeeklyTaskService.submit`), lấy qua `GET /api/weekly-tasks/{id}` (Moderator cùng subject xem được).
 */
export function WeeklyTaskDocumentViewer() {
  const { authFetch } = useAuth();
  const params = useSearchParams();
  const taskId = params.get("taskId") ?? "";
  const missingParams = !taskId;
  const [viewer, setViewer] = useState<ViewerState>({ key: "", detail: null, document: null, error: "" });

  useEffect(() => {
    let cancelled = false;
    if (missingParams) return;

    void getWeeklyTask(authFetch, taskId)
      .then((detail) => {
        if (cancelled) return;
        const resolved = resolveWeeklyTaskLessonDocument(detail.sourceLibraryContentPayload);
        if (!resolved) throw new Error("Nhiệm vụ này không có nội dung giáo án để hiển thị.");
        setViewer({ key: taskId, detail, document: resolved, error: "" });
      })
      .catch((reason: unknown) => {
        if (cancelled) return;
        setViewer({
          key: taskId,
          detail: null,
          document: null,
          error: reason instanceof Error ? reason.message : "Không thể mở giáo án.",
        });
      });

    return () => {
      cancelled = true;
    };
  }, [authFetch, missingParams, taskId]);

  const stale = viewer.key !== taskId;
  const displayError = missingParams ? "Thiếu thông tin lịch nộp giáo án." : stale ? "" : viewer.error;
  const loading = !missingParams && stale;

  return (
    <main className="min-h-screen bg-[#f7f5f2] text-[#2b2926]">
      <div className="flex min-h-screen">
        <Sidebar />
        <section className="min-w-0 flex-1 px-4 py-8 sm:px-6 lg:px-10">
          <div className="mx-auto max-w-[980px]">
            {displayError ? (
              <div className="flex min-h-[280px] items-center justify-center gap-2 rounded-xl border border-[#e8b4a4] bg-[#fdf3ef] px-5 text-sm text-[#c0492b]">
                <AlertCircle className="size-4 shrink-0" />
                {displayError}
              </div>
            ) : loading ? (
              <div className="flex min-h-[360px] items-center justify-center gap-2 rounded-xl border border-[#e8e2d9] bg-white text-sm text-[#6b6b6b]">
                <Loader2 className="size-4 animate-spin" />
                Đang mở giáo án...
              </div>
            ) : viewer.document ? (
              <article className="bg-white px-8 py-10 shadow-[0_1px_2px_rgba(43,41,38,0.06),0_8px_28px_rgba(43,41,38,0.08)] sm:px-12 lg:px-16">
                {viewer.detail?.sourceLibraryContentTitle ? <h1 className="sr-only">{viewer.detail.sourceLibraryContentTitle}</h1> : null}
                <RichView html={viewer.document} variant="document" />
              </article>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}
