"use client";

// Đo kích thước THẬT của container (không phải kích thước cố định cứng) —
// dùng ResizeObserver để canvas Konva co giãn theo mọi thay đổi khung chứa
// (thu/mở sidebar, resize cửa sổ…), không chỉ theo bề rộng lúc mount.

import { useEffect, useRef, useState } from "react";

export function useContainerSize<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setSize({ width: el.clientWidth, height: el.clientHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return { ref, size };
}
