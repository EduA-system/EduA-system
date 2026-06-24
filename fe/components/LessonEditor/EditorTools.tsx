"use client";

import { useCallback, useState } from "react";

type DropdownOption<T extends string | number> = {
  label: string;
  value: T;
};

const TEXT_STYLES = [
  { label: "Normal text", value: "P" },
  { label: "Title", value: "H1" },
  { label: "Heading", value: "H2" },
  { label: "Subheading", value: "H3" },
] as const;
const FONT_SIZES = [11, 12, 13, 14, 16, 18, 24];
const FONT_FAMILIES = ["Arial", "Inter", "Times New Roman", "Georgia", "Verdana"] as const;
const ALIGN_OPTIONS = [
  { command: "justifyLeft", label: "Align left", icon: AlignLeftIcon },
  { command: "justifyCenter", label: "Align center", icon: AlignCenterIcon },
  { command: "justifyRight", label: "Align right", icon: AlignRightIcon },
  { command: "justifyFull", label: "Justify", icon: AlignJustifyIcon },
] as const;

export function EditorTools() {
  const [textStyle, setTextStyle] = useState<(typeof TEXT_STYLES)[number]["value"]>("P");
  const [fontFamily, setFontFamily] = useState<(typeof FONT_FAMILIES)[number]>("Arial");
  const [fontSize, setFontSize] = useState(14);
  const [alignCommand, setAlignCommand] = useState<(typeof ALIGN_OPTIONS)[number]["command"]>("justifyLeft");
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  const exec = useCallback((command: string, value?: string) => {
    document.execCommand(command, false, value ?? undefined);
  }, []);

  const applyTextStyle = (next: (typeof TEXT_STYLES)[number]["value"]) => {
    setTextStyle(next);
    setOpenMenu(null);
    exec("formatBlock", next);
  };

  const applyFontFamily = (next: (typeof FONT_FAMILIES)[number]) => {
    setFontFamily(next);
    setOpenMenu(null);
    exec("fontName", next);
  };

  const applyFontSize = (next: number) => {
    setFontSize(next);
    setOpenMenu(null);
    exec("fontSize", "3");
  };

  const applyAlign = (command: (typeof ALIGN_OPTIONS)[number]["command"]) => {
    setAlignCommand(command);
    setOpenMenu(null);
    exec(command);
  };

  const activeAlign = ALIGN_OPTIONS.find((option) => option.command === alignCommand) ?? ALIGN_OPTIONS[0];
  const ActiveAlignIcon = activeAlign.icon;

  return (
    <div className="flex items-center gap-1.5">
      <ToolButton onClick={() => exec("undo")} label="Undo"><UndoIcon /></ToolButton>
      <ToolButton onClick={() => exec("redo")} label="Redo"><RedoIcon /></ToolButton>
      <Divider />
      <TextDropdown
        label="Text style"
        menuId="style"
        openMenu={openMenu}
        setOpenMenu={setOpenMenu}
        value={textStyle}
        options={[...TEXT_STYLES]}
        widthClass="min-w-[116px]"
        onSelect={applyTextStyle}
      />
      <TextDropdown
        label="Font family"
        menuId="font"
        openMenu={openMenu}
        setOpenMenu={setOpenMenu}
        value={fontFamily}
        options={FONT_FAMILIES.map((font) => ({ label: font, value: font }))}
        widthClass="min-w-[160px]"
        onSelect={applyFontFamily}
      />
      <TextDropdown
        label="Font size"
        menuId="size"
        openMenu={openMenu}
        setOpenMenu={setOpenMenu}
        value={fontSize}
        options={FONT_SIZES.map((size) => ({ label: String(size), value: size }))}
        widthClass="min-w-[64px]"
        onSelect={applyFontSize}
      />
      <Divider />
      <ToolButton onClick={() => exec("bold")} label="Bold" strong>B</ToolButton>
      <ToolButton onClick={() => exec("italic")} label="Italic"><ItalicIcon /></ToolButton>
      <ToolButton onClick={() => exec("underline")} label="Underline"><UnderlineIcon /></ToolButton>
      <ToolButton onClick={() => exec("foreColor", "#2b2926")} label="Text color"><TextColorIcon /></ToolButton>
      <ToolButton onClick={() => exec("hiliteColor", "#f6eadf")} label="Highlight"><MarkerIcon /></ToolButton>
      <Divider />
      <ToolButton onClick={() => exec("insertUnorderedList")} label="Bullets"><BulletIcon /></ToolButton>
      <div className="relative flex shrink-0 items-center justify-center">
        <button
          type="button"
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
          <div className="absolute top-9 left-1/2 z-50 flex -translate-x-1/2 items-center justify-center gap-1 rounded-xl border border-[#e8e2d9] bg-white p-1 shadow-[0_8px_24px_rgba(43,41,38,0.12)]">
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
        ) : null}
      </div>
      <ToolButton onClick={() => exec("insertOrderedList")} label="Numbered list"><NumberListIcon /></ToolButton>
    </div>
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

  return (
    <div className={`relative shrink-0 ${widthClass}`}>
      <button
        type="button"
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
        <div className="absolute top-9 left-0 z-50 min-w-full overflow-hidden rounded-xl border border-[#e8e2d9] bg-white p-1 shadow-[0_8px_24px_rgba(43,41,38,0.12)]">
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
      ) : null}
    </div>
  );
}

function ToolButton({
  children,
  label,
  onClick,
  strong = false,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  strong?: boolean;
}) {
  return (
    <button
      type="button"
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      title={label}
      aria-label={label}
      className={`flex size-8 shrink-0 items-center justify-center rounded text-[#4f4943] transition hover:bg-[#f3efe9] hover:text-[#2b2926] ${strong ? "text-[14px] font-semibold" : ""}`}
    >
      {children}
    </button>
  );
}

function Divider({ className = "" }: { className?: string }) {
  return <div className={`mx-1.5 h-5 w-px shrink-0 bg-[#e8e2d9] ${className}`} />;
}

function ChevronDownIcon() { return <svg width="11" height="11" viewBox="0 0 16 16" fill="none" aria-hidden><path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>; }
function UndoIcon() { return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M9 8H4V3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /><path d="M4.8 8A8 8 0 1 1 6.9 16.1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>; }
function RedoIcon() { return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M15 8h5V3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /><path d="M19.2 8a8 8 0 1 0-2.1 8.1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>; }
function ItalicIcon() { return <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden><path d="M10.5 3H6.5M9.5 13H5.5M9 3L7 13" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>; }
function UnderlineIcon() { return <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden><path d="M5 3v4.2a3 3 0 006 0V3M4 13h8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>; }
function TextColorIcon() { return <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden><path d="M3 12l5-9 5 9M5 9h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /><path d="M3 14h10" stroke="#d97757" strokeWidth="1.7" strokeLinecap="round" /></svg>; }
function MarkerIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M16.5 3.5l4 4L10 18H6v-4L16.5 3.5z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" /><path d="M4 21h16" stroke="#d97757" strokeWidth="2.5" strokeLinecap="round" /></svg>; }
function BulletIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M9 7h11M9 12h11M9 17h11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /><path d="M5 7h.01M5 12h.01M5 17h.01" stroke="currentColor" strokeWidth="3" strokeLinecap="round" /></svg>; }
function NumberListIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M10 7h10M10 12h10M10 17h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /><path d="M4 6h1v3M4 12h2l-2 3h2M4 18h2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>; }
function AlignLeftIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M4 6h16M4 10h10M4 14h16M4 18h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>; }
function AlignCenterIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M4 6h16M7 10h10M4 14h16M7 18h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>; }
function AlignRightIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M4 6h16M10 10h10M4 14h16M10 18h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>; }
function AlignJustifyIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M4 6h16M4 10h16M4 14h16M4 18h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>; }
