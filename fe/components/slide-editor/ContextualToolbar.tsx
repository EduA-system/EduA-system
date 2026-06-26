"use client";

// Thanh thuộc tính đổi theo element đang chọn (port + adapt từ /test-slide).
// Tự đọc store; multi-select → căn lề + phân bố, single → vị trí + thuộc tính theo loại.

import { useEditorStore } from "@/stores/slide-editor-store";
import type { AlignDir, ElementPatch, LineMarker, SlideElement } from "./types";
import { NumField, Sep, ToolBtn } from "./ui";
import { ColorPicker } from "./ColorPicker";
import { TextToolbar } from "./TextToolbar";

const ALIGNS: [AlignDir, string, string][] = [
  ["left", "←", "Căn trái"],
  ["cx", "⟺", "Giữa ngang"],
  ["right", "→", "Căn phải"],
  ["top", "↑", "Căn trên"],
  ["cy", "⇅", "Giữa dọc"],
  ["bottom", "↓", "Căn dưới"],
];

const MARKERS: [string, LineMarker | ""][] = [
  ["—", ""],
  ["▶", "arrow"],
  ["|", "bar"],
  ["■", "square"],
  ["●", "circle"],
  ["◆", "diamond"],
  ["□", "square-open"],
  ["○", "circle-open"],
];

const selCls =
  "rounded border border-black/15 bg-black/[0.03] px-1 py-0.5 text-xs text-[#1f1f1f] focus:border-[#1f1f1f] focus:outline-none";
const labelCls = "flex items-center gap-1 text-[10px] text-[#777] shrink-0";

type Upd = (patch: ElementPatch) => void;

// Ô vị trí/kích thước cho single (trừ line/arrow/draw vì dùng toạ độ riêng / phủ canvas).
function PosFields({ el, upd }: { el: SlideElement; upd: Upd }) {
  if (el.type === "line" || el.type === "arrow" || el.type === "draw") return null;
  return (
    <>
      <NumField label="X" value={el.x} w="w-10" onChange={(v) => upd({ x: v })} />
      <NumField label="Y" value={el.y} w="w-10" onChange={(v) => upd({ y: v })} />
      <NumField label="R" value={el.w} min={20} w="w-10" onChange={(v) => upd({ w: Math.max(20, v) })} />
      <NumField label="C" value={el.h} min={20} w="w-10" onChange={(v) => upd({ h: Math.max(20, v) })} />
      <NumField label="↻" value={el.rotation} w="w-10" onChange={(v) => upd({ rotation: v })} />
      <Sep />
    </>
  );
}

function TypeControls({ el, upd }: { el: SlideElement; upd: Upd }) {
  if (el.type === "shape" || el.type === "poly") {
    return (
      <>
        <ColorPicker label="Màu nền" value={el.fill} onChange={(v) => upd({ fill: v })} />
        <ColorPicker label="Viền" value={el.stroke} onChange={(v) => upd({ stroke: v })} allowGradient={false} />
        <Sep />
        <NumField label="Dày viền" value={el.strokeW} min={0} w="w-10" onChange={(v) => upd({ strokeW: v })} />
        {el.type === "shape" && (
          <>
            <Sep />
            <label className={labelCls}>
              <span>Bo góc</span>
              <input type="range" min={0} max={200} value={el.borderRadius} onChange={(e) => upd({ borderRadius: Number(e.target.value) })} className="w-16" />
            </label>
          </>
        )}
        <Sep />
        <label className={labelCls}>
          <span>Độ mờ</span>
          <input type="range" min={0} max={1} step={0.05} value={el.opacity} onChange={(e) => upd({ opacity: Number(e.target.value) })} className="w-16" />
          <span className="w-7 text-right text-[#777]">{Math.round(el.opacity * 100)}%</span>
        </label>
      </>
    );
  }

  if (el.type === "image") {
    return (
      <>
        {(["cover", "contain", "fill"] as const).map((f) => (
          <ToolBtn key={f} active={el.fit === f} onClick={() => upd({ fit: f })}>
            <span className="text-[10px]">{f === "cover" ? "Lấp đầy" : f === "contain" ? "Vừa khung" : "Kéo giãn"}</span>
          </ToolBtn>
        ))}
        <Sep />
        <ToolBtn active={!!el.flipH} onClick={() => upd({ flipH: !el.flipH })} title="Lật ngang">⇆</ToolBtn>
        <ToolBtn active={!!el.flipV} onClick={() => upd({ flipV: !el.flipV })} title="Lật dọc">⇅</ToolBtn>
        <Sep />
        <label className={labelCls}>
          <span>Sáng</span>
          <input type="range" min={30} max={200} value={el.brightness ?? 100} onChange={(e) => upd({ brightness: Number(e.target.value) })} className="w-16" />
        </label>
        <label className={labelCls}>
          <span>Tương phản</span>
          <input type="range" min={30} max={200} value={el.contrast ?? 100} onChange={(e) => upd({ contrast: Number(e.target.value) })} className="w-16" />
        </label>
        <Sep />
        <label className={labelCls}>
          <span>Bo góc</span>
          <input type="range" min={0} max={200} value={el.borderRadius} onChange={(e) => upd({ borderRadius: Number(e.target.value) })} className="w-16" />
        </label>
      </>
    );
  }

  if (el.type === "line" || el.type === "arrow") {
    return (
      <>
        <ColorPicker label="Màu" value={el.stroke} onChange={(v) => upd({ stroke: v })} allowGradient={false} allowTransparent={false} />
        <NumField label="Dày" value={el.strokeW} min={1} w="w-10" onChange={(v) => upd({ strokeW: v })} />
        <Sep />
        {(["solid", "dashed", "dotted", "fine"] as const).map((ds) => (
          <ToolBtn key={ds} active={el.dashStyle === ds} onClick={() => upd({ dashStyle: ds })} title={ds}>
            <span className="text-[10px]">{ds === "solid" ? "—" : ds === "dashed" ? "╌" : ds === "dotted" ? "···" : "‧‧‧"}</span>
          </ToolBtn>
        ))}
        <Sep />
        <label className={labelCls}>
          <span>Đầu</span>
          <select
            value={el.lineMarkerStart ?? ""}
            onChange={(e) => upd({ lineMarkerStart: (e.target.value || undefined) as LineMarker | undefined })}
            className={selCls}
            title="Marker đầu"
          >
            {MARKERS.map(([icon, val]) => <option key={val} value={val}>{icon}</option>)}
          </select>
        </label>
        <label className={labelCls}>
          <span>Cuối</span>
          <select
            value={el.lineMarkerEnd ?? ""}
            onChange={(e) => upd({ lineMarkerEnd: (e.target.value || undefined) as LineMarker | undefined })}
            className={selCls}
            title="Marker cuối"
          >
            {MARKERS.map(([icon, val]) => <option key={val} value={val}>{icon}</option>)}
          </select>
        </label>
        {el.type === "arrow" && !el.lineMarkerStart && !el.lineMarkerEnd && (
          <>
            <Sep />
            {(["end", "both", "none"] as const).map((ah) => (
              <ToolBtn key={ah} active={el.arrowHead === ah} onClick={() => upd({ arrowHead: ah })} title={ah === "end" ? "1 đầu" : ah === "both" ? "2 đầu" : "Không"}>
                <span className="text-[10px]">{ah === "end" ? "→" : ah === "both" ? "↔" : "—"}</span>
              </ToolBtn>
            ))}
          </>
        )}
      </>
    );
  }

  if (el.type === "draw") {
    return (
      <>
        <ColorPicker label="Màu" value={el.stroke} onChange={(v) => upd({ stroke: v })} allowGradient={false} allowTransparent={false} />
        <NumField label="Dày" value={el.strokeW} min={1} w="w-10" onChange={(v) => upd({ strokeW: v })} />
      </>
    );
  }

  return null;
}

export function ContextualToolbar() {
  const selectedIds = useEditorStore((s) => s.selectedIds);
  const slide = useEditorStore((s) => s.slides.find((sl) => sl.id === s.currentSlideId));
  const updateMany = useEditorStore((s) => s.updateMany);
  const alignElements = useEditorStore((s) => s.alignElements);
  const distribute = useEditorStore((s) => s.distribute);
  const setSlideBackground = useEditorStore((s) => s.setSlideBackground);

  const single =
    selectedIds.length === 1
      ? slide?.elements.find((el) => el.id === selectedIds[0]) ?? null
      : null;

  const upd: Upd = (patch) => updateMany(selectedIds, patch);

  return (
    <div className="pointer-events-none absolute inset-x-0 top-3 z-30 flex justify-center px-4">
      <div className="pointer-events-auto flex max-w-full items-center gap-0.5 overflow-x-auto rounded-[14px] border border-black/[0.07] bg-white px-2 py-1.5 shadow-[0_2px_8px_rgba(0,0,0,0.08),0_8px_24px_rgba(0,0,0,0.08)]">
      {selectedIds.length >= 2 ? (
        <>
          <span className="mr-1 shrink-0 text-[10px] text-[#777]">Căn:</span>
          {ALIGNS.map(([d, icon, title]) => (
            <ToolBtn key={d} onClick={() => alignElements(d)} title={title}>{icon}</ToolBtn>
          ))}
          <Sep />
          <span className="mr-1 shrink-0 text-[10px] text-[#777]">Phân bố:</span>
          <ToolBtn onClick={() => distribute("h")} title="Đều ngang">⇔</ToolBtn>
          <ToolBtn onClick={() => distribute("v")} title="Đều dọc">⇕</ToolBtn>
        </>
      ) : single ? (
        single.type === "text" ? (
          <TextToolbar el={single} upd={upd} />
        ) : (
          <>
            <PosFields el={single} upd={upd} />
            <TypeControls el={single} upd={upd} />
          </>
        )
      ) : (
        <>
          <span className="mr-1 text-[10px] text-[#777]">Nền slide:</span>
          <ColorPicker value={slide?.bg ?? "#ffffff"} onChange={(v) => setSlideBackground(v)} />
          <span className="ml-2 text-xs text-[#999]">Chọn phần tử để chỉnh sửa</span>
        </>
      )}
      </div>
    </div>
  );
}
