import { describe, expect, it } from "vitest";
import { slideRoleLabel, slideRoleTone, type SlideItem } from "./slides";

const otherRoleSlide: Pick<SlideItem, "pedagogicalRole" | "contentPlan"> = {
  pedagogicalRole: "other",
  contentPlan: { slideType: "concept", headerMode: "fixed", blocks: [], relationships: [] },
};

describe("slide pedagogical roles", () => {
  it("shows other as a neutral Khác role", () => {
    expect(slideRoleLabel(otherRoleSlide)).toBe("Khác");
    expect(slideRoleTone(otherRoleSlide)).toBe("bg-slate-100 text-slate-600");
  });
});
