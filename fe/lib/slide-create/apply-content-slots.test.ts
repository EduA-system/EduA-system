import { describe, expect, it } from "vitest";
import type { SlideElement } from "@/components/slide-editor/types";
import { applyContentSlots } from "./apply-content-slots";

function text(slot: string, overrides: Partial<Extract<SlideElement, { type: "text" }>> = {}): Extract<SlideElement, { type: "text" }> {
  return {
    id: slot,
    type: "text",
    contentSlot: slot,
    x: 40,
    y: 40,
    w: 120,
    h: 80,
    rotation: 0,
    zIndex: 10,
    opacity: 1,
    locked: false,
    text: "Tiêu đề bài học",
    fontSize: 16,
    bold: false,
    italic: false,
    color: "#222222",
    align: "left",
    ...overrides,
  };
}

describe("applyContentSlots", () => {
  it("updates matching content slots and preserves non-content elements", () => {
    const hero = text("hero-1", { w: 300, h: 140, fontSize: 36, bold: true });
    const image: Extract<SlideElement, { type: "image" }> = {
      id: "aside-1", type: "image", contentSlot: "aside-1", x: 400, y: 0, w: 200, h: 200,
      rotation: 0, zIndex: 2, opacity: 1, locked: false, src: "placeholder", fit: "cover", borderRadius: 0,
    };
    const shape: Extract<SlideElement, { type: "shape" }> = {
      id: "card", type: "shape", x: 0, y: 0, w: 600, h: 300, rotation: 0, zIndex: 0,
      opacity: 1, locked: false, shape: "rect", fill: "white", stroke: "transparent", strokeW: 0, borderRadius: 12,
    };
    const result = applyContentSlots([hero, image, shape], {
      slots: [
        { slotId: "hero-1", text: "Định luật II Newton", imagePrompt: null, style: { fontSize: 44, color: "#d97757", align: "center" } },
        { slotId: "aside-1", text: null, imagePrompt: "free body diagram", style: null },
      ], latencyMs: 10, modelUsed: "test",
    });
    expect(result[0]).toMatchObject({ type: "text", text: "Định luật II Newton", fontSize: 48, color: "#1f2937", align: "center" });
    expect(result[1]).toMatchObject({ type: "image", src: "placeholder", imagePrompt: "free body diagram" });
    expect(result[2]).toEqual(shape);
  });

  it("swaps the placeholder for a real generated image URL when one is provided", () => {
    const hero = text("hero-1");
    const image: Extract<SlideElement, { type: "image" }> = {
      id: "aside-1", type: "image", contentSlot: "aside-1", x: 400, y: 0, w: 200, h: 200,
      rotation: 0, zIndex: 2, opacity: 1, locked: false, src: "placeholder", fit: "cover", borderRadius: 0,
    };
    const result = applyContentSlots([hero, image], {
      slots: [
        { slotId: "hero-1", text: "Định luật II Newton", imagePrompt: null },
        { slotId: "aside-1", text: null, imagePrompt: "free body diagram", imageUrl: "https://r2.example.com/slide-images/fake.png" },
      ], latencyMs: 10, modelUsed: "test",
    });
    expect(result[1]).toMatchObject({
      type: "image",
      src: "https://r2.example.com/slide-images/fake.png",
      imagePrompt: "free body diagram",
    });
  });

  it("keeps the outline title when no AI fill is requested for it", () => {
    const title = text("slot:s1:title", { text: "Bài học: Lực" });
    expect(applyContentSlots([title], { slots: [], latencyMs: 0, modelUsed: "test" })[0]).toMatchObject({ text: "Bài học: Lực" });
  });

  it("reduces font size to keep generated text inside its fixed box", () => {
    const title = text("slot:s1:title");
    const body = text("slot:body", { text: "", w: 180, h: 80 });
    const result = applyContentSlots([title, body], {
      slots: [{ slotId: "slot:body", text: "Nội dung được viết đủ dài để cần giảm nhẹ cỡ chữ trong khung cố định.", imagePrompt: null }],
      latencyMs: 0,
      modelUsed: "test",
    });
    expect(result[1]).toMatchObject({ type: "text", fontSize: 15 });
  });

  it("shrinks below the former minimum font-size thresholds when necessary", () => {
    const title = text("slot:s1:title");
    const body = text("slot:body", { text: "", w: 80, h: 30, fontSize: 16 });
    const result = applyContentSlots([title, body], {
      slots: [{ slotId: "slot:body", text: "This deliberately long content must shrink dramatically to fit.", imagePrompt: null }],
      latencyMs: 0,
      modelUsed: "test",
    });
    expect((result[1] as Extract<SlideElement, { type: "text" }>).fontSize).toBeLessThan(11);
  });

  it("rejects a standard slide with no generated content", () => {
    const title = text("slot:s1:title");
    const body = text("slot:body", { text: "" });
    expect(() => applyContentSlots([title, body], {
      slots: [{ slotId: "slot:body", text: null, imagePrompt: null }], latencyMs: 0, modelUsed: "test",
    })).toThrow("AI không điền nội dung cho slide.");
  });

  it("keeps the source content when AI intentionally returns null for a slot", () => {
    const title = text("slot:s1:title");
    const body = text("slot:body", { text: "Nội dung từ outline" });
    const result = applyContentSlots([title, body], {
      slots: [{ slotId: "slot:body", text: null, imagePrompt: null }], latencyMs: 0, modelUsed: "test",
    });
    expect(result[1]).toMatchObject({ type: "text", text: "Nội dung từ outline" });
  });

  it("renders multi-line AI bullets as a real bullet list", () => {
    const title = text("slot:s1:title");
    const body = text("slot:body", { text: "", w: 240, h: 120 });
    const result = applyContentSlots([title, body], {
      slots: [{ slotId: "slot:body", text: "• Nguyên nhân thứ nhất\n• Nguyên nhân thứ hai", imagePrompt: null }], latencyMs: 0, modelUsed: "test",
    });
    expect(result[1]).toMatchObject({ type: "text", text: "Nguyên nhân thứ nhất\nNguyên nhân thứ hai", listStyle: "bullet" });
  });

  it("splits flattened A/B/C/D choices into separate lines", () => {
    const title = text("slot:s1:title");
    const body = text("slot:body", { w: 400, h: 200, text: "Câu hỏi? A. Đáp án một B. Đáp án hai C. Đáp án ba D. Đáp án bốn Đáp án: B Giải thích: Vì đúng." });
    const result = applyContentSlots([title, body], {
      slots: [{ slotId: "slot:body", text: null, imagePrompt: null }], latencyMs: 0, modelUsed: "test",
    });
    expect(result[1]).toMatchObject({
      type: "text",
      text: "Câu hỏi?\nA. Đáp án một\nB. Đáp án hai\nC. Đáp án ba\nD. Đáp án bốn\nĐáp án: B\nGiải thích: Vì đúng.",
    });
  });

  it("grows short cell text to use available space", () => {
    const title = text("slot:s1:title");
    const cell = text("slot:cell", { text: "", w: 220, h: 80, fontSize: 11 });
    const result = applyContentSlots([title, cell], {
      slots: [{ slotId: "slot:cell", text: "Không đổi", imagePrompt: null }], latencyMs: 0, modelUsed: "test",
    });
    expect(result[1]).toMatchObject({ type: "text", fontSize: 18 });
  });

  it("shrinks a long formula to one line and never enlarges it", () => {
    const title = text("slot:s1:title");
    const formula = text("slot:formula:expression", { text: "", w: 880, h: 120, fontSize: 24, fontFamily: "Newsreader, serif", align: "center" });
    const expression = "Monomer: CH3–CH=CH2 → Polymer: [-CH2–CH(CH3)-]n, tên: polypropylene (PP)";
    const result = applyContentSlots([title, formula], {
      slots: [{ slotId: "slot:formula:expression", text: expression, imagePrompt: null }], latencyMs: 0, modelUsed: "test",
    });
    expect(result[1]).toMatchObject({ type: "text", text: expression });
    expect((result[1] as Extract<SlideElement, { type: "text" }>).fontSize).toBeLessThan(24);
  });

  it("uses the smallest fitted body font size for every body text slot", () => {
    const title = text("slot:s1:title", { fontSize: 30 });
    const shortBody = text("slot:short", { text: "", w: 360, h: 120, fontSize: 16 });
    const denseBody = text("slot:dense", { text: "", w: 160, h: 105, fontSize: 16 });
    const result = applyContentSlots([title, shortBody, denseBody], {
      slots: [
        { slotId: "slot:short", text: "Ý ngắn", imagePrompt: null },
        { slotId: "slot:dense", text: "Nội dung dài cần thu nhỏ cỡ chữ để vừa khung hẹp và vẫn giữ được khả năng đọc rõ ràng cho người học.", imagePrompt: null },
      ], latencyMs: 0, modelUsed: "test",
    });
    const [nextTitle, nextShort, nextDense] = result as Extract<SlideElement, { type: "text" }>[];
    expect(nextTitle.fontSize).toBe(30);
    expect(nextShort.fontSize).toBe(nextDense.fontSize);
    expect(nextDense.fontSize).toBeLessThan(16);
  });

  it("replaces an unreadable AI color with a contrasting text color", () => {
    const body = text("body", { zIndex: 2 });
    const surface: Extract<SlideElement, { type: "shape" }> = {
      id: "surface", type: "shape", x: 0, y: 0, w: 300, h: 100, rotation: 0, zIndex: 1,
      opacity: 1, locked: false, shape: "rect", fill: "#f4f1ec", stroke: "transparent", strokeW: 0, borderRadius: 0,
    };
    const result = applyContentSlots([body, surface], {
      slots: [{ slotId: "body", text: "Nội dung", imagePrompt: null, style: { color: "#ffffff" } }], latencyMs: 0, modelUsed: "test",
    });
    expect(result[0]).toMatchObject({ type: "text", color: "#1f2937" });
  });
});
