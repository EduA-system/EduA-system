import { describe, expect, it } from "vitest";
import { applyContentSlots } from "@/lib/slide-create/apply-content-slots";
import type { SlideElement } from "@/components/slide-editor/types";

const text: SlideElement = {
  id: "hero", type: "text", contentSlot: "hero-1", x: 0, y: 0, w: 300, h: 80, rotation: 0, zIndex: 1, opacity: 1, locked: false,
  text: "Tiêu đề", fontSize: 36, bold: true, italic: false, color: "#2b2926", align: "left",
};
const image: SlideElement = {
  id: "aside", type: "image", contentSlot: "aside-1", x: 400, y: 0, w: 200, h: 200, rotation: 0, zIndex: 2, opacity: 1, locked: false,
  src: "placeholder", fit: "cover", borderRadius: 0,
};
const shape: SlideElement = {
  id: "card", type: "shape", x: 0, y: 0, w: 600, h: 300, rotation: 0, zIndex: 0, opacity: 1, locked: false,
  shape: "rect", fill: "white", stroke: "transparent", strokeW: 0, borderRadius: 12,
};

describe("applyContentSlots", () => {
  it("updates matching placeholders and preserves layout shapes", () => {
    const result = applyContentSlots([text, image, shape], {
      slots: [
        { slotId: "hero-1", text: "Định luật II Newton", imagePrompt: null, style: { fontSize: 44, color: "#d97757", align: "center" } },
        { slotId: "aside-1", text: null, imagePrompt: "free body diagram", style: null },
      ],
      latencyMs: 10,
      modelUsed: "test",
    });

    expect(result[0]).toMatchObject({ type: "text", text: "Định luật II Newton", fontSize: 44, color: "#d97757", align: "center" });
    expect(result[1]).toMatchObject({ type: "image", src: "placeholder", imagePrompt: "free body diagram" });
    expect(result[2]).toEqual(shape);
  });
});
