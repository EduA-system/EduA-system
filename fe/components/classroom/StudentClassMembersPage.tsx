"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AlertCircle, ArrowLeft, Loader2, Users } from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import { useAuth } from "@/lib/auth/AuthContext";
import {
  type ClassDetail,
  type ClassMember,
  getClassDetail,
  isClassAccessRevoked,
  listClassMembers,
} from "@/lib/classroom";

const AVATAR_COLORS = ["bg-[#dce9ff] text-[#3968c7]", "bg-[#dff4eb] text-[#167258]", "bg-[#fbe3ed] text-[#bd3d70]", "bg-[#fff0d6] text-[#a65d12]"];

function displayName(member: ClassMember): string {
  return member.studentName || member.studentEmail || "Học sinh";
}

function initials(name: string): string {
  return name.trim().split(/\s+/).slice(-2).map((part) => part[0]).join("").toUpperCase() || "HS";
}

export function StudentClassMembersPage() {
  const { authFetch } = useAuth();
  const classId = useSearchParams().get("classId") ?? "";
  const [detail, setDetail] = useState<ClassDetail | null>(null);
  const [members, setMembers] = useState<ClassMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!classId) return;
    setLoading(true);
    setError("");
    try {
      const [classDetail, memberPage] = await Promise.all([
        getClassDetail(authFetch, classId),
        listClassMembers(authFetch, classId, 0, 100),
      ]);
      setDetail(classDetail);
      setMembers(memberPage.items.filter((member) => member.membershipStatus === "ENROLLED"));
    } catch (reason) {
      setDetail(null);
      setMembers([]);
      setError(
        isClassAccessRevoked(reason)
          ? "Bạn không còn quyền truy cập lớp học này."
          : reason instanceof Error
            ? reason.message
            : "Không thể tải danh sách thành viên lớp.",
      );
    } finally {
      setLoading(false);
    }
  }, [authFetch, classId]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const backHref = classId ? `/list-class?classId=${encodeURIComponent(classId)}` : "/list-class";

  return (
    <main className="min-h-screen bg-white text-[#1f1f1f]">
      <div className="flex min-h-screen">
        <Sidebar activeHref="/list-class" />
        <section className="min-w-0 flex-1 px-5 py-8 sm:px-8 lg:px-10 lg:py-12">
          <div className="mx-auto w-full max-w-[860px]">
            <Link href={backHref} className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[#6b6b6b] transition hover:text-[#1f1f1f]">
              <ArrowLeft className="size-4" /> Quay lại lớp học
            </Link>
            <div className="mt-5 flex items-start justify-between gap-4">
              <div>
                <h1 className="font-libertine text-[40px] font-normal leading-[1.02] tracking-[-0.025em] sm:text-[52px]">Thành viên lớp</h1>
                <p className="mt-3 text-[14px] text-[#6b6b6b]">{detail ? detail.name : "Danh sách giáo viên và bạn cùng lớp."}</p>
              </div>
              {detail && <span className="rounded-full border border-[#d8d1c9] bg-[#faf9f7] px-3 py-1.5 text-[12px] font-medium text-[#5f5953]">{members.length} học sinh</span>}
            </div>

            {loading ? (
              <div className="mt-8 flex min-h-56 items-center justify-center gap-2 rounded-[14px] border border-[#ede8e1] bg-[#faf9f7] text-sm text-[#6b6b6b]"><Loader2 className="size-4 animate-spin" /> Đang tải thành viên...</div>
            ) : error ? (
              <div className="mt-8 flex items-start gap-2 rounded-[14px] border border-[#e8b4a4] bg-[#fdf3ef] px-4 py-3 text-[13px] text-[#c0492b]"><AlertCircle className="mt-0.5 size-4 shrink-0" />{error}</div>
            ) : detail ? (
              <div className="mt-8 space-y-9">
                <section>
                  <h2 className="text-[22px] font-semibold tracking-[-0.02em]">Giáo viên</h2>
                  <div className="mt-3 border-y border-[#d8d1c9] py-3">
                    <div className="flex items-center gap-3">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#fbe3ed] text-sm font-semibold text-[#bd3d70]">{initials(detail.ownerName ?? "Giáo viên")}</span>
                      <span className="min-w-0 flex-1 truncate text-[14px] font-medium">{detail.ownerName ?? "Giáo viên"}</span>
                    </div>
                  </div>
                </section>

                <section>
                  <div className="flex items-baseline justify-between gap-3">
                    <h2 className="text-[22px] font-semibold tracking-[-0.02em]">Bạn cùng lớp</h2>
                    <span className="text-[12px] font-medium text-[#5f5953]">{members.length} học sinh</span>
                  </div>
                  <div className="mt-3 border-y border-[#d8d1c9]">
                    {members.length === 0 ? (
                      <div className="flex items-center gap-3 py-7 text-[13px] text-[#6b6b6b]"><Users className="size-5" /> Chưa có học sinh nào trong lớp.</div>
                    ) : members.map((member, index) => {
                      const name = displayName(member);
                      return (
                        <div key={member.id} className="flex items-center gap-3 border-b border-[#d8d1c9] py-3 last:border-0">
                          <span className={`flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${AVATAR_COLORS[index % AVATAR_COLORS.length]}`}>{initials(name)}</span>
                          <span className="min-w-0 flex-1 truncate text-[14px] font-medium">{name}</span>
                        </div>
                      );
                    })}
                  </div>
                </section>
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}
