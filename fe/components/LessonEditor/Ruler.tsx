"use client";

import { useRef } from "react";

const PAGE_WIDTH = 816;
const MIN_MARGIN = 32;
const MAX_MARGIN = 220;

interface RulerProps {
  margins: { left: number; right: number };
  onMarginsChange: (margins: { left: number; right: number }) => void;
  /**
   * Render only the ruler strip without its own sticky/background wrapper.
   * Use when the ruler is composed inside a shared sticky block (e.g. the
   * editor's toolbar+ruler header) so the parent handles stickiness.
   */
  bare?: boolean;
}

/**
 * Document margin ruler. Sticky by default; pass `bare` to embed it in a
 * shared sticky container.
 */
export function Ruler({ margins, onMarginsChange, bare = false }: RulerProps) {
  const rulerRef = useRef<HTMLDivElement>(null);
  const ticks = Array.from({ length: 17 }, (_, i) => i);

  const startDrag = (side: "left" | "right") => (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();

    const handleMove = (moveEvent: MouseEvent) => {
      const rect = rulerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const x = Math.min(Math.max(moveEvent.clientX - rect.left, MIN_MARGIN), rect.width - MIN_MARGIN);
      const scale = PAGE_WIDTH / rect.width;

      if (side === "left") {
        const nextLeft = Math.min(Math.max(Math.round(x * scale), MIN_MARGIN), MAX_MARGIN);
        onMarginsChange({ ...margins, left: nextLeft });
      } else {
        const nextRight = Math.min(Math.max(Math.round((rect.width - x) * scale), MIN_MARGIN), MAX_MARGIN);
        onMarginsChange({ ...margins, right: nextRight });
      }
    };

    const stopDrag = () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", stopDrag);
    };

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", stopDrag);
  };

  const leftHandle = `${(margins.left / PAGE_WIDTH) * 100}%`;
  const rightHandle = `${(margins.right / PAGE_WIDTH) * 100}%`;

  const strip = (
    <div
      ref={rulerRef}
      className="relative mx-auto flex h-7 w-full max-w-[816px] items-end px-3 text-[10px] text-[#b8afa5]"
    >
      <div className="flex w-full items-end">
        {ticks.map((i) => {
          const isFull = i % 2 === 0;
          return (
            <div key={i} className="relative flex-1 last:flex-none">
              <span
                className={`absolute bottom-0 left-0 w-px ${isFull ? "h-3 bg-[#b8afa5]" : "h-1.5 bg-[#d4ccc1]"}`}
                aria-hidden
              />
              {isFull ? <span className="absolute bottom-2.5 left-0.5 leading-none">{i / 2}</span> : null}
            </div>
          );
        })}
      </div>
      <RulerHandle side="left" position={leftHandle} onMouseDown={startDrag("left")} />
      <RulerHandle side="right" position={rightHandle} onMouseDown={startDrag("right")} />
    </div>
  );

  if (bare) return strip;

  return (
    <div className="sticky top-0 z-20 w-full bg-[#fbfaf8] shadow-[0_1px_2px_rgba(43,41,38,0.06)]">
      {strip}
    </div>
  );
}

function RulerHandle({
  side,
  position,
  onMouseDown,
}: {
  side: "left" | "right";
  position: string;
  onMouseDown: (event: React.MouseEvent<HTMLButtonElement>) => void;
}) {
  return (
    <button
      type="button"
      onMouseDown={onMouseDown}
      className={`absolute bottom-0 z-10 flex h-6 w-5 cursor-col-resize items-end justify-center text-[#8a8178] transition hover:text-[#d97757] ${side === "left" ? "-translate-x-1/2" : "translate-x-1/2"}`}
      style={side === "left" ? { left: position } : { right: position }}
      aria-label={`${side} margin`}
    >
      <span className="absolute bottom-0 h-3 w-px rounded-full bg-current" />
      <span className="absolute bottom-[11px] flex h-3.5 w-4 items-center justify-center rounded-[3px] bg-[#fbfaf8]">
        {side === "left" ? <IndentRightIcon /> : <IndentLeftIcon />}
      </span>
    </button>
  );
}

function IndentRightIcon() {
  return (
    <svg width="14" height="12" viewBox="0 0 14 12" fill="none" aria-hidden>
      <path d="M2 3.2h10M6 6h6M2 8.8h10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M2 5l2 1-2 1V5z" fill="currentColor" />
    </svg>
  );
}

function IndentLeftIcon() {
  return (
    <svg width="14" height="12" viewBox="0 0 14 12" fill="none" aria-hidden>
      <path d="M2 3.2h10M2 6h6M2 8.8h10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M12 5l-2 1 2 1V5z" fill="currentColor" />
    </svg>
  );
}
