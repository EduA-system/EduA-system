"use client";

import { useState } from 'react';
import {
  CATEGORY_COLORS,
  BLOCK_COLORS,
  STATE_COLORS,
  PERIOD_COLORS,
  COLOR_MODE_LABELS,
  type DisplayMode,
  type GroupMode,
  type ColorMode,
  type ElementCategory,
  type ElementBlock,
  type ElementState,
} from './types';

type SwatchItem = { color: string; border: string; label: string; key: string };

function buildItems(groupMode: GroupMode): SwatchItem[] {
  if (groupMode === 'category') {
    return (Object.entries(CATEGORY_COLORS) as [ElementCategory, typeof CATEGORY_COLORS[ElementCategory]][]).map(
      ([k, v]) => ({ color: v.bg, border: v.border, label: v.label, key: k })
    );
  }
  if (groupMode === 'block') {
    return (Object.entries(BLOCK_COLORS) as [ElementBlock, typeof BLOCK_COLORS[ElementBlock]][]).map(
      ([k, v]) => ({ color: v.bg, border: v.border, label: v.label, key: k })
    );
  }
  if (groupMode === 'state') {
    return (Object.entries(STATE_COLORS) as [ElementState, typeof STATE_COLORS[ElementState]][]).map(
      ([k, v]) => ({ color: v.bg, border: v.border, label: v.label, key: k })
    );
  }
  if (groupMode === 'period') {
    return [1, 2, 3, 4, 5, 6, 7].map(p => ({
      color: PERIOD_COLORS[p].bg,
      border: PERIOD_COLORS[p].border,
      label: `Chu kỳ ${p}`,
      key: String(p),
    }));
  }
  return [];
}

interface EmbeddedLegendProps {
  groupMode: GroupMode;
  hoveredKey: string | null;
  onHoverKey: (key: string | null) => void;
}

/**
 * Inline legend for the empty area of the periodic table (rows 1–3, cols 3–12).
 * Used when the page is in group mode with a categorical groupMode.
 */
export function EmbeddedLegend({ groupMode, hoveredKey, onHoverKey }: EmbeddedLegendProps) {
  const [pinnedKey, setPinnedKey] = useState<string | null>(null);

  if (hoveredKey === null && pinnedKey !== null) setPinnedKey(null);

  const items = buildItems(groupMode);
  if (items.length === 0) return null;

  const activeKey = pinnedKey ?? hoveredKey;
  const hasActive = activeKey !== null;

  const handleEnter = (key: string) => { if (!pinnedKey) onHoverKey(key); };
  const handleLeave = ()             => { if (!pinnedKey) onHoverKey(null); };
  const handleClick = (key: string) => {
    if (pinnedKey === key) { setPinnedKey(null); onHoverKey(null); }
    else                   { setPinnedKey(key); onHoverKey(key); }
  };

  // Layout in a tidy 4-column grid so chips align in columns/rows.
  // (category: 11 → 4/4/3; block: 4 → 4; state: 4 → 4; period: 7 → 4/3)
  const cols = items.length >= 7 ? 4 : Math.min(items.length, 4);

  return (
    <div
      className="grid h-full w-full items-center justify-items-stretch content-center gap-x-2 gap-y-1.5 px-3 py-2"
      style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
    >
      {items.map(item => {
        const isActive = activeKey === item.key;
        const isPinned = pinnedKey === item.key;
        const isDimmed = hasActive && !isActive;
        return (
          <button
            key={item.key}
            onMouseEnter={() => handleEnter(item.key)}
            onMouseLeave={handleLeave}
            onClick={() => handleClick(item.key)}
            className={[
              'group relative flex w-full items-center gap-1.5 rounded-full bg-white/80 backdrop-blur-sm px-2.5 py-1 transition-all duration-200',
              'border border-transparent hover:border-gray-200 hover:bg-white hover:shadow-sm',
              isActive ? 'scale-105 shadow-md border-gray-200 bg-white' : '',
              isDimmed ? 'opacity-40' : '',
            ].join(' ')}
            style={isActive ? { outline: `2px solid ${item.border}`, outlineOffset: '2px' } : undefined}
            title={isPinned ? `Đã ghim: ${item.label}` : `Bấm để ghim: ${item.label}`}
          >
            <span
              className="inline-block h-3 w-3 shrink-0 rounded-full border shadow-sm transition-transform"
              style={{
                backgroundColor: item.color,
                borderColor: item.border,
                transform: isActive ? 'scale(1.15)' : undefined,
              }}
            />
            <span className={`truncate text-[11px] transition-colors ${isActive ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
              {item.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

interface LegendProps {
  displayMode: DisplayMode;
  groupMode: GroupMode;
  colorMode: ColorMode;
  heatmapMin: number;
  heatmapMax: number;
  hoveredKey: string | null;
  onHoverKey: (key: string | null) => void;
}

export function Legend({ displayMode, groupMode, colorMode, heatmapMin, heatmapMax, hoveredKey, onHoverKey }: LegendProps) {
  // Pin key persists across mouse-leave; hover only previews when nothing is pinned.
  // Declared at top to satisfy rules-of-hooks (no conditional hook calls).
  const [pinnedKey, setPinnedKey] = useState<string | null>(null);

  // Drop the pin if the parent has cleared its highlight (derive-in-render, no effect).
  if (hoveredKey === null && pinnedKey !== null) {
    setPinnedKey(null);
  }

  if (displayMode === 'color') {
    const meta = COLOR_MODE_LABELS[colorMode];
    const minLabel = Number.isFinite(heatmapMin) ? heatmapMin.toFixed(1) : '—';
    const maxLabel = Number.isFinite(heatmapMax) ? heatmapMax.toFixed(1) : '—';
    return (
      <div className="flex flex-wrap items-center gap-3 rounded-xl bg-white px-4 py-2.5 shadow-sm border border-gray-100">
        <span className="text-xs font-semibold text-gray-600 whitespace-nowrap">
          {meta.label}{meta.unit ? ` (${meta.unit})` : ''}
        </span>
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className="text-[10px] text-gray-500 whitespace-nowrap">{minLabel}</span>
          <div
            className="h-3 flex-1 min-w-[80px] rounded-full"
            style={{ background: 'linear-gradient(to right, hsl(240,80%,75%), hsl(60,90%,68%), hsl(0,90%,60%))' }}
          />
          <span className="text-[10px] text-gray-500 whitespace-nowrap">{maxLabel}</span>
        </div>
        <div className="flex items-center gap-2 text-[9px] text-gray-400">
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-full" style={{ background: 'hsl(240,80%,75%)' }} />
            Thấp
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-full" style={{ background: 'hsl(0,90%,60%)' }} />
            Cao
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-full bg-gray-200" />
            Không có dữ liệu
          </span>
        </div>
      </div>
    );
  }

  type SwatchItem = { color: string; border: string; label: string; key: string };
  let items: SwatchItem[] = [];

  if (groupMode === 'category') {
    items = (Object.entries(CATEGORY_COLORS) as [ElementCategory, typeof CATEGORY_COLORS[ElementCategory]][]).map(
      ([k, v]) => ({ color: v.bg, border: v.border, label: v.label, key: k })
    );
  } else if (groupMode === 'block') {
    items = (Object.entries(BLOCK_COLORS) as [ElementBlock, typeof BLOCK_COLORS[ElementBlock]][]).map(
      ([k, v]) => ({ color: v.bg, border: v.border, label: v.label, key: k })
    );
  } else if (groupMode === 'state') {
    items = (Object.entries(STATE_COLORS) as [ElementState, typeof STATE_COLORS[ElementState]][]).map(
      ([k, v]) => ({ color: v.bg, border: v.border, label: v.label, key: k })
    );
  } else {
    // period
    items = [1, 2, 3, 4, 5, 6, 7].map(p => ({
      color: PERIOD_COLORS[p].bg,
      border: PERIOD_COLORS[p].border,
      label: `Chu kỳ ${p}`,
      key: String(p),
    }));
  }

  const activeKey = pinnedKey ?? hoveredKey;
  const hasActive = activeKey !== null;

  const handleEnter = (key: string) => { if (!pinnedKey) onHoverKey(key); };
  const handleLeave = ()             => { if (!pinnedKey) onHoverKey(null); };
  const handleClick = (key: string) => {
    if (pinnedKey === key) {
      setPinnedKey(null);
      onHoverKey(null);
    } else {
      setPinnedKey(key);
      onHoverKey(key);
    }
  };
  const clearAll = () => { setPinnedKey(null); onHoverKey(null); };

  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 rounded-xl bg-white/95 backdrop-blur-sm px-4 py-2.5 shadow-sm border border-gray-100 transition-shadow hover:shadow-md">
      {items.map(item => {
        const isActive = activeKey === item.key;
        const isPinned = pinnedKey === item.key;
        const isDimmed = hasActive && !isActive;
        return (
          <button
            key={item.key}
            onMouseEnter={() => handleEnter(item.key)}
            onMouseLeave={handleLeave}
            onClick={() => handleClick(item.key)}
            className={[
              'relative flex items-center gap-1.5 rounded-lg px-2 py-1 transition-all duration-200',
              isActive
                ? 'scale-105 shadow-sm'
                : isDimmed
                  ? 'opacity-40'
                  : 'hover:bg-gray-50 hover:scale-105',
              isPinned ? 'bg-[#fff7f1]' : '',
            ].join(' ')}
            style={isActive ? { outline: `2px solid ${item.border}`, outlineOffset: '2px' } : undefined}
            title={isPinned ? `Đã ghim: ${item.label} (bấm lại để bỏ)` : `Bấm để ghim: ${item.label}`}
          >
            <span
              className="inline-block h-3.5 w-3.5 shrink-0 rounded-sm border transition-all duration-200"
              style={{
                backgroundColor: item.color,
                borderColor: item.border,
                transform: isActive ? 'scale(1.2)' : undefined,
              }}
            />
            <span className={`text-xs whitespace-nowrap transition-colors duration-200 ${isActive ? 'font-semibold text-gray-900' : 'text-gray-600'}`}>
              {item.label}
            </span>
          </button>
        );
      })}
      {hasActive && (
        <button
          onMouseDown={clearAll}
          className="ml-1 rounded-full px-2 py-0.5 text-[9px] text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
        >
          Bỏ lọc ×
        </button>
      )}
    </div>
  );
}
