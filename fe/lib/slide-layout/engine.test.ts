import { describe, expect, it } from "vitest";
import { generateSlideLayout } from "./engine";
import { renderSlideLayout } from "./renderer";
import type { ContentBlock, SlideLayoutInput, SlideType } from "./types";

function text(id: string, value = "Một nội dung ngắn"): ContentBlock {
  return { id, kind: "text", role: id === "title" ? "hero" : "body", semanticType: id === "title" ? "title" : "explanation", priority: "primary", required: true, text: value };
}

function fixture(slideType: SlideType, runNonce = 1): SlideLayoutInput {
  const title = text("title", "Tiêu đề bài học");
  let blocks: ContentBlock[] = [title, text("body")];
  if (slideType === "text-image" || slideType === "experiment") blocks = [title, text("body"), { id: "visual", kind: "visual", role: "visual", semanticType: slideType === "experiment" ? "experiment-apparatus" : "image", priority: "primary", required: true, description: "Minh họa", requirement: "required" }];
  if (slideType === "comparison") blocks = [title, { id: "compare", kind: "comparison", role: "body", semanticType: "comparison", priority: "primary", required: true, items: [{ id: "a", label: "A" }, { id: "b", label: "B" }], criteria: [{ id: "c", label: "Tiêu chí" }], values: [["Một", "Hai"]], preferredPresentation: "auto" }];
  if (slideType === "table") blocks = [title, { id: "table", kind: "table", role: "body", semanticType: "data-table", priority: "primary", required: true, columns: [{ id: "a", label: "A" }, { id: "b", label: "B" }], rows: [{ id: "r", cells: ["1", "2"] }] }];
  if (slideType === "process") blocks = [title, { id: "sequence", kind: "sequence", role: "body", semanticType: "process", priority: "primary", required: true, steps: [{ id: "one", text: "Một" }, { id: "two", text: "Hai" }, { id: "three", text: "Ba" }] }];
  if (slideType === "formula") blocks = [title, { id: "formula", kind: "formula", role: "formula", semanticType: "formula", priority: "primary", required: true, expression: "F = ma", explanation: "Lực bằng khối lượng nhân gia tốc" }];
  if (slideType === "exercise" || slideType === "quiz") blocks = [title, { id: "quiz", kind: "quiz", role: "body", semanticType: slideType, priority: "primary", required: true, question: "Đáp án nào đúng?", choices: ["A", "B"], answer: "A" }];
  return { schemaVersion: 1, slideId: `slide-${slideType}`, deckSeed: "deck", runNonce, algorithmVersion: 1, slideType, headerMode: slideType === "intro" || slideType === "section" ? "hidden" : "fixed", canvas: { width: 960, height: 540 }, bodyTop: 84, density: "normal", blocks, relationships: [] };
}

describe("dynamic slide layout engine", () => {
  it("is deterministic for the same nonce and varies its seed for a new run", () => {
    expect(generateSlideLayout(fixture("concept", 7))).toEqual(generateSlideLayout(fixture("concept", 7)));
    expect(generateSlideLayout(fixture("concept", 7)).seed).not.toBe(generateSlideLayout(fixture("concept", 8)).seed);
  });

  it.each<SlideType>(["intro", "section", "concept", "text-image", "experiment", "comparison", "table", "process", "formula", "exercise", "quiz", "summary"])("keeps every %s rectangle finite and inside content bounds", (family) => {
    for (let nonce = 0; nonce < 20; nonce += 1) {
      const result = generateSlideLayout(fixture(family, nonce));
      for (const item of [...result.slots, ...result.structures]) {
        expect(Object.values(item.rect).every(Number.isFinite)).toBe(true);
        expect(item.rect.w).toBeGreaterThan(0);
        expect(item.rect.h).toBeGreaterThan(0);
        expect(item.rect.x).toBeGreaterThanOrEqual(result.contentBounds.x);
        expect(item.rect.y).toBeGreaterThanOrEqual(result.contentBounds.y);
        expect(item.rect.x + item.rect.w).toBeLessThanOrEqual(result.contentBounds.x + result.contentBounds.w);
        expect(item.rect.y + item.rect.h).toBeLessThanOrEqual(result.contentBounds.y + result.contentBounds.h);
      }
    }
  });

  it("maps table cells and preserves sequence order", () => {
    const comparison = generateSlideLayout(fixture("comparison"));
    expect(comparison.structures.some((item) => item.kind === "table-grid")).toBe(true);
    expect(comparison.slots.some((slot) => slot.sourcePartId === "cell:c:a" && slot.sourceText === "Một")).toBe(true);
    const process = generateSlideLayout(fixture("process"));
    expect(process.slots.filter((slot) => slot.sourcePartId?.startsWith("step:")).map((slot) => slot.sourcePartId)).toEqual(["step:one", "step:two", "step:three"]);
  });

  it("does not reveal quiz answers on the question slide", () => {
    const result = generateSlideLayout(fixture("quiz"));

    expect(result.slots.some((slot) => slot.sourcePartId === "answer")).toBe(false);
    expect(result.slots.map((slot) => slot.sourcePartId).filter(Boolean)).toEqual(["question", "choices"]);
  });

  it("gives experiment text and visual at least thirty percent of body width", () => {
    const result = generateSlideLayout(fixture("experiment"));
    const visual = result.slots.find((slot) => slot.kind === "image");
    const body = result.slots.find((slot) => slot.sourceBlockId === "body");
    expect(visual!.rect.w / result.contentBounds.w).toBeGreaterThanOrEqual(0.3);
    expect(body!.rect.w / result.contentBounds.w).toBeGreaterThanOrEqual(0.3);
  });

  it("renders structures, table lines, placeholders and hides intro header", () => {
    const table = generateSlideLayout(fixture("table"));
    const elements = renderSlideLayout(table, { palette: ["#222222", "#ffffff", "#ff0000"], surfaceColor: "#f2f5f8", headerLabel: "Hóa học" });
    expect(elements.some((element) => element.type === "shape")).toBe(true);
    expect(elements.some((element) => element.type === "line")).toBe(true);
    expect(elements.filter((element) => element.contentSlot).length).toBe(table.slots.length + 1);
    const surfaces = elements.filter((element) => element.type === "shape" && element.fill === "#f2f5f8");
    expect(surfaces.length).toBeGreaterThan(0);
    expect(surfaces.every((element) => element.opacity === 0.6)).toBe(true);
    const intro = renderSlideLayout(generateSlideLayout(fixture("intro")), { palette: ["#222222"], headerLabel: "Hóa học" });
    expect(intro.some((element) => element.contentSlot === "header-1")).toBe(false);
  });

  it("uses compact default typography for generated content", () => {
    const concept = renderSlideLayout(generateSlideLayout(fixture("concept")), { palette: ["#222222"], headerLabel: "Hóa học" });
    expect(concept.find((element) => element.contentSlot === "slot:title")).toMatchObject({ type: "text", fontSize: 30 });
    expect(concept.find((element) => element.contentSlot === "slot:body")).toMatchObject({ type: "text", fontSize: 16 });
    expect(concept.find((element) => element.contentSlot === "header-1")).toMatchObject({ type: "text", fontSize: 12 });

    const formula = renderSlideLayout(generateSlideLayout(fixture("formula")), { palette: ["#222222"] });
    expect(formula.find((element) => element.contentSlot === "slot:formula:expression")).toMatchObject({ type: "text", fontSize: 24 });
  });

  it("keeps illustration slots within a usable, non-banner aspect ratio", () => {
    for (const slideType of ["text-image", "experiment"] as const) {
      const image = generateSlideLayout(fixture(slideType)).slots.find((slot) => slot.kind === "image");
      expect(image).toBeDefined();
      expect(image!.rect.w / image!.rect.h).toBeGreaterThanOrEqual(0.75);
      expect(image!.rect.w / image!.rect.h).toBeLessThanOrEqual(1.5);
    }
  });
});
