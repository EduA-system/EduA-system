import { describe, expect, it } from "vitest";
import { tiptapToStructuredText } from "@/lib/tiptap-to-text";

describe("tiptapToStructuredText", () => {
  it("preserves headings, lists, tables and mathematics", () => {
    expect(tiptapToStructuredText({ type: "doc", content: [
      { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Mục tiêu" }] },
      { type: "bulletList", content: [{ type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Hiểu" }] }] }] },
      { type: "paragraph", content: [{ type: "text", text: "Công thức " }, { type: "mathInline", attrs: { latex: "F=ma" } }] },
      { type: "table", content: [{ type: "tableRow", content: [{ type: "tableHeader", content: [{ type: "paragraph", content: [{ type: "text", text: "A" }] }] }] }] },
    ] })).toContain("## Mục tiêu\n\n- Hiểu\n\nCông thức  F=ma\n\n| A |");
  });
});
