"use client";

import Link from "next/link";
import {
  Atom,
  BookOpen,
  CheckCircle2,
  FileText,
  Flag,
  Loader2,
  MessageCircle,
  Presentation,
  Search,
  Send,
  Trash2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { useAuth } from "@/lib/auth/AuthContext";
import { subjectBadgeClasses, subjectLabel } from "@/lib/blog";
import type { LibraryType } from "@/lib/library";
import {
  createHubComment,
  customizeHubContent,
  deleteHubComment,
  getHubContent,
  listHubContents,
  reportHubContent,
  type HubComment,
  type HubContentDetail,
  type HubContentSummary,
} from "@/lib/hub";

const tabs: [string, LibraryType | ""][] = [
  ["Tất cả", ""],
  ["Bài giảng", "LESSON_PLAN"],
  ["Slide", "SLIDE_DECK"],
  ["Bài kiểm tra", "TEST"],
  ["Mô phỏng", "SIMULATION"],
];

const contentMeta: Record<LibraryType, { label: string; icon: typeof BookOpen; color: string; iconColor: string }> = {
  LESSON_PLAN: { label: "Bài giảng", icon: BookOpen, color: "from-amber-100 via-orange-50 to-stone-100", iconColor: "text-amber-800" },
  SLIDE_DECK: { label: "Slide", icon: Presentation, color: "from-rose-100 via-orange-50 to-amber-50", iconColor: "text-rose-800" },
  TEST: { label: "Bài kiểm tra", icon: FileText, color: "from-sky-100 via-cyan-50 to-stone-100", iconColor: "text-sky-800" },
  SIMULATION: { label: "Mô phỏng", icon: Atom, color: "from-violet-100 via-fuchsia-50 to-stone-100", iconColor: "text-violet-800" },
};

type Toast = { kind: "success" | "error"; message: string } | null;

function CommunityHubScreen() {
  const { user, authFetch } = useAuth();
  const [type, setType] = useState<LibraryType | "">("");
  const [subject, setSubject] = useState("");
  const [q, setQ] = useState("");
  const [items, setItems] = useState<HubContentSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<HubContentDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [actionError, setActionError] = useState("");
  const [savingCopy, setSavingCopy] = useState(false);
  const [savingComment, setSavingComment] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<HubComment | null>(null);
  const [deletingComment, setDeletingComment] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reporting, setReporting] = useState(false);
  const [toast, setToast] = useState<Toast>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ size: "30" });
      if (type) params.set("type", type);
      if (subject) params.set("subject", subject);
      if (q) params.set("q", q);
      const data = await listHubContents(authFetch, params);
      setItems(data.items);
      setTotal(data.total);
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không thể tải Community Hub.");
    } finally {
      setLoading(false);
    }
  }, [authFetch, q, subject, type]);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 200);
    return () => clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  const openDetail = async (id: string) => {
    setDetailLoading(true);
    setActionError("");
    try {
      setSelected(await getHubContent(authFetch, id));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không thể tải chi tiết nội dung.");
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => {
    setSelected(null);
    setActionError("");
    setCommentText("");
  };

  const reloadSelected = async () => {
    if (selected) await openDetail(selected.id);
  };

  const requireLogin = () => setActionError("Vui lòng đăng nhập để thực hiện thao tác này.");

  const handleCustomize = async () => {
    if (!selected) return;
    if (!user) return requireLogin();
    setSavingCopy(true);
    try {
      await customizeHubContent(authFetch, selected.id);
      setToast({ kind: "success", message: "Đã sao chép nội dung vào Thư viện của bạn." });
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : "Không thể tùy biến nội dung.");
    } finally {
      setSavingCopy(false);
    }
  };

  const handleComment = async () => {
    if (!selected || !commentText.trim()) return;
    if (!user) return requireLogin();
    setSavingComment(true);
    try {
      await createHubComment(authFetch, selected.id, commentText.trim());
      setCommentText("");
      await reloadSelected();
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : "Không thể gửi bình luận.");
    } finally {
      setSavingComment(false);
    }
  };

  const handleDeleteComment = async () => {
    if (!deleteTarget) return;
    setDeletingComment(true);
    try {
      await deleteHubComment(authFetch, deleteTarget.id);
      setDeleteTarget(null);
      await reloadSelected();
      setToast({ kind: "success", message: "Đã xóa bình luận." });
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : "Không thể xóa bình luận.");
      setDeleteTarget(null);
    } finally {
      setDeletingComment(false);
    }
  };

  const handleReport = async () => {
    if (!selected || !reportReason.trim()) return;
    setReporting(true);
    try {
      await reportHubContent(authFetch, selected.id, reportReason.trim());
      setReportOpen(false);
      setReportReason("");
      setToast({ kind: "success", message: "Đã gửi báo cáo. Cảm ơn bạn đã góp phần bảo vệ cộng đồng." });
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : "Không thể gửi báo cáo.");
    } finally {
      setReporting(false);
    }
  };

  const canDeleteComment = (comment: HubComment) => !!user && (comment.authorId === user.id || selected?.ownerId === user.id);

  return (
    <main className="min-h-screen bg-white text-[#2b2926]">
      <div className="flex min-h-screen">
        <Sidebar activeHref="/community-hub" />
        <section className="min-w-0 flex-1 p-5 pt-16 sm:p-8 sm:pt-8">
          <header className="flex flex-wrap items-start justify-between gap-5">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#e8724a]">Community</p>
              <h1 className="mt-1 text-3xl font-bold tracking-[-0.04em] text-[#30343d]">Community Hub</h1>
              <p className="mt-2 text-sm text-stone-500">{total} nội dung đã được duyệt · chia sẻ bởi cộng đồng giáo viên</p>
            </div>
            {!user && <Link className="inline-flex items-center rounded-xl bg-[#292d3b] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#141825]" href="/login">Đăng nhập để tương tác</Link>}
          </header>

          <div className="mt-8 flex gap-1 overflow-x-auto border-b border-stone-200" role="tablist" aria-label="Loại nội dung">
            {tabs.map(([label, value]) => <button key={value || "all"} type="button" role="tab" aria-selected={type === value} onClick={() => setType(value)} className={`shrink-0 border-b-2 px-3 py-3 text-sm transition ${type === value ? "border-[#e8724a] font-bold text-[#30343d]" : "border-transparent text-stone-500 hover:text-stone-900"}`}>{label}</button>)}
          </div>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <label className="relative min-w-0 flex-1"><Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-stone-400" /><span className="sr-only">Tìm theo tiêu đề</span><input value={q} onChange={(event) => setQ(event.target.value)} placeholder="Tìm theo tiêu đề..." className="w-full rounded-xl border border-stone-300 bg-white py-2.5 pl-9 pr-3 text-sm outline-none transition placeholder:text-stone-400 focus:border-[#e8724a] focus:ring-2 focus:ring-[#fbe1d5]" /></label>
            <label className="sr-only" htmlFor="hub-subject">Lọc theo môn học</label><select id="hub-subject" value={subject} onChange={(event) => setSubject(event.target.value)} className="rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-[#e8724a] focus:ring-2 focus:ring-[#fbe1d5]"><option value="">Tất cả môn</option><option value="MATH">Toán</option><option value="CHEMISTRY">Hóa học</option><option value="PHYSICS">Vật lý</option></select>
          </div>

          {error && <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"><span>{error}</span><button type="button" onClick={() => void load()} className="rounded-lg bg-white px-3 py-1.5 font-semibold shadow-sm hover:bg-rose-100">Thử lại</button></div>}

          {loading ? <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{[1, 2, 3].map((item) => <div key={item} className="h-80 animate-pulse rounded-[26px] bg-stone-100" />)}</div> : items.length === 0 ? <div className="mt-8 rounded-[26px] border-2 border-dashed border-stone-200 bg-stone-50 p-12 text-center"><div className="mx-auto flex size-12 items-center justify-center rounded-full bg-stone-200 text-stone-500"><Search aria-hidden className="size-5" /></div><h2 className="mt-4 font-bold text-[#30343d]">{q || subject || type ? "Không tìm thấy nội dung phù hợp" : "Chưa có nội dung nào trên Hub"}</h2><p className="mt-1 text-sm text-stone-500">{q || subject || type ? "Hãy thử thay đổi từ khóa hoặc bộ lọc." : "Nội dung được duyệt từ cộng đồng sẽ xuất hiện tại đây."}</p></div> : <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{items.map((item) => {
            const meta = contentMeta[item.type];
            const Icon = meta.icon;
            return <article key={item.id} className="group min-w-0 rounded-[26px] bg-white shadow-[0_8px_24px_rgba(43,41,38,0.10)] transition duration-200 hover:-translate-y-1 hover:shadow-[0_14px_30px_rgba(43,41,38,0.16)]"><div className="flex h-full flex-col rounded-[26px] bg-[#f8fbfc] p-3"><div className="flex items-center gap-2 px-1 pb-3"><div className={`flex size-9 shrink-0 items-center justify-center rounded-full bg-white shadow-sm ${meta.iconColor}`}><Icon aria-hidden className="size-5" /></div><p className="min-w-0 flex-1 truncate text-sm font-bold text-[#363a43]">{meta.label}</p><div className="flex items-center gap-1 text-xs text-stone-500"><MessageCircle aria-hidden className="size-3.5" />{item.commentCount}</div></div><button type="button" onClick={() => void openDetail(item.id)} aria-label={`Mở ${item.title}`} className={`relative block aspect-[16/10] overflow-hidden rounded-2xl bg-gradient-to-br ${meta.color} text-left`}>
              {item.thumbnailUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- hub thumbnails may originate from user-configured object storage
                <img src={item.thumbnailUrl} alt="" className="size-full object-cover transition duration-300 group-hover:scale-[1.04]" />
              ) : <div className={`flex size-full flex-col items-center justify-center gap-3 ${meta.iconColor}`}><span className="flex size-16 items-center justify-center rounded-[22px] bg-white/65 shadow-sm"><Icon aria-hidden className="size-8" /></span><span className="text-[11px] font-bold uppercase tracking-[0.18em]">{meta.label}</span></div>}
              {item.subject && <span className={`absolute left-3 top-3 rounded-full px-2.5 py-1 text-[11px] font-semibold shadow-sm ${subjectBadgeClasses(item.subject)}`}>{subjectLabel(item.subject)}</span>}
            </button><div className="px-2 pb-2 pt-3"><button type="button" onClick={() => void openDetail(item.id)} className="line-clamp-2 text-left text-base font-bold leading-5 text-[#30343d] transition hover:text-sky-700 hover:underline">{item.title}</button></div><div className="mt-auto flex items-center gap-2 rounded-2xl bg-white p-2 shadow-[0_2px_8px_rgba(43,41,38,0.08)]"><div className="min-w-0 flex-1 px-2"><p className="text-[10px] font-semibold uppercase tracking-wide text-stone-400">Chia sẻ bởi</p><p className="truncate text-xs font-medium text-stone-600">{item.ownerName ?? "Ẩn danh"}</p></div><button type="button" onClick={() => void openDetail(item.id)} className="inline-flex items-center gap-1 rounded-xl bg-[#292d3b] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#141825]">Xem <span aria-hidden>→</span></button></div></div></article>;
          })}</div>}
        </section>
      </div>

      {(selected || detailLoading) && <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-labelledby="hub-detail-title" onMouseDown={closeDetail}><div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[26px] bg-white p-5 shadow-xl sm:p-6" onMouseDown={(event) => event.stopPropagation()}>{detailLoading || !selected ? <div className="flex min-h-40 items-center justify-center gap-2 text-sm text-stone-500"><Loader2 aria-hidden className="size-4 animate-spin" />Đang tải nội dung...</div> : <>
        <div className="flex items-start justify-between gap-4"><div className="min-w-0"><div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-[#e8724a]"><span>{contentMeta[selected.type].label}</span>{selected.subject && <span className={`rounded-full px-2 py-1 text-[10px] tracking-normal ${subjectBadgeClasses(selected.subject)}`}>{subjectLabel(selected.subject)}</span>}</div><h2 id="hub-detail-title" className="mt-2 text-xl font-bold tracking-[-0.03em] text-[#30343d]">{selected.title}</h2><p className="mt-1 text-sm text-stone-500">Chia sẻ bởi {selected.ownerName ?? "Ẩn danh"}</p></div><button type="button" onClick={closeDetail} aria-label="Đóng chi tiết nội dung" className="flex size-9 shrink-0 items-center justify-center rounded-xl text-stone-500 transition hover:bg-stone-100 hover:text-stone-900"><X aria-hidden className="size-5" /></button></div>
        {actionError && <p className="mt-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-800">{actionError}</p>}
        <div className="mt-5 flex flex-wrap gap-2"><button type="button" disabled={savingCopy} onClick={() => void handleCustomize()} className="inline-flex items-center gap-2 rounded-xl bg-[#e8724a] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#cf603d] disabled:cursor-not-allowed disabled:opacity-60">{savingCopy && <Loader2 aria-hidden className="size-4 animate-spin" />}{savingCopy ? "Đang sao chép..." : "Lưu vào thư viện"}</button><button type="button" onClick={() => { if (!user) return requireLogin(); setReportOpen(true); }} className="inline-flex items-center gap-2 rounded-xl border border-rose-200 px-4 py-2.5 text-sm font-semibold text-rose-700 transition hover:bg-rose-50"><Flag aria-hidden className="size-4" />Báo cáo</button></div>
        <div className="mt-7 border-t border-stone-200 pt-5"><div className="flex items-center gap-2"><MessageCircle aria-hidden className="size-4 text-[#e8724a]" /><h3 className="font-bold text-[#30343d]">Bình luận ({selected.comments.length})</h3></div><div className="mt-4 space-y-3">{selected.comments.length === 0 ? <p className="rounded-xl bg-stone-50 p-4 text-sm text-stone-500">Chưa có bình luận nào. Hãy là người đầu tiên chia sẻ ý kiến.</p> : selected.comments.map((comment) => <div key={comment.id} className="rounded-2xl bg-stone-50 p-4 text-sm"><div className="flex items-center justify-between gap-3"><span className="font-bold text-[#30343d]">{comment.authorName ?? "Ẩn danh"}</span>{canDeleteComment(comment) && <button type="button" onClick={() => setDeleteTarget(comment)} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-100"><Trash2 aria-hidden className="size-3.5" />Xóa</button>}</div><p className="mt-1.5 leading-6 text-stone-700">{comment.content}</p></div>)}</div><div className="mt-4 flex flex-col gap-2 sm:flex-row"><label className="sr-only" htmlFor="hub-comment">Viết bình luận</label><input id="hub-comment" value={commentText} onChange={(event) => setCommentText(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void handleComment(); }} placeholder={user ? "Viết bình luận..." : "Đăng nhập để bình luận"} className="min-w-0 flex-1 rounded-xl border border-stone-300 px-3 py-2.5 text-sm outline-none focus:border-[#e8724a] focus:ring-2 focus:ring-[#fbe1d5]" /><button type="button" disabled={savingComment || !commentText.trim()} onClick={() => void handleComment()} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#292d3b] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#141825] disabled:cursor-not-allowed disabled:opacity-60">{savingComment ? <Loader2 aria-hidden className="size-4 animate-spin" /> : <Send aria-hidden className="size-4" />}Gửi</button></div></div>
      </>}</div></div>}

      {deleteTarget && <div className="fixed inset-0 z-[60] grid place-items-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-labelledby="delete-comment-title"><div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl"><div className="flex items-start gap-3"><div className="rounded-full bg-rose-100 p-2 text-rose-700"><Trash2 aria-hidden className="size-5" /></div><div><h2 id="delete-comment-title" className="font-bold">Xóa bình luận?</h2><p className="mt-1 text-sm leading-5 text-stone-600">Bình luận này sẽ bị xóa vĩnh viễn.</p></div></div><div className="mt-5 flex justify-end gap-2"><button type="button" disabled={deletingComment} onClick={() => setDeleteTarget(null)} className="rounded-xl px-4 py-2 text-sm font-medium hover:bg-stone-100">Hủy</button><button type="button" disabled={deletingComment} onClick={() => void handleDeleteComment()} className="inline-flex items-center gap-2 rounded-xl bg-rose-700 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-800 disabled:opacity-60">{deletingComment && <Loader2 aria-hidden className="size-4 animate-spin" />}Xóa bình luận</button></div></div></div>}

      {reportOpen && <div className="fixed inset-0 z-[60] grid place-items-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-labelledby="report-content-title"><div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl"><div className="flex items-start justify-between gap-4"><div><h2 id="report-content-title" className="font-bold">Báo cáo nội dung</h2><p className="mt-1 text-sm leading-5 text-stone-600">Hãy cho chúng tôi biết lý do để người kiểm duyệt xem xét.</p></div><button type="button" onClick={() => setReportOpen(false)} aria-label="Đóng báo cáo" className="rounded-lg p-1 text-stone-500 hover:bg-stone-100"><X aria-hidden className="size-5" /></button></div><label className="mt-4 block text-sm font-semibold text-stone-700" htmlFor="report-reason">Lý do báo cáo</label><textarea id="report-reason" autoFocus value={reportReason} onChange={(event) => setReportReason(event.target.value)} rows={4} placeholder="Mô tả ngắn gọn vấn đề bạn gặp phải..." className="mt-2 w-full resize-y rounded-xl border border-stone-300 px-3 py-2.5 text-sm outline-none focus:border-[#e8724a] focus:ring-2 focus:ring-[#fbe1d5]" /><div className="mt-5 flex justify-end gap-2"><button type="button" disabled={reporting} onClick={() => setReportOpen(false)} className="rounded-xl px-4 py-2 text-sm font-medium hover:bg-stone-100">Hủy</button><button type="button" disabled={reporting || !reportReason.trim()} onClick={() => void handleReport()} className="inline-flex items-center gap-2 rounded-xl bg-rose-700 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-800 disabled:opacity-60">{reporting && <Loader2 aria-hidden className="size-4 animate-spin" />}Gửi báo cáo</button></div></div></div>}

      {toast && <div role="status" className={`fixed bottom-5 right-5 z-[70] flex max-w-sm items-start gap-3 rounded-2xl p-4 text-sm shadow-xl ${toast.kind === "success" ? "bg-[#292d3b] text-white" : "bg-rose-700 text-white"}`}><CheckCircle2 aria-hidden className="mt-0.5 size-4 shrink-0" /><p>{toast.message}</p><button type="button" aria-label="Đóng thông báo" onClick={() => setToast(null)} className="-mr-1 -mt-1 rounded p-1 hover:bg-white/15"><X aria-hidden className="size-4" /></button></div>}
    </main>
  );
}

export default function CommunityHubPage() {
  return <CommunityHubScreen />;
}
