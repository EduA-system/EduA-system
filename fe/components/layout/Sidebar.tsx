"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import { PanelLeft } from "lucide-react";
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

const COLLAPSED_STORAGE_KEY = "edua-sidebar-collapsed";
const COLLAPSED_CHANGE_EVENT = "edua-sidebar-collapsed-change";
const FULL_WIDTH = "w-[264px] min-w-[264px]";
const RAIL_WIDTH = "w-[66px] min-w-[66px]";
const MOTION = "duration-[340ms] ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:duration-0";

function readCollapsed(): boolean {
  return typeof window !== "undefined" && window.localStorage.getItem(COLLAPSED_STORAGE_KEY) === "1";
}

function getServerCollapsed(): boolean {
  return false;
}

function writeCollapsed(value: boolean) {
  window.localStorage.setItem(COLLAPSED_STORAGE_KEY, value ? "1" : "0");
  window.dispatchEvent(new Event(COLLAPSED_CHANGE_EVENT));
}

function subscribeCollapsed(callback: () => void): () => void {
  window.addEventListener(COLLAPSED_CHANGE_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(COLLAPSED_CHANGE_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function isActiveHref(itemHref: string, currentHref: string): boolean {
  return itemHref === currentHref || (itemHref !== "/" && currentHref.startsWith(`${itemHref}/`));
}

export function Sidebar({
  collapsed,
  onToggleCollapsed,
  activeHref,
  fixed = false,
  responsive = false,
  mobileOpen = false,
}: SidebarProps) {
  const { user, accessToken, authFetch, getValidAccessToken, status } = useAuth();
  const pathname = usePathname();
  const persistedCollapsed = useSyncExternalStore(subscribeCollapsed, readCollapsed, getServerCollapsed);
  const [failedAvatarUrl, setFailedAvatarUrl] = useState<string | null>(null);
  const [internalMobileOpen, setInternalMobileOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [collapsedGroupLabels, setCollapsedGroupLabels] = useState<Set<string>>(() => new Set());

  const isCollapsed = collapsed ?? persistedCollapsed;
  const usesExternalMobileState = responsive;
  const isMobileOpen = usesExternalMobileState ? mobileOpen : internalMobileOpen;
  const currentHref = activeHref ?? pathname;

  const closeMobileSidebar = () => {
    if (!usesExternalMobileState) setInternalMobileOpen(false);
  };

  const toggleCollapsed = () => {
    if (onToggleCollapsed) {
      onToggleCollapsed();
      return;
    }
    writeCollapsed(!isCollapsed);
  };

  const displayName = user?.fullName ?? user?.email ?? "Nguyễn Thị Hoa";
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
      .then((response) => {
        if (!cancelled) setUnreadCount(response.count);
      })
      .catch(() => {});
    const { disconnect } = connectNotificationsStream({
      getAccessToken: getValidAccessToken,
      onEvent: () => setUnreadCount((count) => count + 1),
    });
    return () => {
      cancelled = true;
      disconnect();
    };
  }, [authFetch, accessToken, getValidAccessToken, user]);

  if (!user) {
    if (status !== "loading") return null;
    return (
      <aside aria-hidden className="hidden h-screen w-[264px] min-w-[264px] shrink-0 border-r border-black/10 bg-[#f7f5f2] px-3 py-4 md:block">
        <div className="h-10 w-36 animate-pulse rounded-lg bg-[#e7e2dc]" />
        <div className="mt-8 space-y-3">
          {[1, 2, 3, 4, 5, 6].map((item) => <div key={item} className="h-9 animate-pulse rounded-xl bg-[#ece8e2]" />)}
        </div>
      </aside>
    );
  }

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

  const position = fixed
    ? "fixed left-0 top-12 z-40 flex flex-col"
    : "fixed inset-y-0 left-0 z-40 flex h-screen flex-col md:sticky md:top-0 md:z-auto md:h-screen md:translate-x-0";
  const mobileTransform = isMobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0";
  const textMotion = isCollapsed
    ? `max-w-0 -translate-x-2 opacity-0 delay-0 ${MOTION}`
    : `max-w-[170px] translate-x-0 opacity-100 delay-100 ${MOTION}`;

  return (
    <>
      {!usesExternalMobileState && isMobileOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-black/25 backdrop-blur-[1px] md:hidden"
          aria-label="Đóng menu chức năng"
          onClick={closeMobileSidebar}
        />
      ) : null}

      {!usesExternalMobileState ? (
        <button
          type="button"
          className="fixed left-4 top-4 z-30 inline-flex size-10 items-center justify-center rounded-xl border border-[#d8d1c9] bg-[#f7f5f2] text-[#1f1f1f] shadow-sm transition-colors hover:bg-[#edeae5] md:hidden"
          aria-label="Mở menu chức năng"
          onClick={() => setInternalMobileOpen(true)}
        >
          <MenuIcon />
        </button>
      ) : null}

      <aside
        className={`shrink-0 overflow-hidden border-r border-black/10 bg-[#f7f5f2] transition-[width,min-width,transform] ${MOTION} ${position} ${mobileTransform} ${isCollapsed ? RAIL_WIDTH : FULL_WIDTH}`}
        style={fixed ? { height: "calc(100% - 48px)" } : undefined}
      >
        <div className="flex h-full w-full flex-col overflow-hidden">
          <div className="group/brand relative flex h-[64px] shrink-0 items-center px-[13px]">
            <Link href="/dashboard" className="flex min-w-0 items-center gap-2.5 rounded-xl" onClick={closeMobileSidebar}>
              <span className="flex size-10 shrink-0 items-center justify-center">
                <span className={`flex size-9 items-center justify-center rounded-[10px] bg-[#1f1f1f] text-white transition-opacity duration-150 ${isCollapsed ? "group-hover/brand:opacity-0" : ""}`}>
                  <DashboardIcon name="spark" className="size-[18px]" />
                </span>
              </span>
              <span className={`overflow-hidden whitespace-nowrap transition-[max-width,opacity,transform] ${textMotion}`}>
                <span className="block text-[15px] font-semibold leading-none tracking-[-0.01em] text-[#1f1f1f]">EDUA</span>
                <span className="mt-1 block text-[10px] uppercase leading-none tracking-[0.12em] text-[#6b6b6b]">AI for Educators</span>
              </span>
            </Link>
            <button
              type="button"
              onClick={toggleCollapsed}
              className={`absolute right-[13px] top-1/2 z-10 flex size-10 -translate-y-1/2 items-center justify-center rounded-[10px] text-[#6b6b6b] transition-[color,background-color,opacity] duration-150 hover:bg-[#edeae5] hover:text-[#1f1f1f] ${isCollapsed ? "opacity-0 group-hover/brand:opacity-100 focus-visible:opacity-100" : "opacity-100"}`}
              aria-label={isCollapsed ? "Mở rộng thanh điều hướng" : "Thu gọn thanh điều hướng"}
              title={isCollapsed ? "Mở rộng thanh điều hướng" : "Thu gọn thanh điều hướng"}
            >
              <PanelLeft className={`size-[19px] transition-transform ${MOTION} ${isCollapsed ? "rotate-180" : ""}`} strokeWidth={2} />
            </button>
          </div>

          <div className="mx-[13px] mb-3 h-px shrink-0 bg-black/10" aria-hidden />

          <nav className="scrollbar-none min-h-0 flex-1 space-y-1 overflow-x-hidden overflow-y-auto pb-3" aria-label="Điều hướng chính">
            {filteredGroups.map((group, groupIndex) => {
              const isGroupExpanded = isCollapsed || !collapsedGroupLabels.has(group.label);
              return (
                <section key={group.label} className="pb-1">
                  {isCollapsed ? (
                    groupIndex > 0 ? <div className="mx-4 my-2 h-px bg-black/10" aria-hidden /> : null
                  ) : (
                    <button
                      type="button"
                      className="flex w-full items-center justify-between rounded-lg px-[17px] py-1.5 text-left text-[10px] font-semibold uppercase leading-4 tracking-[0.11em] text-[#6b6b6b] transition-colors hover:bg-[#edeae5] hover:text-[#1f1f1f]"
                      aria-expanded={isGroupExpanded}
                      onClick={() => setCollapsedGroupLabels((current) => {
                        const next = new Set(current);
                        if (next.has(group.label)) next.delete(group.label);
                        else next.add(group.label);
                        return next;
                      })}
                    >
                      <span>{group.label}</span>
                      <DashboardIcon name="chevronDown" className={`size-3 transition-transform ${MOTION} ${isGroupExpanded ? "rotate-180" : ""}`} />
                    </button>
                  )}

                  <div className={`grid transition-[grid-template-rows,opacity] ${MOTION} ${isGroupExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
                    <div className="min-h-0 overflow-hidden">
                      <div className="mt-1 space-y-px">
                        {group.items.map((item) => {
                          const groupHeader = Boolean(item.expanded);
                          if (isCollapsed && groupHeader) return null;
                          if (groupHeader) {
                            return (
                              <div
                                key={`${item.href}-${item.label}`}
                                className="mx-[13px] flex h-8 w-[calc(100%-26px)] items-center px-2.5 text-[12px] font-medium text-[#6b6b6b]"
                              >
                                {item.label}
                              </div>
                            );
                          }
                          const active = isActiveHref(item.href, currentHref);
                          return (
                            <Link
                              key={`${item.href}-${item.label}`}
                              href={item.href}
                              title={isCollapsed ? item.label : undefined}
                              aria-current={active ? "page" : undefined}
                              onClick={() => {
                                closeMobileSidebar();
                              }}
                              className={`group relative flex h-10 items-center rounded-[10px] text-[14px] font-medium tracking-[-0.01em] transition-colors duration-150 ${
                                isCollapsed ? "mx-auto w-10 justify-center" : `mx-[13px] gap-2.5 px-2.5 ${item.child ? "ml-[21px] w-[calc(100%-34px)]" : "w-[calc(100%-26px)]"}`
                              } ${active ? "bg-[#ebe7e1] text-[#1f1f1f]" : "text-[#6b6b6b] hover:bg-[#edeae5] hover:text-[#1f1f1f]"}`}
                            >
                              <span className="flex size-6 shrink-0 items-center justify-center">
                                <DashboardIcon name={item.icon} className={item.icon === "sidebarCalendar" ? "size-4" : "size-[18px]"} />
                              </span>
                              <span className={`min-w-0 flex-1 overflow-hidden whitespace-nowrap transition-[max-width,opacity,transform] ${textMotion}`}>{item.label}</span>
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </section>
              );
            })}
          </nav>

          <div className="mt-auto shrink-0">
            <div className={isCollapsed ? "flex justify-center px-2 pb-2" : "px-[13px] pb-2"}>
              <Link
                href="/help"
                title={isCollapsed ? "Trợ giúp" : undefined}
                aria-current={isActiveHref("/help", currentHref) ? "page" : undefined}
                onClick={closeMobileSidebar}
                className={`flex h-10 items-center rounded-xl text-[#625c55] transition-colors hover:bg-[#edeae5] hover:text-[#1f1f1f] ${isCollapsed ? "w-10 justify-center" : "w-full gap-2.5 px-3"} ${isActiveHref("/help", currentHref) ? "bg-[#ebe7e1] text-[#1f1f1f]" : ""}`}
              >
                <DashboardIcon name="help" className="size-[18px]" />
                <span className={`overflow-hidden whitespace-nowrap text-[13px] font-medium transition-[max-width,opacity,transform] ${textMotion}`}>Trợ giúp</span>
              </Link>
            </div>

            <div className={`border-t border-[#d8d1c9] ${isCollapsed ? "flex flex-col items-center gap-1 py-3" : "flex items-center gap-1.5 p-[13px]"}`}>
            <Link
              href="/user-profile"
              title={isCollapsed ? displayName : undefined}
              aria-current={isActiveHref("/user-profile", currentHref) ? "page" : undefined}
              onClick={closeMobileSidebar}
              className={`group relative flex min-w-0 items-center rounded-xl transition-colors hover:bg-[#edeae5] ${isCollapsed ? "size-10 justify-center" : "h-12 flex-1 gap-2 px-1.5"} ${isActiveHref("/user-profile", currentHref) ? "bg-[#edeae5]" : ""}`}
            >
              <span className="relative flex size-[37px] shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#1f1f1f] text-[13px] font-semibold text-white">
                {user.avatarUrl && failedAvatarUrl !== user.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={user.avatarUrl} alt="" className="size-full object-cover" onError={() => setFailedAvatarUrl(user.avatarUrl)} />
                ) : initials}
                <span className="absolute bottom-0 right-0 size-2 rounded-full border border-white bg-[#80cfa0]" />
              </span>
              <span className={`min-w-0 flex-1 overflow-hidden whitespace-nowrap transition-[max-width,opacity,transform] ${textMotion}`}>
                <span className="block truncate text-[14px] font-medium text-[#1f1f1f]">{displayName}</span>
                <span className="block truncate text-[12px] text-[#6b6b6b]">{displayRole}{user.subject ? ` · ${user.subject}` : ""}</span>
              </span>
            </Link>

            <Link
              href="/notifications"
              title="Thông báo"
              aria-label={unreadCount > 0 ? `Thông báo, ${unreadCount} chưa đọc` : "Thông báo"}
              aria-current={isActiveHref("/notifications", currentHref) ? "page" : undefined}
              onClick={closeMobileSidebar}
              className={`relative flex size-10 shrink-0 items-center justify-center rounded-xl text-[#6b6b6b] transition-colors hover:bg-[#edeae5] hover:text-[#1f1f1f] ${isActiveHref("/notifications", currentHref) ? "bg-[#ebe7e1] text-[#1f1f1f]" : ""}`}
            >
              <DashboardIcon name="notification" className="size-[19px]" />
              {unreadCount > 0 ? (
                <span className="absolute right-0 top-0 flex h-[17px] min-w-[17px] items-center justify-center rounded-full border-2 border-[#f7f5f2] bg-[#e8724a] px-0.5 text-[9px] font-semibold leading-none text-white">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              ) : null}
            </Link>
            </div>
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
