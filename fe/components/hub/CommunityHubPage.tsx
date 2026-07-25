"use client";
import Link from "next/link";
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

const tabs: [string, LibraryType | ""][] = [["Tất cả", ""], ["Bài giảng", "LESSON_PLAN"], ["Slide", "SLIDE_DECK"], ["Bài kiểm tra", "TEST"], ["Mô phỏng", "SIMULATION"]];
const typeLabels: Record<LibraryType, string> = { LESSON_PLAN: "Bài giảng", SLIDE_DECK: "Slide", TEST: "Bài kiểm tra", SIMULATION: "Mô phỏng" };

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
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không thể tải Community Hub.");
    } finally {
      setLoading(false);
    }
  }, [authFetch, type, subject, q]);

  useEffect(() => {
    const t = setTimeout(() => void load(), 200);
    return () => clearTimeout(t);
  }, [load]);

  const openDetail = async (id: string) => {
    setDetailLoading(true);
    setActionError("");
    try {
      const detail = await getHubContent(authFetch, id);
      setSelected(detail);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không thể tải chi tiết nội dung.");
    } finally {
      setDetailLoading(false);
    }
  };

  const reloadSelected = async () => {
    if (selected) await openDetail(selected.id);
  };

  const requireLogin = () => {
    setActionError("Vui lòng đăng nhập để thực hiện thao tác này.");
  };

  const handleCustomize = async () => {
    if (!selected) return;
    if (!user) return requireLogin();
    try {
      await customizeHubContent(authFetch, selected.id);
      alert("Đã sao chép vào Thư viện của tôi.");
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Không thể tùy biến nội dung.");
    }
  };

  const handleComment = async () => {
    if (!selected) return;
    if (!user) return requireLogin();
    if (!commentText.trim()) return;
    try {
      await createHubComment(authFetch, selected.id, commentText.trim());
      setCommentText("");
      await reloadSelected();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Không thể gửi bình luận.");
    }
  };

  const handleDeleteComment = async (comment: HubComment) => {
    if (!user) return requireLogin();
    if (!confirm("Xóa bình luận này?")) return;
    try {
      await deleteHubComment(authFetch, comment.id);
      await reloadSelected();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Không thể xóa bình luận.");
    }
  };

  const handleReport = async () => {
    if (!selected) return;
    if (!user) return requireLogin();
    const reason = prompt("Lý do báo cáo nội dung này:");
    if (!reason || !reason.trim()) return;
    try {
      await reportHubContent(authFetch, selected.id, reason.trim());
      alert("Đã gửi báo cáo, cảm ơn bạn.");
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Không thể gửi báo cáo.");
    }
  };

  const canDeleteComment = (comment: HubComment) =>
    !!user && (comment.authorId === user.id || selected?.ownerId === user.id);

  return (
    <main className="min-h-screen bg-[#f5f1ec] text-[#2b2926]">
      <div className="flex min-h-screen">
        <Sidebar activeHref="/community-hub" />
        <section className="min-w-0 flex-1 p-5 sm:p-8">
          <header className="flex flex-wrap justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-[#e8724a]">Community</p>
              <h1 className="mt-1 text-3xl font-semibold">Community Hub</h1>
              <p className="mt-2 text-sm text-[#6b6b6b]">{total} nội dung đã được duyệt · chia sẻ bởi cộng đồng giáo viên</p>
            </div>
            {!user && (
              <Link className="rounded-xl bg-[#e8724a] px-4 py-2 text-sm text-white" href="/login">
                Đăng nhập để tương tác
              </Link>
            )}
          </header>

          <div className="mt-7 flex flex-wrap border-b">
            {tabs.map(([label, value]) => (
              <button
                key={value || "all"}
                onClick={() => setType(value)}
                className={`border-b-2 px-3 py-3 text-sm ${type === value ? "border-[#e8724a] font-semibold" : "border-transparent text-[#6b6b6b]"}`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm theo tiêu đề..." className="rounded-xl border bg-white px-3 py-2 text-sm" />
            <select value={subject} onChange={(e) => setSubject(e.target.value)} className="rounded-xl border bg-white px-3 py-2 text-sm">
              <option value="">Tất cả môn</option>
              <option value="MATH">Toán</option>
              <option value="CHEMISTRY">Hóa học</option>
              <option value="PHYSICS">Vật lý</option>
            </select>
          </div>

          {error && <p className="mt-4 text-sm text-red-700">{error}</p>}

          {loading ? (
            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {[1, 2, 3].map((x) => (
                <div key={x} className="h-44 animate-pulse rounded-2xl bg-[#e8e2db]" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="mt-8 rounded-2xl border border-dashed bg-white p-12 text-center">
              {q || subject || type ? "Không tìm thấy nội dung phù hợp." : "Chưa có nội dung nào được duyệt lên Hub."}
            </div>
          ) : (
            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {items.map((i) => (
                <article key={i.id} className="overflow-hidden rounded-2xl border bg-white">
                  <button onClick={() => void openDetail(i.id)} className="block h-24 w-full bg-gradient-to-br from-[#f2ded5] to-[#eee9df] p-4 text-left text-sm font-semibold text-[#8e4e35]">
                    {typeLabels[i.type]}
                  </button>
                  <div className="p-4">
                    <button onClick={() => void openDetail(i.id)} className="text-left font-semibold hover:underline">
                      {i.title}
                    </button>
                    <p className="mt-2 text-xs text-[#6b6b6b]">
                      {i.subject && <span className={`mr-2 rounded-full px-2 py-0.5 ${subjectBadgeClasses(i.subject)}`}>{subjectLabel(i.subject)}</span>}
                      {i.ownerName ?? "Ẩn danh"} · {i.commentCount} bình luận
                    </p>
                  </div>
                </article>
              ))}
            </div>
          )}

          {(selected || detailLoading) && (
            <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4" onClick={() => setSelected(null)}>
              <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6" onClick={(e) => e.stopPropagation()}>
                {detailLoading || !selected ? (
                  <p className="text-sm text-[#6b6b6b]">Đang tải...</p>
                ) : (
                  <>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs font-semibold uppercase text-[#e8724a]">{typeLabels[selected.type]}</p>
                        <h2 className="mt-1 text-xl font-semibold">{selected.title}</h2>
                        <p className="mt-1 text-sm text-[#6b6b6b]">Bởi {selected.ownerName ?? "Ẩn danh"}</p>
                      </div>
                      <button onClick={() => setSelected(null)} className="text-sm text-[#6b6b6b]">Đóng</button>
                    </div>

                    {actionError && <p className="mt-3 text-sm text-red-700">{actionError}</p>}

                    <div className="mt-4 flex gap-3">
                      <button onClick={() => void handleCustomize()} className="rounded-xl bg-[#e8724a] px-4 py-2 text-sm text-white">Tùy biến về thư viện của tôi</button>
                      <button onClick={() => void handleReport()} className="rounded-xl border px-4 py-2 text-sm text-red-700">Báo cáo vi phạm</button>
                    </div>

                    <div className="mt-6 border-t pt-4">
                      <h3 className="text-sm font-semibold">Bình luận ({selected.comments.length})</h3>
                      <div className="mt-3 space-y-3">
                        {selected.comments.map((c) => (
                          <div key={c.id} className="rounded-xl bg-[#f5f1ec] p-3 text-sm">
                            <div className="flex items-center justify-between">
                              <span className="font-semibold">{c.authorName ?? "Ẩn danh"}</span>
                              {canDeleteComment(c) && (
                                <button onClick={() => void handleDeleteComment(c)} className="text-xs text-red-700">Xóa</button>
                              )}
                            </div>
                            <p className="mt-1">{c.content}</p>
                          </div>
                        ))}
                        {selected.comments.length === 0 && <p className="text-sm text-[#6b6b6b]">Chưa có bình luận nào.</p>}
                      </div>
                      <div className="mt-4 flex gap-2">
                        <input
                          value={commentText}
                          onChange={(e) => setCommentText(e.target.value)}
                          placeholder={user ? "Viết bình luận..." : "Đăng nhập để bình luận"}
                          className="flex-1 rounded-xl border px-3 py-2 text-sm"
                        />
                        <button onClick={() => void handleComment()} className="rounded-xl bg-[#e8724a] px-4 py-2 text-sm text-white">Gửi</button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

export default function CommunityHubPage() {
  return <CommunityHubScreen />;
}
