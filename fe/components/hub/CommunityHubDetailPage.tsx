"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, CheckCircle2, EyeOff, Loader2, MessageCircle, Pencil, Reply, Save, Send, Trash2, X } from "lucide-react";
import { Avatar } from "@/components/blog/Avatar";
import { RichView } from "@/components/blog/RichView";
import { Sidebar } from "@/components/layout/Sidebar";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useAuth } from "@/lib/auth/AuthContext";
import { hasAnyRole } from "@/lib/auth/permissions";
import { subjectBadgeClasses, subjectLabel } from "@/lib/blog";
import {
  createHubComment,
  customizeHubContent,
  deleteHubComment,
  getHubContent,
  hideHubComment,
  updateHubComment,
  type HubComment,
  type HubContentDetail,
} from "@/lib/hub";
import { LIBRARY_TYPE_LABELS } from "@/lib/library";
import { parseSlideDeck } from "@/lib/slide-deck-library";
import type { TiptapNode } from "@/lib/tiptap-to-text";

const COMMENT_MAX_WORDS = 200;

type Toast = { kind: "success" | "error"; message: string } | null;

function resolveDocument(payload: unknown): TiptapNode | string | null {
  if (!payload || typeof payload !== "object") return null;
  const record = payload as { format?: unknown; document?: unknown; documentHtml?: unknown; html?: unknown };
  if (record.format === "tiptap-json" && record.document && typeof record.document === "object") return record.document as TiptapNode;
  if (typeof record.documentHtml === "string") return record.documentHtml;
  if (typeof record.html === "string") return record.html;
  return null;
}

function countWords(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(date);
}

function HubContentBody({ detail }: { detail: HubContentDetail }) {
  const document = detail.type === "LESSON_PLAN" || detail.type === "TEST" ? resolveDocument(detail.payload) : null;
  const slides = detail.type === "SLIDE_DECK" ? parseSlideDeck(detail.payload) : null;

  if (document) {
    return (
      <div className="rounded-2xl border border-[#e1dbd2] bg-[#f0ede8] px-4 py-7 sm:px-7">
        <article className="mx-auto min-h-[1123px] w-full max-w-[794px] bg-white px-[54px] py-[64px] shadow-[0_1px_2px_rgba(43,41,38,0.08),0_14px_36px_rgba(43,41,38,0.16)]">
          <RichView html={document} variant="document" />
        </article>
      </div>
    );
  }

  if (slides) {
    return (
      <div className="rounded-2xl border border-stone-200 bg-white p-5">
        <p className="font-semibold text-[#30343d]">Bộ slide</p>
        <p className="mt-1 text-sm text-stone-500">{slides.length} slide trong nội dung chia sẻ.</p>
        {detail.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- hub thumbnails may originate from object storage
          <img src={detail.thumbnailUrl} alt="" className="mt-4 aspect-video w-full rounded-xl border border-stone-200 object-cover" />
        ) : null}
      </div>
    );
  }

  return (
    <pre className="max-h-[720px] overflow-auto rounded-2xl bg-[#111827] p-5 text-xs leading-5 text-[#e5e7eb]">
      {JSON.stringify(detail.payload ?? {}, null, 2)}
    </pre>
  );
}

export function CommunityHubDetailPage({ contentId }: { contentId: string }) {
  const { user, authFetch } = useAuth();
  const [detail, setDetail] = useState<HubContentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [comment, setComment] = useState("");
  const [savingCopy, setSavingCopy] = useState(false);
  const [savingComment, setSavingComment] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState("");
  const [editCommentText, setEditCommentText] = useState("");
  const [replyTo, setReplyTo] = useState<HubComment | null>(null);
  const [pendingEditComment, setPendingEditComment] = useState<HubComment | null>(null);
  const [moderationTarget, setModerationTarget] = useState<{ comment: HubComment; action: "delete" | "hide" } | null>(null);
  const [moderatingComment, setModeratingComment] = useState(false);
  const [toast, setToast] = useState<Toast>(null);

  const wordCount = useMemo(() => countWords(comment), [comment]);
  const editWordCount = useMemo(() => countWords(editCommentText), [editCommentText]);
  const currentUserName = user?.fullName || user?.email || "Bạn";
  const canSaveToLibrary = hasAnyRole(user, ["TEACHER", "MODERATOR"]);
  const commentsForDisplay = useMemo(() => {
    if (!detail) return [];
    const roots = detail.comments.filter((item) => !item.parentCommentId);
    return roots.flatMap((item) => [
      item,
      ...detail.comments.filter((reply) => reply.parentCommentId === item.id),
    ]);
  }, [detail]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setDetail(await getHubContent(authFetch, contentId));
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không thể mở nội dung Community Hub.");
    } finally {
      setLoading(false);
    }
  }, [authFetch, contentId]);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(timer);
  }, [toast]);

  const requireLogin = () => setToast({ kind: "error", message: "Vui lòng đăng nhập để thực hiện thao tác này." });

  async function handleCustomize() {
    if (!detail) return;
    if (!user) return requireLogin();
    setSavingCopy(true);
    try {
      await customizeHubContent(authFetch, detail.id);
      setToast({ kind: "success", message: "Đã lưu bản sao vào thư viện cá nhân." });
    } catch (cause) {
      setToast({ kind: "error", message: cause instanceof Error ? cause.message : "Không thể lưu vào thư viện." });
    } finally {
      setSavingCopy(false);
    }
  }

  async function addComment() {
    if (!detail || !comment.trim()) return;
    if (!user) return requireLogin();
    if (wordCount > COMMENT_MAX_WORDS) return;
    setSavingComment(true);
    try {
      const saved = await createHubComment(authFetch, detail.id, comment.trim(), replyTo?.id ?? null);
      setDetail((current) => current ? { ...current, comments: [...current.comments, saved] } : current);
      setComment("");
      setReplyTo(null);
    } catch (cause) {
      setToast({ kind: "error", message: cause instanceof Error ? cause.message : "Không thể gửi bình luận." });
    } finally {
      setSavingComment(false);
    }
  }

  function startEditComment(item: HubComment) {
    setEditingCommentId(item.id);
    setEditCommentText(item.content.replace(/<[^>]*>/g, ""));
    setPendingEditComment(null);
    setReplyTo(null);
  }

  function requestSaveEditComment(item: HubComment) {
    if (!editingCommentId || !editCommentText.trim() || editWordCount > COMMENT_MAX_WORDS) return;
    setPendingEditComment(item);
  }

  async function saveEditComment() {
    if (!pendingEditComment || !editingCommentId || !editCommentText.trim() || editWordCount > COMMENT_MAX_WORDS) return;
    setSavingComment(true);
    try {
      const saved = await updateHubComment(authFetch, editingCommentId, editCommentText.trim());
      setDetail((current) => current ? {
        ...current,
        comments: current.comments.map((item) => item.id === saved.id ? saved : item),
      } : current);
      setEditingCommentId("");
      setEditCommentText("");
      setPendingEditComment(null);
      setToast({ kind: "success", message: "Đã lưu chỉnh sửa bình luận." });
    } catch (cause) {
      setToast({ kind: "error", message: cause instanceof Error ? cause.message : "Không thể sửa bình luận." });
    } finally {
      setSavingComment(false);
    }
  }

  async function confirmDeleteComment() {
    if (!moderationTarget) return;
    const target = moderationTarget.comment;
    setModeratingComment(true);
    try {
      if (moderationTarget.action === "hide") {
        await hideHubComment(authFetch, target.id);
      } else {
        await deleteHubComment(authFetch, target.id);
      }
      const deletedId = target.id;
      setModerationTarget(null);
      setDetail((current) => current ? {
        ...current,
        comments: current.comments.filter((item) => item.id !== deletedId && item.parentCommentId !== deletedId),
      } : current);
      setToast({ kind: "success", message: moderationTarget.action === "hide" ? "Đã ẩn bình luận." : "Đã xóa bình luận." });
    } catch (cause) {
      setToast({ kind: "error", message: cause instanceof Error ? cause.message : "Không thể xử lý bình luận." });
    } finally {
      setModeratingComment(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f7f5f2] text-[#2b2926]">
      <div className="flex min-h-screen">
        <Sidebar activeHref="/community-hub" />
        <section className="min-w-0 flex-1 p-5 pt-16 sm:p-8 sm:pt-8">
          <div className="mx-auto max-w-[1120px]">
            <Link href="/community-hub" className="inline-flex items-center gap-2 text-sm font-semibold text-stone-500 hover:text-[#30343d]">
              <ArrowLeft className="size-4" />
              Quay lại Community Hub
            </Link>

            {loading ? (
              <div className="mt-8 flex min-h-[420px] items-center justify-center gap-2 rounded-2xl bg-white text-sm text-stone-500">
                <Loader2 className="size-4 animate-spin" />
                Đang mở nội dung...
              </div>
            ) : error || !detail ? (
              <div className="mt-8 rounded-2xl border border-rose-200 bg-rose-50 p-8 text-sm text-rose-800">{error || "Không tìm thấy nội dung."}</div>
            ) : (
              <>
                <header className="mt-6 rounded-2xl border border-[#e4ded6] bg-white p-6 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
                        <span className="rounded-lg bg-stone-100 px-2.5 py-1 text-stone-600">{LIBRARY_TYPE_LABELS[detail.type]}</span>
                        {detail.subject && <span className={`rounded-lg px-2.5 py-1 ${subjectBadgeClasses(detail.subject)}`}>{subjectLabel(detail.subject)}</span>}
                      </div>
                      <h1 className="mt-3 text-3xl font-bold tracking-[-0.04em] text-[#30343d]">{detail.title}</h1>
                      <p className="mt-2 text-sm text-stone-500">Chia sẻ bởi {detail.ownerName ?? "Ẩn danh"}{detail.reviewedAt ? ` · Duyệt lúc ${formatDateTime(detail.reviewedAt)}` : ""}</p>
                    </div>
                    {canSaveToLibrary && (
                      <button type="button" disabled={savingCopy} onClick={() => void handleCustomize()} className="inline-flex items-center gap-2 rounded-xl bg-[#e8724a] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#cf603d] disabled:cursor-not-allowed disabled:opacity-60">
                        {savingCopy ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                        Lưu vào thư viện
                      </button>
                    )}
                  </div>
                </header>

                <div className="mt-6">
                  <HubContentBody detail={detail} />
                </div>

                <section className="mt-6 rounded-2xl border border-[#e4ded6] bg-white p-6 shadow-sm">
                  <div className="flex items-center gap-2">
                    <MessageCircle className="size-4 text-[#e8724a]" />
                    <h2 className="font-bold text-[#30343d]">Bình luận ({detail.comments.length})</h2>
                  </div>

                  {user ? (
                    <div className="mt-5 flex items-start gap-3">
                      <Avatar name={currentUserName} seed={user.id} size={34} />
                      <div className="min-w-0 flex-1">
                        {replyTo && (
                          <div className="mb-2 flex items-center justify-between gap-2 rounded-xl bg-[#fff7ed] px-3 py-2 text-xs text-[#9a4a2f]">
                            <span className="min-w-0 truncate">Đang trả lời {replyTo.authorName ?? "Ẩn danh"}</span>
                            <button type="button" onClick={() => setReplyTo(null)} className="shrink-0 font-semibold hover:text-[#6f301c]">Hủy</button>
                          </div>
                        )}
                        <div className="relative">
                          <input value={comment} onChange={(event) => setComment(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void addComment(); }} placeholder={replyTo ? "Viết phản hồi..." : "Viết bình luận..."} className="h-11 w-full rounded-[14px] border border-[#eaeae7] bg-[#f7f7f5] py-2 pl-4 pr-12 text-sm text-[#4a4b5e] outline-none focus:border-[#d8d8d5]" />
                          <button type="button" disabled={savingComment || !comment.trim() || wordCount > COMMENT_MAX_WORDS} onClick={() => void addComment()} title="Gửi bình luận" className="absolute right-2 top-2 flex size-7 items-center justify-center rounded-[10px] text-[#9b9caf] transition hover:bg-white hover:text-[#4a4b5e] disabled:opacity-40">
                            {savingComment ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                          </button>
                        </div>
                        <p className={`mt-1 text-right text-xs ${wordCount > COMMENT_MAX_WORDS ? "text-rose-600" : "text-stone-400"}`}>{wordCount}/{COMMENT_MAX_WORDS} từ</p>
                      </div>
                    </div>
                  ) : (
                    <p className="mt-5 rounded-xl bg-stone-50 p-4 text-sm text-stone-500">Đăng nhập để bình luận hoặc lưu nội dung vào thư viện cá nhân.</p>
                  )}

                  <ul className="mt-5 space-y-4">
                    {detail.comments.length === 0 ? (
                      <li className="rounded-xl bg-stone-50 p-4 text-sm text-stone-500">Chưa có bình luận nào.</li>
                    ) : commentsForDisplay.map((item) => {
                      const canEdit = user?.id === item.authorId;
                      const canDelete = canEdit;
                      const canHide = !!user && user.id === detail.ownerId && user.id !== item.authorId;
                      const isReply = !!item.parentCommentId;
                      return (
                        <li key={item.id} className={`flex items-start gap-3 ${isReply ? "ml-8 sm:ml-12" : ""}`}>
                          <Avatar name={item.authorName ?? "Ẩn danh"} seed={item.authorId} size={32} />
                          <div className="min-w-0 flex-1">
                            <div className="rounded-[14px] bg-[#f7f7f5] px-4 py-3">
                              <div className="flex items-center gap-3">
                                <p className="min-w-0 flex-1 truncate text-sm font-semibold text-[#1c1e2e]">{item.authorName ?? "Ẩn danh"}</p>
                                <span className="shrink-0 text-xs text-[#c0c1d0]">{formatDateTime(item.createdAt)}</span>
                              </div>
                              {editingCommentId === item.id ? (
                                <div className="mt-2">
                                  <input value={editCommentText} onChange={(event) => setEditCommentText(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") requestSaveEditComment(item); if (event.key === "Escape") { setEditingCommentId(""); setPendingEditComment(null); } }} autoFocus className="h-10 w-full rounded-[10px] border border-[#eaeae7] bg-white px-3 text-sm outline-none focus:border-[#d8d8d5]" />
                                  <div className="mt-2 flex items-center justify-between gap-2">
                                    <span className={`text-xs ${editWordCount > COMMENT_MAX_WORDS ? "text-rose-600" : "text-stone-400"}`}>{editWordCount}/{COMMENT_MAX_WORDS} từ</span>
                                    <div className="flex gap-2">
                                      <button type="button" onClick={() => { setEditingCommentId(""); setPendingEditComment(null); }} className="rounded-lg px-3 py-1.5 text-xs font-semibold text-stone-500 hover:bg-stone-100">Hủy</button>
                                      <button type="button" disabled={!editCommentText.trim() || editWordCount > COMMENT_MAX_WORDS} onClick={() => requestSaveEditComment(item)} className="rounded-lg bg-[#1c1e2e] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">Lưu</button>
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <div
                                  className="blog-comment-content pt-1.5 text-sm leading-6 text-[#4a4b5e]"
                                  dangerouslySetInnerHTML={{ __html: item.content }}
                                />
                              )}
                            </div>
                            {(user || canEdit || canDelete || canHide) && (
                              <div className="flex items-center gap-3 px-1 pt-1.5 text-xs font-semibold text-[#9b9caf]">
                                {user && !isReply && <button type="button" onClick={() => { setReplyTo(item); setEditingCommentId(""); }} className="inline-flex items-center gap-1 hover:text-[#4a4b5e]"><Reply className="size-3" />Trả lời</button>}
                                {canEdit && <button type="button" onClick={() => startEditComment(item)} className="inline-flex items-center gap-1 hover:text-[#4a4b5e]"><Pencil className="size-3" />Sửa</button>}
                                {canHide && <button type="button" onClick={() => setModerationTarget({ comment: item, action: "hide" })} className="inline-flex items-center gap-1 text-amber-600 hover:text-amber-700"><EyeOff className="size-3" />Ẩn</button>}
                                {canDelete && <button type="button" onClick={() => setModerationTarget({ comment: item, action: "delete" })} className="inline-flex items-center gap-1 text-red-500 hover:text-red-600"><Trash2 className="size-3" />Xóa</button>}
                              </div>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              </>
            )}
          </div>
        </section>
      </div>

      <ConfirmDialog
        open={pendingEditComment !== null}
        title="Lưu chỉnh sửa bình luận?"
        description="Nội dung bình luận sẽ được cập nhật ngay sau khi xác nhận."
        confirmLabel="Lưu chỉnh sửa"
        loading={savingComment}
        onConfirm={() => void saveEditComment()}
        onClose={() => setPendingEditComment(null)}
      />
      <ConfirmDialog
        open={moderationTarget !== null}
        title={moderationTarget?.action === "hide" ? "Ẩn bình luận?" : "Xóa bình luận?"}
        description={moderationTarget?.action === "hide"
          ? "Bình luận sẽ không còn hiển thị với người xem nội dung này."
          : "Bình luận này và các phản hồi bên dưới sẽ bị xóa khỏi nội dung."}
        confirmLabel={moderationTarget?.action === "hide" ? "Ẩn bình luận" : "Xóa bình luận"}
        variant={moderationTarget?.action === "hide" ? "default" : "danger"}
        loading={moderatingComment}
        onConfirm={() => void confirmDeleteComment()}
        onClose={() => setModerationTarget(null)}
      />

      {toast && (
        <div role="status" className={`fixed bottom-5 right-5 z-[70] flex max-w-sm items-start gap-3 rounded-2xl p-4 text-sm shadow-xl ${toast.kind === "success" ? "bg-[#292d3b] text-white" : "bg-rose-700 text-white"}`}>
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
          <p>{toast.message}</p>
          <button type="button" aria-label="Đóng thông báo" onClick={() => setToast(null)} className="-mr-1 -mt-1 rounded p-1 hover:bg-white/15"><X className="size-4" /></button>
        </div>
      )}
    </main>
  );
}
