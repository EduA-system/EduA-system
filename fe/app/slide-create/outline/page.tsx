"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { OutlineEditor } from "@/components/outline-editor/OutlineEditor";
import { generateOutline, retryOutlineSessionSlide, startOutlineSession, type OutlinePart } from "@/lib/api/slides";
import { useAuth } from "@/lib/auth/AuthContext";
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

function slideKey(partId: string, slideId: string) {
  return `${partId}:${slideId}`;
}

function sameItems(left: string[], right: string[]) {
  return left.length === right.length && left.every((item, index) => item === right[index]);
}

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
  const { accessToken, authFetch, status: authStatus } = useAuth();
  const [boot] = useState(loadOutlineBoot);
  const [session, setSession] = useState<SlideGenerationSession | null>(boot.session);
  const [status, setStatus] = useState<Status>(boot.status);
  const [parts, setParts] = useState<OutlinePart[]>(boot.parts);
  const [error, setError] = useState<string | undefined>(boot.error);
  const [expandingPartIds, setExpandingPartIds] = useState<string[]>([]);
  const [expandingSlideIds, setExpandingSlideIds] = useState<string[]>([]);
  const [failedPartMessages, setFailedPartMessages] = useState<Record<string, string>>({});
  const [failedSlideMessages, setFailedSlideMessages] = useState<Record<string, string>>({});
  const [confirming, setConfirming] = useState(false);

  const disconnectRef = useRef<(() => void) | null>(null);
  const outlineRequestRef = useRef<ReturnType<typeof generateOutline> | null>(null);

  const handleOutlineEvent = useCallback((event: OutlineEvent) => {
    if (event.type === "OUTLINE_PART_SKELETON_READY") {
      setParts((prev) => prev.map((part) => (part.id === event.part.id ? event.part : part)));
      setExpandingSlideIds((prev) => [
        ...new Set([
          ...prev,
          ...(event.part.slides ?? []).map((slide) => slideKey(event.part.id, slide.id)),
        ]),
      ]);
    } else if (event.type === "OUTLINE_PART_READY") {
      setParts((prev) =>
        prev.map((p) =>
          p.id !== event.partId
            ? p
            : {
                ...p,
                // The backend may replace one dense outline item with two items.
                // Use the completed ordered list rather than merging only matching ids.
                slides: event.slides,
              },
        ),
      );
      setExpandingPartIds((prev) => prev.filter((id) => id !== event.partId));
      setExpandingSlideIds((prev) => prev.filter((id) => !id.startsWith(`${event.partId}:`)));
      setFailedPartMessages((prev) => {
        const next = { ...prev };
        delete next[event.partId];
        return next;
      });
    } else if (event.type === "OUTLINE_PART_FAILED") {
      logSlideApi(`outline part failed: ${event.partId}`);
      setExpandingPartIds((prev) => prev.filter((id) => id !== event.partId));
      setExpandingSlideIds((prev) => prev.filter((id) => !id.startsWith(`${event.partId}:`)));
      const part = parts.find((candidate) => candidate.id === event.partId);
      const message = event.message || "AI chưa thể soạn slide này.";
      if (part?.slides?.length) {
        setFailedSlideMessages((prev) => {
          const next = { ...prev };
          for (const slide of part.slides) next[slideKey(event.partId, slide.id)] = message;
          return next;
        });
        setFailedPartMessages((prev) => {
          const next = { ...prev };
          delete next[event.partId];
          return next;
        });
      } else {
        setFailedPartMessages((prev) => ({ ...prev, [event.partId]: event.message || "AI chưa thể tạo khung slide cho phần này." }));
      }
    } else if (event.type === "OUTLINE_SLIDE_READY") {
      const key = slideKey(event.partId, event.slide.id);
      setParts((prev) =>
        prev.map((part) => {
          if (part.id !== event.partId) return part;
          const slides = part.slides ?? [];
          const exists = slides.some((slide) => slide.id === event.slide.id);
          return {
            ...part,
            slides: exists
              ? slides.map((slide) => (slide.id === event.slide.id ? event.slide : slide))
              : [...slides, event.slide],
          };
        }),
      );
      setExpandingSlideIds((prev) => prev.filter((id) => id !== key));
      setFailedSlideMessages((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      setFailedPartMessages((prev) => {
        const next = { ...prev };
        delete next[event.partId];
        return next;
      });
    } else if (event.type === "OUTLINE_SLIDE_FAILED") {
      const key = slideKey(event.partId, event.slideId);
      logSlideApi(`outline slide failed: ${event.partId}/${event.slideId}`);
      setExpandingSlideIds((prev) => prev.filter((id) => id !== key));
      setFailedSlideMessages((prev) => ({ ...prev, [key]: event.message || "AI chưa thể soạn slide này." }));
    } else if (event.type === "DONE" || event.type === "ERROR") {
      setExpandingPartIds([]);
      setExpandingSlideIds([]);
    }
  }, [parts]);

  // Sinh khung (pha 1) + subscribe stream (pha 2) một lần.
  useEffect(() => {
    if (status !== "outlining" || !session) return;
    if (authStatus === "loading") return;
    let cancelled = false;
    if (authStatus !== "authenticated" || !accessToken) {
      queueMicrotask(() => {
        if (cancelled) return;
        setStatus("error");
      setError("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại để tạo slide.");
      });
      return () => {
        cancelled = true;
      };
    }

    void (async () => {
      logSlideApi("outline page: generating structure…", {
        lessonId: session.lessonCardId,
        lessonTitle: session.lessonTitle,
      });
      try {
        const request =
          outlineRequestRef.current ??
          generateOutline(authFetch, {
            lessonId: session.lessonCardId,
            libraryContentId: session.libraryContentId,
            lessonTitle: session.lessonTitle,
            lessonSummary: session.lessonSummary,
            grade: session.grade,
            subject: session.subject,
            lessonContent: session.lessonContent,
            plan: session.inlinePlan,
            styleHint: session.styleHint,
          });
        outlineRequestRef.current = request;
        const res = await request;
        if (cancelled) return;

        patchSlideCreateSession({
          sessionId: res.sessionId,
          topic: session.lessonTitle,
          outlineParts: res.outline.parts,
        });
        setSession((prev) =>
          prev
            ? { ...prev, sessionId: res.sessionId, topic: prev.lessonTitle, outlineParts: res.outline.parts }
            : prev,
        );
        setParts(res.outline.parts);
        setExpandingPartIds(res.outline.parts.map((p) => p.id));
        setExpandingSlideIds([]);
        setFailedPartMessages({});
        setFailedSlideMessages({});
        setStatus("ready");

        const { disconnect } = connectOutlineStream({
          topic: res.outlineTopic,
          accessToken,
          onEvent: handleOutlineEvent,
          onReady: () => {
            void startOutlineSession(authFetch, res.sessionId).catch((startError) => {
              if (!cancelled) {
                setStatus("error");
                setError(startError instanceof Error ? startError.message : String(startError));
              }
            });
          },
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
  }, [accessToken, authFetch, authStatus, status, session, handleOutlineEvent]);

  const handleRetrySlide = useCallback(async (partId: string, slideId: string) => {
    if (!session?.sessionId) return;
    const key = slideKey(partId, slideId);
    setExpandingSlideIds((prev) => [...new Set([...prev, key])]);
    setFailedSlideMessages((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    try {
      await retryOutlineSessionSlide(authFetch, session.sessionId, partId, slideId);
    } catch (err) {
      setExpandingSlideIds((prev) => prev.filter((id) => id !== key));
      setFailedSlideMessages((prev) => ({ ...prev, [key]: err instanceof Error ? err.message : String(err) }));
    }
  }, [authFetch, session]);

  useEffect(() => {
    if (status !== "ready") return;

    const slideKeysByPart = new Map<string, Set<string>>();
    for (const part of parts) {
      slideKeysByPart.set(part.id, new Set((part.slides ?? []).map((slide) => slideKey(part.id, slide.id))));
    }

    const validExpandingSlideIds = expandingSlideIds.filter((key) => {
      const separator = key.indexOf(":");
      if (separator < 0) return false;
      const partId = key.slice(0, separator);
      return slideKeysByPart.get(partId)?.has(key) ?? false;
    });

    if (!sameItems(expandingSlideIds, validExpandingSlideIds)) {
      setExpandingSlideIds(validExpandingSlideIds);
    }

    setExpandingPartIds((current) => {
      const next = current.filter((partId) => {
        const slideKeys = slideKeysByPart.get(partId);
        if (!slideKeys || slideKeys.size === 0) return true;
        return validExpandingSlideIds.some((key) => slideKeys.has(key));
      });
      return sameItems(current, next) ? current : next;
    });
  }, [expandingSlideIds, parts, status]);

  // Ngắt kết nối khi rời trang.
  useEffect(() => () => disconnectRef.current?.(), []);

  // DEBUG: log toàn bộ nội dung outline mỗi khi thay đổi.
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
        topic: session.lessonTitle,
        lessonId: session.lessonCardId,
        lessonTitle: session.lessonTitle,
        lessonSummary: session.lessonSummary,
        grade: session.grade,
        styleHint: session.styleHint,
        subject: session.subject,
        parts: editedParts,
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
              expandingSlideIds={expandingSlideIds}
              failedPartMessages={failedPartMessages}
              failedSlideMessages={failedSlideMessages}
              onRetrySlide={handleRetrySlide}
            />
          ) : null}
        </div>
      </section>
    </main>
  );
}
