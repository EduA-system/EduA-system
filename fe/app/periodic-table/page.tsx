"use client";

import { useMemo, useState, useCallback } from 'react';
import { ELEMENTS, applyFilters } from '@/components/periodic-table/data';
import { PeriodicTable } from '@/components/periodic-table/periodic-table';
import { ElementDetailPanel } from '@/components/periodic-table/element-detail-panel';
import { FilterPanel } from '@/components/periodic-table/filter-panel';
import { DEFAULT_FILTER_STATE, type Element, type DisplayMode, type GroupMode, type ColorMode, type FilterState } from '@/components/periodic-table/types';

function hasFilters(f: FilterState): boolean {
  return (
    f.meltingPoint !== null ||
    f.boilingPoint !== null ||
    f.density !== null ||
    f.electronegativity !== null ||
    f.ionizationEnergy !== null ||
    f.electronAffinity !== null ||
    f.blocks.size > 0 ||
    f.states.size > 0 ||
    f.categories.size > 0
  );
}

export default function PeriodicTablePage() {
  const [displayMode, setDisplayMode] = useState<DisplayMode>('group');
  const [groupMode, setGroupMode] = useState<GroupMode>('category');
  const [colorMode, setColorMode] = useState<ColorMode>('meltingPoint');
  const [selectedElement, setSelectedElement] = useState<Element | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [filters, setFilters] = useState<FilterState>(() => ({
    ...DEFAULT_FILTER_STATE,
    blocks: new Set(),
    states: new Set(),
    categories: new Set(),
  }));
  const [searchQuery, setSearchQuery] = useState('');
  // Quick range filter — tied to current color-mode property; resets when colorMode changes.
  const [quickRange, setQuickRange] = useState<[number, number] | null>(null);

  const visibleSet = useMemo(
    () => applyFilters(
      ELEMENTS,
      filters,
      searchQuery,
      quickRange ? { prop: colorMode, range: quickRange } : null,
    ),
    [filters, searchQuery, quickRange, colorMode]
  );

  const handleReset = useCallback(() => {
    setFilters({ ...DEFAULT_FILTER_STATE, blocks: new Set(), states: new Set(), categories: new Set() });
    setSearchQuery('');
    setQuickRange(null);
    setDisplayMode('group');
    setGroupMode('category');
  }, []);

  const handleSelectElement = useCallback((el: Element) => {
    setSelectedElement(prev => prev?.atomicNumber === el.atomicNumber ? null : el);
  }, []);

  // Reset quick range when the slider's underlying property changes.
  const handleChangeColorMode = useCallback((m: ColorMode) => {
    setColorMode(prev => {
      if (prev !== m) setQuickRange(null);
      return m;
    });
  }, []);

  const activeFilters = hasFilters(filters);

  return (
    <div className="flex h-full flex-col overflow-hidden bg-gray-50">
      {/* Compact header */}
      <header className="pt-fade-up shrink-0 border-b border-gray-200/80 bg-white/85 backdrop-blur-md px-5 py-2.5">
        <div className="flex items-center gap-3">
          {/* Logo + name (smaller, single-line) */}
          <div className="flex items-center gap-2 shrink-0 group cursor-default">
            <div className="relative flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 via-purple-600 to-fuchsia-600 shadow-md shadow-purple-500/30 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6">
              <svg viewBox="0 0 24 24" className="h-4.5 w-4.5 text-white drop-shadow-sm" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="12" cy="12" r="3" />
                <ellipse cx="12" cy="12" rx="10" ry="4" />
                <ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(60 12 12)" />
                <ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(120 12 12)" />
              </svg>
            </div>
            <div className="leading-tight">
              <div className="text-sm font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">Element Explorer</div>
              <div className="hidden md:block text-[10px] text-gray-400">Bảng tuần hoàn tương tác</div>
            </div>
          </div>

          {/* Search — right-aligned, compact */}
          <div className="relative ml-auto w-full max-w-xs group">
            <svg className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400 transition-colors group-focus-within:text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Tìm nguyên tố, ký hiệu, số nguyên tử"
              className="pt-search w-full rounded-full border border-transparent bg-gray-100 py-2 pl-9 pr-3 text-xs text-gray-700 placeholder:text-gray-400
                focus:bg-white focus:border-purple-200 focus:outline-none transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 transition-colors hover:rotate-90 duration-200"
              >
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Fill-screen content */}
      <div className="pt-fade-up flex-1 min-h-0 overflow-hidden px-4 py-3" style={{ animationDelay: '60ms' }}>
        <PeriodicTable
          visibleSet={visibleSet}
          selectedElement={selectedElement}
          displayMode={displayMode}
          groupMode={groupMode}
          colorMode={colorMode}
          onSelectElement={handleSelectElement}
          onOpenFilter={() => setFilterOpen(true)}
          onReset={handleReset}
          onChangeDisplayMode={setDisplayMode}
          onChangeGroupMode={setGroupMode}
          onChangeColorMode={handleChangeColorMode}
          quickRange={quickRange}
          onChangeQuickRange={setQuickRange}
          hasActiveFilters={activeFilters || !!searchQuery || quickRange !== null}
        />
      </div>

      {/* Overlays */}
      {filterOpen && (
        <FilterPanel
          filters={filters}
          onApply={f => { setFilters(f); setFilterOpen(false); }}
          onClose={() => setFilterOpen(false)}
        />
      )}
      <ElementDetailPanel
        element={selectedElement}
        onClose={() => setSelectedElement(null)}
      />
    </div>
  );
}
