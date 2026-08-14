"use client";

// Textarea đè lên element text để sửa nội dung inline (double-click để vào).
// Đặt trong cùng hệ toạ độ canvas (đã scale ở container cha) nên dùng toạ độ gốc của element.
// Bọc trong container căn giữa theo chiều dọc + textarea tự co cao theo nội dung để
// text không bị "nhảy" lên sát mép trên so với lúc hiển thị (ElementView căn giữa).

import { useLayoutEffect, useRef } from "react";
import type { TextElement } from "./types";
import { textBoxMinHeight } from "./lib/text-box";
import { normalizedLetterSpacing } from "./lib/text-spacing";

export function InlineTextEditor({
  el,
  onChange,
  onResizeHeight,
  onCommit,
}: {
  el: TextElement;
  onChange: (text: string) => void;
  onResizeHeight: (height: number) => void;
  onCommit: () => void;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const isList = el.listStyle === "bullet" || el.listStyle === "numbered";

  // Co chiều cao textarea theo nội dung để giữ căn giữa giống ElementView.
  useLayoutEffect(() => {
    const ta = ref.current;
    if (!ta) return;
    ta.style.height = "auto";
    const textHeight = Math.ceil(ta.scrollHeight);
    ta.style.height = `${textHeight}px`;

    const nextBoxHeight = textBoxMinHeight(el, el.w);
    if (nextBoxHeight > el.h + 1) onResizeHeight(nextBoxHeight);
  }, [el, onResizeHeight]);

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
        border: "2px solid #d97757",
        boxSizing: "border-box",
        overflow: "visible",
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
          padding: "4px 0",
          margin: 0,
          fontSize: el.fontSize,
          fontWeight: el.bold ? 700 : 400,
          fontStyle: el.italic ? "italic" : "normal",
          fontFamily: el.fontFamily ?? "inherit",
          color: el.color,
          textAlign: el.align,
          lineHeight: el.lineHeight ?? 1.2,
          letterSpacing: `${normalizedLetterSpacing(el.letterSpacing)}px`,
          overflow: "visible",
          boxSizing: "border-box",
        }}
      />
    </div>
  );
}
