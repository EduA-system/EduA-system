"use client";

import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type DropdownOption<T extends string | number> = {
  label: string;
  value: T;
};

const TEXT_STYLES = [
  { label: "Normal", value: "P" },
  { label: "Title", value: "H1" },
  { label: "Heading", value: "H2" },
  { label: "Subheading", value: "H3" },
] as const;
const FONT_SIZES = [11, 12, 13, 14, 16, 18, 24];
const FONT_FAMILIES = ["Calibri", "Arial", "Inter", "Times New Roman", "Georgia"] as const;
const ALIGN_OPTIONS = [
  { command: "justifyLeft", label: "Align left", icon: AlignLeftIcon },
  { command: "justifyCenter", label: "Align center", icon: AlignCenterIcon },
  { command: "justifyRight", label: "Align right", icon: AlignRightIcon },
  { command: "justifyFull", label: "Justify", icon: AlignJustifyIcon },
] as const;

type TextStyleValue = (typeof TEXT_STYLES)[number]["value"];
type FontFamilyValue = (typeof FONT_FAMILIES)[number];
type AlignCommand = (typeof ALIGN_OPTIONS)[number]["command"];

interface ToolbarState {
  textStyle: TextStyleValue;
  fontFamily: FontFamilyValue;
  fontSize: number;
  alignCommand: AlignCommand;
  openMenu: string | null;
  setOpenMenu: React.Dispatch<React.SetStateAction<string | null>>;
  exec: (command: string, value?: string) => void;
  applyTextStyle: (value: TextStyleValue) => void;
  applyFontFamily: (value: FontFamilyValue) => void;
  applyFontSize: (value: number) => void;
  applyAlign: (command: AlignCommand) => void;
  applyLink: () => void;
  applyImage: () => void;
  comingSoon: (feature: string) => void;
}

const ToolbarStateContext = createContext<ToolbarState | null>(null);

function useToolbarState(): ToolbarState {
  const ctx = useContext(ToolbarStateContext);
  if (!ctx) {
    throw new Error("EditorTopTools / EditorBottomTools phải được dùng bên trong <EditorToolbar>");
  }
  return ctx;
}

/**
 * Toolbar 2 hàng theo Figma. Dùng compound-component: bọc header content bằng
 * provider rồi đặt <EditorTopTools /> (hàng trên, xen vào header bar) và
 * <EditorBottomTools /> (hàng dưới, dòng riêng). State dùng chung qua context.
 */
export function EditorToolbar({ children }: { children: React.ReactNode }) {
  const [textStyle, setTextStyle] = useState<TextStyleValue>("P");
  const [fontFamily, setFontFamily] = useState<FontFamilyValue>("Calibri");
  const [fontSize, setFontSize] = useState(14);
  const [alignCommand, setAlignCommand] = useState<AlignCommand>("justifyLeft");
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  const exec = useCallback((command: string, value?: string) => {
    document.execCommand(command, false, value ?? undefined);
  }, []);

  const applyTextStyle = useCallback(
    (next: TextStyleValue) => {
      setTextStyle(next);
      setOpenMenu(null);
      exec("formatBlock", next);
    },
    [exec],
  );

  const applyFontFamily = useCallback(
    (next: FontFamilyValue) => {
      setFontFamily(next);
      setOpenMenu(null);
      exec("fontName", next);
    },
    [exec],
  );

  const applyFontSize = useCallback(
    (next: number) => {
      setFontSize(next);
      setOpenMenu(null);
      // execCommand("fontSize", ...) chỉ nhận 1-7, nên bọc selection bằng font
      // size 7 rồi thay bằng style pixel — kỹ thuật chuẩn để set size theo px.
      document.execCommand("fontSize", false, "7");
      document.querySelectorAll('font[size="7"]').forEach((node) => {
        const el = node as HTMLElement;
        el.removeAttribute("size");
        el.style.fontSize = `${next}px`;
      });
    },
    [],
  );

  const applyAlign = useCallback(
    (command: AlignCommand) => {
      setAlignCommand(command);
      setOpenMenu(null);
      exec(command);
    },
    [exec],
  );

  const applyLink = useCallback(() => {
    const url = window.prompt("Nhập đường dẫn (URL):");
    if (url) exec("createLink", url);
  }, [exec]);

  const applyImage = useCallback(() => {
    const url = window.prompt("Nhập đường dẫn ảnh (URL):");
    if (url) exec("insertImage", url);
  }, [exec]);

  const comingSoon = useCallback((feature: string) => {
    window.alert(`Tính năng "${feature}" đang được phát triển.`);
  }, []);

  // Đóng menu khi click ngoài hoặc nhấn Escape.
  useEffect(() => {
    if (!openMenu) return;

    const handlePointer = (event: MouseEvent) => {
      const target = event.target as Element | null;
      if (target && (target.closest("[data-toolbar-trigger]") || target.closest("[data-toolbar-menu]"))) {
        return;
      }
      setOpenMenu(null);
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenMenu(null);
    };

    document.addEventListener("mousedown", handlePointer);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handlePointer);
      document.removeEventListener("keydown", handleKey);
    };
  }, [openMenu]);

  const value: ToolbarState = {
    textStyle,
    fontFamily,
    fontSize,
    alignCommand,
    openMenu,
    setOpenMenu,
    exec,
    applyTextStyle,
    applyFontFamily,
    applyFontSize,
    applyAlign,
    applyLink,
    applyImage,
    comingSoon,
  };

  return <ToolbarStateContext.Provider value={value}>{children}</ToolbarStateContext.Provider>;
}

/** Hàng trên: Undo/Redo | Font family ▾ Font size ▾ | Text color, Highlight, Link */
export function EditorTopTools() {
  const state = useToolbarState();
  const { openMenu, setOpenMenu, fontFamily, fontSize, exec, applyFontFamily, applyFontSize, applyLink } = state;

  return (
    <div className="flex items-center gap-1.5">
      <ToolButton onClick={() => exec("undo")} label="Undo">
        <UndoIcon />
      </ToolButton>
      <ToolButton onClick={() => exec("redo")} label="Redo">
        <RedoIcon />
      </ToolButton>
      <Divider />
      <TextDropdown
        label="Font family"
        menuId="font"
        openMenu={openMenu}
        setOpenMenu={setOpenMenu}
        value={fontFamily}
        options={FONT_FAMILIES.map((font) => ({ label: font, value: font }))}
        widthClass="w-[120px] min-w-[78px] shrink"
        onSelect={applyFontFamily}
      />
      <TextDropdown
        label="Font size"
        menuId="size"
        openMenu={openMenu}
        setOpenMenu={setOpenMenu}
        value={fontSize}
        options={FONT_SIZES.map((size) => ({ label: String(size), value: size }))}
        widthClass="w-[56px] shrink-0"
        onSelect={applyFontSize}
      />
      <Divider />
      <ToolButton onClick={() => exec("foreColor", "#2b2926")} label="Text color">
        <TextColorIcon />
      </ToolButton>
      <ToolButton onClick={() => exec("hiliteColor", "#f6eadf")} label="Highlight">
        <MarkerIcon />
      </ToolButton>
      <ToolButton onClick={() => exec("removeFormat")} label="Clear formatting">
        <ClearFormatIcon />
      </ToolButton>
      <ToolButton onClick={applyLink} label="Insert link">
        <LinkIcon />
      </ToolButton>
    </div>
  );
}

/** Hàng dưới: Paragraph ▾ | B I U S | Align ▾ | Bullets, Numbered, Indent | x² x₂ | Σ Table Image */
export function EditorBottomTools() {
  const state = useToolbarState();
  const {
    textStyle,
    alignCommand,
    openMenu,
    setOpenMenu,
    exec,
    applyTextStyle,
    applyAlign,
    applyImage,
    comingSoon,
  } = state;

  const activeAlign = ALIGN_OPTIONS.find((option) => option.command === alignCommand) ?? ALIGN_OPTIONS[0];
  const ActiveAlignIcon = activeAlign.icon;
  const alignTriggerRef = useRef<HTMLButtonElement>(null);

  return (
    <div className="flex items-center gap-1.5">
      <TextDropdown
        label="Paragraph style"
        menuId="style"
        openMenu={openMenu}
        setOpenMenu={setOpenMenu}
        value={textStyle}
        options={[...TEXT_STYLES]}
        widthClass="w-[104px] min-w-[72px] shrink"
        onSelect={applyTextStyle}
      />
      <Divider />
      <ToolButton onClick={() => exec("bold")} label="Bold" strong>
        B
      </ToolButton>
      <ToolButton onClick={() => exec("italic")} label="Italic">
        <ItalicIcon />
      </ToolButton>
      <ToolButton onClick={() => exec("underline")} label="Underline">
        <UnderlineIcon />
      </ToolButton>
      <ToolButton onClick={() => exec("strikeThrough")} label="Strikethrough">
        <StrikethroughIcon />
      </ToolButton>
      <Divider />
      {/* Align: popover NGANG (list ngang xuống) theo yêu cầu */}
      <div className="relative flex shrink-0 items-center justify-center">
        <button
          ref={alignTriggerRef}
          type="button"
          data-toolbar-trigger
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => setOpenMenu((current) => (current === "align" ? null : "align"))}
          title="Align"
          aria-label="Align"
          aria-expanded={openMenu === "align"}
          className="flex h-8 shrink-0 items-center justify-center gap-0.5 rounded px-1.5 text-[#4f4943] transition hover:bg-[#f3efe9] hover:text-[#2b2926]"
        >
          <ActiveAlignIcon />
          <ChevronDownIcon />
        </button>
        {openMenu === "align" ? (
          <MenuPortal triggerRef={alignTriggerRef} align="center">
            <div className="flex items-center justify-center gap-1">
              {ALIGN_OPTIONS.map((option) => {
                const Icon = option.icon;
                const active = option.command === alignCommand;
                return (
                  <button
                    key={option.command}
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => applyAlign(option.command)}
                    title={option.label}
                    aria-label={option.label}
                    className={`flex size-8 items-center justify-center rounded-lg transition ${
                      active
                        ? "bg-[#f3efe9] text-[#2b2926]"
                        : "text-[#6b625a] hover:bg-[#f7f3ee] hover:text-[#2b2926]"
                    }`}
                  >
                    <Icon />
                  </button>
                );
              })}
            </div>
          </MenuPortal>
        ) : null}
      </div>
      <Divider />
      <ToolButton onClick={() => exec("insertUnorderedList")} label="Bulleted list">
        <BulletIcon />
      </ToolButton>
      <ToolButton onClick={() => exec("insertOrderedList")} label="Numbered list">
        <NumberListIcon />
      </ToolButton>
      <ToolButton onClick={() => exec("indent")} label="Indent">
        <IndentIcon />
      </ToolButton>
      <Divider />
      <ToolButton onClick={() => exec("superscript")} label="Superscript">
        <SuperscriptIcon />
      </ToolButton>
      <ToolButton onClick={() => exec("subscript")} label="Subscript">
        <SubscriptIcon />
      </ToolButton>
      <Divider />
      <ToolButton onClick={() => comingSoon("Ký hiệu Toán")} label="Math symbol">
        <MathSymbolIcon />
      </ToolButton>
      <ToolButton onClick={() => comingSoon("Bảng")} label="Insert table">
        <TableIcon />
      </ToolButton>
      <ToolButton onClick={applyImage} label="Insert image">
        <ImageIcon />
      </ToolButton>
    </div>
  );
}

/**
 * Render menu ra document.body qua portal để thoát mọi overflow clip ở tổ tiên
 * (hàng toolbar có overflow-x-auto, section có overflow-hidden). Tự định vị theo
 * toạ độ trigger (getBoundingClientRect) và canh lề theo `align`.
 */
function MenuPortal({
  triggerRef,
  align = "left",
  children,
}: {
  triggerRef: React.RefObject<HTMLElement | null>;
  align?: "left" | "center";
  children: React.ReactNode;
}) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);

  useLayoutEffect(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;

    const place = () => {
      const rect = trigger.getBoundingClientRect();
      const menuWidth = menuRef.current?.offsetWidth ?? rect.width;
      const left =
        align === "center"
          ? rect.left + rect.width / 2 - menuWidth / 2
          : rect.left;
      setCoords({ top: rect.bottom + 4, left });
    };

    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [triggerRef, align]);

  // SSR guard: createPortal cần document.
  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      ref={menuRef}
      data-toolbar-menu
      style={{ position: "fixed", top: coords?.top ?? -9999, left: coords?.left ?? -9999, zIndex: 50 }}
      className="overflow-hidden rounded-xl border border-[#e8e2d9] bg-white p-1 shadow-[0_8px_24px_rgba(43,41,38,0.12)]"
    >
      {children}
    </div>,
    document.body,
  );
}

function TextDropdown<T extends string | number>({
  label,
  menuId,
  openMenu,
  setOpenMenu,
  value,
  options,
  widthClass,
  onSelect,
}: {
  label: string;
  menuId: string;
  openMenu: string | null;
  setOpenMenu: React.Dispatch<React.SetStateAction<string | null>>;
  value: T;
  options: DropdownOption<T>[];
  widthClass: string;
  onSelect: (value: T) => void;
}) {
  const selected = options.find((option) => option.value === value) ?? options[0];
  const isOpen = openMenu === menuId;
  const triggerRef = useRef<HTMLButtonElement>(null);

  return (
    <div className={`relative ${widthClass}`}>
      <button
        ref={triggerRef}
        type="button"
        data-toolbar-trigger
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => setOpenMenu((current) => (current === menuId ? null : menuId))}
        aria-label={label}
        aria-expanded={isOpen}
        className="flex h-8 w-full items-center justify-between gap-2 rounded-lg border border-transparent bg-transparent px-2 text-left text-[13px] text-[#4f4943] outline-none transition hover:border-[#e8e2d9] hover:bg-white"
      >
        <span className="truncate">{selected.label}</span>
        <ChevronDownIcon />
      </button>
      {isOpen ? (
        <MenuPortal triggerRef={triggerRef}>
          <div className="flex min-w-[120px] flex-col">
            {options.map((option) => {
              const active = option.value === value;
              return (
                <button
                  key={String(option.value)}
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => onSelect(option.value)}
                  className={`flex h-8 w-full items-center whitespace-nowrap rounded-lg px-2 text-left text-[13px] transition ${
                    active
                      ? "bg-[#f3efe9] text-[#2b2926]"
                      : "text-[#6b625a] hover:bg-[#f7f3ee] hover:text-[#2b2926]"
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </MenuPortal>
      ) : null}
    </div>
  );
}

function ToolButton({
  children,
  label,
  onClick,
  strong = false,
  active = false,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  strong?: boolean;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      title={label}
      aria-label={label}
      aria-pressed={active}
      className={`flex size-8 shrink-0 items-center justify-center rounded transition ${
        active
          ? "bg-[#f3efe9] text-[#2b2926]"
          : "text-[#4f4943] hover:bg-[#f3efe9] hover:text-[#2b2926]"
      } ${strong ? "text-[14px] font-semibold" : ""}`}
    >
      {children}
    </button>
  );
}

function Divider({ className = "" }: { className?: string }) {
  return <div className={`mx-1.5 h-5 w-px shrink-0 bg-[#e8e2d9] ${className}`} />;
}

/* ---------- Icons (currentColor, 16px, strokeWidth ~1.7) ---------- */

function ChevronDownIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function UndoIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M9 8H4V3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4.8 8A8 8 0 1 1 6.9 16.1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
function RedoIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M15 8h5V3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M19.2 8a8 8 0 1 0-2.1 8.1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
function ItalicIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M10.5 3H6.5M9.5 13H5.5M9 3L7 13" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}
function UnderlineIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M5 3v4.2a3 3 0 006 0V3M4 13h8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}
function StrikethroughIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4 12h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M7 7.5C7 5.6 9 4 12 4s5 1.5 5 3.5M17 16.5C17 18.4 14.8 20 12 20s-5-1.4-5-3.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}
function TextColorIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M3 12l5-9 5 9M5 9h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3 14h10" stroke="#d97757" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}
function MarkerIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M16.5 3.5l4 4L10 18H6v-4L16.5 3.5z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M4 21h16" stroke="#d97757" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}
function LinkIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M9.5 14.5l5-5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M8 12l-1.5 1.5a3.5 3.5 0 005 5L13 17" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M16 12l1.5-1.5a3.5 3.5 0 00-5-5L11 7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}
function BulletIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M9 7h11M9 12h11M9 17h11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M5 7h.01M5 12h.01M5 17h.01" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
function NumberListIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M10 7h10M10 12h10M10 17h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M4 6h1v3M4 12h2l-2 3h2M4 18h2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IndentIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M9 7h11M9 12h11M9 17h11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M4 8l3 4-3 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function SuperscriptIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M2.66699 12.6668L8.00033 7.3335" stroke="currentColor" strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8.00033 12.6668L2.66699 7.3335" stroke="currentColor" strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M13.3337 7.99985H10.667C10.667 6.99985 10.9617 6.66652 11.667 6.33319C12.3723 5.99985 13.3337 5.55585 13.3337 4.66785C13.3337 4.35319 13.2203 4.04785 13.011 3.80785C12.7977 3.56657 12.5079 3.40599 12.1902 3.35307C11.8725 3.30014 11.5463 3.35809 11.2663 3.51719C10.9863 3.67652 10.7743 3.92652 10.667 4.22385" stroke="currentColor" strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function SubscriptIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M2.66699 3.3335L8.00033 8.66683" stroke="currentColor" strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8.00033 3.3335L2.66699 8.66683" stroke="currentColor" strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M13.3337 12.6669H10.667C10.667 11.6669 10.9603 11.3335 11.667 11.0002C12.3737 10.6669 13.3337 10.2202 13.3337 9.33355C13.3337 9.02022 13.2203 8.71355 13.0137 8.47355C12.8002 8.23188 12.5103 8.07087 12.1923 8.01748C11.8743 7.96408 11.5477 8.02153 11.267 8.18022C10.987 8.34022 10.7737 8.59355 10.667 8.89355" stroke="currentColor" strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function ClearFormatIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M4.66647 14.0001L1.7998 11.1335C1.13314 10.4668 1.13314 9.4668 1.7998 8.8668L8.19981 2.4668C8.86647 1.80013 9.86647 1.80013 10.4665 2.4668L14.1998 6.20013C14.8665 6.8668 14.8665 7.8668 14.1998 8.4668L8.66647 14.0001" stroke="currentColor" strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14.667 14H4.66699" stroke="currentColor" strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3.33301 7.3335L9.33301 13.3335" stroke="currentColor" strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function MathSymbolIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <text x="4" y="18" fontSize="16" fill="currentColor" fontFamily="Georgia, serif" fontWeight="600">Σ</text>
    </svg>
  );
}
function TableIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3.5" y="4.5" width="17" height="15" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M3.5 10h17M3.5 15h17M9 4.5v15M15 4.5v15" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}
function ImageIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3.5" y="4.5" width="17" height="15" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="9" cy="10" r="1.6" fill="currentColor" />
      <path d="M4 17l4.5-4.5 3 3L15 12l5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function AlignLeftIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4 6h16M4 10h10M4 14h16M4 18h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
function AlignCenterIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4 6h16M7 10h10M4 14h16M7 18h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
function AlignRightIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4 6h16M10 10h10M4 14h16M10 18h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
function AlignJustifyIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4 6h16M4 10h16M4 14h16M4 18h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
