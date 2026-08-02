"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { Sidebar } from "@/components/layout/Sidebar";
import { useAuth } from "@/lib/auth/AuthContext";
import { getClassDetail } from "@/lib/classroom";

type ClassHubSection = "overview" | "members" | "resources" | "assignments" | "settings";
export type ClassHubBreadcrumbItem = { label: string; href?: string };

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
  header,
  breadcrumbItems = [],
  children,
}: {
  classId: string;
  active: ClassHubSection;
  header?: ReactNode;
  breadcrumbItems?: ClassHubBreadcrumbItem[];
  children: ReactNode;
}) {
  const { authFetch } = useAuth();
  const [className, setClassName] = useState<string | null>(null);
  const activeLabel = sections.find((section) => section.id === active)?.label ?? "";

  const loadClassName = useCallback(async () => {
    if (!classId) {
      setClassName(null);
      return;
    }
    try {
      setClassName((await getClassDetail(authFetch, classId)).name);
    } catch {
      setClassName(null);
    }
  }, [authFetch, classId]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadClassName(), 0);
    return () => window.clearTimeout(timer);
  }, [loadClassName]);

  return (
    <main className="min-h-screen bg-white text-[#1f1f1f]">
      <div className="flex min-h-screen">
        <Sidebar activeHref="/list-class" />
        <section className="min-w-0 flex-1 px-5 py-8 sm:px-8 lg:px-10 lg:py-12">
          <div className="mx-auto w-full max-w-[1220px]">
            <nav aria-label="Đường dẫn lớp học" className="flex flex-wrap items-center gap-2 text-[12px] text-[#817a72]">
              <Link href="/list-class" className="font-medium transition hover:text-[#1f1f1f]">Lớp học</Link>
              <span aria-hidden className="text-[#b4aaa1]">/</span>
              {className ? <Link href={classHubHref("/class-detail", classId)} className="max-w-[240px] truncate font-medium transition hover:text-[#1f1f1f]">{className}</Link> : <span>Chọn lớp</span>}
              <span aria-hidden className="text-[#b4aaa1]">/</span>
              <span className="font-semibold text-[#a45c3e]">{activeLabel}</span>
              {breadcrumbItems.map((item, index) => <span key={`${item.label}-${index}`} className="contents"><span aria-hidden className="text-[#b4aaa1]">/</span>{item.href ? <Link href={item.href} className="max-w-[240px] truncate font-medium transition hover:text-[#1f1f1f]">{item.label}</Link> : <span aria-current={index === breadcrumbItems.length - 1 ? "page" : undefined} className={index === breadcrumbItems.length - 1 ? "font-semibold text-[#a45c3e]" : "text-[#817a72]"}>{item.label}</span>}</span>)}
            </nav>
            {header && <div className="mt-5">{header}</div>}
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
