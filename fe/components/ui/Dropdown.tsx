"use client";

import { useEffect, useRef, useState } from "react";
import { DashboardIcon } from "./DashboardIcon";

export interface DropdownOption {
  value: string;
  label: string;
}

/** Dropdown chọn-một, đóng khi click ra ngoài. Style bám SelectPill. */
export function Dropdown({
  placeholder,
  value,
  options,
  onChange,
  disabled = false,
}: {
  placeholder: string;
  value: string | null;
  options: DropdownOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const selected = options.find((option) => option.value === value);
  const isDisabled = disabled || options.length === 0;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        disabled={isDisabled}
        onClick={() => setOpen((current) => !current)}
        className={`flex h-[34px] items-center gap-2 rounded-lg border border-[#d8d1c9] px-3 text-[12px] font-medium transition ${
          isDisabled
            ? "cursor-not-allowed bg-[#f3efe9] text-[#b8b0a6]"
            : "bg-[#faf9f7] text-[#1f1f1f] hover:border-[#c9bfb2]"
        }`}
      >
        <span className={selected ? "" : "text-[#6b6b6b]"}>
          {selected ? selected.label : placeholder}
        </span>
        <DashboardIcon name="chevronDown" className="size-3" />
      </button>

      {open && !isDisabled && (
        <div className="absolute z-50 mt-1 max-h-64 w-max min-w-full max-w-[320px] overflow-y-auto rounded-lg border border-[#d8d1c9] bg-white py-1 shadow-[0_8px_24px_rgba(43,41,38,0.12)]">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
              className={`block w-full px-3 py-2 text-left text-[12px] leading-[18px] transition hover:bg-[#f5f1ec] ${
                option.value === value ? "font-semibold text-[#d97757]" : "text-[#1f1f1f]"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
