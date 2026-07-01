"use client";

import { useEditorStore } from "@/stores/slide-editor-store";
import {
  isSlideLockedForGeneration,
  type AlignDir,
  type ElementPatch,
  type DashStyle,
  type LineMarker,
  type SlideElement,
} from "./types";
import { Sep, ToolBtn, OpacityIcon } from "./ui";
import { ColorPicker } from "./ColorPicker";
import { TextToolbar } from "./TextToolbar";
import { Popover } from "./Popover";

type Upd = (patch: ElementPatch) => void;

const ALIGNS: [AlignDir, React.ReactNode, string][] = [
  ["left", <AlignLeftIcon key="left" />, "Align left"],
  ["cx", <AlignCenterHIcon key="cx" />, "Align center"],
  ["right", <AlignRightIcon key="right" />, "Align right"],
  ["top", <AlignTopIcon key="top" />, "Align top"],
  ["cy", <AlignCenterVIcon key="cy" />, "Align middle"],
  ["bottom", <AlignBottomIcon key="bottom" />, "Align bottom"],
];

const MARKERS: { value: LineMarker | ""; icon: React.ReactNode; title: string }[] = [
  { value: "", icon: <LinePlainIcon />, title: "None" },
  { value: "arrow", icon: <ArrowMarkerIcon />, title: "Arrow" },
  { value: "bar", icon: <BarMarkerIcon />, title: "Bar" },
  { value: "square", icon: <SquareMarkerIcon />, title: "Square" },
  { value: "circle", icon: <CircleMarkerIcon />, title: "Circle" },
  { value: "diamond", icon: <DiamondMarkerIcon />, title: "Diamond" },
  { value: "square-open", icon: <SquareOpenMarkerIcon />, title: "Open square" },
  { value: "circle-open", icon: <CircleOpenMarkerIcon />, title: "Open circle" },
];

function IconSvg({ children }: { children: React.ReactNode }) {
  return (
    <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  );
}

function AlignLeftIcon() {
  return <IconSvg><path d="M5 5v14" /><path d="M9 7h10" /><path d="M9 12h7" /><path d="M9 17h10" /></IconSvg>;
}
function AlignCenterHIcon() {
  return <IconSvg><path d="M12 4v16" /><path d="M6 7h12" /><path d="M8 12h8" /><path d="M6 17h12" /></IconSvg>;
}
function AlignRightIcon() {
  return <IconSvg><path d="M19 5v14" /><path d="M5 7h10" /><path d="M8 12h7" /><path d="M5 17h10" /></IconSvg>;
}
function AlignTopIcon() {
  return <IconSvg><path d="M5 5h14" /><path d="M7 9v10" /><path d="M12 9v7" /><path d="M17 9v10" /></IconSvg>;
}
function AlignCenterVIcon() {
  return <IconSvg><path d="M4 12h16" /><path d="M7 6v12" /><path d="M12 8v8" /><path d="M17 6v12" /></IconSvg>;
}
function AlignBottomIcon() {
  return <IconSvg><path d="M5 19h14" /><path d="M7 5v10" /><path d="M12 8v7" /><path d="M17 5v10" /></IconSvg>;
}
function DistributeHIcon() {
  return <IconSvg><path d="M4 5v14" /><path d="M20 5v14" /><rect x="8" y="8" width="3" height="8" rx="1" /><rect x="13" y="8" width="3" height="8" rx="1" /></IconSvg>;
}
function DistributeVIcon() {
  return <IconSvg><path d="M5 4h14" /><path d="M5 20h14" /><rect x="8" y="8" width="8" height="3" rx="1" /><rect x="8" y="13" width="8" height="3" rx="1" /></IconSvg>;
}
function StrokeWeightIcon() {
  return <IconSvg><path d="M5 7h14" /><path d="M5 12h14" strokeWidth="2.4" /><path d="M5 18h14" strokeWidth="3.2" /></IconSvg>;
}
function DashIcon({ dash }: { dash: "solid" | "dashed" | "dotted" | "fine" }) {
  const dashArray = dash === "solid" ? undefined : dash === "dashed" ? "5 4" : dash === "dotted" ? "1 4" : "2 3";
  return <IconSvg><path d="M4 12h16" strokeDasharray={dashArray} strokeWidth="2.2" /></IconSvg>;
}
function FlipHIcon() {
  return <IconSvg><path d="M5 7h5v10H5z" /><path d="M14 7h5v10h-5z" /><path d="M12 5v14" /></IconSvg>;
}
function FlipVIcon() {
  return <IconSvg><path d="M7 5h10v5H7z" /><path d="M7 14h10v5H7z" /><path d="M5 12h14" /></IconSvg>;
}
function BrightnessIcon() {
  return <IconSvg><circle cx="12" cy="12" r="4" /><path d="M12 2v2" /><path d="M12 20v2" /><path d="m4.9 4.9 1.4 1.4" /><path d="m17.7 17.7 1.4 1.4" /><path d="M2 12h2" /><path d="M20 12h2" /><path d="m4.9 19.1 1.4-1.4" /><path d="m17.7 6.3 1.4-1.4" /></IconSvg>;
}
function CropCoverIcon() {
  return <IconSvg><rect x="4" y="5" width="16" height="14" rx="2" /><path d="M4 15l4-4 3 3 3-4 6 6" /></IconSvg>;
}
function FitContainIcon() {
  return <IconSvg><rect x="4" y="5" width="16" height="14" rx="2" /><rect x="8" y="8" width="8" height="8" rx="1" /></IconSvg>;
}
function FillStretchIcon() {
  return <IconSvg><rect x="4" y="5" width="16" height="14" rx="2" /><path d="M8 9h8" /><path d="M8 15h8" /><path d="M8 9v6" /><path d="M16 9v6" /></IconSvg>;
}
function LinePlainIcon() {
  return <IconSvg><path d="M5 12h14" /></IconSvg>;
}
function ArrowMarkerIcon() {
  return <IconSvg><path d="M5 12h12" /><path d="m13 8 4 4-4 4" /></IconSvg>;
}
function BarMarkerIcon() {
  return <IconSvg><path d="M6 12h12" /><path d="M18 7v10" /></IconSvg>;
}
function SquareMarkerIcon() {
  return <IconSvg><path d="M5 12h10" /><rect x="15" y="9" width="6" height="6" fill="currentColor" stroke="none" /></IconSvg>;
}
function CircleMarkerIcon() {
  return <IconSvg><path d="M5 12h10" /><circle cx="18" cy="12" r="3" fill="currentColor" stroke="none" /></IconSvg>;
}
function DiamondMarkerIcon() {
  return <IconSvg><path d="M5 12h9" /><path d="M18 8l4 4-4 4-4-4z" fill="currentColor" stroke="none" /></IconSvg>;
}
function SquareOpenMarkerIcon() {
  return <IconSvg><path d="M5 12h10" /><rect x="15" y="9" width="6" height="6" /></IconSvg>;
}
function CircleOpenMarkerIcon() {
  return <IconSvg><path d="M5 12h10" /><circle cx="18" cy="12" r="3" /></IconSvg>;
}
function StrokeColorIcon() {
  return <IconSvg><rect x="5" y="5" width="14" height="14" rx="2" /><path d="M8 16h8" strokeWidth="2.8" /></IconSvg>;
}
function MoreHorizontalIcon() {
  return <IconSvg><circle cx="6.5" cy="12" r="1.25" fill="currentColor" stroke="none" /><circle cx="12" cy="12" r="1.25" fill="currentColor" stroke="none" /><circle cx="17.5" cy="12" r="1.25" fill="currentColor" stroke="none" /></IconSvg>;
}
function NoStrokeIcon() {
  return <IconSvg><circle cx="12" cy="12" r="7" /><path d="M7 17 17 7" /></IconSvg>;
}

function TransparencyGridIcon() {
  return (
    <svg className="h-[18px] w-[18px]" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path d="M2 2h14v14H2z" fill="#ffffff" />
      <path d="M2 2h3.5v3.5H2zM9 2h3.5v3.5H9zM5.5 5.5H9V9H5.5zM12.5 5.5H16V9h-3.5zM2 9h3.5v3.5H2zM9 9h3.5v3.5H9zM5.5 12.5H9V16H5.5zM12.5 12.5H16V16h-3.5z" fill="#b8aea5" />

    </svg>
  );
}

type StrokeStyleValue = DashStyle | "none";

const STROKE_STYLE_OPTIONS: { value: StrokeStyleValue; title: string; icon: React.ReactNode }[] = [
  { value: "none", title: "Không viền", icon: <NoStrokeIcon /> },
  { value: "solid", title: "Viền liền", icon: <DashIcon dash="solid" /> },
  { value: "dashed", title: "Viền nét đứt", icon: <DashIcon dash="dashed" /> },
  { value: "dotted", title: "Viền chấm", icon: <DashIcon dash="dotted" /> },
  { value: "fine", title: "Viền chấm nhỏ", icon: <DashIcon dash="fine" /> },
];

function SliderRow({
  label,
  value,
  min,
  max,
  step,
  format = (v: number) => String(v),
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format?: (v: number) => string;
  onChange: (v: number) => void;
}) {
  return (
    <label className="grid grid-cols-[56px_minmax(0,1fr)_38px] items-center gap-2 text-[11px] text-[#4f4943]">
      <span className="shrink-0 truncate">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="edua-range min-w-0"
      />
      <span className="shrink-0 text-right text-[#8a8178]">{format(value)}</span>
    </label>
  );
}

function StrokeWeightPanel({
  value,
  dashStyle,
  min = 0,
  max = 30,
  onWeightChange,
  onDashChange,
}: {
  value: number;
  dashStyle?: DashStyle;
  min?: number;
  max?: number;
  onWeightChange: (value: number) => void;
  onDashChange: (value: DashStyle) => void;
}) {
  const selectedStyle: StrokeStyleValue = value <= 0 ? "none" : dashStyle ?? "solid";

  function selectStyle(next: StrokeStyleValue) {
    if (next === "none") {
      onWeightChange(0);
      onDashChange("solid");
      return;
    }
    onDashChange(next);
    if (value <= 0) onWeightChange(1);
  }

  return (
    <div className="w-full p-0.5">
      <div className="grid grid-cols-5 gap-1">
        {STROKE_STYLE_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            title={option.title}
            onClick={() => selectStyle(option.value)}
            className={`flex h-8 items-center justify-center rounded-[8px] border text-[#2b2926] transition-colors ${
              selectedStyle === option.value
                ? "border-[#d97757] bg-[#f6eadf] text-[#d97757]"
                : "border-[#e8e2d9] bg-white hover:bg-[#f7f3ee]"
            }`}
          >
            {option.icon}
          </button>
        ))}
      </div>
      <div className="mt-2 text-[11px] font-medium text-[#2b2926]">Độ đậm đường viền</div>
      <div className="mt-1.5 grid grid-cols-[minmax(0,1fr)_34px] items-center gap-2">
        <input
          type="range"
          min={min}
          max={max}
          step={1}
          value={value}
          onChange={(e) => onWeightChange(Number(e.target.value))}
          className="edua-range min-w-0"
        />
        <input
          type="number"
          min={min}
          max={max}
          value={value}
          onChange={(e) => onWeightChange(Number(e.target.value))}
          className="h-8 w-[34px] rounded-[10px] border border-[#e8e2d9] bg-white text-center text-[12px] font-medium text-[#2b2926] outline-none focus:border-[#d97757] focus:ring-2 focus:ring-[#d97757]/15"
        />
      </div>
    </div>
  );
}

function ShapeControls({ el, upd }: { el: Extract<SlideElement, { type: "shape" | "poly" }>; upd: Upd }) {
  return (
    <>
      <ColorPicker
        value={el.fill}
        onChange={(v) => upd({ fill: v })}
        size="sm"
        triggerClassName="!h-[18px] !w-[18px] !rounded-full !border-0 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.08)]"
      />
      <ColorPicker
        value={el.stroke}
        onChange={(v) => upd({ stroke: v })}
        allowGradient={false}
        allowTransparent={false}
        preview="ring"
        size="sm"
        triggerClassName="!h-[18px] !w-[18px] !rounded-full !border-0"
      />
      <Popover title="Độ dày viền" width={228} estHeight={132} triggerContent={<StrokeWeightIcon />} active={el.strokeW > 0 || (el.dashStyle ?? "solid") !== "solid"}>
        <StrokeWeightPanel
          value={el.strokeW}
          dashStyle={el.dashStyle ?? "solid"}
          min={0}
          max={30}
          onWeightChange={(v) => upd({ strokeW: Math.max(0, Math.min(30, v)) })}
          onDashChange={(v) => upd({ dashStyle: v })}
        />
      </Popover>
      <OpacityControl opacity={el.opacity} upd={upd} triggerContent={<TransparencyGridIcon />} />
    </>
  );
}

function ImageControls({ el, upd }: { el: Extract<SlideElement, { type: "image" }>; upd: Upd }) {
  return (
    <>
      <ToolBtn active={el.fit === "cover"} onClick={() => upd({ fit: "cover" })} title="Cover">
        <CropCoverIcon />
      </ToolBtn>
      <ToolBtn active={el.fit === "contain"} onClick={() => upd({ fit: "contain" })} title="Contain">
        <FitContainIcon />
      </ToolBtn>
      <ToolBtn active={el.fit === "fill"} onClick={() => upd({ fit: "fill" })} title="Stretch">
        <FillStretchIcon />
      </ToolBtn>
      <Sep />
      <ToolBtn active={!!el.flipH} onClick={() => upd({ flipH: !el.flipH })} title="Flip horizontal">
        <FlipHIcon />
      </ToolBtn>
      <ToolBtn active={!!el.flipV} onClick={() => upd({ flipV: !el.flipV })} title="Flip vertical">
        <FlipVIcon />
      </ToolBtn>
      <Popover title="Chỉnh ảnh" width={250} estHeight={152} triggerContent={<BrightnessIcon />}>
        <SliderRow label="Sáng" value={el.brightness ?? 100} min={30} max={200} step={1} format={(v) => `${v}%`} onChange={(v) => upd({ brightness: v })} />
        <SliderRow label="Tương phản" value={el.contrast ?? 100} min={30} max={200} step={1} format={(v) => `${v}%`} onChange={(v) => upd({ contrast: v })} />
        <SliderRow label="Góc" value={el.borderRadius} min={0} max={200} step={1} onChange={(v) => upd({ borderRadius: v })} />
      </Popover>
      <OpacityControl opacity={el.opacity} upd={upd} />
    </>
  );
}

function LineControls({ el, upd }: { el: Extract<SlideElement, { type: "line" | "arrow" }>; upd: Upd }) {
  return (
    <>
      <ColorPicker label={<StrokeColorIcon />} value={el.stroke} onChange={(v) => upd({ stroke: v })} allowGradient={false} allowTransparent={false} size="sm" />
      <Popover title="Độ dày" width={230} estHeight={92} triggerContent={<StrokeWeightIcon />}>
        <SliderRow label="Nét" value={el.strokeW} min={1} max={30} step={1} onChange={(v) => upd({ strokeW: v })} />
      </Popover>
      <Sep />
      {(["solid", "dashed", "dotted", "fine"] as const).map((dash) => (
        <ToolBtn key={dash} active={el.dashStyle === dash} onClick={() => upd({ dashStyle: dash })} title={dash}>
          <DashIcon dash={dash} />
        </ToolBtn>
      ))}
      <Sep />
      <MarkerPopover
        side="start"
        title="Đầu nét"
        value={el.lineMarkerStart ?? ""}
        onChange={(value) => upd({ lineMarkerStart: value || undefined })}
      />
      <MarkerPopover
        side="end"
        title="Cuối nét"
        value={el.lineMarkerEnd ?? ""}
        onChange={(value) => upd({ lineMarkerEnd: value || undefined })}
      />
      {el.type === "arrow" && !el.lineMarkerStart && !el.lineMarkerEnd && (
        <>
          <Sep />
          <ToolBtn active={el.arrowHead === "end"} onClick={() => upd({ arrowHead: "end" })} title="Arrow end">
            <ArrowMarkerIcon />
          </ToolBtn>
          <ToolBtn active={el.arrowHead === "both"} onClick={() => upd({ arrowHead: "both" })} title="Arrow both ends">
            <IconSvg><path d="M6 12h12" /><path d="m10 8-4 4 4 4" /><path d="m14 8 4 4-4 4" /></IconSvg>
          </ToolBtn>
          <ToolBtn active={el.arrowHead === "none"} onClick={() => upd({ arrowHead: "none" })} title="No arrow head">
            <LinePlainIcon />
          </ToolBtn>
        </>
      )}
      <OpacityControl opacity={el.opacity} upd={upd} />
    </>
  );
}

function DrawControls({ el, upd }: { el: Extract<SlideElement, { type: "draw" }>; upd: Upd }) {
  return (
    <>
      <ColorPicker label={<StrokeColorIcon />} value={el.stroke} onChange={(v) => upd({ stroke: v })} allowGradient={false} allowTransparent={false} size="sm" />
      <Popover title="Độ dày" width={230} estHeight={92} triggerContent={<StrokeWeightIcon />}>
        <SliderRow label="Nét" value={el.strokeW} min={1} max={80} step={1} onChange={(v) => upd({ strokeW: v })} />
      </Popover>
      <OpacityControl opacity={el.opacity} upd={upd} />
    </>
  );
}

type MarkerSide = "start" | "end";

function MarkerTriggerIcon({ marker, side }: { marker: LineMarker | ""; side: MarkerSide }) {
  const isStart = side === "start";
  return (
    <svg className="h-[20px] w-[22px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 12h12" />
      {marker === "" && <circle cx={isStart ? 6 : 18} cy="12" r="1.3" fill="currentColor" stroke="none" />}
      {marker === "arrow" && (isStart ? <path d="m10 8-4 4 4 4" /> : <path d="m14 8 4 4-4 4" />)}
      {marker === "bar" && <path d={isStart ? "M6 7v10" : "M18 7v10"} />}
      {marker === "square" && <rect x={isStart ? 3 : 15} y="9" width="6" height="6" fill="currentColor" stroke="none" />}
      {marker === "circle" && <circle cx={isStart ? 6 : 18} cy="12" r="3" fill="currentColor" stroke="none" />}
      {marker === "diamond" && <path d={isStart ? "M6 8l4 4-4 4-4-4z" : "M18 8l4 4-4 4-4-4z"} fill="currentColor" stroke="none" />}
      {marker === "square-open" && <rect x={isStart ? 3 : 15} y="9" width="6" height="6" />}
      {marker === "circle-open" && <circle cx={isStart ? 6 : 18} cy="12" r="3" />}
    </svg>
  );
}

function MarkerPopover({ side, title, value, onChange }: { side: MarkerSide; title: string; value: LineMarker | ""; onChange: (value: LineMarker | "") => void }) {
  return (
    <Popover title={title} width={188} estHeight={112} closeOnSelect active={value !== ""} triggerContent={<MarkerTriggerIcon marker={value} side={side} />}>
      <div className="grid grid-cols-4 gap-1">
        {MARKERS.map((marker) => (
          <button
            key={marker.value || "none"}
            title={marker.title}
            onClick={() => onChange(marker.value)}
            className={`flex h-8 items-center justify-center rounded-[8px] text-[#4f4943] hover:bg-[#f7f3ee] ${value === marker.value ? "bg-[#f6eadf] text-[#d97757]" : ""}`}
          >
            {marker.icon}
          </button>
        ))}
      </div>
    </Popover>
  );
}
function OpacityControl({ opacity, upd, triggerContent = <OpacityIcon /> }: { opacity: number; upd: Upd; triggerContent?: React.ReactNode }) {
  return (
    <Popover title="Độ mờ" width={224} estHeight={56} triggerContent={triggerContent} highlightWhenOpen={false}>
      <label className="grid grid-cols-[46px_minmax(0,1fr)_28px] items-center gap-2 px-0.5 py-0.5 text-[12px] text-[#4f4943]">
        <span className="shrink-0">Độ mờ</span>
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={Math.round(opacity * 100)}
          onChange={(e) => upd({ opacity: Number(e.target.value) / 100 })}
          className="edua-range min-w-0"
        />
        <span className="shrink-0 text-right text-[#8a8178]">{Math.round(opacity * 100)}</span>
      </label>
    </Popover>
  );
}

function ElementControls({ el, upd, onOpenProperties }: { el: SlideElement; upd: Upd; onOpenProperties: () => void }) {
  let controls: React.ReactNode = null;
  if (el.type === "shape" || el.type === "poly") controls = <ShapeControls el={el} upd={upd} />;
  else if (el.type === "image") controls = <ImageControls el={el} upd={upd} />;
  else if (el.type === "line" || el.type === "arrow") controls = <LineControls el={el} upd={upd} />;
  else if (el.type === "draw") controls = <DrawControls el={el} upd={upd} />;

  if (!controls) return null;

  return (
    <>
      {controls}
      <Sep />
      <ToolBtn onClick={onOpenProperties} title="Properties">
        <MoreHorizontalIcon />
      </ToolBtn>
    </>
  );
}

export function ContextualToolbar({ onOpenProperties }: { onOpenProperties: () => void }) {
  const selectedIds = useEditorStore((s) => s.selectedIds);
  const slide = useEditorStore((s) => s.slides.find((sl) => sl.id === s.currentSlideId));
  const updateMany = useEditorStore((s) => s.updateMany);
  const alignElements = useEditorStore((s) => s.alignElements);
  const distribute = useEditorStore((s) => s.distribute);
  const slideLocked = isSlideLockedForGeneration(slide);

  const single =
    selectedIds.length === 1
      ? slide?.elements.find((el) => el.id === selectedIds[0]) ?? null
      : null;

  const upd: Upd = (patch) => updateMany(selectedIds, patch);

  if (selectedIds.length === 0 || slideLocked) return null;

  return (
    <div className="pointer-events-none absolute inset-x-0 top-3 z-30 flex justify-center px-4">
      <div className="pointer-events-auto flex max-w-full items-center gap-0.5 overflow-x-auto overflow-y-hidden rounded-[14px] border border-[#e8e2d9] bg-white px-2 py-1.5 shadow-[0_8px_24px_rgba(43,41,38,0.12),0_2px_8px_rgba(43,41,38,0.08)]">
        {selectedIds.length >= 2 ? (
          <>
            {ALIGNS.map(([dir, icon, title]) => (
              <ToolBtn key={dir} onClick={() => alignElements(dir)} title={title}>
                {icon}
              </ToolBtn>
            ))}
            <Sep />
            <ToolBtn onClick={() => distribute("h")} title="Distribute horizontally">
              <DistributeHIcon />
            </ToolBtn>
            <ToolBtn onClick={() => distribute("v")} title="Distribute vertically">
              <DistributeVIcon />
            </ToolBtn>
          </>
        ) : single ? (
          single.type === "text" ? <TextToolbar el={single} upd={upd} onOpenProperties={onOpenProperties} /> : <ElementControls el={single} upd={upd} onOpenProperties={onOpenProperties} />
        ) : null}
      </div>
    </div>
  );
}
