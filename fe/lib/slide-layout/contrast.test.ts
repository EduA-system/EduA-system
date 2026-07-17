import { describe, expect, it } from "vitest";
import { blendSurface, contrastingTextColor, contrastRatio } from "./contrast";

describe("slide contrast", () => {
  it("chooses dark text for a light translucent surface", () => {
    const surface = blendSurface("#f4f1ec", "#ffffff", 0.6);
    const text = contrastingTextColor(surface, "#ffffff");

    expect(text).toBe("#1f2937");
    expect(contrastRatio(text, surface)).toBeGreaterThanOrEqual(4.5);
  });

  it("keeps a preferred text color when it already has enough contrast", () => {
    expect(contrastingTextColor("#0b2545", "#ffffff")).toBe("#ffffff");
  });
});
