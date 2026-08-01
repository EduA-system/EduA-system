"use client";

import { useCallback, useEffect, useState } from "react";
import { ClipboardList, Loader2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthContext";
import { type ClassResourceSummary, listClassResources } from "@/lib/classroom";
import { ClassHubFrame, classHubHref } from "./ClassHubFrame";
import { ResourceCard } from "./shared";

export function ClassAssignmentsPage() {
  const { authFetch } = useAuth(); const router = useRouter(); const classId = useSearchParams().get("classId") ?? "";
  const [items, setItems] = useState<ClassResourceSummary[]>([]); const [loading, setLoading] = useState(false); const [error, setError] = useState("");
  const load = useCallback(async () => { if (!classId) return; setLoading(true); try { const page = await listClassResources(authFetch, classId, 0, 100); setItems(page.items.filter((item) => item.submissionEnabled)); } catch (reason) { setError(reason instanceof Error ? reason.message : "Không thể tải bài tập."); } finally { setLoading(false); } }, [authFetch, classId]);
  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);
  return <ClassHubFrame classId={classId} active="assignments" header={<div><h1 className="font-libertine text-[40px] font-normal leading-[1.02] tracking-[-0.025em] sm:text-[52px]">Bài tập</h1><p className="mt-3 text-[14px] leading-6 text-[#6b6b6b]">Các tài nguyên yêu cầu học sinh nộp bài.</p></div>}><div>{error && <p className="mt-4 text-[13px] text-[#c0492b]">{error}</p>}<div className="mt-6 space-y-4">{loading ? <div className="flex items-center gap-2 text-sm text-[#6b6b6b]"><Loader2 className="size-4 animate-spin" /> Đang tải...</div> : items.length === 0 ? <div className="rounded-[14px] border border-dashed border-[#d8d1c9] px-5 py-14 text-center"><ClipboardList className="mx-auto size-8 text-[#a8a097]" /><p className="mt-3 text-[13px]">Chưa có bài tập nào</p></div> : items.map((item) => <ResourceCard key={item.id} resource={item} onOpen={() => router.push(`${classHubHref("/class-detail/assignments/submissions", classId)}&resourceId=${item.id}`)} />)}</div></div></ClassHubFrame>;
}
