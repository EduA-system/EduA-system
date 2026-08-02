"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const MONTH_SHORT_LABELS = [
  "Th 1", "Th 2", "Th 3", "Th 4", "Th 5", "Th 6",
  "Th 7", "Th 8", "Th 9", "Th 10", "Th 11", "Th 12",
];
const POPOVER_WIDTH = 256;

type MonthPickerProps = {
  year: number;
  month: number;
  onChange: (year: number, month: number) => void;
  className?: string;
};

export function MonthPicker({ year, month, onChange, className = "" }: MonthPickerProps) {
  const [open, setOpen] = useState(false);
  const [cursorYear, setCursorYear] = useState(year);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (popoverRef.current?.contains(target)) return;
      setOpen(false);
    }
    function handleScrollOrResize() {
      setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("scroll", handleScrollOrResize, true);
    window.addEventListener("resize", handleScrollOrResize);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("scroll", handleScrollOrResize, true);
      window.removeEventListener("resize", handleScrollOrResize);
    };
  }, [open]);

  function toggleOpen() {
    if (!open) {
      setCursorYear(year);
      const rect = triggerRef.current?.getBoundingClientRect();
      if (rect) {
        const left = Math.max(8, Math.min(rect.left, window.innerWidth - POPOVER_WIDTH - 8));
        setPosition({ top: rect.bottom + 4, left });
      }
    }
    setOpen((o) => !o);
  }

  function pickMonth(m: number) {
    onChange(cursorYear, m);
    setOpen(false);
  }

  return (
    <>
      <button
        type="button"
        ref={triggerRef}
        onClick={toggleOpen}
        aria-label="Chọn tháng"
        className={`rounded-lg border bg-white px-3 py-1.5 text-sm font-semibold hover:bg-[#f5f1ec] ${className}`}
      >
        Tháng {month + 1}/{year}
      </button>
      {open && position
        ? createPortal(
            <div
              ref={popoverRef}
              style={{ position: "fixed", top: position.top, left: position.left, width: POPOVER_WIDTH }}
              className="z-[60] rounded-xl border bg-white p-3 shadow-lg"
            >
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setCursorYear((y) => y - 1)}
                  aria-label="Năm trước"
                  className="rounded-full px-2 py-1 hover:bg-[#f5f1ec]"
                >
                  ‹
                </button>
                <p className="text-sm font-semibold">{cursorYear}</p>
                <button
                  type="button"
                  onClick={() => setCursorYear((y) => y + 1)}
                  aria-label="Năm sau"
                  className="rounded-full px-2 py-1 hover:bg-[#f5f1ec]"
                >
                  ›
                </button>
              </div>
              <div className="mt-2 grid grid-cols-3 gap-1.5 text-sm">
                {MONTH_SHORT_LABELS.map((label, m) => {
                  const isSelected = cursorYear === year && m === month;
                  return (
                    <button
                      type="button"
                      key={label}
                      onClick={() => pickMonth(m)}
                      className={`rounded-lg py-1.5 hover:bg-[#f5f1ec] ${isSelected ? "bg-[#e8724a] text-white hover:bg-[#e8724a]" : ""}`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
