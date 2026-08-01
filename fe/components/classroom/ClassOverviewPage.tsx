"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { BookOpen, ClipboardList, Loader2, Settings, Users } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthContext";
import { type ClassDetail, getClassDetail, statusLabel, subjectLabel } from "@/lib/classroom";
import { ClassHubFrame, classHubHref } from "./ClassHubFrame";
import { statusClasses, subjectBannerClasses } from "./shared";

export function ClassOverviewPage() {
  const { authFetch } = useAuth();
  const classId = useSearchParams().get("classId") ?? "";
  const [detail, setDetail] = useState<ClassDetail | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!classId) return;
    setError("");
    try { setDetail(await getClassDetail(authFetch, classId)); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Không thể mở lớp học."); }
  }, [authFetch, classId]);

  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);

  return (
    <ClassHubFrame classId={classId} active="overview" header={<div><h1 className="font-libertine text-[40px] font-normal leading-[1.02] tracking-[-0.025em] sm:text-[52px]">Tổng quan lớp</h1><p className="mt-3 text-[14px] leading-6 text-[#6b6b6b]">Thông tin, hoạt động và tài nguyên của lớp học.</p></div>}>
      {!classId ? <Empty message="Chọn một lớp từ danh sách để xem tổng quan." /> : error ? <Empty message={error} /> : !detail ? (
        <div className="mt-6 flex items-center gap-2 text-sm text-[#6b6b6b]"><Loader2 className="size-4 animate-spin" /> Đang tải lớp học...</div>
      ) : (
        <div className="mt-6">
          <div className={`relative overflow-hidden rounded-[16px] px-6 py-7 text-white ${subjectBannerClasses(detail.subject)}`}>
            <span className="rounded-full border border-white/40 bg-white/10 px-2.5 py-1 text-[11px] font-medium">{subjectLabel(detail.subject)}</span>
            <h1 className="font-libertine mt-3 text-[34px] font-normal leading-tight sm:text-[42px]">{detail.name}</h1>
            <p className="mt-2 text-[13px] text-white/85">Khối {detail.grade} · Chủ lớp: {detail.ownerName ?? "Bạn"}</p>
            {detail.description && <p className="mt-5 max-w-2xl text-[13px] leading-6 text-white/90">{detail.description}</p>}
            <span className={`mt-5 inline-flex rounded-full border px-2.5 py-1 text-[11px] font-medium ${statusClasses(detail.status)}`}>{statusLabel(detail.status)}</span>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <Stat label="Thành viên" value={detail.memberCount} icon={Users} />
            <Stat label="Tài nguyên" value={detail.resourceCount} icon={BookOpen} />
            <Stat label="Bài nộp" value={detail.submissionCount} icon={ClipboardList} />
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Shortcut href={classHubHref("/class-detail/members", classId)} title="Thành viên" description="Thêm và nhập danh sách học sinh" icon={Users} />
            <Shortcut href={classHubHref("/class-detail/resources", classId)} title="Tài nguyên" description="Đăng và quản lý tài liệu" icon={BookOpen} />
            <Shortcut href={classHubHref("/class-detail/assignments", classId)} title="Bài tập" description="Theo dõi các bài yêu cầu nộp" icon={ClipboardList} />
            <Shortcut href={classHubHref("/class-detail/settings", classId)} title="Cài đặt" description="Cập nhật hoặc lưu trữ lớp" icon={Settings} />
          </div>
        </div>
      )}
    </ClassHubFrame>
  );
}

function Empty({ message }: { message: string }) { return <div className="mt-6 rounded-[14px] border border-dashed border-[#d8d1c9] px-5 py-14 text-center text-[13px] text-[#6b6b6b]">{message}</div>; }
function Stat({ label, value, icon: Icon }: { label: string; value: number; icon: typeof Users }) { return <div className="rounded-[14px] border border-[#d8d1c9] bg-white p-5"><Icon className="size-5 text-[#d97757]" /><p className="mt-3 text-2xl font-semibold">{value}</p><p className="mt-1 text-[12px] text-[#6b6b6b]">{label}</p></div>; }
function Shortcut({ href, title, description, icon: Icon }: { href: string; title: string; description: string; icon: typeof Users }) { return <Link href={href} className="rounded-[14px] border border-[#d8d1c9] bg-white p-5 transition hover:border-[#c9a998] hover:shadow-sm"><Icon className="size-5 text-[#d97757]" /><h2 className="mt-4 text-[15px] font-semibold">{title}</h2><p className="mt-1 text-[12px] leading-5 text-[#6b6b6b]">{description}</p></Link>; }
