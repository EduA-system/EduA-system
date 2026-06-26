"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { OutlineEditor } from "@/components/outline-editor/OutlineEditor";
import { generateOutline, type OutlinePart } from "@/lib/api/slides";
import { logSlideApi } from "@/lib/ws/slide-debug-log";
import {
  patchSlideCreateSession,
  readSlideCreateSession,
  writeActiveGeneration,
  type SlideGenerationSession,
} from "@/lib/slide-create/session";

type Status = "loading" | "outlining" | "ready" | "error";

type OutlinePageState = {
  session: SlideGenerationSession | null;
  status: Status;
  parts: OutlinePart[];
  error?: string;
  needsOutline: boolean;
};

function loadOutlinePageState(): OutlinePageState {
  const stored = readSlideCreateSession();
  if (!stored) {
    return {
      session: null,
      status: "error",
      parts: [],
      error: "Chưa có giáo án. Hãy chọn bài từ trang Tạo Slide.",
      needsOutline: false,
    };
  }
  if (stored.outlineParts && stored.sessionId && stored.topic) {
    return {
      session: stored,
      status: "ready",
      parts: stored.outlineParts,
      needsOutline: false,
    };
  }
  return {
    session: stored,
    status: "outlining",
    parts: [],
    needsOutline: true,
  };
}

export default function SlideOutlinePage() {
  const router = useRouter();
  const [pageState, setPageState] = useState<OutlinePageState>(loadOutlinePageState);
  const [confirming, setConfirming] = useState(false);

  const { session, status, parts, error, needsOutline } = pageState;
  const outlineRequestedRef = useRef(false);

  useEffect(() => {
    if (!needsOutline || !session || outlineRequestedRef.current) return;
    outlineRequestedRef.current = true;

    void (async () => {
      logSlideApi("outline page: generating outline…", {
        lessonId: session.lessonCardId,
        lessonTitle: session.lessonTitle,
      });
      try {
        const res = await generateOutline({
          lessonId: session.lessonCardId,
          lessonTitle: session.lessonTitle,
          lessonSummary: session.lessonSummary,
          grade: session.grade,
          plan: session.inlinePlan,
          styleHint: session.styleHint,
        });

        patchSlideCreateSession({
          sessionId: res.sessionId,
          topic: res.topic,
          outlineParts: res.outline.parts,
        });

        setPageState({
          session: {
            ...session,
            sessionId: res.sessionId,
            topic: res.topic,
            outlineParts: res.outline.parts,
          },
          status: "ready",
          parts: res.outline.parts,
          needsOutline: false,
        });
      } catch (err) {
        console.error("[EDUA slide] outline page error", err);
        setPageState((prev) => ({
          ...prev,
          status: "error",
          error: err instanceof Error ? err.message : String(err),
          needsOutline: false,
        }));
      }
    })();
  }, [needsOutline, session]);

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
              <p className="text-sm text-[#5c5b6e]">AI đang tạo đề cương slide…</p>
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
              initialParts={parts}
              onConfirm={handleConfirm}
              confirming={confirming}
            />
          ) : null}
        </div>
      </section>
    </main>
  );
}
