"use client";

import { useEffect, useRef, useState } from "react";
import { DashboardIcon } from "./DashboardIcon";

export interface DropdownOption {
  value: string;
  label: string;
}

/**
 * Dropdown chọn-một, đóng khi click ra ngoài. Style bám SelectPill.
 *
 * Danh sách option nằm lồng trong DOM ngay dưới nút bấm (không portal) — mở trong 1 modal có
 * `overflow-y-auto` thì danh sách dài vẫn "nằm trong" popup, người dùng cuộn popup xuống để thấy hết thay
 * vì dropdown tự nhảy lên trên hay tràn ra ngoài popup.
 *
 * Vấn đề còn lại của cách này: kéo thanh cuộn *của modal cha* để lộ phần dropdown còn bị che lại vô tình
 * bị tính là "click ra ngoài" (mousedown rơi vào phần tử modal, không phải vào chính dropdown) nên tự
 * đóng dropdown giữa chừng. `isScrollbarClick` nhận diện: nếu điểm mousedown nằm ngoài
 * `clientWidth`/`clientHeight` của phần tử đang có thanh cuộn thật (tức rơi vào rãnh scrollbar, không
 * phải nội dung), thì bỏ qua — không tính là click ra ngoài.
 */
function isScrollbarClick(event: MouseEvent): boolean {
  const target = event.target as HTMLElement | null;
  if (!target) return false;
  const hasVerticalScrollbar = target.scrollHeight > target.clientHeight;
  const hasHorizontalScrollbar = target.scrollWidth > target.clientWidth;
  if (hasVerticalScrollbar && event.offsetX >= target.clientWidth) return true;
  if (hasHorizontalScrollbar && event.offsetY >= target.clientHeight) return true;
  return false;
}

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
      if (ref.current && !ref.current.contains(event.target as Node) && !isScrollbarClick(event)) {
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
        className={`flex h-[34px] w-full items-center justify-between gap-2 rounded-lg border border-[#d8d1c9] px-3 text-[12px] font-medium transition ${
          isDisabled
            ? "cursor-not-allowed bg-[#f3efe9] text-[#b8b0a6]"
            : "bg-[#faf9f7] text-[#1f1f1f] hover:border-[#c9bfb2]"
        }`}
      >
        <span className={selected ? "" : "text-[#6b6b6b]"}>
          {selected ? selected.label : placeholder}
        </span>
        <DashboardIcon name="chevronDown" className="size-3 shrink-0" />
      </button>

      {open && !isDisabled && (
        <div className="absolute z-50 mt-1 max-h-64 w-max min-w-full max-w-[360px] overflow-y-auto rounded-lg border border-[#d8d1c9] bg-white py-1 shadow-[0_8px_24px_rgba(43,41,38,0.12)]">
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
