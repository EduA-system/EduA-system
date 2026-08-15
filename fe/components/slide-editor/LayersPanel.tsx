"use client";

import { useState, type ReactElement } from "react";
import { useEditorStore } from "@/stores/slide-editor-store";
import { CANVAS_H, CANVAS_W, isSlideLockedForGeneration, type ElementPatch, type SlideElement } from "./types";

export type RightPanelTab = "layers" | "properties";

const TYPE_ICONS: Record<string, ReactElement> = {
  text: (
    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 7V4h16v3M9 20h6M12 4v16" />
    </svg>
  ),
  latex: (
    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 4H6l5 8-5 8h12" /></svg>
  ),
  shape: (
    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
    </svg>
  ),
  poly: (
    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l9 6v6l-9 6-9-6V9z" />
    </svg>
  ),
  image: (
    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" />
    </svg>
  ),
  line: (
    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M4 20L20 4" />
    </svg>
  ),
  arrow: (
    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  ),
  draw: (
    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 21c3-1 5-3 8-8M14 5l5 5M12 7l5 5-9 4z" />
    </svg>
  ),
  simulation: (
    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="2" />
      <ellipse cx="12" cy="12" rx="9" ry="3.6" />
      <ellipse cx="12" cy="12" rx="9" ry="3.6" transform="rotate(60 12 12)" />
    </svg>
  ),
};

function EyeIcon({ hidden }: { hidden?: boolean }) {
  return hidden ? (
    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24M1 1l22 22" />
    </svg>
  ) : (
    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function LockIcon({ locked }: { locked?: boolean }) {
  return locked ? (
    <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  ) : (
    <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 9.9-1" />
    </svg>
  );
}

export function LayersIcon() {
  return (
    <svg className="h-[13px] w-[13px]" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 2.2 2.4 5 8 7.8 13.6 5z" />
      <path d="M2.4 8 8 10.8 13.6 8" />
      <path d="M2.4 11 8 13.8 13.6 11" />
    </svg>
  );
}

export function PropertiesIcon() {
  return (
    <svg className="h-[13px] w-[13px]" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round">
      <path d="M4 4h8" />
      <path d="M4 8h8" />
      <path d="M4 12h8" />
      <circle cx="6" cy="4" r="1.2" fill="white" />
      <circle cx="10" cy="8" r="1.2" fill="white" />
      <circle cx="7" cy="12" r="1.2" fill="white" />
    </svg>
  );
}

function PointerIcon() {
  return (
    <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round">
      <path d="M6 3l12 8-5 1.2 3.4 5.8-3.1 1.8-3.3-5.7L6 18z" />
    </svg>
  );
}

function elemLabel(el: SlideElement): string {
  if (el.type === "text") return el.text.slice(0, 22) || "Empty text";
  if (el.type === "latex") return el.latex.slice(0, 22) || "Công thức";
  if (el.type === "image") return el.src ? "Image" : "Image";
  if (el.type === "poly") return "Shape";
  if (el.type === "draw") return "Drawing";
  if (el.type === "shape") return el.shape === "ellipse" ? "Ellipse" : "Rectangle";
  if (el.type === "line") return "Line";
  if (el.type === "arrow") return "Arrow";
  if (el.type === "simulation") {
    if (el.kind === "molecule") return el.molecule.name;
    if (el.kind === "sandbox") return el.title;
    return el.periodic.focus || el.periodic.elementSymbols.join(", ");
  }
  return el.type;
}

function TabButton({ active, icon, label, onClick }: { active: boolean; icon: ReactElement; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex h-[47px] flex-1 items-center justify-center gap-1.5 border-b-2 text-[12px] font-semibold transition-colors ${
        active ? "border-[#d97757] text-[#2b2926]" : "border-transparent text-[#8a8178] hover:text-[#4f4943]"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function clampNumber(value: number, min: number, max = Number.POSITIVE_INFINITY) {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(value, max));
}

function SideIconSvg({ children }: { children: React.ReactNode }) {
  return (
    <svg className="h-[17px] w-[17px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  );
}

function SideLayerUpIcon() {
  return <SideIconSvg><path d="M12 3l7 4-7 4-7-4z" /><path d="M5 12l7 4 7-4" /><path d="M5 17l7 4 7-4" /></SideIconSvg>;
}
function SideLayerDownIcon() {
  return <SideIconSvg><path d="M5 7l7-4 7 4-7 4z" /><path d="M5 12l7 4 7-4" /><path d="M5 17l7 4 7-4" /></SideIconSvg>;
}
function SideSendFrontIcon() {
  return <SideIconSvg><path d="M8 8h9v9H8z" /><path d="M5 5h9" /><path d="M5 5v9" /></SideIconSvg>;
}
function SideSendBackIcon() {
  return <SideIconSvg><path d="M7 7h9v9H7z" /><path d="M10 10h9v9h-9z" /></SideIconSvg>;
}
function SideAlignLeftIcon() {
  return <SideIconSvg><path d="M5 5v14" /><path d="M9 7h10" /><path d="M9 12h7" /><path d="M9 17h10" /></SideIconSvg>;
}
function SideAlignCenterHIcon() {
  return <SideIconSvg><path d="M12 4v16" /><path d="M6 7h12" /><path d="M8 12h8" /><path d="M6 17h12" /></SideIconSvg>;
}
function SideAlignRightIcon() {
  return <SideIconSvg><path d="M19 5v14" /><path d="M5 7h10" /><path d="M8 12h7" /><path d="M5 17h10" /></SideIconSvg>;
}
function SideAlignTopIcon() {
  return <SideIconSvg><path d="M5 5h14" /><path d="M7 9v10" /><path d="M12 9v7" /><path d="M17 9v10" /></SideIconSvg>;
}
function SideAlignCenterVIcon() {
  return <SideIconSvg><path d="M4 12h16" /><path d="M7 6v12" /><path d="M12 8v8" /><path d="M17 6v12" /></SideIconSvg>;
}
function SideAlignBottomIcon() {
  return <SideIconSvg><path d="M5 19h14" /><path d="M7 5v10" /><path d="M12 8v7" /><path d="M17 5v10" /></SideIconSvg>;
}
function SideLinkIcon({ locked }: { locked: boolean }) {
  return locked ? (
    <SideIconSvg><path d="M10 13a5 5 0 0 0 7.1 0l1.4-1.4a5 5 0 0 0-7.1-7.1L10.5 5" /><path d="M14 11a5 5 0 0 0-7.1 0l-1.4 1.4a5 5 0 0 0 7.1 7.1l.9-.9" /></SideIconSvg>
  ) : (
    <SideIconSvg><path d="M10 13a5 5 0 0 0 7.1 0l1.4-1.4a5 5 0 0 0-1-7.8" /><path d="M14 11a5 5 0 0 0-7.1 0l-1.4 1.4a5 5 0 0 0 1 7.8" /><path d="M4 4l16 16" /></SideIconSvg>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <div className="mb-2 text-[11px] font-semibold text-[#2b2926]">{children}</div>;
}

function PanelButton({ icon, label, onClick, active = false, disabled = false }: { icon: React.ReactNode; label: string; onClick: () => void; active?: boolean; disabled?: boolean }) {
  return (
    <button
      type="button"
      title={label}
      onClick={onClick}
      disabled={disabled}
      className={`flex h-9 min-w-0 items-center gap-2 rounded-[8px] border px-2 text-left text-[11px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
        active ? "border-[#d97757] bg-[#f6eadf] text-[#9f5a3e]" : "border-[#e8e2d9] bg-white text-[#4f4943] hover:border-[#d8d1c9] hover:bg-[#fbfaf8]"
      }`}
    >
      <span className={`flex h-5 w-5 shrink-0 items-center justify-center ${active ? "text-[#d97757]" : "text-[#8a8178]"}`}>{icon}</span>
      <span className="min-w-0 truncate">{label}</span>
    </button>
  );
}

function UnitNumberInput({
  label,
  value,
  min,
  max,
  unit = "px",
  disabled = false,
  onChange,
}: {
  label: string;
  value: number;
  min?: number;
  max?: number;
  unit?: string;
  disabled?: boolean;
  onChange: (v: number) => void;
}) {
  return (
    <label className="min-w-0">
      <span className="mb-1 block truncate text-[10px] font-medium text-[#6b625a]">{label}</span>
      <span className="relative block">
        <input
          type="number"
          value={Number.isFinite(value) ? Math.round(value) : 0}
          min={min}
          max={max}
          disabled={disabled}
          onChange={(e) => {
            const next = Number(e.target.value);
            if (!Number.isNaN(next)) onChange(next);
          }}
          className="h-8 w-full rounded-[7px] border border-[#e8e2d9] bg-white px-2 pr-6 text-right text-[12px] font-medium text-[#2b2926] outline-none transition-colors focus:border-[#d97757] focus:ring-2 focus:ring-[#d97757]/15 disabled:cursor-not-allowed disabled:bg-[#f7f3ee] disabled:text-[#b8aea5]"
        />
        <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-medium text-[#8a8178]">{unit}</span>
      </span>
    </label>
  );
}

function SliderRow({ label, value, disabled = false, onChange }: { label: string; value: number; disabled?: boolean; onChange: (v: number) => void }) {
  return (
    <label className="grid grid-cols-[64px_minmax(0,1fr)_38px] items-center gap-2 text-[11px] text-[#4f4943]">
      <span className="shrink-0 truncate">{label}</span>
      <input
        type="range"
        min={0}
        max={100}
        step={1}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        className="min-w-0 accent-[#d97757] disabled:opacity-50"
      />
      <span className="shrink-0 text-right text-[#8a8178]">{value}%</span>
    </label>
  );
}
export function LayersPanel({
  activeTab,
  onTabChange,
}: {
  activeTab: RightPanelTab;
  onTabChange: (tab: RightPanelTab) => void;
}) {
  return (
    <aside className="flex w-[268px] shrink-0 flex-col border-l border-[#e8e2d9] bg-white">
      <div className="flex shrink-0 border-b border-[#e8e2d9]">
        <TabButton active={activeTab === "layers"} icon={<LayersIcon />} label="Layers" onClick={() => onTabChange("layers")} />
        <TabButton active={activeTab === "properties"} icon={<PropertiesIcon />} label="Properties" onClick={() => onTabChange("properties")} />
      </div>
      {activeTab === "layers" ? <LayersContent /> : <PropertiesContent />}
    </aside>
  );
}

export function LayersContent() {
  const slide = useEditorStore((s) => s.slides.find((sl) => sl.id === s.currentSlideId));
  const selectedIds = useEditorStore((s) => s.selectedIds);
  const select = useEditorStore((s) => s.select);
  const updateElement = useEditorStore((s) => s.updateElement);
  const slideLocked = isSlideLockedForGeneration(slide);
  const elements = slide?.elements ?? [];
  const sorted = [...elements].sort((a, b) => b.zIndex - a.zIndex);

  return (
    <div className="scrollbar-none min-h-0 flex-1 overflow-y-auto p-2">
      {sorted.length === 0 && (
        <div className="px-3 py-8 text-center text-[11px] text-[#b8aea5]">No layers</div>
      )}
      {sorted.map((el) => {
        const isSelected = selectedIds.includes(el.id);
        return (
          <div
            key={el.id}
            onClick={() => {
              if (!slideLocked) select([el.id]);
            }}
            className={`group flex items-center gap-2 rounded-[8px] px-2.5 py-[7px] transition-colors ${
              isSelected ? "bg-[#f6eadf] text-[#2b2926]" : "text-[#4f4943] hover:bg-[#f7f3ee]"
            } ${slideLocked ? "cursor-not-allowed opacity-60" : "cursor-pointer"} ${el.hidden ? "opacity-40" : ""}`}
          >
            <span className={isSelected ? "text-[#d97757]" : "text-[#b8aea5]"}>
              {TYPE_ICONS[el.type] ?? TYPE_ICONS.shape}
            </span>
            <span className={`min-w-0 flex-1 truncate text-[11px] ${isSelected ? "font-semibold" : ""}`} title={elemLabel(el)}>
              {elemLabel(el)}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (slideLocked) return;
                updateElement(el.id, { hidden: !el.hidden });
              }}
              disabled={slideLocked}
              title={el.hidden ? "Show" : "Hide"}
              className={`shrink-0 rounded p-0.5 transition-colors hover:text-[#d97757] ${
                el.hidden ? "text-[#8a8178]" : "text-[#b8aea5] opacity-0 group-hover:opacity-100"
              }`}
            >
              <EyeIcon hidden={el.hidden} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (slideLocked) return;
                updateElement(el.id, { locked: !el.locked });
              }}
              disabled={slideLocked}
              title={el.locked ? "Unlock" : "Lock"}
              className={`shrink-0 rounded p-0.5 transition-colors hover:text-[#d97757] ${
                el.locked ? "text-[#4f4943]" : "text-[#b8aea5] opacity-0 group-hover:opacity-100"
              }`}
            >
              <LockIcon locked={el.locked} />
            </button>
          </div>
        );
      })}
    </div>
  );
}

export function PropertiesContent() {
  const slide = useEditorStore((s) => s.slides.find((sl) => sl.id === s.currentSlideId));
  const selectedIds = useEditorStore((s) => s.selectedIds);
  const updateElement = useEditorStore((s) => s.updateElement);
  const bringForward = useEditorStore((s) => s.bringForward);
  const sendBackward = useEditorStore((s) => s.sendBackward);
  const bringToFront = useEditorStore((s) => s.bringToFront);
  const sendToBack = useEditorStore((s) => s.sendToBack);
  const toggleSandboxActive = useEditorStore((s) => s.toggleSandboxActive);
  const activeSandboxIds = useEditorStore((s) => s.activeSandboxIds);
  const [lockRatio, setLockRatio] = useState(false);

  const elements = slide?.elements ?? [];
  const selected = selectedIds.length === 1 ? elements.find((el) => el.id === selectedIds[0]) : null;
  const sandboxRunning = selected ? activeSandboxIds.includes(selected.id) : false;
  const slideLocked = isSlideLockedForGeneration(slide);
  const panelDisabled = slideLocked || !selected;
  const ratio = selected && selected.w > 0 && selected.h > 0 ? selected.w / selected.h : 1;

  const upd = (patch: ElementPatch) => {
    if (!selected || slideLocked) return;
    updateElement(selected.id, patch);
  };

  const setWidth = (value: number) => {
    if (!selected) return;
    const w = clampNumber(value, 1, CANVAS_W * 3);
    upd(lockRatio ? { w, h: Math.max(1, Math.round(w / ratio)) } : { w });
  };

  const setHeight = (value: number) => {
    if (!selected) return;
    const h = clampNumber(value, 1, CANVAS_H * 3);
    upd(lockRatio ? { h, w: Math.max(1, Math.round(h * ratio)) } : { h });
  };

  return (
    <div className="scrollbar-none min-h-0 flex-1 overflow-y-auto px-3 py-4">
      {!selected ? (
        <div className="flex h-48 flex-col items-center justify-center gap-2 text-center">
          <div className="flex size-10 items-center justify-center rounded-[14px] bg-[#f7f3ee] text-[#b8aea5]">
            <PointerIcon />
          </div>
          <div className="text-[12px] font-medium text-[#8a8178]">No selection</div>
          <div className="text-[10px] text-[#b8aea5]">Click an element to edit</div>
        </div>
      ) : (
        <div className="space-y-4">
          {selected.type === "latex" && (
            <section>
              <SectionTitle>Công thức LaTeX</SectionTitle>
              <textarea
                value={selected.latex}
                onChange={(event) => upd({ latex: event.target.value })}
                disabled={panelDisabled}
                spellCheck={false}
                placeholder="\\frac{a}{b}"
                className="min-h-24 w-full resize-y rounded-[7px] border border-[#e8e2d9] bg-white px-2 py-2 font-mono text-[12px] text-[#2b2926] outline-none focus:border-[#d97757] focus:ring-2 focus:ring-[#d97757]/15 disabled:bg-[#f7f3ee]"
              />
              <p className="mt-1.5 text-[10px] text-[#8a8178]">Nhập mã LaTeX không kèm dấu $.</p>
              <div className="mt-2 grid grid-cols-2 gap-1.5">
                <UnitNumberInput label="Cỡ chữ" value={selected.fontSize} min={8} max={120} onChange={(fontSize) => upd({ fontSize })} disabled={panelDisabled} />
                <label className="min-w-0">
                  <span className="mb-1 block truncate text-[10px] font-medium text-[#6b625a]">Căn lề</span>
                  <select value={selected.align} onChange={(event) => upd({ align: event.target.value as "left" | "center" | "right" })} disabled={panelDisabled} className="h-8 w-full rounded-[7px] border border-[#e8e2d9] bg-white px-2 text-[12px] text-[#2b2926] outline-none focus:border-[#d97757] disabled:bg-[#f7f3ee]">
                    <option value="left">Trái</option><option value="center">Giữa</option><option value="right">Phải</option>
                  </select>
                </label>
              </div>
            </section>
          )}
          {selected.type === "simulation" && selected.kind === "sandbox" && (
            <section>
              <SectionTitle>Thí nghiệm vật lý</SectionTitle>
              <div className="mb-1.5 truncate text-[11px] text-[#6b625a]" title={selected.title}>{selected.title}</div>
              <button
                type="button"
                onClick={() => toggleSandboxActive(selected.id)}
                disabled={!selected.experimentId}
                className={`w-full rounded-[7px] border px-3 py-2 text-[11px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                  sandboxRunning
                    ? "border-[#d97757] bg-[#f6eadf] text-[#d97757]"
                    : "border-[#e8e2d9] bg-white text-[#4f4943] hover:bg-[#fbfaf8]"
                }`}
              >
                {!selected.experimentId ? "Chưa gán thí nghiệm" : sandboxRunning ? "Dừng chạy thử" : "Chạy thử"}
              </button>
              <p className="mt-1.5 text-[10px] leading-relaxed text-[#b8aea5]">
                Mô phỏng được biên dịch trong trình duyệt nên cần vài giây và phải có mạng.
                Khi trình chiếu, người xem bấm vào slide để chạy.
              </p>
            </section>
          )}

          <section>
            <SectionTitle>Thứ tự lớp</SectionTitle>
            <div className="grid grid-cols-2 gap-1.5">
              <PanelButton icon={<SideLayerUpIcon />} label="Tiến một lớp" onClick={() => bringForward(selected.id)} disabled={panelDisabled} />
              <PanelButton icon={<SideLayerDownIcon />} label="Lùi một lớp" onClick={() => sendBackward(selected.id)} disabled={panelDisabled} />
              <PanelButton icon={<SideSendFrontIcon />} label="Lên trước" onClick={() => bringToFront(selected.id)} disabled={panelDisabled} />
              <PanelButton icon={<SideSendBackIcon />} label="Xuống cuối" onClick={() => sendToBack(selected.id)} disabled={panelDisabled} />
            </div>
          </section>

          <section className="border-t border-[#e8e2d9] pt-3">
            <SectionTitle>Căn chỉnh theo trang</SectionTitle>
            <div className="grid grid-cols-2 gap-1.5">
              <PanelButton icon={<SideAlignTopIcon />} label="Trên" onClick={() => upd({ y: 0 })} disabled={panelDisabled} />
              <PanelButton icon={<SideAlignLeftIcon />} label="Trái" onClick={() => upd({ x: 0 })} disabled={panelDisabled} />
              <PanelButton icon={<SideAlignCenterVIcon />} label="Giữa dọc" onClick={() => upd({ y: Math.round((CANVAS_H - selected.h) / 2) })} disabled={panelDisabled} />
              <PanelButton icon={<SideAlignCenterHIcon />} label="Giữa ngang" onClick={() => upd({ x: Math.round((CANVAS_W - selected.w) / 2) })} disabled={panelDisabled} />
              <PanelButton icon={<SideAlignBottomIcon />} label="Dưới" onClick={() => upd({ y: Math.round(CANVAS_H - selected.h) })} disabled={panelDisabled} />
              <PanelButton icon={<SideAlignRightIcon />} label="Phải" onClick={() => upd({ x: Math.round(CANVAS_W - selected.w) })} disabled={panelDisabled} />
            </div>
          </section>

          <section className="border-t border-[#e8e2d9] pt-3">
            <SectionTitle>Nâng cao</SectionTitle>
            <div className="grid grid-cols-3 gap-1.5">
              <UnitNumberInput label="Rộng" value={selected.w} min={1} onChange={setWidth} disabled={panelDisabled} />
              <UnitNumberInput label="Cao" value={selected.h} min={1} onChange={setHeight} disabled={panelDisabled} />
              <div className="min-w-0">
                <span className="mb-1 block truncate text-[10px] font-medium text-[#6b625a]">Tỉ lệ</span>
                <button
                  type="button"
                  onClick={() => setLockRatio((value) => !value)}
                  disabled={panelDisabled}
                  title="Khóa tỉ lệ"
                  className={`flex h-8 w-full items-center justify-center rounded-[7px] border transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                    lockRatio ? "border-[#d97757] bg-[#f6eadf] text-[#d97757]" : "border-[#e8e2d9] bg-white text-[#8a8178] hover:bg-[#fbfaf8]"
                  }`}
                >
                  <SideLinkIcon locked={lockRatio} />
                </button>
              </div>
              <UnitNumberInput label="X" value={selected.x} unit="px" onChange={(value) => upd({ x: value })} disabled={panelDisabled} />
              <UnitNumberInput label="Y" value={selected.y} unit="px" onChange={(value) => upd({ y: value })} disabled={panelDisabled} />
              <UnitNumberInput label="Xoay" value={selected.rotation} unit="°" onChange={(value) => upd({ rotation: value })} disabled={panelDisabled} />
            </div>
          </section>

          <section className="border-t border-[#e8e2d9] pt-3">
            <SectionTitle>Trạng thái</SectionTitle>
            <div className="grid grid-cols-2 gap-1.5">
              <PanelButton icon={<EyeIcon hidden={selected.hidden} />} label={selected.hidden ? "Hiện" : "Ẩn"} onClick={() => upd({ hidden: !selected.hidden })} active={!!selected.hidden} disabled={panelDisabled} />
              <PanelButton icon={<LockIcon locked={selected.locked} />} label={selected.locked ? "Mở khóa" : "Khóa"} onClick={() => upd({ locked: !selected.locked })} active={!!selected.locked} disabled={panelDisabled} />
            </div>
            <div className="mt-3 rounded-[8px] border border-[#e8e2d9] bg-white px-2 py-2">
              <SliderRow label="Độ mờ" value={Math.round(selected.opacity * 100)} onChange={(value) => upd({ opacity: value / 100 })} disabled={panelDisabled} />
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
