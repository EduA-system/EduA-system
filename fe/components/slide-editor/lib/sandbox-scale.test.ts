import { describe, expect, it } from "vitest";
import { sandboxViewZoom } from "./sandbox-scale";

describe("sandboxViewZoom", () => {
  it("thu nhỏ khung sandbox mặc định trên slide (960×380) để cột tham số không phải cuộn", () => {
    const zoom = sandboxViewZoom(960, 380);
    expect(zoom).toBeLessThan(1);
    // Viewport logic sau khi chia phải cao hơn chiều cao cột tham số (~800px).
    expect(380 / zoom).toBeGreaterThanOrEqual(800);
  });

  it("giữ nguyên tỉ lệ khi khung đã đủ lớn", () => {
    expect(sandboxViewZoom(1280, 900)).toBe(1);
  });

  it("không bao giờ phóng to quá 1", () => {
    expect(sandboxViewZoom(4000, 3000)).toBe(1);
  });

  it("không nhỏ hơn sàn 0.4 dù khung tí hon", () => {
    expect(sandboxViewZoom(120, 60)).toBe(0.4);
  });

  it("trả 1 với kích thước không hợp lệ", () => {
    expect(sandboxViewZoom(0, 400)).toBe(1);
    expect(sandboxViewZoom(Number.NaN, 400)).toBe(1);
  });
});
