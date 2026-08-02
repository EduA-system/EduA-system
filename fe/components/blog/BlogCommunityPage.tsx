"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
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

function BackIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="size-full">
      <path d="M19 12H5" strokeLinecap="round" />
      <path d="m12 19-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="size-full">
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <path d="m8.6 10.7 6.8-4.4M8.6 13.3l6.8 4.4" />
    </svg>
  );
}

function BookmarkIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="size-full">
      <path d="M6 4.8A2.8 2.8 0 0 1 8.8 2h6.4A2.8 2.8 0 0 1 18 4.8V21l-6-3.6L6 21V4.8Z" strokeLinejoin="round" />
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
        <img src={post.thumbnailUrl ?? "/blog-detail-cover.png"} alt="" className="size-full object-cover transition duration-300 group-hover:scale-105" />
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

export function BlogCommunityPage() {
  const { user, status, authFetch } = useAuth();
  const [posts, setPosts] = useState<Summary[]>([]);
  const [isPostsLoading, setIsPostsLoading] = useState(true);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [msg, setMsg] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [activeSubjectFilter, setActiveSubjectFilter] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const [copiedDetailLink, setCopiedDetailLink] = useState(false);
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
    let cancelled = false;
    api<{ items: Summary[] }>(authFetch, "/blog-posts?size=50")
      .then((data) => {
        if (!cancelled) setPosts(data.items);
      })
      .catch((error) => {
        if (!cancelled) setMsg(String(error));
      })
      .finally(() => {
        if (!cancelled) setIsPostsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [authFetch, status]);

  async function openDetail(id: string) {
    setIsDetailLoading(true);
    try { setDetail(await api<Detail>(authFetch, `/blog-posts/${id}`)); setMsg(""); }
    catch (e) { setMsg(String(e)); }
    finally { setIsDetailLoading(false); }
  }

  function handleFilterChange(subject: string | null) {
    setActiveSubjectFilter(subject);
    void loadPosts(subject);
  }

  async function deletePost(id: string) {
    try { await api(authFetch, `/blog-posts/${id}`, { method: "DELETE" }); setDetail(null); await loadPosts(activeSubjectFilter); }
    catch (e) { setMsg(String(e)); }
  }

  async function addComment() {
    if (!detail || !comment.trim()) return;
    try {
      await api<Comment>(authFetch, `/blog-posts/${detail.id}/comments`, { method: "POST", body: JSON.stringify({ content: comment }) });
      setComment(""); await openDetail(detail.id); await loadPosts(activeSubjectFilter);
    } catch (e) { setMsg(String(e)); }
  }

  async function deleteComment(cid: string) {
    if (!detail) return;
    try { await api(authFetch, `/blog-comments/${cid}`, { method: "DELETE" }); await openDetail(detail.id); }
    catch (e) { setMsg(String(e)); }
  }

  async function copyDetailLink() {
    if (!detail) return;
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/blog?post=${detail.id}`);
      setCopiedDetailLink(true);
      setTimeout(() => setCopiedDetailLink(false), 1500);
    } catch {
      // clipboard API không khả dụng — bỏ qua, không phải luồng chính.
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
  const detailCover = currentSummary?.thumbnailUrl ?? "/blog-detail-cover.png";
  const currentUserName = user.fullName ?? user.email;
  const featuredPost = posts[0];
  const recentPosts = posts.slice(1, 5);
  const discussionPosts = [...posts].sort((a, b) => b.commentCount - a.commentCount).slice(0, 3);

  return (
    <div className="flex min-h-screen bg-white">
      <Sidebar activeHref="/blog" />

      <main className="min-w-0 flex-1 px-6 py-8">
        <div className="mx-auto max-w-[1104px]">
          {!detail && (
            <>
              <header className="flex flex-col gap-5 border-b border-[#eaeae7] pb-5 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#7661b3]">Cộng đồng giáo viên</p>
                  <h1 className="mt-1 font-[family-name:var(--font-libertine)] text-[34px] font-bold tracking-[-0.04em] text-[#1c1e2e]">Blog EDUA</h1>
                  <p className="mt-1 text-[14px] text-[#77798c]">Chia sẻ kiến thức, ý tưởng và trải nghiệm giảng dạy.</p>
                </div>
                <Link href="/blog/create" className="flex h-10 items-center rounded-full bg-[#1c1e2e] px-5 text-[13px] font-semibold text-white transition hover:bg-[#35374b]">+ Tạo bài viết</Link>
              </header>
              <nav aria-label="Lọc bài viết theo môn" className="flex gap-5 overflow-x-auto border-b border-[#eaeae7] py-3.5 scrollbar-none">
                <button type="button" onClick={() => handleFilterChange(null)} className={`shrink-0 text-[13px] font-semibold transition ${activeSubjectFilter === null ? "border-b-2 border-[#1c1e2e] pb-1 text-[#1c1e2e]" : "text-[#8b8c9d] hover:text-[#1c1e2e]"}`}>Tất cả</button>
                {["MATH", "CHEMISTRY", "PHYSICS"].map((subject) => <button key={subject} type="button" onClick={() => handleFilterChange(activeSubjectFilter === subject ? null : subject)} className={`shrink-0 text-[13px] font-semibold transition ${activeSubjectFilter === subject ? "border-b-2 border-[#1c1e2e] pb-1 text-[#1c1e2e]" : "text-[#8b8c9d] hover:text-[#1c1e2e]"}`}>{subject === "MATH" ? "Toán học" : subject === "CHEMISTRY" ? "Hóa học" : "Vật lý"}</button>)}
              </nav>
            </>
          )}

          {msg && <p className="mb-4 rounded-2xl bg-white px-4 py-2.5 text-sm text-[#4a4b5e]">{msg}</p>}

          {detail ? (
            <div className="w-full">
              <button
                type="button"
                onClick={() => setDetail(null)}
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
                    <Avatar name={detail.authorName} seed={detail.authorId} size={40} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14px] font-semibold leading-[21px] text-[#1c1e2e]">{detail.authorName}</p>
                      <p className="truncate text-[12px] leading-[18px] text-[#9b9caf]">Giáo viên EDUA</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={copyDetailLink}
                        className="flex h-8 items-center gap-1.5 rounded-[14px] border-[0.8px] border-[#eaeae7] px-3 text-[12px] font-medium text-[#4a4b5e] transition-colors hover:bg-[#f7f7f5]"
                      >
                        <span className="size-3"><ShareIcon /></span>
                        {copiedDetailLink ? "Đã sao chép" : "Chia sẻ"}
                      </button>
                      <button
                        type="button"
                        title="Lưu bài viết"
                        className="flex size-8 items-center justify-center rounded-[14px] border-[0.8px] border-[#eaeae7] text-[#4a4b5e] transition-colors hover:bg-[#f7f7f5]"
                      >
                        <span className="size-[13px]"><BookmarkIcon /></span>
                      </button>
                      {detail.authorId === user.id && (
                        <button
                          type="button"
                          onClick={() => setEditOpen(true)}
                          className="h-8 rounded-[14px] border-[0.8px] border-[#eaeae7] px-3 text-[12px] font-medium text-[#4a4b5e] transition-colors hover:bg-[#f7f7f5]"
                        >
                          Sửa bài
                        </button>
                      )}
                      {detail.authorId === user.id && (
                        <button
                          type="button"
                          onClick={() => deletePost(detail.id)}
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
                      {detail.comments.length} bình luận
                    </div>
                  </div>

                  <section className="pt-5">
                    <h3 className="text-[14px] font-semibold text-[#1c1e2e]">Bình luận</h3>

                    <div className="flex items-start gap-3 pt-4">
                      <Avatar name={currentUserName} seed={user.id} size={32} />
                      <div className="relative min-w-0 flex-1">
                        <input
                          value={comment}
                          onChange={(e) => setComment(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") addComment();
                          }}
                          placeholder="Viết bình luận..."
                          className="h-10 w-full rounded-[14px] border-[0.8px] border-[#eaeae7] bg-[#f7f7f5] py-2 pl-4 pr-11 text-[13px] text-[#4a4b5e] outline-none transition-colors placeholder:text-[#c0c1d0] focus:border-[#d8d8d5]"
                        />
                        <button
                          type="button"
                          onClick={addComment}
                          title="Gửi bình luận"
                          className="absolute right-2 top-2 flex size-6 items-center justify-center rounded-[10px] text-[#b0b1c2] transition-colors hover:bg-white hover:text-[#4a4b5e]"
                        >
                          <span className="size-3"><SendIcon /></span>
                        </button>
                      </div>
                    </div>

                    <ul className="space-y-4 pt-5">
                      {detail.comments.map((c) => (
                        <li key={c.id} className="flex items-start gap-3">
                          <Avatar name={c.authorName} seed={c.authorId} size={32} />
                          <div className="min-w-0 flex-1">
                            <div className="rounded-[14px] bg-[#f7f7f5] px-4 py-3">
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
                            </div>
                            <div className="flex items-center gap-3 px-1 pt-1.5 text-[11px] font-semibold text-[#9b9caf]">
                              <button type="button" className="hover:text-[#4a4b5e]">Thích</button>
                              <button type="button" className="hover:text-[#4a4b5e]">Trả lời</button>
                              {c.authorId === user.id && (
                                <button type="button" onClick={() => deleteComment(c.id)} className="text-red-500 hover:text-red-600">
                                  Xóa
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
          ) : isPostsLoading || isDetailLoading ? (
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
                <div className="grid gap-5 md:grid-cols-3">{discussionPosts.map((post) => <PostCard key={post.id} post={post} onClick={() => openDetail(post.id)} />)}</div>
              </section>

              <section className="mt-10 border-t border-[#eaeae7] pt-7">
                <div className="mb-5 flex items-center justify-between"><div><p className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#7661b3]">Cập nhật cộng đồng</p><h2 className="mt-1 text-[23px] font-bold tracking-[-0.03em] text-[#1c1e2e]">Tất cả bài viết</h2></div><span className="text-[12px] text-[#9b9caf]">{posts.length} bài viết</span></div>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{posts.map((post) => <PostCard key={post.id} post={post} onClick={() => openDetail(post.id)} />)}</div>
              </section>
            </div>
          ) : (
            <p className="mt-8 rounded-2xl border border-[#eaeae7] bg-white p-10 text-center text-sm text-[#9b9caf]">Chưa có bài viết thuộc chủ đề này.</p>
          )}
        </div>

        {detail && (
          <CreatePostModal
            open={editOpen}
            onClose={() => setEditOpen(false)}
            authFetch={authFetch}
            post={detail}
            onCreated={() => {
              setEditOpen(false);
              void openDetail(detail.id);
              void loadPosts(activeSubjectFilter);
            }}
          />
        )}
      </main>
    </div>
  );
}
