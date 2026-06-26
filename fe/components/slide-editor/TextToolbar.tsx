"use client";

// Thanh công cụ cho text — bố cục/gom nhóm theo thanh text của Canva.
// Chỉ dùng cho single text element. Các control hay dùng để inline, phần còn
// lại gom vào popover (font phụ / aA / căn lề / danh sách / spacing / độ mờ /
// vị trí). Dữ liệu đã có sẵn trong TextElement + opacity nên không đổi schema.

import { useEditorStore } from "@/stores/slide-editor-store";
import { CANVAS_W, CANVAS_H, type ElementPatch, type TextElement, type TextTransform } from "./types";
import { AlignIcon, Chevron, HighlightIcon, LineSpacingIcon, ListIcon, OpacityIcon, Sep, ToolBtn } from "./ui";
import { ColorPicker } from "./ColorPicker";
import { Popover } from "./Popover";

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
  "h-8 max-w-[140px] rounded-lg border border-black/10 bg-white px-2.5 text-[13px] text-[#1f1f1f] focus:border-[#1f1f1f] focus:outline-none";
const menuItemCls =
  "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs text-[#1f1f1f] hover:bg-black/5";

// Nút − [số] + cho cỡ chữ (kiểu Canva).
function SizeStepper({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const set = (v: number) => onChange(Math.max(6, Math.min(800, v)));
  return (
    <div className="flex h-8 shrink-0 items-center rounded-lg border border-black/10 bg-white">
      <button onClick={() => set(value - 1)} className="flex h-full w-7 items-center justify-center rounded-l-lg text-base text-[#555] hover:bg-black/5" title="Giảm cỡ">−</button>
      <input
        type="number"
        min={6}
        value={Math.round(value)}
        onChange={(e) => set(Number(e.target.value))}
        className="w-10 border-x border-black/10 bg-transparent px-1 text-center text-[13px] text-[#1f1f1f] focus:outline-none"
      />
      <button onClick={() => set(value + 1)} className="flex h-full w-7 items-center justify-center rounded-r-lg text-base text-[#555] hover:bg-black/5" title="Tăng cỡ">+</button>
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
    <label className="flex items-center gap-2 text-[11px] text-[#555]">
      <span className="w-16 shrink-0">{label}</span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="flex-1" />
      <span className="w-10 shrink-0 text-right text-[#777]">{fmt(value)}</span>
    </label>
  );
}

function PosRow({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="flex items-center gap-2 text-[11px] text-[#555]">
      <span className="w-6 shrink-0">{label}</span>
      <input
        type="number"
        value={Math.round(value)}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full rounded border border-black/15 bg-black/[0.03] px-1.5 py-1 text-xs text-[#1f1f1f] focus:border-[#1f1f1f] focus:outline-none"
      />
    </label>
  );
}

export function TextToolbar({ el, upd }: { el: TextElement; upd: Upd }) {
  const bringForward = useEditorStore((s) => s.bringForward);
  const sendBackward = useEditorStore((s) => s.sendBackward);
  const bringToFront = useEditorStore((s) => s.bringToFront);
  const sendToBack = useEditorStore((s) => s.sendToBack);

  const curTransform = TRANSFORMS.find(([t]) => t === (el.textTransform ?? "none")) ?? TRANSFORMS[0];

  return (
    <div className="flex w-full shrink-0 items-center gap-1 overflow-x-auto overflow-y-hidden px-0">
      {/* Font family */}
      <select
        value={el.fontFamily ?? ""}
        onChange={(e) => upd({ fontFamily: e.target.value || undefined })}
        className={selCls}
        title="Phông chữ"
        style={{ fontFamily: el.fontFamily || undefined }}
      >
        {FONT_LIST.map(([name, val]) => (
          <option key={val} value={val} style={{ fontFamily: val || undefined }}>{name}</option>
        ))}
      </select>

      {/* Cỡ chữ */}
      <SizeStepper value={el.fontSize} onChange={(v) => upd({ fontSize: v })} />

      <Sep />

      {/* Màu chữ + nền chữ (highlight) */}
      <ColorPicker label={<span className="text-[13px] font-semibold">A</span>} value={el.color} onChange={(v) => upd({ color: v })} allowGradient={false} allowTransparent={false} size="sm" />
      <ColorPicker label={<HighlightIcon />} value={el.textBg ?? "transparent"} onChange={(v) => upd({ textBg: v })} size="sm" />

      <Sep />

      {/* Định dạng */}
      <ToolBtn active={el.bold} onClick={() => upd({ bold: !el.bold })} title="Đậm"><b>B</b></ToolBtn>
      <ToolBtn active={el.italic} onClick={() => upd({ italic: !el.italic })} title="Nghiêng"><i>I</i></ToolBtn>
      <ToolBtn active={!!el.underline} onClick={() => upd({ underline: !el.underline })} title="Gạch chân"><u>U</u></ToolBtn>
      <ToolBtn active={!!el.strikethrough} onClick={() => upd({ strikethrough: !el.strikethrough })} title="Gạch ngang"><s>S</s></ToolBtn>

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
          <button key={t} className={menuItemCls} onClick={() => upd({ textTransform: t })}>
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
          <button key={a} className={`${menuItemCls} ${el.align === a ? "bg-black/5" : ""}`} onClick={() => upd({ align: a })}>
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
          <button key={ls} className={`${menuItemCls} ${(el.listStyle ?? "none") === ls ? "bg-black/5" : ""}`} onClick={() => upd({ listStyle: ls })}>
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
        <SliderRow label="Giãn dòng" value={el.lineHeight ?? 1.2} min={0.5} max={3} step={0.1} fmt={(v) => v.toFixed(1)} onChange={(v) => upd({ lineHeight: v })} />
        <SliderRow label="Giãn chữ" value={el.letterSpacing ?? 0} min={-5} max={20} step={0.5} fmt={(v) => v.toFixed(1)} onChange={(v) => upd({ letterSpacing: v })} />
      </Popover>

      {/* Độ trong suốt */}
      <Popover
        title="Độ trong suốt"
        width={240}
        estHeight={80}
        triggerContent={<OpacityIcon />}
      >
        <SliderRow label="Độ mờ" value={Math.round(el.opacity * 100)} min={0} max={100} step={1} fmt={(v) => `${v}%`} onChange={(v) => upd({ opacity: v / 100 })} />
      </Popover>

      <Sep />

      {/* Vị trí */}
      <Popover
        title="Vị trí"
        width={240}
        estHeight={300}
        triggerContent={<span className="flex items-center text-[13px] font-medium">Vị trí<Chevron /></span>}
      >
        <div className="grid grid-cols-2 gap-2">
          <PosRow label="X" value={el.x} onChange={(v) => upd({ x: v })} />
          <PosRow label="Y" value={el.y} onChange={(v) => upd({ y: v })} />
          <PosRow label="R" value={el.w} onChange={(v) => upd({ w: Math.max(20, v) })} />
          <PosRow label="C" value={el.h} onChange={(v) => upd({ h: Math.max(20, v) })} />
          <PosRow label="↻" value={el.rotation} onChange={(v) => upd({ rotation: v })} />
        </div>

        <div className="border-t border-black/10 pt-2">
          <p className="mb-1 text-[10px] text-[#777]">Căn theo trang</p>
          <div className="flex flex-wrap gap-1">
            <button className={menuItemCls + " w-auto"} onClick={() => upd({ x: 0 })} title="Trái"><AlignIcon align="left" /></button>
            <button className={menuItemCls + " w-auto"} onClick={() => upd({ x: (CANVAS_W - el.w) / 2 })} title="Giữa ngang"><AlignIcon align="center" /></button>
            <button className={menuItemCls + " w-auto"} onClick={() => upd({ x: CANVAS_W - el.w })} title="Phải"><AlignIcon align="right" /></button>
            <button className={menuItemCls + " w-auto"} onClick={() => upd({ y: 0 })} title="Trên">↑</button>
            <button className={menuItemCls + " w-auto"} onClick={() => upd({ y: (CANVAS_H - el.h) / 2 })} title="Giữa dọc">↕</button>
            <button className={menuItemCls + " w-auto"} onClick={() => upd({ y: CANVAS_H - el.h })} title="Dưới">↓</button>
          </div>
        </div>

        <div className="border-t border-black/10 pt-2">
          <p className="mb-1 text-[10px] text-[#777]">Thứ tự lớp</p>
          <button className={menuItemCls} onClick={() => bringToFront(el.id)}>Lên trên cùng</button>
          <button className={menuItemCls} onClick={() => bringForward(el.id)}>Đưa lên</button>
          <button className={menuItemCls} onClick={() => sendBackward(el.id)}>Đưa xuống</button>
          <button className={menuItemCls} onClick={() => sendToBack(el.id)}>Xuống dưới cùng</button>
        </div>
      </Popover>
    </div>
  );
}
