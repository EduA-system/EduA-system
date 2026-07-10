"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  api,
  GOOGLE_CLIENT_ID,
  TOKEN_KEY,
  formatRelativeTime,
  getGoogleIdentity,
  type Comment,
  type Detail,
  type Summary,
  type User,
} from "@/lib/blog";
import { Avatar } from "./Avatar";
import { SubjectBadge } from "./SubjectBadge";
import { PostCard } from "./PostCard";
import { BlogSidebar } from "./BlogSidebar";
import { CreatePostModal } from "./CreatePostModal";
import { RichView } from "./RichView";
import { Sidebar } from "@/components/layout/Sidebar";

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

export function BlogCommunityPage() {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [posts, setPosts] = useState<Summary[]>([]);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [msg, setMsg] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [activeSubjectFilter, setActiveSubjectFilter] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const [copiedDetailLink, setCopiedDetailLink] = useState(false);
  const btnRef = useRef<HTMLDivElement>(null);

  const loadPosts = useCallback(async (tk: string, subject?: string | null) => {
    try {
      const scope = subject ? `?subject=${subject}&size=50` : `?size=50`;
      setPosts((await api<{ items: Summary[] }>(`/blog-posts${scope}`, tk)).items);
    } catch (e) { setMsg(String(e)); }
  }, []);

  const applyLogin = useCallback((tk: string, u: User) => {
    setToken(tk); setUser(u); localStorage.setItem(TOKEN_KEY, tk); loadPosts(tk);
  }, [loadPosts]);

  const loginWithGoogle = useCallback(async (idToken: string) => {
    try {
      const d = await api<{ accessToken: string; user: User }>(`/auth/google`, null, {
        method: "POST", body: JSON.stringify({ idToken }),
      });
      applyLogin(d.accessToken, d.user);
    } catch (e) { setMsg(String(e)); }
  }, [applyLogin]);

  useEffect(() => {
    const tk = localStorage.getItem(TOKEN_KEY);
    if (!tk) return;
    api<User>(`/auth/me`, tk).then((u) => applyLogin(tk, u)).catch(() => localStorage.removeItem(TOKEN_KEY));
  }, [applyLogin]);

  useEffect(() => {
    if (user) return;
    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true;
    s.onload = () => {
      const google = getGoogleIdentity();
      google?.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: (r) => loginWithGoogle(r.credential),
      });
      if (btnRef.current) google?.accounts.id.renderButton(btnRef.current, { theme: "outline", size: "large" });
    };
    document.body.appendChild(s);
    return () => { document.body.removeChild(s); };
  }, [user, loginWithGoogle]);

  async function openDetail(id: string) {
    try { setDetail(await api<Detail>(`/blog-posts/${id}`, token)); setMsg(""); }
    catch (e) { setMsg(String(e)); }
  }

  function handleFilterChange(subject: string | null) {
    setActiveSubjectFilter(subject);
    if (token) loadPosts(token, subject);
  }

  async function deletePost(id: string) {
    try { await api(`/blog-posts/${id}`, token, { method: "DELETE" }); setDetail(null); if (token) loadPosts(token, activeSubjectFilter); }
    catch (e) { setMsg(String(e)); }
  }

  async function addComment() {
    if (!detail || !comment.trim()) return;
    try {
      await api<Comment>(`/blog-posts/${detail.id}/comments`, token, { method: "POST", body: JSON.stringify({ content: comment }) });
      setComment(""); openDetail(detail.id); if (token) loadPosts(token, activeSubjectFilter);
    } catch (e) { setMsg(String(e)); }
  }

  async function deleteComment(cid: string) {
    if (!detail) return;
    try { await api(`/blog-comments/${cid}`, token, { method: "DELETE" }); openDetail(detail.id); }
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
      <div className="flex min-h-screen items-center justify-center bg-[#f7f7f5] px-4">
        <div className="w-full max-w-md rounded-2xl border-[0.8px] border-[#eaeae7] bg-white p-8">
          <h1 className="mb-2 text-xl font-bold text-[#1c1e2e]">Blog EDUA</h1>
          <p className="mb-4 text-sm text-[#9b9caf]">Đăng nhập bằng Google để tiếp tục.</p>
          <div ref={btnRef} />
          {msg && <p className="mt-3 text-sm text-red-600">{msg}</p>}
        </div>
      </div>
    );
  }

  const currentSummary = detail ? posts.find((p) => p.id === detail.id) : null;
  const detailCover = currentSummary?.thumbnailUrl ?? "/blog-detail-cover.png";
  const currentUserName = user.fullName ?? user.email;

  return (
    <div className="flex min-h-screen bg-[#f7f7f5]">
      <Sidebar activeHref="/blog" />

      <main className="min-w-0 flex-1 px-6 py-8">
        <div className="mx-auto max-w-[1104px]">
          {!detail && (
            <header className="mb-6 flex items-center justify-between">
              <div>
                <h1 className="font-[family-name:var(--font-libertine)] text-[32px] font-bold text-[#1c1e2e]">Blog</h1>
                <p className="text-[15px] text-[#9b9caf]">Chia sẻ ý tưởng cùng giáo viên EDUA</p>
              </div>
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => setCreateOpen(true)}
                  className="flex h-10 items-center gap-1.5 rounded-[14px] bg-[#1c1e2e] px-5 text-sm font-semibold text-white"
                >
                  + Tạo bài viết
                </button>
              </div>
            </header>
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
          ) : (
            <div className="flex flex-col items-stretch gap-6 lg:flex-row lg:items-start">
              <div className="flex min-w-0 flex-1 flex-col gap-4">
                {posts.map((p) => (
                  <PostCard key={p.id} post={p} onClick={() => openDetail(p.id)} />
                ))}
                {posts.length === 0 && (
                  <p className="rounded-2xl border-[0.8px] border-[#eaeae7] bg-white p-6 text-center text-sm text-[#9b9caf]">
                    Chưa có bài viết.
                  </p>
                )}
              </div>
              <div className="w-full shrink-0 lg:w-[296px]">
                <BlogSidebar
                  posts={posts}
                  activeSubjectFilter={activeSubjectFilter}
                  onFilterChange={handleFilterChange}
                  onSelectPost={openDetail}
                />
              </div>
            </div>
          )}
        </div>

        {token && (
          <CreatePostModal
            open={createOpen}
            onClose={() => setCreateOpen(false)}
            token={token}
            onCreated={() => loadPosts(token, activeSubjectFilter)}
          />
        )}
      </main>
    </div>
  );
}
