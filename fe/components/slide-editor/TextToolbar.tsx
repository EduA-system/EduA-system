"use client";

// Thanh công cụ cho text — bố cục/gom nhóm theo thanh text của Canva.
// Chỉ dùng cho single text element. Các control hay dùng để inline, phần còn
// lại gom vào popover (font phụ / aA / căn lề / danh sách / spacing / độ mờ /
// vị trí). Dữ liệu đã có sẵn trong TextElement + opacity nên không đổi schema.

import { type ElementPatch, type TextElement, type TextTransform } from "./types";
import { AlignIcon, Chevron, LineSpacingIcon, ListIcon, OpacityIcon, Sep, ToolBtn } from "./ui";
import { ColorPicker } from "./ColorPicker";
import { Popover } from "./Popover";
import { ensureTextBoxHeight } from "./lib/text-box";

type Upd = (patch: ElementPatch) => void;

const FONT_LIST: [string, string][] = [
  ["Mặc định", ""],
  ["Inter", "Inter, sans-serif"],
  ["Arial", "Arial, sans-serif"],
  ["Georgia", "Georgia, serif"],
  ["Times New Roman", "Times New Roman, serif"],
  ["Courier New", "Courier New, monospace"],
  ["Verdana", "Verdana, sans-serif"],
  ["Trebuchet MS", "Trebuchet MS, sans-serif"],
  ["Comic Sans MS", "Comic Sans MS, cursive"],
];

const TRANSFORMS: [TextTransform, string, string][] = [
  ["none", "Aa", "Bình thường"],
  ["uppercase", "AB", "IN HOA"],
  ["lowercase", "ab", "thường"],
  ["capitalize", "Ab", "Viết Hoa Đầu Từ"],
];

const ALIGNS: ["left" | "center" | "right", string][] = [
  ["left", "Căn trái"],
  ["center", "Căn giữa"],
  ["right", "Căn phải"],
];

const selCls =
  "h-8 max-w-[132px] rounded-[10px] border border-[#e8e2d9] bg-white px-3 text-[13px] text-[#2b2926] focus:border-[#d97757] focus:outline-none";
const menuItemCls =
  "flex w-full items-center gap-1.5 rounded-[10px] px-2.5 py-1 text-left text-xs text-[#2b2926] hover:bg-[#f7f3ee]";

// Nút − [số] + cho cỡ chữ (kiểu Canva).
function FontSizeInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const set = (v: number) => onChange(Math.max(6, Math.min(800, v)));
  const rounded = Math.round(value);
  return (
    <div className="flex h-8 shrink-0 items-center overflow-hidden rounded-[10px] border border-[#e8e2d9] bg-white">
      <button
        type="button"
        onClick={() => set(rounded - 1)}
        title="Giảm cỡ chữ"
        className="flex h-full w-7 items-center justify-center text-[15px] text-[#4f4943] hover:bg-[#f7f3ee]"
      >
        -
      </button>
      <input
        type="number"
        min={6}
        max={800}
        value={rounded}
        onChange={(e) => {
          const next = Number(e.target.value);
          if (Number.isFinite(next)) set(next);
        }}
        title="Font size"
        className="h-full w-[44px] border-x border-[#e8e2d9] bg-white px-1 text-center text-[13px] text-[#2b2926] outline-none [appearance:textfield] focus:bg-[#fbfaf8] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
      <button
        type="button"
        onClick={() => set(rounded + 1)}
        title="Tăng cỡ chữ"
        className="flex h-full w-7 items-center justify-center text-[15px] text-[#4f4943] hover:bg-[#f7f3ee]"
      >
        +
      </button>
    </div>
  );
}

// Hàng slider trong popover (giãn dòng / giãn chữ / độ mờ).
function SliderRow({
  label, value, min, max, step, fmt, onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  fmt: (v: number) => string;
  onChange: (v: number) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-[11px] text-[#4f4943]">
      <span className="w-14 shrink-0">{label}</span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="edua-range flex-1" />
      <span className="w-10 shrink-0 text-right text-[#8a8178]">{fmt(value)}</span>
    </label>
  );
}

function OpacityPanel({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <label className="grid grid-cols-[46px_minmax(0,1fr)_28px] items-center gap-2 px-0.5 py-0.5 text-[12px] text-[#4f4943]">
      <span className="shrink-0">Độ mờ</span>
      <input
        type="range"
        min={0}
        max={100}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="edua-range min-w-0"
      />
      <span className="shrink-0 text-right text-[#8a8178]">{value}</span>
    </label>
  );
}

function TextColorIcon({ color }: { color: string }) {
  return (
    <span className="flex h-6 w-6 flex-col items-center justify-center leading-none text-[#2b2926]">
      <span className="block h-[15px] text-center text-[15px] font-bold leading-[15px]">A</span>
      <span className="mt-1 h-[3px] w-[15px] rounded-full" style={{ background: color }} />
    </span>
  );
}

function MoreHorizontalIcon() {
  return (
    <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none">
      <circle cx="6.5" cy="12" r="1.35" fill="currentColor" />
      <circle cx="12" cy="12" r="1.35" fill="currentColor" />
      <circle cx="17.5" cy="12" r="1.35" fill="currentColor" />
    </svg>
  );
}

export function TextToolbar({ el, upd, onOpenProperties }: { el: TextElement; upd: Upd; onOpenProperties: () => void }) {
  const curTransform = TRANSFORMS.find(([t]) => t === (el.textTransform ?? "none")) ?? TRANSFORMS[0];
  const updateText = (patch: ElementPatch) => upd(ensureTextBoxHeight(el, patch));

  return (
    <div className="flex w-full shrink-0 items-center gap-1 overflow-x-auto overflow-y-hidden px-0">
      {/* Font family */}
      <select
        value={el.fontFamily ?? ""}
        onChange={(e) => updateText({ fontFamily: e.target.value || undefined })}
        className={selCls}
        title="Phông chữ"
        style={{ fontFamily: el.fontFamily || undefined }}
      >
        {FONT_LIST.map(([name, val]) => (
          <option key={val} value={val} style={{ fontFamily: val || undefined }}>{name}</option>
        ))}
      </select>

      {/* Cỡ chữ */}
      <FontSizeInput value={el.fontSize} onChange={(v) => updateText({ fontSize: v })} />

      <Sep />
      {/* Text color */}
      <ColorPicker
        value={el.color}
        onChange={(v) => updateText({ color: v })}
        allowGradient={false}
        allowTransparent={false}
        size="sm"
        triggerContent={<TextColorIcon color={el.color} />}
        triggerClassName="!flex !h-8 !w-8 !items-center !justify-center !rounded-[10px] !border-0 !bg-transparent hover:!bg-[#f7f3ee] !shadow-none"
        triggerStyle={{ background: "transparent" }}
      />

      <Sep />

      {/* Định dạng */}
      <ToolBtn active={el.bold} onClick={() => updateText({ bold: !el.bold })} title="Đậm"><b>B</b></ToolBtn>
      <ToolBtn active={el.italic} onClick={() => updateText({ italic: !el.italic })} title="Nghiêng"><i>I</i></ToolBtn>
      <ToolBtn active={!!el.underline} onClick={() => updateText({ underline: !el.underline })} title="Gạch chân"><u>U</u></ToolBtn>
      <ToolBtn active={!!el.strikethrough} onClick={() => updateText({ strikethrough: !el.strikethrough })} title="Gạch ngang"><s>S</s></ToolBtn>

      <Sep />

      {/* Hoa/thường */}
      <Popover
        title="Kiểu chữ hoa/thường"
        width={170}
        estHeight={180}
        closeOnSelect
        active={(el.textTransform ?? "none") !== "none"}
        triggerContent={<span className="flex items-center text-[13px] font-medium">{curTransform[1]}<Chevron /></span>}
      >
        {TRANSFORMS.map(([t, icon, name]) => (
          <button key={t} className={menuItemCls} onClick={() => updateText({ textTransform: t })}>
            <span className="w-6 font-semibold">{icon}</span>
            <span>{name}</span>
          </button>
        ))}
      </Popover>

      {/* Căn lề */}
      <Popover
        title="Căn lề"
        width={150}
        estHeight={150}
        closeOnSelect
        triggerContent={<span className="flex items-center"><AlignIcon align={el.align} /><Chevron /></span>}
      >
        {ALIGNS.map(([a, name]) => (
          <button key={a} className={`${menuItemCls} ${el.align === a ? "bg-[#f6eadf]" : ""}`} onClick={() => updateText({ align: a })}>
            <AlignIcon align={a} /><span>{name}</span>
          </button>
        ))}
      </Popover>

      {/* Danh sách */}
      <Popover
        title="Danh sách"
        width={170}
        estHeight={150}
        closeOnSelect
        active={(el.listStyle ?? "none") !== "none"}
        triggerContent={<span className="flex items-center"><ListIcon /><Chevron /></span>}
      >
        {([
          ["none", "—", "Không"],
          ["bullet", "•≡", "Dấu chấm"],
          ["numbered", "1≡", "Đánh số"],
        ] as const).map(([ls, icon, name]) => (
          <button key={ls} className={`${menuItemCls} ${(el.listStyle ?? "none") === ls ? "bg-[#f6eadf]" : ""}`} onClick={() => updateText({ listStyle: ls })}>
            <span className="w-6">{icon}</span><span>{name}</span>
          </button>
        ))}
      </Popover>

      <Sep />

      {/* Khoảng cách */}
      <Popover
        title="Khoảng cách"
        width={240}
        estHeight={120}
        triggerContent={<LineSpacingIcon />}
      >
        <SliderRow label="Giãn dòng" value={el.lineHeight ?? 1.2} min={0.5} max={3} step={0.1} fmt={(v) => v.toFixed(1)} onChange={(v) => updateText({ lineHeight: v })} />
        <SliderRow label="Giãn chữ" value={el.letterSpacing ?? 0} min={-5} max={20} step={0.5} fmt={(v) => v.toFixed(1)} onChange={(v) => updateText({ letterSpacing: v })} />
      </Popover>

      {/* Độ trong suốt */}
      <Popover
        title="Độ trong suốt"
        width={224}
        estHeight={56}
        triggerContent={<OpacityIcon />}
        highlightWhenOpen={false}
      >
        <OpacityPanel value={Math.round(el.opacity * 100)} onChange={(v) => upd({ opacity: v / 100 })} />
      </Popover>

      <Sep />

      <ToolBtn onClick={onOpenProperties} title="Properties">
        <MoreHorizontalIcon />
      </ToolBtn>
    </div>
  );
}
