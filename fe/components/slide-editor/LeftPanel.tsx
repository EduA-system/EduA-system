"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useEditorStore } from "@/stores/slide-editor-store";
import { CANVAS_W, CANVAS_H, isSlideLockedForGeneration, type ElementPatch, type LineElement } from "./types";
import { makeByType, makeImage, makeLine, makePoly, type AddType } from "./lib/factory";
import { SHAPE_LIBRARY, type ShapeSpec } from "./lib/shapes";
import { ColorPicker } from "./ColorPicker";
import { isLikelySvgSource, parseSvgToLine, parseSvgToPoly, svgTextFromDataUri, type ParsedSvgLine, type ParsedSvgShape } from "./lib/svg-to-poly";
import type { ActiveTool } from "./Canvas";
import { MOLECULE_CATALOG } from "@/components/molecules/catalog";
import type { Molecule } from "@/components/molecules/types";

type Tab = null | "shapes" | "text" | "upload" | "tools" | "bg" | "simulation";

type ShapePaletteItem =
  | {
      kind: "primitive";
      id: string;
      label: string;
      type: AddType;
      preview: ReactNode;
      extra?: ElementPatch;
    }
  | {
      kind: "poly";
      id: string;
      label: string;
      path: string;
      viewBox?: string;
      defaultFill?: string;
      defaultStroke?: string;
    };

interface ShapeSectionDef {
  id: string;
  label: string;
  items: ShapePaletteItem[];
}

interface IconifySearchResponse {
  icons?: string[];
}

const ICONIFY_PREFIXES = "material-symbols,mdi,ph,tabler,lucide,solar,hugeicons";
const ICONIFY_LIMIT = 48;

const SHORTCUTS: [string, string][] = [
  ["Delete elements", "Delete"],
  ["Undo / Redo", "Ctrl+Z / Ctrl+Y"],
  ["Copy / Cut / Paste", "Ctrl+C / Ctrl+X / Ctrl+V"],
  ["Duplicate", "Ctrl+D"],
  ["Select all", "Ctrl+A"],
  ["Lock", "Ctrl+L"],
  ["Layer up/down", "] / ["],
  ["Move", "Arrow keys"],
  ["Edit text", "Double-click"],
  ["Clear selection", "Esc"],
];

function ShapesIcon() {
  return (
    <span
      className="size-[17px] bg-current"
      style={{
        WebkitMask: 'url("/dashboard/icons/gravity-ui_shapes-3.svg") center / contain no-repeat',
        mask: 'url("/dashboard/icons/gravity-ui_shapes-3.svg") center / contain no-repeat',
      }}
    />
  );
}

function TextIcon() {
  return (
    <svg className="h-[17px] w-[17px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
      <path d="M5 5h14" />
      <path d="M12 5v14" />
      <path d="M9 19h6" />
    </svg>
  );
}

function UploadIcon() {
  return (
    <svg className="h-[17px] w-[17px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <path d="M17 8 12 3 7 8" />
      <path d="M12 3v12" />
    </svg>
  );
}

function SimulationIcon() {
  return (
    <svg className="h-[17px] w-[17px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="2.4" />
      <ellipse cx="12" cy="12" rx="9" ry="3.6" />
      <ellipse cx="12" cy="12" rx="9" ry="3.6" transform="rotate(60 12 12)" />
      <ellipse cx="12" cy="12" rx="9" ry="3.6" transform="rotate(120 12 12)" />
    </svg>
  );
}

function ToolsIcon() {
  return (
    <svg className="h-[17px] w-[17px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.7 6.3a4 4 0 0 0-5 5L4 17v3h3l5.7-5.7a4 4 0 0 0 5-5z" />
      <path d="M15 5l4 4" />
    </svg>
  );
}

function BackgroundIcon() {
  return (
    <svg className="h-[17px] w-[17px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M3 15l5-5 4 4 3-3 6 6" />
      <circle cx="9" cy="8" r="1.3" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.4-3.4" />
    </svg>
  );
}

function ChevronLeftIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

const ICON_TABS: { id: Exclude<Tab, null>; label: string; icon: ReactNode }[] = [
  { id: "shapes", label: "Elements", icon: <ShapesIcon /> },
  { id: "text", label: "Text", icon: <TextIcon /> },
  { id: "upload", label: "Upload", icon: <UploadIcon /> },
  { id: "simulation", label: "Mô phỏng", icon: <SimulationIcon /> },
  { id: "tools", label: "Tools", icon: <ToolsIcon /> },
  { id: "bg", label: "Background", icon: <BackgroundIcon /> },
];

function primitiveItem(
  id: string,
  label: string,
  type: AddType,
  preview: ReactNode,
  extra?: ElementPatch,
): ShapePaletteItem {
  return { kind: "primitive", id, label, type, preview, extra };
}

function polyItem(shape: ShapeSpec): ShapePaletteItem {
  return {
    kind: "poly",
    id: shape.id,
    label: shape.label,
    path: shape.path,
    viewBox: shape.viewBox,
    defaultFill: shape.defaultFill,
    defaultStroke: shape.defaultStroke,
  };
}

function shapesFromCategory(id: string): ShapePaletteItem[] {
  return (SHAPE_LIBRARY.find((cat) => cat.id === id)?.shapes ?? []).map(polyItem);
}

function pickShapes(ids: string[]): ShapePaletteItem[] {
  const all = SHAPE_LIBRARY.flatMap((cat) => cat.shapes);
  return ids
    .map((id) => all.find((shape) => shape.id === id))
    .filter((shape): shape is ShapeSpec => Boolean(shape))
    .map(polyItem);
}

const RECENT_SHAPES: ShapePaletteItem[] = [
  primitiveItem("recent-line", "Đường thẳng", "line", <div className="h-px w-9 bg-current" />),
  primitiveItem("recent-slant", "Hình bình hành", "poly", <PreviewPath path="M20 2 L98 2 L80 98 L2 98Z" />),
  ...pickShapes(["speech-round", "arrow-down"]),
];

const LINE_SHAPES: ShapePaletteItem[] = [
  primitiveItem("line", "Đường thẳng", "line", <div className="h-px w-9 bg-current" />),
  primitiveItem("line-dashed", "Đường đứt", "line", <div className="h-px w-9 border-t border-dashed border-current" />, { dashStyle: "dashed" }),
  primitiveItem("line-dotted", "Đường chấm", "line", <div className="h-px w-9 border-t border-dotted border-current" />, { dashStyle: "dotted" }),
  primitiveItem(
    "arrow-end",
    "Mũi tên",
    "arrow",
    <svg width="38" height="18" viewBox="0 0 38 18" fill="none">
      <path d="M3 9h28" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="m26 5 5 4-5 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>,
  ),
  primitiveItem(
    "arrow-both",
    "Mũi tên hai đầu",
    "arrow",
    <svg width="38" height="18" viewBox="0 0 38 18" fill="none">
      <path d="M8 9h22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="m12 5-5 4 5 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="m26 5 5 4-5 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>,
    { arrowHead: "both" },
  ),
];

const BASIC_SHAPES: ShapePaletteItem[] = [
  primitiveItem("rect", "Hình vuông", "rect", <div className="h-9 w-9 bg-current" />, { fill: "#2b2926", strokeW: 0, borderRadius: 0, w: 120, h: 120 }),
  primitiveItem("rounded-rect", "Bo góc", "rect", <div className="h-9 w-9 rounded-[7px] bg-current" />, { fill: "#2b2926", strokeW: 0, borderRadius: 12, w: 120, h: 120 }),
  primitiveItem("ellipse", "Tròn", "ellipse", <div className="size-9 rounded-full bg-current" />, { fill: "#2b2926", strokeW: 0, w: 120, h: 120 }),
  ...pickShapes(["triangle", "right-triangle"]),
];

const SHAPE_SECTIONS: ShapeSectionDef[] = [
  { id: "recent", label: "Dùng gần đây", items: RECENT_SHAPES },
  { id: "lines", label: "Đường kẻ", items: LINE_SHAPES },
  { id: "basic", label: "Hình dạng cơ bản", items: BASIC_SHAPES },
  { id: "polygons", label: "Đa giác", items: pickShapes(["pentagon", "hexagon", "octagon", "diamond", "parallelogram", "trapezoid"]) },
  { id: "stars", label: "Hình ngôi sao", items: shapesFromCategory("stars") },
  { id: "arrows", label: "Mũi tên", items: shapesFromCategory("arrows") },
  { id: "flowchart", label: "Hình dạng sơ đồ quy trình", items: shapesFromCategory("flowchart") },
  { id: "callouts", label: "Bong bóng trò chuyện", items: shapesFromCategory("callouts") },
  { id: "clouds", label: "Đám mây", items: pickShapes(["cloud", "crescent", "heart", "cross", "frame", "donut"]) },
];

const TEXT_PRESETS: { label: string; fontSize: number; bold: boolean; italic?: boolean; color?: string }[] = [
  { label: "Large title", fontSize: 60, bold: true },
  { label: "Medium title", fontSize: 40, bold: true },
  { label: "Small title", fontSize: 28, bold: false },
  { label: "Body text", fontSize: 20, bold: false },
  { label: "Caption", fontSize: 14, bold: false, italic: true, color: "#6b625a" },
];

interface LeftPanelProps {
  activeTool: ActiveTool;
  onToolChange: (t: ActiveTool) => void;
  drawColor: string;
  onDrawColorChange: (c: string) => void;
  drawSize: number;
  onDrawSizeChange: (n: number) => void;
}

const BG_PRESETS = [
  "#ffffff", "#fbfaf8", "#f5f1ec", "#f7f3ee", "#fff7f1", "#f6eadf",
  "#eef3f8", "#ecfdf5", "#fff1f2", "#2b2926", "#4f4943", "#000000",
];

const DRAW_TOOLS: { id: ActiveTool; label: string }[] = [
  { id: "brush", label: "Brush" },
  { id: "pencil", label: "Pencil" },
  { id: "eraser", label: "Eraser" },
];

function iconifySvgUrl(icon: string, size = 64) {
  const [prefix, name] = icon.split(":");
  return `https://api.iconify.design/${encodeURIComponent(prefix)}/${encodeURIComponent(name)}.svg?width=${size}&height=${size}&color=%231c1e2e`;
}

function PreviewPath({ path, viewBox = "0 0 100 100" }: { path: string; viewBox?: string }) {
  return (
    <svg width="36" height="36" viewBox={viewBox} preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      <path d={path} fill="currentColor" fillRule="evenodd" />
    </svg>
  );
}

function SectionHeader({ label, actionLabel, onAction }: { label: string; actionLabel?: string; onAction?: () => void }) {
  return (
    <div className="mb-1.5 flex items-center gap-2">
      <div className="min-w-0 flex-1 truncate text-[11px] font-bold text-[#2b2926]">
        {label}
      </div>
      {actionLabel && onAction && (
        <button type="button" onClick={onAction} className="shrink-0 text-[10px] font-medium text-[#8a8178] hover:text-[#2b2926]">
          {actionLabel}
        </button>
      )}
    </div>
  );
}

function ShapeButton({ children, title, onClick }: { children: ReactNode; title: string; onClick: () => void }) {
  return (
    <button
      title={title}
      onClick={onClick}
      className="flex size-10 shrink-0 items-center justify-center text-[#2b2926] transition-transform hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#d97757]"
    >
      {children}
    </button>
  );
}

function RemoteIconButton({ icon, onClick }: { icon: string; onClick: () => void }) {
  return (
    <button
      title={icon}
      onClick={onClick}
      className="flex size-10 shrink-0 items-center justify-center transition-transform hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#d97757]"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={iconifySvgUrl(icon, 36)} alt="" className="h-8 w-8 object-contain" loading="lazy" />
    </button>
  );
}

function ShapePreview({ item }: { item: ShapePaletteItem }) {
  return item.kind === "primitive" ? item.preview : <PreviewPath path={item.path} viewBox={item.viewBox} />;
}

function ShapeCarouselArrow({ direction, title, onClick }: { direction: "left" | "right"; title: string; onClick: () => void }) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      className={`absolute top-1/2 z-10 flex size-7 -translate-y-1/2 items-center justify-center rounded-full border border-[#e8e2d9] bg-white text-[#2b2926] shadow-[0_4px_14px_rgba(43,41,38,0.12)] transition-colors hover:bg-[#f7f3ee] ${
        direction === "left" ? "left-0" : "right-0"
      }`}
    >
      {direction === "left" ? <ChevronLeftIcon /> : <ChevronRightIcon />}
    </button>
  );
}

function ShapeCarouselSection({
  section,
  onViewAll,
  onAdd,
}: {
  section: ShapeSectionDef;
  onViewAll: () => void;
  onAdd: (item: ShapePaletteItem) => void;
}) {
  const rowRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollState = useCallback(() => {
    const row = rowRef.current;
    if (!row) return;
    const maxScroll = Math.max(0, row.scrollWidth - row.clientWidth);
    setCanScrollLeft(row.scrollLeft > 1);
    setCanScrollRight(row.scrollLeft < maxScroll - 1);
  }, []);

  useEffect(() => {
    updateScrollState();

    const row = rowRef.current;
    if (!row) return;

    const resizeObserver = typeof ResizeObserver !== "undefined" ? new ResizeObserver(updateScrollState) : null;
    resizeObserver?.observe(row);
    window.addEventListener("resize", updateScrollState);

    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener("resize", updateScrollState);
    };
  }, [section.items.length, updateScrollState]);

  function scrollByPage(direction: "left" | "right") {
    const row = rowRef.current;
    if (!row) return;
    const distance = Math.max(96, row.clientWidth - 48);
    row.scrollBy({ left: direction === "left" ? -distance : distance, behavior: "smooth" });
    window.setTimeout(updateScrollState, 260);
  }

  return (
    <section className="mb-4">
      <SectionHeader label={section.label} actionLabel={section.items.length > 4 ? "Xem tất cả" : undefined} onAction={onViewAll} />
      <div className="relative">
        <div
          ref={rowRef}
          onScroll={updateScrollState}
          className="flex gap-1 overflow-x-auto scroll-smooth pr-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {section.items.map((item) => (
            <ShapeButton key={item.id} title={item.label} onClick={() => onAdd(item)}>
              <ShapePreview item={item} />
            </ShapeButton>
          ))}
        </div>
        {canScrollLeft && <ShapeCarouselArrow direction="left" title="Lướt sang trái" onClick={() => scrollByPage("left")} />}
        {canScrollRight && <ShapeCarouselArrow direction="right" title="Lướt sang phải" onClick={() => scrollByPage("right")} />}
      </div>
    </section>
  );
}

function AllShapesView({ section, onBack, onAdd }: { section: ShapeSectionDef; onBack: () => void; onAdd: (item: ShapePaletteItem) => void }) {
  return (
    <div className="px-3 py-3">
      <div className="mb-3 flex items-center gap-2">
        <button
          type="button"
          onClick={onBack}
          className="-ml-1 flex size-7 items-center justify-center rounded-full text-[#2b2926] hover:bg-[#f7f3ee]"
          title="Quay lại"
        >
          <ChevronLeftIcon />
        </button>
        <div className="min-w-0 flex-1 truncate text-[11px] font-bold text-[#2b2926]">{section.label}</div>
      </div>
      <div className="grid grid-cols-4 gap-x-1 gap-y-2">
        {section.items.map((item) => (
          <ShapeButton key={item.id} title={item.label} onClick={() => onAdd(item)}>
            <ShapePreview item={item} />
          </ShapeButton>
        ))}
      </div>
    </div>
  );
}

function RailButton({ tabId, tab, label, icon, disabled, onClick }: {
  tabId: Exclude<Tab, null>;
  tab: Tab;
  label: string;
  icon: ReactNode;
  disabled: boolean;
  onClick: () => void;
}) {
  const active = tab === tabId;
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      title={label}
      className={`flex size-9 items-center justify-center rounded-[14px] transition-colors disabled:pointer-events-none disabled:opacity-40 ${
        active ? "bg-[#f6eadf] text-[#d97757]" : "text-[#b8aea5] hover:bg-[#f7f3ee] hover:text-[#4f4943]"
      }`}
    >
      {icon}
    </button>
  );
}

export function LeftPanel({
  activeTool,
  onToolChange,
  drawColor,
  onDrawColorChange,
  drawSize,
  onDrawSizeChange,
}: LeftPanelProps) {
  const [tab, setTab] = useState<Tab>("shapes");
  const [urlInput, setUrlInput] = useState("");
  const [query, setQuery] = useState("");
  const [allShapesSectionId, setAllShapesSectionId] = useState<string | null>(null);
  const [remoteIcons, setRemoteIcons] = useState<string[]>([]);
  const [remoteState, setRemoteState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const fileRef = useRef<HTMLInputElement>(null);
  const addElement = useEditorStore((s) => s.addElement);
  const slideBg = useEditorStore((s) => s.slides.find((sl) => sl.id === s.currentSlideId)?.bg ?? "#ffffff");
  const currentSlideLocked = useEditorStore((s) =>
    isSlideLockedForGeneration(s.slides.find((sl) => sl.id === s.currentSlideId)),
  );
  const setSlideBackground = useEditorStore((s) => s.setSlideBackground);
  const visibleTab = currentSlideLocked ? null : tab;
  const trimmedQuery = query.trim();
  const allShapesSection = SHAPE_SECTIONS.find((section) => section.id === allShapesSectionId) ?? null;

  const filteredLocalSections = useMemo(() => {
    const q = trimmedQuery.toLowerCase();
    if (!q) return SHAPE_SECTIONS;
    return SHAPE_SECTIONS
      .map((section) => ({
        ...section,
        items: section.items.filter((item) => `${item.id} ${item.label}`.toLowerCase().includes(q)),
      }))
      .filter((section) => section.items.length > 0);
  }, [trimmedQuery]);

  useEffect(() => {
    const q = trimmedQuery;
    if (visibleTab !== "shapes" || q.length < 2) return;

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setRemoteState("loading");
      try {
        const params = new URLSearchParams({
          query: q,
          limit: String(ICONIFY_LIMIT),
          prefixes: ICONIFY_PREFIXES,
        });
        const res = await fetch(`https://api.iconify.design/search?${params.toString()}`, {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(`Icon search failed: ${res.status}`);
        const data = (await res.json()) as IconifySearchResponse;
        setRemoteIcons((data.icons ?? []).slice(0, ICONIFY_LIMIT));
        setRemoteState("ready");
      } catch {
        if (!controller.signal.aborted) {
          setRemoteIcons([]);
          setRemoteState("error");
        }
      }
    }, 350);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [trimmedQuery, visibleTab]);


  function addShapeItem(item: ShapePaletteItem) {
    if (currentSlideLocked) return;
    if (item.kind === "primitive") {
      addElement(makeByType(item.type, item.extra));
      return;
    }
    addElement(
      makePoly({
        svgPath: item.path,
        svgViewBox: item.viewBox ?? "0 0 100 100",
        shapeId: item.id,
        fill: item.defaultFill ?? "#2b2926",
        stroke: item.defaultStroke ?? "transparent",
        strokeW: item.defaultStroke ? 2 : 0,
      }),
    );
  }

  function addParsedSvgLine(parsed: ParsedSvgLine) {
    const safeW = Math.max(1, parsed.viewBoxW || Math.abs(parsed.x2 - parsed.x1) || 100);
    const safeH = Math.max(1, parsed.viewBoxH || Math.abs(parsed.y2 - parsed.y1) || 1);
    const maxSize = 160;
    const scale = maxSize / Math.max(safeW, safeH);
    const x1 = (parsed.x1 - parsed.viewBoxMinX) * scale;
    const y1 = (parsed.y1 - parsed.viewBoxMinY) * scale;
    const x2 = (parsed.x2 - parsed.viewBoxMinX) * scale;
    const y2 = (parsed.y2 - parsed.viewBoxMinY) * scale;
    const minX = Math.min(x1, x2);
    const minY = Math.min(y1, y2);
    const w = Math.max(1, Math.abs(x2 - x1));
    const h = Math.max(1, Math.abs(y2 - y1));
    const line: LineElement = {
      ...makeLine("line"),
      x: CANVAS_W / 2 - w / 2,
      y: CANVAS_H / 2 - h / 2,
      w,
      h,
      x1: CANVAS_W / 2 - w / 2 + x1 - minX,
      y1: CANVAS_H / 2 - h / 2 + y1 - minY,
      x2: CANVAS_W / 2 - w / 2 + x2 - minX,
      y2: CANVAS_H / 2 - h / 2 + y2 - minY,
      stroke: parsed.stroke,
      strokeW: parsed.strokeW,
      dashStyle: "solid",
      arrowHead: "none",
    };
    addElement(line);
  }
  function addParsedSvgShape(parsed: ParsedSvgShape, shapeId: string) {
    const safeW = Math.max(1, parsed.viewBoxW || 100);
    const safeH = Math.max(1, parsed.viewBoxH || 100);
    const maxSize = 128;
    const scale = maxSize / Math.max(safeW, safeH);
    const w = Math.max(24, Math.round(safeW * scale));
    const h = Math.max(24, Math.round(safeH * scale));

    addElement(
      makePoly({
        svgPath: parsed.svgPath,
        svgViewBox: parsed.svgViewBox,
        shapeId,
        fill: parsed.fill,
        stroke: parsed.stroke,
        strokeW: parsed.strokeW,
        strokeLinecap: parsed.strokeLinecap,
        strokeLinejoin: parsed.strokeLinejoin,
        w,
        h,
        x: CANVAS_W / 2 - w / 2,
        y: CANVAS_H / 2 - h / 2,
      }),
    );
  }

  function addSvgTextAsShape(svgText: string, shapeId: string): boolean {
    const parsedLine = parseSvgToLine(svgText);
    if (parsedLine) {
      addParsedSvgLine(parsedLine);
      return true;
    }

    const parsed = parseSvgToPoly(svgText);
    if (!parsed) return false;
    addParsedSvgShape(parsed, shapeId);
    return true;
  }

  function addRasterImageSized(src: string) {
    const img = new Image();
    img.onload = () => {
      const r = img.naturalHeight / img.naturalWidth;
      const w = Math.min(480, img.naturalWidth || 320);
      const h = Math.round(w * r) || 240;
      addElement({ ...makeImage(src), w, h, x: CANVAS_W / 2 - w / 2, y: CANVAS_H / 2 - h / 2 });
    };
    img.onerror = () =>
      addElement({ ...makeImage(src), w: 320, h: 240, x: CANVAS_W / 2 - 160, y: CANVAS_H / 2 - 120 });
    img.src = src;
  }

  function addSvgUrlOrFallback(src: string, shapeId: string) {
    void (async () => {
      try {
        const res = await fetch(src);
        if (res.ok && addSvgTextAsShape(await res.text(), shapeId)) return;
      } catch {
        // Keep the import usable when a remote SVG cannot be fetched or parsed.
      }
      addRasterImageSized(src);
    })();
  }

  function addRemoteIcon(icon: string) {
    if (currentSlideLocked) return;
    addSvgUrlOrFallback(iconifySvgUrl(icon, 256), icon);
  }

  function addImageSized(src: string) {
    if (currentSlideLocked) return;

    const inlineSvg = svgTextFromDataUri(src);
    if (inlineSvg && addSvgTextAsShape(inlineSvg, "uploaded-svg")) return;

    if (isLikelySvgSource(src)) {
      addSvgUrlOrFallback(src, "imported-svg");
      return;
    }

    addRasterImageSized(src);
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    if (currentSlideLocked) return;
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => addImageSized(ev.target?.result as string);
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  function addImageFromUrl() {
    if (currentSlideLocked) return;
    const src = urlInput.trim();
    if (!src) return;
    addImageSized(src);
    setUrlInput("");
  }

  function addSimulation(molecule: Molecule) {
    if (currentSlideLocked) return;
    addElement(makeByType("simulation", { molecule }));
  }
  return (
    <div className="flex shrink-0 border-r border-[#e8e2d9] bg-white">
      <input ref={fileRef} type="file" accept="image/*,.svg" onChange={onFile} className="hidden" />

      <nav className="flex w-12 shrink-0 flex-col items-center gap-0.5 border-r border-[#e8e2d9] px-1.5 py-3">
        {ICON_TABS.map((t) => (
          <RailButton
            key={t.id}
            tabId={t.id}
            tab={visibleTab}
            label={t.label}
            icon={t.icon}
            disabled={currentSlideLocked}
            onClick={() => setTab(visibleTab === t.id ? null : t.id)}
          />
        ))}
        <div className="flex-1" />
      </nav>

      {visibleTab && (
        <aside className="scrollbar-none w-[216px] shrink-0 overflow-y-auto border-r border-[#e8e2d9] bg-white">
          {visibleTab === "shapes" && allShapesSection && !trimmedQuery ? (
            <AllShapesView section={allShapesSection} onBack={() => setAllShapesSectionId(null)} onAdd={addShapeItem} />
          ) : visibleTab === "shapes" ? (
            <div className="px-3 py-3">
              <div className="mb-3 flex items-center gap-2 text-[11px] font-bold text-[#2b2926]">
                <button
                  type="button"
                  onClick={() => setTab(null)}
                  className="-ml-1 flex size-7 items-center justify-center rounded-full text-[#2b2926] hover:bg-[#f7f3ee]"
                  title="Đóng bảng"
                >
                  <ChevronLeftIcon />
                </button>
                Hình dạng
              </div>

              <div className="mb-2 flex h-10 items-center gap-2 rounded-[10px] border border-[#e8e2d9] bg-[#fbfaf8] px-2 text-[#d97757] shadow-[0_1px_4px_rgba(43,41,38,0.04)]">
                <SearchIcon />
                <input
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setAllShapesSectionId(null);
                  }}
                  placeholder="Tìm icon hoặc shape..."
                  className="min-w-0 flex-1 bg-transparent text-[11px] text-[#4f4943] placeholder:text-[#b8aea5] outline-none"
                />
              </div>

              <button
                type="button"
                onClick={() => {
                  setAllShapesSectionId(null);
                  setQuery((value) => value.trim());
                }}
                className="mb-4 h-8 w-full rounded-[8px] bg-[#d97757] px-3 text-[11px] font-semibold text-white shadow-[0_4px_10px_rgba(217,119,87,0.22)] hover:bg-[#c86547]"
              >
                Tìm kiếm
              </button>

              {trimmedQuery ? (
                <div>
                  {filteredLocalSections.length > 0 && (
                    <section className="mb-4">
                      <SectionHeader label="Trong thư viện" />
                      <div className="grid grid-cols-4 gap-x-1 gap-y-2">
                        {filteredLocalSections.flatMap((section) => section.items).slice(0, 32).map((item) => (
                          <ShapeButton key={`${item.kind}-${item.id}`} title={item.label} onClick={() => addShapeItem(item)}>
                            <ShapePreview item={item} />
                          </ShapeButton>
                        ))}
                      </div>
                    </section>
                  )}

                  <section className="mb-4">
                    <SectionHeader label="Icon SVG từ API" />
                    {trimmedQuery.length >= 2 && remoteState === "loading" && <div className="py-5 text-center text-[11px] text-[#8a8178]">Đang tìm icon...</div>}
                    {trimmedQuery.length >= 2 && remoteState === "error" && <div className="py-5 text-center text-[11px] text-[#8a8178]">Không tải được icon API</div>}
                    {trimmedQuery.length >= 2 && remoteState === "ready" && remoteIcons.length === 0 && <div className="py-5 text-center text-[11px] text-[#8a8178]">Không có kết quả</div>}
                    {remoteIcons.length > 0 && (
                      <div className="grid grid-cols-4 gap-x-1 gap-y-2">
                        {remoteIcons.map((icon) => (
                          <RemoteIconButton key={icon} icon={icon} onClick={() => addRemoteIcon(icon)} />
                        ))}
                      </div>
                    )}
                  </section>
                </div>
              ) : (
                SHAPE_SECTIONS.map((section) => (
                  <ShapeCarouselSection
                    key={section.id}
                    section={section}
                    onViewAll={() => setAllShapesSectionId(section.id)}
                    onAdd={addShapeItem}
                  />
                ))
              )}
            </div>
          ) : null}

          {visibleTab === "text" && (
            <div className="space-y-2 p-3">
              <div className="mb-3 text-[10px] font-bold uppercase tracking-[1px] text-[#2b2926]">Text</div>
              {TEXT_PRESETS.map((t, i) => (
                <button
                  key={i}
                  onClick={() =>
                    addElement(
                      makeByType("text", {
                        text: t.label,
                        fontSize: t.fontSize,
                        bold: t.bold,
                        italic: t.italic ?? false,
                        color: t.color ?? "#2b2926",
                        w: 360,
                        h: Math.max(60, t.fontSize * 1.6),
                      }),
                    )
                  }
                  className="w-full rounded-[8px] px-3 py-2 text-left transition-colors hover:bg-[#f7f3ee]"
                  style={{
                    fontSize: Math.min(t.fontSize, 24),
                    fontWeight: t.bold ? 700 : 400,
                    fontStyle: t.italic ? "italic" : "normal",
                    color: t.color ?? "#2b2926",
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>
          )}

          {visibleTab === "upload" && (
            <div className="space-y-3 p-3">
              <div className="mb-3 text-[10px] font-bold uppercase tracking-[1px] text-[#2b2926]">Upload</div>
              <button
                onClick={() => fileRef.current?.click()}
                className="w-full rounded-[10px] border border-dashed border-[#d8d1c9] py-6 text-center text-xs text-[#8a8178] transition-colors hover:border-[#d97757] hover:text-[#4f4943]"
              >
                Choose image
              </button>
              <div>
                <div className="mb-1 text-[10px] uppercase text-[#8a8178]">Image URL</div>
                <div className="flex gap-1">
                  <input
                    type="text"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addImageFromUrl()}
                    placeholder="https://..."
                    className="min-w-0 flex-1 rounded-[8px] border border-[#e8e2d9] bg-[#fbfaf8] px-2 py-1 text-xs text-[#2b2926] placeholder:text-[#b8aea5] focus:border-[#d97757] focus:outline-none"
                  />
                  <button onClick={addImageFromUrl} className="rounded-[8px] bg-[#2b2926] px-2.5 text-xs text-white">
                    +
                  </button>
                </div>
              </div>
            </div>
          )}

          {visibleTab === "simulation" && (
            <div className="p-3">
              <div className="mb-1 text-[10px] font-bold uppercase tracking-[1px] text-[#2b2926]">Mô phỏng phân tử</div>
              <p className="mb-3 text-[10px] text-[#8a8178]">Chèn mô hình 3D — có thể nhấn để tương tác khi trình chiếu.</p>
              <div className="grid grid-cols-2 gap-2">
                {MOLECULE_CATALOG.map((molecule) => (
                  <button
                    key={molecule.name}
                    onClick={() => addSimulation(molecule)}
                    title={`${molecule.name} (${molecule.formula})`}
                    className="flex flex-col items-center gap-1 rounded-[10px] border border-[#e8e2d9] bg-white px-2 py-3 text-center transition-colors hover:border-[#d97757] hover:bg-[#fbfaf8]"
                  >
                    <span className="text-xl" aria-hidden>🧪</span>
                    <span className="truncate text-[11px] font-medium text-[#2b2926]">{molecule.name}</span>
                    <span className="text-[10px] text-[#8a8178]">{molecule.formula}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {visibleTab === "tools" && (
            <div className="p-3">
              <div className="mb-3 text-[10px] font-bold uppercase tracking-[1px] text-[#2b2926]">Tools</div>
              <div className="mb-3 grid grid-cols-2 gap-1.5">
                <button
                  onClick={() => onToolChange("select")}
                  className={`rounded-[8px] py-2 text-[11px] ${activeTool === "select" ? "bg-[#f6eadf] text-[#d97757]" : "text-[#4f4943] hover:bg-[#f7f3ee]"}`}
                >
                  Select
                </button>
                {DRAW_TOOLS.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => onToolChange(activeTool === t.id ? "select" : t.id)}
                    className={`rounded-[8px] py-2 text-[11px] ${activeTool === t.id ? "bg-[#f6eadf] text-[#d97757]" : "text-[#4f4943] hover:bg-[#f7f3ee]"}`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {activeTool !== "select" && (
                <div className="mb-3 space-y-2 rounded-[10px] bg-[#f7f3ee] p-2.5">
                  {activeTool !== "eraser" && (
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-[#4f4943]">Stroke</span>
                      <ColorPicker value={drawColor} onChange={onDrawColorChange} allowGradient={false} allowTransparent={false} />
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-[#4f4943]">Size</span>
                    <input
                      type="range"
                      min={1}
                      max={activeTool === "eraser" ? 80 : 50}
                      value={drawSize}
                      onChange={(e) => onDrawSizeChange(Number(e.target.value))}
                      className="min-w-0 flex-1 accent-[#d97757]"
                    />
                    <span className="w-6 text-right text-[11px] text-[#8a8178]">{drawSize}</span>
                  </div>
                </div>
              )}

              <SectionHeader label="Shortcuts" />
              <div className="space-y-1">
                {SHORTCUTS.map(([label, key], i) => (
                  <div key={i} className="flex items-center justify-between gap-2 rounded px-1.5 py-1 text-[11px]">
                    <span className="text-[#4f4943]">{label}</span>
                    <kbd className="shrink-0 rounded border border-[#e8e2d9] bg-[#f7f3ee] px-1.5 py-0.5 text-[10px] text-[#8a8178]">
                      {key}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          )}

          {visibleTab === "bg" && (
            <div className="space-y-3 p-3">
              <div className="mb-3 text-[10px] font-bold uppercase tracking-[1px] text-[#2b2926]">Background</div>
              <div className="flex items-center justify-between rounded-[10px] bg-[#f7f3ee] p-2.5">
                <span className="text-[11px] text-[#4f4943]">Fill</span>
                <ColorPicker value={slideBg} onChange={(v) => setSlideBackground(v)} />
              </div>
              <div>
                <div className="mb-1.5 text-[10px] uppercase text-[#8a8178]">Quick colors</div>
                <div className="grid grid-cols-6 gap-1.5">
                  {BG_PRESETS.map((c) => (
                    <button
                      key={c}
                      onClick={() => setSlideBackground(c)}
                      title={c}
                      className={`aspect-square rounded-[6px] border transition-transform hover:scale-110 ${
                        slideBg === c ? "border-[#2b2926] ring-1 ring-[#2b2926]" : "border-[#e8e2d9]"
                      }`}
                      style={{ background: c }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
        </aside>
      )}
    </div>
  );
}
