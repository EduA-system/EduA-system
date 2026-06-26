"use client";

// Textarea đè lên element text để sửa nội dung inline (double-click để vào).
// Đặt trong cùng hệ toạ độ canvas (đã scale ở container cha) nên dùng toạ độ gốc của element.
// Bọc trong container căn giữa theo chiều dọc + textarea tự co cao theo nội dung để
// text không bị "nhảy" lên sát mép trên so với lúc hiển thị (ElementView căn giữa).

import { useLayoutEffect, useRef } from "react";
import type { TextElement } from "./types";

export function InlineTextEditor({
  el,
  onChange,
  onCommit,
}: {
  el: TextElement;
  onChange: (text: string) => void;
  onCommit: () => void;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const isList = el.listStyle === "bullet" || el.listStyle === "numbered";

  // Co chiều cao textarea theo nội dung để giữ căn giữa giống ElementView.
  useLayoutEffect(() => {
    const ta = ref.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${ta.scrollHeight}px`;
  }, [el.text, el.fontSize, el.w, el.lineHeight, el.fontFamily, el.letterSpacing]);

  return (
    <div
      onMouseDown={(e) => e.stopPropagation()}
      style={{
        position: "absolute",
        left: el.x,
        top: el.y,
        width: el.w,
        height: el.h,
        transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined,
        transformOrigin: "center center",
        zIndex: el.zIndex + 1,
        display: "flex",
        alignItems: isList ? "flex-start" : "center",
        justifyContent:
          el.align === "center" ? "center" : el.align === "right" ? "flex-end" : "flex-start",
        border: "2px solid #3b82f6",
        boxSizing: "border-box",
        overflow: "hidden",
      }}
    >
      <textarea
        ref={ref}
        autoFocus
        rows={1}
        value={el.text}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onCommit}
        onKeyDown={(e) => {
          if (e.key === "Escape") onCommit();
          e.stopPropagation();
        }}
        style={{
          display: "block",
          width: "100%",
          resize: "none",
          border: "none",
          outline: "none",
          background: "transparent",
          padding: 0,
          margin: 0,
          fontSize: el.fontSize,
          fontWeight: el.bold ? 700 : 400,
          fontStyle: el.italic ? "italic" : "normal",
          fontFamily: el.fontFamily ?? "inherit",
          color: el.color,
          textAlign: el.align,
          lineHeight: el.lineHeight ?? 1.2,
          letterSpacing: el.letterSpacing != null ? `${el.letterSpacing}px` : undefined,
          overflow: "hidden",
        }}
      />
    </div>
  );
}
