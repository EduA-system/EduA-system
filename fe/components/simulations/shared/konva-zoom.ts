// Zoom/pan dùng chung cho mọi renderer Konva (Cơ học + Sóng) — zoom KHÔNG
// GIAN (world), không phải zoom khung canvas: chỉ scale/dịch chuyển Stage,
// nền/khung canvas là CSS của container (không phải Konva.Rect) nên luôn phủ
// kín, không bao giờ "trôi" ra khỏi khung khi zoom/pan. Pan bị KHOÁ trong
// đúng "vùng làm việc" (panExtentFactor lần khung nhìn gốc) — kéo được, nhưng
// không kéo lệch xa khỏi tâm ra ngoài vùng đó.

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
    // "Vùng làm việc" đã vẽ sẵn (lưới/nền, xem GRID_EXTENT_FACTOR ở từng
    // renderer) rộng gấp panExtentFactor lần khung nhìn ban đầu MỖI CHIỀU,
    // canh giữa khung nhìn gốc. Pan bị khoá trong đúng khoảng này — không cho
    // kéo lộ ra vùng trống ngoài lưới đã vẽ. Mặc định 3 nếu không truyền vào.
    panExtentFactor?: number;
  },
): ZoomActions {
  // minZoom mặc định 0.8 — cho zoom out một chút để thấy rộng hơn khung gốc.
  const minZoom = opts.minZoom ?? 0.8;
  const maxZoom = opts.maxZoom ?? 6;
  const panExtentFactor = Math.max(1, opts.panExtentFactor ?? 3);
  let zoom = 1;
  const notify = () => opts.onZoomChange?.(Math.round(zoom * 100));

  // Vùng làm việc = hình chữ nhật rộng panExtentFactor·width × ·height, canh
  // giữa khung nhìn gốc [0,width]×[0,height]. Khoá vị trí stage sao cho hình
  // chữ nhật đó (sau khi scale theo zoom) LUÔN phủ kín container — không cho
  // kéo lệch xa tới mức hở ra khoảng trống ngoài vùng làm việc ở bất kỳ cạnh
  // nào (pan vẫn được, chỉ giới hạn trong tầm).
  const marginX = ((panExtentFactor - 1) / 2) * opts.width;
  const marginY = ((panExtentFactor - 1) / 2) * opts.height;
  const clampPos = (pos: { x: number; y: number }, z: number): { x: number; y: number } => ({
    x: Math.min(marginX * z, Math.max(opts.width * (1 - z) - marginX * z, pos.x)),
    y: Math.min(marginY * z, Math.max(opts.height * (1 - z) - marginY * z, pos.y)),
  });

  const applyZoom = (nextZoom: number, focal?: { x: number; y: number }) => {
    const clamped = Math.min(maxZoom, Math.max(minZoom, nextZoom));
    const f = focal ?? { x: opts.width / 2, y: opts.height / 2 };
    const stagePos = stage.position();
    const worldUnderFocal = { x: (f.x - stagePos.x) / zoom, y: (f.y - stagePos.y) / zoom };
    zoom = clamped;
    stage.scale({ x: zoom, y: zoom });
    stage.position(clampPos({ x: f.x - worldUnderFocal.x * zoom, y: f.y - worldUnderFocal.y * zoom }, zoom));
    stage.batchDraw();
    notify();
  };

  // Kéo nền canvas để pan (không đụng vật draggable riêng — chúng vẫn kéo
  // được bình thường, sự kiện dragstart trên vật tự chặn nổi lên Stage).
  stage.draggable(true);
  // Khoá NGAY TRONG LÚC kéo (không đợi thả tay mới chỉnh lại) — tránh giật.
  stage.dragBoundFunc((pos) => clampPos(pos, zoom));
  stage.on("wheel", (e) => {
    // Ctrl/Command + cuộn là thao tác đổi tỉ lệ của trình duyệt. Không được
    // đồng thời biến nó thành zoom canvas, nếu không scene sẽ tích luỹ zoom
    // và các chi tiết nhỏ như bánh xe bị phóng đại sau khi đổi tỉ lệ màn hình.
    if (e.evt.ctrlKey || e.evt.metaKey) return;
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
      stage.position(clampPos({ x: 0, y: 0 }, 1));
      stage.batchDraw();
      notify();
    },
  };
}
