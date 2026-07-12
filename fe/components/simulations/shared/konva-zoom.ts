// Zoom/pan dùng chung cho mọi renderer Konva (Cơ học + Sóng) — zoom KHÔNG
// GIAN (world), không phải zoom khung canvas: chỉ scale/dịch chuyển Stage,
// nền/khung canvas là CSS của container (không phải Konva.Rect) nên luôn phủ
// kín, không bao giờ "trôi" ra khỏi khung khi zoom/pan (bug cũ: nền vẽ bằng
// Konva.Rect bị scale/dịch theo cùng transform → co lại một góc).

import type Konva from "konva";

export type ZoomActions = { in: () => void; out: () => void; reset: () => void };

export function attachZoomPan(
  stage: Konva.Stage,
  opts: {
    width: number;
    height: number;
    minZoom?: number;
    maxZoom?: number;
    onZoomChange?: (percent: number) => void;
  },
): ZoomActions {
  // minZoom mặc định = 1 (đúng khung nhìn gốc) — KHOÁ không cho zoom out nhỏ
  // hơn mặc định, chỉ được zoom in rồi zoom out về lại tối đa là khung gốc.
  const minZoom = opts.minZoom ?? 1;
  const maxZoom = opts.maxZoom ?? 6;
  let zoom = 1;
  const notify = () => opts.onZoomChange?.(Math.round(zoom * 100));

  const applyZoom = (nextZoom: number, focal?: { x: number; y: number }) => {
    const clamped = Math.min(maxZoom, Math.max(minZoom, nextZoom));
    const f = focal ?? { x: opts.width / 2, y: opts.height / 2 };
    const stagePos = stage.position();
    const worldUnderFocal = { x: (f.x - stagePos.x) / zoom, y: (f.y - stagePos.y) / zoom };
    zoom = clamped;
    stage.scale({ x: zoom, y: zoom });
    stage.position({ x: f.x - worldUnderFocal.x * zoom, y: f.y - worldUnderFocal.y * zoom });
    stage.batchDraw();
    notify();
  };

  // Kéo nền canvas để pan (không đụng vật draggable riêng — chúng vẫn kéo
  // được bình thường, sự kiện dragstart trên vật tự chặn nổi lên Stage).
  stage.draggable(true);
  stage.on("wheel", (e) => {
    e.evt.preventDefault();
    const pointer = stage.getPointerPosition();
    const factor = 1.08;
    applyZoom(e.evt.deltaY > 0 ? zoom / factor : zoom * factor, pointer ?? undefined);
  });

  notify();
  return {
    in: () => applyZoom(zoom * 1.3),
    out: () => applyZoom(zoom / 1.3),
    reset: () => {
      zoom = 1;
      stage.scale({ x: 1, y: 1 });
      stage.position({ x: 0, y: 0 });
      stage.batchDraw();
      notify();
    },
  };
}
