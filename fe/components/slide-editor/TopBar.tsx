"use client";

import { useEffect, useRef, useState } from "react";
import { useEditorStore } from "@/stores/slide-editor-store";
import { isSlideLockedForGeneration, type Slide } from "./types";
import { downloadOfflineHtml, exportOfflineHtml } from "@/lib/slide-html-export";

export type DesignStepStatus = "idle" | "running" | "complete" | "error";

export interface DesignStepControls {
  step1: DesignStepStatus;
  step2: DesignStepStatus;
  step3: DesignStepStatus;
  onRunStep: (step: 1 | 2 | 3) => void;
}

interface TopBarProps {
  showRightPanel: boolean;
  onToggleRightPanel: () => void;
  designSteps?: DesignStepControls;
  onRetrySlide?: (slideId: string) => void;
  onSaveToLibrary?: () => void;
  savingToLibrary?: boolean;
  onPresent?: () => void;
}

function UndoSvg() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 7 4 12l5 5" />
      <path d="M5 12h9a6 6 0 0 1 6 6v1" />
    </svg>
  );
}

function RedoSvg() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="m15 7 5 5-5 5" />
      <path d="M19 12h-9a6 6 0 0 0-6 6v1" />
    </svg>
  );
}

function SaveIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 2.5h8l2 2V13H3z" />
      <path d="M5 2.5V6h5V2.5" />
      <path d="M5.5 13V9.5h5V13" />
    </svg>
  );
}

function SparkIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 1.8l1.2 3.4L12.6 6.4 9.2 7.6 8 11 6.8 7.6 3.4 6.4l3.4-1.2z" />
      <path d="M12.6 9.6l.5 1.4 1.4.5-1.4.5-.5 1.4-.5-1.4-1.4-.5 1.4-.5z" />
    </svg>
  );
}

function ExportIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 2v7" />
      <path d="M5.5 6.5 8 9l2.5-2.5" />
      <path d="M3 10.5V13h10v-2.5" />
    </svg>
  );
}

function SidebarRightIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2.2" y="2.4" width="11.6" height="11.2" rx="2" />
      <path d="M10 2.4v11.2" />
      <path d="M11.9 7.9h.01" />
    </svg>
  );
}

function PresentIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1.8" y="2.3" width="12.4" height="9.1" rx="1.4" />
      <path d="m6.5 5.1 3.2 1.75L6.5 8.6z" fill="currentColor" stroke="none" />
      <path d="M5.4 13.5h5.2M8 11.4v2.1" />
    </svg>
  );
}

function Divider() {
  return <div className="mx-1 h-5 w-px shrink-0 bg-[#e8e2d9]" />;
}

function RetrySvg() {
  return <SparkIcon />;
}

function IconButton({
  onClick,
  disabled,
  active,
  children,
  title,
  wide = false,
}: {
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  children: React.ReactNode;
  title?: string;
  wide?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`flex h-8 ${wide ? "min-w-12 px-2" : "w-8"} items-center justify-center rounded-[10px] text-[11px] font-semibold transition-colors disabled:pointer-events-none disabled:opacity-30 ${
        active ? "bg-[#f3efe9] text-[#2b2926]" : "text-[#8a8178] hover:bg-[#f7f3ee] hover:text-[#4f4943]"
      }`}
    >
      {children}
    </button>
  );
}

function ActionButton({
  children,
  onClick,
  variant = "ghost",
  disabled = false,
  title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  variant?: "ghost" | "ai" | "dark";
  disabled?: boolean;
  title?: string;
}) {
  const cls =
    variant === "dark"
      ? "bg-[#2b2926] text-white shadow-[0_4px_10px_rgba(43,41,38,0.16)] hover:bg-[#3b3733]"
      : variant === "ai"
        ? "border border-[#eadfd7] bg-[#fff7f1] text-[#d97757] hover:bg-[#f6eadf]"
        : "text-[#4f4943] hover:bg-[#f7f3ee]";

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`flex h-8 items-center gap-1.5 rounded-[10px] px-3 text-[12px] font-medium transition-colors disabled:pointer-events-none disabled:opacity-35 ${cls}`}
    >
      {children}
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
      <div>{trigger}</div>
      {open && (
        <div
          className={`absolute top-full z-50 mt-1 w-[150px] overflow-hidden rounded-[16px] border border-[#e8e2d9] bg-white py-1 shadow-[0_8px_24px_rgba(43,41,38,0.12)] ${
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
  disabled = false,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex w-full items-center px-3 py-1.5 text-left text-[12px] transition-colors ${
        active ? "bg-[#f6eadf] text-[#2b2926]" : "text-[#4f4943] hover:bg-[#f7f3ee] disabled:cursor-wait disabled:opacity-50"
      }`}
    >
      {children}
    </button>
  );
}

function deckTitle(slide: Slide | undefined) {
  return slide?.aiPrompt?.trim() || "Photosynthesis Lesson";
}

export function TopBar({
  showRightPanel,
  onToggleRightPanel,
  designSteps,
  onRetrySlide,
  onSaveToLibrary,
  savingToLibrary = false,
  onPresent,
}: TopBarProps) {
  const undo = useEditorStore((s) => s.undo);
  const redo = useEditorStore((s) => s.redo);
  const history = useEditorStore((s) => s.history);
  const currentSlideId = useEditorStore((s) => s.currentSlideId);
  const currentSlide = useEditorStore((s) => s.slides.find((sl) => sl.id === s.currentSlideId));
  const currentSlideLocked = useEditorStore((s) =>
    isSlideLockedForGeneration(s.slides.find((sl) => sl.id === s.currentSlideId)),
  );
  const hasLockedSlides = useEditorStore((s) => s.slides.some(isSlideLockedForGeneration));

  const [menu, setMenu] = useState<string | null>(null);
  const [exportingHtml, setExportingHtml] = useState(false);
  const [exportNotice, setExportNotice] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

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
        // Ignore invalid files.
      }
    };
    reader.readAsText(file);
  }

  async function exportHtml() {
    if (exportingHtml) return;
    setExportingHtml(true);
    setExportNotice(null);
    try {
      const state = useEditorStore.getState();
      const title = deckTitle(state.currentSlide());
      const result = await exportOfflineHtml(state.slides, title);
      downloadOfflineHtml(result.html, title);
      setExportNotice(result.warnings.length ? `Đã xuất HTML; ${result.warnings.length} ảnh được thay bằng placeholder.` : "Đã tải file HTML offline.");
    } catch {
      setExportNotice("Không thể tạo file HTML offline. Vui lòng thử lại.");
    } finally {
      setExportingHtml(false);
      setMenu(null);
    }
  }

  return (
    <header className="flex h-12 shrink-0 items-center gap-1 border-b border-[#e8e2d9] bg-white px-3">
      <button className="flex max-w-[260px] items-center gap-1.5 rounded-[10px] px-2.5 py-1.5 text-left text-[12px] font-medium text-[#4f4943] hover:bg-[#f7f3ee]">
        <span className="truncate">{deckTitle(currentSlide)}</span>
        <span className="text-[#b8aea5]">&gt;</span>
      </button>

      {onRetrySlide ? (
        <>
          <Divider />
          <IconButton
            onClick={() => currentSlideId && onRetrySlide(currentSlideId)}
            disabled={!currentSlideId || currentSlideLocked}
            title="Tạo lại slide này bằng AI"
          >
            <RetrySvg />
          </IconButton>
        </>
      ) : null}

      {designSteps ? (
        <>
          <Divider />
          {([1, 2, 3] as const).map((step) => {
            const status = designSteps[`step${step}`];
            const previousComplete = step === 1 || designSteps[`step${step - 1}` as "step1" | "step2"] === "complete";
            const disabled = status === "complete" || status === "running" || !previousComplete ||
              Object.values(designSteps).some((value) => value === "running");
            const label = step === 1 ? "Bước 1: Giao diện" : step === 2 ? "Bước 2: Bố cục mẫu" : "Bước 3: Nội dung";
            return (
              <ActionButton key={step} onClick={() => designSteps.onRunStep(step)} disabled={disabled} title={label} variant="ai">
                {status === "running" ? <span className="size-3 animate-spin rounded-full border-2 border-current border-t-transparent" /> : <SparkIcon />}
                {label}
              </ActionButton>
            );
          })}
        </>
      ) : null}

      <div className="flex-1" />

      <IconButton onClick={undo} disabled={history.past.length === 0 || hasLockedSlides} title="Undo (Ctrl+Z)">
        <UndoSvg />
      </IconButton>
      <IconButton onClick={redo} disabled={history.future.length === 0 || hasLockedSlides} title="Redo (Ctrl+Shift+Z)">
        <RedoSvg />
      </IconButton>

      <Divider />

      <ActionButton onClick={onSaveToLibrary ?? saveDraft} disabled={savingToLibrary}>
        <SaveIcon />
        {savingToLibrary ? "Đang lưu..." : "Lưu"}
      </ActionButton>
      {onPresent ? (
        <ActionButton onClick={onPresent} variant="dark" title="Trình chiếu bộ slide">
          <PresentIcon />
          Trình chiếu
        </ActionButton>
      ) : null}
      <ActionButton onClick={() => undefined} variant="ai">
        <SparkIcon />
        AI
      </ActionButton>
      <Dropdown
        trigger={
          <button
            onClick={() => setMenu(menu === "export" ? null : "export")}
            className="flex h-8 items-center gap-1.5 rounded-[10px] bg-[#2b2926] px-3 text-[12px] font-medium text-white shadow-[0_4px_10px_rgba(43,41,38,0.16)] transition-colors hover:bg-[#3b3733]"
          >
            <ExportIcon />
            Export
          </button>
        }
        open={menu === "export"}
        onToggle={() => setMenu(menu === "export" ? null : "export")}
        align="right"
      >
        <DropdownItem onClick={() => void exportHtml()} disabled={exportingHtml}>
          {exportingHtml ? "Đang đóng gói..." : "Export HTML offline"}
        </DropdownItem>
        <DropdownItem onClick={() => { exportJSON(); setMenu(null); }}>
          Export JSON
        </DropdownItem>
        <DropdownItem onClick={() => { fileRef.current?.click(); setMenu(null); }}>
          Import JSON
        </DropdownItem>
      </Dropdown>

      <Divider />

      <IconButton onClick={onToggleRightPanel} active={showRightPanel} title="Toggle right sidebar">
        <SidebarRightIcon />
      </IconButton>

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
      {exportNotice ? <p role="status" className="fixed bottom-4 left-1/2 z-[100] -translate-x-1/2 rounded-lg bg-[#2b2926] px-4 py-2 text-xs text-white shadow-lg">{exportNotice}</p> : null}
    </header>
  );
}

function saveDraft() {
  const state = useEditorStore.getState();
  localStorage.setItem(
    "slide-editor-v1",
    JSON.stringify({
      slides: state.slides.map((slide) => {
        const clean = { ...slide };
        delete clean.generationStatus;
        return clean;
      }),
    }),
  );
}
