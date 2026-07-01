"use client";

// Color picker: tab Đồng nhất (solid) + Gradient (linear/radial, kéo stops),
// eyedropper, presets, transparent. Port từ /test-slide, dùng helper lib/gradient.

import React, { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { buildGradCss, isGradientCss, parseGrad, type GradConfig } from "./lib/gradient";

const DOC_COLORS = [
  "#000000", "#ffffff", "#fbfaf8", "#f5f1ec",
  "#d8d1c9", "#8a8178", "#4f4943", "#2b2926",
];

const FLAT_COLORS = [
  "#000000", "#374151", "#6b7280", "#9ca3af", "#d1d5db", "#e5e7eb", "#f3f4f6", "#ffffff",
  "#ef4444", "#f97316", "#f59e0b", "#eab308", "#84cc16", "#22c55e", "#10b981", "#14b8a6",
  "#06b6d4", "#0ea5e9", "#3b82f6", "#6366f1", "#8b5cf6", "#a855f7", "#d946ef", "#ec4899",
  "#fca5a5", "#fdba74", "#fcd34d", "#fde68a", "#bbf7d0", "#86efac", "#6ee7b7", "#99f6e4",
  "#67e8f9", "#7dd3fc", "#93c5fd", "#a5b4fc", "#c4b5fd", "#d8b4fe", "#f0abfc", "#fbcfe8",
];

const GRAD_PRESETS: GradConfig[] = [
  { type: "linear", angle: 135, stops: [{ color: "#667eea", pos: 0 }, { color: "#764ba2", pos: 100 }] },
  { type: "linear", angle: 135, stops: [{ color: "#f093fb", pos: 0 }, { color: "#f5576c", pos: 100 }] },
  { type: "linear", angle: 135, stops: [{ color: "#4facfe", pos: 0 }, { color: "#00f2fe", pos: 100 }] },
  { type: "linear", angle: 135, stops: [{ color: "#43e97b", pos: 0 }, { color: "#38f9d7", pos: 100 }] },
  { type: "linear", angle: 135, stops: [{ color: "#fa709a", pos: 0 }, { color: "#fee140", pos: 100 }] },
  { type: "linear", angle: 135, stops: [{ color: "#30cfd0", pos: 0 }, { color: "#330867", pos: 100 }] },
  { type: "linear", angle: 135, stops: [{ color: "#a18cd1", pos: 0 }, { color: "#fbc2eb", pos: 100 }] },
  { type: "linear", angle: 90, stops: [{ color: "#fc5c7d", pos: 0 }, { color: "#6a3093", pos: 100 }] },
  { type: "linear", angle: 90, stops: [{ color: "#f7971e", pos: 0 }, { color: "#ffd200", pos: 100 }] },
  { type: "linear", angle: 180, stops: [{ color: "#e0c3fc", pos: 0 }, { color: "#8ec5fc", pos: 100 }] },
  { type: "radial", angle: 0, stops: [{ color: "#f9f586", pos: 0 }, { color: "#f96167", pos: 100 }] },
  { type: "radial", angle: 0, stops: [{ color: "#0bccfe", pos: 0 }, { color: "#7c3aed", pos: 100 }] },
  { type: "linear", angle: 135, stops: [{ color: "#ff9a9e", pos: 0 }, { color: "#fecfef", pos: 50 }, { color: "#fecfef", pos: 100 }] },
  { type: "linear", angle: 45, stops: [{ color: "#f6d365", pos: 0 }, { color: "#fda085", pos: 100 }] },
  { type: "linear", angle: 90, stops: [{ color: "#a1c4fd", pos: 0 }, { color: "#c2e9fb", pos: 100 }] },
  { type: "linear", angle: 135, stops: [{ color: "#d4fc79", pos: 0 }, { color: "#96e6a1", pos: 100 }] },
];

const ANGLE_DIRS = [
  { angle: 0,   svg: "M12 19V5M7 10l5-5 5 5" },
  { angle: 45,  svg: "M5 5l14 14M5 10V5h5" },
  { angle: 90,  svg: "M5 12h14M14 7l5 5-5 5" },
  { angle: 135, svg: "M5 19L19 5M14 19h5v-5" },
  { angle: 180, svg: "M12 5v14M17 14l-5 5-5-5" },
  { angle: 225, svg: "M19 19L5 5M19 14v5h-5" },
  { angle: 270, svg: "M19 12H5M10 17l-5-5 5-5" },
  { angle: 315, svg: "M19 5L5 19M5 10V5h5" },
];

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(value, max));
}

function StopBar({
  config,
  selected,
  onSelect,
  onChange,
}: {
  config: GradConfig;
  selected: number;
  onSelect: (i: number) => void;
  onChange: (c: GradConfig) => void;
}) {
  const barRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ idx: number } | null>(null);

  const previewCss = buildGradCss({ ...config, type: "linear", angle: 90 });

  const getPct = (clientX: number): number => {
    if (!barRef.current) return 0;
    const rect = barRef.current.getBoundingClientRect();
    return Math.min(100, Math.max(0, Math.round(((clientX - rect.left) / rect.width) * 100)));
  };

  const handleBarClick = (e: React.MouseEvent) => {
    if (dragRef.current) return;
    e.stopPropagation();
    const pos = getPct(e.clientX);
    const sortedStops = [...config.stops].sort((a, b) => a.pos - b.pos);
    let color = sortedStops[0]?.color ?? "#000000";
    for (let i = 0; i < sortedStops.length - 1; i++) {
      if (pos >= sortedStops[i].pos && pos <= sortedStops[i + 1].pos) {
        color = sortedStops[i].color;
        break;
      }
    }
    const newStops = [...config.stops, { color, pos }];
    onChange({ ...config, stops: newStops });
    onSelect(newStops.length - 1);
  };

  const handleStopDown = (e: React.MouseEvent, idx: number) => {
    e.stopPropagation();
    e.preventDefault();
    onSelect(idx);
    dragRef.current = { idx };

    const onMove = (ev: MouseEvent) => {
      if (!dragRef.current) return;
      const pos = getPct(ev.clientX);
      onChange({ ...config, stops: config.stops.map((s, i) => (i === dragRef.current!.idx ? { ...s, pos } : s)) });
    };
    const onUp = () => {
      dragRef.current = null;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  return (
    <div>
      <div className="relative mb-3" style={{ height: 28 }}>
        <div
          ref={barRef}
          onClick={handleBarClick}
          className="absolute inset-x-0 top-0 cursor-crosshair rounded-full"
          style={{ height: 16, background: previewCss, boxShadow: "inset 0 0 0 1px rgba(0,0,0,.12)" }}
          title="Click để thêm điểm màu"
        />
        {config.stops.map((stop, i) => (
          <div
            key={i}
            onMouseDown={(e) => handleStopDown(e, i)}
            className={`absolute -top-0.5 -translate-x-1/2 cursor-grab active:cursor-grabbing rounded-full border-2 transition-shadow ${
              i === selected ? "border-[#2b2926] shadow-md scale-110" : "border-white shadow"
            }`}
            style={{
              left: `${stop.pos}%`,
              width: 18,
              height: 18,
              background: stop.color,
              zIndex: i === selected ? 2 : 1,
            }}
          />
        ))}
      </div>

      {config.stops[selected] && (
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5">
            <div
              className="h-6 w-6 shrink-0 rounded border border-[#e8e2d9] cursor-pointer"
              style={{ background: config.stops[selected].color }}
              onClick={() => {
                const inp = document.getElementById(`grad-stop-color-${selected}`) as HTMLInputElement | null;
                inp?.click();
              }}
            />
            <input
              id={`grad-stop-color-${selected}`}
              type="color"
              value={config.stops[selected].color}
              className="sr-only"
              onChange={(e) =>
                onChange({ ...config, stops: config.stops.map((s, i) => (i === selected ? { ...s, color: e.target.value } : s)) })
              }
            />
            <input
              type="text"
              value={config.stops[selected].color}
              onChange={(e) => {
                const v = e.target.value;
                if (/^#[0-9a-fA-F]{0,6}$/.test(v))
                  onChange({ ...config, stops: config.stops.map((s, i) => (i === selected ? { ...s, color: v } : s)) });
              }}
              className="w-20 rounded border border-[#e8e2d9] px-1.5 py-0.5 text-[11px] font-mono text-[#2b2926] outline-none focus:border-[#d97757]"
            />
          </label>

          <div className="flex items-center gap-1 ml-auto">
            <input
              type="number"
              min={0}
              max={100}
              value={config.stops[selected].pos}
              onChange={(e) =>
                onChange({ ...config, stops: config.stops.map((s, i) => (i === selected ? { ...s, pos: Math.min(100, Math.max(0, +e.target.value)) } : s)) })
              }
              className="w-12 rounded border border-[#e8e2d9] px-1.5 py-0.5 text-[11px] text-right text-[#2b2926] outline-none focus:border-[#d97757]"
            />
            <span className="text-[10px] text-[#8a8178]">%</span>
            <button
              disabled={config.stops.length <= 2}
              onClick={() => {
                if (config.stops.length <= 2) return;
                const newStops = config.stops.filter((_, i) => i !== selected);
                onChange({ ...config, stops: newStops });
                onSelect(Math.min(selected, newStops.length - 1));
              }}
              title="Xóa điểm này"
              className="ml-1 flex h-5 w-5 items-center justify-center rounded text-[#8a8178] hover:bg-red-50 hover:text-red-500 disabled:opacity-30 transition-colors"
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>
      )}

      <p className="mt-1.5 text-[9px] text-[#8a8178]">Click vào thanh để thêm • Kéo điểm để di chuyển</p>
    </div>
  );
}

export interface ColorPickerProps {
  value: string;
  onChange: (v: string) => void;
  label?: ReactNode;
  allowTransparent?: boolean;
  allowGradient?: boolean;
  size?: "sm" | "md";
  preview?: "solid" | "ring";
  triggerContent?: ReactNode;
  triggerClassName?: string;
  triggerStyle?: CSSProperties;
}

export function ColorPicker({
  value,
  onChange,
  label,
  allowTransparent = true,
  allowGradient = true,
  size = "md",
  preview = "solid",
  triggerContent,
  triggerClassName = "",
  triggerStyle,
}: ColorPickerProps) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"solid" | "gradient">(isGradientCss(value) ? "gradient" : "solid");
  const [hexInput, setHexInput] = useState("");
  const [grad, setGrad] = useState<GradConfig>(() =>
    isGradientCss(value)
      ? parseGrad(value)
      : { type: "linear", angle: 135, stops: [{ color: "#d97757", pos: 0 }, { color: "#f6eadf", pos: 100 }] }
  );
  const [selStop, setSelStop] = useState(0);
  const [popPos, setPopPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  const triggerRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const nativeColorRef = useRef<HTMLInputElement>(null);

  const isSolid = !isGradientCss(value);
  const currentSolidColor = isSolid && value !== "transparent" ? value : "#000000";

  useEffect(() => {
    if (!open) return;
    if (!isGradientCss(value) && value !== "transparent")
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setHexInput(value.toUpperCase());
  }, [value, open]);

  const openPicker = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const margin = 8;
    const pickerWidth = Math.min(264, window.innerWidth - margin * 2);
    const popH = Math.min(480, Math.max(240, window.innerHeight - margin * 2));
    const spaceBelow = window.innerHeight - rect.bottom;
    const rawTop = spaceBelow >= popH + margin ? rect.bottom + 6 : rect.top - popH - 6;
    const top = clamp(rawTop, margin, Math.max(margin, window.innerHeight - popH - margin));
    const mid = rect.left + rect.width / 2;
    const left = clamp(mid - pickerWidth / 2, margin, Math.max(margin, window.innerWidth - pickerWidth - margin));
    setPopPos({ top, left });
    setTab(isGradientCss(value) && allowGradient ? "gradient" : "solid");
    if (!isGradientCss(value) && value !== "transparent") setHexInput(value.toUpperCase());
    if (isGradientCss(value)) setGrad(parseGrad(value));
    setOpen(true);
  }, [value, allowGradient]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (popRef.current?.contains(e.target as Node)) return;
      if (triggerRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const pickSolid = (c: string) => {
    onChange(c);
    if (c !== "transparent") setHexInput(c.toUpperCase());
  };

  const applyGrad = (g: GradConfig) => {
    setGrad(g);
    onChange(buildGradCss(g));
  };

  const onHexChange = (v: string) => {
    setHexInput(v);
    if (/^#[0-9a-fA-F]{6}$/.test(v)) onChange(v);
  };

  const tryEyedropper = async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const EyeDropper = (window as any).EyeDropper;
    if (!EyeDropper) return;
    try {
      const dropper = new EyeDropper();
      const res = await dropper.open();
      if (res?.sRGBHex) pickSolid(res.sRGBHex);
    } catch {
      /* cancelled */
    }
  };

  const checkerBg = "repeating-conic-gradient(#ccc 0% 25%, #fff 0% 50%) 0 0 / 8px 8px";
  const triggerBg =
    value === "transparent"
      ? checkerBg
      : preview === "ring"
        ? "radial-gradient(circle, #fff 0 43%, " + value + " 45% 100%)"
        : value;

  const btnSz = size === "sm" ? "h-5 w-5" : "h-6 w-6";

  return (
    <div className="relative inline-flex items-center gap-1 shrink-0">
      {label && <span className="text-[10px] text-[#6b625a]">{label}</span>}
      <button
        ref={triggerRef}
        onClick={openPicker}
        title={value}
        className={`${btnSz} shrink-0 rounded border border-[#d8d1c9] cursor-pointer transition-shadow hover:shadow-md ${triggerClassName}`}
        style={triggerStyle ?? { background: triggerBg }}
      >
        {triggerContent}
      </button>

      {open && (
        <div
          ref={popRef}
          className="fixed z-[9999] flex flex-col overflow-hidden rounded-[16px] border border-[#e8e2d9] bg-white shadow-[0_12px_32px_rgba(43,41,38,0.16),0_2px_8px_rgba(43,41,38,0.08)]"
          style={{ top: popPos.top, left: popPos.left, width: Math.min(264, typeof window === "undefined" ? 264 : window.innerWidth - 16), maxHeight: "calc(100vh - 16px)" }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between border-b border-[#e8e2d9] px-3 py-2">
            <span className="text-[13px] font-semibold text-[#2b2926]">Màu sắc</span>
            <button
              onClick={() => setOpen(false)}
              className="flex h-6 w-6 items-center justify-center rounded text-[#8a8178] hover:bg-[#f7f3ee] hover:text-[#4f4943] transition-colors"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          {allowGradient && (
            <div className="flex border-b border-[#e8e2d9] px-3">
              {(["solid", "gradient"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`mr-4 py-2 text-[12px] font-medium border-b-2 transition-colors ${
                    tab === t ? "border-[#d97757] text-[#9f5a3e]" : "border-transparent text-[#6b625a] hover:text-[#2b2926]"
                  }`}
                >
                  {t === "solid" ? "Đồng nhất" : "Gradient"}
                </button>
              ))}
            </div>
          )}

          <div className="overflow-y-auto" style={{ maxHeight: "calc(100vh - 86px)" }}>
            {(tab === "solid" || !allowGradient) && (
              <div className="px-3 py-3 space-y-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <button
                      onClick={() => nativeColorRef.current?.click()}
                      title="Bảng màu"
                      className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-dashed border-[#d8d1c9] hover:border-[#d97757] transition-colors"
                      style={{
                        background:
                          "conic-gradient(hsl(360,100%,50%),hsl(315,100%,50%),hsl(270,100%,50%),hsl(225,100%,50%),hsl(180,100%,50%),hsl(135,100%,50%),hsl(90,100%,50%),hsl(45,100%,50%),hsl(0,100%,50%))",
                      }}
                    />
                    <input
                      ref={nativeColorRef}
                      type="color"
                      value={currentSolidColor}
                      className="sr-only"
                      onChange={(e) => pickSolid(e.target.value)}
                    />

                    <button
                      onClick={tryEyedropper}
                      title="Lấy màu từ màn hình"
                      className="flex h-7 w-7 items-center justify-center rounded-full border border-[#e8e2d9] text-[#6b625a] hover:bg-[#f7f3ee] hover:text-[#d97757] transition-colors"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M2 22l5-2 12-12-3-3L4 17l-2 5z" />
                        <path d="M18.5 3.5a2.828 2.828 0 114 4" />
                      </svg>
                    </button>

                    <input
                      type="text"
                      value={hexInput}
                      placeholder="#000000"
                      onChange={(e) => onHexChange(e.target.value)}
                      maxLength={7}
                      className="flex-1 rounded border border-[#e8e2d9] bg-[#fbfaf8] px-2 py-1 text-[11px] font-mono text-[#2b2926] focus:border-[#d97757] focus:outline-none"
                    />
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {DOC_COLORS.map((c) => (
                      <ColorSwatch key={c} color={c} selected={value === c} onClick={() => pickSolid(c)} />
                    ))}
                    {allowTransparent && (
                      <button
                        onClick={() => pickSolid("transparent")}
                        title="Trong suốt"
                        className={`h-6 w-6 rounded border-2 transition-all ${value === "transparent" ? "border-[#d97757] scale-110" : "border-[#e8e2d9]"}`}
                        style={{ background: "repeating-conic-gradient(#ccc 0% 25%, #fff 0% 50%) 0 0 / 8px 8px" }}
                      />
                    )}
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-[11px] font-medium text-[#6b625a]">Màu đồng nhất mặc định</p>
                  <div className="grid grid-cols-8 gap-1">
                    {FLAT_COLORS.map((c) => (
                      <ColorSwatch key={c} color={c} selected={value === c} onClick={() => pickSolid(c)} />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {allowGradient && tab === "gradient" && (
              <div className="px-3 py-3 space-y-4">
                <div>
                  <p className="mb-2 text-[11px] font-medium text-[#6b625a]">Màu gradient mặc định</p>
                  <div className="grid grid-cols-4 gap-1.5">
                    {GRAD_PRESETS.map((g, i) => {
                      const css = buildGradCss(g);
                      return (
                        <button
                          key={i}
                          onClick={() => applyGrad(g)}
                          title={`Gradient ${i + 1}`}
                          className="h-12 rounded-[14px] border-2 transition-all hover:scale-105 active:scale-95"
                          style={{ background: css, borderColor: value === css ? "#d97757" : "transparent" }}
                        />
                      );
                    })}
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-[11px] font-medium text-[#6b625a]">Tùy chỉnh gradient</p>
                  <div className="flex gap-1 mb-3">
                    {(["linear", "radial"] as const).map((t) => (
                      <button
                        key={t}
                        onClick={() => applyGrad({ ...grad, type: t })}
                        className={`flex-1 rounded-full py-1.5 text-[11px] font-medium transition-colors border ${
                          grad.type === t
                            ? "bg-[#d97757] text-white border-[#d97757]"
                            : "bg-white text-[#6b625a] border-[#e8e2d9] hover:bg-[#fbfaf8]"
                        }`}
                      >
                        {t === "linear" ? "Tuyến tính" : "Hướng tâm"}
                      </button>
                    ))}
                  </div>

                  {grad.type === "linear" && (
                    <div className="mb-3">
                      <div className="flex items-center gap-2 mb-1.5">
                        <p className="text-[10px] text-[#6b625a]">Hướng</p>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min={0}
                            max={359}
                            value={grad.angle}
                            onChange={(e) => applyGrad({ ...grad, angle: (((+e.target.value) % 360) + 360) % 360 })}
                            className="w-14 rounded border border-[#e8e2d9] px-1.5 py-0.5 text-[11px] text-right text-[#2b2926] outline-none focus:border-[#d97757]"
                          />
                          <span className="text-[10px] text-[#8a8178]">°</span>
                        </div>
                      </div>
                      <div className="grid grid-cols-8 gap-1">
                        {ANGLE_DIRS.map(({ angle, svg }) => (
                          <button
                            key={angle}
                            onClick={() => applyGrad({ ...grad, angle })}
                            title={`${angle}°`}
                            className={`flex h-7 w-7 items-center justify-center rounded border text-[#6b625a] transition-colors ${
                              grad.angle === angle ? "bg-[#f6eadf] border-[#d97757] text-[#9f5a3e]" : "border-[#e8e2d9] hover:bg-[#f7f3ee]"
                            }`}
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                              <path d={svg} />
                            </svg>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <p className="mb-2 text-[10px] text-[#6b625a]">Điểm màu</p>
                    <StopBar config={grad} selected={selStop} onSelect={setSelStop} onChange={applyGrad} />
                  </div>

                  {grad.stops.length < 6 && (
                    <button
                      onClick={() => {
                        const mid = Math.round(grad.stops.reduce((s, x) => s + x.pos, 0) / grad.stops.length);
                        const newStops = [...grad.stops, { color: "#ffffff", pos: mid }];
                        applyGrad({ ...grad, stops: newStops });
                        setSelStop(newStops.length - 1);
                      }}
                      className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-full border border-dashed border-[#d8d1c9] py-1.5 text-[11px] text-[#6b625a] hover:border-[#d97757] hover:text-[#d97757] transition-colors"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M12 5v14M5 12h14" strokeLinecap="round" />
                      </svg>
                      Thêm điểm màu
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ColorSwatch({ color, selected, onClick }: { color: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      title={color}
      className={`h-6 w-6 shrink-0 rounded border-2 transition-all hover:scale-110 active:scale-95 ${
        selected ? "border-[#d97757] scale-110 shadow-md" : "border-transparent"
      }`}
      style={{ background: color }}
    />
  );
}
