"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Atom,
  BookOpen,
  CheckCircle2,
  Clock,
  FileText,
  Loader2,
  Presentation,
  RefreshCw,
  Search,
  XCircle,
} from "lucide-react";
import { RichView } from "@/components/blog/RichView";
import { SlideDeckPreview } from "@/components/hub/SlideDeckPreview";
import { Sidebar } from "@/components/layout/Sidebar";
import { useAuth } from "@/lib/auth/AuthContext";
import { RouteGuard } from "@/lib/auth/RouteGuard";
import { hasAnyRole } from "@/lib/auth/permissions";
import { approveContent, getModerationContent, listModerationQueue, rejectContent } from "@/lib/hub";
import type { LibraryContent, LibrarySubject, LibraryType } from "@/lib/library";
import { parseSlideDeck } from "@/lib/slide-deck-library";
import type { TiptapNode } from "@/lib/tiptap-to-text";

const typeLabels: Record<LibraryType, string> = {
  LESSON_PLAN: "Bài giảng",
  SLIDE_DECK: "Slide",
  TEST: "Bài kiểm tra",
  SIMULATION: "Mô phỏng",
};

const typeIcons: Record<LibraryType, typeof BookOpen> = {
  LESSON_PLAN: BookOpen,
  SLIDE_DECK: Presentation,
  TEST: FileText,
  SIMULATION: Atom,
};

const grades: [string, number | ""][] = [
  ["Tất cả khối", ""],
  ["Khối 10", 10],
  ["Khối 11", 11],
  ["Khối 12", 12],
];

const types: [string, LibraryType | ""][] = [
  ["Tất cả loại", ""],
  ["Bài giảng", "LESSON_PLAN"],
  ["Slide", "SLIDE_DECK"],
  ["Bài kiểm tra", "TEST"],
  ["Mô phỏng", "SIMULATION"],
];

type Toast = { kind: "success" | "error"; message: string } | null;

function subjectLabel(subject: LibrarySubject | null) {
  if (subject === "MATH") return "Toán";
  if (subject === "CHEMISTRY") return "Hóa học";
  if (subject === "PHYSICS") return "Vật lý";
  return "Chưa chọn môn";
}

function formatDateTime(value: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function resolveDocument(payload: unknown): TiptapNode | string | null {
  if (!payload || typeof payload !== "object") return null;
  const record = payload as { format?: unknown; document?: unknown; documentHtml?: unknown; html?: unknown };
  if (record.format === "tiptap-json" && record.document && typeof record.document === "object") return record.document as TiptapNode;
  if (typeof record.documentHtml === "string") return record.documentHtml;
  if (typeof record.html === "string") return record.html;
  return null;
}

function collectText(value: unknown): string {
  if (typeof value === "string") return value.replace(/<[^>]*>/g, " ");
  if (!value || typeof value !== "object") return "";
  const record = value as { text?: unknown; content?: unknown };
  const ownText = typeof record.text === "string" ? record.text : "";
  const childText = Array.isArray(record.content) ? record.content.map(collectText).join(" ") : "";
  return `${ownText} ${childText}`.trim();
}

function inferGradeFromPayload(payload: unknown): number | null {
  if (payload && typeof payload === "object") {
    const rawGrade = (payload as { grade?: unknown; metadata?: { grade?: unknown } }).grade ?? (payload as { metadata?: { grade?: unknown } }).metadata?.grade;
    if (rawGrade === 10 || rawGrade === 11 || rawGrade === 12) return rawGrade;
    if (rawGrade === "10" || rawGrade === "11" || rawGrade === "12") return Number(rawGrade);
  }
  const document = resolveDocument(payload);
  const text = collectText(document ?? payload);
  const match = text.match(/\b(?:lớp|lop|khối|khoi)\s*:?\s*(10|11|12)\b/i);
  return match ? Number(match[1]) : null;
}

function JsonFallback({ payload }: { payload: unknown }) {
  return (
    <pre className="max-h-[420px] overflow-auto rounded-xl bg-[#111827] p-4 text-xs leading-5 text-[#e5e7eb]">
      {JSON.stringify(payload ?? {}, null, 2)}
    </pre>
  );
}

function ContentPreview({ content }: { content: LibraryContent }) {
  const document = content.type === "LESSON_PLAN" || content.type === "TEST" ? resolveDocument(content.payload) : null;
  const slides = content.type === "SLIDE_DECK" ? parseSlideDeck(content.payload) : null;

  if (document) {
    return (
      <div className="max-h-[calc(100vh-280px)] overflow-auto rounded-xl border border-[#e1dbd2] bg-[#f0ede8] px-4 py-6 sm:px-6">
        <article className="mx-auto min-h-[1123px] w-full max-w-[794px] bg-white px-[54px] py-[64px] shadow-[0_1px_2px_rgba(43,41,38,0.08),0_14px_36px_rgba(43,41,38,0.16)]">
          <RichView html={document} variant="document" />
        </article>
      </div>
    );
  }

  if (slides) {
    return <SlideDeckPreview slides={slides} caption={`${slides.length} slide trong nội dung gửi duyệt`} />;
  }

  return <JsonFallback payload={content.payload} />;
}

export default function HubModerationPage() {
  const { user, status, authFetch } = useAuth();
  const [items, setItems] = useState<LibraryContent[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [detail, setDetail] = useState<LibraryContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [q, setQ] = useState("");
  const [type, setType] = useState<LibraryType | "">("");
  const [grade, setGrade] = useState<number | "">("");
  const [inferredGrades, setInferredGrades] = useState<Map<string, number>>(new Map());
  const [toast, setToast] = useState<Toast>(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [acting, setActing] = useState(false);
  const isModerator = hasAnyRole(user, ["MODERATOR"]);

  const load = useCallback(async () => {
    if (status !== "authenticated" || !user || !isModerator) return;
    setLoading(true);
    try {
      const data = await listModerationQueue(authFetch, new URLSearchParams({ size: "100" }));
      setItems(data.items);
      const missingGradeItems = data.items.filter((item) => !item.grade);
      if (missingGradeItems.length > 0) {
        const inferredEntries = await Promise.all(
          missingGradeItems.map(async (item) => {
            try {
              const content = await getModerationContent(authFetch, item.id);
              const inferred = inferGradeFromPayload(content.payload);
              return inferred ? ([item.id, inferred] as const) : null;
            } catch {
              return null;
            }
          }),
        );
        setInferredGrades(new Map(inferredEntries.filter((entry): entry is readonly [string, number] => entry !== null)));
      } else {
        setInferredGrades(new Map());
      }
    } catch (cause) {
      setToast({ kind: "error", message: cause instanceof Error ? cause.message : "Không thể tải hàng chờ duyệt." });
    } finally {
      setLoading(false);
    }
  }, [authFetch, isModerator, status, user]);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!selectedId) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      setDetailLoading(true);
      setDetail(null);
      setRejectOpen(false);
      setRejectReason("");
      void getModerationContent(authFetch, selectedId)
        .then((content) => {
          if (!cancelled) setDetail(content);
        })
        .catch((cause) => {
          if (!cancelled) {
            setDetail(null);
            setToast({ kind: "error", message: cause instanceof Error ? cause.message : "Không thể mở nội dung duyệt." });
          }
        })
        .finally(() => {
          if (!cancelled) setDetailLoading(false);
        });
    }, 0);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [authFetch, selectedId]);

  const filteredItems = useMemo(() => {
    const keyword = q.trim().toLowerCase();
    return items.filter((item) => {
      const itemGrade = item.grade ?? inferredGrades.get(item.id) ?? null;
      if (type && item.type !== type) return false;
      if (grade && itemGrade !== grade) return false;
      if (keyword && !item.title.toLowerCase().includes(keyword)) return false;
      return true;
    });
  }, [grade, inferredGrades, items, q, type]);

  async function handleApprove() {
    if (!detail) return;
    setActing(true);
    try {
      await approveContent(authFetch, detail.id);
      setToast({ kind: "success", message: "Đã duyệt nội dung lên Community Hub." });
      setSelectedId("");
      setDetail(null);
      await load();
    } catch (cause) {
      setToast({ kind: "error", message: cause instanceof Error ? cause.message : "Không thể duyệt nội dung." });
    } finally {
      setActing(false);
    }
  }

  async function handleReject() {
    if (!detail || !rejectReason.trim()) return;
    setActing(true);
    try {
      await rejectContent(authFetch, detail.id, rejectReason.trim());
      setToast({ kind: "success", message: "Đã từ chối nội dung." });
      setRejectOpen(false);
      setRejectReason("");
      setSelectedId("");
      setDetail(null);
      await load();
    } catch (cause) {
      setToast({ kind: "error", message: cause instanceof Error ? cause.message : "Không thể từ chối nội dung." });
    } finally {
      setActing(false);
    }
  }

  return (
    <RouteGuard pathname="/hub-moderation" denyHref="/community-hub" denyLabel="Về Community Hub">
      <main className="min-h-screen bg-[#f7f5f2] text-[#2b2926]">
        <div className="flex min-h-screen">
          <Sidebar activeHref="/hub-moderation" />
          <section className="min-w-0 flex-1 p-5 pt-16 sm:p-8 sm:pt-8">
            <header className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-[#e8724a]">Community Hub</p>
                <h1 className="mt-1 text-3xl font-semibold tracking-tight">Kiểm duyệt nội dung</h1>
                <p className="mt-2 text-sm text-stone-500">Moderator chỉ xử lý nội dung đang chờ duyệt trong môn được phân công.</p>
              </div>
              <div className="rounded-xl border border-[#dce7e4] bg-white px-4 py-2 text-sm font-semibold text-[#167b70]">
                Môn phụ trách: {subjectLabel(user?.subject as LibrarySubject | null)}
              </div>
            </header>

            <div className="mt-6 grid gap-5 xl:grid-cols-[380px_minmax(0,1fr)]">
              <aside className="min-w-0 rounded-2xl border border-[#e4ded6] bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="font-semibold text-[#30343d]">Hàng chờ duyệt</h2>
                    <p className="text-xs text-stone-500">{filteredItems.length} / {items.length} nội dung</p>
                  </div>
                  <button type="button" onClick={() => void load()} className="inline-flex size-9 items-center justify-center rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-50" aria-label="Tải lại hàng chờ">
                    <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
                  </button>
                </div>

                <div className="mt-4 space-y-2">
                  <label className="relative block">
                    <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-stone-400" />
                    <span className="sr-only">Tìm nội dung</span>
                    <input value={q} onChange={(event) => setQ(event.target.value)} placeholder="Tìm theo tiêu đề..." className="w-full rounded-xl border border-stone-300 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-[#e8724a]" />
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <select value={type} onChange={(event) => setType(event.target.value as LibraryType | "")} className="rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#e8724a]">
                      {types.map(([label, value]) => <option key={value || "all"} value={value}>{label}</option>)}
                    </select>
                    <select value={grade} onChange={(event) => setGrade(event.target.value ? Number(event.target.value) : "")} className="rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#e8724a]">
                      {grades.map(([label, value]) => <option key={value || "all"} value={value}>{label}</option>)}
                    </select>
                  </div>
                </div>

                <div className="mt-4 max-h-[calc(100vh-280px)] space-y-2 overflow-auto pr-1">
                  {loading ? (
                    <div className="flex min-h-32 items-center justify-center gap-2 text-sm text-stone-500">
                      <Loader2 className="size-4 animate-spin" />
                      Đang tải...
                    </div>
                  ) : filteredItems.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-stone-300 bg-stone-50 p-5 text-center text-sm text-stone-500">Không có nội dung phù hợp.</div>
                  ) : filteredItems.map((item) => {
                    const Icon = typeIcons[item.type];
                    const active = selectedId === item.id;
                    const itemGrade = item.grade ?? inferredGrades.get(item.id) ?? null;
                    return (
                      <button key={item.id} type="button" onClick={() => setSelectedId(item.id)} className={`w-full rounded-xl border p-3 text-left transition ${active ? "border-[#e8724a] bg-[#fff4ee]" : "border-stone-200 hover:border-stone-300 hover:bg-stone-50"}`}>
                        <div className="flex items-start gap-3">
                          <span className="mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#dff8f3] text-[#167b70]"><Icon className="size-4" /></span>
                          <span className="min-w-0 flex-1">
                            <span className="line-clamp-2 text-sm font-semibold text-[#30343d]">{item.title}</span>
                            <span className="mt-1 block text-xs text-stone-500">{typeLabels[item.type]} · {subjectLabel(item.subject)} · Khối {itemGrade ?? "-"}</span>
                            <span className="mt-1 inline-flex items-center gap-1 text-xs text-amber-700"><Clock className="size-3.5" />{formatDateTime(item.submittedAt)}</span>
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </aside>

              <section className="min-w-0 rounded-2xl border border-[#e4ded6] bg-white p-5 shadow-sm">
                {!selectedId ? (
                  <div className="flex min-h-[520px] flex-col items-center justify-center text-center">
                    <div className="flex size-14 items-center justify-center rounded-2xl bg-[#fff4ee] text-[#e8724a]"><Search className="size-6" /></div>
                    <h2 className="mt-4 text-lg font-semibold text-[#30343d]">Chọn một nội dung để kiểm duyệt</h2>
                    <p className="mt-1 max-w-md text-sm text-stone-500">Moderator cần xem nội dung trước khi quyết định duyệt lên Community Hub hoặc từ chối kèm lý do.</p>
                  </div>
                ) : detailLoading || !detail ? (
                  <div className="flex min-h-[520px] items-center justify-center gap-2 text-sm text-stone-500">
                    <Loader2 className="size-4 animate-spin" />
                    Đang mở nội dung...
                  </div>
                ) : (
                  <div className="min-w-0">
                    {(() => {
                      const detailGrade = detail.grade ?? inferGradeFromPayload(detail.payload);
                      return (
                    <div className="flex flex-wrap items-start justify-between gap-4 border-b border-stone-200 pb-5">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-stone-500">
                          <span className="rounded-lg bg-stone-100 px-2.5 py-1">{typeLabels[detail.type]}</span>
                          <span className="rounded-lg bg-[#edf4ff] px-2.5 py-1 text-[#2f5f9b]">{subjectLabel(detail.subject)}</span>
                          <span className="inline-flex items-center gap-1 rounded-lg bg-amber-50 px-2.5 py-1 text-amber-700"><Clock className="size-3.5" />Chờ duyệt</span>
                        </div>
                        <h2 className="mt-3 text-2xl font-bold tracking-[-0.03em] text-[#30343d]">{detail.title}</h2>
                        <p className="mt-1 text-sm text-stone-500">Gửi lúc {formatDateTime(detail.submittedAt)} · Khối {detailGrade ?? "-"}</p>
                      </div>
                      <div className="flex shrink-0 flex-wrap gap-2">
                        <button type="button" disabled={acting} onClick={() => void handleApprove()} className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60">
                          {acting ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
                          Duyệt lên Hub
                        </button>
                        <button type="button" disabled={acting} onClick={() => setRejectOpen((value) => !value)} className="inline-flex items-center gap-2 rounded-xl border border-rose-200 px-4 py-2.5 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-60">
                          <XCircle className="size-4" />
                          Từ chối
                        </button>
                      </div>
                    </div>
                      );
                    })()}

                    {rejectOpen && (
                      <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-4">
                        <label className="block text-sm font-semibold text-rose-900" htmlFor="hub-reject-reason">Lý do từ chối</label>
                        <textarea id="hub-reject-reason" value={rejectReason} onChange={(event) => setRejectReason(event.target.value)} rows={3} className="mt-2 w-full resize-y rounded-xl border border-rose-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-rose-500" placeholder="Nhập lý do để giáo viên chỉnh sửa và gửi lại..." />
                        <div className="mt-3 flex justify-end gap-2">
                          <button type="button" disabled={acting} onClick={() => setRejectOpen(false)} className="rounded-xl px-4 py-2 text-sm font-medium text-rose-800 hover:bg-rose-100">Hủy</button>
                          <button type="button" disabled={acting || !rejectReason.trim()} onClick={() => void handleReject()} className="inline-flex items-center gap-2 rounded-xl bg-rose-700 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-800 disabled:opacity-60">
                            {acting && <Loader2 className="size-4 animate-spin" />}
                            Xác nhận từ chối
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="mt-5">
                      <ContentPreview content={detail} />
                    </div>
                  </div>
                )}
              </section>
            </div>
          </section>
        </div>

        {toast && (
          <div role="status" className={`fixed bottom-5 right-5 z-50 flex max-w-sm items-start gap-3 rounded-2xl p-4 text-sm shadow-xl ${toast.kind === "success" ? "bg-[#292d3b] text-white" : "bg-rose-700 text-white"}`}>
            {toast.kind === "success" ? <CheckCircle2 className="mt-0.5 size-4 shrink-0" /> : <AlertCircle className="mt-0.5 size-4 shrink-0" />}
            <p>{toast.message}</p>
          </div>
        )}
      </main>
    </RouteGuard>
  );
}
