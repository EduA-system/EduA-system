"use client";

// Popover dùng chung cho toolbar: nút ToolBtn mở 1 flyout định vị `fixed`.
// Phải dùng `fixed` (không phải absolute) vì thanh toolbar có overflow-x-auto
// sẽ cắt mất dropdown. Vị trí tính từ getBoundingClientRect (ưu tiên dưới,
// fallback lên trên). Click ra ngoài → đóng. Mô phỏng ColorPicker.tsx.

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ToolBtn } from "./ui";

export function Popover({
  triggerContent,
  active = false,
  title,
  width = 220,
  estHeight = 200,
  closeOnSelect = false,
  children,
}: {
  triggerContent: ReactNode;
  active?: boolean;
  title?: string;
  width?: number;
  estHeight?: number;
  // đóng popover sau khi click vào nội dung (dùng cho menu chọn 1 mục).
  closeOnSelect?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const popRef = useRef<HTMLDivElement>(null);

  const toggle = () => {
    if (open) {
      setOpen(false);
      return;
    }
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const spaceBelow = window.innerHeight - rect.bottom;
    const top = spaceBelow > estHeight + 8 ? rect.bottom + 4 : rect.top - estHeight - 4;
    const mid = rect.left + rect.width / 2;
    const left = Math.max(8, Math.min(mid - width / 2, window.innerWidth - width - 8));
    setPos({ top, left });
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (popRef.current?.contains(e.target as Node)) return;
      if (triggerRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  return (
    <div ref={triggerRef} className="inline-flex shrink-0">
      <ToolBtn active={open || active} onClick={toggle} title={title}>
        {triggerContent}
      </ToolBtn>
      {open && (
        <div
          ref={popRef}
          className="fixed z-[9999] flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-2 shadow-2xl"
          style={{ top: pos.top, left: pos.left, width }}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={closeOnSelect ? () => setOpen(false) : undefined}
        >
          {children}
        </div>
      )}
    </div>
  );
}
