"use client";

import type { ReactNode } from "react";
import { ZoomIn, ZoomOut } from "lucide-react";

function ZoomButton({
  title,
  onClick,
  disabled = false,
  children,
}: {
  title: string;
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      className="flex h-8 w-8 items-center justify-center rounded-[8px] text-slate-300 transition-colors duration-150 ease-out hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-transparent disabled:hover:text-slate-300"
    >
      {children}
    </button>
  );
}

/** Cum nut zoom noi dung chung cho cac renderer mo phong. */
export function ZoomControls({
  percent,
  onZoomIn,
  onZoomOut,
  className = "right-3 top-3 justify-end",
}: {
  percent: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  className?: string;
}) {
  return (
    <div className={`pointer-events-none absolute flex ${className}`}>
      <div className="pointer-events-auto flex items-center gap-0.5 rounded-[10px] border border-white/10 bg-[#0f172a]/90 px-1 py-1 shadow-lg backdrop-blur">
        <ZoomButton title="Thu nho" onClick={onZoomOut} disabled={percent <= 100}>
          <ZoomOut className="h-4 w-4" strokeWidth={2} />
        </ZoomButton>
        <span className="w-11 select-none text-center font-mono text-[11px] text-slate-300">{percent}%</span>
        <ZoomButton title="Phong to" onClick={onZoomIn}>
          <ZoomIn className="h-4 w-4" strokeWidth={2} />
        </ZoomButton>
      </div>
    </div>
  );
}
