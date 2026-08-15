"use client";

import Link from "next/link";
import { Atom, BookOpen, FileText, LoaderCircle, MessageCircle, Presentation, Search, Users } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { useAuth } from "@/lib/auth/AuthContext";
import { subjectBadgeClasses, subjectLabel } from "@/lib/blog";
import { HUB_CONTENT_COMMENTS_CHANGED_EVENT, listHubContents, type HubContentSummary } from "@/lib/hub";
import type { LibraryType } from "@/lib/library";

const tabs: [string, LibraryType | ""][] = [
  ["Tất cả", ""],
  ["Bài giảng", "LESSON_PLAN"],
  ["Slide", "SLIDE_DECK"],
  ["Bài kiểm tra", "TEST"],
  ["Mô phỏng", "SIMULATION"],
];

const PAGE_SIZE = 30;

const contentMeta: Record<LibraryType, { label: string; icon: typeof BookOpen; color: string; iconColor: string }> = {
  LESSON_PLAN: { label: "Bài giảng", icon: BookOpen, color: "from-amber-100 via-orange-50 to-stone-100", iconColor: "text-amber-800" },
  SLIDE_DECK: { label: "Slide", icon: Presentation, color: "from-rose-100 via-orange-50 to-amber-50", iconColor: "text-rose-800" },
  TEST: { label: "Bài kiểm tra", icon: FileText, color: "from-sky-100 via-cyan-50 to-stone-100", iconColor: "text-sky-800" },
  SIMULATION: { label: "Mô phỏng", icon: Atom, color: "from-violet-100 via-fuchsia-50 to-stone-100", iconColor: "text-violet-800" },
};

function CommunityHubScreen() {
  const { user, authFetch } = useAuth();
  const [type, setType] = useState<LibraryType | "">("");
  const [q, setQ] = useState("");
  const [items, setItems] = useState<HubContentSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const requestVersion = useRef(0);

  const load = useCallback(async (nextPage = 0, append = false) => {
    const version = ++requestVersion.current;
    if (append) setLoadingMore(true);
    else setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(nextPage), size: String(PAGE_SIZE) });
      if (type) params.set("type", type);
      if (q) params.set("q", q);
      const data = await listHubContents(authFetch, params);
      if (version !== requestVersion.current) return;
      setItems((current) => append ? [...current, ...data.items] : data.items);
      setTotal(data.total);
      setPage(data.page);
      setError("");
    } catch (cause) {
      if (version !== requestVersion.current) return;
      setError(cause instanceof Error ? cause.message : "Không thể tải nội dung cộng đồng.");
    } finally {
      if (version === requestVersion.current) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
  }, [authFetch, q, type]);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 200);
    return () => clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    const refreshCommentCounts = () => void load();
    window.addEventListener(HUB_CONTENT_COMMENTS_CHANGED_EVENT, refreshCommentCounts);
    return () => window.removeEventListener(HUB_CONTENT_COMMENTS_CHANGED_EVENT, refreshCommentCounts);
  }, [load]);

  const hasMore = items.length < total;
  const visibleTabs = user?.subject === "MATH"
    ? tabs.filter(([, value]) => value !== "SIMULATION")
    : tabs;

  return (
    <main className="min-h-screen bg-white text-[#171717]">
      <div className="flex min-h-screen">
        <Sidebar activeHref="/community-hub" />
        <section className="min-w-0 flex-1 bg-white px-5 py-8 pt-16 sm:px-8 sm:pt-8 lg:px-10 lg:py-12">
          <header className="flex flex-wrap items-start justify-between gap-5">
            <div>
              <p className="inline-flex h-[26px] items-center gap-1.5 rounded-full border border-[#eadfd7] bg-[#fff7f1] px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#d97757]"><Users aria-hidden className="size-3.5" /> Cộng đồng giáo viên</p>
              <h1 className="mt-3 font-libertine text-[42px] font-normal leading-[1.08] text-[#1f1f1f] sm:text-[48px]">Cộng đồng</h1>
              <p className="mt-3 text-[13px] leading-[23px] text-[#6b6b6b]">{total} nội dung đã được duyệt · chia sẻ bởi cộng đồng giáo viên</p>
            </div>
            {!user && <Link className="inline-flex items-center rounded-xl bg-[#e8724a] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#d96a42]" href="/login">Đăng nhập để tương tác</Link>}
          </header>

          <div className="mt-9 flex gap-1 overflow-x-auto border-b border-[#d8d1c9]" role="tablist" aria-label="Loại nội dung">
            {visibleTabs.map(([label, value]) => (
              <button key={value || "all"} type="button" role="tab" aria-selected={type === value} onClick={() => setType(value)} className={`shrink-0 border-b-2 px-3 py-3 text-sm transition ${type === value ? "border-[#e8724a] font-bold text-[#30343d]" : "border-transparent text-stone-500 hover:text-stone-900"}`}>
                {label}
              </button>
            ))}
          </div>

          <div className="mt-5">
            <label className="relative min-w-0 flex-1">
              <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-stone-400" />
              <span className="sr-only">Tìm theo tiêu đề</span>
              <input value={q} onChange={(event) => setQ(event.target.value)} placeholder="Tìm theo tiêu đề..." className="w-full rounded-xl border border-[#d8d1c9] bg-[#faf9f7] py-2.5 pl-9 pr-3 text-sm outline-none transition placeholder:text-stone-400 focus:border-[#e8724a] focus:ring-2 focus:ring-[#fbe1d5]" />
            </label>
          </div>

          {error && (
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
              <span>{error}</span>
              <button type="button" onClick={() => void load()} className="rounded-lg bg-white px-3 py-1.5 font-semibold shadow-sm hover:bg-rose-100">Thử lại</button>
            </div>
          )}

          {loading ? (
            <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {[1, 2, 3].map((item) => <div key={item} className="h-80 animate-pulse rounded-[14px] bg-[#f0ece7]" />)}
            </div>
          ) : items.length === 0 ? (
            <div className="mt-8 rounded-[14px] border border-dashed border-[#d8d1c9] bg-[#faf9f7] p-12 text-center">
              <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-stone-200 text-stone-500"><Search aria-hidden className="size-5" /></div>
              <h2 className="mt-4 font-bold text-[#30343d]">{q || type ? "Không tìm thấy nội dung phù hợp" : "Chưa có nội dung nào trong cộng đồng"}</h2>
              <p className="mt-1 text-sm text-stone-500">{q || type ? "Hãy thử thay đổi từ khóa hoặc bộ lọc." : "Nội dung được duyệt từ cộng đồng sẽ xuất hiện tại đây."}</p>
            </div>
          ) : (
            <>
              <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {items.map((item) => {
                const meta = contentMeta[item.type];
                const Icon = meta.icon;
                const href = `/community-hub/${item.id}`;
                return (
                  <article key={item.id} className="group min-w-0 rounded-[14px] border border-[#d8d1c9] bg-white transition duration-200 hover:-translate-y-0.5 hover:border-[#c9bdb3] hover:shadow-[0_10px_24px_rgba(43,41,38,0.08)]">
                    <div className="flex h-full flex-col rounded-[14px] bg-white p-3">
                      <div className="flex items-center gap-2 px-1 pb-3">
                        <div className={`flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#faf9f7] ${meta.iconColor}`}><Icon aria-hidden className="size-5" /></div>
                        <p className="min-w-0 flex-1 truncate text-sm font-bold text-[#363a43]">{meta.label}</p>
                        <div className="flex items-center gap-1 text-xs text-stone-500"><MessageCircle aria-hidden className="size-3.5" />{item.commentCount}</div>
                      </div>
                      <Link href={href} aria-label={`Mở ${item.title}`} className={`relative block aspect-[16/10] overflow-hidden rounded-[10px] bg-gradient-to-br ${meta.color} text-left`}>
                        {item.thumbnailUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element -- hub thumbnails may originate from user-configured object storage
                          <img src={item.thumbnailUrl} alt="" className="size-full object-cover transition duration-300 group-hover:scale-[1.04]" />
                        ) : (
                          <div className={`flex size-full flex-col items-center justify-center gap-3 ${meta.iconColor}`}><span className="flex size-16 items-center justify-center rounded-[22px] bg-white/65 shadow-sm"><Icon aria-hidden className="size-8" /></span><span className="text-[11px] font-bold uppercase tracking-[0.18em]">{meta.label}</span></div>
                        )}
                        {item.subject && <span className={`absolute left-3 top-3 rounded-full px-2.5 py-1 text-[11px] font-semibold shadow-sm ${subjectBadgeClasses(item.subject)}`}>{subjectLabel(item.subject)}</span>}
                      </Link>
                      <div className="px-2 pb-3 pt-3"><Link href={href} className="line-clamp-2 text-left text-base font-semibold leading-5 text-[#1f1f1f] transition hover:text-[#c65838]">{item.title}</Link></div>
                      <div className="mt-auto flex items-center gap-2 border-t border-[#eee7df] p-2 pt-3">
                        <div className="min-w-0 flex-1 px-2"><p className="text-[10px] font-semibold uppercase tracking-wide text-stone-400">Chia sẻ bởi</p><p className="truncate text-xs font-medium text-stone-600">{item.ownerName ?? "Ẩn danh"}</p></div>
                        <Link href={href} className="inline-flex items-center gap-1 rounded-xl bg-[#e8724a] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#d96a42]">Xem <span aria-hidden>→</span></Link>
                      </div>
                    </div>
                  </article>
                );
              })}
              </div>
              {hasMore && (
                <div className="mt-8 flex justify-center">
                  <button
                    type="button"
                    onClick={() => void load(page + 1, true)}
                    disabled={loadingMore}
                    className="inline-flex min-w-36 items-center justify-center gap-2 rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-sm font-bold text-[#30343d] shadow-sm transition hover:border-[#e8724a] hover:text-[#b95133] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {loadingMore ? <LoaderCircle aria-hidden className="size-4 animate-spin" /> : null}
                    {loadingMore ? "Đang tải..." : `Tải thêm (${items.length}/${total})`}
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </main>
  );
}

export default function CommunityHubPage() {
  return <CommunityHubScreen />;
}
