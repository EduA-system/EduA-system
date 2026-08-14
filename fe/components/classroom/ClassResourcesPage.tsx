"use client";

import { useCallback, useEffect, useState } from "react";
import { Inbox, Loader2, Plus, RefreshCw } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthContext";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { type ClassDetail, type ClassResourceSummary, deleteClassResource, getClassDetail, listClassResources } from "@/lib/classroom";
import { ClassHubFrame } from "./ClassHubFrame";
import { ResourceCard } from "./shared";
import { ResourceFormPanel } from "./ClassDetailPage";

function SuccessToast({ message, onClose }: { message: string; onClose: () => void }) {
  return <div className="fixed right-5 top-5 z-[70] flex max-w-sm items-center gap-3 rounded-2xl border border-[#bde6ce] bg-white px-4 py-3 text-sm font-semibold text-[#23613d] shadow-[0_14px_34px_rgba(22,82,49,0.18)]" role="status"><span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[#31a66a] text-sm text-white">✓</span><span className="flex-1">{message}</span><button type="button" onClick={onClose} aria-label="Đóng thông báo" className="text-lg font-normal leading-none text-[#548266] hover:text-[#23613d]">×</button></div>;
}

export function ClassResourcesPage() {
  const { user, authFetch } = useAuth();
  const router = useRouter();
  const classId = useSearchParams().get("classId") ?? "";
  const [detail, setDetail] = useState<ClassDetail | null>(null);
  const [resources, setResources] = useState<ClassResourceSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [target, setTarget] = useState<"create" | ClassResourceSummary | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ClassResourceSummary | null>(null);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    if (!successMessage) return;
    const timer = window.setTimeout(() => setSuccessMessage(""), 3500);
    return () => window.clearTimeout(timer);
  }, [successMessage]);

  const load = useCallback(async () => {
    if (!classId) return;
    setLoading(true); setError("");
    try {
      const [classDetail, page] = await Promise.all([getClassDetail(authFetch, classId), listClassResources(authFetch, classId, 0, 100)]);
      setDetail(classDetail); setResources(page.items);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Không thể tải tài nguyên."); }
    finally { setLoading(false); }
  }, [authFetch, classId]);
  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);

  function saved(resource: ClassResourceSummary) {
    const created = target === "create";
    setResources((items) => items.some((item) => item.id === resource.id) ? items.map((item) => item.id === resource.id ? resource : item) : [resource, ...items]);
    setTarget(null);
    setSuccessMessage(created ? "Đã đăng tài liệu thành công." : "Đã cập nhật tài liệu thành công.");
    if (created) void load();
  }
  async function remove(resource: ClassResourceSummary) {
    if (!classId || deleting) return;
    setDeleting(resource.id);
    try { await deleteClassResource(authFetch, classId, resource.id); setResources((items) => items.filter((item) => item.id !== resource.id)); setDeleteTarget(null); setSuccessMessage("Đã xóa tài nguyên thành công."); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Không thể xóa tài nguyên."); }
    finally { setDeleting(null); }
  }

  const canManage = detail?.status === "ACTIVE" && detail.ownerId === user?.id;
  return <ClassHubFrame classId={classId} active="resources" header={<div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="font-libertine text-[40px] font-normal leading-[1.02] tracking-[-0.025em] sm:text-[52px]">Tài nguyên</h1><p className="mt-3 text-[14px] leading-6 text-[#6b6b6b]">Tài liệu và bài tập được chia sẻ cho lớp.</p></div><div className="flex gap-2">{canManage && <button onClick={() => setTarget("create")} className="inline-flex h-9 items-center gap-2 rounded-[10px] bg-[#d97757] px-3 text-[12px] font-medium text-white"><Plus className="size-3.5" /> Đăng tài liệu</button>}<button onClick={() => void load()} className="inline-flex h-9 items-center gap-2 rounded-[10px] border border-[#d8d1c9] px-3 text-[12px]"><RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} /> Làm mới</button></div></div>}>
    {error && <p className="mt-4 rounded-[10px] bg-[#fdf3ef] px-3 py-2 text-[13px] text-[#c0492b]">{error}</p>}
    {target && <ResourceFormPanel classId={classId} authFetch={authFetch} initial={target === "create" ? null : target} onSaved={saved} onCancel={() => setTarget(null)} />}
    <div className="mt-6 space-y-4">{loading && !detail ? <div className="flex items-center gap-2 text-sm text-[#6b6b6b]"><Loader2 className="size-4 animate-spin" /> Đang tải...</div> : resources.length === 0 ? <div className="rounded-[14px] border border-dashed border-[#d8d1c9] px-5 py-14 text-center"><Inbox className="mx-auto size-8 text-[#a8a097]" /><p className="mt-3 text-[13px]">Chưa có tài nguyên nào</p></div> : resources.map((resource) => <ResourceCard key={resource.id} resource={resource} canManage={canManage} classInactive={detail?.status === "INACTIVE"} onOpen={() => router.push(`/class-detail/resources/detail?classId=${classId}&resourceId=${resource.id}`)} onEdit={setTarget} onDelete={setDeleteTarget} deleting={deleting === resource.id} />)}</div>
    <ConfirmDialog
      open={deleteTarget !== null}
      onClose={() => setDeleteTarget(null)}
      onConfirm={() => deleteTarget && void remove(deleteTarget)}
      loading={Boolean(deleteTarget && deleting === deleteTarget.id)}
      title="Xóa tài nguyên?"
      description={
        <>
          Tài nguyên <span className="font-semibold text-[#1f1f1f]">&quot;{deleteTarget?.title}&quot;</span> sẽ bị xóa. Các bài nộp liên quan của học sinh cũng sẽ bị xóa theo.
        </>
      }
      confirmLabel="Xóa tài nguyên"
      variant="danger"
    />
    {successMessage && <SuccessToast message={successMessage} onClose={() => setSuccessMessage("")} />}
  </ClassHubFrame>;
}
