"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthContext";
import { RouteGuard } from "@/lib/auth/RouteGuard";
import { hasAnyRole } from "@/lib/auth/permissions";
import { Sidebar } from "@/components/layout/Sidebar";
import { Avatar } from "@/components/blog/Avatar";
import { RichView } from "@/components/blog/RichView";
import { SubjectBadge } from "@/components/blog/SubjectBadge";
import { api, formatRelativeTime, type Detail, type Summary } from "@/lib/blog";

function RemovePostDialog({ reason, onReasonChange, onCancel, onConfirm }: { reason: string; onReasonChange: (value: string) => void; onCancel: () => void; onConfirm: () => void }) {
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#3f2634]/25 px-4" role="dialog" aria-modal="true">
    <div className="w-full max-w-[600px] overflow-hidden rounded-[34px] bg-white shadow-[0_28px_50px_rgba(64,43,54,0.28)]">
      <div className="relative flex h-40 items-center justify-center overflow-hidden bg-[#f38eb5]"><span className="absolute size-28 rounded-[38px] bg-[#ef3d7c]" /><span className="relative flex size-[92px] items-center justify-center rounded-full border-[5px] border-[#19201f] bg-white text-4xl font-bold text-[#ef4d8b]">!</span><button type="button" onClick={onCancel} className="absolute right-7 top-7 flex size-12 items-center justify-center rounded-full bg-white text-[38px] font-light leading-none text-[#ef4d8b]">×</button></div>
      <div className="px-8 pb-9 pt-7 text-center sm:px-16"><h2 className="text-[30px] font-bold tracking-[-0.03em] text-[#35353b] sm:text-[36px]">Gỡ bài viết này?</h2><p className="mx-auto mt-3 max-w-[450px] text-[15px] leading-6 text-[#7d7c81]">Bài viết sẽ bị gỡ khỏi Blog công khai. Hãy ghi rõ lý do để lưu vào lịch sử kiểm duyệt.</p><textarea value={reason} onChange={(event) => onReasonChange(event.target.value)} placeholder="Nhập lý do gỡ bài..." className="mt-5 min-h-24 w-full resize-y rounded-xl border border-[#e5dfdf] bg-[#fffafa] p-3 text-sm text-[#4a4b5e] outline-none focus:border-[#ef80aa]" /><div className="mt-5 grid grid-cols-2 gap-4"><button type="button" disabled={!reason.trim()} onClick={onConfirm} className="h-14 rounded-xl bg-[#f04484] text-[15px] font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">Gỡ bài viết</button><button type="button" onClick={onCancel} className="h-14 rounded-xl bg-[#fff0f5] text-[15px] font-semibold text-[#e14f85]">Để tôi suy nghĩ lại</button></div></div>
    </div>
  </div>;
}

function ModerationNoticeToast({ onClose }: { onClose: () => void }) {
  return <div className="fixed right-5 top-5 z-[70] flex max-w-sm items-center gap-3 rounded-2xl border border-[#c9defd] bg-white px-4 py-3 text-sm font-semibold text-[#285888] shadow-[0_14px_34px_rgba(33,83,129,0.18)]" role="status"><span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[#4d8fd6] text-sm text-white">i</span><span className="flex-1">Bài viết đã bị Giáo viên xóa và không còn hiển thị trong Blog.</span><button type="button" onClick={onClose} aria-label="Đóng thông báo" className="text-lg font-normal leading-none text-[#6d8dae] hover:text-[#285888]">×</button></div>;
}

export default function BlogModerationPage() {
  const { user, status, authFetch } = useAuth();
  const router = useRouter();
  const { id: postId } = useParams<{ id?: string }>();
  const searchParams = useSearchParams();
  const [posts, setPosts] = useState<Summary[]>([]);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [removeOpen, setRemoveOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [filterType, setFilterType] = useState<"day" | "month">("day");
  const [selectedDay, setSelectedDay] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("");
  const [noticeVisible, setNoticeVisible] = useState(false);
  const detailLoadSeqRef = useRef(0);
  const isModerator = hasAnyRole(user, ["MODERATOR"]);

  const loadPosts = useCallback(async () => {
    if (!user || !isModerator) return;
    setLoading(true);
    try {
      const scope = user.subject ? `?subject=${user.subject}&size=50` : "?size=50";
      setPosts((await api<{ items: Summary[] }>(authFetch, `/blog-posts${scope}`)).items);
    } catch (error) { setMessage(String(error)); }
    finally { setLoading(false); }
  }, [authFetch, isModerator, user]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- loadPosts sets its own loading/posts state as the effect's data fetch
    if (status === "authenticated" && user && isModerator) void loadPosts();
  }, [isModerator, loadPosts, status, user]);
  useEffect(() => {
    if (searchParams.get("notice") !== "author-deleted") return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- notice visibility is derived from the ?notice= URL param
    setNoticeVisible(true);
    const timer = window.setTimeout(() => setNoticeVisible(false), 3500);
    return () => window.clearTimeout(timer);
  }, [searchParams]);
  useEffect(() => {
    if (!postId || status !== "authenticated") {
      detailLoadSeqRef.current += 1;
      // eslint-disable-next-line react-hooks/set-state-in-effect -- resetting detail when postId/status no longer selects a post
      setDetail(null);
      return;
    }
    const requestId = detailLoadSeqRef.current + 1;
    detailLoadSeqRef.current = requestId;
    const isCurrentRequest = () => detailLoadSeqRef.current === requestId;
    setDetail(null);
    setLoading(true);
    api<Detail>(authFetch, `/blog-posts/${postId}`).then((data) => {
      if (!isCurrentRequest() || data.id !== postId) return;
      setDetail(data);
      setMessage("");
    }).catch((error) => {
      if (!isCurrentRequest()) return;
      if (error instanceof Error && error.message.includes("Blog post not found")) {
        setDetail(null);
        router.replace("/blog-moderator?notice=author-deleted");
        void loadPosts();
        return;
      }
      setMessage(String(error));
    }).finally(() => {
      if (isCurrentRequest()) {
        setLoading(false);
      }
    });
    return () => {
      detailLoadSeqRef.current += 1;
    };
  }, [authFetch, loadPosts, postId, router, status]);

  async function removePost() {
    if (!detail || !reason.trim()) return;
    try {
      await api(authFetch, `/blog-posts/${detail.id}/removal`, { method: "POST", body: JSON.stringify({ reason: reason.trim() }) });
      setRemoveOpen(false); setReason(""); router.push("/blog-moderator"); await loadPosts();
    } catch (error) { setMessage(String(error)); }
  }

  const filteredPosts = useMemo(() => posts.filter((post) => {
    if (filterType === "day" && selectedDay) {
      const created = new Date(post.createdAt);
      const day = `${created.getFullYear()}-${String(created.getMonth() + 1).padStart(2, "0")}-${String(created.getDate()).padStart(2, "0")}`;
      return day === selectedDay;
    }
    if (filterType === "month" && selectedMonth) {
      const created = new Date(post.createdAt);
      const month = `${created.getFullYear()}-${String(created.getMonth() + 1).padStart(2, "0")}`;
      return month === selectedMonth;
    }
    return true;
  }), [filterType, posts, selectedDay, selectedMonth]);

  function clearFilter() {
    setSelectedDay("");
    setSelectedMonth("");
  }

  const detailView = postId && detail ? <section>
    <button type="button" onClick={() => router.push("/blog-moderator")} className="mb-6 text-[13px] font-medium text-[#7a7890] hover:text-[#343147]">← Quay lại quản lý Blog</button>
    <article className="overflow-hidden rounded-2xl border border-[#e5e3df] bg-white shadow-[0_3px_10px_rgba(28,30,46,0.08)]"><div className="p-8"><div className="flex items-center justify-between gap-4"><div className="flex items-center gap-2"><SubjectBadge subject={detail.subject} /><span className="text-xs text-[#9b9caf]">{formatRelativeTime(detail.createdAt)}</span></div><button type="button" onClick={() => setRemoveOpen(true)} className="rounded-full bg-[#f04484] px-4 py-2 text-xs font-bold text-white">Gỡ bài viết</button></div><h1 className="mt-4 text-[30px] font-bold leading-tight tracking-[-0.03em] text-[#1c1e2e]">{detail.title}</h1><div className="mt-5 flex items-center gap-3 border-b border-[#f0efec] pb-6"><Avatar name={detail.authorName} seed={detail.authorId} imageUrl={detail.authorAvatarUrl} size={40} /><div><p className="text-sm font-semibold text-[#1c1e2e]">{detail.authorName}</p><p className="text-xs text-[#9b9caf]">Tác giả bài viết</p></div></div><div className="blog-detail-prose pt-6"><RichView html={detail.content} /></div><section className="mt-8 border-t border-[#f0efec] pt-5"><h2 className="text-base font-bold text-[#1c1e2e]">Bình luận ({detail.comments.length})</h2><ul className="mt-4 space-y-3">{detail.comments.map((comment) => <li key={comment.id} className={`flex gap-3 rounded-xl bg-[#f7f7f5] p-3 ${comment.parentCommentId ? "ml-8 sm:ml-12" : ""}`}><Avatar name={comment.authorName} seed={comment.authorId} imageUrl={comment.authorAvatarUrl} size={32} /><div><p className="text-sm font-semibold text-[#1c1e2e]">{comment.authorName}</p><div className="blog-comment-content pt-1 text-sm text-[#4a4b5e]" dangerouslySetInnerHTML={{ __html: comment.content }} /></div></li>)}</ul></section></div></article>
  </section> : null;

  const listView = <section>
    <button type="button" onClick={() => router.push("/blog")} className="mb-6 flex items-center gap-1.5 text-[13px] font-medium text-[#9b9caf] hover:text-[#4a4b5e]"><span aria-hidden>←</span> Quay lại Quản lý Blog</button>
    <header className="border-b border-[#eaeae7] pb-5"><p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#e14f85]">Quản trị cộng đồng</p><h1 className="mt-1 text-[34px] font-bold tracking-[-0.04em] text-[#1c1e2e]">Quản Lý Blog</h1><p className="mt-1 text-sm text-[#77798c]">Bài viết môn {user?.subject ?? "được phân công"} · {filteredPosts.length} bài đang hiển thị.</p></header>
    <section className="mt-5 flex flex-wrap items-end gap-3 rounded-2xl border border-[#e8e5e1] bg-[#fcfbfa] p-4"><div className="flex rounded-lg bg-[#f1efec] p-1 text-xs font-semibold"><button type="button" onClick={() => setFilterType("day")} className={`rounded-md px-3 py-2 transition ${filterType === "day" ? "bg-white text-[#1c1e2e] shadow-sm" : "text-[#858395]"}`}>Theo ngày</button><button type="button" onClick={() => setFilterType("month")} className={`rounded-md px-3 py-2 transition ${filterType === "month" ? "bg-white text-[#1c1e2e] shadow-sm" : "text-[#858395]"}`}>Theo tháng/năm</button></div><label className="grid gap-1 text-[11px] font-bold uppercase tracking-[0.08em] text-[#858395]">{filterType === "day" ? "Ngày đăng" : "Tháng / năm"}<input type={filterType === "day" ? "date" : "month"} value={filterType === "day" ? selectedDay : selectedMonth} onChange={(event) => filterType === "day" ? setSelectedDay(event.target.value) : setSelectedMonth(event.target.value)} className="h-10 rounded-lg border border-[#ddd9d4] bg-white px-3 text-sm font-medium normal-case tracking-normal text-[#363542] outline-none focus:border-[#786ce8]" /></label>{(selectedDay || selectedMonth) && <button type="button" onClick={clearFilter} className="h-10 rounded-lg px-3 text-sm font-semibold text-[#756f8b] hover:bg-[#f1efec]">Xóa bộ lọc</button>}</section>
    <div className="mt-7 space-y-4">{loading ? Array.from({ length: 5 }, (_, index) => <div key={index} className="h-36 animate-pulse rounded-2xl bg-[#eeece8]" />) : filteredPosts.map((post) => <button key={post.id} type="button" onClick={() => router.push(`/blog-moderator/${post.id}`)} className="flex w-full items-start gap-5 rounded-2xl border border-[#dededb] bg-white p-5 text-left shadow-[0_3px_10px_rgba(28,30,46,0.08)] transition hover:-translate-y-0.5 hover:shadow-[0_10px_22px_rgba(28,30,46,0.14)]"><div className="h-28 w-44 shrink-0 overflow-hidden rounded-xl bg-[#f0f0ee]"><img src={post.thumbnailUrl ?? "/blog-detail-cover.png"} alt="" loading="lazy" decoding="async" className="size-full object-cover" /></div><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><Avatar name={post.authorName} seed={post.authorId} imageUrl={post.authorAvatarUrl} size={34} /><div className="min-w-0"><p className="truncate text-sm font-semibold text-[#1c1e2e]">{post.authorName}</p><p className="text-xs text-[#9b9caf]">{formatRelativeTime(post.createdAt)}</p></div></div><div className="mt-3 flex items-center gap-2"><SubjectBadge subject={post.subject} /><span className="text-xs text-[#8c89a0]">{post.commentCount} bình luận</span></div><h2 className="mt-2 text-lg font-bold leading-snug text-[#1c1e2e]">{post.title}</h2><p className="mt-1 line-clamp-2 text-sm leading-5 text-[#77798c]">{post.excerpt}</p></div></button>)}</div>
    {!loading && filteredPosts.length === 0 && <p className="mt-8 text-center text-sm text-[#9b9caf]">Không có bài viết phù hợp với bộ lọc này.</p>}
  </section>;

  const authorDeletedNotice = searchParams.get("notice") === "author-deleted";

  return <RouteGuard pathname="/blog-moderator" denyHref="/blog" denyLabel="Về trang Blog"><div className="flex min-h-screen bg-white"><Sidebar activeHref="/blog-moderator" />{user && <main className="min-w-0 flex-1 px-6 py-8"><div className="mx-auto max-w-[1104px]">{message && <p className="mb-4 rounded-xl bg-[#fff0f5] px-4 py-3 text-sm text-[#b83b69]">{message}</p>}{detailView ?? listView}</div></main>}{authorDeletedNotice && noticeVisible && <ModerationNoticeToast onClose={() => setNoticeVisible(false)} />}{removeOpen && <RemovePostDialog reason={reason} onReasonChange={setReason} onCancel={() => { setRemoveOpen(false); setReason(""); }} onConfirm={() => void removePost()} />}</div></RouteGuard>;
}
