"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { Slide } from "@/components/slide-editor/types";
import { loadSlides } from "@/components/slide-editor/lib/storage";
import { SlidePresentationOverlay } from "@/components/slide-presentation/SlidePresentationOverlay";
import { useAuth } from "@/lib/auth/AuthContext";
import { getLibraryContent } from "@/lib/library";
import { getClassResourceLibraryContent } from "@/lib/classroom";
import { parseSlideDeck } from "@/lib/slide-deck-library";

export function SlidePresentationClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { authFetch } = useAuth();
  const libraryId = searchParams.get("libraryId");
  const classId = searchParams.get("classId");
  const resourceId = searchParams.get("resourceId");
  const [slides, setSlides] = useState<Slide[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const loadDeck = async () => {
      await Promise.resolve();
      if (cancelled) return;
      setError(null);

      if (!libraryId && (!classId || !resourceId)) {
        const localSlides = loadSlides();
        if (!localSlides) setError("Không tìm thấy bộ slide để trình chiếu. Hãy mở bộ slide từ thư viện hoặc trình soạn thảo.");
        else setSlides(localSlides);
        return;
      }

      try {
        const content = classId && resourceId
          ? await getClassResourceLibraryContent(authFetch, classId, resourceId)
          : await getLibraryContent(authFetch, libraryId!);
        if (cancelled) return;
        if (content.type !== "SLIDE_DECK") throw new Error("Nội dung này không phải là bộ slide.");
        const deck = parseSlideDeck(content.payload);
        if (!deck) throw new Error("Bộ slide đã lưu có định dạng không hợp lệ.");
        setSlides(deck);
      } catch (reason: unknown) {
        if (!cancelled) setError(reason instanceof Error ? reason.message : "Không thể mở bộ slide.");
      }
    };

    void loadDeck();

    return () => { cancelled = true; };
  }, [authFetch, classId, libraryId, resourceId]);

  const exit = useCallback(() => router.back(), [router]);

  if (error) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#171513] p-6 text-center text-white">
        <div>
          <p className="text-lg font-semibold">Không thể trình chiếu</p>
          <p className="mt-2 text-sm text-white/65">{error}</p>
          <button onClick={exit} className="mt-6 rounded-lg bg-white px-4 py-2 text-sm font-medium text-[#2b2926]">Quay lại</button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#171513] text-white">
      <SlidePresentationOverlay slides={slides} onExit={exit} />
    </main>
  );
}
