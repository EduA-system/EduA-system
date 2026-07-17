import type { ContentBlock, SlideLayoutInput, SlideType } from "./types";

export const GALLERY_FAMILIES: SlideType[] = ["intro", "section", "concept", "text-image", "experiment", "comparison", "table", "process", "formula", "exercise", "quiz", "summary"];

export function galleryFixture(slideType: SlideType, density: SlideLayoutInput["density"]): SlideLayoutInput {
  const repeat = density === "sparse" ? 1 : density === "normal" ? 3 : 7;
  const title: ContentBlock = { id: "title", kind: "text", role: "hero", semanticType: "title", priority: "primary", required: true, text: `${slideType} · ${density}` };
  const paragraph = "Nội dung minh họa cho bài giảng. ".repeat(repeat);
  let blocks: ContentBlock[] = [title, { id: "body", kind: "text", role: "body", semanticType: "explanation", priority: "primary", required: true, text: paragraph }];
  if (slideType === "text-image" || slideType === "experiment") blocks.push({ id: "visual", kind: "visual", role: "visual", semanticType: slideType === "experiment" ? "experiment-apparatus" : "image", priority: "primary", required: true, description: "Hình minh họa", requirement: "required" });
  if (slideType === "comparison") blocks = [title, { id: "comparison", kind: "comparison", role: "body", semanticType: "comparison", priority: "primary", required: true, items: [{ id: "a", label: "A" }, { id: "b", label: "B" }], criteria: [{ id: "c1", label: "Đặc điểm" }, { id: "c2", label: "Ứng dụng" }], values: [[paragraph, "Khác biệt"], ["Ví dụ A", "Ví dụ B"]], preferredPresentation: "auto" }];
  if (slideType === "table") blocks = [title, { id: "table", kind: "table", role: "body", semanticType: "data-table", priority: "primary", required: true, columns: [{ id: "a", label: "Cột A" }, { id: "b", label: "Cột B" }], rows: [{ id: "r1", cells: ["1", "2"] }, { id: "r2", cells: ["3", "4"] }] }];
  if (slideType === "process") blocks = [title, { id: "sequence", kind: "sequence", role: "body", semanticType: "process", priority: "primary", required: true, steps: Array.from({ length: Math.min(5, repeat + 2) }, (_, index) => ({ id: `s${index}`, label: `Bước ${index + 1}`, text: paragraph })) }];
  if (slideType === "formula") blocks = [title, { id: "formula", kind: "formula", role: "formula", semanticType: "formula", priority: "primary", required: true, expression: "F = ma", explanation: paragraph }];
  if (slideType === "exercise" || slideType === "quiz") blocks = [title, { id: "quiz", kind: "quiz", role: "body", semanticType: slideType, priority: "primary", required: true, question: paragraph, choices: ["A. Một", "B. Hai", "C. Ba"], answer: "A" }];
  return { schemaVersion: 1, slideId: `${slideType}-${density}`, deckSeed: "fixture-gallery", runNonce: 42, algorithmVersion: 1, slideType, headerMode: slideType === "intro" || slideType === "section" ? "hidden" : "fixed", canvas: { width: 960, height: 540 }, bodyTop: 84, density, blocks, relationships: [] };
}

