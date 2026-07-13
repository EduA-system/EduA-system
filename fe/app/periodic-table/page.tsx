"use client";

import { useCallback, useMemo, useState } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { ELEMENTS, applyFilters } from '@/components/periodic-table/data';
import { ElementDetailPanel } from '@/components/periodic-table/element-detail-panel';
import { FilterPanel } from '@/components/periodic-table/filter-panel';
import { PeriodicTable } from '@/components/periodic-table/periodic-table';
import {
  DEFAULT_FILTER_STATE,
  type ColorMode,
  type DisplayMode,
  type Element,
  type FilterState,
  type GroupMode,
} from '@/components/periodic-table/types';

function hasFilters(f: FilterState): boolean {
  return (
    f.meltingPoint !== null ||
    f.boilingPoint !== null ||
    f.density !== null ||
    f.electronegativity !== null ||
    f.ionizationEnergy !== null ||
    f.electronAffinity !== null ||
    f.vanDerWaalsRadius !== null ||
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
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [filters, setFilters] = useState<FilterState>(() => ({
    ...DEFAULT_FILTER_STATE,
    blocks: new Set(),
    states: new Set(),
    categories: new Set(),
  }));
  const [searchQuery, setSearchQuery] = useState('');
  const [quickRange, setQuickRange] = useState<[number, number] | null>(null);

  const visibleSet = useMemo(
    () => applyFilters(
      ELEMENTS,
      filters,
      searchQuery,
      quickRange ? { prop: colorMode, range: quickRange } : null,
    ),
    [filters, searchQuery, quickRange, colorMode],
  );

  const handleReset = useCallback(() => {
    setFilters({ ...DEFAULT_FILTER_STATE, blocks: new Set(), states: new Set(), categories: new Set() });
    setSearchQuery('');
    setQuickRange(null);
    setDisplayMode('group');
    setGroupMode('category');
  }, []);

  const handleSelectElement = useCallback((el: Element) => {
    setSelectedElement((prev) => (prev?.atomicNumber === el.atomicNumber ? null : el));
  }, []);

  const handleChangeColorMode = useCallback((mode: ColorMode) => {
    setColorMode((previous) => {
      if (previous !== mode) setQuickRange(null);
      return mode;
    });
  }, []);

  const activeFilters = hasFilters(filters);

  return (
    <main className="flex h-screen w-full overflow-hidden bg-[#f5f1ec] text-[#1f1f1f]">
      <Sidebar activeHref="/periodic-table" responsive mobileOpen={mobileSidebarOpen} />

      {mobileSidebarOpen && (
        <button
          type="button"
          aria-label="Đóng menu"
          onClick={() => setMobileSidebarOpen(false)}
          className="fixed inset-0 z-30 bg-[#1f1f1f]/25 md:hidden"
        />
      )}

      <section className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-[#f5f1ec]">
        <div className="pt-fade-up flex min-h-0 flex-1 overflow-hidden px-3 py-4 sm:px-5" style={{ animationDelay: '60ms' }}>
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
            searchQuery={searchQuery}
            onChangeSearchQuery={setSearchQuery}
            onOpenSidebar={() => setMobileSidebarOpen(true)}
          />
        </div>

        {filterOpen && (
          <FilterPanel
            filters={filters}
            onApply={(nextFilters) => { setFilters(nextFilters); setFilterOpen(false); }}
            onClose={() => setFilterOpen(false)}
          />
        )}
        <ElementDetailPanel element={selectedElement} onClose={() => setSelectedElement(null)} />
      </section>
    </main>
  );
}
