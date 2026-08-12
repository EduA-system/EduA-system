"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { OutlineEditor } from "@/components/outline-editor/OutlineEditor";
import { generateOutline, retryOutlineSessionSlide, startOutlineSession, type OutlinePart } from "@/lib/api/slides";
import { useAuth } from "@/lib/auth/AuthContext";
import { RouteGuard } from "@/lib/auth/RouteGuard";
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

/** Fake but reassuring progress: eases toward `target` and never quite reaches it, since we don't know real completion time. */
function useFakeProgress(target = 92, intervalMs = 220) {
  const [progress, setProgress] = useState(6);
  useEffect(() => {
    const id = setInterval(() => {
      setProgress((prev) => (prev >= target ? prev : Math.min(target, prev + Math.max(0.4, (target - prev) * 0.06))));
    }, intervalMs);
    return () => clearInterval(id);
  }, [target, intervalMs]);
  return progress;
}

/** Mirrors OutlineEditor's card shape so the layout doesn't jump once real parts/slides stream in. */
function OutlineSkeleton() {
  const progress = useFakeProgress();
  const parts = [
    { slides: 3 },
    { slides: 2 },
    { slides: 4 },
  ];
  return (
    <div className="mx-auto max-w-4xl px-4 py-6" aria-busy="true" aria-label="Đang tạo outline cho slide">
      <div className="mb-4 h-1.5 w-full overflow-hidden rounded-full bg-[#efeef7]">
        <div
          className="h-full rounded-full bg-[#8200db] transition-[width] duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="overflow-hidden rounded-2xl border border-[rgba(26,26,46,0.09)] bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-[rgba(26,26,46,0.07)] px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 animate-pulse rounded-lg bg-[#f9f8f3]" />
            <div className="h-3.5 w-36 animate-pulse rounded bg-[#f9f8f3]" />
          </div>
          <div className="h-6 w-20 animate-pulse rounded-lg bg-[#f9f8f3]" />
        </div>

        <div className="space-y-4 px-4 py-4">
          {parts.map((part, partIndex) => (
            <div
              key={partIndex}
              className="rounded-xl border border-[rgba(26,26,46,0.08)] bg-[#fdfdfb]"
            >
              <div className="flex items-center gap-2 border-b border-[rgba(26,26,46,0.06)] px-3 py-2.5">
                <span className="text-[#e4e1ee]">⠿</span>
                <div className="h-5 w-16 shrink-0 animate-pulse rounded-md bg-[#f9f8f3]" />
                <div
                  className="h-3.5 animate-pulse rounded bg-[#f9f8f3]"
                  style={{ width: `${40 - partIndex * 6}%`, animationDelay: `${partIndex * 100}ms` }}
                />
              </div>
              <div className="space-y-2 px-3 py-3">
                {Array.from({ length: part.slides }).map((_, slideIndex) => (
                  <div
                    key={slideIndex}
                    className="rounded-lg border border-[rgba(26,26,46,0.09)] bg-white px-3 py-2.5"
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="h-4 w-14 shrink-0 animate-pulse rounded bg-[#f9f8f3]"
                        style={{ animationDelay: `${(partIndex * 4 + slideIndex) * 80}ms` }}
                      />
                      <div
                        className="h-3.5 flex-1 animate-pulse rounded bg-[#f9f8f3]"
                        style={{ width: `${70 - (slideIndex % 3) * 12}%`, animationDelay: `${(partIndex * 4 + slideIndex) * 80 + 40}ms` }}
                      />
                    </div>
                    <div
                      className="mt-2 h-2.5 animate-pulse rounded bg-[#f9f8f3]/70"
                      style={{ width: `${50 - (slideIndex % 2) * 10}%`, animationDelay: `${(partIndex * 4 + slideIndex) * 80 + 80}ms` }}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-xs text-[#9998be]">
        <span className="size-2.5 animate-spin rounded-full border-2 border-[#8200db] border-t-transparent" />
        AI đang tạo outline cho slide… {Math.round(progress)}%
      </p>
    </div>
  );
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
  return (
    <RouteGuard pathname="/slide-create/outline" denyHref="/slide-create" denyLabel="Về trang tạo slide">
      <SlideOutlineScreen />
    </RouteGuard>
  );
}

function SlideOutlineScreen() {
  const router = useRouter();
  const { accessToken, authFetch, getValidAccessToken, status: authStatus } = useAuth();
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
  const totalSlides = parts.reduce((sum, part) => sum + (part.slides?.length ?? 0), 0);
  const headerStatus =
    status === "outlining"
      ? "AI đang dựng outline"
      : status === "ready"
        ? "Sẵn sàng chỉnh sửa"
        : status === "error"
          ? "Cần quay lại"
          : "Đang tải";

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
          getAccessToken: getValidAccessToken,
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
  }, [accessToken, authFetch, authStatus, getValidAccessToken, status, session, handleOutlineEvent]);

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
        <header className="border-b border-[rgba(26,26,46,0.07)] bg-white/45 px-5 py-4 sm:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <nav className="flex items-center gap-2 text-[12px] text-[#9998be]">
                <Link href="/slide-create" className="hover:text-[#1a1a2e]">
                  Tạo Slide
                </Link>
                <span>/</span>
                <span className="font-medium text-[#1a1a2e]">Outline slide</span>
              </nav>
              <h1 className="mt-2 text-2xl font-semibold text-[#1a1a2e]">Outline slide</h1>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-[#5c5b6e]">
                Kiểm tra cấu trúc bài giảng trước khi sinh slide hoàn chỉnh. Sửa tên phần hoặc slide trực tiếp, kéo thả phần để đổi thứ tự, mở Chi tiết để chỉnh nội dung từng slide, rồi bấm Tạo slides khi outline đã đúng.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs sm:flex sm:items-center">
              <span className="rounded-lg bg-white px-3 py-2 font-medium text-[#5c5b6e] shadow-sm">
                {headerStatus}
              </span>
              <span className="rounded-lg bg-[#faf5ff] px-3 py-2 font-medium text-[#8200db] shadow-sm">
                {parts.length} phần · {totalSlides} slides
              </span>
            </div>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {status === "outlining" ? <OutlineSkeleton /> : null}

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
