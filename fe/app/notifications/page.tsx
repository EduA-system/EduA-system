"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Bell,
  Check,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  CornerDownRight,
  Loader2,
  MailOpen,
  Megaphone,
  MessageCircle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import { RouteGuard } from "@/lib/auth/RouteGuard";
import { useAuth } from "@/lib/auth/AuthContext";
import { formatRelativeTime, subjectBadgeClasses, subjectLabel } from "@/lib/blog";
import {
  createNotification,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type NotificationSummary,
} from "@/lib/notifications";
import { connectNotificationsStream } from "@/lib/ws/notifications-client";

/** Icon + màu theo loại thông báo. targetType đã có với các luồng mới (comment blog); các luồng
 * cũ (giáo án chờ duyệt, bài viết bị gỡ, broadcast Moderator) chưa gắn targetType nên nhận diện qua tiêu đề. */
function visualFor(notification: NotificationSummary): { icon: LucideIcon; badgeClass: string } {
  if (notification.targetType === "BLOG_COMMENT") {
    return { icon: CornerDownRight, badgeClass: "bg-violet-50 text-violet-700" };
  }
  if (notification.targetType === "BLOG_POST") {
    return { icon: MessageCircle, badgeClass: "bg-sky-50 text-sky-700" };
  }
  if (notification.title.includes("chờ duyệt")) {
    return { icon: ClipboardCheck, badgeClass: "bg-amber-50 text-amber-700" };
  }
  if (notification.title.includes("bị gỡ")) {
    return { icon: AlertTriangle, badgeClass: "bg-rose-50 text-rose-700" };
  }
  return { icon: Megaphone, badgeClass: "bg-[#fff1ea] text-[#e8724a]" };
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
        <section className="min-w-0 flex-1 p-5 pt-16 sm:p-8 sm:pt-8">
          <header className="flex flex-wrap items-start justify-between gap-5">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#e8724a]">Community</p>
              <h1 className="mt-1 text-3xl font-bold tracking-[-0.04em] text-[#30343d]">Thông báo</h1>
              <p className="mt-2 text-sm text-stone-500">
                {unreadCount > 0 ? `Bạn có ${unreadCount} thông báo chưa đọc` : "Bạn đã đọc hết thông báo"}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {isModerator ? (
                <button
                  type="button"
                  onClick={() => setComposing((v) => !v)}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#e8724a] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#cf603d]"
                >
                  <Megaphone aria-hidden className="size-4" />
                  Soạn thông báo
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => void handleMarkAllRead()}
                disabled={unreadCount === 0}
                className="inline-flex items-center gap-2 rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-sm font-semibold text-[#30343d] transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <MailOpen aria-hidden className="size-4" />
                Đánh dấu tất cả đã đọc
              </button>
            </div>
          </header>

          {composing ? (
            <div className="mt-5 rounded-2xl border border-stone-200 bg-white p-5 shadow-[0_8px_24px_rgba(43,41,38,0.08)]">
              <h2 className="font-bold text-[#30343d]">Gửi thông báo tới giáo viên cùng môn</h2>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Tiêu đề"
                maxLength={200}
                className="mt-3 w-full rounded-xl border border-stone-300 px-3 py-2.5 text-sm outline-none transition placeholder:text-stone-400 focus:border-[#e8724a] focus:ring-2 focus:ring-[#fbe1d5]"
              />
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Nội dung"
                maxLength={2000}
                rows={4}
                className="mt-3 w-full rounded-xl border border-stone-300 px-3 py-2.5 text-sm outline-none transition placeholder:text-stone-400 focus:border-[#e8724a] focus:ring-2 focus:ring-[#fbe1d5]"
              />
              <div className="mt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setComposing(false)}
                  className="rounded-xl px-4 py-2 text-sm font-medium text-stone-600 hover:bg-stone-100"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={() => void handleSend()}
                  disabled={sending || !title.trim() || !content.trim()}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#e8724a] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#cf603d] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {sending ? <Loader2 aria-hidden className="size-4 animate-spin" /> : null}
                  {sending ? "Đang gửi..." : "Gửi"}
                </button>
              </div>
            </div>
          ) : null}

          {sendResult ? (
            <p className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-2.5 text-sm text-emerald-800">
              <CheckCircle2 aria-hidden className="size-4 shrink-0" />
              {sendResult}
            </p>
          ) : null}

          <div className="mt-8 flex gap-1 border-b border-stone-200" role="tablist" aria-label="Lọc thông báo">
            <button
              type="button"
              role="tab"
              aria-selected={!unreadOnly}
              onClick={() => setUnreadOnly(false)}
              className={`border-b-2 px-3 py-3 text-sm transition ${
                !unreadOnly ? "border-[#e8724a] font-bold text-[#30343d]" : "border-transparent text-stone-500 hover:text-stone-900"
              }`}
            >
              Tất cả
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={unreadOnly}
              onClick={() => setUnreadOnly(true)}
              className={`flex items-center gap-1.5 border-b-2 px-3 py-3 text-sm transition ${
                unreadOnly ? "border-[#e8724a] font-bold text-[#30343d]" : "border-transparent text-stone-500 hover:text-stone-900"
              }`}
            >
              Chưa đọc
              {unreadCount > 0 ? (
                <span className="rounded-full bg-[#fff1ea] px-1.5 py-0.5 text-[11px] font-bold text-[#e8724a]">{unreadCount}</span>
              ) : null}
            </button>
          </div>

          {error ? (
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
              <span>{error}</span>
              <button type="button" onClick={() => void load()} className="rounded-lg bg-white px-3 py-1.5 font-semibold shadow-sm hover:bg-rose-100">
                Thử lại
              </button>
            </div>
          ) : null}

          {loading ? (
            <div className="mt-6 space-y-3">
              {[1, 2, 3].map((x) => (
                <div key={x} className="h-24 animate-pulse rounded-2xl bg-stone-100" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="mt-8 rounded-[26px] border-2 border-dashed border-stone-200 bg-stone-50 p-12 text-center">
              <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-stone-200 text-stone-500">
                <Bell aria-hidden className="size-5" />
              </div>
              <h2 className="mt-4 font-bold text-[#30343d]">{unreadOnly ? "Không có thông báo chưa đọc" : "Chưa có thông báo nào"}</h2>
              <p className="mt-1 text-sm text-stone-500">
                {unreadOnly ? "Bạn đã xem hết thông báo hiện có." : "Thông báo mới sẽ xuất hiện tại đây."}
              </p>
            </div>
          ) : (
            <div className="mt-6 space-y-3">
              {items.map((n) => {
                const { icon: Icon, badgeClass } = visualFor(n);
                return (
                  <article
                    key={n.id}
                    onClick={() => void handleOpenNotification(n)}
                    className={`group flex items-start gap-4 rounded-2xl border p-4 transition sm:p-5 ${
                      n.targetUrl ? "cursor-pointer hover:-translate-y-0.5 hover:shadow-[0_10px_24px_rgba(43,41,38,0.10)]" : ""
                    } ${!n.read ? "border-[#f6cbb4] bg-[#fff8f5]" : "border-stone-200 bg-white"}`}
                  >
                    <div className={`flex size-10 shrink-0 items-center justify-center rounded-full ${badgeClass}`}>
                      <Icon aria-hidden className="size-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-bold text-[#30343d]">{n.title}</h3>
                        {!n.read ? <span aria-hidden className="size-2 shrink-0 rounded-full bg-[#e8724a]" /> : null}
                      </div>
                      <p className="mt-1 text-sm leading-6 text-stone-600">{n.content}</p>
                      <div className="mt-2.5 flex flex-wrap items-center gap-2 text-xs text-stone-500">
                        <span className="font-medium text-stone-700">{n.senderName ?? "Hệ thống"}</span>
                        <span aria-hidden>·</span>
                        <span className={`rounded-full px-2 py-0.5 font-semibold ${subjectBadgeClasses(n.subject)}`}>
                          {subjectLabel(n.subject)}
                        </span>
                        <span aria-hidden>·</span>
                        <span>{formatRelativeTime(n.createdAt)}</span>
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-2">
                      {!n.read ? (
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            void handleMarkRead(n.id);
                          }}
                          className="inline-flex items-center gap-1 rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-stone-600 transition hover:border-[#e8724a] hover:text-[#e8724a]"
                        >
                          <Check aria-hidden className="size-3.5" />
                          Đánh dấu đã đọc
                        </button>
                      ) : null}
                      {n.targetUrl ? (
                        <ChevronRight
                          aria-hidden
                          className="mt-1 size-4 text-stone-300 transition group-hover:translate-x-0.5 group-hover:text-[#e8724a]"
                        />
                      ) : null}
                    </div>
                  </article>
                );
              })}
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
