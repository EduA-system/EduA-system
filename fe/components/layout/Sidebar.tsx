"use client";

import { useState } from "react";
import Link from "next/link";
import { PanelLeft } from "lucide-react";
import { navGroups } from "../dashboard/data";
import { DashboardIcon } from "../ui/DashboardIcon";
import { useAuth } from "@/lib/auth/AuthContext";
import { hasAnyRole } from "@/lib/auth/permissions";

interface SidebarProps {
  activeHref?: string;
  /** Render as a fixed full-height overlay layer instead of an in-flow column. */
  fixed?: boolean;
}

// Chuyển trạng thái mở/thu gọn tự quản lý ngay trong Sidebar — CHỈ một nút
// toggle duy nhất, sống trong component này (không còn các bản sao rải rác ở
// từng trang). Rail 60px = 2×12px padding hàng (px-3) + 36px ô icon (size-9)
// khớp khít, icon không cần tự dịch chuyển bằng transform: nó vốn đã nằm giữa
// ô icon cố định của nó, chỉ có phần chữ bên cạnh biến mất kéo hàng co lại.
const RAIL_WIDTH = "w-[60px]";
const FULL_WIDTH = "w-[280px]";
// MỘT cặp duration/easing DUY NHẤT dùng cho mọi phần tử đang chuyển động cùng
// lúc (chiều rộng sidebar, chữ mờ/dịch/co, icon toggle xoay) — trước đó mỗi
// chỗ một tốc độ khác nhau (150/200/220ms) khiến các phần tử "lệch nhịp" nhau,
// đây chính là nguyên nhân hiệu ứng nhìn thô/giật thay vì 1 chuyển động mượt.
const EASE = "ease-[cubic-bezier(0.32,0.72,0,1)]";
const DURATION = "duration-[340ms]";
const MAIN_TRANSITION = `${DURATION} ${EASE}`;

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function IconSlot({ children }: { children: React.ReactNode }) {
  return <span className="flex size-9 shrink-0 items-center justify-center">{children}</span>;
}

/** Tooltip bên phải — chỉ render khi thu gọn (chữ đã ẩn khỏi hàng). */
function Tooltip({ label }: { label: string }) {
  return (
    <span className="pointer-events-none absolute left-full top-1/2 z-50 ml-2 -translate-y-1/2 whitespace-nowrap rounded-[7px] bg-[#1f1f1f] px-2.5 py-1.5 text-[12px] font-medium text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100">
      {label}
    </span>
  );
}

export function Sidebar({ activeHref, fixed = false }: SidebarProps) {
  const { user } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  const position = fixed ? "fixed top-12 left-0 z-40 flex flex-col" : "flex flex-col";

  const displayName = user?.fullName ?? user?.email ?? "Nguyen Thi Hoa";
  const initials = user ? getInitials(displayName) : "NH";
  const displayRole = user?.role === "ADMINISTRATOR"
    ? "Quản trị viên"
    : user?.role === "MODERATOR"
      ? "Người kiểm duyệt"
      : "Giáo viên";

  const filteredGroups = navGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => {
        if (!item.requiredRole) return true;
        return hasAnyRole(user, item.requiredRole);
      }),
    }))
    .filter((group) => group.items.length > 0);

  // Chữ/nội dung phụ: thu gọn → mờ + dịch trái + co bề rộng về 0, TẤT CẢ cùng
  // lúc với chiều rộng sidebar co lại (cùng MAIN_TRANSITION, không lệch nhịp).
  // Mở lại → đợi 1 nhịp (delay) để sidebar nở gần xong rồi chữ mới hiện ra.
  // max-width (không chỉ opacity) để chữ thật sự "co vào" theo đúng chuyển
  // động của hàng, không phải biến mất đột ngột giữa chừng animation.
  const textCls = collapsed
    ? `max-w-0 opacity-0 -translate-x-2 ${MAIN_TRANSITION} delay-0`
    : `max-w-[190px] opacity-100 translate-x-0 ${MAIN_TRANSITION} delay-150`;

  return (
    <aside
      className={`shrink-0 overflow-hidden border-r border-black/10 bg-[#f7f5f2] transition-[width] ${MAIN_TRANSITION} ${position} ${collapsed ? RAIL_WIDTH : FULL_WIDTH}`}
      style={fixed ? { height: "calc(100% - 48px)" } : undefined}
    >
      <div className="flex h-full w-full flex-col overflow-hidden">
        {/* Logo + nút thu gọn/mở rộng — CÙNG 1 hàng, luôn ở trên cùng. Khi thu
            gọn, nút toggle nằm ĐÈ đúng lên vị trí logo (padding hàng khớp
            khít với logo nên 2 ô icon trùng khít nhau — xem RAIL_WIDTH ở
            trên): mặc định hiện logo, di chuột vào mới đổi sang icon toggle. */}
        <div className="group/brand relative flex h-[52px] shrink-0 items-center px-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <IconSlot>
              <div
                className={`flex size-8 items-center justify-center rounded-[9px] bg-[#1f1f1f] text-white transition-opacity duration-150 ${
                  collapsed ? "opacity-100 group-hover/brand:opacity-0" : "opacity-100"
                }`}
              >
                <DashboardIcon name="spark" />
              </div>
            </IconSlot>
            <div className={`overflow-hidden whitespace-nowrap transition-[opacity,transform,max-width] ${textCls}`}>
              <div className="text-sm font-semibold leading-none tracking-[-0.01em] text-[#1f1f1f]">
                EDUA
              </div>
              <div className="mt-1 text-[9px] uppercase leading-none tracking-[0.12em] text-[#6b6b6b]">
                AI for Educators
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            title={collapsed ? "Mở rộng thanh điều hướng" : "Thu gọn thanh điều hướng"}
            className={`absolute right-3 top-1/2 z-10 flex size-9 shrink-0 -translate-y-1/2 items-center justify-center rounded-[9px] text-[#6b6b6b] transition-colors duration-150 hover:bg-[#edeae5] hover:text-[#1f1f1f] ${
              collapsed ? "opacity-0 transition-opacity duration-150 group-hover/brand:opacity-100" : "opacity-100"
            }`}
          >
            <PanelLeft
              className={`size-[17px] transition-transform ${MAIN_TRANSITION} ${collapsed ? "rotate-180" : ""}`}
              strokeWidth={2}
            />
          </button>
        </div>

        <nav className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto space-y-2 pb-3">
          {filteredGroups.map((group, gi) => (
            <div key={group.label} className="pb-2">
              {collapsed ? (
                gi > 0 && <div className="mx-3 my-1.5 h-px shrink-0 bg-black/10" />
              ) : (
                <div
                  className={`overflow-hidden whitespace-nowrap px-3 text-[9px] font-semibold uppercase leading-[14px] tracking-[0.11em] text-[#6b6b6b] transition-[opacity,transform,max-width] ${textCls}`}
                >
                  {group.label}
                </div>
              )}
              <div className="mt-1 space-y-px">
                {group.items.map((item) => {
                  // Submenu (vd "Vật lý"/"Hóa học" lồng dưới "Mô phỏng") ẩn hẳn
                  // khi thu gọn — không đủ chỗ, và cha đã mất chỉ báo "expanded".
                  if (collapsed && item.child) return null;
                  const active = activeHref ? item.href === activeHref : item.active;

                  // "Mô phỏng" (và mọi mục có chevron mở nhóm con) chỉ là nhãn
                  // mở/đóng — không tô nền hover/active như link thường, tránh
                  // nhìn giống đang chọn trong khi thật ra là tiêu đề nhóm.
                  const isGroupHeader = Boolean(item.expanded);

                  return (
                    <Link
                      key={item.label}
                      className={`group relative flex h-9 w-full items-center rounded-[9px] px-3 text-[13px] font-medium tracking-[-0.01em] transition-colors duration-150 ${
                        isGroupHeader
                          ? "text-[#6b6b6b]"
                          : `hover:bg-[#edeae5] hover:text-[#1f1f1f] ${active ? "bg-[#edeae5] text-[#1f1f1f]" : "text-[#6b6b6b]"}`
                      } ${item.child && !collapsed ? "ml-6 w-[calc(100%-24px)]" : ""} ${collapsed ? "" : "gap-2.5"}`}
                      href={item.href}
                    >
                      <IconSlot>
                        <DashboardIcon name={item.icon} />
                      </IconSlot>
                      <span className={`min-w-0 flex-1 overflow-hidden whitespace-nowrap transition-[opacity,transform,max-width] ${textCls}`}>
                        {item.label}
                      </span>
                      {item.expanded && !collapsed ? (
                        <DashboardIcon name="chevronUp" className="size-[13px] shrink-0" />
                      ) : null}
                      {collapsed ? <Tooltip label={item.label} /> : null}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="mt-auto shrink-0 border-t border-[#d8d1c9] py-3">
          <div className={`group relative flex items-center rounded-xl px-3 py-1 ${collapsed ? "" : "gap-2"}`}>
            <IconSlot>
              <div className="relative flex size-[34px] items-center justify-center rounded-xl bg-[#1f1f1f] text-xs font-semibold text-white">
                {initials}
                <span className="absolute bottom-0 right-0 size-2 rounded-full border border-white bg-[#80cfa0]" />
              </div>
            </IconSlot>
            <div className={`min-w-0 flex-1 overflow-hidden whitespace-nowrap transition-[opacity,transform,max-width] ${textCls}`}>
              <div className="truncate text-[13px] font-medium text-[#1f1f1f]">
                {displayName}
              </div>
              <div className="truncate text-[11px] text-[#6b6b6b]">
                {displayRole}{user?.subject ? ` · ${user.subject}` : ""}
              </div>
            </div>
            {collapsed ? <Tooltip label={displayName} /> : null}
          </div>
        </div>
      </div>
    </aside>
  );
}
