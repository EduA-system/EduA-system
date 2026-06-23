import type { ReactNode } from "react";
import { DashboardIcon } from "./DashboardIcon";

export function Pill({ children }: { children: ReactNode }) {
  return (
    <button className="h-8 rounded-full border border-[#d8d1c9] bg-white px-[15px] text-[12px] font-medium text-[#1f1f1f] shadow-[0_1px_1px_rgba(0,0,0,0.03)]">
      {children}
    </button>
  );
}

export function SelectPill({ children }: { children: ReactNode }) {
  return (
    <button className="flex h-[34px] items-center gap-2 rounded-lg border border-[#d8d1c9] bg-[#faf9f7] px-3 text-[12px] font-medium text-[#6b6b6b]">
      {children}
      <DashboardIcon name="chevronDown" className="size-3" />
    </button>
  );
}
