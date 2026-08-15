"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./landing.module.css";

const WORDS = [
  { subject: "Vật lý", color: "#e07840" },
  { subject: "Toán học", color: "#52a878" },
  { subject: "Hóa học", color: "#4a8ec2" },
] as const;

export function TitleTicker() {
  const [index, setIndex] = useState(0);
  const [rolling, setRolling] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) return;
    const interval = window.setInterval(() => {
      setRolling(true);
      timeoutRef.current = setTimeout(() => {
        setIndex((current) => (current + 1) % WORDS.length);
        setRolling(false);
      }, 520);
    }, 3400);
    return () => {
      window.clearInterval(interval);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const next = (index + 1) % WORDS.length;

  return (
    <span className={styles.tickerRoot}>
      <span className={styles.tickerPrefix}>cho giáo viên</span>
      <span className={styles.tickerSlot} aria-live="polite">
        <span className={`${styles.tickerDrum} ${rolling ? styles.tickerDrumRolling : ""}`}>
          {[index, next].map((wordIndex, row) => (
            <span key={`${wordIndex}-${row}`} className={styles.tickerWord} style={{ color: WORDS[wordIndex].color }}>
              {WORDS[wordIndex].subject}
            </span>
          ))}
        </span>
      </span>
    </span>
  );
}
