import { describe, expect, it } from "vitest";
import type { SlideItem } from "@/lib/api/slides";
import {
  buildStructuralTemplateHtml,
  getLayoutVariants,
  SLIDE_LAYOUT_VARIANTS,
  selectSlideLayout,
  selectSlideLayoutVariant,
  SLIDE_LAYOUT_TEMPLATES,
} from "@/lib/slide-create/layout-templates";

const skin = '<div data-layer="bg" style="position:relative;width:960px;height:540px;background:#faf7f2"><div data-layer="struct" data-region="header" data-body-top="96"></div></div>';

function slide(overrides: Partial<SlideItem> = {}): SlideItem {
  return { id: "s1", title: "Bài học", kind: "concept", ...overrides };
}

describe("slide layout templates", () => {
  it("honors an explicit layout hint", () => {
    expect(selectSlideLayout(slide({ layoutHint: "comparison" }))).toBe("comparison");
    expect(selectSlideLayout(slide({ layoutHint: "worked-example" }))).toBe("exercise-quiz");
  });

  it("selects layouts from structured slide metadata", () => {
    expect(selectSlideLayout(slide({ quizItems: [{ question: "Q?" }] }))).toBe("exercise-quiz");
    expect(selectSlideLayout(slide({ visual: { type: "formula", spec: "F = ma" } }))).toBe("formula");
    expect(selectSlideLayout(slide({ pedagogicalRole: "recap" }))).toBe("summary");
  });

  it("ships five stable variants for every layout type", () => {
    expect(SLIDE_LAYOUT_VARIANTS).toHaveLength(40);
    SLIDE_LAYOUT_TEMPLATES.forEach((template) => {
      expect(getLayoutVariants(template)).toHaveLength(5);
    });
  });

  it("honors a selected variant and derives its parent layout", () => {
    const selected = SLIDE_LAYOUT_VARIANTS.find((variant) => variant.id === "formula-spotlight");
    expect(selected).toBeDefined();
    const current = slide({ layoutVariant: "formula-spotlight" });
    expect(selectSlideLayout(current)).toBe("formula");
    expect(selectSlideLayoutVariant(current).id).toBe("formula-spotlight");
  });

  it.each(SLIDE_LAYOUT_TEMPLATES)("builds valid zones for %s", (template) => {
    const { html, slots } = buildStructuralTemplateHtml(skin, slide({ layoutHint: template }));
    expect(html.startsWith('<div data-layer="bg"')).toBe(true);
    expect((html.match(/data-layer="zone"/g) ?? []).length).toBeGreaterThanOrEqual(2);
    expect(html).toContain('data-bbox-y="');
    expect(html).toContain('data-content-hint="');
    expect(html).toContain('data-slot="');
    expect(slots).toHaveLength((html.match(/data-layer="zone"/g) ?? []).length);
    expect(new Set(slots.map((slot) => slot.id)).size).toBe(slots.length);
    expect(html).toMatch(/data-bbox-y="(?:9[6-9]|[1-5]\d{2})"/);
  });

  it.each(SLIDE_LAYOUT_VARIANTS)("keeps %s inside the body canvas", (variant) => {
    const visual = variant.requiresVisual ? { type: "image" as const, spec: "diagram" } : undefined;
    const { html, template, variant: applied } = buildStructuralTemplateHtml(
      skin,
      slide({ layoutHint: variant.template, layoutVariant: variant.id, visual }),
    );
    expect(template).toBe(variant.template);
    expect(applied.id).toBe(variant.id);
    const bboxes = [...html.matchAll(/data-bbox-x="(\d+)" data-bbox-y="(\d+)" data-bbox-w="(\d+)" data-bbox-h="(\d+)"/g)];
    expect(bboxes.length).toBeGreaterThanOrEqual(2);
    bboxes.forEach((match) => {
      const [, x, y, w, h] = match.map(Number);
      expect(x).toBeGreaterThanOrEqual(0);
      expect(y).toBeGreaterThanOrEqual(96);
      expect(x + w).toBeLessThanOrEqual(960);
      expect(y + h).toBeLessThanOrEqual(540);
    });
  });

  it.each(SLIDE_LAYOUT_VARIANTS)("compacts %s for a tall header", (variant) => {
    const tallSkin = skin.replace('data-body-top="96"', 'data-body-top="160"');
    const visual = variant.requiresVisual ? { type: "image" as const, spec: "diagram" } : undefined;
    const { html } = buildStructuralTemplateHtml(tallSkin, slide({ layoutVariant: variant.id, visual }));
    [...html.matchAll(/data-bbox-x="(\d+)" data-bbox-y="(\d+)" data-bbox-w="(\d+)" data-bbox-h="(\d+)"/g)].forEach((match) => {
      const [, x, y, w, h] = match.map(Number);
      expect(x + w).toBeLessThanOrEqual(960);
      expect(y).toBeGreaterThanOrEqual(160);
      expect(y + h).toBeLessThanOrEqual(540);
    });
  });
});
