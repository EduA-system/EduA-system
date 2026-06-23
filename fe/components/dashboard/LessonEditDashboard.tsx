"use client";

import { useState } from "react";
import { AssistantPanel } from "../layout/AssistantPanel";
import { DashboardIcon } from "../ui/DashboardIcon";
import { Sidebar } from "../layout/Sidebar";
import { LessonEditor } from "../LessonEditor";

export function LessonEditDashboard() {
  const [showAssistant, setShowAssistant] = useState(true);

  return (
    <main className="h-screen w-full overflow-hidden bg-[#f5f1ec] text-[#171717]">
      <div className="flex h-full w-full">
        <Sidebar />
        <section className="relative min-w-0 flex-1 overflow-y-auto bg-[#f5f1ec] px-5 py-8 sm:px-8 lg:px-10 lg:py-12">
          <button
            type="button"
            onClick={() => setShowAssistant((current) => !current)}
            className="absolute right-5 top-5 z-10 flex h-9 items-center gap-2 rounded-[10px] border border-[#d8d1c9] bg-white px-3 text-[12px] font-medium text-[#6b6b6b] shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition hover:border-[#c8beb5] hover:text-[#171717] sm:right-8 lg:right-10"
            aria-pressed={showAssistant}
            aria-label={showAssistant ? "Ẩn EDUA AI" : "Hiện EDUA AI"}
          >
            <DashboardIcon name="aiBadge" />
            {showAssistant ? "Ẩn AI" : "Hiện AI"}
          </button>

          <div className="mx-auto w-full max-w-[980px]">
            <LessonEditor />
          </div>
        </section>
        {showAssistant ? <AssistantPanel /> : null}
      </div>
    </main>
  );
}
