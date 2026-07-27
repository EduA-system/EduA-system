"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Menu, RefreshCw, X } from "lucide-react";
import { DashboardIcon } from "@/components/ui/DashboardIcon";
import { Sidebar } from "@/components/layout/Sidebar";
import { useAuth } from "@/lib/auth/AuthContext";
import { RouteGuard } from "@/lib/auth/RouteGuard";
import {
  listActivityLogs,
  type ActivityLogAction,
  type ActivityLogCategory,
  type ActivityLogSummary,
} from "@/lib/activity-log";

const CATEGORY_LABELS: Record<ActivityLogCategory, string> = {
  AUTH: "Đăng nhập",
  ACCOUNT: "Tài khoản",
  MODERATION: "Kiểm duyệt",
  CONFIG: "Cấu hình",
};

const ACTION_LABELS: Record<ActivityLogAction, string> = {
  LOGIN: "Đăng nhập",
  LOGOUT: "Đăng xuất",
  GRANT_MODERATOR: "Cấp quyền Moderator",
  REPLACE_MODERATOR: "Thay thế Moderator",
  REACTIVATE_MODERATOR: "Kích hoạt lại Moderator",
  GRANT_IT_STAFF: "Cấp quyền IT Staff",
  REVOKE_IT_STAFF: "Thu hồi IT Staff",
  REACTIVATE_IT_STAFF: "Kích hoạt lại IT Staff",
  GRANT_TEACHER: "Cấp quyền Teacher",
  REVOKE_TEACHER: "Thu hồi Teacher",
  REACTIVATE_TEACHER: "Kích hoạt lại Teacher",
  APPROVE_LIBRARY_CONTENT: "Duyệt nội dung thư viện",
  REJECT_LIBRARY_CONTENT: "Từ chối nội dung thư viện",
  REMOVE_BLOG_POST: "Gỡ bài blog",
  APPROVE_WEEKLY_TASK: "Duyệt giáo án tuần",
  REJECT_WEEKLY_TASK: "Từ chối giáo án tuần",
  UPDATE_SYSTEM_PROMPT: "Cập nhật prompt AI",
};

const PAGE_SIZE = 20;

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function ActivityLogContent() {
  const { authFetch } = useAuth();
  const [items, setItems] = useState<ActivityLogSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [category, setCategory] = useState<ActivityLogCategory | null>(null);
  const [actorId, setActorId] = useState<string | null>(null);
  const [actorName, setActorName] = useState<string | null>(null);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await listActivityLogs(authFetch, {
        actorId: actorId ?? undefined,
        category: category ?? undefined,
        from: from ? new Date(from).toISOString() : undefined,
        to: to ? new Date(to).toISOString() : undefined,
        page,
        size: PAGE_SIZE,
      });
      setItems(result.items);
      setTotal(result.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [authFetch, actorId, category, from, to, page]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  function selectCategory(next: ActivityLogCategory | null) {
    setCategory(next);
    setPage(0);
  }

  function filterByActor(entry: ActivityLogSummary) {
    setActorId(entry.actorId);
    setActorName(entry.actorName ?? entry.actorId);
    setPage(0);
  }

  function clearActorFilter() {
    setActorId(null);
    setActorName(null);
    setPage(0);
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <main className="min-h-screen bg-[#f5f1ec] text-[#1f1f1f]">
      <header className="sticky top-0 z-30 flex h-14 items-center border-b border-[#d8d1c9] bg-[#f7f5f2] px-4 md:hidden">
        <button
          type="button"
          onClick={() => setMobileMenuOpen(true)}
          className="inline-flex size-9 items-center justify-center rounded-lg text-[#1f1f1f] transition hover:bg-[#edeae5]"
          aria-label="Mở menu chức năng"
        >
          <Menu className="size-4" aria-hidden />
        </button>
        <div className="ml-3 flex items-center gap-2 text-sm font-semibold">
          <span className="flex size-7 items-center justify-center rounded-lg bg-[#1f1f1f] text-white">
            <DashboardIcon name="spark" className="size-3.5" />
          </span>
          EDUA
        </div>
      </header>

      {mobileMenuOpen && (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-black/25 md:hidden"
          aria-label="Đóng menu chức năng"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <div className="flex min-h-[calc(100vh-3.5rem)] md:min-h-screen">
        <Sidebar responsive mobileOpen={mobileMenuOpen} activeHref="/it-staff/activity-log" />
        <section className="min-w-0 flex-1 px-5 py-8 sm:px-8 lg:px-12 lg:py-10">
          <div className="mx-auto max-w-6xl">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#d97757]">IT Staff</p>
              <h1 className="font-libertine mt-3 text-4xl leading-none sm:text-5xl">Nhật ký hoạt động</h1>
              <p className="mt-4 text-sm leading-6 text-[#6b6b6b]">
                Đăng nhập, thay đổi tài khoản, quyết định kiểm duyệt và cấu hình AI trên toàn hệ thống.
              </p>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3 rounded-lg border border-[#d8d1c9] bg-[#fbfaf8] p-3 shadow-[0_2px_8px_rgba(43,41,38,0.04)]">
              <div className="flex flex-wrap gap-1.5">
                {(["Tất cả", ...Object.keys(CATEGORY_LABELS)] as const).map((key) => {
                  const value = key === "Tất cả" ? null : (key as ActivityLogCategory);
                  const active = category === value;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => selectCategory(value)}
                      className={`flex h-9 items-center rounded-lg px-3 text-sm font-medium transition ${
                        active ? "bg-[#1f1f1f] text-white" : "text-[#5f5a54] hover:bg-[#edeae5] hover:text-[#1f1f1f]"
                      }`}
                    >
                      {key === "Tất cả" ? key : CATEGORY_LABELS[value as ActivityLogCategory]}
                    </button>
                  );
                })}
              </div>

              <div className="ml-auto flex flex-wrap items-center gap-2">
                <input
                  type="date"
                  value={from}
                  onChange={(event) => {
                    setFrom(event.target.value);
                    setPage(0);
                  }}
                  className="h-9 rounded-lg border border-[#d8d1c9] bg-white px-2.5 text-sm text-[#1f1f1f] outline-none focus:border-[#d97757]"
                  aria-label="Từ ngày"
                />
                <span className="text-sm text-[#8a8178]">đến</span>
                <input
                  type="date"
                  value={to}
                  onChange={(event) => {
                    setTo(event.target.value);
                    setPage(0);
                  }}
                  className="h-9 rounded-lg border border-[#d8d1c9] bg-white px-2.5 text-sm text-[#1f1f1f] outline-none focus:border-[#d97757]"
                  aria-label="Đến ngày"
                />
                <button
                  type="button"
                  onClick={() => void load()}
                  disabled={loading}
                  className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-[#d8d1c9] bg-white px-3 text-sm font-medium text-[#1f1f1f] transition hover:bg-[#f5f1ec] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} aria-hidden />
                  Tải lại
                </button>
              </div>
            </div>

            {actorId && (
              <div className="mt-3 flex items-center gap-2 text-sm text-[#5f5a54]">
                Đang lọc theo người dùng: <span className="font-medium text-[#1f1f1f]">{actorName}</span>
                <button
                  type="button"
                  onClick={clearActorFilter}
                  className="inline-flex size-6 items-center justify-center rounded-full text-[#8a8178] transition hover:bg-[#edeae5] hover:text-[#1f1f1f]"
                  aria-label="Bỏ lọc theo người dùng"
                >
                  <X className="size-3.5" aria-hidden />
                </button>
              </div>
            )}

            <div className="mt-6">
              {error && (
                <div className="mb-4 rounded-lg border border-[#d8d1c9] bg-white px-4 py-3 text-sm text-[#c96545] shadow-[0_2px_8px_rgba(43,41,38,0.04)]">
                  {error}
                </div>
              )}

              {loading ? (
                <div className="rounded-lg border border-[#d8d1c9] bg-white p-8 text-sm text-[#6b6b6b] shadow-[0_2px_8px_rgba(43,41,38,0.04)]">
                  Đang tải nhật ký hoạt động...
                </div>
              ) : items.length === 0 ? (
                <div className="rounded-lg border border-[#d8d1c9] bg-white p-8 text-sm text-[#6b6b6b] shadow-[0_2px_8px_rgba(43,41,38,0.04)]">
                  Không có hoạt động phù hợp.
                </div>
              ) : (
                <div className="overflow-hidden rounded-lg border border-[#d8d1c9] bg-white shadow-[0_2px_8px_rgba(43,41,38,0.04)]">
                  <div className="divide-y divide-[#eee9e2]">
                    {items.map((entry) => (
                      <div key={entry.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2 text-sm">
                            <span className="rounded-lg bg-[#f5f1ec] px-2 py-0.5 text-xs font-medium text-[#8a8178]">
                              {CATEGORY_LABELS[entry.category]}
                            </span>
                            <span className="font-medium text-[#1f1f1f]">
                              {ACTION_LABELS[entry.action] ?? entry.action}
                            </span>
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-[#8a8178]">
                            <button
                              type="button"
                              onClick={() => filterByActor(entry)}
                              className="font-medium text-[#5f5a54] underline decoration-dotted underline-offset-2 hover:text-[#1f1f1f]"
                            >
                              {entry.actorName ?? entry.actorId}
                            </button>
                            {entry.actorRole && <span>· {entry.actorRole}</span>}
                            {entry.targetType && (
                              <span>
                                · {entry.targetType}
                                {entry.targetId ? ` #${entry.targetId.slice(0, 8)}` : ""}
                              </span>
                            )}
                            {entry.metadata && <span className="truncate">· {entry.metadata}</span>}
                          </div>
                        </div>
                        <div className="shrink-0 text-xs text-[#8a8178]">{formatDateTime(entry.createdAt)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!loading && items.length > 0 && (
                <div className="mt-4 flex items-center justify-between text-sm text-[#6b6b6b]">
                  <span>
                    Trang {page + 1} / {totalPages} · {total} hoạt động
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setPage((p) => Math.max(0, p - 1))}
                      disabled={page === 0}
                      className="inline-flex size-9 items-center justify-center rounded-lg border border-[#d8d1c9] bg-white text-[#1f1f1f] transition hover:bg-[#f5f1ec] disabled:cursor-not-allowed disabled:opacity-40"
                      aria-label="Trang trước"
                    >
                      <ChevronLeft className="size-4" aria-hidden />
                    </button>
                    <button
                      type="button"
                      onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                      disabled={page >= totalPages - 1}
                      className="inline-flex size-9 items-center justify-center rounded-lg border border-[#d8d1c9] bg-white text-[#1f1f1f] transition hover:bg-[#f5f1ec] disabled:cursor-not-allowed disabled:opacity-40"
                      aria-label="Trang sau"
                    >
                      <ChevronRight className="size-4" aria-hidden />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

export default function ActivityLogPage() {
  return (
    <RouteGuard pathname="/it-staff/activity-log">
      <ActivityLogContent />
    </RouteGuard>
  );
}
