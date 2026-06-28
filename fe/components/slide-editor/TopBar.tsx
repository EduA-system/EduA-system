"use client";

import { useRef, useState, useEffect } from "react";
import { useEditorStore } from "@/stores/slide-editor-store";
import { isSlideLockedForGeneration, type Slide } from "./types";

const ZOOM_PRESETS = [0.25, 0.33, 0.5, 0.67, 0.75, 1, 1.25, 1.5, 2, 3];

interface TopBarProps {
  zoomMode: "fit" | number;
  onZoomModeChange: (zoom: "fit" | number) => void;
  lockAspect: boolean;
  onToggleLockAspect: () => void;
  showLayers: boolean;
  onToggleLayers: () => void;
}

function UndoSvg() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M5.5 7.5H3V5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3 7.5A5 5 0 1 0 8 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function RedoSvg() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M10.5 7.5H13V5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M13 7.5A5 5 0 1 1 8 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function Divider() {
  return <div className="mx-1 h-5 w-px shrink-0 bg-black/10" />;
}

function ToolButton({
  onClick,
  disabled,
  active,
  children,
  label,
  title,
}: {
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  children?: React.ReactNode;
  label?: string;
  title?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`flex h-[32px] w-[32px] items-center justify-center rounded-[6px] text-[13px] transition-colors ${
        active
          ? "bg-[#e8e8e8] text-[#1f1f1f]"
          : "text-[#555] hover:bg-black/5"
      } disabled:pointer-events-none disabled:opacity-30`}
    >
      {children ?? label}
    </button>
  );
}

function Dropdown({
  trigger,
  open,
  onToggle,
  align = "left",
  children,
}: {
  trigger: React.ReactNode;
  open: boolean;
  onToggle: () => void;
  align?: "left" | "right";
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onToggle();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, onToggle]);

  return (
    <div ref={ref} className="relative">
      <div onClick={onToggle}>{trigger}</div>
      {open && (
        <div
          className={`absolute top-full z-50 mt-1 w-[150px] overflow-hidden rounded-[8px] border border-black/10 bg-white py-1 shadow-[0_8px_30px_rgba(0,0,0,0.12)] ${
            align === "right" ? "right-0" : "left-0"
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {children}
        </div>
      )}
    </div>
  );
}

function DropdownItem({
  onClick,
  active,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center px-3 py-1.5 text-left text-[13px] transition-colors ${
        active
          ? "bg-[#e8e8e8] text-[#1f1f1f]"
          : "text-[#555] hover:bg-black/5"
      }`}
    >
      {children}
    </button>
  );
}

export function TopBar({
  zoomMode,
  onZoomModeChange,
  lockAspect,
  onToggleLockAspect,
  showLayers,
  onToggleLayers,
}: TopBarProps) {
  const undo = useEditorStore((s) => s.undo);
  const redo = useEditorStore((s) => s.redo);
  const history = useEditorStore((s) => s.history);
  const selectedCount = useEditorStore((s) => s.selectedIds.length);
  const currentSlideLocked = useEditorStore((s) =>
    isSlideLockedForGeneration(s.slides.find((sl) => sl.id === s.currentSlideId)),
  );
  const hasLockedSlides = useEditorStore((s) => s.slides.some(isSlideLockedForGeneration));

  const [menu, setMenu] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const zoomLabel =
    zoomMode === "fit" ? "Fit" : `${Math.round(zoomMode * 100)}%`;

  function deleteSelected() {
    if (currentSlideLocked) return;
    const store = useEditorStore.getState();
    if (store.selectedIds.length > 0) store.removeElements(store.selectedIds);
  }

  function exportJSON() {
    const state = useEditorStore.getState();
    const slides = state.slides.map((slide) => {
      const clean = { ...slide };
      delete clean.generationStatus;
      return clean;
    });
    const json = JSON.stringify({ slides }, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "slides.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  function importJSON(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result));
        const slides: Slide[] = Array.isArray(data) ? data : data.slides;
        if (!Array.isArray(slides) || slides.length === 0) return;
        // Regenerate id để tránh trùng khi import vào phiên hiện tại.
        const fresh = slides.map((s, si) => ({
          ...s,
          generationStatus: undefined,
          id: `slide-imp-${Date.now()}-${si}`,
          elements: s.elements.map((el, ei) => ({
            ...el,
            id: `el-imp-${Date.now()}-${si}-${ei}`,
          })),
        }));
        useEditorStore.getState().replaceSlides(fresh);
      } catch {
        // bỏ qua file không hợp lệ
      }
    };
    reader.readAsText(file);
  }

  return (
    <header className="relative flex h-[52px] shrink-0 items-center gap-1 border-b border-black/10 bg-white px-3">
      <span className="mr-2 text-[13px] font-semibold tracking-[-0.01em] text-[#1f1f1f]">
        Slide Maker
      </span>

      <Divider />

      <ToolButton onClick={undo} disabled={history.past.length === 0 || hasLockedSlides} title="Undo (Ctrl+Z)">
        <UndoSvg />
      </ToolButton>
      <ToolButton onClick={redo} disabled={history.future.length === 0 || hasLockedSlides} title="Redo (Ctrl+Shift+Z)">
        <RedoSvg />
      </ToolButton>

      <Divider />

      <ToolButton onClick={onToggleLayers} active={showLayers} title="Bảng Layers" label="▦" />
      <ToolButton onClick={deleteSelected} disabled={selectedCount === 0 || currentSlideLocked} title="Xóa (Delete)" label="🗑" />
      <ToolButton
        onClick={onToggleLockAspect}
        active={lockAspect}
        title="Khóa tỉ lệ khi resize"
        label="⛶"
      />

      <div className="flex-1" />

      <ToolButton
        onClick={() => onZoomModeChange("fit")}
        active={zoomMode === "fit"}
        title="Fit to screen"
        label="⊞"
      />
      <ToolButton
        onClick={() => onZoomModeChange(1)}
        active={zoomMode === 1}
        title="100% zoom"
        label="100%"
      />

      <Dropdown
        trigger={
          <button
            onClick={() => setMenu(menu === "zoom" ? null : "zoom")}
            className="flex h-[32px] items-center gap-1 rounded-[6px] px-2 text-[12px] text-[#555] transition-colors hover:bg-black/5"
          >
            {zoomLabel}
            <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
              <path d="M2 3l2 2 2-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        }
        open={menu === "zoom"}
        onToggle={() => setMenu(menu === "zoom" ? null : "zoom")}
      >
        <DropdownItem onClick={() => { onZoomModeChange("fit"); setMenu(null); }} active={zoomMode === "fit"}>
          Fit
        </DropdownItem>
        <div className="mx-2 my-1 border-t border-black/5" />
        {ZOOM_PRESETS.map((z) => (
          <DropdownItem
            key={z}
            onClick={() => { onZoomModeChange(z); setMenu(null); }}
            active={zoomMode === z}
          >
            {Math.round(z * 100)}%
          </DropdownItem>
        ))}
      </Dropdown>

      <Divider />

      <Dropdown
        trigger={
          <button
            onClick={() => setMenu(menu === "export" ? null : "export")}
            className="flex h-[32px] items-center gap-1 rounded-[6px] px-2 text-[12px] text-[#555] transition-colors hover:bg-black/5"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 2v7M4 6l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M2 10v1a1 1 0 001 1h8a1 1 0 001-1v-1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
              <path d="M2 3l2 2 2-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        }
        open={menu === "export"}
        onToggle={() => setMenu(menu === "export" ? null : "export")}
        align="right"
      >
        <DropdownItem onClick={() => { exportJSON(); setMenu(null); }}>
          Export JSON
        </DropdownItem>
        <DropdownItem onClick={() => { fileRef.current?.click(); setMenu(null); }}>
          Import JSON
        </DropdownItem>
      </Dropdown>

      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) importJSON(f);
          e.target.value = "";
        }}
      />
    </header>
  );
}
