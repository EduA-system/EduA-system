"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ELEMENTS, computeRange } from './data';
import { ElementCard } from './element-card';
import { EmbeddedLegend } from './legend';
import {
  CATEGORY_COLORS,
  BLOCK_COLORS,
  STATE_COLORS,
  PERIOD_COLORS,
  GROUP_MODE_LABELS,
  COLOR_MODE_LABELS,
  heatmapColor,
  type Element,
  type DisplayMode,
  type GroupMode,
  type ColorMode,
} from './types';

const GAP_RATIO = 0.06;       // gap = 6 % of cell size (matches zperiod proportion)
const COLS = 18;
const MIN_CELL = 54;
const MAX_CELL = 68;

interface Props {
  visibleSet: Set<number>;
  selectedElement: Element | null;
  displayMode: DisplayMode;
  groupMode: GroupMode;
  colorMode: ColorMode;
  onSelectElement: (el: Element) => void;
  onOpenFilter: () => void;
  onReset: () => void;
  onChangeDisplayMode: (m: DisplayMode) => void;
  onChangeGroupMode: (m: GroupMode) => void;
  onChangeColorMode: (m: ColorMode) => void;
  quickRange: [number, number] | null;
  onChangeQuickRange: (range: [number, number] | null) => void;
  hasActiveFilters: boolean;
  searchQuery: string;
  onChangeSearchQuery: (query: string) => void;
  onOpenSidebar: () => void;
}

function resolveColor(
  el: Element,
  displayMode: DisplayMode,
  groupMode: GroupMode,
  colorMode: ColorMode,
  heatRange: { min: number; max: number }
): { bg: string; border: string } {
  if (displayMode === 'color') {
    const val = el[colorMode] as number | null;
    if (val === null) return { bg: '#e5e7eb', border: '#d1d5db' };
    const c = heatmapColor(val, heatRange.min, heatRange.max);
    return { bg: c, border: c };
  }
  if (groupMode === 'category') {
    const col = CATEGORY_COLORS[el.category];
    return { bg: col.bg, border: col.border };
  }
  if (groupMode === 'block') {
    const col = BLOCK_COLORS[el.block];
    return { bg: col.bg, border: col.border };
  }
  if (groupMode === 'state') {
    const col = STATE_COLORS[el.state];
    return { bg: col.bg, border: col.border };
  }
  if (groupMode === 'period') {
    const col = PERIOD_COLORS[el.period];
    return { bg: col.bg, border: col.border };
  }
  return { bg: '#f3f4f6', border: '#d1d5db' };
}

function matchesLegendKey(el: Element, key: string, groupMode: GroupMode): boolean {
  switch (groupMode) {
    case 'category': return el.category === key;
    case 'block':    return el.block === key;
    case 'state':    return el.state === key;
    case 'period':   return el.period.toString() === key;
    default:         return true;
  }
}

type DropdownKey = 'group' | 'color' | null;

function ControlDropdown<T extends string>({
  label, active, options, currentValue, onSelect, isOpen, onToggle,
}: {
  label: string;
  active: boolean;
  options: { value: T; label: string }[];
  currentValue: T;
  onSelect: (v: T) => void;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!isOpen) return;
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onToggle();
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [isOpen, onToggle]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={onToggle}
        className={`pt-lift inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium ${
          active ? 'border-[#d97757] bg-[#fff7f1] text-[#b45335] shadow-sm'
                 : 'border-[#d8d1c9] bg-white text-[#6b6b6b] hover:border-[#c7bdb3] hover:bg-[#faf8f5]'}`}
      >
        {label && <span>{label}</span>}
        <span className="font-semibold whitespace-nowrap">{options.find(o => o.value === currentValue)?.label}</span>
        <svg className={`h-3 w-3 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen && (
        <div className="pt-dropdown-in absolute left-0 top-full z-30 mt-1.5 min-w-[240px] overflow-hidden rounded-xl border border-gray-100 bg-white/95 backdrop-blur-sm shadow-xl ring-1 ring-black/5">
          {options.map((opt, i) => (
            <button
              key={opt.value}
              onClick={() => { onSelect(opt.value); onToggle(); }}
              style={{ animationDelay: `${i * 18}ms` }}
              className={`pt-fade-up flex w-full items-center gap-2 whitespace-nowrap px-3 py-2 text-sm transition-all hover:bg-[#fff7f1] hover:pl-4 duration-200 ${
                opt.value === currentValue ? 'bg-[#fff7f1] font-semibold text-[#b45335]' : 'text-[#4b4743]'}`}
            >
              {opt.value === currentValue ? (
                <svg className="h-3.5 w-3.5 text-[#d97757] shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              ) : (
                <span className="inline-block h-3.5 w-3.5 shrink-0" />
              )}
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const GROUP_OPTIONS: { value: GroupMode; label: string }[] = Object.entries(GROUP_MODE_LABELS).map(([k, v]) => ({ value: k as GroupMode, label: v }));
const COLOR_OPTIONS: { value: ColorMode; label: string }[] = Object.entries(COLOR_MODE_LABELS).map(([k, v]) => ({ value: k as ColorMode, label: v.label }));

const MAIN_ELEMENTS = ELEMENTS.filter(e => e.gridRow <= 7);
const F_ELEMENTS    = ELEMENTS.filter(e => e.gridRow >= 9);

// ─── Generic range filter slider (always-enabled, rainbow track) ─────
interface QuickRangeSliderProps {
  prop: ColorMode;
  value: [number, number] | null;        // null = full bounds (no filter)
  onChange: (v: [number, number] | null) => void;
}

function QuickRangeSlider({ prop, value, onChange }: QuickRangeSliderProps) {
  const meta = COLOR_MODE_LABELS[prop];
  const bounds = useMemo(() => {
    const vals = ELEMENTS.map(e => e[prop] as number | null).filter((v): v is number => v !== null);
    return { min: Math.floor(Math.min(...vals)), max: Math.ceil(Math.max(...vals)) };
  }, [prop]);

  // Always render a [min, max] range — null means "covers everything"
  const cur = useMemo<[number, number]>(
    () => value ?? [bounds.min, bounds.max],
    [value, bounds.min, bounds.max]
  );

  const trackRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef<'min' | 'max' | null>(null);
  // Refs that mirror the latest values — used inside the drag handler so it
  // can stay referentially stable and the pointermove listener doesn't get
  // re-attached on every state update (which dropped events mid-drag).
  const curRef = useRef(cur);
  const boundsRef = useRef(bounds);
  const onChangeRef = useRef(onChange);
  const rafRef = useRef<number | null>(null);
  const pendingRef = useRef<{ clientX: number; thumb: 'min' | 'max' } | null>(null);

  useEffect(() => { curRef.current = cur; }, [cur]);
  useEffect(() => { boundsRef.current = bounds; }, [bounds]);
  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);

  const pctMin = ((cur[0] - bounds.min) / (bounds.max - bounds.min)) * 100;
  const pctMax = ((cur[1] - bounds.min) / (bounds.max - bounds.min)) * 100;

  // Quantise the slider value:
  //   - very large spans (>500)   → integers
  //   - medium spans   (100-500)  → 0.5 steps  (smoother feel around 400)
  //   - small spans    (10-100)   → 0.1 steps
  //   - tiny spans     (<10)      → 0.01 steps
  const quantise = useCallback((raw: number, span: number) => {
    let step: number;
    if (span > 500)      step = 1;
    else if (span > 100) step = 0.5;
    else if (span > 10)  step = 0.1;
    else                 step = 0.01;
    return Math.round(raw / step) * step;
  }, []);

  // Stable: no React-state deps — reads from refs and writes via rAF.
  const flushUpdate = useCallback(() => {
    rafRef.current = null;
    const p = pendingRef.current;
    if (!p) return;
    const track = trackRef.current;
    if (!track) return;
    const r = track.getBoundingClientRect();
    const t = Math.max(0, Math.min(1, (p.clientX - r.left) / r.width));
    const b = boundsRef.current;
    const span = b.max - b.min;
    const v = quantise(b.min + t * span, span);
    const c = curRef.current;
    const next: [number, number] = p.thumb === 'min'
      ? [Math.min(v, c[1]), c[1]]
      : [c[0], Math.max(v, c[0])];
    // Avoid a no-op state update (would still queue a render)
    if (next[0] === c[0] && next[1] === c[1]) return;
    if (next[0] <= b.min && next[1] >= b.max) onChangeRef.current(null);
    else onChangeRef.current(next);
  }, [quantise]);

  const scheduleUpdate = useCallback((clientX: number, thumb: 'min' | 'max') => {
    pendingRef.current = { clientX, thumb };
    if (rafRef.current === null) {
      rafRef.current = requestAnimationFrame(flushUpdate);
    }
  }, [flushUpdate]);

  useEffect(() => {
    const move = (e: PointerEvent) => {
      if (!draggingRef.current) return;
      scheduleUpdate(e.clientX, draggingRef.current);
    };
    const up = () => {
      draggingRef.current = null;
      // Flush any pending update immediately on release
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
        flushUpdate();
      }
    };
    window.addEventListener('pointermove', move, { passive: true });
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [scheduleUpdate, flushUpdate]);

  const startDrag = useCallback(
    (thumb: 'min' | 'max') => (e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
      draggingRef.current = thumb;
      scheduleUpdate(e.clientX, thumb);
    },
    [scheduleUpdate]
  );

  // Decimal precision: fewer for large spans
  const span = bounds.max - bounds.min;
  const format = (v: number) =>
    span > 500 ? v.toFixed(0) : span > 100 ? v.toFixed(1) : span > 10 ? v.toFixed(1) : v.toFixed(2);

  return (
    <div className="flex items-center gap-3 w-full">
      {/* Min value label */}
      <span className="shrink-0 font-mono text-base font-semibold text-gray-800 tabular-nums w-24 text-right">
        {format(cur[0])}{meta.unit && <span className="ml-1 text-xs font-normal text-gray-400">{meta.unit}</span>}
      </span>

      {/* Rainbow track with two thumbs */}
      <div
        ref={trackRef}
        className="relative h-6 flex-1 select-none touch-none cursor-pointer"
        style={{ minWidth: 120 }}
      >
        <div
          className="absolute inset-x-0 top-1/2 h-2 -translate-y-1/2 rounded-full"
          style={{ background: 'linear-gradient(to right, hsl(240,80%,75%), hsl(180,75%,65%), hsl(60,90%,68%), hsl(20,90%,62%), hsl(0,85%,58%))' }}
        />
        <div
          className="absolute top-1/2 h-2 -translate-y-1/2 rounded-l-full bg-white/70 backdrop-blur-[1px]"
          style={{ left: 0, width: `${pctMin}%` }}
        />
        <div
          className="absolute top-1/2 h-2 -translate-y-1/2 rounded-r-full bg-white/70 backdrop-blur-[1px]"
          style={{ right: 0, width: `${100 - pctMax}%` }}
        />
        <div
          onPointerDown={startDrag('min')}
          className="pt-thumb absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gray-900 shadow-md ring-2 ring-white cursor-grab active:cursor-grabbing"
          style={{ left: `${pctMin}%` }}
        />
        <div
          onPointerDown={startDrag('max')}
          className="pt-thumb absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gray-900 shadow-md ring-2 ring-white cursor-grab active:cursor-grabbing"
          style={{ left: `${pctMax}%` }}
        />
      </div>

      {/* Max value label */}
      <span className="shrink-0 font-mono text-base font-semibold text-gray-800 tabular-nums w-24 text-left">
        {format(cur[1])}{meta.unit && <span className="ml-1 text-xs font-normal text-gray-400">{meta.unit}</span>}
      </span>

      {/* High / low indicators (no-data hint removed) */}
      <div className="hidden md:flex shrink-0 items-center gap-3 text-xs text-gray-500">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: 'hsl(240,80%,75%)' }} />
          Thấp
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: 'hsl(0,85%,58%)' }} />
          Cao
        </span>
      </div>

    </div>
  );
}

// ─── Hook to measure container size ─────────────────────────────────
function useContainerSize(): [React.RefObject<HTMLDivElement | null>, { w: number; h: number }] {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return [ref, size];
}

export function PeriodicTable({
  visibleSet,
  selectedElement,
  displayMode,
  groupMode,
  colorMode,
  onSelectElement,
  onOpenFilter,
  onReset,
  onChangeDisplayMode,
  onChangeGroupMode,
  onChangeColorMode,
  quickRange,
  onChangeQuickRange,
  hasActiveFilters,
  searchQuery,
  onChangeSearchQuery,
  onOpenSidebar,
}: Props) {
  const [openDropdown, setOpenDropdown] = useState<DropdownKey>(null);
  const [hoveredLegendKey, setHoveredLegendKey] = useState<string | null>(null);

  const toggle = useCallback((key: DropdownKey) => setOpenDropdown(p => p === key ? null : key), []);

  const heatRange = computeRange(ELEMENTS, colorMode as keyof Element);

  const handleGroupMode = useCallback((m: GroupMode) => {
    setHoveredLegendKey(null);
    onChangeGroupMode(m);
  }, [onChangeGroupMode]);

  const handleDisplayMode = useCallback((m: DisplayMode) => {
    setHoveredLegendKey(null);
    onChangeDisplayMode(m);
  }, [onChangeDisplayMode]);

  const getColors = useCallback(
    (el: Element) => resolveColor(el, displayMode, groupMode, colorMode, heatRange),
    [displayMode, groupMode, colorMode, heatRange]
  );

  const isElementVisible = useCallback(
    (el: Element): boolean => {
      if (!visibleSet.has(el.atomicNumber)) return false;
      if (!hoveredLegendKey || displayMode === 'color') return true;
      return matchesLegendKey(el, hoveredLegendKey, groupMode);
    },
    [visibleSet, hoveredLegendKey, displayMode, groupMode]
  );

  // ── Responsive cell sizing — fit BOTH width and height of the wrap ──
  // Table footprint: 9 cell rows (7 main + 2 f-block) + group-number row + separator.
  const [tableWrapRef, tableSize] = useContainerSize();
  const cell = useMemo(() => {
    if (tableSize.w === 0 || tableSize.h === 0) return MIN_CELL;
    const byWidth  = (tableSize.w - 8) / (COLS + (COLS - 1) * GAP_RATIO);
    // Reserve ~46 px for group-number row (~18) + separator (~24) + small padding.
    const byHeight = (tableSize.h - 46) / (9 + 8 * GAP_RATIO);
    return Math.max(MIN_CELL, Math.min(MAX_CELL, Math.floor(Math.min(byWidth, byHeight))));
  }, [tableSize.w, tableSize.h]);
  const gap = Math.max(3, Math.round(cell * GAP_RATIO) + 1);
  const tableW = COLS * cell + (COLS - 1) * gap;

  const makeGridStyle = (rows: number): React.CSSProperties => ({
    display: 'grid',
    gap: `${gap}px`,
    gridTemplateColumns: `repeat(${COLS}, ${cell}px)`,
    gridTemplateRows: `repeat(${rows}, ${cell}px)`,
    width: tableW,
  });
  const cellStyle = (col: number, row: number): React.CSSProperties => ({
    gridColumn: col,
    gridRow: row,
    width: cell,
    height: cell,
  });

  const stubBase = 'flex h-full w-full flex-col items-center justify-center rounded-lg border border-dashed leading-tight';
  const stubFont = `clamp(7px, ${Math.round(cell * 0.18)}px, 12px)`;

  return (
    <div className="flex h-full w-full min-w-0 flex-col gap-2">
      {/* ── Controls ─────────────────────────────────────────── */}
      {/* relative z-20: ensure dropdown menus paint over the (transform-ed) table wrap */}
      <div className="pt-fade-up relative z-20 flex flex-wrap items-center gap-2 shrink-0" style={{ animationDelay: '80ms' }}>
        <button
          type="button"
          onClick={onOpenSidebar}
          aria-label="Mở menu điều hướng"
          className="flex size-9 shrink-0 items-center justify-center rounded-full border border-[#d8d1c9] bg-white text-[#6b6b6b] transition hover:bg-[#edeae5] md:hidden"
        >
          <svg viewBox="0 0 24 24" className="size-4.5" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path strokeLinecap="round" d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        </button>

        <ControlDropdown<GroupMode>
          label="Nhóm"
          active={displayMode === 'group'}
          options={GROUP_OPTIONS}
          currentValue={groupMode}
          onSelect={v => { handleGroupMode(v); handleDisplayMode('group'); }}
          isOpen={openDropdown === 'group'}
          onToggle={() => toggle('group')}
        />
        <ControlDropdown<ColorMode>
          label=""
          active={displayMode === 'color'}
          options={COLOR_OPTIONS}
          currentValue={colorMode}
          onSelect={v => { onChangeColorMode(v); handleDisplayMode('color'); }}
          isOpen={openDropdown === 'color'}
          onToggle={() => toggle('color')}
        />
        <button
          onClick={onOpenFilter}
          title="Mở bộ lọc chi tiết"
          className={`pt-lift group inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium ${
            hasActiveFilters
            ? 'border-[#d97757] bg-[#fff7f1] text-[#b45335] shadow-sm'
            : 'border-[#d8d1c9] bg-white text-[#6b6b6b] hover:border-[#c7bdb3] hover:bg-[#faf8f5]'
          }`}
        >
          <svg className="h-3.5 w-3.5 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
          </svg>
          Bộ lọc
          {hasActiveFilters && (
            <span className="pt-pulse-ring ml-0.5 inline-flex h-2 w-2 items-center justify-center rounded-full bg-[#d97757]" />
          )}
        </button>

        <button
          onClick={() => { setHoveredLegendKey(null); onReset(); }}
          title="Đặt lại tất cả về mặc định"
          className="pt-lift group inline-flex items-center gap-1.5 rounded-full border border-[#d8d1c9] bg-white px-3.5 py-1.5 text-sm font-medium text-[#6b6b6b] hover:border-[#c7bdb3] hover:bg-[#faf8f5]"
        >
          <svg className="h-3.5 w-3.5 transition-transform duration-500 group-hover:-rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Đặt lại
        </button>

        <div className="ml-auto flex min-w-0 basis-full items-center justify-end gap-2 sm:basis-auto">
          <div className="group relative w-full max-w-[300px] sm:w-[260px]">
            <svg className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-[#8a8179] transition-colors group-focus-within:text-[#d97757]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => onChangeSearchQuery(event.target.value)}
              placeholder="Tìm nguyên tố, ký hiệu, số nguyên tử"
              className="pt-search w-full rounded-full border border-[#d8d1c9] bg-white py-2 pl-9 pr-8 text-xs text-[#1f1f1f] placeholder:text-[#8a8179] transition-all focus:border-[#d97757] focus:outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                aria-label="Xóa tìm kiếm"
                onClick={() => onChangeSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8a8179] transition hover:text-[#1f1f1f]"
              >
                <svg className="size-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all duration-300 ${
            visibleSet.size === 118
              ? 'bg-[#edeae5] text-[#5f5a55]'
              : 'bg-[#fff0e8] text-[#b45335] shadow-sm'
          }`}>
            <span className={`inline-block h-1.5 w-1.5 rounded-full ${visibleSet.size === 118 ? 'bg-[#8a8179]' : 'bg-[#d97757] animate-pulse'}`} />
            {visibleSet.size === 118 ? (
              <>
                <span className="font-semibold">118</span>
                <span>nguyên tố</span>
              </>
            ) : (
              <>
                <span className="font-bold tabular-nums">{visibleSet.size}</span>
                <span className="opacity-70">/ 118 nguyên tố</span>
              </>
            )}
          </span>
        </div>
      </div>

{/* ── Combined range slider + gradient legend (in color mode) ─── */}
      {displayMode === 'color' && (
        <div key="slider" className="pt-fade-up shrink-0 rounded-xl border border-gray-100 bg-white/95 px-4 py-3 shadow-sm backdrop-blur-sm transition-shadow hover:shadow-md" style={{ animationDelay: '140ms' }}>
          <QuickRangeSlider
            prop={colorMode}
            value={quickRange}
            onChange={onChangeQuickRange}
          />
        </div>
      )}

      {/* ── Table (fills remaining space) ─────────────────────── */}
      <div ref={tableWrapRef} className="pt-fade-up min-h-0 min-w-0 flex-1 overflow-auto" style={{ animationDelay: '180ms' }}>
        <div style={{ width: tableW }} className="mx-auto flex shrink-0 flex-col" >

          {/* Group numbers 1–18 */}
          <div style={{ ...makeGridStyle(1), gridTemplateRows: '18px' }}>
            {Array.from({ length: 18 }, (_, i) => i + 1).map(g => (
              <div key={g} style={{ gridColumn: g, gridRow: 1, height: 18 }} className="flex items-center justify-center font-mono text-gray-400" >
                <span style={{ fontSize: stubFont }}>{g}</span>
              </div>
            ))}
          </div>

          {/* Main table — periods 1–7 */}
          <div style={makeGridStyle(7)} className="mt-1">
            {/* Embedded legend in the empty area (rows 1–3, cols 3–12) — only when categorical */}
            {displayMode === 'group' && (groupMode === 'category' || groupMode === 'block' || groupMode === 'state' || groupMode === 'period') && (
              <div
                style={{ gridColumn: '3 / 13', gridRow: '1 / 4' }}
                className="pt-fade-in"
              >
                <EmbeddedLegend
                  groupMode={groupMode}
                  hoveredKey={hoveredLegendKey}
                  onHoverKey={setHoveredLegendKey}
                />
              </div>
            )}

            {/* La-Lu placeholder (row 6, col 3) — non-interactive */}
            <div style={cellStyle(3, 6)} aria-hidden className="pointer-events-none select-none">
              <div className={`${stubBase} border-gray-200 bg-gray-100 text-gray-400`} style={{ fontSize: stubFont }}>
                <span className="font-bold">57–71</span>
                <span className="opacity-70">La–Lu</span>
              </div>
            </div>
            {/* Ac-Lr placeholder (row 7, col 3) — non-interactive */}
            <div style={cellStyle(3, 7)} aria-hidden className="pointer-events-none select-none">
              <div className={`${stubBase} border-gray-200 bg-gray-100 text-gray-400`} style={{ fontSize: stubFont }}>
                <span className="font-bold">89–103</span>
                <span className="opacity-70">Ac–Lr</span>
              </div>
            </div>
            {/* All main elements */}
            {MAIN_ELEMENTS.map((el, i) => {
              const { bg, border } = getColors(el);
              return (
                <div
                  key={el.atomicNumber}
                  className="pt-cell-pop"
                  style={{ ...cellStyle(el.gridCol, el.gridRow), ['--i' as string]: i }}
                >
                  <ElementCard
                    element={el}
                    isVisible={isElementVisible(el)}
                    isSelected={selectedElement?.atomicNumber === el.atomicNumber}
                    color={bg}
                    borderColor={border}
                    onClick={onSelectElement}
                  />
                </div>
              );
            })}
          </div>

          {/* Separator */}
          <div className="flex items-center gap-3 py-1" style={{ height: 24 }}>
            <div style={{ width: 2 * cell + gap }} className="shrink-0" />
            <div className="h-px flex-1 border-t border-dashed border-gray-300" />
            <span className="shrink-0 text-[8px] uppercase tracking-widest text-gray-400">
              Lanthanides · Actinides
            </span>
            <div className="h-px flex-1 border-t border-dashed border-gray-300" />
          </div>

          {/* F-block */}
          <div style={makeGridStyle(2)}>
            {F_ELEMENTS.map((el, i) => {
              const { bg, border } = getColors(el);
              const fRow = el.gridRow - 8;
              return (
                <div
                  key={el.atomicNumber}
                  className="pt-cell-pop"
                  style={{ ...cellStyle(el.gridCol, fRow), ['--i' as string]: i + MAIN_ELEMENTS.length }}
                >
                  <ElementCard
                    element={el}
                    isVisible={isElementVisible(el)}
                    isSelected={selectedElement?.atomicNumber === el.atomicNumber}
                    color={bg}
                    borderColor={border}
                    onClick={onSelectElement}
                  />
                </div>
              );
            })}
          </div>

        </div>
      </div>
    </div>
  );
}
