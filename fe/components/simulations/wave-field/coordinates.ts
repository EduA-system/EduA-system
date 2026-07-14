// Chuyển đổi RÕ RÀNG giữa toạ độ VẬT LÝ (x phải, y LÊN — dùng xuyên suốt
// physics.ts) và toạ độ CANVAS (x phải, y XUỐNG, gốc góc trên-trái) — không
// trộn lẫn 2 hệ ở bất kỳ đâu khác trong module này.

export type Viewport = {
  width: number; // canvas CSS px
  height: number;
  scale: number; // px trên 1 đơn vị mô phỏng
  centerX: number; // toạ độ x VẬT LÝ tại tâm canvas
  centerY: number; // toạ độ y VẬT LÝ tại tâm canvas
};

export function worldToCanvas(x: number, y: number, vp: Viewport): { x: number; y: number } {
  return {
    x: vp.width / 2 + (x - vp.centerX) * vp.scale,
    y: vp.height / 2 - (y - vp.centerY) * vp.scale,
  };
}

export function canvasToWorld(px: number, py: number, vp: Viewport): { x: number; y: number } {
  return {
    x: vp.centerX + (px - vp.width / 2) / vp.scale,
    y: vp.centerY - (py - vp.height / 2) / vp.scale,
  };
}

/**
 * Bố cục x KHÔNG TUYẾN TÍNH (nén hiển thị) — dùng riêng cho giao thoa ánh
 * sáng: 3 mốc quan trọng (khe hẹp S, khe kép, màn) LUÔN nằm ở tỉ lệ CỐ ĐỊNH
 * theo bề rộng hiển thị, bất kể D vật lý lớn hay nhỏ — tránh việc D lớn đẩy
 * màn ra sát mép hoặc để lại vùng trống mênh mông. Trục y KHÔNG bị nén (dùng
 * chung Viewport phía trên). displayX ≠ physicalX nhưng MỌI phép tính vật lý
 * (physics.ts) luôn dùng physicalX — nén chỉ ảnh hưởng lúc VẼ, không bao giờ
 * ảnh hưởng kết quả tính toán.
 */
export type XSegment = {
  physicalStart: number;
  physicalEnd: number;
  displayStart: number; // px trong displayWidth (KHÔNG gồm phần biểu đồ)
  displayEnd: number;
};

/** Nội suy tuyến tính TỪNG ĐOẠN — ngoài mọi đoạn thì ngoại suy theo đoạn gần nhất (không gãy khúc đột ngột). */
export function compressedX(physicalX: number, segments: XSegment[]): number {
  for (const seg of segments) {
    if (physicalX >= seg.physicalStart && physicalX <= seg.physicalEnd) {
      const span = seg.physicalEnd - seg.physicalStart;
      const t = span < 1e-9 ? 0 : (physicalX - seg.physicalStart) / span;
      return seg.displayStart + t * (seg.displayEnd - seg.displayStart);
    }
  }
  const first = segments[0]!, last = segments[segments.length - 1]!;
  if (physicalX < first.physicalStart) {
    const span = first.physicalEnd - first.physicalStart || 1;
    const slope = (first.displayEnd - first.displayStart) / span;
    return first.displayStart + (physicalX - first.physicalStart) * slope;
  }
  const span = last.physicalEnd - last.physicalStart || 1;
  const slope = (last.displayEnd - last.displayStart) / span;
  return last.displayStart + (physicalX - last.physicalStart) * slope;
}

/** Nghịch đảo compressedX — dùng khi kéo màn trên giao diện để suy ra D vật lý mới từ vị trí chuột. */
export function inverseCompressedX(displayX: number, segments: XSegment[]): number {
  for (const seg of segments) {
    if (displayX >= seg.displayStart && displayX <= seg.displayEnd) {
      const span = seg.displayEnd - seg.displayStart;
      const t = span < 1e-9 ? 0 : (displayX - seg.displayStart) / span;
      return seg.physicalStart + t * (seg.physicalEnd - seg.physicalStart);
    }
  }
  const first = segments[0]!, last = segments[segments.length - 1]!;
  if (displayX < first.displayStart) {
    const span = first.displayEnd - first.displayStart || 1;
    const slope = (first.physicalEnd - first.physicalStart) / span;
    return first.physicalStart + (displayX - first.displayStart) * slope;
  }
  const span = last.displayEnd - last.displayStart || 1;
  const slope = (last.physicalEnd - last.physicalStart) / span;
  return last.physicalStart + (displayX - last.displayStart) * slope;
}

/**
 * Dựng các đoạn nén theo đúng tỉ lệ mục tiêu: rào nguồn 8%, rào khe kép 36%,
 * màn 76%, biểu đồ bắt đầu 84% bề rộng hiển thị (displayWidth, KHÔNG gồm phần
 * biểu đồ). Đoạn khe-kép→màn co giãn theo D vật lý nhưng LUÔN khớp đúng 40%
 * bề rộng hiển thị (36%→76%, đúng khoảng "38–42%" yêu cầu) — đây là phần
 * "nén" chính khi D lớn.
 */
export function buildXSegments(
  xSourceBarrier: number,
  xDoubleSlitBarrier: number,
  xScreen: number,
  displayWidth: number,
  leadMargin = 40,
): XSegment[] {
  const f = (frac: number) => frac * displayWidth;
  return [
    { physicalStart: xSourceBarrier - leadMargin, physicalEnd: xSourceBarrier, displayStart: f(0), displayEnd: f(0.08) },
    { physicalStart: xSourceBarrier, physicalEnd: xDoubleSlitBarrier, displayStart: f(0.08), displayEnd: f(0.36) },
    { physicalStart: xDoubleSlitBarrier, physicalEnd: xScreen, displayStart: f(0.36), displayEnd: f(0.76) },
    { physicalStart: xScreen, physicalEnd: xScreen + leadMargin, displayStart: f(0.76), displayEnd: f(0.84) },
  ];
}

/** Khớp viewport để hộp bao [minX,maxX]×[minY,maxY] (toạ độ vật lý) lấp gần kín canvas. */
export function fitViewport(
  width: number,
  height: number,
  minX: number,
  maxX: number,
  minY: number,
  maxY: number,
  padding = 24,
): Viewport {
  const worldW = Math.max(maxX - minX, 1e-6);
  const worldH = Math.max(maxY - minY, 1e-6);
  const scale = Math.min((width - 2 * padding) / worldW, (height - 2 * padding) / worldH);
  return {
    width,
    height,
    scale,
    centerX: (minX + maxX) / 2,
    centerY: (minY + maxY) / 2,
  };
}
