"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { snapshotSidebar } from "./snapshotSidebar";
import { computeStripTransform, STRIP_COUNT, DURATION_MS, type GenieRect, type GeniePoint } from "./geniePhysics";
import { GenieOverlay, type GenieStrip } from "./GenieOverlay";

interface UseGenieSidebarCollapseOptions {
  /** Ref to the DOM element wrapping the sidebar (used for measuring + snapshotting + hiding). */
  sidebarRef: RefObject<HTMLElement | null>;
  /** Ref to the toggle button the sidebar should appear to warp into/out of. */
  toggleButtonRef: RefObject<HTMLElement | null>;
  /** Fires once the visual effect has finished; caller should flip its real `collapsed` state here. */
  onSettled: (collapsed: boolean) => void;
}

interface CachedGenie {
  strips: GenieStrip[];
  sidebarRect: GenieRect;
}

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function toGenieRect(rect: DOMRect): GenieRect {
  return { left: rect.left, top: rect.top, width: rect.width, height: rect.height };
}

function toGeniePoint(rect: DOMRect): GeniePoint {
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}

function sliceStrips(source: HTMLCanvasElement, stripCount: number): GenieStrip[] {
  const strips: GenieStrip[] = [];
  const stripHeight = source.height / stripCount;

  for (let i = 0; i < stripCount; i++) {
    const offsetY = i * stripHeight;
    const stripCanvas = document.createElement("canvas");
    stripCanvas.width = source.width;
    stripCanvas.height = Math.max(1, Math.ceil(stripHeight));

    const ctx = stripCanvas.getContext("2d");
    ctx?.drawImage(source, 0, offsetY, source.width, stripHeight, 0, 0, source.width, stripHeight);

    strips.push({ canvas: stripCanvas, offsetY, height: stripHeight });
  }

  return strips;
}

/**
 * Orchestrates a macOS-genie-style warp overlay for collapsing/expanding a
 * sidebar into a header toggle button. This is purely a visual illusion
 * layered on top of the caller's existing instant collapse: the real
 * `collapsed` state only flips (via `onSettled`) once the overlay animation
 * finishes, so layout reflow still happens exactly as it does today.
 */
export function useGenieSidebarCollapse({
  sidebarRef,
  toggleButtonRef,
  onSettled,
}: UseGenieSidebarCollapseOptions): { overlay: ReactNode; isAnimating: boolean; toggle: (collapsed: boolean) => void } {
  const [activeStrips, setActiveStrips] = useState<GenieStrip[] | null>(null);
  const [sidebarRect, setSidebarRect] = useState<GenieRect | null>(null);

  const stripRefs = useRef<(HTMLDivElement | null)[]>([]);
  const rafIdRef = useRef<number | null>(null);
  const runIdRef = useRef(0);
  const cachedRef = useRef<CachedGenie | null>(null);
  const sidebarRectRef = useRef<GenieRect | null>(null);
  const targetPointRef = useRef<GeniePoint | null>(null);

  const cancelAnimation = useCallback(() => {
    runIdRef.current += 1;
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
  }, []);

  useEffect(() => cancelAnimation, [cancelAnimation]);

  const applyFrame = useCallback((progress: number) => {
    const rect = sidebarRectRef.current;
    const target = targetPointRef.current;
    if (!rect || !target) return;

    const strips = stripRefs.current;
    strips.forEach((el, i) => {
      if (!el) return;
      const transform = computeStripTransform({
        index: i,
        stripCount: strips.length,
        progress,
        sidebarRect: rect,
        targetPoint: target,
      });
      el.style.transform = `translate(${transform.translateX}px, ${transform.translateY}px) scaleX(${transform.scaleX}) scaleY(${transform.scaleY})`;
      el.style.opacity = String(transform.opacity);
    });
  }, []);

  const runAnimation = useCallback(
    (direction: "collapse" | "expand", onDone: () => void) => {
      const runId = ++runIdRef.current;
      const start = performance.now();

      const step = (now: number) => {
        if (runId !== runIdRef.current) return;
        const raw = Math.min(1, (now - start) / DURATION_MS);
        applyFrame(direction === "collapse" ? raw : 1 - raw);

        if (raw < 1) {
          rafIdRef.current = requestAnimationFrame(step);
        } else {
          rafIdRef.current = null;
          onDone();
        }
      };

      rafIdRef.current = requestAnimationFrame(step);
    },
    [applyFrame],
  );

  const startCollapse = useCallback(async () => {
    const sidebarEl = sidebarRef.current;
    const toggleEl = toggleButtonRef.current;

    if (prefersReducedMotion() || !sidebarEl || !toggleEl) {
      onSettled(true);
      return;
    }

    cancelAnimation();

    const rect = toGenieRect(sidebarEl.getBoundingClientRect());
    const targetPoint = toGeniePoint(toggleEl.getBoundingClientRect());

    const snapshot = await snapshotSidebar(sidebarEl);
    if (!snapshot) {
      onSettled(true);
      return;
    }

    const strips = sliceStrips(snapshot, STRIP_COUNT);
    cachedRef.current = { strips, sidebarRect: rect };
    sidebarRectRef.current = rect;
    targetPointRef.current = targetPoint;
    stripRefs.current = [];
    setSidebarRect(rect);
    setActiveStrips(strips);

    requestAnimationFrame(() => {
      runAnimation("collapse", () => {
        setActiveStrips(null);
        onSettled(true);
      });
    });
  }, [sidebarRef, toggleButtonRef, onSettled, cancelAnimation, runAnimation]);

  const startExpand = useCallback(() => {
    const toggleEl = toggleButtonRef.current;
    const cached = cachedRef.current;

    if (prefersReducedMotion() || !cached || !toggleEl) {
      onSettled(false);
      return;
    }

    cancelAnimation();

    targetPointRef.current = toGeniePoint(toggleEl.getBoundingClientRect());
    sidebarRectRef.current = cached.sidebarRect;
    stripRefs.current = [];
    setSidebarRect(cached.sidebarRect);
    setActiveStrips(cached.strips);

    requestAnimationFrame(() => {
      runAnimation("expand", () => {
        setActiveStrips(null);
        onSettled(false);
      });
    });
  }, [toggleButtonRef, onSettled, cancelAnimation, runAnimation]);

  const toggle = useCallback(
    (collapsed: boolean) => {
      if (collapsed) {
        startExpand();
      } else {
        void startCollapse();
      }
    },
    [startCollapse, startExpand],
  );

  const overlay =
    activeStrips && sidebarRect
      ? <GenieOverlay sidebarRect={sidebarRect} strips={activeStrips} stripRefs={stripRefs} />
      : null;

  return { overlay, isAnimating: activeStrips !== null, toggle };
}
