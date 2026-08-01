"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthContext";
import { type ClassResourceSummary, listClassResources } from "@/lib/classroom";
import { ClassHubFrame } from "./ClassHubFrame";
import { SubmissionDetailPanel } from "./SubmissionDetailPanel";
import { SubmissionsRosterPanel } from "./SubmissionsRosterPanel";

function useResource() {
  const { authFetch } = useAuth(); const params = useSearchParams(); const classId = params.get("classId") ?? ""; const resourceId = params.get("resourceId") ?? "";
  const [resource, setResource] = useState<ClassResourceSummary | null>(null); const [error, setError] = useState("");
  const load = useCallback(async () => { if (!classId || !resourceId) return; try { const page = await listClassResources(authFetch, classId, 0, 100); setResource(page.items.find((item) => item.id === resourceId) ?? null); } catch (reason) { setError(reason instanceof Error ? reason.message : "Không thể tải bài tập."); } }, [authFetch, classId, resourceId]);
  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]); return { authFetch, classId, resourceId, resource, error };
}
function LoadingOrError({ resource, error }: { resource: ClassResourceSummary | null; error: string }) { return error ? <p className="mt-6 text-[13px] text-[#c0492b]">{error}</p> : !resource ? <div className="mt-6 flex items-center gap-2 text-sm text-[#6b6b6b]"><Loader2 className="size-4 animate-spin" /> Đang tải bài tập...</div> : null; }
export function ClassSubmissionsPage() { const state = useResource(); return <ClassHubFrame classId={state.classId} active="assignments" breadcrumbItems={[{ label: state.resource?.title ?? "Bài nộp" }]}><LoadingOrError resource={state.resource} error={state.error} />{state.resource && <div className="mt-6"><SubmissionsRosterPanel authFetch={state.authFetch} classId={state.classId} resource={state.resource} /></div>}</ClassHubFrame>; }
export function ClassSubmissionDetailPage() { const state = useResource(); const studentId = useSearchParams().get("studentId") ?? ""; return <ClassHubFrame classId={state.classId} active="assignments" breadcrumbItems={[{ label: state.resource?.title ?? "Bài nộp" }, { label: "Chi tiết" }]}><LoadingOrError resource={state.resource} error={state.error} />{state.resource && studentId && <div className="mt-6"><SubmissionDetailPanel authFetch={state.authFetch} classId={state.classId} resource={state.resource} studentId={studentId} /></div>}</ClassHubFrame>; }
