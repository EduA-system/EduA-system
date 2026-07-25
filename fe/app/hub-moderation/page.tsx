"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/AuthContext";
import { RouteGuard } from "@/lib/auth/RouteGuard";
import { hasAnyRole } from "@/lib/auth/permissions";
import { approveContent, listModerationQueue, rejectContent } from "@/lib/hub";
import type { LibraryContent, LibraryType } from "@/lib/library";

const typeLabels: Record<LibraryType, string> = { LESSON_PLAN: "Bài giảng", SLIDE_DECK: "Slide", TEST: "Bài kiểm tra", SIMULATION: "Mô phỏng" };

export default function HubModerationPage() {
  const { user, status, authFetch } = useAuth();
  const [items, setItems] = useState<LibraryContent[]>([]);
  const [msg, setMsg] = useState("");
  const isModerator = hasAnyRole(user, ["MODERATOR"]);

  const load = useCallback(async () => {
    if (status !== "authenticated" || !user || !isModerator) return;
    try {
      const data = await listModerationQueue(authFetch, new URLSearchParams({ size: "50" }));
      setItems(data.items);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    }
  }, [authFetch, status, user, isModerator]);

  useEffect(() => {
    if (status !== "authenticated" || !user || !isModerator) return;
    let cancelled = false;
    listModerationQueue(authFetch, new URLSearchParams({ size: "50" }))
      .then((data) => {
        if (!cancelled) setItems(data.items);
      })
      .catch((e) => {
        if (!cancelled) setMsg(e instanceof Error ? e.message : String(e));
      });
    return () => {
      cancelled = true;
    };
  }, [authFetch, status, user, isModerator]);

  async function handleApprove(id: string) {
    if (!confirm("Duyệt nội dung này lên Community Hub?")) return;
    try {
      await approveContent(authFetch, id);
      setMsg("Đã duyệt.");
      await load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    }
  }

  async function handleReject(id: string) {
    const reason = window.prompt("Lý do từ chối:");
    if (!reason?.trim()) return;
    try {
      await rejectContent(authFetch, id, reason.trim());
      setMsg("Đã từ chối.");
      await load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <RouteGuard pathname="/hub-moderation" denyHref="/community-hub" denyLabel="Về Community Hub">
      {user && (
        <div className="mx-auto max-w-3xl p-6">
          <header className="mb-6">
            <h1 className="text-xl font-semibold">Kiểm duyệt Community Hub · môn {user.subject}</h1>
          </header>

          {msg && <p className="mb-4 rounded bg-gray-100 px-3 py-2 text-sm">{msg}</p>}

          <section>
            <h2 className="mb-3 font-medium">Chờ duyệt ({items.length})</h2>
            <ul className="space-y-2">
              {items.map((i) => (
                <li key={i.id} className="rounded border p-3">
                  <div className="font-medium">{i.title}</div>
                  <div className="text-xs text-gray-500">
                    {typeLabels[i.type]} · {i.subject} · gửi lúc {i.submittedAt ? new Date(i.submittedAt).toLocaleString("vi") : "-"}
                  </div>
                  <div className="mt-2 flex gap-3 text-sm">
                    <button onClick={() => void handleApprove(i.id)} className="text-green-700 underline">Duyệt</button>
                    <button onClick={() => void handleReject(i.id)} className="text-red-600 underline">Từ chối</button>
                  </div>
                </li>
              ))}
              {items.length === 0 && <li className="text-sm text-gray-500">Không có nội dung chờ duyệt.</li>}
            </ul>
          </section>
        </div>
      )}
    </RouteGuard>
  );
}
