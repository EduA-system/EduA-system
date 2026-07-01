import type { CSSProperties, MouseEventHandler, ReactElement } from "react";
import type { SlideElement, LineMarker, DashStyle } from "./types";
import { isGradientCss } from "./lib/gradient";

interface ElementViewProps {
  el: SlideElement;
  hideText?: boolean;
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
      letterSpacing: el.letterSpacing != null ? `${el.letterSpacing}px` : undefined,
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
          border: el.strokeW ? `${el.strokeW}px solid ${el.stroke}` : undefined,
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

  return null;
}
