"use client";

import { useEffect, useRef, useState } from "react";
import { useEditorState, type Editor } from "@tiptap/react";

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
type BlockType = (typeof TEXT_STYLES)[number]["value"];

const FONT_SIZES = [11, 12, 13, 14, 16, 18, 24];
const FONT_FAMILIES = ["Arial", "Inter", "Times New Roman", "Georgia", "Verdana"] as const;
const ALIGN_OPTIONS = [
  { value: "left", label: "Align left", icon: AlignLeftIcon },
  { value: "center", label: "Align center", icon: AlignCenterIcon },
  { value: "right", label: "Align right", icon: AlignRightIcon },
  { value: "justify", label: "Justify", icon: AlignJustifyIcon },
] as const;
type AlignValue = (typeof ALIGN_OPTIONS)[number]["value"];

const TEXT_COLOR = "#b4472e";
const HIGHLIGHT_COLOR = "#f6eadf";

// Ký hiệu phục vụ giáo án KHTN (vật lí/hoá).
const SPECIAL_SYMBOLS = [
  "×", "÷", "±", "∓", "√", "∛", "≈", "≠", "≤", "≥",
  "°", "′", "″", "∞", "∝", "∑", "∏", "∫", "∂", "∇",
  "α", "β", "γ", "δ", "θ", "λ", "μ", "π", "ρ", "σ",
  "τ", "φ", "ω", "Δ", "Ω", "→", "←", "↔", "⇌", "·",
];

type ToolbarState = {
  block: BlockType;
  fontFamily: string;
  fontSize: number | null;
  align: AlignValue;
  isBold: boolean;
  isItalic: boolean;
  isUnderline: boolean;
  isStrike: boolean;
  isSubscript: boolean;
  isSuperscript: boolean;
  isBulletList: boolean;
  isOrderedList: boolean;
  isLink: boolean;
  canUndo: boolean;
  canRedo: boolean;
  canSink: boolean;
  canLift: boolean;
};

const DEFAULT_STATE: ToolbarState = {
  block: "P",
  fontFamily: "Arial",
  fontSize: null,
  align: "left",
  isBold: false,
  isItalic: false,
  isUnderline: false,
  isStrike: false,
  isSubscript: false,
  isSuperscript: false,
  isBulletList: false,
  isOrderedList: false,
  isLink: false,
  canUndo: false,
  canRedo: false,
  canSink: false,
  canLift: false,
};

function readBlock(editor: Editor): BlockType {
  if (editor.isActive("heading", { level: 1 })) return "H1";
  if (editor.isActive("heading", { level: 2 })) return "H2";
  if (editor.isActive("heading", { level: 3 })) return "H3";
  return "P";
}

function readAlign(editor: Editor): AlignValue {
  for (const option of ALIGN_OPTIONS) {
    if (editor.isActive({ textAlign: option.value })) return option.value;
  }
  return "left";
}

function shallowEqual(a: ToolbarState, b: ToolbarState | null) {
  if (!b) return false;
  return (Object.keys(a) as (keyof ToolbarState)[]).every((key) => a[key] === b[key]);
}

export function EditorTools({ editor }: { editor: Editor | null }) {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const state =
    useEditorState({
      editor,
      selector: ({ editor: e }): ToolbarState => {
        if (!e) return DEFAULT_STATE;
        const rawSize = e.getAttributes("textStyle").fontSize as string | undefined;
        return {
          block: readBlock(e),
          fontFamily: (e.getAttributes("textStyle").fontFamily as string | undefined) ?? "Arial",
          fontSize: rawSize ? Number.parseInt(rawSize, 10) : null,
          align: readAlign(e),
          isBold: e.isActive("bold"),
          isItalic: e.isActive("italic"),
          isUnderline: e.isActive("underline"),
          isStrike: e.isActive("strike"),
          isSubscript: e.isActive("subscript"),
          isSuperscript: e.isActive("superscript"),
          isBulletList: e.isActive("bulletList"),
          isOrderedList: e.isActive("orderedList"),
          isLink: e.isActive("link"),
          canUndo: e.can().undo(),
          canRedo: e.can().redo(),
          canSink: e.can().sinkListItem("listItem"),
          canLift: e.can().liftListItem("listItem"),
        };
      },
      equalityFn: shallowEqual,
    }) ?? DEFAULT_STATE;

  // Đóng mọi menu/popup khi click ra ngoài thanh công cụ.
  useEffect(() => {
    if (!openMenu) return;
    const handle = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpenMenu(null);
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [openMenu]);

  if (!editor) {
    return <div className="flex min-w-0 items-center gap-1.5" />;
  }

  const chain = () => editor.chain().focus();

  const applyTextStyle = (next: BlockType) => {
    setOpenMenu(null);
    if (next === "P") chain().setParagraph().run();
    else chain().setHeading({ level: Number(next[1]) as 1 | 2 | 3 }).run();
  };

  const applyFontFamily = (next: string) => {
    setOpenMenu(null);
    chain().setFontFamily(next).run();
  };

  const applyFontSize = (next: number) => {
    setOpenMenu(null);
    chain().setFontSize(`${next}px`).run();
  };

  const applyAlign = (value: AlignValue) => {
    setOpenMenu(null);
    chain().setTextAlign(value).run();
  };

  const insertSymbol = (symbol: string) => {
    chain().insertContent(symbol).run();
  };

  const activeAlign = ALIGN_OPTIONS.find((option) => option.value === state.align) ?? ALIGN_OPTIONS[0];
  const ActiveAlignIcon = activeAlign.icon;

  return (
    <div ref={containerRef} className="flex min-w-0 items-center gap-1.5">
      <ToolButton onClick={() => chain().undo().run()} label="Hoàn tác" disabled={!state.canUndo}>
        <UndoIcon />
      </ToolButton>
      <ToolButton onClick={() => chain().redo().run()} label="Làm lại" disabled={!state.canRedo}>
        <RedoIcon />
      </ToolButton>
      <Divider />
      <TextDropdown
        label="Text style"
        menuId="style"
        openMenu={openMenu}
        setOpenMenu={setOpenMenu}
        value={state.block}
        options={[...TEXT_STYLES]}
        widthClass="w-[116px] min-w-[72px] shrink"
        onSelect={applyTextStyle}
      />
      <TextDropdown
        label="Font family"
        menuId="font"
        openMenu={openMenu}
        setOpenMenu={setOpenMenu}
        value={state.fontFamily}
        options={FONT_FAMILIES.map((font) => ({ label: font, value: font }))}
        widthClass="w-[150px] min-w-[84px] shrink"
        onSelect={applyFontFamily}
      />
      <TextDropdown
        label="Font size"
        menuId="size"
        openMenu={openMenu}
        setOpenMenu={setOpenMenu}
        value={state.fontSize ?? 0}
        placeholder="16"
        options={FONT_SIZES.map((size) => ({ label: String(size), value: size }))}
        widthClass="w-[60px] shrink-0"
        onSelect={applyFontSize}
      />
      <Divider />
      <ToolButton onClick={() => chain().toggleBold().run()} label="Đậm" active={state.isBold} strong>
        B
      </ToolButton>
      <ToolButton onClick={() => chain().toggleItalic().run()} label="Nghiêng" active={state.isItalic}>
        <ItalicIcon />
      </ToolButton>
      <ToolButton onClick={() => chain().toggleUnderline().run()} label="Gạch chân" active={state.isUnderline}>
        <UnderlineIcon />
      </ToolButton>
      <span className="hidden items-center gap-1.5 @min-[1180px]:flex">
        <Divider />
        <ToolButton onClick={() => chain().setColor(TEXT_COLOR).run()} label="Màu chữ">
          <TextColorIcon />
        </ToolButton>
        <ToolButton
          onClick={() => chain().toggleHighlight({ color: HIGHLIGHT_COLOR }).run()}
          label="Đánh dấu"
        >
          <MarkerIcon />
        </ToolButton>
      </span>
      <Divider />
      <ToolButton onClick={() => chain().toggleBulletList().run()} label="Danh sách dấu đầu dòng" active={state.isBulletList}>
        <BulletIcon />
      </ToolButton>
      <div className="relative hidden shrink-0 items-center justify-center @min-[1060px]:flex">
        <button
          type="button"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => setOpenMenu((current) => (current === "align" ? null : "align"))}
          title="Căn lề"
          aria-label="Căn lề"
          aria-expanded={openMenu === "align"}
          className="flex h-8 shrink-0 items-center justify-center gap-0.5 rounded px-1.5 text-[#4f4943] transition hover:bg-[#f3efe9] hover:text-[#2b2926]"
        >
          <ActiveAlignIcon />
          <ChevronDownIcon />
        </button>
        {openMenu === "align" ? (
          <Popup align="center">
            <div className="flex items-center gap-1">
              {ALIGN_OPTIONS.map((option) => {
                const Icon = option.icon;
                return (
                  <IconChoice
                    key={option.value}
                    label={option.label}
                    active={option.value === state.align}
                    onClick={() => applyAlign(option.value)}
                  >
                    <Icon />
                  </IconChoice>
                );
              })}
            </div>
          </Popup>
        ) : null}
      </div>
      <ToolButton onClick={() => chain().toggleOrderedList().run()} label="Danh sách đánh số" active={state.isOrderedList}>
        <NumberListIcon />
      </ToolButton>
      <Divider />
      <div className="relative shrink-0">
        <button
          type="button"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => setOpenMenu((current) => (current === "more" ? null : "more"))}
          title="Thêm công cụ"
          aria-label="Thêm công cụ"
          aria-expanded={openMenu === "more"}
          className="flex size-8 shrink-0 items-center justify-center rounded text-[#4f4943] transition hover:bg-[#f3efe9] hover:text-[#2b2926]"
        >
          <MoreIcon />
        </button>
        {openMenu === "more" ? (
          <Popup align="right" widthClass="w-60">
            <MenuGroup label="Định dạng">
              <div className="flex items-center gap-1">
                <IconChoice label="Gạch ngang" active={state.isStrike} onClick={() => chain().toggleStrike().run()}>
                  <StrikeIcon />
                </IconChoice>
                <IconChoice
                  label="Chỉ số trên"
                  active={state.isSuperscript}
                  onClick={() => chain().toggleSuperscript().run()}
                >
                  <SuperscriptIcon />
                </IconChoice>
                <IconChoice
                  label="Chỉ số dưới"
                  active={state.isSubscript}
                  onClick={() => chain().toggleSubscript().run()}
                >
                  <SubscriptIcon />
                </IconChoice>
                <IconChoice
                  label="Giảm thụt lề"
                  disabled={!state.canLift}
                  onClick={() => chain().liftListItem("listItem").run()}
                >
                  <OutdentIcon />
                </IconChoice>
                <IconChoice
                  label="Tăng thụt lề"
                  disabled={!state.canSink}
                  onClick={() => chain().sinkListItem("listItem").run()}
                >
                  <IndentIcon />
                </IconChoice>
                <IconChoice label="Xóa định dạng" onClick={() => chain().unsetAllMarks().clearNodes().run()}>
                  <ClearFormatIcon />
                </IconChoice>
              </div>
            </MenuGroup>
            <MenuGroup label="Chèn">
              <MenuRow onClick={() => setOpenMenu("table")}>
                <TableIcon /> Bảng
              </MenuRow>
              <MenuRow onClick={() => setOpenMenu("formula")}>
                <FormulaIcon /> Công thức
              </MenuRow>
              <MenuRow onClick={() => setOpenMenu("link")}>
                <LinkIcon /> Liên kết
              </MenuRow>
              {state.isLink ? (
                <MenuRow onClick={() => chain().unsetLink().run()}>
                  <UnlinkIcon /> Bỏ liên kết
                </MenuRow>
              ) : null}
              <MenuRow onClick={() => setOpenMenu("symbol")}>
                <SymbolIcon /> Ký hiệu đặc biệt
              </MenuRow>
              <MenuRow onClick={() => setOpenMenu("image")}>
                <ImageIcon /> Hình ảnh
              </MenuRow>
            </MenuGroup>
          </Popup>
        ) : null}

        {openMenu === "table" ? (
          <Popup align="right" widthClass="w-max">
            <TableGrid
              onPick={(rows, cols) => {
                setOpenMenu(null);
                chain().insertTable({ rows, cols, withHeaderRow: true }).run();
              }}
            />
          </Popup>
        ) : null}

        {openMenu === "formula" ? (
          <Popup align="right" widthClass="w-72">
            <FormulaForm
              onApply={(latex, display) => {
                setOpenMenu(null);
                if (!latex) return;
                if (display) chain().insertBlockMath({ latex }).run();
                else chain().insertInlineMath({ latex }).run();
              }}
            />
          </Popup>
        ) : null}

        {openMenu === "link" ? (
          <Popup align="right" widthClass="w-72">
            <LinkForm
              initialUrl={(editor.getAttributes("link").href as string | undefined) ?? ""}
              onApply={(url) => {
                setOpenMenu(null);
                if (!url) {
                  chain().extendMarkRange("link").unsetLink().run();
                  return;
                }
                chain().extendMarkRange("link").setLink({ href: url }).run();
              }}
            />
          </Popup>
        ) : null}

        {openMenu === "image" ? (
          <Popup align="right" widthClass="w-72">
            <ImageForm
              onApply={(url) => {
                setOpenMenu(null);
                if (url) chain().setImage({ src: url }).run();
              }}
            />
          </Popup>
        ) : null}

        {openMenu === "symbol" ? (
          <Popup align="right" widthClass="w-72">
            <div className="grid grid-cols-10 gap-0.5">
              {SPECIAL_SYMBOLS.map((symbol) => (
                <button
                  key={symbol}
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => insertSymbol(symbol)}
                  className="flex size-6 items-center justify-center rounded text-[15px] text-[#3b3733] transition hover:bg-[#f3efe9]"
                >
                  {symbol}
                </button>
              ))}
            </div>
          </Popup>
        ) : null}
      </div>
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
  placeholder,
  onSelect,
}: {
  label: string;
  menuId: string;
  openMenu: string | null;
  setOpenMenu: React.Dispatch<React.SetStateAction<string | null>>;
  value: T;
  options: DropdownOption<T>[];
  widthClass: string;
  placeholder?: string;
  onSelect: (value: T) => void;
}) {
  const selected = options.find((option) => option.value === value);
  const isOpen = openMenu === menuId;

  return (
    <div className={`relative ${widthClass}`}>
      <button
        type="button"
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => setOpenMenu((current) => (current === menuId ? null : menuId))}
        aria-label={label}
        aria-expanded={isOpen}
        className="flex h-8 w-full items-center justify-between gap-2 rounded-lg border border-transparent bg-transparent px-2 text-left text-[13px] text-[#4f4943] outline-none transition hover:border-[#e8e2d9] hover:bg-white"
      >
        <span className="truncate">{selected ? selected.label : (placeholder ?? "")}</span>
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

function Popup({
  children,
  align,
  widthClass = "",
}: {
  children: React.ReactNode;
  align: "center" | "right";
  widthClass?: string;
}) {
  const position = align === "center" ? "left-1/2 -translate-x-1/2" : "right-0";
  return (
    <div
      className={`absolute top-9 z-50 rounded-xl border border-[#e8e2d9] bg-white p-2 shadow-[0_8px_24px_rgba(43,41,38,0.12)] ${position} ${widthClass}`}
    >
      {children}
    </div>
  );
}

function MenuGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="px-1 py-1 [&+&]:mt-1 [&+&]:border-t [&+&]:border-[#f0eadf] [&+&]:pt-2">
      <div className="mb-1 px-1 text-[11px] font-medium tracking-wide text-[#a99f93] uppercase">{label}</div>
      {children}
    </div>
  );
}

function MenuRow({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className="flex h-8 w-full items-center gap-2 rounded-lg px-2 text-left text-[13px] text-[#4f4943] transition hover:bg-[#f7f3ee] hover:text-[#2b2926]"
    >
      {children}
    </button>
  );
}

function IconChoice({
  children,
  label,
  onClick,
  active = false,
  disabled = false,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={`flex size-8 items-center justify-center rounded-lg transition disabled:cursor-not-allowed disabled:opacity-40 ${
        active ? "bg-[#f3efe9] text-[#2b2926]" : "text-[#6b625a] hover:bg-[#f7f3ee] hover:text-[#2b2926]"
      }`}
    >
      {children}
    </button>
  );
}

function TableGrid({ onPick }: { onPick: (rows: number, cols: number) => void }) {
  const [hover, setHover] = useState({ rows: 0, cols: 0 });
  const maxRows = 6;
  const maxCols = 8;

  return (
    <div>
      <div className="mb-1.5 text-center text-[12px] text-[#6b625a]">
        {hover.rows > 0 ? `${hover.rows} × ${hover.cols}` : "Chọn kích thước"}
      </div>
      <div
        className="grid w-max shrink-0 grid-cols-8 gap-0.5"
        onMouseLeave={() => setHover({ rows: 0, cols: 0 })}
      >
        {Array.from({ length: maxRows * maxCols }).map((_, index) => {
          const row = Math.floor(index / maxCols) + 1;
          const col = (index % maxCols) + 1;
          const filled = row <= hover.rows && col <= hover.cols;
          return (
            <button
              key={index}
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onMouseEnter={() => setHover({ rows: row, cols: col })}
              onClick={() => onPick(row, col)}
              className={`size-5 shrink-0 rounded-[3px] border transition ${
                filled ? "border-[#d97757] bg-[#f6eadf]" : "border-[#e8e2d9] bg-white"
              }`}
            />
          );
        })}
      </div>
    </div>
  );
}

function LinkForm({ initialUrl, onApply }: { initialUrl: string; onApply: (url: string) => void }) {
  const [url, setUrl] = useState(initialUrl);
  return (
    <div className="flex flex-col gap-2">
      <input
        autoFocus
        value={url}
        onChange={(event) => setUrl(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") onApply(url.trim());
        }}
        placeholder="https://..."
        className="h-8 w-full rounded-lg border border-[#e8e2d9] px-2 text-[13px] text-[#2b2926] outline-none focus:border-[#d97757]"
      />
      <div className="flex justify-end gap-1.5">
        {initialUrl ? (
          <button
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => onApply("")}
            className="h-7 rounded-lg px-2.5 text-[12px] text-[#6b625a] transition hover:bg-[#f7f3ee]"
          >
            Bỏ liên kết
          </button>
        ) : null}
        <button
          type="button"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => onApply(url.trim())}
          className="h-7 rounded-lg bg-[#d97757] px-3 text-[12px] font-medium text-white transition hover:bg-[#c96545]"
        >
          Áp dụng
        </button>
      </div>
    </div>
  );
}

function FormulaForm({ onApply }: { onApply: (latex: string, display: boolean) => void }) {
  const [latex, setLatex] = useState("");
  return (
    <div className="flex flex-col gap-2">
      <input
        autoFocus
        value={latex}
        onChange={(event) => setLatex(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") onApply(latex.trim(), false);
        }}
        placeholder="vd: x^2 + y^2 = z^2"
        className="h-8 w-full rounded-lg border border-[#e8e2d9] px-2 text-[13px] text-[#2b2926] outline-none focus:border-[#d97757]"
      />
      <div className="flex justify-end gap-1.5">
        <button
          type="button"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => onApply(latex.trim(), false)}
          className="h-7 rounded-lg px-2.5 text-[12px] text-[#6b625a] transition hover:bg-[#f7f3ee]"
        >
          Chèn dạng dòng
        </button>
        <button
          type="button"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => onApply(latex.trim(), true)}
          className="h-7 rounded-lg bg-[#d97757] px-3 text-[12px] font-medium text-white transition hover:bg-[#c96545]"
        >
          Chèn dạng khối
        </button>
      </div>
    </div>
  );
}

function ImageForm({ onApply }: { onApply: (url: string) => void }) {
  const [url, setUrl] = useState("");
  return (
    <div className="flex flex-col gap-2">
      <input
        autoFocus
        value={url}
        onChange={(event) => setUrl(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") onApply(url.trim());
        }}
        placeholder="URL hình ảnh..."
        className="h-8 w-full rounded-lg border border-[#e8e2d9] px-2 text-[13px] text-[#2b2926] outline-none focus:border-[#d97757]"
      />
      <div className="flex justify-end">
        <button
          type="button"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => onApply(url.trim())}
          className="h-7 rounded-lg bg-[#d97757] px-3 text-[12px] font-medium text-white transition hover:bg-[#c96545]"
        >
          Chèn
        </button>
      </div>
    </div>
  );
}

function ToolButton({
  children,
  label,
  onClick,
  strong = false,
  active = false,
  disabled = false,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  strong?: boolean;
  active?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      aria-pressed={active}
      className={`flex size-8 shrink-0 items-center justify-center rounded transition disabled:cursor-not-allowed disabled:opacity-40 ${
        active ? "bg-[#f3efe9] text-[#2b2926]" : "text-[#4f4943] hover:bg-[#f3efe9] hover:text-[#2b2926]"
      } ${strong ? "text-[14px] font-semibold" : ""}`}
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
function StrikeIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M4 12h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /><path d="M7 8a4 3 0 016-2.4M17 16a4 3 0 01-7 1.4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>; }
function SuperscriptIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M4 6l8 12M12 6L4 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /><path d="M18 4.4c1.6-.9 3 .1 3 1.2 0 1.2-2.2 1.6-2.9 3.4H21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>; }
function SubscriptIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M4 5l8 12M12 5L4 17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /><path d="M18 16.4c1.6-.9 3 .1 3 1.2 0 1.2-2.2 1.6-2.9 3.4H21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>; }
function TextColorIcon() { return <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden><path d="M3 12l5-9 5 9M5 9h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /><path d="M3 14h10" stroke="#d97757" strokeWidth="1.7" strokeLinecap="round" /></svg>; }
function MarkerIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M16.5 3.5l4 4L10 18H6v-4L16.5 3.5z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" /><path d="M4 21h16" stroke="#d97757" strokeWidth="2.5" strokeLinecap="round" /></svg>; }
function BulletIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M9 7h11M9 12h11M9 17h11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /><path d="M5 7h.01M5 12h.01M5 17h.01" stroke="currentColor" strokeWidth="3" strokeLinecap="round" /></svg>; }
function NumberListIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M10 7h10M10 12h10M10 17h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /><path d="M4 6h1v3M4 12h2l-2 3h2M4 18h2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>; }
function AlignLeftIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M4 6h16M4 10h10M4 14h16M4 18h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>; }
function AlignCenterIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M4 6h16M7 10h10M4 14h16M7 18h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>; }
function AlignRightIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M4 6h16M10 10h10M4 14h16M10 18h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>; }
function AlignJustifyIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M4 6h16M4 10h16M4 14h16M4 18h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>; }
function IndentIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M10 6h10M10 12h10M10 18h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /><path d="M3 9l3 3-3 3z" fill="currentColor" /></svg>; }
function OutdentIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M10 6h10M10 12h10M10 18h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /><path d="M6 9l-3 3 3 3z" fill="currentColor" /></svg>; }
function ClearFormatIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M6 5h12M9 5l-2 9M14 5l1 5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /><path d="M5 19h7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /><path d="M16 15l5 5M21 15l-5 5" stroke="#d97757" strokeWidth="1.7" strokeLinecap="round" /></svg>; }
function TableIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden><rect x="3.5" y="4.5" width="17" height="15" rx="1.5" stroke="currentColor" strokeWidth="1.6" /><path d="M3.5 9.5h17M3.5 14.5h17M9 4.5v15M15 4.5v15" stroke="currentColor" strokeWidth="1.4" /></svg>; }
function FormulaIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M18 4H6l5 8-5 8h12" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>; }
function LinkIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7L11.5 7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /><path d="M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7L12.5 17" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>; }
function UnlinkIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M9 15l-1.5 1.5a3.5 3.5 0 01-5-5L4 10M15 9l1.5-1.5a3.5 3.5 0 015 5L20 14" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /><path d="M4 4l16 16" stroke="#d97757" strokeWidth="1.7" strokeLinecap="round" /></svg>; }
function ImageIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden><rect x="3.5" y="5" width="17" height="14" rx="2" stroke="currentColor" strokeWidth="1.6" /><circle cx="9" cy="10" r="1.6" stroke="currentColor" strokeWidth="1.4" /><path d="M5 17l4.5-4 3 2.5L16 11l4 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>; }
function SymbolIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M16 19H8l5-7-5-7h8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>; }
function MoreIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden><circle cx="5" cy="12" r="1.7" /><circle cx="12" cy="12" r="1.7" /><circle cx="19" cy="12" r="1.7" /></svg>; }
