import { afterEach, describe, expect, it } from "vitest";
import {
  MAX_EXPORT_IMAGE_BYTES,
  parseAllowedExportImageUrl,
  readImageResponse,
} from "@/lib/api/slide-export-image-proxy";

describe("slide export image proxy", () => {
  afterEach(() => {
    delete process.env.SLIDE_EXPORT_IMAGE_HOSTS;
  });

  it("accepts the configured R2 host and rejects arbitrary or insecure URLs", () => {
    process.env.SLIDE_EXPORT_IMAGE_HOSTS = "assets.example.edu";

    expect(parseAllowedExportImageUrl("https://assets.example.edu/slide.png")?.hostname).toBe("assets.example.edu");
    expect(parseAllowedExportImageUrl("http://assets.example.edu/slide.png")).toBeNull();
    expect(parseAllowedExportImageUrl("https://example.com/slide.png")).toBeNull();
    expect(parseAllowedExportImageUrl("file:///etc/passwd")).toBeNull();
  });

  it("accepts image responses and rejects non-image content", async () => {
    const image = await readImageResponse(new Response(new Uint8Array([1, 2, 3]), {
      headers: { "Content-Type": "image/png" },
    }));
    expect(image.contentType).toBe("image/png");
    expect([...image.bytes]).toEqual([1, 2, 3]);

    await expect(readImageResponse(new Response("not an image", {
      headers: { "Content-Type": "text/html" },
    }))).rejects.toThrow("không trả về hình ảnh");
  });

  it("rejects responses larger than the export limit", async () => {
    await expect(readImageResponse(new Response(new Uint8Array(), {
      headers: {
        "Content-Type": "image/png",
        "Content-Length": String(MAX_EXPORT_IMAGE_BYTES + 1),
      },
    }))).rejects.toThrow("15 MB");
  });
});
