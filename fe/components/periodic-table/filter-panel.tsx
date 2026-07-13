"use client";

import { useEffect, useRef, useState } from 'react';
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
  };
}

const GLOBAL = computeGlobalRanges();

interface DualRangeProps {
  label: string;
  unit: string;
  globalMin: number;
  globalMax: number;
  value: [number, number] | null;
  onChange: (v: [number, number] | null) => void;
}

function DualRange({ label, unit, globalMin, globalMax, value, onChange }: DualRangeProps) {
  const cur: [number, number] = value ?? [globalMin, globalMax];
  const enabled = value !== null;

  const handleMin = (v: number) => onChange([Math.min(v, cur[1]), cur[1]]);
  const handleMax = (v: number) => onChange([cur[0], Math.max(v, cur[0])]);
  const toggleEnabled = () => onChange(enabled ? null : [globalMin, globalMax]);

  const pctMin = ((cur[0] - globalMin) / (globalMax - globalMin)) * 100;
  const pctMax = ((cur[1] - globalMin) / (globalMax - globalMin)) * 100;

  const fmt = (v: number) =>
    Math.abs(globalMax - globalMin) > 100 ? v.toFixed(0) : v.toFixed(2);

  return (
    <div
      className={`group relative space-y-2.5 rounded-xl border p-3.5 transition-all ${
        enabled
          ? 'border-purple-300 bg-gradient-to-br from-purple-50/80 to-fuchsia-50/50 shadow-sm'
          : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50/60'
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
            enabled ? 'bg-purple-500' : 'bg-gray-300'
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
          <div className="relative h-1.5 rounded-full bg-gray-200">
            <div
              className="absolute h-1.5 rounded-full bg-gradient-to-r from-purple-400 to-fuchsia-400"
              style={{ left: `${pctMin}%`, right: `${100 - pctMax}%` }}
            />
          </div>
          <div className="relative -mt-2">
            <input
              type="range"
              min={globalMin}
              max={globalMax}
              step={(globalMax - globalMin) / 200}
              value={cur[0]}
              onChange={e => handleMin(Number(e.target.value))}
              className="absolute inset-0 w-full cursor-pointer appearance-none bg-transparent opacity-0"
            />
            <input
              type="range"
              min={globalMin}
              max={globalMax}
              step={(globalMax - globalMin) / 200}
              value={cur[1]}
              onChange={e => handleMax(Number(e.target.value))}
              className="w-full cursor-pointer appearance-none bg-transparent"
              style={{ accentColor: '#7c3aed' }}
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 pt-fade-in">
      <div
        ref={panelRef}
        className="filter-panel-enter w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/5"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 bg-gradient-to-r from-white to-purple-50/50 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-fuchsia-600 shadow-md shadow-purple-500/30">
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
              globalMin={GLOBAL.meltingPoint.min} globalMax={GLOBAL.meltingPoint.max}
              value={local.meltingPoint}
              onChange={v => setLocal(p => ({ ...p, meltingPoint: v }))}
            />
            <DualRange
              label="Điểm sôi" unit="°C"
              globalMin={GLOBAL.boilingPoint.min} globalMax={GLOBAL.boilingPoint.max}
              value={local.boilingPoint}
              onChange={v => setLocal(p => ({ ...p, boilingPoint: v }))}
            />
            <DualRange
              label="Khối lượng riêng" unit="g/cm³"
              globalMin={GLOBAL.density.min} globalMax={GLOBAL.density.max}
              value={local.density}
              onChange={v => setLocal(p => ({ ...p, density: v }))}
            />
            <DualRange
              label="Độ âm điện" unit=""
              globalMin={GLOBAL.electronegativity.min} globalMax={GLOBAL.electronegativity.max}
              value={local.electronegativity}
              onChange={v => setLocal(p => ({ ...p, electronegativity: v }))}
            />
            <DualRange
              label="Năng lượng ion hóa" unit="kJ/mol"
              globalMin={GLOBAL.ionizationEnergy.min} globalMax={GLOBAL.ionizationEnergy.max}
              value={local.ionizationEnergy}
              onChange={v => setLocal(p => ({ ...p, ionizationEnergy: v }))}
            />
            <DualRange
              label="Ái lực electron" unit="kJ/mol"
              globalMin={GLOBAL.electronAffinity.min} globalMax={GLOBAL.electronAffinity.max}
              value={local.electronAffinity}
              onChange={v => setLocal(p => ({ ...p, electronAffinity: v }))}
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
                  <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-semibold text-purple-700">
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
                          ? 'border-purple-300 bg-purple-50 shadow-sm'
                          : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <span
                        className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border-2 transition-all ${
                          checked ? 'border-purple-500 bg-purple-500' : 'border-gray-300 bg-white'
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
                  <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-semibold text-purple-700">
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
                          ? 'border-purple-300 bg-purple-50 shadow-sm'
                          : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
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
                  <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-semibold text-purple-700">
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
                          ? 'border-purple-300 bg-purple-50 shadow-sm'
                          : 'border-transparent hover:border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <span
                        className="inline-block h-4 w-4 shrink-0 rounded border shadow-sm"
                        style={{ backgroundColor: meta.bg, borderColor: meta.border }}
                      />
                      <span className="text-sm text-gray-800 flex-1">{meta.label}</span>
                      {checked && (
                        <svg className="h-4 w-4 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
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
        <div className="flex items-center justify-between gap-3 border-t border-gray-100 bg-gray-50/50 px-6 py-3.5">
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
              className="pt-lift inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-purple-600 to-fuchsia-600 px-5 py-2 text-sm font-semibold text-white shadow-md shadow-purple-500/30 hover:shadow-lg hover:shadow-purple-500/40"
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
