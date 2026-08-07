import { describe, expect, it } from "vitest";
import type { SlideElement } from "@/components/slide-editor/types";
import { mergeStep2LayoutElements } from "./merge-step2-layout";

function shape(id: string, zIndex: number): SlideElement {
  return {
    id,
    type: "shape",
    x: 0,
    y: 0,
    w: 100,
    h: 100,
    rotation: 0,
    zIndex,
    opacity: 1,
    locked: false,
    shape: "rect",
    fill: "#ffffff",
    stroke: "transparent",
    strokeW: 0,
    borderRadius: 0,
  };
}

describe("mergeStep2LayoutElements", () => {
  it("keeps step-1 skin and manual elements while replacing old layout elements", () => {
    const skin = shape("h2s-skin-deco", 1);
    const manual = shape("manual-note", 90);
    const oldLayout = shape("layout:card:old", 10);
    const nextLayout = shape("layout:card:new", 10);

    expect(mergeStep2LayoutElements([skin, manual, oldLayout], [nextLayout])).toEqual([
      skin,
      manual,
      nextLayout,
    ]);
  });

  it("does not duplicate generated layout when step 2 runs again", () => {
    const nextLayout = shape("layout:slot:body", 30);

    const merged = mergeStep2LayoutElements([shape("layout:slot:body", 30)], [nextLayout]);

    expect(merged).toHaveLength(1);
    expect(merged[0]).toEqual(nextLayout);
  });
});
