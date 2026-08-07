"use client";

import Link from "next/link";
import {
  Atom,
  BookOpen,
  CheckCircle2,
  FileText,
  MoreHorizontal,
  Pencil,
  Presentation,
  Send,
  Trash2,
  Undo2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { RouteGuard } from "@/lib/auth/RouteGuard";
import { useAuth } from "@/lib/auth/AuthContext";
import {
  deleteLibraryContent,
  getLibraryContent,
  listLibrary,
  submitLibraryContent,
  unsubmitLibraryContent,
  updateLibraryContent,
  type LibraryContent,
  type LibraryType,
} from "@/lib/library";
import { createLessonThumbnail, createSlideThumbnail } from "@/lib/library-thumbnail";
import { parseSlideDeck } from "@/lib/slide-deck-library";

const tabs: [string, LibraryType][] = [
  ["Bài giảng", "LESSON_PLAN"],
  ["Slide", "SLIDE_DECK"],
  ["Bài kiểm tra", "TEST"],
  ["Mô phỏng", "SIMULATION"],
];

const paths: Record<LibraryType, string> = {
  LESSON_PLAN: "/lesson-edit",
  SLIDE_DECK: "/slide-maker",
  TEST: "/library",
  SIMULATION: "/molecules",
};

const createPaths: Partial<Record<LibraryType, string>> = {
  LESSON_PLAN: "/lesson-create",
  SLIDE_DECK: "/slide-create",
  SIMULATION: "/molecules",
};

const contentMeta: Record<LibraryType, { label: string; icon: typeof BookOpen; color: string }> = {
  LESSON_PLAN: { label: "Bài giảng", icon: BookOpen, color: "from-amber-100 via-orange-50 to-stone-100" },
  SLIDE_DECK: { label: "Slide deck", icon: Presentation, color: "from-rose-100 via-orange-50 to-amber-50" },
  TEST: { label: "Bài kiểm tra", icon: FileText, color: "from-sky-100 via-cyan-50 to-stone-100" },
  SIMULATION: { label: "Mô phỏng", icon: Atom, color: "from-violet-100 via-fuchsia-50 to-stone-100" },
};

type PendingAction = { content: LibraryContent; kind: "submit" | "unsubmit" | "delete" };

function statusMeta(content: LibraryContent) {
  if (content.status === "SUBMITTED") return { label: "Đang chờ duyệt", className: "bg-amber-100 text-amber-800" };
  if (content.status === "APPROVED") return { label: "Đã lên Hub", className: "bg-emerald-100 text-emerald-800" };
  if (content.status === "REJECTED") return { label: "Cần chỉnh sửa", className: "bg-rose-100 text-rose-800" };
  return { label: "Riêng tư", className: "bg-stone-100 text-stone-700" };
}

function formatUpdatedAt(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Vừa cập nhật";
  return `Cập nhật ${new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }).format(date)}`;
}

function subjectLabel(subject: LibraryContent["subject"]) {
  if (subject === "MATH") return "Toán";
  if (subject === "CHEMISTRY") return "Hóa học";
  if (subject === "PHYSICS") return "Vật lý";
  return "Chưa chọn môn";
}

function LibraryScreen() {
  const { authFetch } = useAuth();
  const [type, setType] = useState<LibraryType>("LESSON_PLAN");
  const [items, setItems] = useState<LibraryContent[]>([]);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState("");
  const [subject, setSubject] = useState("");
  const [sort, setSort] = useState("updatedAt");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [rename, setRename] = useState<LibraryContent | null>(null);
  const [name, setName] = useState("");
  const [menuId, setMenuId] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [saving, setSaving] = useState(false);
  const thumbnailBackfillIds = useRef(new Set<string>());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ type, sort, size: "50" });
      if (q) params.set("q", q);
      if (subject) params.set("subject", subject);
      const data = await listLibrary(authFetch, params);
      setItems(data.items);
      setTotal(data.total);
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không thể tải thư viện.");
    } finally {
      setLoading(false);
    }
  }, [authFetch, q, sort, subject, type]);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 200);
    return () => clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    const missingThumbnails = items.filter((content) =>
      !content.thumbnailUrl
      && (content.type === "LESSON_PLAN" || content.type === "SLIDE_DECK")
      && !thumbnailBackfillIds.current.has(content.id),
    );
    missingThumbnails.forEach((summary) => {
      thumbnailBackfillIds.current.add(summary.id);
      void getLibraryContent(authFetch, summary.id)
        .then(async (detail) => {
          const thumbnailUrl = detail.type === "LESSON_PLAN"
            ? createLessonThumbnail(detail.title, detail.subject, (detail.payload as { document?: unknown } | undefined)?.document)
            : createSlideThumbnail(parseSlideDeck(detail.payload) ?? []);
          if (!thumbnailUrl) return;
          await updateLibraryContent(authFetch, detail.id, { thumbnailUrl });
          setItems((current) => current.map((content) => content.id === detail.id ? { ...content, thumbnailUrl } : content));
        })
        .catch(() => undefined);
    });
  }, [authFetch, items]);

  const open = (content: LibraryContent) => `${paths[content.type]}?libraryId=${content.id}`;
  const openRename = (content: LibraryContent) => {
    setMenuId(null);
    setName(content.title);
    setRename(content);
  };
  const requestAction = (content: LibraryContent, kind: PendingAction["kind"]) => {
    setMenuId(null);
    setPendingAction({ content, kind });
  };
  const performAction = async () => {
    if (!pendingAction) return;
    setSaving(true);
    try {
      const { content, kind } = pendingAction;
      if (kind === "delete") await deleteLibraryContent(authFetch, content.id);
      if (kind === "submit") await submitLibraryContent(authFetch, content.id);
      if (kind === "unsubmit") await unsubmitLibraryContent(authFetch, content.id);
      setPendingAction(null);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không thể cập nhật nội dung.");
    } finally {
      setSaving(false);
    }
  };
  const saveRename = async () => {
    if (!rename || !name.trim()) return;
    setSaving(true);
    try {
      await updateLibraryContent(authFetch, rename.id, { title: name.trim() });
      setRename(null);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không thể đổi tên nội dung.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#f5f1ec] text-[#2b2926]">
      <div className="flex min-h-screen">
        <Sidebar activeHref="/library" />
        <section className="min-w-0 flex-1 p-5 sm:p-8">
          <header>
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-[#e8724a]">Content</p>
              <h1 className="mt-1 text-3xl font-semibold tracking-tight">Thư viện của tôi</h1>
              <p className="mt-2 text-sm text-[#6b6b6b]">{total} nội dung trong không gian riêng của bạn</p>
            </div>
          </header>

          <div className="mt-7 flex overflow-x-auto border-b border-stone-300" role="tablist" aria-label="Loại nội dung">
            {tabs.map(([label, value]) => (
              <button key={value} type="button" role="tab" aria-selected={type === value} onClick={() => setType(value)} className={`shrink-0 border-b-2 px-3 py-3 text-sm transition ${type === value ? "border-[#e8724a] font-semibold text-[#2b2926]" : "border-transparent text-[#6b6b6b] hover:text-[#2b2926]"}`}>{label}</button>
            ))}
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <input aria-label="Tìm theo tiêu đề" value={q} onChange={(event) => setQ(event.target.value)} placeholder="Tìm theo tiêu đề..." className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm outline-none transition placeholder:text-stone-400 focus:border-[#e8724a] sm:w-56" />
            <select aria-label="Lọc theo môn" value={subject} onChange={(event) => setSubject(event.target.value)} className="rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#e8724a]"><option value="">Tất cả môn</option><option value="MATH">Toán</option><option value="CHEMISTRY">Hóa học</option><option value="PHYSICS">Vật lý</option></select>
            <select aria-label="Sắp xếp nội dung" value={sort} onChange={(event) => setSort(event.target.value)} className="rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#e8724a]"><option value="updatedAt">Mới cập nhật</option><option value="title">Tên A–Z</option></select>
            {!loading && <p className="text-sm text-stone-500">Hiển thị {items.length} / {total} nội dung</p>}
          </div>

          {error && <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          {loading ? <div className="mt-6 grid grid-cols-3 gap-5">{[1, 2, 3].map((item) => <div key={item} className="h-80 animate-pulse rounded-2xl bg-[#e8e2db]" />)}</div>
            : items.length === 0 ? <div className="mt-8 rounded-2xl border border-dashed border-stone-300 bg-white p-12 text-center text-sm text-stone-600">{type === "TEST" ? "Tính năng tạo bài kiểm tra đang được phát triển." : q || subject ? "Không tìm thấy nội dung phù hợp. Hãy thử thay đổi bộ lọc." : "Chưa có nội dung nào trong thư viện này."}</div>
            : <div className="mt-6 grid grid-cols-3 gap-5">{createPaths[type] ? <Link href={createPaths[type]} className="group flex aspect-[4/3] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#e6b5a2] bg-[#fffaf7] p-6 text-center transition hover:border-[#e8724a] hover:bg-[#fff4ee]"><span className="flex size-12 items-center justify-center rounded-full bg-[#fbe1d5] text-3xl font-light leading-none text-[#c65838] transition group-hover:scale-110 group-hover:bg-[#e8724a] group-hover:text-white">+</span><span className="mt-4 font-semibold text-[#75402e]">Tạo {contentMeta[type].label.toLowerCase()} mới</span><span className="mt-1 text-sm text-stone-500">Bắt đầu một nội dung mới</span></Link> : <div className="flex aspect-[4/3] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-stone-200 bg-stone-50 p-6 text-center"><span className="flex size-12 items-center justify-center rounded-full bg-stone-200 text-3xl font-light leading-none text-stone-500">+</span><span className="mt-4 font-semibold text-stone-600">Tạo bài kiểm tra</span><span className="mt-1 text-sm text-stone-500">Tính năng đang được phát triển</span></div>}{items.map((content) => {
              const meta = contentMeta[content.type];
              const Icon = meta.icon;
              const status = statusMeta(content);
              return <article key={content.id} className="group relative min-w-0 rounded-[26px] border border-[#dfe7eb] bg-white shadow-[0_8px_24px_rgba(43,41,38,0.10)] transition duration-200 hover:-translate-y-1 hover:border-[#cbdde4] hover:shadow-[0_14px_30px_rgba(43,41,38,0.16)]">
                <div className="flex h-full flex-col overflow-visible rounded-[26px] bg-[#f8fbfc] p-3">
                  <div className="flex items-center gap-2 px-1 pb-3">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#dff8f3] text-[#167b70]"><Icon aria-hidden className="size-5" /></div>
                    <p className="min-w-0 flex-1 truncate text-sm font-bold text-[#363a43]">{meta.label} {subjectLabel(content.subject)}</p>
                    <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold ${status.className}`}>{status.label}</span>
                    {content.status !== "APPROVED" && <div className="group/approval relative"><button type="button" aria-label={content.status === "SUBMITTED" ? "Thu hồi khỏi hàng chờ duyệt" : "Gửi duyệt lên Hub cộng đồng"} onClick={() => requestAction(content, content.status === "SUBMITTED" ? "unsubmit" : "submit")} className="flex size-9 items-center justify-center rounded-xl border border-sky-200 bg-white text-sky-700 shadow-sm transition hover:border-sky-400 hover:bg-sky-50 hover:text-sky-900">{content.status === "SUBMITTED" ? <Undo2 className="size-4" /> : <Send className="size-4" />}</button><span role="tooltip" className="pointer-events-none absolute right-0 top-11 z-20 w-max max-w-48 rounded-lg bg-[#292d3b] px-2.5 py-1.5 text-xs font-medium text-white opacity-0 shadow-lg transition group-hover/approval:opacity-100">{content.status === "SUBMITTED" ? "Thu hồi khỏi hàng chờ duyệt" : "Gửi duyệt lên Hub cộng đồng"}</span></div>}
                  </div>
                  <Link href={open(content)} aria-label={`Mở ${content.title}`} className={`relative block aspect-[16/7] overflow-hidden rounded-2xl border border-[#d7e6eb] bg-gradient-to-br ${meta.color}`}>
                    {content.thumbnailUrl ? <img src={content.thumbnailUrl} alt="" className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.04]" /> : <div className="flex h-full flex-col items-center justify-center gap-4 text-[#275c68]"><span className="flex size-20 items-center justify-center rounded-[28px] bg-white/60 shadow-sm"><Icon aria-hidden className="size-10" /></span><span className="text-xs font-bold uppercase tracking-[0.2em]">{meta.label}</span></div>}
                  </Link>
                  <div className="px-2 pb-1 pt-2"><Link href={open(content)} className="line-clamp-1 text-base font-bold leading-5 text-[#30343d] transition hover:text-sky-700 hover:underline">{content.title}</Link>{content.status === "REJECTED" && content.rejectionReason && <p className="mt-1 line-clamp-1 text-xs text-rose-700">{content.rejectionReason}</p>}</div>
                  <div className="mt-auto flex items-center gap-2 rounded-2xl bg-white p-2 shadow-[0_2px_8px_rgba(43,41,38,0.08)]"><div className="min-w-0 flex-1 px-2"><p className="text-[10px] font-semibold uppercase tracking-wide text-stone-400">Cập nhật</p><p className="truncate text-xs font-medium text-stone-600">{formatUpdatedAt(content.updatedAt)}</p></div><Link href={open(content)} className="inline-flex items-center justify-center rounded-xl border border-[#1f2431] bg-[#292d3b] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#141825]">Mở</Link><div className="relative"><button type="button" aria-label={`Thao tác với ${content.title}`} aria-expanded={menuId === content.id} onClick={() => setMenuId(menuId === content.id ? null : content.id)} className="flex size-11 items-center justify-center rounded-xl border border-stone-200 text-stone-500 transition hover:border-stone-300 hover:bg-stone-50 hover:text-stone-900"><MoreHorizontal className="size-5" /></button>{menuId === content.id && <div className="absolute bottom-12 right-0 z-10 w-36 rounded-xl border border-stone-200 bg-white p-1 shadow-lg"><button type="button" onClick={() => openRename(content)} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-stone-100"><Pencil className="size-3.5" />Đổi tên</button><button type="button" onClick={() => requestAction(content, "delete")} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-red-700 hover:bg-red-50"><Trash2 className="size-3.5" />Xóa</button></div>}</div></div>
                </div>
              </article>;
            })}</div>}
        </section>
      </div>

      {rename && <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-labelledby="rename-title"><div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl"><div className="flex items-start justify-between gap-4"><div><h2 id="rename-title" className="font-semibold">Đổi tên nội dung</h2><p className="mt-1 text-sm text-stone-500">Tên mới sẽ hiển thị trong thư viện.</p></div><button type="button" aria-label="Đóng" onClick={() => setRename(null)} className="rounded-lg p-1 text-stone-500 hover:bg-stone-100"><X className="size-5" /></button></div><input autoFocus value={name} onChange={(event) => setName(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void saveRename(); }} className="mt-4 w-full rounded-xl border border-stone-300 px-3 py-2.5 outline-none focus:border-[#e8724a]" /><div className="mt-5 flex justify-end gap-2"><button type="button" disabled={saving} onClick={() => setRename(null)} className="rounded-xl px-4 py-2 text-sm font-medium hover:bg-stone-100">Hủy</button><button type="button" disabled={saving || !name.trim()} onClick={() => void saveRename()} className="rounded-xl bg-[#e8724a] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60">{saving ? "Đang lưu..." : "Lưu"}</button></div></div></div>}
      {pendingAction && <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-labelledby="action-title"><div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl"><div className="flex items-start gap-3"><div className={`rounded-full p-2 ${pendingAction.kind === "delete" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-800"}`}>{pendingAction.kind === "delete" ? <Trash2 className="size-5" /> : <CheckCircle2 className="size-5" />}</div><div><h2 id="action-title" className="font-semibold">{pendingAction.kind === "delete" ? "Xóa nội dung?" : pendingAction.kind === "unsubmit" ? "Thu hồi nội dung?" : "Gửi duyệt nội dung?"}</h2><p className="mt-1 text-sm leading-5 text-stone-600">{pendingAction.kind === "delete" ? `“${pendingAction.content.title}” sẽ bị xóa vĩnh viễn.` : pendingAction.kind === "unsubmit" ? `“${pendingAction.content.title}” sẽ được gỡ khỏi hàng chờ duyệt.` : `“${pendingAction.content.title}” sẽ được gửi lên Hub cộng đồng để duyệt.`}</p></div></div><div className="mt-5 flex justify-end gap-2"><button type="button" disabled={saving} onClick={() => setPendingAction(null)} className="rounded-xl px-4 py-2 text-sm font-medium hover:bg-stone-100">Hủy</button><button type="button" disabled={saving} onClick={() => void performAction()} className={`rounded-xl px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60 ${pendingAction.kind === "delete" ? "bg-red-700 hover:bg-red-800" : "bg-[#e8724a] hover:bg-[#cf603d]"}`}>{saving ? "Đang xử lý..." : pendingAction.kind === "delete" ? "Xóa nội dung" : pendingAction.kind === "unsubmit" ? "Thu hồi" : "Gửi duyệt"}</button></div></div></div>}
    </main>
  );
}

export default function Page() {
  return <RouteGuard pathname="/library"><LibraryScreen /></RouteGuard>;
}
