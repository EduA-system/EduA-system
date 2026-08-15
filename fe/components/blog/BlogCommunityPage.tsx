"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  api,
  formatRelativeTime,
  type Comment,
  type Detail,
  type Summary,
} from "@/lib/blog";
import { Avatar } from "./Avatar";
import { SubjectBadge } from "./SubjectBadge";
import { PostCard } from "./PostCard";
import { CreatePostModal } from "./CreatePostModal";
import { RichView } from "./RichView";
import { Sidebar } from "@/components/layout/Sidebar";
import { useAuth } from "@/lib/auth/AuthContext";
import { hasAnyRole } from "@/lib/auth/permissions";
import { SUBJECT_CODES, SUBJECT_LABELS } from "@/lib/auth/subject-access";

const COMMENT_MAX_WORDS = 200;

function countWords(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

function BackIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="size-full">
      <path d="M19 12H5" strokeLinecap="round" />
      <path d="m12 19-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CommentBubbleIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="size-full">
      <path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8A8.5 8.5 0 0 1 12.5 3H13a8.5 8.5 0 0 1 8 8.5Z" strokeLinejoin="round" />
    </svg>
  );
}

function BlogSuccessToast({ message, onClose }: { message: string; onClose: () => void }) {
  return <div className="fixed right-5 top-5 z-[70] flex max-w-sm items-center gap-3 rounded-2xl border border-[#bde6ce] bg-white px-4 py-3 text-sm font-semibold text-[#23613d] shadow-[0_14px_34px_rgba(22,82,49,0.18)]" role="status"><span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[#31a66a] text-sm text-white">✓</span><span className="flex-1">{message}</span><button type="button" onClick={onClose} aria-label="Đóng thông báo" className="text-lg font-normal leading-none text-[#548266] hover:text-[#23613d]">×</button></div>;
}

function BlogConfirmationDialog({ title, description, confirmLabel, onCancel, onConfirm }: { title: string; description: string; confirmLabel: string; onCancel: () => void; onConfirm: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#3f2634]/25 px-4" role="dialog" aria-modal="true" aria-labelledby="blog-confirmation-title">
      <div className="w-full max-w-[600px] overflow-hidden rounded-[34px] bg-white shadow-[0_28px_50px_rgba(64,43,54,0.28)]">
        <div className="relative flex h-[205px] items-center justify-center overflow-hidden bg-[#f38eb5]">
          <span className="absolute size-32 translate-x-10 rounded-[42px] bg-[#ef3d7c]" />
          <span className="absolute -translate-x-8 translate-y-5 size-28 rounded-full bg-[#f470a2]" />
          <span className="relative flex size-[116px] items-center justify-center rounded-full border-[5px] border-[#19201f] bg-white shadow-[inset_0_0_0_7px_#ecf0e8]">
            <span className="size-12 rounded-full border-[4px] border-[#19201f] bg-[#d7efdf]" />
            <span className="absolute -bottom-5 right-0 h-11 w-5 rotate-[-40deg] rounded-full border-[4px] border-[#19201f] bg-white" />
          </span>
          <button type="button" onClick={onCancel} aria-label="Đóng" className="absolute right-7 top-7 flex size-12 items-center justify-center rounded-full bg-white text-[38px] font-light leading-none text-[#ef4d8b] transition hover:scale-105">×</button>
        </div>
        <div className="px-8 pb-9 pt-7 text-center sm:px-16 sm:pb-11 sm:pt-9">
          <h2 id="blog-confirmation-title" className="text-[30px] font-bold tracking-[-0.03em] text-[#35353b] sm:text-[36px]">{title}</h2>
          <p className="mx-auto mt-4 max-w-[450px] text-[15px] leading-6 text-[#7d7c81] sm:text-[17px]">{description}</p>
          <div className="mt-8 grid grid-cols-2 gap-4">
            <button type="button" onClick={onConfirm} className="h-14 rounded-xl bg-[#f04484] text-[15px] font-bold text-white shadow-sm transition hover:bg-[#dc3372]">{confirmLabel}</button>
            <button type="button" onClick={onCancel} className="h-14 rounded-xl bg-[#fff0f5] text-[15px] font-semibold text-[#e14f85] transition hover:bg-[#ffe2ed]">Để tôi suy nghĩ lại</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SendIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="size-full">
      <path d="m22 2-7 20-4-9-9-4 20-7Z" strokeLinejoin="round" />
      <path d="M22 2 11 13" strokeLinecap="round" />
    </svg>
  );
}

function MagazineListItem({ post, onClick }: { post: Summary; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="group flex w-full gap-3 text-left">
      <div className="h-[76px] w-[98px] shrink-0 overflow-hidden rounded-xl bg-[#eceae5]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={post.thumbnailUrl ?? "/blog-detail-cover.png"} alt="" loading="lazy" decoding="async" className="size-full object-cover transition duration-300 group-hover:scale-105" />
      </div>
      <div className="min-w-0 py-0.5">
        <div className="flex items-center gap-2">
          <SubjectBadge subject={post.subject} />
          <span className="text-[11px] text-[#9b9caf]">{formatRelativeTime(post.createdAt)}</span>
        </div>
        <p className="mt-1.5 line-clamp-2 text-[14px] font-bold leading-5 text-[#1c1e2e] transition group-hover:text-[#5d4b9c]">{post.title}</p>
        <p className="mt-1 text-[11px] text-[#9b9caf]">{post.authorName} · {post.commentCount} bình luận</p>
      </div>
    </button>
  );
}

function BlogMagazineSkeleton() {
  return (
    <div className="animate-pulse pt-7" role="status" aria-label="Đang tải bài viết">
      <div className="grid gap-8 border-b border-[#eaeae7] pb-9 lg:grid-cols-[minmax(0,1.5fr)_minmax(330px,0.9fr)]">
        <div><div className="aspect-[16/9] rounded-2xl bg-[#eeece8]" /><div className="mt-4 h-5 w-24 rounded-full bg-[#eeece8]" /><div className="mt-3 h-8 w-11/12 rounded bg-[#eeece8]" /><div className="mt-2 h-4 w-1/3 rounded bg-[#eeece8]" /></div>
        <div><div className="mb-5 h-6 w-32 rounded bg-[#eeece8]" /><div className="space-y-4">{Array.from({ length: 4 }, (_, index) => <div key={index} className="flex gap-3"><div className="h-[76px] w-[98px] shrink-0 rounded-xl bg-[#eeece8]" /><div className="flex-1 pt-1"><div className="h-4 w-20 rounded bg-[#eeece8]" /><div className="mt-3 h-4 w-full rounded bg-[#eeece8]" /><div className="mt-2 h-3 w-2/3 rounded bg-[#eeece8]" /></div></div>)}</div></div>
      </div>
      <div className="my-8 h-36 rounded-2xl bg-[#eeece8]" />
      <div className="h-7 w-48 rounded bg-[#eeece8]" /><div className="mt-5 grid gap-5 md:grid-cols-3">{Array.from({ length: 3 }, (_, index) => <div key={index} className="h-48 rounded-2xl bg-[#eeece8]" />)}</div>
      <span className="sr-only">Đang tải bài viết...</span>
    </div>
  );
}

function BlogDetailSkeleton() {
  return (
    <div className="animate-pulse pt-1" role="status" aria-label="Đang tải chi tiết bài viết">
      <div className="mb-6 h-4 w-28 rounded bg-[#eeece8]" />
      <article className="overflow-hidden rounded-2xl border-[0.8px] border-[#eaeae7] bg-white">
        <div className="h-[332px] bg-[#eeece8]" />
        <div className="p-8">
          <div className="h-5 w-24 rounded-full bg-[#eeece8]" />
          <div className="mt-5 h-9 w-3/4 rounded bg-[#eeece8]" />
          <div className="mt-6 flex items-center gap-3 border-b border-[#f5f5f3] pb-6"><div className="size-10 rounded-full bg-[#eeece8]" /><div className="space-y-2"><div className="h-3 w-28 rounded bg-[#eeece8]" /><div className="h-3 w-20 rounded bg-[#eeece8]" /></div></div>
          <div className="mt-7 space-y-3"><div className="h-4 w-full rounded bg-[#eeece8]" /><div className="h-4 w-11/12 rounded bg-[#eeece8]" /><div className="h-4 w-4/5 rounded bg-[#eeece8]" /></div>
          <div className="mt-9 h-24 rounded-[14px] bg-[#eeece8]" />
        </div>
      </article>
      <span className="sr-only">Đang tải chi tiết bài viết...</span>
    </div>
  );
}

function textExcerptFromHtml(html: string) {
  if (typeof document !== "undefined") {
    const template = document.createElement("template");
    template.innerHTML = html;
    return (template.content.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 160);
  }
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 160);
}

function firstImageFromHtml(html: string) {
  if (typeof document !== "undefined") {
    const template = document.createElement("template");
    template.innerHTML = html;
    return template.content.querySelector("img")?.getAttribute("src") ?? null;
  }
  return html.match(/<img[^>]+src=["']([^"']+)["']/i)?.[1] ?? null;
}

function summaryFromDetail(post: Detail): Summary {
  return {
    id: post.id,
    title: post.title,
    subject: post.subject,
    authorId: post.authorId,
    authorName: post.authorName,
    authorAvatarUrl: post.authorAvatarUrl,
    createdAt: post.createdAt,
    commentCount: post.comments.filter((commentItem) => !commentItem.hidden).length,
    excerpt: textExcerptFromHtml(post.content),
    thumbnailUrl: post.thumbnailUrl ?? firstImageFromHtml(post.content),
  };
}

export function BlogCommunityPage({ postId }: { postId?: string }) {
  const { user, status, authFetch } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [posts, setPosts] = useState<Summary[]>([]);
  const [isPostsLoading, setIsPostsLoading] = useState(true);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [msg, setMsg] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  // Blog là không gian chung: giáo viên đọc được bài của mọi môn, mặc định mở ở "Tất cả".
  const [activeSubjectFilter, setActiveSubjectFilter] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const [isCommentSubmitting, setIsCommentSubmitting] = useState(false);
  const commentSubmissionRef = useRef(false);
  const [replyTo, setReplyTo] = useState<Comment | null>(null);
  const [commentToHide, setCommentToHide] = useState<Comment | null>(null);
  const [commentToDelete, setCommentToDelete] = useState<Comment | null>(null);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editCommentText, setEditCommentText] = useState("");
  const [editCommentConfirmOpen, setEditCommentConfirmOpen] = useState(false);
  const commentWordCount = useMemo(() => countWords(comment), [comment]);
  const editCommentWordCount = useMemo(() => countWords(editCommentText), [editCommentText]);
  const [postToDelete, setPostToDelete] = useState<{ id: string } | null>(null);
  const detailLoadSeqRef = useRef(0);
  const showSuccess = useCallback((message: string) => setSuccessMessage(message), []);

  useEffect(() => {
    const toast = searchParams.get("toast");
    if (!toast) return;
    const messages: Record<string, string> = { created: "Đã tạo bài viết thành công.", deleted: "Đã xóa bài viết thành công.", "moderator-removed": "Bài viết đã bị Moderator gỡ và không còn hiển thị trong Blog." };
    // eslint-disable-next-line react-hooks/set-state-in-effect -- toast is a one-shot signal derived from the ?toast= URL param, not component state
    if (messages[toast]) showSuccess(messages[toast]);
    router.replace("/blog");
  }, [router, searchParams, showSuccess]);

  useEffect(() => {
    if (!successMessage) return;
    const timer = window.setTimeout(() => setSuccessMessage(""), 3500);
    return () => window.clearTimeout(timer);
  }, [successMessage]);
  const loadPosts = useCallback(async (subject?: string | null) => {
    setIsPostsLoading(true);
    try {
      const scope = subject ? `?subject=${subject}&size=50` : `?size=50`;
      setPosts((await api<{ items: Summary[] }>(authFetch, `/blog-posts${scope}`)).items);
    } catch (e) { setMsg(String(e)); }
    finally { setIsPostsLoading(false); }
  }, [authFetch]);

  useEffect(() => {
    if (status !== "authenticated") return;
    queueMicrotask(() => void loadPosts(activeSubjectFilter));
  }, [activeSubjectFilter, loadPosts, status]);

  const handleModeratorRemoved = useCallback(() => {
    setDetail(null);
    setEditOpen(false);
    router.replace("/blog?toast=moderator-removed");
  }, [router]);

  const loadDetail = useCallback(async (id: string) => {
    const requestId = detailLoadSeqRef.current + 1;
    detailLoadSeqRef.current = requestId;
    const isCurrentRequest = () => detailLoadSeqRef.current === requestId;
    setIsDetailLoading(true);
    try {
      const loadedDetail = await api<Detail>(authFetch, `/blog-posts/${id}`);
      if (!isCurrentRequest() || loadedDetail.id !== id) return;
      setDetail(loadedDetail);
      setMsg("");
    }
    catch (e) {
      if (!isCurrentRequest()) return;
      if (e instanceof Error && e.message.includes("Blog post not found")) { handleModeratorRemoved(); return; }
      setMsg(String(e));
    }
    finally {
      if (isCurrentRequest()) {
        setIsDetailLoading(false);
      }
    }
  }, [authFetch, handleModeratorRemoved]);

  useEffect(() => {
    if (!postId || status !== "authenticated") {
      detailLoadSeqRef.current += 1;
      // eslint-disable-next-line react-hooks/set-state-in-effect -- resetting detail when postId/status no longer selects a post
      setDetail(null);
      return;
    }
    setDetail(null);
    void loadDetail(postId);
    return () => {
      detailLoadSeqRef.current += 1;
    };
  }, [loadDetail, postId, status]);

  useEffect(() => {
    if (postId && searchParams.get("edit") === "1" && detail?.id === postId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- opening the editor is derived from the ?edit=1 URL param
      setEditOpen(true);
    }
  }, [detail?.id, postId, searchParams]);

  function openDetail(id: string) {
    router.push(`/blog/${id}`);
  }

  function openEdit(id: string) {
    router.push(`/blog/${id}?edit=1`);
  }

  function handleFilterChange(subject: string | null) {
    // Danh sách được nạp lại bởi effect theo activeSubjectFilter, không gọi loadPosts thủ công ở đây.
    setActiveSubjectFilter(subject);
  }

  async function deletePost(id: string) {
    // A detail request may still be in flight while its author deletes the post.
    // Invalidate it first so its expected 404 cannot replace the self-delete toast
    // with the moderator-removal message.
    detailLoadSeqRef.current += 1;
    try { await api(authFetch, `/blog-posts/${id}`, { method: "DELETE" }); setPostToDelete(null); setDetail(null); router.push("/blog?toast=deleted"); await loadPosts(activeSubjectFilter); }
    catch (e) {
      if (e instanceof Error && e.message.includes("Blog post not found")) { handleModeratorRemoved(); return; }
      setMsg(String(e));
    }
  }

  async function addComment() {
    if (!detail || !comment.trim() || commentWordCount > COMMENT_MAX_WORDS || commentSubmissionRef.current) return;
    commentSubmissionRef.current = true;
    setIsCommentSubmitting(true);
    try {
      await api<Comment>(authFetch, `/blog-posts/${detail.id}/comments`, { method: "POST", body: JSON.stringify({ content: comment, parentCommentId: replyTo?.id ?? null }) });
      setComment(""); setReplyTo(null); showSuccess("Đã đăng bình luận thành công."); await loadDetail(detail.id); await loadPosts(activeSubjectFilter);
    } catch (e) {
      if (e instanceof Error && e.message.includes("Blog post not found")) { handleModeratorRemoved(); return; }
      setMsg(String(e));
    } finally {
      setIsCommentSubmitting(false);
      commentSubmissionRef.current = false;
    }
  }

  async function deleteComment(cid: string) {
    if (!detail) return;
    try { await api(authFetch, `/blog-comments/${cid}`, { method: "DELETE" }); setCommentToDelete(null); showSuccess("Đã xóa bình luận thành công."); await loadDetail(detail.id); }
    catch (e) {
      if (e instanceof Error && e.message.includes("Blog post not found")) { handleModeratorRemoved(); return; }
      setMsg(String(e));
    }
  }

  function startEditComment(c: Comment) {
    setEditingCommentId(c.id);
    setEditCommentText(c.content.replace(/<[^>]*>/g, ""));
  }

  function cancelEditComment() {
    setEditingCommentId(null);
    setEditCommentText("");
    setEditCommentConfirmOpen(false);
  }

  function requestUpdateComment() {
    if (!editingCommentId || !editCommentText.trim() || editCommentWordCount > COMMENT_MAX_WORDS) return;
    setEditCommentConfirmOpen(true);
  }

  async function updateComment() {
    if (!detail || !editingCommentId || !editCommentText.trim() || editCommentWordCount > COMMENT_MAX_WORDS) return;
    try {
      await api<Comment>(authFetch, `/blog-comments/${editingCommentId}`, { method: "PATCH", body: JSON.stringify({ content: editCommentText }) });
      cancelEditComment();
      showSuccess("Đã cập nhật bình luận thành công.");
      await loadDetail(detail.id);
      await loadPosts(activeSubjectFilter);
    } catch (e) {
      if (e instanceof Error && e.message.includes("Blog post not found")) { handleModeratorRemoved(); return; }
      setMsg(String(e));
    }
  }

  async function hideComment() {
    if (!commentToHide || !detail) return;
    try {
      await api(authFetch, `/blog-comments/${commentToHide.id}/hide`, { method: "POST" });
      setCommentToHide(null);
      showSuccess("Đã ẩn bình luận thành công.");
      await loadDetail(detail.id);
      await loadPosts(activeSubjectFilter);
    } catch (e) {
      if (e instanceof Error && e.message.includes("Blog post not found")) { handleModeratorRemoved(); return; }
      setMsg(String(e));
    }
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white px-4">
        <div className="w-full max-w-md rounded-2xl border-[0.8px] border-[#eaeae7] bg-white p-8">
          <h1 className="mb-2 text-xl font-bold text-[#1c1e2e]">Blog EDUA</h1>
          <p className="mb-4 text-sm text-[#9b9caf]">Blog dùng phiên đăng nhập EDUA.</p>
          <p className="text-sm text-[#9b9caf]">
            {status === "loading" ? "Đang kiểm tra phiên đăng nhập..." : "Không thể tải phiên đăng nhập."}
          </p>
          {msg && <p className="mt-3 text-sm text-red-600">{msg}</p>}
        </div>
      </div>
    );
  }

  const currentSummary = detail ? posts.find((p) => p.id === detail.id) : null;
  const isDetailRoute = Boolean(postId);
  const detailCover = detail?.thumbnailUrl ?? currentSummary?.thumbnailUrl ?? "/blog-detail-cover.png";
  const currentUserName = user.fullName ?? user.email;
  const isModerator = hasAnyRole(user, ["MODERATOR"]);
  const commentsForDisplay = detail ? detail.comments
    .filter((commentItem) => !commentItem.parentCommentId)
    .flatMap((commentItem) => [commentItem, ...detail.comments.filter((reply) => reply.parentCommentId === commentItem.id)]) : [];
  const visibleCommentCount = detail ? detail.comments.filter((commentItem) => !commentItem.hidden).length : 0;
  const featuredPost = posts[0];
  const recentPosts = posts.slice(1, 5);
  const discussionPosts = [...posts].sort((a, b) => b.commentCount - a.commentCount).slice(0, 3);

  return (
    <div className="flex min-h-screen bg-white">
      <Sidebar activeHref="/blog" />

      <main className="min-w-0 flex-1 px-6 py-8">
        <div className="mx-auto max-w-[1104px]">
          {!detail && !isDetailRoute && (
            <>
              <header className="flex flex-col gap-5 border-b border-[#eaeae7] pb-5 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#7661b3]">Cộng đồng giáo viên</p>
                  <h1 className="mt-1 font-[family-name:var(--font-libertine)] text-[34px] font-bold tracking-[-0.04em] text-[#1c1e2e]">Blog EDUA</h1>
                  <p className="mt-1 text-[14px] text-[#77798c]">Chia sẻ kiến thức, ý tưởng và trải nghiệm giảng dạy.</p>
                </div>
                <div className="flex items-center gap-2">
                  {isModerator && <Link href="/blog-moderator" className="flex h-10 items-center rounded-full bg-[#1c1e2e] px-5 text-[13px] font-semibold text-white transition hover:bg-[#35374b]">Quản lý Blog</Link>}
                  <Link href="/blog/create" className="flex h-10 items-center rounded-full bg-[#1c1e2e] px-5 text-[13px] font-semibold text-white transition hover:bg-[#35374b]">+ Tạo bài viết</Link>
                </div>
              </header>
              <nav aria-label="Lọc bài viết theo môn" className="flex gap-5 overflow-x-auto border-b border-[#eaeae7] py-3.5 scrollbar-none">
                <button type="button" onClick={() => handleFilterChange(null)} className={`shrink-0 text-[13px] font-semibold transition ${activeSubjectFilter === null ? "border-b-2 border-[#1c1e2e] pb-1 text-[#1c1e2e]" : "text-[#8b8c9d] hover:text-[#1c1e2e]"}`}>Tất cả</button>
                {SUBJECT_CODES.map((subject) => <button key={subject} type="button" onClick={() => handleFilterChange(activeSubjectFilter === subject ? null : subject)} className={`shrink-0 text-[13px] font-semibold transition ${activeSubjectFilter === subject ? "border-b-2 border-[#1c1e2e] pb-1 text-[#1c1e2e]" : "text-[#8b8c9d] hover:text-[#1c1e2e]"}`}>{SUBJECT_LABELS[subject]}</button>)}
              </nav>
            </>
          )}

          {msg && <p className="mb-4 rounded-2xl bg-white px-4 py-2.5 text-sm text-[#4a4b5e]">{msg}</p>}

          {isDetailRoute && isDetailLoading && !detail ? (
            <BlogDetailSkeleton />
          ) : detail ? (
            <div className="w-full">
              <button
                type="button"
                onClick={() => router.push("/blog")}
                className="mb-6 flex items-center gap-1.5 text-[13px] font-medium text-[#9b9caf] transition-colors hover:text-[#4a4b5e]"
              >
                <span className="size-3.5"><BackIcon /></span>
                Quay lại Blog
              </button>

              <article className="overflow-hidden rounded-2xl border-[0.8px] border-[#eaeae7] bg-white">
                <div className="h-[332px] w-full bg-[#f0f0ee]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={detailCover} alt="" className="size-full object-cover" />
                </div>

                <div className="p-8">
                  <div className="flex items-center gap-2">
                    <SubjectBadge subject={detail.subject} />
                    <span className="text-[13px] text-[#d8d8d5]">·</span>
                    <span className="text-[13px] text-[#b0b1c2]">{formatRelativeTime(detail.createdAt)}</span>
                  </div>

                  <h2 className="max-w-[711px] pt-4 text-[30px] font-bold leading-[37.5px] text-[#1c1e2e]">
                    {detail.title}
                  </h2>

                  <div className="flex items-center gap-3 border-b-[0.8px] border-[#f5f5f3] pb-6 pt-5">
                    <Avatar name={detail.authorName} seed={detail.authorId} imageUrl={detail.authorAvatarUrl} size={40} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14px] font-semibold leading-[21px] text-[#1c1e2e]">{detail.authorName}</p>
                      <p className="truncate text-[12px] leading-[18px] text-[#9b9caf]">Giáo viên EDUA</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {detail.authorId === user.id && (
                        <button
                          type="button"
                          onClick={() => openEdit(detail.id)}
                          className="h-8 rounded-[14px] border-[0.8px] border-[#eaeae7] px-3 text-[12px] font-medium text-[#4a4b5e] transition-colors hover:bg-[#f7f7f5]"
                        >
                          Sửa bài
                        </button>
                      )}
                      {detail.authorId === user.id && (
                        <button
                          type="button"
                          onClick={() => setPostToDelete(detail)}
                          className="h-8 rounded-[14px] border-[0.8px] border-red-100 px-3 text-[12px] font-medium text-red-600 transition-colors hover:bg-red-50"
                        >
                          Xóa bài
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="blog-detail-prose pt-6">
                    <RichView html={detail.content} />
                  </div>

                  <div className="mt-8 flex items-center gap-5 border-b-[0.8px] border-t-[0.8px] border-[#f5f5f3] py-4 text-[13px] text-[#b0b1c2]">
                    <div className="flex items-center gap-1.5">
                      <span className="size-3.5"><CommentBubbleIcon /></span>
                      {visibleCommentCount} bình luận
                    </div>
                  </div>

                  <section className="pt-5">
                    <h3 className="text-[14px] font-semibold text-[#1c1e2e]">Bình luận</h3>

                    {replyTo && <div className="mt-3 flex items-center justify-between rounded-xl bg-[#f4f3f8] px-3 py-2 text-[12px] text-[#5d6381]"><span>Đang trả lời <strong>{replyTo.authorName}</strong></span><button type="button" disabled={isCommentSubmitting} onClick={() => setReplyTo(null)} className="font-semibold text-[#7661b3] hover:text-[#4f3e8a] disabled:cursor-not-allowed disabled:opacity-50">Hủy</button></div>}

                    <div className="flex items-start gap-3 pt-4">
                      <Avatar name={currentUserName} seed={user.id} size={32} />
                      <div className="relative min-w-0 flex-1">
                        <input
                          value={comment}
                          onChange={(e) => setComment(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              void addComment();
                            }
                          }}
                          disabled={isCommentSubmitting}
                          placeholder="Viết bình luận..."
                          className="h-10 w-full rounded-[14px] border-[0.8px] border-[#eaeae7] bg-[#f7f7f5] py-2 pl-4 pr-11 text-[13px] text-[#4a4b5e] outline-none transition-colors placeholder:text-[#c0c1d0] focus:border-[#d8d8d5] disabled:cursor-not-allowed disabled:opacity-70"
                        />
                        <button
                          type="button"
                          disabled={isCommentSubmitting || !comment.trim() || commentWordCount > COMMENT_MAX_WORDS}
                          onClick={addComment}
                          title="Gửi bình luận"
                          className="absolute right-2 top-2 flex size-6 items-center justify-center rounded-[10px] text-[#b0b1c2] transition-colors hover:bg-white hover:text-[#4a4b5e] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-[#b0b1c2]"
                        >
                          <span className="size-3"><SendIcon /></span>
                        </button>
                      </div>
                      <p className={`mt-1 text-right text-[11px] ${commentWordCount > COMMENT_MAX_WORDS ? "text-red-500" : "text-[#9b9caf]"}`}>{commentWordCount}/{COMMENT_MAX_WORDS} từ</p>
                    </div>

                    <ul className="space-y-4 pt-5">
                      {commentsForDisplay.map((c) => (
                        <li key={c.id} className={`flex items-start gap-3 ${c.parentCommentId ? "ml-8 border-l-2 border-[#ece9f3] pl-4 sm:ml-12" : ""}`}>
                          <Avatar name={c.authorName} seed={c.authorId} imageUrl={c.authorAvatarUrl} size={32} />
                          <div className="min-w-0 flex-1">
                            <div className="rounded-[14px] bg-[#f7f7f5] px-4 py-3">
                              {editingCommentId === c.id ? (
                                <div>
                                  <div className="flex items-center gap-3">
                                    <p className="min-w-0 flex-1 truncate text-[13px] font-semibold leading-[19.5px] text-[#1c1e2e]">
                                      {c.authorName}
                                    </p>
                                    <span className="shrink-0 text-[11px] text-[#c0c1d0]">Đang sửa</span>
                                  </div>
                                  <input
                                    value={editCommentText}
                                    onChange={(e) => setEditCommentText(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") {
                                        e.preventDefault();
                                        requestUpdateComment();
                                      }
                                      if (e.key === "Escape") cancelEditComment();
                                    }}
                                    autoFocus
                                    className="mt-1.5 h-10 w-full rounded-[10px] border-[0.8px] border-[#eaeae7] bg-white px-3 text-[13px] leading-[21px] text-[#4a4b5e] outline-none transition-colors focus:border-[#d8d8d5]"
                                  />
                                  <div className="mt-2 flex justify-end gap-2">
                                    <span className={`mr-auto self-center text-[11px] ${editCommentWordCount > COMMENT_MAX_WORDS ? "text-red-500" : "text-[#9b9caf]"}`}>{editCommentWordCount}/{COMMENT_MAX_WORDS} từ</span>
                                    <button type="button" onClick={cancelEditComment} className="rounded-lg px-3 py-1.5 text-[12px] font-semibold text-[#9b9caf] transition-colors hover:text-[#4a4b5e]">
                                      Hủy
                                    </button>
                                    <button type="button" onClick={requestUpdateComment} disabled={!editCommentText.trim() || editCommentWordCount > COMMENT_MAX_WORDS} className="rounded-lg bg-[#1c1e2e] px-3 py-1.5 text-[12px] font-semibold text-white transition-colors hover:bg-[#35374b] disabled:cursor-not-allowed disabled:opacity-50">
                                      Lưu
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  <div className="flex items-center gap-3">
                                    <p className="min-w-0 flex-1 truncate text-[13px] font-semibold leading-[19.5px] text-[#1c1e2e]">
                                      {c.authorName}
                                    </p>
                                    <span className="shrink-0 text-[11px] text-[#c0c1d0]">{formatRelativeTime(c.createdAt)}</span>
                                  </div>
                                  <div
                                    className="blog-comment-content pt-1.5 text-[13px] leading-[21px] text-[#4a4b5e]"
                                    dangerouslySetInnerHTML={{ __html: c.content }}
                                  />
                                </>
                              )}
                            </div>
                            <div className="flex items-center gap-3 px-1 pt-1.5 text-[11px] font-semibold text-[#9b9caf]">
                              {!c.hidden && !c.parentCommentId && <button type="button" onClick={() => setReplyTo(c)} className="hover:text-[#4a4b5e]">Trả lời</button>}
                              {!c.hidden && c.authorId === user.id && (
                                <>
                                  <button type="button" onClick={() => startEditComment(c)} className="hover:text-[#4a4b5e]">
                                    Sửa
                                  </button>
                                  <button type="button" onClick={() => setCommentToDelete(c)} className="text-red-500 hover:text-red-600">
                                    Xóa
                                  </button>
                                </>
                              )}
                              {!c.hidden && detail.authorId === user.id && c.authorId !== user.id && (
                                <button type="button" onClick={() => setCommentToHide(c)} className="text-[#d75a88] hover:text-[#b83b69]">
                                  Ẩn bình luận
                                </button>
                              )}
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </section>
                </div>
              </article>
            </div>
          ) : !isDetailRoute && isPostsLoading ? (
            <BlogMagazineSkeleton />
          ) : posts.length > 0 ? (
            <div className="pt-7">
              <section className="grid gap-8 border-b border-[#eaeae7] pb-9 lg:grid-cols-[minmax(0,1.5fr)_minmax(330px,0.9fr)]">
                <button type="button" onClick={() => openDetail(featuredPost.id)} className="group text-left">
                  <div className="aspect-[16/9] overflow-hidden rounded-2xl bg-[#eceae5]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={featuredPost.thumbnailUrl ?? "/blog-detail-cover.png"} alt="" className="size-full object-cover transition duration-500 group-hover:scale-[1.03]" />
                  </div>
                  <div className="mt-4 flex items-center gap-2"><SubjectBadge subject={featuredPost.subject} /><span className="text-[12px] text-[#9b9caf]">{formatRelativeTime(featuredPost.createdAt)}</span></div>
                  <h2 className="mt-2 max-w-3xl text-[25px] font-bold leading-tight tracking-[-0.03em] text-[#1c1e2e] transition group-hover:text-[#5d4b9c] sm:text-[30px]">{featuredPost.title}</h2>
                  <p className="mt-2 text-[13px] text-[#77798c]">{featuredPost.authorName} · {featuredPost.commentCount} bình luận</p>
                </button>
                <div><div className="mb-4 flex items-center justify-between"><h2 className="text-[18px] font-bold text-[#1c1e2e]">Bài viết mới</h2><span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#9b9caf]">Mới nhất</span></div><div className="space-y-4">{recentPosts.map((post) => <MagazineListItem key={post.id} post={post} onClick={() => openDetail(post.id)} />)}</div></div>
              </section>

              <section className="my-8 flex flex-col gap-4 rounded-2xl bg-[#24213a] px-6 py-6 text-white sm:flex-row sm:items-center sm:justify-between sm:px-8">
                <div><p className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#c8b8ff]">Không gian chuyên môn</p><h2 className="mt-1 text-[21px] font-bold">Bạn có một ý tưởng hay cho tiết dạy?</h2><p className="mt-1 text-[13px] text-[#d4d0e7]">Chia sẻ để kết nối cùng cộng đồng giáo viên EDUA.</p></div>
                <Link href="/blog/create" className="shrink-0 rounded-full bg-white px-5 py-2.5 text-[13px] font-bold text-[#24213a] transition hover:bg-[#eee9ff]">Viết bài ngay</Link>
              </section>

              <section className="border-t border-[#eaeae7] pt-7">
                <div className="mb-5"><p className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#7661b3]">Đang được quan tâm</p><h2 className="mt-1 text-[23px] font-bold tracking-[-0.03em] text-[#1c1e2e]">Thảo luận nổi bật</h2></div>
                <div className="grid gap-5 md:grid-cols-3">{discussionPosts.map((post) => <PostCard key={post.id} post={post} onClick={() => openDetail(post.id)} onEdit={post.authorId === user.id ? () => void openEdit(post.id) : undefined} onDelete={post.authorId === user.id ? () => setPostToDelete(post) : undefined} />)}</div>
              </section>

              <section className="mt-10 border-t border-[#eaeae7] pt-7">
                <div className="mb-5 flex items-center justify-between"><div><p className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#7661b3]">Cập nhật cộng đồng</p><h2 className="mt-1 text-[23px] font-bold tracking-[-0.03em] text-[#1c1e2e]">Tất cả bài viết</h2></div><span className="text-[12px] text-[#9b9caf]">{posts.length} bài viết</span></div>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{posts.map((post) => <PostCard key={post.id} post={post} onClick={() => openDetail(post.id)} onEdit={post.authorId === user.id ? () => void openEdit(post.id) : undefined} onDelete={post.authorId === user.id ? () => setPostToDelete(post) : undefined} />)}</div>
              </section>
            </div>
          ) : (
            <p className="mt-8 rounded-2xl border border-[#eaeae7] bg-white p-10 text-center text-sm text-[#9b9caf]">Chưa có bài viết thuộc chủ đề này.</p>
          )}
        </div>

        {detail && (
          <CreatePostModal
            open={editOpen}
            onClose={() => { setEditOpen(false); if (postId) router.replace(`/blog/${postId}`); }}
            authFetch={authFetch}
            post={detail}
            onPostUnavailable={handleModeratorRemoved}
            onCreated={(savedPost) => {
              setEditOpen(false);
              setDetail(savedPost);
              setPosts((currentPosts) => currentPosts.map((post) => (
                post.id === savedPost.id ? summaryFromDetail(savedPost) : post
              )));
              if (postId) router.replace(`/blog/${postId}`);
              showSuccess("Đã cập nhật bài viết thành công.");
              void loadPosts(activeSubjectFilter);
            }}
          />
        )}
        {successMessage && <BlogSuccessToast message={successMessage} onClose={() => setSuccessMessage("")} />}
        {commentToHide && <BlogConfirmationDialog title="Ẩn bình luận này?" description="Bình luận sẽ không còn hiển thị với người xem bài viết. Bạn vẫn có thể xem lại dữ liệu này trong hệ thống." confirmLabel="Ẩn bình luận" onCancel={() => setCommentToHide(null)} onConfirm={hideComment} />}
        {commentToDelete && <BlogConfirmationDialog title="Xóa bình luận này?" description="Bình luận sẽ bị xóa vĩnh viễn khỏi cuộc thảo luận. Nếu bình luận có phản hồi, các phản hồi trực tiếp cũng sẽ bị xóa theo." confirmLabel="Xóa bình luận" onCancel={() => setCommentToDelete(null)} onConfirm={() => void deleteComment(commentToDelete.id)} />}
        {editCommentConfirmOpen && <BlogConfirmationDialog title="Lưu thay đổi bình luận?" description="Nội dung bình luận sẽ được cập nhật và hiển thị lại trong cuộc thảo luận." confirmLabel="Lưu thay đổi" onCancel={() => setEditCommentConfirmOpen(false)} onConfirm={() => void updateComment()} />}
        {postToDelete && <BlogConfirmationDialog title="Xóa bài viết này?" description="Bài viết sẽ bị gỡ khỏi Blog và không còn hiển thị với người đọc." confirmLabel="Xóa bài viết" onCancel={() => setPostToDelete(null)} onConfirm={() => void deletePost(postToDelete.id)} />}
      </main>
    </div>
  );
}
