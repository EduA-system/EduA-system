"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ELEMENTS } from "./data";
import { ElementCard } from "./element-card";
import { CATEGORY_COLORS, type Element } from "./types";

const MAIN_ELEMENTS = ELEMENTS.filter((element) => element.gridRow <= 7);
const F_ELEMENTS = ELEMENTS.filter((element) => element.gridRow >= 9);

export interface PeriodicTableGridProps {
  selectedAtomicNumber?: number | null;
  onSelectElement?: (element: Element) => void;
  className?: string;
  compact?: boolean;
}

export function PeriodicTableGrid({
  selectedAtomicNumber = null,
  onSelectElement = () => undefined,
  className = "",
  compact = false,
}: PeriodicTableGridProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const node = rootRef.current;
    if (!node) return;
    const measure = () => setSize({ width: node.clientWidth, height: node.clientHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const geometry = useMemo(() => {
    const gapRatio = 0.065;
    const maxCell = compact ? 54 : 68;
    const minCell = compact ? 30 : 42;
    const byWidth = Math.max(1, size.width - 10) / (18 + 17 * gapRatio);
    const byHeight = Math.max(1, size.height - 38) / (9 + 8 * gapRatio);
    const cell = Math.max(minCell, Math.min(maxCell, Math.floor(Math.min(byWidth, byHeight))));
    const gap = Math.max(2, Math.round(cell * gapRatio));
    return { cell, gap, width: cell * 18 + gap * 17 };
  }, [compact, size.height, size.width]);

  const gridStyle = (rows: number) => ({
    display: "grid",
    gridTemplateColumns: `repeat(18, ${geometry.cell}px)`,
    gridTemplateRows: `repeat(${rows}, ${geometry.cell}px)`,
    gap: `${geometry.gap}px`,
    width: geometry.width,
  });
  const cellStyle = (column: number, row: number) => ({
    gridColumn: column,
    gridRow: row,
    width: geometry.cell,
    height: geometry.cell,
  });

  return (
    <div ref={rootRef} className={`min-h-0 min-w-0 overflow-auto ${className}`}>
      <div className="mx-auto flex w-max flex-col pb-2" style={{ minWidth: geometry.width }}>
        <div style={{ ...gridStyle(1), gridTemplateRows: "16px" }}>
          {Array.from({ length: 18 }, (_, index) => index + 1).map((group) => <span key={group} style={{ gridColumn: group }} className="text-center font-mono text-[7px] text-[#8a8178]">{group}</span>)}
        </div>
        <div style={gridStyle(7)} className="mt-1">
          <div style={cellStyle(3, 6)} className="grid place-items-center rounded-lg border border-dashed border-[#d8d1c9] bg-[#f5f1ec] text-[7px] text-[#8a8178]">57–71</div>
          <div style={cellStyle(3, 7)} className="grid place-items-center rounded-lg border border-dashed border-[#d8d1c9] bg-[#f5f1ec] text-[7px] text-[#8a8178]">89–103</div>
          {MAIN_ELEMENTS.map((element, index) => {
            const colors = CATEGORY_COLORS[element.category];
            return <div key={element.atomicNumber} style={{ ...cellStyle(element.gridCol, element.gridRow), ["--i" as string]: index }} className="pt-cell-pop"><ElementCard compact={compact} element={element} isVisible isSelected={selectedAtomicNumber === element.atomicNumber} color={colors.bg} borderColor={colors.border} onClick={onSelectElement} /></div>;
          })}
        </div>
        <div className="my-1 flex h-5 items-center gap-3 text-[7px] tracking-[0.12em] text-[#8a8178] uppercase"><span className="h-px flex-1 border-t border-dashed border-[#d8d1c9]" />Lanthanide · Actinide<span className="h-px flex-1 border-t border-dashed border-[#d8d1c9]" /></div>
        <div style={gridStyle(2)}>
          {F_ELEMENTS.map((element, index) => {
            const colors = CATEGORY_COLORS[element.category];
            return <div key={element.atomicNumber} style={{ ...cellStyle(element.gridCol, element.gridRow - 8), ["--i" as string]: index + MAIN_ELEMENTS.length }} className="pt-cell-pop"><ElementCard compact={compact} element={element} isVisible isSelected={selectedAtomicNumber === element.atomicNumber} color={colors.bg} borderColor={colors.border} onClick={onSelectElement} /></div>;
          })}
        </div>
      </div>
    </div>
  );
}
