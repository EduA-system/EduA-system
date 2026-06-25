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
  placeholder = "Nhap noi dung...",
  className = "",
  autoFocus = false,
  onEnter,
  onBackspaceEmpty,
}: EditableTextProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isFocused = useRef(false);

  useEffect(() => {
    if (!isFocused.current && ref.current && ref.current.innerText !== value) {
      ref.current.innerText = value;
    }
  }, [value]);

  useEffect(() => {
    if (autoFocus && ref.current) {
      ref.current.focus();
      const range = document.createRange();
      range.selectNodeContents(ref.current);
      range.collapse(false);
      window.getSelection()?.removeAllRanges();
      window.getSelection()?.addRange(range);
    }
  }, [autoFocus]);

  return (
    <div
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      data-placeholder={placeholder}
      className={`edua-editable outline-none ${className}`}
      onFocus={() => {
        isFocused.current = true;
      }}
      onBlur={(event) => {
        isFocused.current = false;
        const text = event.currentTarget.innerText.trim();
        onChange(text);
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter" && !event.shiftKey) {
          event.preventDefault();
          onEnter?.();
        }
        if (event.key === "Backspace" && ref.current?.innerText === "") {
          event.preventDefault();
          onBackspaceEmpty?.();
        }
      }}
    />
  );
}
