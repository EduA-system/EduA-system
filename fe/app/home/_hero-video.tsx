"use client";

import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";

const INTRO_END = 7;   // seconds — play once from 0 → 7
const LOOP_START = 7;  // seconds — then loop 7 → 9 forever
const LOOP_END = 9;    // seconds

export function HeroVideo({ style }: { style: CSSProperties }) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;

    function onTimeUpdate() {
      if (video!.currentTime >= LOOP_END) {
        video!.currentTime = LOOP_START;
        video!.play();
      }
    }

    video.addEventListener("timeupdate", onTimeUpdate);
    return () => video.removeEventListener("timeupdate", onTimeUpdate);
  }, []);

  function handleClick() {
    const video = ref.current;
    if (!video) return;
    video.currentTime = 0;
    video.play();
  }

  return (
    <video
      ref={ref}
      src="/home/output.webm"
      autoPlay
      muted
      playsInline
      onClick={handleClick}
      style={{ ...style, objectFit: "cover", cursor: "pointer" }}
    />
  );
}
