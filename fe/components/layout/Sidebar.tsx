"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { navGroups } from "../dashboard/data";
import { DashboardIcon } from "../ui/DashboardIcon";
import { useAuth } from "@/lib/auth/AuthContext";
import { canAccessRoute, hasAnyRole } from "@/lib/auth/permissions";
import { canAccessSubjectScope } from "@/lib/auth/subject-access";
import { getUnreadCount } from "@/lib/notifications";
import { connectNotificationsStream } from "@/lib/ws/notifications-client";

interface SidebarProps {
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
  activeHref?: string;
  fixed?: boolean;
  /** @deprecated Sidebar is responsive by default; retained for existing callers. */
  responsive?: boolean;
  mobileOpen?: boolean;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export function Sidebar({
  collapsed,
  onToggleCollapsed,
  activeHref,
  fixed = false,
  responsive = false,
  mobileOpen = false,
}: SidebarProps) {
  const { user, accessToken, authFetch } = useAuth();
  const pathname = usePathname();
  const [failedAvatarUrl, setFailedAvatarUrl] = useState<string | null>(null);
  const [internalCollapsed, setInternalCollapsed] = useState(false);
  const [internalMobileOpen, setInternalMobileOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [expandedGroupLabel, setExpandedGroupLabel] = useState<string | null | undefined>(undefined);
  const isCollapsed = collapsed ?? internalCollapsed;
  const toggleCollapsed = onToggleCollapsed ?? (() => setInternalCollapsed((current) => !current));
  const usesExternalMobileState = responsive;
  const isMobileOpen = usesExternalMobileState ? mobileOpen : internalMobileOpen;
  const closeMobileSidebar = () => {
    if (!usesExternalMobileState) setInternalMobileOpen(false);
  };
  const position = fixed
    ? "fixed top-12 left-0 z-40 flex flex-col"
    : "fixed inset-y-0 left-0 z-40 flex h-screen flex-col transition-transform duration-300 md:sticky md:top-0 md:z-auto md:h-screen md:translate-x-0";
  const visibility = isCollapsed
    ? `w-[72px] min-w-[72px] border-r border-black/10 px-2 opacity-100 ${isMobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`
    : `w-[280px] min-w-[280px] border-r border-black/10 px-3 opacity-100 ${isMobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`;

  const displayName = user?.fullName ?? user?.email ?? "Nguyen Thi Hoa";
  const initials = user ? getInitials(displayName) : "NH";
  const displayRole = user?.role === "PRINCIPAL"
    ? "Hiệu trưởng"
    : user?.role === "MODERATOR"
      ? "Người kiểm duyệt"
      : user?.role === "IT_STAFF"
        ? "Nhân viên IT"
        : user?.role === "STUDENT"
          ? "Học sinh"
      : "Giáo viên";

  useEffect(() => {
    if (!user || !accessToken) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setUnreadCount(0);
      return;
    }
    let cancelled = false;
    getUnreadCount(authFetch)
      .then((res) => {
        if (!cancelled) setUnreadCount(res.count);
      })
      .catch(() => {});
    const { disconnect } = connectNotificationsStream({
      accessToken,
      onEvent: () => setUnreadCount((count) => count + 1),
    });
    return () => {
      cancelled = true;
      disconnect();
    };
  }, [authFetch, accessToken, user]);

  if (!user) return null;

  const filteredGroups = navGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) =>
        (!item.requiredRole || hasAnyRole(user, item.requiredRole)) &&
        canAccessSubjectScope(user, item.requiredSubjects) &&
        canAccessRoute(item.href, user),
      ),
    }))
    .filter((group) => group.items.length > 0);
  const currentHref = activeHref ?? pathname;
  const activeGroupLabel = filteredGroups.find((group) =>
    group.items.some((item) => item.href === currentHref || (item.href !== "/" && currentHref.startsWith(`${item.href}/`))),
  )?.label;


  return (
    <>
      {!usesExternalMobileState && isMobileOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-black/25 md:hidden"
          aria-label="Đóng menu chức năng"
          onClick={closeMobileSidebar}
        />
      ) : null}
      {!usesExternalMobileState ? (
        <button
          type="button"
          className="fixed left-4 top-4 z-30 inline-flex size-9 items-center justify-center rounded-lg border border-[#d8d1c9] bg-[#f7f5f2] text-[#1f1f1f] shadow-sm transition hover:bg-[#edeae5] md:hidden"
          aria-label="Mở menu chức năng"
          onClick={() => setInternalMobileOpen(true)}
        >
          <MenuIcon />
        </button>
      ) : null}
      <aside
      className={`shrink-0 overflow-hidden bg-[#f7f5f2] transition-[width,min-width,opacity,padding,border,transform] duration-300 ${position} ${visibility}`}
      aria-hidden={false}
      style={fixed ? { height: "calc(100% - 48px)" } : undefined}
    >
      <div className={isCollapsed ? "flex h-full w-full flex-col overflow-hidden" : "flex h-full w-[256px] flex-col"}>
        <div className={`relative flex shrink-0 px-2 ${isCollapsed ? "h-[88px] flex-col items-center justify-center gap-2" : "h-[56px] items-center justify-between"}`}>
          <Link href="/dashboard" className="flex items-center gap-2.5 rounded-lg transition hover:opacity-80">
            <div className="flex size-8 items-center justify-center rounded-[9px] bg-[#1f1f1f] text-white">
              <DashboardIcon name="spark" />
            </div>
            <div className={isCollapsed ? "hidden" : ""}>
              <div className="text-sm font-semibold leading-none tracking-[-0.01em] text-[#1f1f1f]">EDUA</div>
              <div className="mt-1 text-[9px] uppercase leading-none tracking-[0.12em] text-[#6b6b6b]">AI for Educators</div>
            </div>
          </Link>
          <button
            type="button"
            onClick={toggleCollapsed}
            className="flex size-8 shrink-0 items-center justify-center rounded-lg text-[#6b6b6b] transition hover:bg-[#edeae5] hover:text-[#1f1f1f]"
            aria-label={isCollapsed ? "Mở rộng sidebar" : "Thu gọn sidebar"}
            title={isCollapsed ? "Mở rộng sidebar" : "Thu gọn sidebar"}
          >
            <SidebarCollapseIcon collapsed={isCollapsed} />
          </button>
        </div>

        <nav className="scrollbar-none min-h-0 flex-1 space-y-2 overflow-y-auto pb-3">
          {filteredGroups.map((group) => {
            const selectedGroupLabel = expandedGroupLabel === undefined ? activeGroupLabel : expandedGroupLabel;
            const isGroupExpanded = isCollapsed || selectedGroupLabel === group.label;
            return (
            <div key={group.label} className="pb-2">
              {!isCollapsed ? (
                <button
                  type="button"
                  className="flex w-full items-center justify-between rounded-lg px-2 py-1 text-left text-[9px] font-semibold uppercase leading-[14px] tracking-[0.11em] text-[#6b6b6b] transition hover:bg-[#edeae5] hover:text-[#1f1f1f]"
                  aria-expanded={isGroupExpanded}
                  onClick={() => setExpandedGroupLabel(isGroupExpanded ? null : group.label)}
                >
                  <span>{group.label}</span>
                  <DashboardIcon name={isGroupExpanded ? "chevronUp" : "chevronDown"} className="size-3" />
                </button>
              ) : null}
              {isGroupExpanded ? <div className="mt-1 space-y-px">
                {group.items.map((item) => {
                  const active = item.href === currentHref || (item.href !== "/" && currentHref.startsWith(`${item.href}/`));
                  return (
                    <Link
                      key={item.label}
                      title={isCollapsed ? item.label : undefined}
                      className={`relative flex h-9 items-center rounded-[9px] text-[13px] font-medium tracking-[-0.01em] transition hover:bg-[#edeae5] hover:text-[#1f1f1f] ${isCollapsed ? "justify-center px-0" : "gap-2.5 px-3"} ${active ? "bg-[#edeae5] text-[#1f1f1f]" : "text-[#6b6b6b]"} ${!isCollapsed && item.child ? "ml-6 w-[calc(100%-24px)]" : ""}`}
                      href={item.href}
                      onClick={() => {
                        setExpandedGroupLabel(group.label);
                        closeMobileSidebar();
                      }}
                    >
                      <DashboardIcon name={item.icon} />
                      <span className={isCollapsed ? "sr-only" : "flex-1"}>{item.label}</span>
                      {item.href === "/notifications" && unreadCount > 0 ? (
                        <span className={`flex h-4 min-w-4 items-center justify-center rounded-full bg-[#e8724a] px-1 text-[10px] font-semibold text-white ${isCollapsed ? "absolute right-1 top-0" : ""}`}>
                          {unreadCount > 99 ? "99+" : unreadCount}
                        </span>
                      ) : null}
                      {!isCollapsed && item.expanded ? <DashboardIcon name="chevronUp" className="size-[13px]" /> : null}
                    </Link>
                  );
                })}
              </div> : null}
            </div>
          )})}
        </nav>

        <div className="mt-auto shrink-0 border-t border-[#d8d1c9] py-3">
          <Link href="/user-profile" title={isCollapsed ? displayName : undefined} className={`flex items-center rounded-xl py-3 transition hover:bg-[#edeae5] ${isCollapsed ? "justify-center px-0" : "gap-2 px-3"} ${activeHref === "/user-profile" ? "bg-[#edeae5]" : ""}`}>
            <div className="relative flex size-[34px] shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#1f1f1f] text-xs font-semibold text-white">
              {user?.avatarUrl && failedAvatarUrl !== user.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.avatarUrl} alt="" className="size-full object-cover" onError={() => setFailedAvatarUrl(user.avatarUrl)} />
              ) : initials}
              <span className="absolute bottom-0 right-0 size-2 rounded-full border border-white bg-[#80cfa0]" />
            </div>
            <div className={isCollapsed ? "hidden" : "min-w-0 flex-1"}>
              <div className="truncate text-[13px] font-medium text-[#1f1f1f]">{displayName}</div>
              <div className="truncate text-[11px] text-[#6b6b6b]">{displayRole}{user?.subject ? ` · ${user.subject}` : ""}</div>
            </div>
          </Link>
        </div>
      </div>
      </aside>
    </>
  );
}

function MenuIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

function SidebarCollapseIcon({ collapsed }: { collapsed: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="2.5" y="3" width="11" height="10" rx="2" />
      <path d="M6 3v10" />
      <path d={collapsed ? "M8.5 6 11 8 8.5 10" : "M11 6 8.5 8 11 10"} />
    </svg>
  );
}
