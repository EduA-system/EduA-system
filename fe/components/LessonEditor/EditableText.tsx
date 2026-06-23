"use client";

import { useEffect, useRef } from "react";

interface EditableTextProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
  onEnter?: () => void;
  onBackspaceEmpty?: () => void;
}

export function EditableText({
  value,
  onChange,
  placeholder = "Nhập nội dung...",
  className = "",
  autoFocus = false,
  onEnter,
  onBackspaceEmpty,
}: EditableTextProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isFocused = useRef(false);

  // Sync value → DOM only on mount and when value changes externally
  useEffect(() => {
    if (!isFocused.current && ref.current && ref.current.innerText !== value) {
      ref.current.innerText = value;
    }
  }, [value]);

  // Auto focus on mount if requested
  useEffect(() => {
    if (autoFocus && ref.current) {
      ref.current.focus();
      // Move cursor to end
      const range = document.createRange();
      range.selectNodeContents(ref.current);
      range.collapse(false);
      window.getSelection()?.removeAllRanges();
      window.getSelection()?.addRange(range);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      data-placeholder={placeholder}
      className={`outline-none ${className}`}
      style={
        {
          "--placeholder-color": "#b0a8a0",
        } as React.CSSProperties
      }
      onFocus={() => {
        isFocused.current = true;
      }}
      onBlur={(e) => {
        isFocused.current = false;
        const text = e.currentTarget.innerText.trim();
        onChange(text);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          onEnter?.();
        }
        if (e.key === "Backspace" && ref.current?.innerText === "") {
          e.preventDefault();
          onBackspaceEmpty?.();
        }
      }}
    />
  );
}
