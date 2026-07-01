export interface ParsedSvgShape {
  svgPath: string;
  svgViewBox: string;
  viewBoxW: number;
  viewBoxH: number;
  fill: string;
  stroke: string;
  strokeW: number;
  strokeLinecap?: "butt" | "round" | "square";
  strokeLinejoin?: "miter" | "round" | "bevel";
}

export interface ParsedSvgLine {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  viewBoxMinX: number;
  viewBoxMinY: number;
  viewBoxW: number;
  viewBoxH: number;
  stroke: string;
  strokeW: number;
}

const DEFAULT_VIEWBOX = { minX: 0, minY: 0, w: 100, h: 100 };

function numberFrom(value: string | null | undefined): number | null {
  if (!value) return null;
  const match = value.trim().match(/-?\d*\.?\d+(?:e[-+]?\d+)?/i);
  if (!match) return null;
  const n = Number(match[0]);
  return Number.isFinite(n) ? n : null;
}

function fmt(n: number): string {
  if (!Number.isFinite(n)) return "0";
  return Number(n.toFixed(3)).toString();
}

function parseViewBox(svg: SVGSVGElement) {
  const raw = svg.getAttribute("viewBox");
  if (raw) {
    const nums = raw
      .trim()
      .split(/[\s,]+/)
      .map(Number)
      .filter(Number.isFinite);
    if (nums.length === 4 && nums[2] > 0 && nums[3] > 0) {
      return { minX: nums[0], minY: nums[1], w: nums[2], h: nums[3] };
    }
  }

  const w = numberFrom(svg.getAttribute("width")) ?? DEFAULT_VIEWBOX.w;
  const h = numberFrom(svg.getAttribute("height")) ?? DEFAULT_VIEWBOX.h;
  return {
    minX: DEFAULT_VIEWBOX.minX,
    minY: DEFAULT_VIEWBOX.minY,
    w: w > 0 ? w : DEFAULT_VIEWBOX.w,
    h: h > 0 ? h : DEFAULT_VIEWBOX.h,
  };
}

function attrNumber(el: Element, name: string, fallback = 0): number {
  return numberFrom(el.getAttribute(name)) ?? fallback;
}

function roundedRectPath(x: number, y: number, w: number, h: number, rx: number, ry: number): string {
  if (w <= 0 || h <= 0) return "";
  const rX = Math.min(Math.max(rx, 0), w / 2);
  const rY = Math.min(Math.max(ry || rx, 0), h / 2);
  if (rX === 0 && rY === 0) {
    return `M${fmt(x)} ${fmt(y)} H${fmt(x + w)} V${fmt(y + h)} H${fmt(x)} Z`;
  }
  return [
    `M${fmt(x + rX)} ${fmt(y)}`,
    `H${fmt(x + w - rX)}`,
    `A${fmt(rX)} ${fmt(rY)} 0 0 1 ${fmt(x + w)} ${fmt(y + rY)}`,
    `V${fmt(y + h - rY)}`,
    `A${fmt(rX)} ${fmt(rY)} 0 0 1 ${fmt(x + w - rX)} ${fmt(y + h)}`,
    `H${fmt(x + rX)}`,
    `A${fmt(rX)} ${fmt(rY)} 0 0 1 ${fmt(x)} ${fmt(y + h - rY)}`,
    `V${fmt(y + rY)}`,
    `A${fmt(rX)} ${fmt(rY)} 0 0 1 ${fmt(x + rX)} ${fmt(y)}`,
    "Z",
  ].join(" ");
}

function circlePath(cx: number, cy: number, r: number): string {
  if (r <= 0) return "";
  return [
    `M${fmt(cx - r)} ${fmt(cy)}`,
    `A${fmt(r)} ${fmt(r)} 0 1 0 ${fmt(cx + r)} ${fmt(cy)}`,
    `A${fmt(r)} ${fmt(r)} 0 1 0 ${fmt(cx - r)} ${fmt(cy)}`,
    "Z",
  ].join(" ");
}

function ellipsePath(cx: number, cy: number, rx: number, ry: number): string {
  if (rx <= 0 || ry <= 0) return "";
  return [
    `M${fmt(cx - rx)} ${fmt(cy)}`,
    `A${fmt(rx)} ${fmt(ry)} 0 1 0 ${fmt(cx + rx)} ${fmt(cy)}`,
    `A${fmt(rx)} ${fmt(ry)} 0 1 0 ${fmt(cx - rx)} ${fmt(cy)}`,
    "Z",
  ].join(" ");
}

function pointsPath(points: string | null, close: boolean): string {
  if (!points) return "";
  const nums = points
    .trim()
    .split(/[\s,]+/)
    .map(Number)
    .filter(Number.isFinite);
  if (nums.length < 4) return "";
  const pairs: string[] = [];
  for (let i = 0; i + 1 < nums.length; i += 2) {
    pairs.push(`${i === 0 ? "M" : "L"}${fmt(nums[i])} ${fmt(nums[i + 1])}`);
  }
  return close ? `${pairs.join(" ")} Z` : pairs.join(" ");
}

function elementPath(el: Element): string {
  const tag = el.tagName.toLowerCase();
  if (tag === "path") return el.getAttribute("d")?.trim() ?? "";
  if (tag === "rect") {
    const x = attrNumber(el, "x");
    const y = attrNumber(el, "y");
    const w = attrNumber(el, "width");
    const h = attrNumber(el, "height");
    const rx = attrNumber(el, "rx");
    const ry = attrNumber(el, "ry", rx);
    return roundedRectPath(x, y, w, h, rx, ry);
  }
  if (tag === "circle") {
    return circlePath(attrNumber(el, "cx"), attrNumber(el, "cy"), attrNumber(el, "r"));
  }
  if (tag === "ellipse") {
    return ellipsePath(attrNumber(el, "cx"), attrNumber(el, "cy"), attrNumber(el, "rx"), attrNumber(el, "ry"));
  }
  if (tag === "line") {
    return `M${fmt(attrNumber(el, "x1"))} ${fmt(attrNumber(el, "y1"))} L${fmt(attrNumber(el, "x2"))} ${fmt(attrNumber(el, "y2"))}`;
  }
  if (tag === "polyline") return pointsPath(el.getAttribute("points"), false);
  if (tag === "polygon") return pointsPath(el.getAttribute("points"), true);
  return "";
}

function styleValue(el: Element, name: string): string | null {
  const style = el.getAttribute("style");
  if (!style) return null;
  for (const part of style.split(";")) {
    const [rawKey, ...rawValue] = part.split(":");
    if (!rawKey || rawValue.length === 0) continue;
    if (rawKey.trim().toLowerCase() === name) {
      return rawValue.join(":").trim();
    }
  }
  return null;
}

function inheritedValue(el: Element, name: string): string | null {
  let node: Element | null = el;
  while (node) {
    const direct = node.getAttribute(name) ?? styleValue(node, name);
    if (direct != null) return direct;
    node = node.parentElement;
  }
  return null;
}

function visiblePaint(value: string | null, defaultValue: string): boolean {
  const paint = (value ?? defaultValue).trim().toLowerCase();
  return paint !== "" && paint !== "none" && paint !== "transparent" && !paint.endsWith(", 0)") && !paint.endsWith(",0)");
}

function isHidden(el: Element): boolean {
  const display = inheritedValue(el, "display");
  const visibility = inheritedValue(el, "visibility");
  const opacity = inheritedValue(el, "opacity");
  return display === "none" || visibility === "hidden" || opacity === "0";
}

function parseStrokeLinecap(value: string | null): ParsedSvgShape["strokeLinecap"] {
  if (value === "butt" || value === "round" || value === "square") return value;
  return undefined;
}

function parseStrokeLinejoin(value: string | null): ParsedSvgShape["strokeLinejoin"] {
  if (value === "miter" || value === "round" || value === "bevel") return value;
  return undefined;
}

function paintColor(value: string | null, fallback: string): string {
  const paint = (value ?? fallback).trim();
  if (!paint || paint === "none" || paint === "transparent" || paint === "currentColor") return fallback;
  if (paint.startsWith("url(")) return fallback;
  return paint;
}

function parseLinePath(d: string): { x1: number; y1: number; x2: number; y2: number } | null {
  const tokens = d.match(/[a-zA-Z]|-?\d*\.?\d+(?:e[-+]?\d+)?/gi) ?? [];
  if (tokens.length < 4) return null;
  let i = 0;
  let cmd = tokens[i++];
  if (cmd !== "M" && cmd !== "m") return null;
  const x1 = Number(tokens[i++]);
  const y1 = Number(tokens[i++]);
  if (!Number.isFinite(x1) || !Number.isFinite(y1)) return null;

  cmd = tokens[i++];
  if (!cmd) return null;
  let x2: number;
  let y2: number;
  if (cmd === "L" || cmd === "l") {
    x2 = Number(tokens[i++]);
    y2 = Number(tokens[i++]);
    if (cmd === "l") {
      x2 += x1;
      y2 += y1;
    }
  } else if (cmd === "H" || cmd === "h") {
    x2 = Number(tokens[i++]);
    y2 = y1;
    if (cmd === "h") x2 += x1;
  } else if (cmd === "V" || cmd === "v") {
    x2 = x1;
    y2 = Number(tokens[i++]);
    if (cmd === "v") y2 += y1;
  } else {
    return null;
  }

  while (i < tokens.length && (tokens[i] === "Z" || tokens[i] === "z")) i += 1;
  if (i !== tokens.length) return null;
  if (![x2, y2].every(Number.isFinite)) return null;
  return { x1, y1, x2, y2 };
}

export function parseSvgToLine(svgText: string): ParsedSvgLine | null {
  if (!svgText.trim().startsWith("<")) return null;

  const doc = new DOMParser().parseFromString(svgText, "image/svg+xml");
  if (doc.querySelector("parsererror")) return null;

  const svg = doc.documentElement;
  if (svg.tagName.toLowerCase() !== "svg") return null;

  const drawable = Array.from(svg.querySelectorAll("path,rect,circle,ellipse,line,polyline,polygon"))
    .filter((el) => !isHidden(el));
  if (drawable.length !== 1) return null;

  const el = drawable[0];
  const tag = el.tagName.toLowerCase();
  let x1: number;
  let y1: number;
  let x2: number;
  let y2: number;

  if (tag === "line") {
    x1 = attrNumber(el, "x1");
    y1 = attrNumber(el, "y1");
    x2 = attrNumber(el, "x2");
    y2 = attrNumber(el, "y2");
  } else if (tag === "polyline") {
    const nums = (el.getAttribute("points") ?? "")
      .trim()
      .split(/[\s,]+/)
      .map(Number)
      .filter(Number.isFinite);
    if (nums.length !== 4) return null;
    [x1, y1, x2, y2] = nums;
  } else if (tag === "path") {
    const parsedPath = parseLinePath(el.getAttribute("d")?.trim() ?? "");
    if (!parsedPath) return null;
    ({ x1, y1, x2, y2 } = parsedPath);
  } else {
    return null;
  }

  if (![x1, y1, x2, y2].every(Number.isFinite)) return null;

  const strokeW = Math.max(1, numberFrom(inheritedValue(el, "stroke-width")) ?? 2);
  if (!visiblePaint(inheritedValue(el, "stroke"), "black")) return null;

  const vb = parseViewBox(svg as unknown as SVGSVGElement);
  return {
    x1,
    y1,
    x2,
    y2,
    viewBoxMinX: vb.minX,
    viewBoxMinY: vb.minY,
    viewBoxW: vb.w,
    viewBoxH: vb.h,
    stroke: paintColor(inheritedValue(el, "stroke"), "#2b2926"),
    strokeW,
  };
}

export function parseSvgToPoly(svgText: string): ParsedSvgShape | null {
  if (!svgText.trim().startsWith("<")) return null;

  const doc = new DOMParser().parseFromString(svgText, "image/svg+xml");
  if (doc.querySelector("parsererror")) return null;

  const svg = doc.documentElement;
  if (svg.tagName.toLowerCase() !== "svg") return null;

  const pathEls = Array.from(svg.querySelectorAll("path,rect,circle,ellipse,line,polyline,polygon"));
  const paths: string[] = [];
  let fillCount = 0;
  let strokeCount = 0;
  let firstStrokeW: number | null = null;
  let firstLinecap: ParsedSvgShape["strokeLinecap"];
  let firstLinejoin: ParsedSvgShape["strokeLinejoin"];

  for (const el of pathEls) {
    if (isHidden(el)) continue;

    const d = elementPath(el);
    if (!d) continue;

    const strokeW = Math.max(0, numberFrom(inheritedValue(el, "stroke-width")) ?? 1);
    const hasStroke = visiblePaint(inheritedValue(el, "stroke"), "none") && strokeW > 0;
    const tag = el.tagName.toLowerCase();
    const hasFill = tag !== "line" && tag !== "polyline" && visiblePaint(inheritedValue(el, "fill"), "black");

    if (!hasFill && !hasStroke) continue;

    paths.push(d);
    if (hasFill) fillCount += 1;
    if (hasStroke) {
      strokeCount += 1;
      firstStrokeW ??= strokeW;
      firstLinecap ??= parseStrokeLinecap(inheritedValue(el, "stroke-linecap"));
      firstLinejoin ??= parseStrokeLinejoin(inheritedValue(el, "stroke-linejoin"));
    }
  }

  if (paths.length === 0) return null;

  const vb = parseViewBox(svg as unknown as SVGSVGElement);
  const strokeDominant = strokeCount > fillCount;
  return {
    svgPath: paths.join(" "),
    svgViewBox: `${fmt(vb.minX)} ${fmt(vb.minY)} ${fmt(vb.w)} ${fmt(vb.h)}`,
    viewBoxW: vb.w,
    viewBoxH: vb.h,
    fill: strokeDominant ? "transparent" : "#2b2926",
    stroke: strokeDominant ? "#2b2926" : "transparent",
    strokeW: strokeDominant ? firstStrokeW ?? 2 : 0,
    strokeLinecap: firstLinecap,
    strokeLinejoin: firstLinejoin,
  };
}

export function isLikelySvgSource(src: string): boolean {
  const s = src.trim().toLowerCase();
  return s.startsWith("data:image/svg+xml") || /\.svg(?:[?#].*)?$/.test(s);
}

export function svgTextFromDataUri(src: string): string | null {
  const match = src.match(/^data:image\/svg\+xml(?:;charset=[^;,]+)?(;base64)?,(.*)$/i);
  if (!match) return null;
  const body = match[2] ?? "";
  try {
    return match[1] ? atob(body) : decodeURIComponent(body);
  } catch {
    return null;
  }
}
