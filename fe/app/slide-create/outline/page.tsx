"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { OutlineEditor } from "@/components/outline-editor/OutlineEditor";
import { generateOutline, type OutlinePart } from "@/lib/api/slides";
import { connectOutlineStream, type OutlineEvent } from "@/lib/ws/outline-client";
import { logSlideApi } from "@/lib/ws/slide-debug-log";
import {
  patchSlideCreateSession,
  readSlideCreateSession,
  writeActiveGeneration,
  type SlideGenerationSession,
} from "@/lib/slide-create/session";

type Status = "loading" | "outlining" | "ready" | "error";

type OutlineBoot = {
  session: SlideGenerationSession | null;
  status: Status;
  parts: OutlinePart[];
  error?: string;
};

function loadOutlineBoot(): OutlineBoot {
  const stored = readSlideCreateSession();
  if (!stored) {
    return {
      session: null,
      status: "error",
      parts: [],
      error: "Chưa có giáo án. Hãy chọn bài từ trang Tạo Slide.",
    };
  }
  if (stored.outlineParts && stored.sessionId && stored.topic) {
    // Đã có outline (quay lại) — không cần stream.
    return { session: stored, status: "ready", parts: stored.outlineParts };
  }
  return { session: stored, status: "outlining", parts: [] };
}

export default function SlideOutlinePage() {
  const router = useRouter();
  const [boot] = useState(loadOutlineBoot);
  const [session, setSession] = useState<SlideGenerationSession | null>(boot.session);
  const [status, setStatus] = useState<Status>(boot.status);
  const [parts, setParts] = useState<OutlinePart[]>(boot.parts);
  const [error, setError] = useState<string | undefined>(boot.error);
  const [expandingPartIds, setExpandingPartIds] = useState<string[]>([]);
  const [confirming, setConfirming] = useState(false);

  const disconnectRef = useRef<(() => void) | null>(null);

  const handleOutlineEvent = useCallback((event: OutlineEvent) => {
    if (event.type === "OUTLINE_PART_READY") {
      setParts((prev) =>
        prev.map((p) =>
          p.id !== event.partId
            ? p
            : {
                ...p,
                slides: p.slides.map((s) => {
                  const filled = event.slides.find((x) => x.id === s.id);
                  return filled ? { ...s, ...filled } : s;
                }),
              },
        ),
      );
      setExpandingPartIds((prev) => prev.filter((id) => id !== event.partId));
    } else if (event.type === "OUTLINE_PART_FAILED") {
      setExpandingPartIds((prev) => prev.filter((id) => id !== event.partId));
    } else if (event.type === "DONE" || event.type === "ERROR") {
      setExpandingPartIds([]);
    }
  }, []);

  // Sinh khung (pha 1) + subscribe stream (pha 2) một lần.
  useEffect(() => {
    if (status !== "outlining" || !session) return;
    let cancelled = false;

    void (async () => {
      logSlideApi("outline page: generating structure…", {
        lessonId: session.lessonCardId,
        lessonTitle: session.lessonTitle,
      });
      try {
        const res = await generateOutline({
          lessonId: session.lessonCardId,
          lessonTitle: session.lessonTitle,
          lessonSummary: session.lessonSummary,
          grade: session.grade,
          subject: session.subject,
          plan: session.inlinePlan,
          styleHint: session.styleHint,
        });
        if (cancelled) return;

        patchSlideCreateSession({
          sessionId: res.sessionId,
          topic: res.topic,
          outlineParts: res.outline.parts,
        });
        setSession((prev) =>
          prev
            ? { ...prev, sessionId: res.sessionId, topic: res.topic, outlineParts: res.outline.parts }
            : prev,
        );
        setParts(res.outline.parts);
        setExpandingPartIds(res.outline.parts.map((p) => p.id));
        setStatus("ready");

        const { disconnect } = connectOutlineStream({
          topic: res.outlineTopic,
          onEvent: handleOutlineEvent,
          onClose: () => {
            disconnectRef.current = null;
          },
        });
        disconnectRef.current = disconnect;
      } catch (err) {
        if (cancelled) return;
        console.error("[EDUA slide] outline page error", err);
        setStatus("error");
        setError(err instanceof Error ? err.message : String(err));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [status, session, handleOutlineEvent]);

  // Ngắt kết nối khi rời trang.
  useEffect(() => () => disconnectRef.current?.(), []);

  // DEBUG: log toàn bộ nội dung outline mỗi khi thay đổi.
  useEffect(() => {
    console.log(
      "[EDUA slide] OUTLINE FULL",
      JSON.stringify(
        {
          status,
          partCount: parts.length,
          slideCount: parts.reduce((sum, p) => sum + p.slides.length, 0),
          parts: parts.map((p) => ({
            id: p.id,
            title: p.title,
            slides: p.slides.map((s) => ({
              id: s.id,
              title: s.title,
              kind: s.kind,
              pedagogicalRole: s.pedagogicalRole,
              layoutHint: s.layoutHint,
              durationMinutes: s.durationMinutes,
              content: s.content,
              requiredFacts: s.requiredFacts,
              quizItems: s.quizItems,
              visual: s.visual,
              aiNote: s.aiNote,
            })),
          })),
        },
        null,
        2,
      ),
    );
  }, [parts, status]);

  // Lưu outline (khung + nội dung stream + sửa tay) vào session để giữ khi quay lại.
  useEffect(() => {
    if (status === "ready" && parts.length > 0) {
      patchSlideCreateSession({ outlineParts: parts });
    }
  }, [parts, status]);

  const handleConfirm = useCallback(
    async (editedParts: OutlinePart[]) => {
      if (!session?.sessionId || !session.topic) return;
      setConfirming(true);
      writeActiveGeneration({
        sessionId: session.sessionId,
        topic: session.topic,
        lessonId: session.lessonCardId,
        lessonTitle: session.lessonTitle,
        lessonSummary: session.lessonSummary,
        grade: session.grade,
        styleHint: session.styleHint,
        subject: session.subject,
        parts: editedParts,
        mode: "design",
      });
      patchSlideCreateSession({ outlineParts: editedParts });
      router.push("/slide-maker?generating=1");
    },
    [session, router],
  );

  return (
    <main className="flex h-screen w-full overflow-hidden bg-[#f9f8f3] text-[#1a1a2e]">
      <Sidebar activeHref="/slide-create" />
      <section className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-[rgba(26,26,46,0.07)] px-8 py-4">
          <nav className="flex items-center gap-2 text-[12px] text-[#9998be]">
            <Link href="/slide-create" className="hover:text-[#1a1a2e]">
              Tạo Slide
            </Link>
            <span>/</span>
            <span className="font-medium text-[#1a1a2e]">Đề cương</span>
          </nav>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {status === "outlining" ? (
            <div className="flex flex-col items-center justify-center gap-3 px-6 py-24 text-center">
              <div className="size-8 animate-spin rounded-full border-2 border-[#8200db] border-t-transparent" />
              <p className="text-sm text-[#5c5b6e]">AI đang tạo khung đề cương slide…</p>
            </div>
          ) : null}

          {status === "error" ? (
            <div className="mx-auto max-w-md px-6 py-24 text-center">
              <p className="text-sm text-red-600">{error ?? "Đã xảy ra lỗi."}</p>
              <Link
                href="/slide-create"
                className="mt-4 inline-block rounded-xl bg-[#1c1b2e] px-5 py-2 text-sm font-medium text-[#f9f8f3]"
              >
                Quay lại
              </Link>
            </div>
          ) : null}

          {status === "ready" && session ? (
            <OutlineEditor
              lessonTitle={session.lessonTitle}
              parts={parts}
              onChange={setParts}
              onConfirm={handleConfirm}
              confirming={confirming}
              expandingPartIds={expandingPartIds}
            />
          ) : null}
        </div>
      </section>
    </main>
  );
}
