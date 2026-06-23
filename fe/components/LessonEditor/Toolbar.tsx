"use client";

import { useEffect, useRef, useState } from "react";

interface ToolbarState {
  visible: boolean;
  top: number;
  left: number;
}

export function Toolbar() {
  const [state, setState] = useState<ToolbarState>({ visible: false, top: 0, left: 0 });
  const [highlightColor, setHighlightColor] = useState("#fde68a");
  const [textColor, setTextColor] = useState("#e8724a");
  const toolbarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleSelectionChange() {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || sel.rangeCount === 0) {
        setState((s) => ({ ...s, visible: false }));
        return;
      }
      const anchor = sel.anchorNode;
      const el = anchor instanceof Element ? anchor : anchor?.parentElement;
      if (!el?.closest("[contenteditable]")) {
        setState((s) => ({ ...s, visible: false }));
        return;
      }
      const range = sel.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      if (rect.width === 0) {
        setState((s) => ({ ...s, visible: false }));
        return;
      }
      setState({ visible: true, top: rect.top - 54, left: rect.left + rect.width / 2 });
    }

    document.addEventListener("selectionchange", handleSelectionChange);
    return () => document.removeEventListener("selectionchange", handleSelectionChange);
  }, []);

  if (!state.visible) return null;

  const cmd = (command: string, value?: string) =>
    document.execCommand(command, false, value ?? undefined);

  return (
    <div
      ref={toolbarRef}
      onMouseDown={(e) => e.preventDefault()}
      style={{
        position: "fixed",
        top: state.top,
        left: state.left,
        transform: "translateX(-50%)",
        zIndex: 9999,
        backgroundColor: "#1f1f1f",
        borderRadius: 8,
        height: 42,
        display: "flex",
        alignItems: "center",
        padding: "0 8px",
        gap: 2,
        boxShadow: "0 8px 32px rgba(0,0,0,0.4), 0 2px 8px rgba(0,0,0,0.3)",
        whiteSpace: "nowrap",
      }}
    >
      {/* Văn bản dropdown */}
      <button
        onClick={() => {}}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 4,
          padding: "0 8px",
          height: 28,
          borderRadius: 5,
          color: "#ffffff",
          fontSize: 13,
          fontWeight: 400,
          background: "transparent",
          border: "none",
          cursor: "pointer",
          transition: "background 0.15s",
        }}
        onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.1)")}
        onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "transparent")}
      >
        Văn bản
        <ChevronDown />
      </button>

      <Sep />

      {/* Font size: − 13 + */}
      <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
        <ToolBtn onClick={() => {}} label="−" />
        <span style={{ color: "#ffffff", fontSize: 13, minWidth: 20, textAlign: "center" }}>13</span>
        <ToolBtn onClick={() => {}} label="+" />
      </div>

      <Sep />

      {/* B I U strikethrough link */}
      <ToolBtn onClick={() => cmd("bold")} label="B" style={{ fontWeight: 700, fontSize: 14 }} />
      <ToolBtn onClick={() => cmd("italic")} label={<ItalicIcon />} title="In nghiêng" />

      {/* U underline */}
      <ToolBtn onClick={() => cmd("underline")} label={<UnderlineIcon />} title="Gạch chân" />

      {/* Strikethrough */}
      <ToolBtn onClick={() => cmd("strikeThrough")} label={<StrikeIcon />} title="Gạch ngang" />

      {/* Link */}
      <ToolBtn onClick={() => {
        const url = prompt("Nhập URL:");
        if (url) cmd("createLink", url);
      }} label={<LinkIcon />} title="Chèn link" />

      {/* Highlight / paint color */}
      <ToolBtn
        onClick={() => {
          cmd("hiliteColor", highlightColor);
        }}
        label={<HighlightIcon color={highlightColor} />}
        title="Tô màu nền"
      />

      {/* Text color — A with color bar */}
      <ToolBtn
        onClick={() => cmd("foreColor", textColor)}
        label={<TextColorIcon color={textColor} />}
        title="Màu chữ"
      />

      <Sep />

      {/* Alignment × 4 */}
      <AlignBtn onClick={() => cmd("justifyLeft")} title="Trái"><AlignLeftIcon /></AlignBtn>
      <AlignBtn onClick={() => cmd("justifyCenter")} title="Giữa"><AlignCenterIcon /></AlignBtn>
      <AlignBtn onClick={() => cmd("justifyRight")} title="Phải"><AlignRightIcon /></AlignBtn>
      <AlignBtn onClick={() => cmd("justifyFull")} title="Đều"><AlignJustifyIcon /></AlignBtn>

      <Sep />

      {/* AI button */}
      <button
        onClick={() => {}}
        style={{
          display: "flex", alignItems: "center", gap: 5,
          padding: "0 10px", height: 28, borderRadius: 5,
          background: "transparent", border: "none", cursor: "pointer",
          transition: "background 0.15s",
        }}
        onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.1)")}
        onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "transparent")}
        title="Cải thiện bằng AI"
      >
        <SparkleIcon />
        <span style={{ color: "#f5c842", fontSize: 13, fontWeight: 600 }}>AI</span>
      </button>
    </div>
  );
}

/* ── Shared micro components ── */

function ToolBtn({
  onClick,
  label,
  style,
  title,
}: {
  onClick: () => void;
  label: React.ReactNode;
  style?: React.CSSProperties;
  title?: string;
}) {
  return (
    <button
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      title={title}
      style={{
        width: 28, height: 28, borderRadius: 5,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "transparent", border: "none", cursor: "pointer",
        color: "#ffffff", fontSize: 13, transition: "background 0.15s",
        ...style,
      }}
      onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.1)")}
      onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "transparent")}
    >
      {label}
    </button>
  );
}

function AlignBtn({ onClick, children, title }: { onClick: () => void; children: React.ReactNode; title?: string }) {
  return (
    <button
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      title={title}
      style={{
        width: 28, height: 28, borderRadius: 5,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "transparent", border: "none", cursor: "pointer",
        color: "#ffffff", transition: "background 0.15s",
      }}
      onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.1)")}
      onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "transparent")}
    >
      {children}
    </button>
  );
}

function Sep() {
  return (
    <div style={{ width: 1, height: 18, backgroundColor: "rgba(255,255,255,0.18)", margin: "0 4px", flexShrink: 0 }} />
  );
}

/* ── Icons ── */
function ChevronDown() {
  return (
    <svg width={10} height={6} viewBox="0 0 10 6" fill="none">
      <path d="M1 1l4 4 4-4" stroke="rgba(255,255,255,0.7)" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function LinkIcon() {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
    </svg>
  );
}

function StrikeIcon() {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none">
      <path d="M4 12h16" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
      <path d="M8 8c0-2.21 1.79-4 4-4s4 1.79 4 4" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
      <path d="M16 16c0 2.21-1.79 4-4 4s-4-1.79-4-4" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
    </svg>
  );
}

function AlignLeftIcon() {
  return (
    <svg width={14} height={12} viewBox="0 0 14 14" fill="none">
      <path d="M0 1h14M0 5h8M0 9h14M0 13h8" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
    </svg>
  );
}

function AlignCenterIcon() {
  return (
    <svg width={14} height={12} viewBox="0 0 14 14" fill="none">
      <path d="M0 1h14M3 5h8M0 9h14M3 13h8" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
    </svg>
  );
}

function AlignRightIcon() {
  return (
    <svg width={14} height={12} viewBox="0 0 14 14" fill="none">
      <path d="M0 1h14M6 5h8M0 9h14M6 13h8" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
    </svg>
  );
}

function AlignJustifyIcon() {
  return (
    <svg width={14} height={12} viewBox="0 0 14 14" fill="none">
      <path d="M0 1h14M0 5h14M0 9h14M0 13h14" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
    </svg>
  );
}

function SparkleIcon() {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none">
      {/* 4-pointed sparkle star */}
      <path
        d="M12 2C12 2 12.8 7.2 14.8 9.2C16.8 11.2 22 12 22 12C22 12 16.8 12.8 14.8 14.8C12.8 16.8 12 22 12 22C12 22 11.2 16.8 9.2 14.8C7.2 12.8 2 12 2 12C2 12 7.2 11.2 9.2 9.2C11.2 7.2 12 2 12 2Z"
        fill="#f5c842"
      />
      {/* Small secondary sparkle */}
      <path
        d="M19 2C19 2 19.4 4.2 20.4 5.2C21.4 6.2 23.5 6.5 23.5 6.5C23.5 6.5 21.4 6.8 20.4 7.8C19.4 8.8 19 11 19 11C19 11 18.6 8.8 17.6 7.8C16.6 6.8 14.5 6.5 14.5 6.5C14.5 6.5 16.6 6.2 17.6 5.2C18.6 4.2 19 2 19 2Z"
        fill="#f5c842"
        opacity={0.8}
      />
    </svg>
  );
}

/* Italic icon — từ Icon-7.svg */
function ItalicIcon() {
  return (
    <svg width={14} height={14} viewBox="0 0 14 14" fill="none">
      <path d="M11.083 2.3335H5.83301" stroke="currentColor" strokeWidth={1.16667} strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8.16699 11.6665H2.91699" stroke="currentColor" strokeWidth={1.16667} strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8.75 2.3335L5.25 11.6668" stroke="currentColor" strokeWidth={1.16667} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* U with underline bar — từ Icon-6.svg */
function UnderlineIcon() {
  return (
    <svg width={14} height={14} viewBox="0 0 14 14" fill="none">
      <path
        d="M3.5 2.3335V5.8335C3.5 6.76175 3.86875 7.65199 4.52513 8.30837C5.1815 8.96475 6.07174 9.3335 7 9.3335C7.92826 9.3335 8.8185 8.96475 9.47487 8.30837C10.1313 7.65199 10.5 6.76175 10.5 5.8335V2.3335"
        stroke="currentColor"
        strokeWidth={1.16667}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M2.33301 11.6665H11.6663"
        stroke="currentColor"
        strokeWidth={1.16667}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* Paint brush / highlight icon with color bar */
function HighlightIcon({ color }: { color: string }) {
  return (
    <svg width={14} height={16} viewBox="0 0 14 16" fill="none">
      {/* Brush handle - diagonal */}
      <path
        d="M9 1.5L12.5 5L6.5 11H3.5V8L9 1.5Z"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
      {/* Brush tip / nib */}
      <path
        d="M3.5 8L2 12L5.5 11"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Current color indicator bar */}
      <rect x="1" y="13.5" width="12" height="2" rx="1" fill={color} />
    </svg>
  );
}

/* Text color icon: chữ A với color bar bên dưới */
function TextColorIcon({ color }: { color: string }) {
  return (
    <svg width={14} height={16} viewBox="0 0 14 16" fill="none">
      {/* Chữ A */}
      <path
        d="M1.5 13L7 2L12.5 13"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Nét ngang giữa của A */}
      <path
        d="M3.5 9h7"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
      />
      {/* Color bar chỉ màu chữ hiện tại */}
      <rect x="0.5" y="14" width="13" height="2" rx="1" fill={color} />
    </svg>
  );
}


