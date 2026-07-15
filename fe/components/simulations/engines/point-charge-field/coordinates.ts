// World (vật lý, trục y HƯỚNG LÊN) ↔ screen/canvas (y HƯỚNG XUỐNG) — ranh
// giới DUY NHẤT chuyển đổi toạ độ, theo đúng quy ước engines/wave-field/coordinates.ts.
// Không dùng toạ độ pixel trực tiếp trong công thức vật lý ở nơi khác.

export type Viewport = { width: number; height: number; scale: number; centerX: number; centerY: number };

export function worldToScreen(x: number, y: number, vp: Viewport): { x: number; y: number } {
  return { x: vp.width / 2 + (x - vp.centerX) * vp.scale, y: vp.height / 2 - (y - vp.centerY) * vp.scale };
}

export function screenToWorld(px: number, py: number, vp: Viewport): { x: number; y: number } {
  return { x: vp.centerX + (px - vp.width / 2) / vp.scale, y: vp.centerY - (py - vp.height / 2) / vp.scale };
}

/** scale/center để khung world [minX,maxX]×[minY,maxY] vừa khít canvas, có padding (0..1 = tỉ lệ lấp đầy). */
export function fitViewport(
  width: number,
  height: number,
  minX: number,
  maxX: number,
  minY: number,
  maxY: number,
  padding = 0.82,
): Viewport {
  const spanX = Math.max(maxX - minX, 1e-6);
  const spanY = Math.max(maxY - minY, 1e-6);
  const scale = Math.min((width * padding) / spanX, (height * padding) / spanY);
  return { width, height, scale, centerX: (minX + maxX) / 2, centerY: (minY + maxY) / 2 };
}
