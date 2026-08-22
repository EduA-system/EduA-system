import { afterEach, describe, expect, it, vi } from "vitest";
import { buildOfflineHtml, exportOfflineZip } from "@/lib/slide-html-export";
import JSZip from "jszip";
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
  afterEach(() => {
    vi.unstubAllGlobals();
  });

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

  it("renders LaTeX delimiters embedded in normal text as inline MathML", () => {
    const textSlide: Slide = {
      id: "inline-math",
      bg: "#fff",
      elements: [{
        id: "answer", type: "text", x: 0, y: 0, w: 600, h: 200,
        rotation: 0, zIndex: 1, opacity: 1, locked: false,
        text: "Đáp án: $\\mathrm{C_6H_6}$\n• Benzene là hydrocarbon thơm.",
        fontSize: 24, bold: false, italic: false, color: "#000", align: "left",
      }],
    };

    const html = buildOfflineHtml([textSlide], "Demo");

    expect(html).toContain("Đáp án:");
    expect(html).toContain("<math");
    expect(html).toContain("C");
    expect(html).toContain("<mn>6</mn>");
    expect(html).toContain("<br>• Benzene là hydrocarbon thơm.");
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

  it("falls back to the same-origin proxy when a remote image is blocked by CORS", async () => {
    const imageOnlySlide: Slide = {
      id: "image-slide",
      bg: "#fff",
      elements: [{
        id: "remote-image", type: "image", x: 0, y: 0, w: 320, h: 180,
        rotation: 0, zIndex: 1, opacity: 1, locked: false,
        src: "https://r2.example.test/slide.png", fit: "cover", borderRadius: 0,
      }],
    };
    const fetchMock = vi.fn()
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockResolvedValueOnce(new Response(new Uint8Array([1, 2, 3]), {
        headers: { "Content-Type": "image/png" },
      }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await exportOfflineZip([imageOnlySlide], "Demo");
    const zip = await JSZip.loadAsync(await result.blob.arrayBuffer());
    const html = await zip.file("Demo.html")?.async("string");

    expect(fetchMock).toHaveBeenNthCalledWith(2, "/api/slide-export-image", expect.objectContaining({ method: "POST" }));
    expect(zip.file("images/img-1.png")).not.toBeNull();
    expect(html).toContain('src="images/img-1.png"');
    expect(result.warnings).toEqual([]);
  });
});
