"use client";

import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";

const LOOP_START = 7;  // seconds, then loop 7 to 9 forever
const LOOP_END = 9;    // seconds

export function HeroVideo({ style, className }: { style?: CSSProperties; className?: string }) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !reduceMotion) void video.play();
      else video.pause();
    }, { rootMargin: "100px" });

    function onTimeUpdate() {
      if (video!.currentTime >= LOOP_END) {
        video!.currentTime = LOOP_START;
        video!.play();
      }
    }

    video.addEventListener("timeupdate", onTimeUpdate);
    observer.observe(video);
    return () => {
      video.removeEventListener("timeupdate", onTimeUpdate);
      observer.disconnect();
    };
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
      className={className}
      src="/home/output.webm"
      autoPlay
      muted
      playsInline
      onClick={handleClick}
      style={{ ...style, objectFit: "cover", cursor: "pointer" }}
    />
  );
}
