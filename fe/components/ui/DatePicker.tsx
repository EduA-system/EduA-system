"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const WEEKDAY_LABELS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
const MONTH_LABELS = [
  "Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6",
  "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12",
];
const MINUTE_STEP = 5;
const POPOVER_WIDTH = 288;

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function parseDatePart(value: string): { year: number; month: number; day: number } | null {
  const datePart = value.split("T")[0];
  if (!datePart) return null;
  const [year, month, day] = datePart.split("-").map(Number);
  if (!year || !month || !day) return null;
  return { year, month: month - 1, day };
}

function parseTimePart(value: string): { hour: number; minute: number } {
  const timePart = value.split("T")[1];
  if (!timePart) return { hour: 0, minute: 0 };
  const [hour, minute] = timePart.split(":").map(Number);
  return { hour: hour || 0, minute: minute || 0 };
}

function formatDateOnly(year: number, month: number, day: number): string {
  return `${year}-${pad2(month + 1)}-${pad2(day)}`;
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function mondayStartWeekday(year: number, month: number): number {
  return (new Date(year, month, 1).getDay() + 6) % 7;
}

type DatePickerProps = {
  value: string;
  onChange: (value: string) => void;
  withTime?: boolean;
  placeholder?: string;
  className?: string;
};

export function DatePicker({ value, onChange, withTime = false, placeholder = "Chọn ngày", className = "" }: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const parsedDate = parseDatePart(value);
  const parsedTime = parseTimePart(value);
  const today = new Date();
  const [cursor, setCursor] = useState({
    year: parsedDate?.year ?? today.getFullYear(),
    month: parsedDate?.month ?? today.getMonth(),
  });

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
      if (parsedDate) setCursor({ year: parsedDate.year, month: parsedDate.month });
      const rect = triggerRef.current?.getBoundingClientRect();
      if (rect) {
        const left = Math.max(8, Math.min(rect.left, window.innerWidth - POPOVER_WIDTH - 8));
        setPosition({ top: rect.bottom + 4, left });
      }
    }
    setOpen((o) => !o);
  }

  function goToPrevMonth() {
    setCursor((c) => (c.month === 0 ? { year: c.year - 1, month: 11 } : { year: c.year, month: c.month - 1 }));
  }

  function goToNextMonth() {
    setCursor((c) => (c.month === 11 ? { year: c.year + 1, month: 0 } : { year: c.year, month: c.month + 1 }));
  }

  function pickDay(day: number) {
    const datePart = formatDateOnly(cursor.year, cursor.month, day);
    if (withTime) {
      onChange(`${datePart}T${pad2(parsedTime.hour)}:${pad2(parsedTime.minute)}`);
    } else {
      onChange(datePart);
      setOpen(false);
    }
  }

  function setTime(hour: number, minute: number) {
    if (!parsedDate) return;
    onChange(`${formatDateOnly(parsedDate.year, parsedDate.month, parsedDate.day)}T${pad2(hour)}:${pad2(minute)}`);
  }

  const leadingBlanks = mondayStartWeekday(cursor.year, cursor.month);
  const totalDays = daysInMonth(cursor.year, cursor.month);
  const cells: (number | null)[] = [...Array(leadingBlanks).fill(null), ...Array.from({ length: totalDays }, (_, i) => i + 1)];

  const displayLabel = parsedDate
    ? withTime
      ? `${pad2(parsedDate.day)}/${pad2(parsedDate.month + 1)}/${parsedDate.year} ${pad2(parsedTime.hour)}:${pad2(parsedTime.minute)}`
      : `${pad2(parsedDate.day)}/${pad2(parsedDate.month + 1)}/${parsedDate.year}`
    : placeholder;

  return (
    <>
      <button
        type="button"
        ref={triggerRef}
        onClick={toggleOpen}
        className={`w-full rounded-xl border p-2 text-left text-sm ${parsedDate ? "" : "text-[#8a8178]"} ${className}`}
      >
        {displayLabel}
      </button>
      {open && position
        ? createPortal(
            <div
              ref={popoverRef}
              style={{ position: "fixed", top: position.top, left: position.left, width: POPOVER_WIDTH }}
              className="z-[60] rounded-xl border bg-white p-3 shadow-lg"
            >
              <div className="flex items-center justify-between">
                <button type="button" onClick={goToPrevMonth} aria-label="Tháng trước" className="rounded-full px-2 py-1 hover:bg-[#f5f1ec]">
                  ‹
                </button>
                <p className="text-sm font-semibold">
                  {MONTH_LABELS[cursor.month]}, {cursor.year}
                </p>
                <button type="button" onClick={goToNextMonth} aria-label="Tháng sau" className="rounded-full px-2 py-1 hover:bg-[#f5f1ec]">
                  ›
                </button>
              </div>
              <div className="mt-2 grid grid-cols-7 gap-1 text-center text-xs text-[#8a8178]">
                {WEEKDAY_LABELS.map((w) => (
                  <span key={w}>{w}</span>
                ))}
              </div>
              <div className="mt-1 grid grid-cols-7 gap-1 text-center text-sm">
                {cells.map((day, i) => {
                  if (day === null) return <span key={`b${i}`} />;
                  const isSelected =
                    parsedDate && parsedDate.year === cursor.year && parsedDate.month === cursor.month && parsedDate.day === day;
                  return (
                    <button
                      type="button"
                      key={day}
                      onClick={() => pickDay(day)}
                      className={`rounded-lg py-1 hover:bg-[#f5f1ec] ${isSelected ? "bg-[#e8724a] text-white hover:bg-[#e8724a]" : ""}`}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
              {withTime ? (
                <div className="mt-3 flex items-center justify-between gap-2 border-t pt-3">
                  <div className="flex items-center gap-1.5 text-sm">
                    <span className="text-xs text-[#6b6b6b]">Giờ</span>
                    <select
                      value={parsedTime.hour}
                      disabled={!parsedDate}
                      onChange={(e) => setTime(Number(e.target.value), parsedTime.minute)}
                      className="rounded-lg border p-1 text-sm disabled:opacity-50"
                    >
                      {Array.from({ length: 24 }, (_, h) => (
                        <option key={h} value={h}>
                          {pad2(h)}
                        </option>
                      ))}
                    </select>
                    <span className="text-xs text-[#6b6b6b]">Phút</span>
                    <select
                      value={parsedTime.minute}
                      disabled={!parsedDate}
                      onChange={(e) => setTime(parsedTime.hour, Number(e.target.value))}
                      className="rounded-lg border p-1 text-sm disabled:opacity-50"
                    >
                      {Array.from({ length: 60 / MINUTE_STEP }, (_, i) => i * MINUTE_STEP).map((m) => (
                        <option key={m} value={m}>
                          {pad2(m)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button type="button" onClick={() => setOpen(false)} className="rounded-lg bg-[#e8724a] px-3 py-1 text-xs text-white">
                    Xong
                  </button>
                </div>
              ) : null}
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
