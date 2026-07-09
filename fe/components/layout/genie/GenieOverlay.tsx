"use client";

import { useEffect, useRef, type RefObject } from "react";
import { createPortal } from "react-dom";
import type { GenieRect } from "./geniePhysics";

export interface GenieStrip {
  canvas: HTMLCanvasElement;
  offsetY: number;
  height: number;
}

interface GenieOverlayProps {
  sidebarRect: GenieRect;
  strips: GenieStrip[];
  stripRefs: RefObject<(HTMLDivElement | null)[]>;
}

/**
 * Presentational overlay only: renders one absolutely-positioned div per
 * strip (each holding a pre-cropped canvas snapshot) at its resting
 * position. `useGenieSidebarCollapse` drives the actual warp by writing
 * `transform`/`opacity` directly onto these DOM nodes every animation
 * frame via `stripRefs`, bypassing React re-renders for perf.
 */
export function GenieOverlay({ sidebarRect, strips, stripRefs }: GenieOverlayProps) {
  const canvasRefs = useRef<(HTMLCanvasElement | null)[]>([]);

  useEffect(() => {
    strips.forEach((strip, i) => {
      const target = canvasRefs.current[i];
      if (!target) return;
      const ctx = target.getContext("2d");
      ctx?.drawImage(strip.canvas, 0, 0);
    });
  }, [strips]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      aria-hidden
      style={{
        position: "fixed",
        left: sidebarRect.left,
        top: sidebarRect.top,
        width: sidebarRect.width,
        height: sidebarRect.height,
        zIndex: 9999,
        pointerEvents: "none",
      }}
    >
      {strips.map((strip, i) => (
        <div
          key={i}
          ref={(el) => {
            stripRefs.current[i] = el;
          }}
          style={{
            position: "absolute",
            left: 0,
            top: strip.offsetY,
            width: sidebarRect.width,
            height: strip.height,
            transformOrigin: "center center",
            willChange: "transform, opacity",
          }}
        >
          <canvas
            ref={(el) => {
              canvasRefs.current[i] = el;
            }}
            width={strip.canvas.width}
            height={strip.canvas.height}
            style={{ width: "100%", height: "100%", display: "block" }}
          />
        </div>
      ))}
    </div>,
    document.body,
  );
}
