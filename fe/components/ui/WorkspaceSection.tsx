import type { ReactNode } from "react";
import { DashboardIcon } from "./DashboardIcon";

export function WorkspaceSection({
  title,
  icon,
  children,
}: {
  title: string;
  icon: string;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-[14px] border border-[#d8d1c9] bg-white">
      <div className="flex h-[50px] items-center justify-between border-b border-[#d8d1c9]/60 px-5">
        <div className="flex items-center gap-2.5 text-[13px] font-semibold text-[#171717]">
          <DashboardIcon name={icon} />
          {title}
        </div>
        <DashboardIcon name="chevronUp" className="size-[14px]" />
      </div>
      <div className="px-5 py-[18px]">{children}</div>
    </section>
  );
}
