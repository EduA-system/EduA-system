"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { RouteGuard } from "@/lib/auth/RouteGuard";
import { useAuth } from "@/lib/auth/AuthContext";
import { subjectLabel } from "@/lib/blog";
import {
  createNotification,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type NotificationSummary,
} from "@/lib/notifications";
import { connectNotificationsStream } from "@/lib/ws/notifications-client";

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("vi");
}

function NotificationsScreen() {
  const { user, accessToken, authFetch } = useAuth();
  const router = useRouter();
  const isModerator = user?.role === "MODERATOR";

  const [items, setItems] = useState<NotificationSummary[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [composing, setComposing] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listNotifications(authFetch, { unread: unreadOnly, size: 50 });
      setItems(data.items);
      setUnreadCount(data.unreadCount);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không thể tải thông báo.");
    } finally {
      setLoading(false);
    }
  }, [authFetch, unreadOnly]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  useEffect(() => {
    if (!accessToken) return;
    const { disconnect } = connectNotificationsStream({
      accessToken,
      onEvent: () => void load(),
    });
    return () => disconnect();
  }, [accessToken, load]);

  const handleMarkRead = async (id: string) => {
    try {
      await markNotificationRead(authFetch, id);
      setItems((current) => current.map((n) => (n.id === id ? { ...n, read: true } : n)));
      setUnreadCount((count) => Math.max(0, count - 1));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không thể đánh dấu đã đọc.");
    }
  };

  const handleOpenNotification = async (notification: NotificationSummary) => {
    if (!notification.read) {
      await handleMarkRead(notification.id);
    }
    if (notification.targetUrl) {
      router.push(notification.targetUrl);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead(authFetch);
      setItems((current) => current.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không thể đánh dấu tất cả đã đọc.");
    }
  };

  const handleSend = async () => {
    if (!title.trim() || !content.trim()) return;
    setSending(true);
    setSendResult("");
    try {
      const result = await createNotification(authFetch, { title: title.trim(), content: content.trim() });
      setSendResult(`Đã gửi tới ${result.recipientCount} giáo viên môn ${subjectLabel(result.subject)}.`);
      setTitle("");
      setContent("");
      setComposing(false);
      void load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không thể gửi thông báo.");
    } finally {
      setSending(false);
    }
  };

  return (
    <main className="min-h-screen bg-white text-[#2b2926]">
      <div className="flex min-h-screen">
        <Sidebar activeHref="/notifications" />
        <section className="min-w-0 flex-1 p-5 sm:p-8">
          <header className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-[#e8724a]">Community</p>
              <h1 className="mt-1 text-3xl font-semibold">Thông báo</h1>
              <p className="mt-2 text-sm text-[#6b6b6b]">
                {unreadCount > 0 ? `${unreadCount} thông báo chưa đọc` : "Bạn đã đọc hết thông báo"}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {isModerator ? (
                <button
                  onClick={() => setComposing((v) => !v)}
                  className="rounded-xl bg-[#e8724a] px-4 py-2 text-sm text-white"
                >
                  Soạn thông báo
                </button>
              ) : null}
              <button
                onClick={() => void handleMarkAllRead()}
                disabled={unreadCount === 0}
                className="rounded-xl border bg-white px-4 py-2 text-sm disabled:opacity-50"
              >
                Đánh dấu tất cả đã đọc
              </button>
            </div>
          </header>

          {composing ? (
            <div className="mt-5 rounded-2xl border bg-white p-5">
              <h2 className="font-semibold">Gửi thông báo tới giáo viên cùng môn</h2>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Tiêu đề"
                maxLength={200}
                className="mt-3 w-full rounded-xl border p-2 text-sm"
              />
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Nội dung"
                maxLength={2000}
                rows={4}
                className="mt-3 w-full rounded-xl border p-2 text-sm"
              />
              <div className="mt-3 flex justify-end gap-2">
                <button onClick={() => setComposing(false)} className="rounded-xl px-4 py-2 text-sm">
                  Hủy
                </button>
                <button
                  onClick={() => void handleSend()}
                  disabled={sending || !title.trim() || !content.trim()}
                  className="rounded-xl bg-[#e8724a] px-4 py-2 text-sm text-white disabled:opacity-50"
                >
                  {sending ? "Đang gửi..." : "Gửi"}
                </button>
              </div>
            </div>
          ) : null}

          {sendResult ? <p className="mt-4 text-sm text-emerald-700">{sendResult}</p> : null}

          <div className="mt-6 flex gap-2 text-sm">
            <button
              onClick={() => setUnreadOnly(false)}
              className={`rounded-xl px-3 py-1.5 ${!unreadOnly ? "bg-[#1f1f1f] text-white" : "border bg-white"}`}
            >
              Tất cả
            </button>
            <button
              onClick={() => setUnreadOnly(true)}
              className={`rounded-xl px-3 py-1.5 ${unreadOnly ? "bg-[#1f1f1f] text-white" : "border bg-white"}`}
            >
              Chưa đọc
            </button>
          </div>

          {error ? <p className="mt-4 text-sm text-red-700">{error}</p> : null}

          {loading ? (
            <div className="mt-6 space-y-3">
              {[1, 2, 3].map((x) => (
                <div key={x} className="h-20 animate-pulse rounded-2xl bg-[#e8e2db]" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="mt-8 rounded-2xl border border-dashed bg-white p-12 text-center text-sm text-[#6b6b6b]">
              {unreadOnly ? "Không có thông báo chưa đọc." : "Chưa có thông báo nào."}
            </div>
          ) : (
            <div className="mt-6 space-y-3">
              {items.map((n) => (
                <article
                  key={n.id}
                  onClick={() => void handleOpenNotification(n)}
                  className={`rounded-2xl border bg-white p-4 ${
                    n.targetUrl ? "cursor-pointer transition hover:border-[#d97757] hover:bg-[#fffaf7]" : ""
                  } ${!n.read ? "border-[#e8724a]" : ""}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        {!n.read ? <span className="size-2 shrink-0 rounded-full bg-[#e8724a]" /> : null}
                        <h3 className="font-semibold">{n.title}</h3>
                      </div>
                      <p className="mt-1 text-sm text-[#4a4b5e]">{n.content}</p>
                      <p className="mt-2 text-xs text-[#6b6b6b]">
                        {n.senderName ?? "Moderator"} · {subjectLabel(n.subject)} · {formatDateTime(n.createdAt)}
                      </p>
                      {n.targetUrl ? <p className="mt-2 text-xs font-medium text-[#d97757]">Bấm để xem chi tiết</p> : null}
                    </div>
                    {!n.read ? (
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          void handleMarkRead(n.id);
                        }}
                        className="shrink-0 rounded-xl border bg-white px-3 py-1.5 text-xs"
                      >
                        Đánh dấu đã đọc
                      </button>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

export default function Page() {
  return (
    <RouteGuard pathname="/notifications">
      <NotificationsScreen />
    </RouteGuard>
  );
}
