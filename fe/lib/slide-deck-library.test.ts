import { describe, expect, it } from "vitest";
import { parseSlideDeck, serializeSlideDeck } from "@/lib/slide-deck-library";
import type { Slide } from "@/components/slide-editor/types";

const slide: Slide = {
  id: "slide-1",
  bg: "#ffffff",
  elements: [],
  generationStatus: "ready",
};

describe("slide deck library payload", () => {
  it("serializes slides without transient generation status", () => {
    expect(serializeSlideDeck([slide])).toEqual({
      version: 1,
      slides: [{ id: "slide-1", bg: "#ffffff", elements: [] }],
    });
  });

  it("accepts a valid saved deck and rejects malformed payloads", () => {
    expect(parseSlideDeck({ version: 1, slides: [{ id: "slide-1", bg: "#ffffff", elements: [] }] })).toHaveLength(1);
    expect(parseSlideDeck({ version: 1, slides: [] })).toBeNull();
    expect(parseSlideDeck({ version: 2, slides: [slide] })).toBeNull();
    expect(parseSlideDeck({ version: 1, slides: [{ id: 1 }] })).toBeNull();
  });
});
