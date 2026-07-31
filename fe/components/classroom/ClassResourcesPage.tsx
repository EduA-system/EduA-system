"use client";

import { useCallback, useEffect, useState } from "react";
import { Inbox, Loader2, Plus, RefreshCw } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthContext";
import { type ClassDetail, type ClassResourceSummary, deleteClassResource, getClassDetail, listClassResources } from "@/lib/classroom";
import { ClassHubFrame } from "./ClassHubFrame";
import { ResourceCard } from "./shared";
import { ResourceFormPanel } from "./ClassDetailPage";

export function ClassResourcesPage() {
  const { authFetch } = useAuth();
  const classId = useSearchParams().get("classId") ?? "";
  const [detail, setDetail] = useState<ClassDetail | null>(null);
  const [resources, setResources] = useState<ClassResourceSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [target, setTarget] = useState<"create" | ClassResourceSummary | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState("");

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
    if (created) void load();
  }
  async function remove(resource: ClassResourceSummary) {
    if (!classId || deleting || !window.confirm(`Xóa \"${resource.title}\"? Các bài nộp liên quan cũng sẽ bị xóa.`)) return;
    setDeleting(resource.id);
    try { await deleteClassResource(authFetch, classId, resource.id); setResources((items) => items.filter((item) => item.id !== resource.id)); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Không thể xóa tài nguyên."); }
    finally { setDeleting(null); }
  }

  const canManage = detail?.status === "ACTIVE";
  return <ClassHubFrame classId={classId} active="resources">
    <div className="mt-6 flex flex-wrap items-center justify-between gap-3"><div><h1 className="font-libertine text-[32px] font-normal">Tài nguyên</h1><p className="mt-1 text-[13px] text-[#6b6b6b]">Tài liệu và bài tập được chia sẻ cho lớp.</p></div><div className="flex gap-2">{canManage && <button onClick={() => setTarget("create")} className="inline-flex h-9 items-center gap-2 rounded-[10px] bg-[#d97757] px-3 text-[12px] font-medium text-white"><Plus className="size-3.5" /> Đăng tài liệu</button>}<button onClick={() => void load()} className="inline-flex h-9 items-center gap-2 rounded-[10px] border border-[#d8d1c9] px-3 text-[12px]"><RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} /> Làm mới</button></div></div>
    {error && <p className="mt-4 rounded-[10px] bg-[#fdf3ef] px-3 py-2 text-[13px] text-[#c0492b]">{error}</p>}
    {target && <ResourceFormPanel classId={classId} authFetch={authFetch} initial={target === "create" ? null : target} onSaved={saved} onCancel={() => setTarget(null)} />}
    <div className="mt-6 space-y-4">{loading && !detail ? <div className="flex items-center gap-2 text-sm text-[#6b6b6b]"><Loader2 className="size-4 animate-spin" /> Đang tải...</div> : resources.length === 0 ? <div className="rounded-[14px] border border-dashed border-[#d8d1c9] px-5 py-14 text-center"><Inbox className="mx-auto size-8 text-[#a8a097]" /><p className="mt-3 text-[13px]">Chưa có tài nguyên nào</p></div> : resources.map((resource) => <ResourceCard key={resource.id} resource={resource} canManage={canManage} onEdit={setTarget} onDelete={(item) => void remove(item)} deleting={deleting === resource.id} />)}</div>
  </ClassHubFrame>;
}
