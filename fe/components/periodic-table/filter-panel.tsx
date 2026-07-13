"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ELEMENTS } from './data';
import {
  DEFAULT_FILTER_STATE,
  CATEGORY_COLORS,
  type FilterState,
  type ElementBlock,
  type ElementState,
  type ElementCategory,
} from './types';

interface Props {
  filters: FilterState;
  onApply: (f: FilterState) => void;
  onClose: () => void;
}

// Compute global min/max for each numeric property
function computeGlobalRanges() {
  const vals = (prop: keyof (typeof ELEMENTS)[0]) =>
    ELEMENTS.map(e => e[prop] as number | null).filter((v): v is number => v !== null);

  const range = (prop: keyof (typeof ELEMENTS)[0]) => {
    const v = vals(prop);
    return { min: Math.min(...v), max: Math.max(...v) };
  };

  return {
    meltingPoint:     range('meltingPoint'),
    boilingPoint:     range('boilingPoint'),
    density:          range('density'),
    electronegativity:range('electronegativity'),
    ionizationEnergy: range('ionizationEnergy'),
    electronAffinity: range('electronAffinity'),
    vanDerWaalsRadius:range('vanDerWaalsRadius'),
  };
}

const GLOBAL = computeGlobalRanges();

const FILTER_GRADIENTS = {
  temperature: 'linear-gradient(to right, #8ca9ed, #64d2c2, #f1db61, #ef8a55, #dc5550)',
  density: 'linear-gradient(to right, #dbeafe, #7db8e8, #3b82c4, #1e4f8a)',
  electronegativity: 'linear-gradient(to right, #eee5f8, #c3a2e3, #8d62bd, #573580)',
  ionizationEnergy: 'linear-gradient(to right, #d7f1df, #7ec89a, #3a9a68, #17633f)',
  electronAffinity: 'linear-gradient(to right, #ffead8, #f7b176, #e77a47, #a94728)',
  radius: 'linear-gradient(to right, #e0f2fe, #86efac, #fde047, #fb923c)',
} as const;

interface DualRangeProps {
  label: string;
  unit: string;
  gradient: string;
  globalMin: number;
  globalMax: number;
  value: [number, number] | null;
  onChange: (v: [number, number] | null) => void;
}

function DualRange({ label, unit, gradient, globalMin, globalMax, value, onChange }: DualRangeProps) {
  const cur = useMemo<[number, number]>(
    () => value ?? [globalMin, globalMax],
    [globalMax, globalMin, value],
  );
  const enabled = value !== null;
  const toggleEnabled = () => onChange(enabled ? null : [globalMin, globalMax]);

  const trackRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef<'min' | 'max' | null>(null);
  const curRef = useRef(cur);
  const onChangeRef = useRef(onChange);

  useEffect(() => { curRef.current = cur; }, [cur]);
  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);

  const quantise = useCallback((raw: number) => {
    const span = globalMax - globalMin;
    const step = span > 500 ? 1 : span > 100 ? 0.5 : span > 10 ? 0.1 : 0.01;
    return Math.round(raw / step) * step;
  }, [globalMax, globalMin]);

  const updateThumb = useCallback((clientX: number, thumb: 'min' | 'max') => {
    const track = trackRef.current;
    if (!track) return;
    const rect = track.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const nextValue = quantise(globalMin + ratio * (globalMax - globalMin));
    const current = curRef.current;
    const next: [number, number] = thumb === 'min'
      ? [Math.min(nextValue, current[1]), current[1]]
      : [current[0], Math.max(nextValue, current[0])];
    curRef.current = next;
    onChangeRef.current(next);
  }, [globalMax, globalMin, quantise]);

  useEffect(() => {
    const handleMove = (event: PointerEvent) => {
      if (draggingRef.current) updateThumb(event.clientX, draggingRef.current);
    };
    const handleUp = () => { draggingRef.current = null; };
    window.addEventListener('pointermove', handleMove, { passive: true });
    window.addEventListener('pointerup', handleUp);
    window.addEventListener('pointercancel', handleUp);
    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
      window.removeEventListener('pointercancel', handleUp);
    };
  }, [updateThumb]);

  const handleMinPointerDown = useCallback((event: React.PointerEvent) => {
    event.preventDefault();
    event.stopPropagation();
    draggingRef.current = 'min';
    updateThumb(event.clientX, 'min');
  }, [updateThumb]);

  const handleMaxPointerDown = useCallback((event: React.PointerEvent) => {
    event.preventDefault();
    event.stopPropagation();
    draggingRef.current = 'max';
    updateThumb(event.clientX, 'max');
  }, [updateThumb]);

  const startTrackDrag = (event: React.PointerEvent) => {
    const track = trackRef.current;
    if (!track) return;
    const rect = track.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
    const clickedValue = globalMin + ratio * (globalMax - globalMin);
    const thumb = Math.abs(clickedValue - curRef.current[0]) <= Math.abs(clickedValue - curRef.current[1]) ? 'min' : 'max';
    draggingRef.current = thumb;
    updateThumb(event.clientX, thumb);
  };

  const pctMin = ((cur[0] - globalMin) / (globalMax - globalMin)) * 100;
  const pctMax = ((cur[1] - globalMin) / (globalMax - globalMin)) * 100;

  const fmt = (v: number) =>
    Math.abs(globalMax - globalMin) > 100 ? v.toFixed(0) : v.toFixed(2);

  return (
    <div
      className={`group relative space-y-2.5 rounded-xl border p-3.5 transition-all ${
        enabled
          ? 'border-[#e6b09d] bg-[#fff7f1] shadow-sm'
          : 'border-[#d8d1c9] bg-white hover:border-[#c7bdb3] hover:bg-[#faf8f5]'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <label
          onClick={toggleEnabled}
          className="cursor-pointer text-sm font-semibold text-gray-800 select-none"
        >
          {label}
          {unit && <span className="ml-1 text-xs font-normal text-gray-500">({unit})</span>}
        </label>
        <button
          onClick={toggleEnabled}
          role="switch"
          aria-checked={enabled}
          className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${
            enabled ? 'bg-[#d97757]' : 'bg-[#c7bdb3]'
          }`}
        >
          <span
            className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${
              enabled ? 'left-[18px]' : 'left-0.5'
            }`}
          />
        </button>
      </div>
      {enabled ? (
        <>
          <div
            ref={trackRef}
            onPointerDown={startTrackDrag}
            className="relative h-7 cursor-pointer touch-none select-none"
          >
            <div
              className="absolute inset-x-0 top-1/2 h-2 -translate-y-1/2 rounded-full"
              style={{ background: gradient }}
            />
            <div
              className="absolute top-1/2 h-2 -translate-y-1/2 rounded-l-full bg-white/70"
              style={{ left: 0, width: `${pctMin}%` }}
            />
            <div
              className="absolute top-1/2 h-2 -translate-y-1/2 rounded-r-full bg-white/70"
              style={{ right: 0, width: `${100 - pctMax}%` }}
            />
            <button
              type="button"
              aria-label={`Giá trị thấp nhất của ${label}`}
              onPointerDown={handleMinPointerDown}
              className="pt-thumb absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 cursor-grab rounded-full bg-[#1f1f1f] shadow-md ring-2 ring-white active:cursor-grabbing"
              style={{ left: `${pctMin}%` }}
            />
            <button
              type="button"
              aria-label={`Giá trị cao nhất của ${label}`}
              onPointerDown={handleMaxPointerDown}
              className="pt-thumb absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 cursor-grab rounded-full bg-[#1f1f1f] shadow-md ring-2 ring-white active:cursor-grabbing"
              style={{ left: `${pctMax}%` }}
            />
          </div>
          <div className="flex items-center justify-between gap-2 pt-0.5 text-xs font-medium text-gray-700">
            <span className="rounded-md bg-white px-2 py-0.5 font-mono tabular-nums shadow-sm border border-gray-100">
              {fmt(cur[0])}{unit && <span className="ml-1 text-[10px] text-gray-400">{unit}</span>}
            </span>
            <span className="text-gray-300">—</span>
            <span className="rounded-md bg-white px-2 py-0.5 font-mono tabular-nums shadow-sm border border-gray-100">
              {fmt(cur[1])}{unit && <span className="ml-1 text-[10px] text-gray-400">{unit}</span>}
            </span>
          </div>
        </>
      ) : (
        <p className="text-xs text-gray-400 italic">
          Bấm để bật lọc — toàn dải {fmt(globalMin)} – {fmt(globalMax)}{unit && ` ${unit}`}
        </p>
      )}
    </div>
  );
}

export function FilterPanel({ filters, onApply, onClose }: Props) {
  const [local, setLocal] = useState<FilterState>(() => ({
    ...filters,
    blocks: new Set(filters.blocks),
    states: new Set(filters.states),
    categories: new Set(filters.categories),
  }));

  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) onClose();
    };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('mousedown', handler);
    window.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', handler);
      window.removeEventListener('keydown', esc);
    };
  }, [onClose]);

  const toggleSet = <T,>(set: Set<T>, val: T) => {
    const next = new Set(set);
    if (next.has(val)) next.delete(val);
    else next.add(val);
    return next;
  };

  const handleReset = () =>
    setLocal({
      ...DEFAULT_FILTER_STATE,
      blocks: new Set(),
      states: new Set(),
      categories: new Set(),
    });

  // Count of active filters (for badge in header)
  const activeCount =
    (local.meltingPoint ? 1 : 0) +
    (local.boilingPoint ? 1 : 0) +
    (local.density ? 1 : 0) +
    (local.electronegativity ? 1 : 0) +
    (local.ionizationEnergy ? 1 : 0) +
    (local.electronAffinity ? 1 : 0) +
    (local.vanDerWaalsRadius ? 1 : 0) +
    local.blocks.size + local.states.size + local.categories.size;

  const BLOCKS: { val: ElementBlock; label: string; desc: string }[] = [
    { val: 's', label: 'Khối s', desc: 'Nhóm 1, 2' },
    { val: 'p', label: 'Khối p', desc: 'Nhóm 13–18' },
    { val: 'd', label: 'Khối d', desc: 'Kim loại chuyển tiếp' },
    { val: 'f', label: 'Khối f', desc: 'Lanthanide, Actinide' },
  ];

  const STATES: { val: ElementState; label: string; icon: string }[] = [
    { val: 'solid',   label: 'Rắn',              icon: '🧊' },
    { val: 'liquid',  label: 'Lỏng',             icon: '💧' },
    { val: 'gas',     label: 'Khí',              icon: '💨' },
    { val: 'unknown', label: 'Không xác định',   icon: '❔' },
  ];

  const CATEGORIES = Object.entries(CATEGORY_COLORS) as [ElementCategory, typeof CATEGORY_COLORS[ElementCategory]][];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1f1f1f]/35 p-3 backdrop-blur-sm sm:p-4 pt-fade-in">
      <div
        ref={panelRef}
        className="filter-panel-enter w-full max-w-3xl overflow-hidden rounded-[16px] bg-white shadow-2xl ring-1 ring-black/5"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#e5dfd8] bg-[#fffdfb] px-5 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-[#1f1f1f] text-white shadow-sm">
              <svg className="h-4 w-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
              </svg>
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">Bộ lọc nguyên tố</h2>
              <p className="text-xs text-gray-500">
                {activeCount === 0 ? 'Chưa có bộ lọc nào' : `${activeCount} bộ lọc đang bật`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="pt-lift flex h-8 w-8 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-700"
            aria-label="Đóng"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-gray-100 overflow-y-auto" style={{ maxHeight: '72vh' }}>
          {/* Left: Numeric properties */}
          <div className="space-y-3 p-5">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold uppercase tracking-wide text-gray-700">Tính chất số</h3>
              <span className="h-px flex-1 bg-gray-200" />
            </div>
            <DualRange
              label="Điểm nóng chảy" unit="°C"
              gradient={FILTER_GRADIENTS.temperature}
              globalMin={GLOBAL.meltingPoint.min} globalMax={GLOBAL.meltingPoint.max}
              value={local.meltingPoint}
              onChange={v => setLocal(p => ({ ...p, meltingPoint: v }))}
            />
            <DualRange
              label="Điểm sôi" unit="°C"
              gradient={FILTER_GRADIENTS.temperature}
              globalMin={GLOBAL.boilingPoint.min} globalMax={GLOBAL.boilingPoint.max}
              value={local.boilingPoint}
              onChange={v => setLocal(p => ({ ...p, boilingPoint: v }))}
            />
            <DualRange
              label="Khối lượng riêng" unit="g/cm³"
              gradient={FILTER_GRADIENTS.density}
              globalMin={GLOBAL.density.min} globalMax={GLOBAL.density.max}
              value={local.density}
              onChange={v => setLocal(p => ({ ...p, density: v }))}
            />
            <DualRange
              label="Độ âm điện" unit=""
              gradient={FILTER_GRADIENTS.electronegativity}
              globalMin={GLOBAL.electronegativity.min} globalMax={GLOBAL.electronegativity.max}
              value={local.electronegativity}
              onChange={v => setLocal(p => ({ ...p, electronegativity: v }))}
            />
            <DualRange
              label="Năng lượng ion hóa" unit="kJ/mol"
              gradient={FILTER_GRADIENTS.ionizationEnergy}
              globalMin={GLOBAL.ionizationEnergy.min} globalMax={GLOBAL.ionizationEnergy.max}
              value={local.ionizationEnergy}
              onChange={v => setLocal(p => ({ ...p, ionizationEnergy: v }))}
            />
            <DualRange
              label="Ái lực electron" unit="kJ/mol"
              gradient={FILTER_GRADIENTS.electronAffinity}
              globalMin={GLOBAL.electronAffinity.min} globalMax={GLOBAL.electronAffinity.max}
              value={local.electronAffinity}
              onChange={v => setLocal(p => ({ ...p, electronAffinity: v }))}
            />
            <DualRange
              label="Bán kính van der Waals" unit="pm"
              gradient={FILTER_GRADIENTS.radius}
              globalMin={GLOBAL.vanDerWaalsRadius.min} globalMax={GLOBAL.vanDerWaalsRadius.max}
              value={local.vanDerWaalsRadius}
              onChange={v => setLocal(p => ({ ...p, vanDerWaalsRadius: v }))}
            />
          </div>

          {/* Right: Categorical */}
          <div className="space-y-5 p-5">
            {/* Blocks */}
            <section>
              <div className="mb-2.5 flex items-center gap-2">
                <h3 className="text-sm font-bold uppercase tracking-wide text-gray-700">Khối</h3>
                <span className="h-px flex-1 bg-gray-200" />
                {local.blocks.size > 0 && (
                  <span className="rounded-full bg-[#fff0e8] px-2 py-0.5 text-[10px] font-semibold text-[#b45335]">
                    {local.blocks.size}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {BLOCKS.map(({ val, label, desc }) => {
                  const checked = local.blocks.has(val);
                  return (
                    <button
                      key={val}
                      onClick={() => setLocal(p => ({ ...p, blocks: toggleSet(p.blocks, val) }))}
                      className={`group flex items-start gap-2.5 rounded-xl border p-3 text-left transition-all ${
                        checked
                          ? 'border-[#e6b09d] bg-[#fff7f1] shadow-sm'
                          : 'border-[#d8d1c9] bg-white hover:border-[#c7bdb3] hover:bg-[#faf8f5]'
                      }`}
                    >
                      <span
                        className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border-2 transition-all ${
                          checked ? 'border-[#d97757] bg-[#d97757]' : 'border-gray-300 bg-white'
                        }`}
                      >
                        {checked && (
                          <svg className="h-2.5 w-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </span>
                      <div className="leading-tight">
                        <div className="text-sm font-semibold text-gray-800">{label}</div>
                        <div className="text-[10px] text-gray-500">{desc}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* States */}
            <section>
              <div className="mb-2.5 flex items-center gap-2">
                <h3 className="text-sm font-bold uppercase tracking-wide text-gray-700">Trạng thái <span className="text-[10px] font-normal text-gray-400">(25 °C)</span></h3>
                <span className="h-px flex-1 bg-gray-200" />
                {local.states.size > 0 && (
                  <span className="rounded-full bg-[#fff0e8] px-2 py-0.5 text-[10px] font-semibold text-[#b45335]">
                    {local.states.size}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {STATES.map(({ val, label, icon }) => {
                  const checked = local.states.has(val);
                  return (
                    <button
                      key={val}
                      onClick={() => setLocal(p => ({ ...p, states: toggleSet(p.states, val) }))}
                      className={`flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-all ${
                        checked
                          ? 'border-[#e6b09d] bg-[#fff7f1] shadow-sm'
                          : 'border-[#d8d1c9] bg-white hover:border-[#c7bdb3] hover:bg-[#faf8f5]'
                      }`}
                    >
                      <span className="text-base">{icon}</span>
                      <span className="text-sm font-medium text-gray-800">{label}</span>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Categories */}
            <section>
              <div className="mb-2.5 flex items-center gap-2">
                <h3 className="text-sm font-bold uppercase tracking-wide text-gray-700">Loại nguyên tố</h3>
                <span className="h-px flex-1 bg-gray-200" />
                {local.categories.size > 0 && (
                  <span className="rounded-full bg-[#fff0e8] px-2 py-0.5 text-[10px] font-semibold text-[#b45335]">
                    {local.categories.size}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-1 gap-1.5">
                {CATEGORIES.map(([val, meta]) => {
                  const checked = local.categories.has(val);
                  return (
                    <button
                      key={val}
                      onClick={() => setLocal(p => ({ ...p, categories: toggleSet(p.categories, val) }))}
                      className={`flex items-center gap-2.5 rounded-lg border px-2.5 py-1.5 text-left transition-all ${
                        checked
                          ? 'border-[#e6b09d] bg-[#fff7f1] shadow-sm'
                          : 'border-transparent hover:border-[#d8d1c9] hover:bg-[#faf8f5]'
                      }`}
                    >
                      <span
                        className="inline-block h-4 w-4 shrink-0 rounded border shadow-sm"
                        style={{ backgroundColor: meta.bg, borderColor: meta.border }}
                      />
                      <span className="text-sm text-gray-800 flex-1">{meta.label}</span>
                      {checked && (
                        <svg className="h-4 w-4 text-[#d97757]" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </button>
                  );
                })}
              </div>
            </section>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 border-t border-[#e5dfd8] bg-[#faf8f5] px-5 py-3.5 sm:px-6">
          <button
            onClick={handleReset}
            className="pt-lift inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium text-gray-600 hover:bg-gray-200/60 hover:text-gray-900"
          >
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Đặt lại tất cả
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="pt-lift rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-200/60 hover:text-gray-900"
            >
              Hủy
            </button>
            <button
              onClick={() => onApply(local)}
              className="pt-lift inline-flex items-center gap-1.5 rounded-[9px] bg-[#d97757] px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#c9684b] hover:shadow-md"
            >
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Áp dụng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
