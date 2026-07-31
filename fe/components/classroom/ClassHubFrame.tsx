"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";

type ClassHubSection = "overview" | "members" | "resources" | "assignments" | "settings";

const sections: { id: ClassHubSection; label: string; href: string }[] = [
  { id: "overview", label: "Tổng quan", href: "/class-detail" },
  { id: "members", label: "Thành viên", href: "/class-detail/members" },
  { id: "resources", label: "Tài nguyên", href: "/class-detail/resources" },
  { id: "assignments", label: "Bài tập", href: "/class-detail/assignments" },
  { id: "settings", label: "Cài đặt", href: "/class-detail/settings" },
];

export function classHubHref(pathname: string, classId: string): string {
  return classId ? `${pathname}?classId=${encodeURIComponent(classId)}` : pathname;
}

export function ClassHubFrame({
  classId,
  active,
  children,
}: {
  classId: string;
  active: ClassHubSection;
  children: ReactNode;
}) {
  return (
    <main className="min-h-screen bg-white text-[#1f1f1f]">
      <div className="flex min-h-screen">
        <Sidebar activeHref="/list-class" />
        <section className="min-w-0 flex-1 px-5 py-8 sm:px-8 lg:px-10 lg:py-12">
          <div className="mx-auto w-full max-w-[1220px]">
            <Link href="/list-class" className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[#6b6b6b] transition hover:text-[#1f1f1f]">
              <ArrowLeft className="size-3.5" /> Quay lại danh sách lớp
            </Link>
            <ClassHubNavigation classId={classId} active={active} />
            {children}
          </div>
        </section>
      </div>
    </main>
  );
}

export function ClassHubNavigation({ classId, active }: { classId: string; active: ClassHubSection }) {
  return <nav aria-label="Điều hướng lớp học" className="mt-5 flex gap-1 overflow-x-auto border-b border-[#ede8e1]">
    {sections.map((section) => <Link key={section.id} href={classHubHref(section.href, classId)} className={`shrink-0 border-b-2 px-3 py-2.5 text-[13px] font-medium transition ${active === section.id ? "border-[#d97757] text-[#c96545]" : "border-transparent text-[#6b6b6b] hover:text-[#1f1f1f]"}`}>{section.label}</Link>)}
  </nav>;
}
