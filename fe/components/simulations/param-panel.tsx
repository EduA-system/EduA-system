"use client";

// Bảng tham số sinh từ schema, dựng bằng Tweakpane (imperative → bọc trong React).
// Đưa vào một danh sách ParamDef + giá trị hiện tại; mỗi lần kéo slider gọi onChange.
// Đồng bộ 2 chiều: nếu `values` đổi từ bên ngoài (reset / AI sửa) → panel tự refresh.

import { useEffect, useRef } from "react";
import { Pane } from "tweakpane";

export type ParamDef = {
  key: string;
  label: string;
  min: number;
  max: number;
  step?: number;
  unit?: string;
};

export function ParamPanel({
  schema,
  values,
  onChange,
}: {
  schema: ParamDef[];
  values: Record<string, number>;
  onChange: (key: string, value: number) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  // Giá trị mà Tweakpane đọc/ghi trực tiếp (object thường, không phải React state).
  const objRef = useRef<Record<string, number>>({ ...values });
  const paneRef = useRef<Pane | null>(null);
  // Giữ onChange mới nhất qua ref để effect tạo Pane không phụ thuộc nó.
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // Tạo Pane một lần cho mỗi schema. AI/dev đổi schema (chọn sim khác) → dựng lại.
  useEffect(() => {
    if (!containerRef.current) return;
    const obj = objRef.current;
    for (const p of schema) if (!(p.key in obj)) obj[p.key] = values[p.key] ?? p.min;

    const pane = new Pane({ container: containerRef.current });
    paneRef.current = pane;
    for (const p of schema) {
      const binding = pane.addBinding(obj, p.key, {
        label: p.unit ? `${p.label} (${p.unit})` : p.label,
        min: p.min,
        max: p.max,
        step: p.step,
      });
      binding.on("change", (ev) => onChangeRef.current(p.key, ev.value as number));
    }
    return () => {
      pane.dispose();
      paneRef.current = null;
    };
    // values cố tình bỏ khỏi deps: panel chỉ dựng lại khi schema đổi; đồng bộ giá
    // trị ngoài xử lý ở effect dưới.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schema]);

  // Đồng bộ khi `values` đổi từ ngoài (reset, AI sửa) → ghi vào obj + refresh panel.
  useEffect(() => {
    const obj = objRef.current;
    let changed = false;
    for (const k in values) {
      if (obj[k] !== values[k]) {
        obj[k] = values[k]!;
        changed = true;
      }
    }
    if (changed) paneRef.current?.refresh();
  }, [values]);

  return <div ref={containerRef} />;
}
