import { describe, expect, it } from "vitest";
import { buildOfflineHtml } from "@/lib/slide-html-export";
import type { Slide } from "@/components/slide-editor/types";

const slide: Slide = {
  id: "slide-1",
  bg: "#ffffff",
  elements: [
    { id: "text", type: "text", x: 10, y: 10, w: 300, h: 80, rotation: 0, zIndex: 1, opacity: 1, locked: false, text: "A < B", fontSize: 24, bold: true, italic: false, color: "#000", align: "left" },
    { id: "shape", type: "shape", x: 20, y: 120, w: 80, h: 80, rotation: 0, zIndex: 1, opacity: 1, locked: false, shape: "ellipse", fill: "#f00", stroke: "#000", strokeW: 1, borderRadius: 0 },
    { id: "image", type: "image", x: 120, y: 120, w: 80, h: 80, rotation: 0, zIndex: 1, opacity: 1, locked: false, src: "data:image/png;base64,test", fit: "cover", borderRadius: 0 },
    { id: "arrow", type: "arrow", x: 0, y: 0, w: 0, h: 0, rotation: 0, zIndex: 2, opacity: 1, locked: false, x1: 10, y1: 250, x2: 100, y2: 250, stroke: "#000", strokeW: 2, dashStyle: "solid", arrowHead: "end" },
    { id: "sim", type: "simulation", x: 200, y: 200, w: 280, h: 280, rotation: 0, zIndex: 1, opacity: 1, locked: false, kind: "molecule", mode: "ball-and-stick", rotating: true, molecule: { name: "Nước <3", formula: "H₂O", atoms: [{ element: "O" }], bonds: [] } },
  ],
};

describe("offline slide HTML export", () => {
  it("renders a standalone deck with escaped content and presenter controls", () => {
    const html = buildOfflineHtml([slide], "Bộ slide <demo>", new Map([["data:image/png;base64,test", "data:image/png;base64,test"]]));

    expect(html).toContain("Bộ slide &lt;demo&gt;");
    expect(html).toContain("A &lt; B");
    expect(html).toContain("data:image/png;base64,test");
    expect(html).toContain("id=\"next\"");
    expect(html).toContain("requestFullscreen");
    expect(html).toContain("arrow-arrow");
    expect(html).toContain(".slide.active .canvas");
  });

  it("renders a static poster for a simulation element (no live runtime offline)", () => {
    const html = buildOfflineHtml([slide], "Demo");

    expect(html).toContain("Nước &lt;3");
    expect(html).toContain("H₂O");
    expect(html).not.toContain("[object Object]");
  });

  it("renders a captured snapshot image for a simulation element when one was collected", () => {
    const html = buildOfflineHtml([slide], "Demo", new Map(), new Map([["sim", "images/sim-molecule-1.png"]]));

    expect(html).toContain('src="images/sim-molecule-1.png"');
    expect(html).toContain("Nước &lt;3 · H₂O");
    expect(html).not.toContain("🧪");
  });
});
