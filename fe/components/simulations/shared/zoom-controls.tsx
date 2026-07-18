"use client";

import type { ReactNode } from "react";
import { ZoomIn, ZoomOut } from "lucide-react";

function ZoomButton({ title, onClick, children }: { title: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className="flex h-8 w-8 items-center justify-center rounded-[8px] text-slate-300 transition-colors duration-150 ease-out hover:bg-white/10 hover:text-white"
    >
      {children}
    </button>
  );
}

/** Cụm nút zoom nổi ở góc phải phía trên — dùng chung cho mọi renderer. */
export function ZoomControls({
  percent,
  onZoomIn,
  onZoomOut,
}: {
  percent: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
}) {
  return (
    <div className="pointer-events-none absolute right-3 top-3 z-20">
      <div className="pointer-events-auto flex items-center gap-0.5 rounded-[10px] border border-white/10 bg-[#0f172a]/90 px-1 py-1 shadow-lg backdrop-blur">
        <ZoomButton title="Thu nhỏ" onClick={onZoomOut}>
          <ZoomOut className="h-4 w-4" strokeWidth={2} />
        </ZoomButton>
        <span className="w-11 select-none text-center font-mono text-[11px] text-slate-300">{percent}%</span>
        <ZoomButton title="Phóng to" onClick={onZoomIn}>
          <ZoomIn className="h-4 w-4" strokeWidth={2} />
        </ZoomButton>
      </div>
    </div>
  );
}
