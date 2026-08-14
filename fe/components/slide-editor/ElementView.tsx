import { useState, type CSSProperties, type MouseEventHandler, type ReactElement } from "react";
import dynamic from "next/dynamic";
import type { SlideElement, SimulationElement, LineMarker, DashStyle } from "./types";
import { isGradientCss } from "./lib/gradient";
import { sandboxViewZoom } from "./lib/sandbox-scale";
import { ELEMENTS } from "@/components/periodic-table/data";
import { CATEGORY_COLORS } from "@/components/periodic-table/types";
import type { Element as PeriodicElement } from "@/components/periodic-table/types";
import { defaultPeriodicSimulationElement } from "./lib/periodic-selection";
import { normalizedLetterSpacing } from "./lib/text-spacing";

const MoleculeViewer = dynamic(
  () => import("@/components/molecules/MoleculeViewer").then((m) => m.MoleculeViewer),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center text-xs text-white/70">
        Đang tải mô phỏng...
      </div>
    ),
  }
);

// Sandpack đụng window/iframe ngay khi mount → phải tắt prerender, giống lý do
// ở components/sandbox/SandboxClient.tsx.
const SandboxSimulationView = dynamic(
  () => import("./SandboxSimulationView").then((m) => m.SandboxSimulationView),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center text-xs text-white/70">
        Đang nạp thí nghiệm…
      </div>
    ),
  }
);

// Ảnh thu nhỏ thí nghiệm: hàm thuần nhưng file dài hơn 3400 dòng SVG, nên nạp
// tách chunk để editor không phải cõng nó khi deck không có element sandbox.
const Thumb = dynamic(
  () => import("@/components/simulations/shared/simulation-thumb").then((m) => m.Thumb),
  { ssr: false, loading: () => null }
);

function elementsForSimulation(el: SimulationElement): PeriodicElement[] {
  if (el.kind !== "periodic-element" && el.kind !== "periodic-table") return [];
  const requested = new Set(el.periodic.elementSymbols);
  return ELEMENTS.filter((element) => requested.has(element.symbol));
}

function PeriodicElementCard({ element }: { element: PeriodicElement }) {
  const colors = CATEGORY_COLORS[element.category];
  return (
    <div className="flex h-full w-full flex-col justify-between rounded-2xl border p-4 text-[#26231f]" style={{ background: colors.bg, borderColor: colors.border }}>
      <div className="flex items-start justify-between gap-3">
        <span className="text-sm font-semibold">{element.atomicNumber}</span>
        <span className="rounded-full bg-white/70 px-2 py-0.5 text-[10px] font-semibold">{colors.label}</span>
      </div>
      <div className="text-center">
        <div className="font-serif text-6xl font-bold leading-none">{element.symbol}</div>
        <div className="mt-2 text-sm font-semibold">{element.nameVi || element.name}</div>
        <div className="text-xs opacity-75">{element.name}</div>
      </div>
      <div className="grid grid-cols-2 gap-2 text-[11px]">
        <span>Chu kỳ {element.period}</span>
        <span>Nhóm {element.group ?? "-"}</span>
        <span className="col-span-2 truncate">e: {element.electronConfig}</span>
      </div>
    </div>
  );
}

function PeriodicMiniTable({ highlighted, focus }: { highlighted: PeriodicElement[]; focus?: string }) {
  const highlightedNumbers = new Set(highlighted.map((element) => element.atomicNumber));
  return (
    <div className="flex h-full w-full flex-col rounded-2xl border border-[#d8d1c9] bg-[#fbfaf8] p-3 text-[#2b2926]">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="truncate text-xs font-bold">{focus || "Bảng tuần hoàn"}</span>
        <span className="shrink-0 text-[10px] text-[#8a8178]">{highlighted.length} nguyên tố</span>
      </div>
      <div className="grid flex-1 grid-cols-[repeat(18,minmax(0,1fr))] grid-rows-[repeat(10,minmax(0,1fr))] gap-[2px]">
        {ELEMENTS.map((element) => {
          const active = highlightedNumbers.has(element.atomicNumber);
          const colors = CATEGORY_COLORS[element.category];
          return (
            <div
              key={element.symbol}
              className="flex min-h-0 min-w-0 items-center justify-center rounded-[3px] border text-[8px] font-bold"
              style={{
                gridColumn: element.gridCol,
                gridRow: element.gridRow,
                background: active ? colors.bg : "#ffffff",
                borderColor: active ? colors.border : "#e8e2d9",
                color: active ? colors.text : "#b7aea5",
                opacity: active ? 1 : 0.48,
              }}
              title={`${element.atomicNumber}. ${element.nameVi || element.name}`}
            >
              {element.symbol}
            </div>
          );
        })}
      </div>
      <div className="mt-2 truncate text-[10px] text-[#6c6259]">
        {highlighted.map((element) => element.symbol).join(", ")}
      </div>
    </div>
  );
}

function PeriodicVisual({ el }: { el: SimulationElement }) {
  if (el.kind !== "periodic-element" && el.kind !== "periodic-table") return null;
  const elements = elementsForSimulation(el);
  if (el.kind === "periodic-element" && elements[0]) return <PeriodicElementCard element={elements[0]} />;
  return <PeriodicMiniTable highlighted={elements} focus={el.periodic.focus} />;
}

/** Nhãn hiện trên poster khi mô phỏng chưa được kích hoạt. */
function simulationPosterLabels(el: SimulationElement): { title: string; subtitle: string } {
  if (el.kind === "molecule") return { title: el.molecule.name, subtitle: el.molecule.formula };
  if (el.kind === "sandbox") return { title: el.title, subtitle: "Thí nghiệm vật lý" };
  return {
    title: el.periodic.focus || "Bảng tuần hoàn",
    subtitle: el.periodic.elementSymbols.join(", "),
  };
}

function SimulationBlock({
  el,
  interactive,
  previewLive,
  sandboxActive,
  onSelectPeriodicElement,
  style,
  onMouseDown,
  onDoubleClick,
  onContextMenu,
}: {
  el: SimulationElement;
  interactive?: boolean;
  previewLive?: boolean;
  /** Người dùng đã bấm "Chạy thử" cho element này trong editor. */
  sandboxActive?: boolean;
  /** Opens a highlighted element detail view in the presentation overlay. */
  onSelectPeriodicElement?: (element: PeriodicElement) => void;
  style: CSSProperties;
  onMouseDown?: MouseEventHandler;
  onDoubleClick?: MouseEventHandler;
  onContextMenu?: MouseEventHandler;
}) {
  const [activated, setActivated] = useState(false);
  const isPeriodic = el.kind === "periodic-element" || el.kind === "periodic-table";
  const showLiveViewer = el.kind === "molecule" && Boolean(previewLive || (interactive && activated));
  const showPeriodicViewer = isPeriodic && Boolean(previewLive || (interactive && activated));
  /**
   * Sandbox KHÔNG bao giờ tự chạy theo `previewLive` như molecule/periodic.
   * Hai loại kia render tại chỗ và rẻ; sandbox thì bung một iframe bundler tải
   * từ codesandbox.io, nên mở deck có ba slide sandbox sẽ là ba iframe cùng
   * lúc. Luôn đòi một hành động rõ ràng: bấm khi trình chiếu, hoặc nút
   * "Chạy thử" trong editor.
   */
  // `experimentId` rỗng = placeholder từ Bước 2 mà Bước 3 không phân giải được
  // preset nào. Không cho kích hoạt: gọi API với id rỗng sẽ nhận về danh mục
  // chứ không phải một thí nghiệm.
  const sandboxResolved = el.kind === "sandbox" && el.experimentId.length > 0;
  const showSandboxViewer = sandboxResolved && Boolean(sandboxActive || (interactive && activated));
  const handleInteractiveClick = () => {
    if (isPeriodic && onSelectPeriodicElement) {
      const element = defaultPeriodicSimulationElement(el.periodic);
      if (element) onSelectPeriodicElement(element);
      return;
    }

    if (el.kind !== "sandbox" || sandboxResolved) setActivated(true);
  };

  if (showSandboxViewer && el.kind === "sandbox") {
    // Khung slide thấp hơn nhiều so với cửa sổ mà giao diện thí nghiệm được
    // dựng cho, nên cấp cho iframe một viewport logic lớn hơn rồi thu tỉ lệ về
    // đúng khung: diện tích giữ nguyên, nội dung nhỏ lại và hết cuộn.
    const zoom = sandboxViewZoom(el.w, el.h);
    return (
      <div
        onMouseDown={previewLive ? onMouseDown : undefined}
        onDoubleClick={previewLive ? onDoubleClick : undefined}
        onContextMenu={previewLive ? onContextMenu : undefined}
        style={{ ...style, cursor: previewLive ? style.cursor : "auto" }}
        className="overflow-hidden rounded-2xl bg-slate-900"
      >
        <div
          style={{
            width: `${100 / zoom}%`,
            height: `${100 / zoom}%`,
            transform: `scale(${zoom})`,
            transformOrigin: "top left",
          }}
        >
          <SandboxSimulationView key={el.experimentId} experimentId={el.experimentId} />
        </div>
      </div>
    );
  }

  if (showPeriodicViewer) {
    return (
      <div
        onMouseDown={previewLive ? onMouseDown : undefined}
        onDoubleClick={previewLive ? onDoubleClick : undefined}
        onContextMenu={previewLive ? onContextMenu : undefined}
        style={{ ...style, cursor: previewLive ? style.cursor : "auto" }}
        className="overflow-hidden rounded-2xl bg-white"
      >
        <PeriodicVisual el={el} />
      </div>
    );
  }

  if (showLiveViewer) {
    return (
      <div
        onMouseDown={previewLive ? onMouseDown : undefined}
        onDoubleClick={previewLive ? onDoubleClick : undefined}
        onContextMenu={previewLive ? onContextMenu : undefined}
        style={{ ...style, cursor: previewLive ? style.cursor : "auto" }}
        className="overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 to-slate-700"
      >
        <div className={previewLive ? "pointer-events-none h-full w-full" : "h-full w-full"}>
          <MoleculeViewer molecule={el.molecule} mode={el.mode} rotating={el.rotating} />
        </div>
      </div>
    );
  }

  const labels = simulationPosterLabels(el);
  return (
    <div
      onMouseDown={onMouseDown}
      onDoubleClick={onDoubleClick}
      onContextMenu={onContextMenu}
      onClick={interactive ? handleInteractiveClick : undefined}
      role={interactive ? "button" : undefined}
      style={{ ...style, cursor: interactive ? "pointer" : style.cursor }}
      className="relative flex select-none flex-col items-center justify-center gap-2 overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900 to-slate-700 text-white"
    >
      {el.kind === "sandbox" ? (
        <>
          {/* Ảnh thu nhỏ khoá theo `presetId` (id preset tự khai), KHÔNG phải
              tên file — 13 preset có hai giá trị này khác nhau. */}
          <div className="absolute inset-0 opacity-70">
            <Thumb id={el.presetId} />
          </div>
          <div className="relative flex flex-col items-center gap-1 bg-slate-950/60 px-3 py-2 text-center">
            <span className="text-sm font-semibold">{labels.title}</span>
            <span className="text-xs text-white/70">
              {sandboxResolved ? labels.subtitle : "Chưa gán được thí nghiệm"}
            </span>
            {interactive && sandboxResolved && <span className="text-[11px] text-white/80">▶ Nhấn để mô phỏng</span>}
          </div>
        </>
      ) : (
        <>
          <span className="text-3xl" aria-hidden>🧪</span>
          <span className="px-2 text-center text-sm font-semibold">{labels.title}</span>
          <span className="text-xs text-white/70">{labels.subtitle}</span>
          {interactive && <span className="mt-1 text-[11px] text-white/80">▶ Nhấn để mô phỏng</span>}
        </>
      )}
    </div>
  );
}

interface ElementViewProps {
  el: SlideElement;
  hideText?: boolean;
  /** True only in live presentation — enables click-to-activate simulations. */
  interactive?: boolean;
  /** Render live simulations in the main editor canvas while keeping thumbnails lightweight. */
  simulationPreview?: boolean;
  /** Element sandbox này đã được bấm "Chạy thử" trong editor. */
  sandboxActive?: boolean;
  /** Receives the highlighted periodic element selected during presentation. */
  onSelectPeriodicElement?: (element: PeriodicElement) => void;
  onMouseDown?: MouseEventHandler;
  onDoubleClick?: MouseEventHandler;
  onContextMenu?: MouseEventHandler;
}

function dashArray(dash: DashStyle | undefined): string | undefined {
  if (dash === "dashed") return "12 5";
  if (dash === "dotted") return "3 5";
  if (dash === "fine") return "1.5 3";
  return undefined;
}

// Marker SVG cho 2 đầu line/arrow. orient theo hướng line (auto / auto-start-reverse).
function markerDef(
  id: string,
  style: LineMarker,
  color: string,
  isStart: boolean
): ReactElement | null {
  const orient = isStart ? "auto-start-reverse" : "auto";
  switch (style) {
    case "arrow":
      return (
        <marker key={id} id={id} markerWidth="10" markerHeight="8" refX={isStart ? 1 : 9} refY="4" orient={orient} markerUnits="strokeWidth">
          <path d="M0,0 L10,4 L0,8 Z" fill={color} />
        </marker>
      );
    case "bar":
      return (
        <marker key={id} id={id} markerWidth="4" markerHeight="14" refX="2" refY="7" orient="auto" markerUnits="strokeWidth">
          <line x1="2" y1="0.5" x2="2" y2="13.5" stroke={color} strokeWidth="2" strokeLinecap="round" />
        </marker>
      );
    case "square":
      return (
        <marker key={id} id={id} markerWidth="8" markerHeight="8" refX="4" refY="4" orient={orient} markerUnits="strokeWidth">
          <rect x="0" y="0" width="8" height="8" fill={color} />
        </marker>
      );
    case "circle":
      return (
        <marker key={id} id={id} markerWidth="8" markerHeight="8" refX="4" refY="4" orient={orient} markerUnits="strokeWidth">
          <circle cx="4" cy="4" r="4" fill={color} />
        </marker>
      );
    case "diamond":
      return (
        <marker key={id} id={id} markerWidth="10" markerHeight="8" refX="5" refY="4" orient={orient} markerUnits="strokeWidth">
          <path d="M0,4 L5,0 L10,4 L5,8 Z" fill={color} />
        </marker>
      );
    case "square-open":
      return (
        <marker key={id} id={id} markerWidth="9" markerHeight="9" refX="4.5" refY="4.5" orient={orient} markerUnits="strokeWidth">
          <rect x="0.5" y="0.5" width="8" height="8" fill="white" stroke={color} strokeWidth="1.5" />
        </marker>
      );
    case "circle-open":
      return (
        <marker key={id} id={id} markerWidth="9" markerHeight="9" refX="4.5" refY="4.5" orient={orient} markerUnits="strokeWidth">
          <circle cx="4.5" cy="4.5" r="4" fill="white" stroke={color} strokeWidth="1.5" />
        </marker>
      );
  }
}

export function ElementView({
  el,
  hideText,
  interactive,
  simulationPreview,
  sandboxActive,
  onSelectPeriodicElement,
  onMouseDown,
  onDoubleClick,
  onContextMenu,
}: ElementViewProps) {
  if (el.hidden) return null;

  const base: CSSProperties = {
    position: "absolute",
    left: el.x,
    top: el.y,
    width: el.w,
    height: el.h,
    transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined,
    opacity: el.opacity,
    zIndex: el.zIndex,
    cursor: "move",
  };

  if (el.type === "text") {
    const decoration =
      [el.underline && "underline", el.strikethrough && "line-through"]
        .filter(Boolean)
        .join(" ") || "none";
    const cssTransform =
      el.textTransform === "capitalize-words" ? "capitalize" : el.textTransform ?? "none";
    const textStyle: CSSProperties = {
      fontFamily: el.fontFamily,
      fontSize: el.fontSize,
      fontWeight: el.bold ? 700 : 400,
      fontStyle: el.italic ? "italic" : "normal",
      textDecoration: decoration,
      color: el.color,
      textAlign: el.align,
      lineHeight: el.lineHeight ?? 1.2,
      letterSpacing: `${normalizedLetterSpacing(el.letterSpacing)}px`,
      textTransform: cssTransform as CSSProperties["textTransform"],
      textShadow: el.textShadow,
      wordBreak: "break-word",
      overflowWrap: "anywhere",
      boxSizing: "border-box",
      padding: "4px 0",
      whiteSpace: "pre-wrap",
    };

    const isList = el.listStyle === "bullet" || el.listStyle === "numbered";
    return (
      <div
        onMouseDown={onMouseDown}
        onDoubleClick={onDoubleClick}
        onContextMenu={onContextMenu}
        style={{
          ...base,
          display: "flex",
          alignItems: isList ? "flex-start" : "center",
          justifyContent:
            el.align === "center" ? "center" : el.align === "right" ? "flex-end" : "flex-start",
          overflow: "visible",
          background: el.textBg,
        }}
      >
        {hideText ? null : isList ? (
          (el.listStyle === "numbered" ? (
            <ol
              style={{
                ...textStyle,
                margin: 0,
                paddingLeft: "1.5em",
                listStyleType: "decimal",
                width: "100%",
              }}
            >
              {(el.text || "").split("\n").map((line, i) => (
                <li key={i}>{line || " "}</li>
              ))}
            </ol>
          ) : (
            <ul
              style={{
                ...textStyle,
                margin: 0,
                paddingLeft: "1.5em",
                listStyleType: "disc",
                width: "100%",
              }}
            >
              {(el.text || "").split("\n").map((line, i) => (
                <li key={i}>{line || " "}</li>
              ))}
            </ul>
          ))
        ) : (
          <span style={{ ...textStyle, width: "100%", display: "block" }}>{el.text}</span>
        )}
      </div>
    );
  }

  if (el.type === "shape") {
    const borderStyle = el.dashStyle === "dashed" ? "dashed" : el.dashStyle === "dotted" || el.dashStyle === "fine" ? "dotted" : "solid";
    return (
      <div
        onMouseDown={onMouseDown}
        onDoubleClick={onDoubleClick}
        onContextMenu={onContextMenu}
        style={{
          ...base,
          background: el.fill,
          borderWidth: el.strokeW || 0,
          borderColor: el.stroke,
          borderStyle,
          borderRadius: el.shape === "ellipse" ? "50%" : el.borderRadius,
        }}
      />
    );
  }

  if (el.type === "poly") {
    const vb = el.svgViewBox || "0 0 100 100";
    const fillIsGrad = isGradientCss(el.fill);
    const da = dashArray(el.dashStyle);
    const maskSvg =
      fillIsGrad && el.svgPath
        ? `url("data:image/svg+xml,${encodeURIComponent(
            `<svg xmlns='http://www.w3.org/2000/svg' viewBox='${vb}'><path d='${el.svgPath}' fill-rule='evenodd'/></svg>`
          )}")`
        : undefined;
    return (
      <div
        onMouseDown={onMouseDown}
        onDoubleClick={onDoubleClick}
        onContextMenu={onContextMenu}
        style={base}
      >
        <svg
          width="100%"
          height="100%"
          viewBox={vb}
          preserveAspectRatio="none"
          style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
        >
          {el.svgPath && (
            <path
              d={el.svgPath}
              fill={fillIsGrad ? "none" : el.fill !== "transparent" ? el.fill : "none"}
              stroke={el.stroke !== "transparent" ? el.stroke : "none"}
              strokeWidth={el.strokeW || 0}
              strokeDasharray={da}
              strokeLinecap={el.strokeLinecap}
              strokeLinejoin={el.strokeLinejoin}
              fillRule="evenodd"
            />
          )}
        </svg>
        {fillIsGrad && maskSvg && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: el.fill,
              WebkitMaskImage: maskSvg,
              WebkitMaskSize: "100% 100%",
              maskImage: maskSvg,
              maskSize: "100% 100%",
              pointerEvents: "none",
            }}
          />
        )}
        {el.text && !hideText && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent:
                el.align === "center" ? "center" : el.align === "right" ? "flex-end" : "flex-start",
              padding: "4px 8px",
              overflow: "visible",
              fontFamily: el.fontFamily,
              fontSize: el.fontSize,
              fontWeight: el.bold ? 700 : 400,
              fontStyle: el.italic ? "italic" : "normal",
              color: el.color,
              textAlign: el.align,
              wordBreak: "break-word",
              userSelect: "none",
              pointerEvents: "none",
            }}
          >
            {el.text}
          </div>
        )}
      </div>
    );
  }

  if (el.type === "draw") {
    return (
      <svg
        onMouseDown={onMouseDown}
        onContextMenu={onContextMenu}
        width="100%"
        height="100%"
        viewBox={`0 0 ${el.w} ${el.h}`}
        preserveAspectRatio="none"
        style={{ ...base, cursor: "default", overflow: "visible" }}
      >
        <path
          d={el.points || ""}
          fill="none"
          stroke={el.stroke}
          strokeWidth={el.strokeW}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (el.type === "line" || el.type === "arrow") {
    const strokeDasharray = dashArray(el.dashStyle);
    const ms = el.lineMarkerStart;
    const me = el.lineMarkerEnd;
    // arrowHead vẫn dùng khi không đặt marker tùy biến.
    const useArrowEnd = !me && (el.arrowHead === "end" || el.arrowHead === "both");
    const useArrowStart = !ms && el.arrowHead === "both";
    const sId = `ms-${el.id}`;
    const eId = `me-${el.id}`;
    const ahId = `ah-${el.id}`;
    const ahsId = `ahs-${el.id}`;
    return (
      <svg
        onMouseDown={onMouseDown}
        onDoubleClick={onDoubleClick}
        onContextMenu={onContextMenu}
        style={{ ...base, left: 0, top: 0, width: "100%", height: "100%", transform: undefined, overflow: "visible", pointerEvents: "none", cursor: "move" }}
      >
        <defs>
          {ms && markerDef(sId, ms, el.stroke, true)}
          {me && markerDef(eId, me, el.stroke, false)}
          {useArrowEnd && (
            <marker id={ahId} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill={el.stroke} />
            </marker>
          )}
          {useArrowStart && (
            <marker id={ahsId} viewBox="0 0 10 10" refX="1" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
              <path d="M 10 0 L 0 5 L 10 10 z" fill={el.stroke} />
            </marker>
          )}
        </defs>
        {/* hit-line trong suốt cho dễ chọn */}
        <line
          x1={el.x1}
          y1={el.y1}
          x2={el.x2}
          y2={el.y2}
          stroke="transparent"
          strokeWidth={10}
          style={{ pointerEvents: "stroke" as unknown as CSSProperties["pointerEvents"] }}
          onMouseDown={onMouseDown}
          onContextMenu={onContextMenu}
        />
        <line
          x1={el.x1}
          y1={el.y1}
          x2={el.x2}
          y2={el.y2}
          stroke={el.stroke}
          strokeWidth={el.strokeW}
          strokeDasharray={strokeDasharray}
          strokeLinecap="round"
          markerStart={ms ? `url(#${sId})` : useArrowStart ? `url(#${ahsId})` : undefined}
          markerEnd={me ? `url(#${eId})` : useArrowEnd ? `url(#${ahId})` : undefined}
        />
      </svg>
    );
  }

  // image
  if (el.type === "image") {
    const filter =
      [
        el.brightness != null && el.brightness !== 100 && `brightness(${el.brightness}%)`,
        el.contrast != null && el.contrast !== 100 && `contrast(${el.contrast}%)`,
      ]
        .filter(Boolean)
        .join(" ") || undefined;
    const flip =
      [el.flipH && "scaleX(-1)", el.flipV && "scaleY(-1)"].filter(Boolean).join(" ");
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={el.src}
        alt=""
        draggable={false}
        onMouseDown={onMouseDown}
        onDoubleClick={onDoubleClick}
        onContextMenu={onContextMenu}
        style={{
          ...base,
          objectFit: el.fit,
          borderRadius: el.borderRadius,
          filter,
          // gộp flip vào sau rotation hiện có (nếu cả hai cùng có).
          transform: [base.transform, flip].filter(Boolean).join(" ") || undefined,
        }}
      />
    );
  }

  if (el.type === "simulation") {
    return (
      <SimulationBlock
        el={el}
        interactive={interactive}
        previewLive={simulationPreview}
        sandboxActive={sandboxActive}
        onSelectPeriodicElement={onSelectPeriodicElement}
        style={base}
        onMouseDown={onMouseDown}
        onDoubleClick={onDoubleClick}
        onContextMenu={onContextMenu}
      />
    );
  }

  return null;
}
