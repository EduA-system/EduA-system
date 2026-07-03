import type { ElementPatch, TextElement } from "../types";

const MIN_TEXT_BOX_HEIGHT = 24;

function textTransformValue(el: TextElement): string {
  return el.textTransform === "capitalize-words" ? "capitalize" : el.textTransform ?? "none";
}

function applyTextStyles(node: HTMLElement, el: TextElement, width: number) {
  Object.assign(node.style, {
    position: "fixed",
    left: "-10000px",
    top: "-10000px",
    visibility: "hidden",
    pointerEvents: "none",
    boxSizing: "border-box",
    width: `${Math.max(1, width)}px`,
    height: "auto",
    minHeight: "0",
    margin: "0",
    border: "0",
    padding: "4px 0",
    fontFamily: el.fontFamily || "Inter, Arial, sans-serif",
    fontSize: `${el.fontSize}px`,
    fontWeight: el.bold ? "700" : "400",
    fontStyle: el.italic ? "italic" : "normal",
    lineHeight: String(el.lineHeight ?? 1.2),
    letterSpacing: el.letterSpacing != null ? `${el.letterSpacing}px` : "normal",
    textAlign: el.align,
    textTransform: textTransformValue(el),
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
    overflowWrap: "anywhere",
  });
}

export function textBoxMinHeight(el: TextElement, width = el.w): number {
  if (typeof document === "undefined" || !document.body) return MIN_TEXT_BOX_HEIGHT;

  const isList = el.listStyle === "bullet" || el.listStyle === "numbered";
  const probe = document.createElement(isList ? (el.listStyle === "numbered" ? "ol" : "ul") : "div");
  applyTextStyles(probe, el, width);

  if (isList) {
    probe.style.paddingLeft = "1.5em";
    probe.style.listStylePosition = "outside";
    const lines = (el.text || " ").split("\n");
    for (const line of lines) {
      const item = document.createElement("li");
      item.textContent = line || " ";
      item.style.margin = "0";
      item.style.padding = "0";
      probe.appendChild(item);
    }
  } else {
    probe.textContent = el.text || " ";
  }

  document.body.appendChild(probe);
  const measured = Math.ceil(probe.scrollHeight);
  probe.remove();

  return Math.max(MIN_TEXT_BOX_HEIGHT, measured);
}

export function ensureTextBoxHeight(el: TextElement, patch: ElementPatch): ElementPatch {
  const next = { ...el, ...patch, type: "text" } as TextElement;
  const nextHeight = typeof patch.h === "number" ? patch.h : next.h;
  const minHeight = textBoxMinHeight(next, next.w);
  return minHeight > nextHeight + 1 ? { ...patch, h: minHeight } : patch;
}