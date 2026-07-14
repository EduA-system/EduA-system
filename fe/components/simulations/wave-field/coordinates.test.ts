import { describe, it, expect } from "vitest";
import { buildXSegments, canvasToWorld, compressedX, fitViewport, inverseCompressedX, worldToCanvas } from "./coordinates";

describe("worldToCanvas / canvasToWorld", () => {
  const vp = { width: 800, height: 600, scale: 2, centerX: 100, centerY: -50 };

  it("tâm world → đúng tâm canvas", () => {
    const c = worldToCanvas(vp.centerX, vp.centerY, vp);
    expect(c.x).toBeCloseTo(400, 9);
    expect(c.y).toBeCloseTo(300, 9);
  });

  it("y vật lý TĂNG → y canvas GIẢM (trục y lật, canvas xuống dưới)", () => {
    const a = worldToCanvas(vp.centerX, vp.centerY, vp);
    const b = worldToCanvas(vp.centerX, vp.centerY + 10, vp);
    expect(b.y).toBeLessThan(a.y);
  });

  it("x vật lý TĂNG → x canvas TĂNG (không lật trục x)", () => {
    const a = worldToCanvas(vp.centerX, vp.centerY, vp);
    const b = worldToCanvas(vp.centerX + 10, vp.centerY, vp);
    expect(b.x).toBeGreaterThan(a.x);
  });

  it("round-trip world→canvas→world khớp lại chính xác", () => {
    for (const [x, y] of [[130, -20], [-40, 75], [0, 0]] as const) {
      const c = worldToCanvas(x, y, vp);
      const back = canvasToWorld(c.x, c.y, vp);
      expect(back.x).toBeCloseTo(x, 9);
      expect(back.y).toBeCloseTo(y, 9);
    }
  });
});

describe("buildXSegments / compressedX / inverseCompressedX (nén trục x — bố cục)", () => {
  const displayWidth = 1000;

  it("3 mốc quan trọng luôn đúng tỉ lệ 8% / 36% / 76% bất kể D vật lý", () => {
    for (const D of [100, 350, 900, 2000]) {
      const xSource = 0, xSlits = 140, xScreen = xSlits + D;
      const segs = buildXSegments(xSource, xSlits, xScreen, displayWidth);
      expect(compressedX(xSource, segs)).toBeCloseTo(80, 6);
      expect(compressedX(xSlits, segs)).toBeCloseTo(360, 6);
      expect(compressedX(xScreen, segs)).toBeCloseTo(760, 6);
    }
  });

  it("khoảng cách hiển thị khe→màn luôn đúng 40% bề rộng (đúng khoảng 38–42% yêu cầu)", () => {
    for (const D of [80, 500, 1500]) {
      const xSlits = 140, xScreen = xSlits + D;
      const segs = buildXSegments(0, xSlits, xScreen, displayWidth);
      const span = compressedX(xScreen, segs) - compressedX(xSlits, segs);
      expect(span / displayWidth).toBeCloseTo(0.4, 6);
    }
  });

  it("round-trip compressedX → inverseCompressedX khớp lại chính xác trong mọi đoạn", () => {
    const segs = buildXSegments(0, 140, 490, displayWidth);
    for (const x of [-20, 0, 70, 140, 300, 490, 510]) {
      const d = compressedX(x, segs);
      const back = inverseCompressedX(d, segs);
      expect(back).toBeCloseTo(x, 6);
    }
  });

  it("nội suy tuyến tính bên trong 1 đoạn (điểm giữa → tỉ lệ hiển thị giữa)", () => {
    const segs = buildXSegments(0, 140, 490, displayWidth);
    const mid = compressedX(70, segs); // giữa xSource(0) và xSlits(140)
    expect(mid).toBeCloseTo((80 + 360) / 2, 6);
  });
});

describe("fitViewport", () => {
  it("tâm hộp bao trở thành tâm viewport", () => {
    const vp = fitViewport(800, 600, -100, 300, -50, 50);
    expect(vp.centerX).toBeCloseTo(100, 9);
    expect(vp.centerY).toBeCloseTo(0, 9);
  });

  it("scale bị giới hạn bởi cạnh chật hơn (không tràn khung)", () => {
    const vp = fitViewport(800, 400, 0, 800, 0, 800, 0); // world vuông 800×800, canvas 800×400 → giới hạn theo chiều cao
    expect(vp.scale).toBeCloseTo(400 / 800, 6);
  });
});
