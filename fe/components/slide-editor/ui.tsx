"use client";

// Primitives dùng chung cho toolbar (port từ /test-slide, đổi palette cho khớp theme).

import type { ReactNode } from "react";

export function ToolBtn({
  active = false,
  onClick,
  title,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  title?: string;
  children: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`flex h-8 min-w-8 items-center justify-center rounded-[10px] px-1.5 text-[13px] transition-colors ${
        active ? "bg-[#f6eadf] text-[#2b2926]" : "text-[#4f4943] hover:bg-[#f7f3ee]"
      }`}
    >
      {children}
    </button>
  );
}

// Vạch ngăn dọc giữa các nhóm control trên toolbar.
export function Sep() {
  return <div className="mx-1 h-5 w-px shrink-0 bg-black/10" />;
}

const numCls =
  "w-12 rounded-[10px] border border-[#e8e2d9] bg-[#fbfaf8] px-1 py-0.5 text-xs text-[#2b2926] focus:border-[#d97757] focus:outline-none";
const labelCls = "flex items-center gap-1 text-[10px] text-[#8a8178] shrink-0";

// Ô số có nhãn dùng chung cho toolbar (cỡ, X/Y/W/H, giãn dòng…).
export function NumField({
  label,
  value,
  min,
  onChange,
  w = "w-12",
}: {
  label: string;
  value: number;
  min?: number;
  onChange: (v: number) => void;
  w?: string;
}) {
  return (
    <label className={labelCls}>
      <span>{label}</span>
      <input
        type="number"
        min={min}
        value={Math.round(value)}
        onChange={(e) => onChange(Number(e.target.value))}
        className={`${numCls} ${w}`}
      />
    </label>
  );
}

export function AlignIcon({ align }: { align: "left" | "center" | "right" }) {
  if (align === "left")
    return (
      <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
        <line x1="1" y1="3" x2="11" y2="3" />
        <line x1="1" y1="6" x2="7" y2="6" />
        <line x1="1" y1="9" x2="9" y2="9" />
      </svg>
    );
  if (align === "center")
    return (
      <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
        <line x1="1" y1="3" x2="11" y2="3" />
        <line x1="3" y1="6" x2="9" y2="6" />
        <line x1="2" y1="9" x2="10" y2="9" />
      </svg>
    );
  return (
    <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
      <line x1="1" y1="3" x2="11" y2="3" />
      <line x1="5" y1="6" x2="11" y2="6" />
      <line x1="3" y1="9" x2="11" y2="9" />
    </svg>
  );
}

// Chevron nhỏ đặt cạnh icon/label cho nút mở popover (kiểu Canva).
export function Chevron() {
  return (
    <svg className="ml-0.5 h-2.5 w-2.5 opacity-50" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M3 4.5 6 7.5 9 4.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Bút highlight (màu nền chữ).
export function HighlightIcon() {
  return (
    <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 4l6 6-9 9H5v-6z" />
      <path d="M11 7l6 6" />
      <line x1="4" y1="21" x2="20" y2="21" />
    </svg>
  );
}

// Danh sách (bullet).
export function ListIcon() {
  return (
    <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
      <line x1="9" y1="6" x2="20" y2="6" />
      <line x1="9" y1="12" x2="20" y2="12" />
      <line x1="9" y1="18" x2="20" y2="18" />
      <circle cx="4.5" cy="6" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="4.5" cy="12" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="4.5" cy="18" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  );
}

// Giãn dòng (mũi tên dọc + dòng kẻ).
export function LineSpacingIcon() {
  return (
    <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <line x1="10" y1="6" x2="21" y2="6" />
      <line x1="10" y1="12" x2="21" y2="12" />
      <line x1="10" y1="18" x2="21" y2="18" />
      <path d="M5 4v16" />
      <path d="M3 6l2-2 2 2" />
      <path d="M3 18l2 2 2-2" />
    </svg>
  );
}

// Độ trong suốt.
export function OpacityIcon() {
  return (
    <svg className="h-[18px] w-[18px]" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path d="M2 2h14v14H2z" fill="#fff" />
      <path d="M2 2h3.5v3.5H2zM9 2h3.5v3.5H9zM5.5 5.5H9V9H5.5zM12.5 5.5H16V9h-3.5zM2 9h3.5v3.5H2zM9 9h3.5v3.5H9zM5.5 12.5H9V16H5.5zM12.5 12.5H16V16h-3.5z" fill="#b8aea5" />

    </svg>
  );
}
