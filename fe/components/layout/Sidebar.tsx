import Link from "next/link";
import { navGroups } from "../dashboard/data";
import { DashboardIcon } from "../ui/DashboardIcon";

interface SidebarProps {
  collapsed?: boolean;
  activeHref?: string;
  /** Render as a fixed full-height overlay layer instead of an in-flow column. */
  fixed?: boolean;
}

export function Sidebar({ collapsed = false, activeHref, fixed = false }: SidebarProps) {
  const position = fixed
    ? "fixed top-12 left-0 z-40 flex flex-col"
    : "flex flex-col";
  const visibility = collapsed
    ? "w-0 min-w-0 border-r-0 p-0 opacity-0 pointer-events-none"
    : "w-[280px] min-w-[280px] border-r border-black/10 px-3 opacity-100";

  return (
    <aside
      className={`shrink-0 overflow-hidden bg-[#f7f5f2] transition-[width,min-width,opacity,padding,border] duration-300 ${position} ${visibility}`}
      aria-hidden={collapsed}
      style={fixed ? { height: "calc(100% - 48px)" } : undefined}
    >
      <div className={collapsed ? "flex h-full w-0 flex-col overflow-hidden" : "flex h-full w-[256px] flex-col"}>
        <div className="flex h-[56px] shrink-0 items-center px-2">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-[9px] bg-[#1f1f1f] text-white">
              <DashboardIcon name="spark" />
            </div>
            <div>
              <div className="text-sm font-semibold leading-none tracking-[-0.01em] text-[#1f1f1f]">
                EDUA
              </div>
              <div className="mt-1 text-[9px] uppercase leading-none tracking-[0.12em] text-[#6b6b6b]">
                AI for Educators
              </div>
            </div>
          </div>
        </div>

        <nav className="min-h-0 flex-1 overflow-y-auto space-y-2 pb-3">
          {navGroups.map((group) => (
            <div key={group.label} className="pb-2">
              <div className="px-2 text-[9px] font-semibold uppercase leading-[14px] tracking-[0.11em] text-[#6b6b6b]">
                {group.label}
              </div>
              <div className="mt-1 space-y-px">
                {group.items.map((item) => {
                  const active = activeHref ? item.href === activeHref : item.active;

                  return (
                    <Link
                      key={item.label}
                      className={`flex h-9 items-center gap-2.5 rounded-[9px] px-3 text-[13px] font-medium tracking-[-0.01em] transition hover:bg-[#edeae5] hover:text-[#1f1f1f] ${
                        active ? "bg-[#edeae5] text-[#1f1f1f]" : "text-[#6b6b6b]"
                      } ${item.child ? "ml-6 w-[calc(100%-24px)]" : ""}`}
                      href={item.href}
                    >
                      <DashboardIcon name={item.icon} />
                      <span className="flex-1">{item.label}</span>
                      {item.expanded ? <DashboardIcon name="chevronUp" className="size-[13px]" /> : null}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="mt-auto shrink-0 border-t border-[#d8d1c9] py-3">
          <div className="flex items-center gap-2 rounded-xl px-3 py-3">
            <div className="relative flex size-[34px] items-center justify-center rounded-xl bg-[#1f1f1f] text-xs font-semibold text-white">
              NH
              <span className="absolute bottom-0 right-0 size-2 rounded-full border border-white bg-[#80cfa0]" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13px] font-medium text-[#1f1f1f]">
                Nguyen Thi Hoa
              </div>
              <div className="truncate text-[11px] text-[#6b6b6b]">
                {"GV V\u1eadt l\u00fd \u00b7 THPT Qu\u1ed1c Gia"}
              </div>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}