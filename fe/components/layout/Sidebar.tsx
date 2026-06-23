import { navGroups } from "../dashboard/data";
import { DashboardIcon } from "../ui/DashboardIcon";

export function Sidebar() {
  return (
    <aside className="hidden h-screen w-[280px] shrink-0 overflow-y-auto border-r border-black/10 bg-[#f7f5f2] px-3 lg:flex lg:flex-col">
      <div className="flex h-[68px] items-center justify-between px-2">
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
        <button className="relative flex size-8 items-center justify-center rounded-lg border border-black/10 bg-[#faf9f7] text-[#6b6b6b]" aria-label="Thông báo">
          <DashboardIcon name="notification" />
          <span className="absolute right-1.5 top-1.5 size-1.5 rounded-[3px] border border-[#f7f5f2] bg-[#d97757]" />
        </button>
      </div>

      <nav className="flex-1 space-y-2">
        {navGroups.map((group) => (
          <div key={group.label} className="pb-2">
            <div className="px-2 text-[9px] font-semibold uppercase leading-[14px] tracking-[0.11em] text-[#6b6b6b]">
              {group.label}
            </div>
            <div className="mt-1 space-y-px">
              {group.items.map((item) => (
                <a
                  key={item.label}
                  className={`flex h-9 items-center gap-2.5 rounded-[9px] px-3 text-[13px] font-medium tracking-[-0.01em] ${
                    item.active ? "bg-[#edeae5] text-[#1f1f1f]" : "text-[#6b6b6b]"
                  } ${item.child ? "ml-6 w-[calc(100%-24px)]" : ""}`}
                  href="#"
                >
                  <DashboardIcon name={item.icon} />
                  <span className="flex-1">{item.label}</span>
                  {item.expanded ? <DashboardIcon name="chevronUp" className="size-[13px]" /> : null}
                </a>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-[#d8d1c9] py-3">
        <div className="flex items-center gap-2 rounded-xl px-3 py-3">
          <div className="relative flex size-[34px] items-center justify-center rounded-xl bg-[#1f1f1f] text-xs font-semibold text-white">
            NH
            <span className="absolute bottom-0 right-0 size-2 rounded-full border border-white bg-[#80cfa0]" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[13px] font-medium text-[#1f1f1f]">
              Nguyễn Thị Hoa
            </div>
            <div className="truncate text-[11px] text-[#6b6b6b]">
              GV Vật lý · THPT Quốc Gia
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
