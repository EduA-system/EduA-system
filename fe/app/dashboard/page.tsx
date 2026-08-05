"use client";

import Link from "next/link";
import { useState } from "react";
import { navGroups } from "@/components/dashboard/data";
import { Sidebar } from "@/components/layout/Sidebar";
import { DashboardIcon } from "@/components/ui/DashboardIcon";
import { useAuth } from "@/lib/auth/AuthContext";
import { RouteGuard } from "@/lib/auth/RouteGuard";
import { canAccessRoute, hasAnyRole } from "@/lib/auth/permissions";

const descriptions: Record<string, string> = {
  "/homepage": "Khám phá cộng đồng EDUA và các công cụ học tập trực quan.",
  "/blog": "Chia sẻ kiến thức, trao đổi ý tưởng cùng cộng đồng giáo dục.",
  "/library": "Lưu trữ, quản lý và sử dụng lại tài liệu giảng dạy của bạn.",
  "/create-class": "Tạo và quản lý Class Hub cho các lớp bạn phụ trách.",
  "/list-class": "Xem tài liệu và bài tập đã được đăng trong các lớp bạn tham gia.",
  "/lesson-edit": "Soạn thảo và hoàn thiện bài giảng với sự hỗ trợ của AI.",
  "/slide-create": "Tạo slide trình bày rõ ràng, sinh động chỉ trong vài phút.",
  "/lesson-create": "Thiết kế bài kiểm tra phù hợp với mục tiêu bài học.",
  "/mo-phong-vat-ly": "Thực hành và trực quan hóa các hiện tượng vật lý.",
  "/periodic-table": "Tra cứu bảng tuần hoàn tương tác một cách dễ dàng.",
  "/molecules": "Khám phá cấu tạo chất qua các mô hình trực quan.",
  "/help": "Tìm hướng dẫn và nhận hỗ trợ khi sử dụng EDUA.",
  "/blog-moderator": "Kiểm duyệt bài viết và duy trì cộng đồng tích cực.",
  "/user-management": "Quản lý tài khoản, vai trò và quyền truy cập người dùng.",
};

function DashboardContent() {
  const { user } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const displayName = user?.fullName?.trim() || user?.email?.split("@")[0] || "bạn";
  const visibleGroups = navGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) =>
        (!item.requiredRole || hasAnyRole(user, item.requiredRole)) && canAccessRoute(item.href, user),
      ),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <main className="min-h-screen bg-white text-[#1f1f1f]">
      <header className="sticky top-0 z-30 flex h-14 items-center border-b border-[#d8d1c9] bg-[#f7f5f2] px-4 md:hidden">
        <button
          type="button"
          onClick={() => setMobileMenuOpen(true)}
          className="inline-flex size-9 items-center justify-center rounded-lg text-[#1f1f1f] transition hover:bg-[#edeae5]"
          aria-label="Mở menu chức năng"
        >
          <span className="flex w-4 flex-col gap-1" aria-hidden>
            <span className="h-0.5 w-full rounded bg-current" />
            <span className="h-0.5 w-full rounded bg-current" />
            <span className="h-0.5 w-full rounded bg-current" />
          </span>
        </button>
        <div className="ml-3 flex items-center gap-2 text-sm font-semibold">
          <span className="flex size-7 items-center justify-center rounded-lg bg-[#1f1f1f] text-white"><DashboardIcon name="spark" className="size-3.5" /></span>
          EDUA
        </div>
      </header>

      {mobileMenuOpen && (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-black/25 md:hidden"
          aria-label="Đóng menu chức năng"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}
      <div className="flex min-h-[calc(100vh-3.5rem)] md:min-h-screen">
        <Sidebar responsive mobileOpen={mobileMenuOpen} />
        <section className="min-w-0 flex-1 px-5 py-8 sm:px-8 lg:px-12 lg:py-12">
          <div className="mx-auto max-w-6xl">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#d97757]">Không gian làm việc</p>
              <h1 className="font-libertine mt-3 text-4xl leading-none sm:text-5xl">Chào, {displayName}!</h1>
              <p className="mt-4 text-sm leading-6 text-[#6b6b6b]">Chọn một chức năng để bắt đầu công việc của bạn với EDUA.</p>
            </div>

            <div className="mt-10 space-y-10">
              {visibleGroups.map((group) => (
                <section key={group.label} aria-labelledby={`group-${group.label}`}>
                  <h2 id={`group-${group.label}`} className="text-xs font-semibold tracking-[0.12em] text-[#6b6b6b]">{group.label}</h2>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {group.items.map((item) => (
                      <Link
                        key={`${group.label}-${item.label}`}
                        href={item.href}
                        className="group flex min-h-40 flex-col rounded-2xl border border-[#d8d1c9] bg-white p-5 shadow-[0_2px_8px_rgba(43,41,38,0.04)] transition hover:-translate-y-0.5 hover:border-[#c9a998] hover:shadow-[0_10px_24px_rgba(43,41,38,0.10)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d97757]"
                      >
                        <span className="flex size-10 items-center justify-center rounded-xl bg-[#fff2e9] text-[#d97757]">
                          <DashboardIcon name={item.icon} className="size-5" />
                        </span>
                        <h3 className="mt-5 text-base font-semibold text-[#1f1f1f]">{item.label}</h3>
                        <p className="mt-2 text-sm leading-5 text-[#6b6b6b]">{descriptions[item.href] ?? "Truy cập công cụ và tài nguyên hữu ích của EDUA."}</p>
                        <span className="mt-auto pt-4 text-sm font-medium text-[#d97757]">Mở chức năng <span aria-hidden>→</span></span>
                      </Link>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

export default function DashboardPage() {
  return (
    <RouteGuard pathname="/dashboard">
      <DashboardContent />
    </RouteGuard>
  );
}
