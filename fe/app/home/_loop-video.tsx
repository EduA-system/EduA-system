"use client";

import type { CSSProperties } from "react";

export function LoopVideo({ src, style }: { src: string; style: CSSProperties }) {
  return (
    <video
      src={src}
      autoPlay
      muted
      loop
      playsInline
      style={{ ...style, objectFit: "cover"}}
    />
  );
}
