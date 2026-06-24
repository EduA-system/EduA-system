import type { CSSProperties } from "react";
import type { SlideElement } from "./types";

// Render 1 element theo type bằng absolute position. Read-only ở Bước 1.

export function ElementView({ el }: { el: SlideElement }) {
  const base: CSSProperties = {
    position: "absolute",
    left: el.x,
    top: el.y,
    width: el.w,
    height: el.h,
    transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined,
    opacity: el.opacity,
    zIndex: el.zIndex,
  };

  if (el.type === "text") {
    return (
      <div
        style={{
          ...base,
          display: "flex",
          alignItems: "center",
          justifyContent:
            el.align === "center"
              ? "center"
              : el.align === "right"
                ? "flex-end"
                : "flex-start",
          textAlign: el.align,
          fontSize: el.fontSize,
          fontWeight: el.bold ? 700 : 400,
          fontStyle: el.italic ? "italic" : "normal",
          color: el.color,
          lineHeight: 1.2,
          whiteSpace: "pre-wrap",
          overflow: "hidden",
        }}
      >
        {el.text}
      </div>
    );
  }

  if (el.type === "shape") {
    return (
      <div
        style={{
          ...base,
          background: el.fill,
          border: el.strokeW ? `${el.strokeW}px solid ${el.stroke}` : undefined,
          borderRadius: el.shape === "ellipse" ? "50%" : el.borderRadius,
        }}
      />
    );
  }

  // image
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={el.src}
      alt=""
      style={{
        ...base,
        objectFit: el.fit,
        borderRadius: el.borderRadius,
      }}
    />
  );
}
