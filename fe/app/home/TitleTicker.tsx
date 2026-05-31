"use client";

import { useState, useEffect, useRef } from "react";

const WORDS = [
  { subject: "Science",   color: "#E07840" },
  { subject: "Math",      color: "#52A878" },
  { subject: "Chemistry", color: "#4A8EC2" },
] as const;

const FS  = 56; // font-size / line-height of the text
const ROW = 72; // row container height — FS + 16px descent clearance

export function TitleTicker({
  serifClass,
  inkColor,
}: {
  serifClass: string;
  inkColor: string;
}) {
  const [idx, setIdx]         = useState(0);
  const [rolling, setRolling] = useState(false);
  const [widths, setWidths]   = useState<number[]>([]);
  const [slotW, setSlotW]     = useState<number | undefined>(undefined);

  const idxRef    = useRef(0);
  const measureRef = useRef<HTMLSpanElement>(null);

  // Measure "[WORD] Teachers" width for each word
  useEffect(() => {
    const el = measureRef.current;
    if (!el) return;
    const measured = WORDS.map(({ subject }) => {
      el.textContent = `${subject} Teachers`;
      return Math.ceil(el.getBoundingClientRect().width) + 2;
    });
    el.textContent = `${WORDS[0].subject} Teachers`;
    setWidths(measured);
    setSlotW(measured[0]);
  }, []);

  useEffect(() => {
    if (widths.length === 0) return;

    let t1: ReturnType<typeof setTimeout>;

    const cycle = () => {
      const next = (idxRef.current + 1) % WORDS.length;
      setSlotW(widths[next]);
      setRolling(true);

      t1 = setTimeout(() => {
        idxRef.current = next;
        setIdx(next);
        setRolling(false);
      }, 500);
    };

    const id = setInterval(cycle, 3200);
    return () => {
      clearInterval(id);
      clearTimeout(t1);
    };
  }, [widths]);

  const nextIdx = (idx + 1) % WORDS.length;

  return (
    <span style={{ display: "inline-flex", alignItems: "flex-start" }}>
      {/* Static prefix — baseline-aligned with the rolling text */}
      <span
        className={serifClass}
        style={{ fontSize: FS, lineHeight: `${FS}px`, whiteSpace: "nowrap", color: inkColor }}
      >
        for High School&nbsp;
      </span>

      {/* Hidden measuring span */}
      <span
        ref={measureRef}
        className={serifClass}
        aria-hidden
        style={{
          position: "absolute",
          visibility: "hidden",
          fontSize: FS,
          lineHeight: `${FS}px`,
          whiteSpace: "nowrap",
          pointerEvents: "none",
        }}
      />

      {/* Clip window — ROW tall (includes descent space); width transitions per word */}
      <span
        style={{
          display: "inline-block",
          width: slotW ?? "auto",
          height: ROW,
          overflow: "hidden",
          flexShrink: 0,
          transition: "width 0.48s cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      >
        {/* Drum — two ROW-tall rows stacked; rolls up by ROW on each cycle */}
        <span
          style={{
            display: "flex",
            flexDirection: "column",
            transform: rolling ? `translateY(-${ROW}px)` : "translateY(0)",
            transition: rolling ? `transform 0.46s cubic-bezier(0.4, 0, 0.2, 1)` : "none",
          }}
        >
          {([idx, nextIdx] as const).map((wi, row) => (
            <span
              key={row}
              style={{
                height: ROW,
                display: "flex",
                alignItems: "flex-start", // text sits at top; bottom 16px = descent clearance
                whiteSpace: "nowrap",
                flexShrink: 0,
              }}
            >
              <span
                className={serifClass}
                style={{ fontSize: FS, lineHeight: `${FS}px`, color: WORDS[wi].color }}
              >
                {WORDS[wi].subject}
              </span>
              <span
                className={serifClass}
                style={{ fontSize: FS, lineHeight: `${FS}px`, color: inkColor }}
              >
                &nbsp;Teachers
              </span>
            </span>
          ))}
        </span>
      </span>
    </span>
  );
}
