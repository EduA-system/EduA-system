import { describe, expect, it } from "vitest";
import { PLACEHOLDER_IMAGE } from "@/components/slide-editor/lib/be-mapper";
import { createZonePlaceholder } from "@/components/slide-editor/lib/html-to-slide";

const geometry = { x: 40, y: 80, w: 320, h: 160 };

describe("createZonePlaceholder", () => {
  it("creates editable text placeholders for text zones", () => {
    const placeholder = createZonePlaceholder("hero", geometry, 5, "rgb(10, 20, 30)");

    expect(placeholder).toMatchObject({
      type: "text",
      text: "Tiêu đề",
      ...geometry,
      zIndex: 5,
      locked: false,
    });
  });

  it("creates an editable image placeholder for an illustration zone", () => {
    const placeholder = createZonePlaceholder("aside", geometry, 7, "#333333");

    expect(placeholder).toMatchObject({
      type: "image",
      src: PLACEHOLDER_IMAGE,
      fit: "cover",
      ...geometry,
      zIndex: 7,
      locked: false,
    });
  });
});
