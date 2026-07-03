"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ToolBtn } from "./ui";

type PopoverChildren = ReactNode | ((api: { close: () => void }) => ReactNode);

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(value, max));
}

export function Popover({
  triggerContent,
  active = false,
  title,
  width = 220,
  estHeight = 200,
  closeOnSelect = false,
  highlightWhenOpen = true,
  children,
}: {
  triggerContent: ReactNode;
  active?: boolean;
  title?: string;
  width?: number;
  estHeight?: number;
  closeOnSelect?: boolean;
  highlightWhenOpen?: boolean;
  children: PopoverChildren;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const popRef = useRef<HTMLDivElement>(null);

  const updatePosition = useCallback(() => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const margin = 8;
    const popHeight = Math.min(estHeight, Math.max(120, window.innerHeight - margin * 2));
    const spaceBelow = window.innerHeight - rect.bottom;
    const rawTop = spaceBelow >= popHeight + margin ? rect.bottom + 6 : rect.top - popHeight - 6;
    const maxTop = Math.max(margin, window.innerHeight - popHeight - margin);
    const top = clamp(rawTop, margin, maxTop);

    const safeWidth = Math.min(width, window.innerWidth - margin * 2);
    const mid = rect.left + rect.width / 2;
    const left = clamp(mid - safeWidth / 2, margin, Math.max(margin, window.innerWidth - safeWidth - margin));

    setPos({ top, left });
  }, [estHeight, width]);

  const close = () => setOpen(false);

  const toggle = () => {
    if (open) {
      setOpen(false);
      return;
    }
    updatePosition();
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;

    const onDown = (e: MouseEvent) => {
      if (popRef.current?.contains(e.target as Node)) return;
      if (triggerRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };

    const onReposition = () => updatePosition();

    document.addEventListener("mousedown", onDown);
    window.addEventListener("resize", onReposition);
    window.addEventListener("scroll", onReposition, true);

    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("resize", onReposition);
      window.removeEventListener("scroll", onReposition, true);
    };
  }, [open, updatePosition]);

  return (
    <div ref={triggerRef} className="inline-flex shrink-0">
      <ToolBtn active={active || (highlightWhenOpen && open)} onClick={toggle} title={title}>
        {triggerContent}
      </ToolBtn>
      {open && (
        <div
          ref={popRef}
          className="fixed z-[9999] flex flex-col gap-1.5 overflow-x-hidden overflow-y-auto rounded-[16px] border border-[#e8e2d9] bg-white p-1.5 shadow-[0_12px_32px_rgba(43,41,38,0.16),0_2px_8px_rgba(43,41,38,0.08)]"
          style={{
            top: pos.top,
            left: pos.left,
            width: Math.min(width, typeof window === "undefined" ? width : window.innerWidth - 16),
            maxHeight: "calc(100vh - 16px)",
          }}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={closeOnSelect ? () => setOpen(false) : undefined}
        >
          {typeof children === "function" ? children({ close }) : children}
        </div>
      )}
    </div>
  );
}
