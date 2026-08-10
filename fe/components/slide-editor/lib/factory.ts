import { CANVAS_W, CANVAS_H } from "../types";
import type {
  TextElement,
  ShapeElement,
  LineElement,
  ImageElement,
  PolyElement,
  DrawElement,
  MoleculeSimulationElement,
  PeriodicSimulationElement,
  PeriodicSimulationPayload,
  SandboxSimulationElement,
  SlideElement,
  ElementPatch,
} from "../types";
import type { Molecule } from "@/components/molecules/types";
import { MOLECULE_CATALOG } from "@/components/molecules/catalog";

export function makeText(overrides?: Partial<TextElement>): TextElement {
  return {
    id: "",
    type: "text",
    x: CANVAS_W / 2 - 100,
    y: CANVAS_H / 2 - 25,
    w: 200,
    h: 50,
    rotation: 0,
    zIndex: 0,
    opacity: 1,
    locked: false,
    text: "Text",
    fontSize: 24,
    bold: false,
    italic: false,
    color: "#1f1f1f",
    align: "left",
    ...overrides,
  };
}

export function makeShape(
  shape: "rect" | "ellipse" = "rect"
): ShapeElement {
  return {
    id: "",
    type: "shape",
    shape,
    x: CANVAS_W / 2 - 75,
    y: CANVAS_H / 2 - 50,
    w: 150,
    h: 100,
    rotation: 0,
    zIndex: 0,
    opacity: 1,
    locked: false,
    fill: "#f6eadf",
    stroke: "#d97757",
    strokeW: 1,
    borderRadius: 0,
    dashStyle: "solid",
  };
}

export function makeLine(type: "line" | "arrow" = "line"): LineElement {
  return {
    id: "",
    type,
    x: 0,
    y: 0,
    w: 200,
    h: 0,
    x1: 100,
    y1: CANVAS_H / 2,
    x2: 300,
    y2: CANVAS_H / 2,
    rotation: 0,
    zIndex: 0,
    opacity: 1,
    locked: false,
    stroke: "#1f1f1f",
    strokeW: 2,
    dashStyle: "solid",
    arrowHead: type === "arrow" ? "end" : "none",
  };
}

export function makeImage(src: string): ImageElement {
  return {
    id: "",
    type: "image",
    src,
    x: CANVAS_W / 2 - 100,
    y: CANVAS_H / 2 - 75,
    w: 200,
    h: 150,
    rotation: 0,
    zIndex: 0,
    opacity: 1,
    locked: false,
    fit: "contain",
    borderRadius: 0,
  };
}

// Hình SVG từ thư viện shape. svgPath/svgViewBox/shapeId truyền qua overrides.
export function makePoly(overrides?: Partial<PolyElement>): PolyElement {
  return {
    id: "",
    type: "poly",
    x: CANVAS_W / 2 - 80,
    y: CANVAS_H / 2 - 80,
    w: 160,
    h: 160,
    rotation: 0,
    zIndex: 0,
    opacity: 1,
    locked: false,
    svgPath: "",
    svgViewBox: "0 0 100 100",
    shapeId: "",
    fill: "#2b2926",
    stroke: "transparent",
    strokeW: 0,
    ...overrides,
  };
}

// Element mô phỏng nhúng (MVP: chỉ loại "molecule"). Chèn giữa canvas, kích
// thước vuông vừa đủ cho viewer 3D.
export function makeSimulation(
  molecule: Molecule,
  overrides?: Partial<MoleculeSimulationElement>
): MoleculeSimulationElement {
  return {
    id: "",
    type: "simulation",
    kind: "molecule",
    molecule,
    mode: "ball-and-stick",
    rotating: true,
    x: CANVAS_W / 2 - 140,
    y: CANVAS_H / 2 - 140,
    w: 280,
    h: 280,
    rotation: 0,
    zIndex: 0,
    opacity: 1,
    locked: false,
    ...overrides,
  };
}

export function makePeriodicSimulation(
  periodic: PeriodicSimulationPayload,
  overrides?: Partial<PeriodicSimulationElement>
): PeriodicSimulationElement {
  const symbols = periodic.elementSymbols.length ? periodic.elementSymbols : ["H"];
  return {
    id: "",
    type: "simulation",
    kind: periodic.mode === "element" && symbols.length === 1 ? "periodic-element" : "periodic-table",
    periodic: { ...periodic, elementSymbols: symbols },
    x: CANVAS_W / 2 - 140,
    y: CANVAS_H / 2 - 140,
    w: 280,
    h: 280,
    rotation: 0,
    zIndex: 0,
    opacity: 1,
    locked: false,
    ...overrides,
  };
}

/**
 * Thí nghiệm vật lý chạy qua Sandpack.
 *
 * Khung rộng hơn hẳn 280×280 của molecule: thí nghiệm dựng cảnh cạnh một bảng
 * tham số bên phải, ép vào khung vuông là bảng đó chiếm hết chỗ của cảnh.
 */
export function makeSandboxSimulation(
  experiment: { id: string; presetId: string; title: string },
  overrides?: Partial<SandboxSimulationElement>
): SandboxSimulationElement {
  return {
    id: "",
    type: "simulation",
    kind: "sandbox",
    experimentId: experiment.id,
    presetId: experiment.presetId,
    title: experiment.title,
    x: CANVAS_W / 2 - 320,
    y: CANVAS_H / 2 - 180,
    w: 640,
    h: 360,
    rotation: 0,
    zIndex: 0,
    opacity: 1,
    locked: false,
    ...overrides,
  };
}

// Nét vẽ tay — luôn phủ toàn canvas; points cập nhật khi vẽ.
export function makeDraw(overrides?: Partial<DrawElement>): DrawElement {
  return {
    id: "",
    type: "draw",
    x: 0,
    y: 0,
    w: CANVAS_W,
    h: CANVAS_H,
    rotation: 0,
    zIndex: 0,
    opacity: 1,
    locked: false,
    points: "",
    drawTool: "brush",
    stroke: "#2b2926",
    strokeW: 6,
    ...overrides,
  };
}

// Loại element mà SidePanel có thể chèn (giống EType cũ của /test-slide).
export type AddType =
  | "text"
  | "rect"
  | "ellipse"
  | "line"
  | "arrow"
  | "image"
  | "poly"
  | "simulation";

// Tạo element theo loại + patch tùy chọn — adapter cho SidePanel.
export function makeByType(type: AddType, extra?: ElementPatch): SlideElement {
  const apply = (base: SlideElement) => ({ ...base, ...extra }) as SlideElement;
  switch (type) {
    case "text":
      return apply(makeText());
    case "rect":
      return apply(makeShape("rect"));
    case "ellipse":
      return apply(makeShape("ellipse"));
    case "line":
      return apply(makeLine("line"));
    case "arrow":
      return apply(makeLine("arrow"));
    case "image":
      return apply(makeImage(typeof extra?.src === "string" ? extra.src : ""));
    case "poly":
      return apply(makePoly());
    case "simulation":
      if (extra?.kind === "sandbox") {
        const sandbox = extra as Partial<SandboxSimulationElement>;
        return apply(makeSandboxSimulation({
          id: sandbox.experimentId ?? "",
          presetId: sandbox.presetId ?? "",
          title: sandbox.title ?? "Thí nghiệm",
        }));
      }
      if (extra?.kind === "periodic-element" || extra?.kind === "periodic-table") {
        return apply(makePeriodicSimulation(extra.periodic ?? { mode: "table", elementSymbols: ["H"], focus: "Bảng tuần hoàn" }));
      }
      return apply(makeSimulation((extra as Partial<MoleculeSimulationElement> | undefined)?.molecule ?? MOLECULE_CATALOG[0]));
  }
}
