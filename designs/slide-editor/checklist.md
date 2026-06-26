# Slide Editor — Checklist phát triển

> Checklist tổng hợp từ `sprints/slide-editor-store-and-structure.md`,
> `designs/slide-editor/state-management.md`, `designs/slide-editor/canva-editor-features.md`.
>
> `[x]` = xong · `[~]` = đang làm · `[ ]` = chưa làm

---

## Giai đoạn 1 — Core Editor (xong)

- [x] Cài `zustand` vào `fe/package.json`.
- [x] `types.ts`: `CANVAS_W/H`, `SlideElement`, `Slide` (text/shape/image/line/arrow).
- [x] `seed.ts`: 4 slide mẫu với các loại element khác nhau.
- [x] `stores/slide-editor-store.ts`: slides, currentSlideId, currentSlide, setCurrentSlide, nextSlide, prevSlide.
- [x] `SlideEditor.tsx`: shell dọc TopBar + Canvas + SlideTray + BottomBar.
- [x] `TopBar.tsx`: thanh trên để trống (chừa chỗ tool).
- [x] `Canvas.tsx` + `ElementView.tsx`: render slide hiện tại, canvas bo góc + đổ bóng.
- [x] `SlideTray.tsx`: thumbnail, highlight slide đang chọn, click để chuyển.
- [x] `BottomBar.tsx`: chrome tĩnh kiểu Canva — số trang thật, Notes/Timer/zoom/Pages tĩnh.
- [x] `app/slide-maker/page.tsx`: route `/slide-maker` gắn `<SlideEditor/>` + Sidebar.

---

## Giai đoạn 2 — Element Interaction (xong)

- [x] Store actions: select/toggleSelect/clearSelection.
- [x] Store actions: addElement/updateElement/updateMany/removeElements/duplicateElements.
- [x] Store actions: bringForward/sendBackward.
- [x] Store actions: undo/redo (50 bước history).
- [x] `Canvas` bắt chuột: select, move (dragRef + live feedback khi mousemove).
- [x] `SelectionBox`: 8 handle resize + rotate.
- [x] `lib/geometry.ts`: computeBoundingBox, applyResize, applyRotation, getCenter.
- [x] Phím tắt: Delete/Backspace, Ctrl+Z/Y, Ctrl+D, Ctrl+A, Arrow nudge, Ctrl+[/].
- [x] ElementView: render 4 type (text, shape, line/arrow, image) đầy đủ field.

---

## Giai đoạn 3 — Toolbar & Panel (port từ /test-slide — xong phần lõi)

### 3.1 TopBar — Thanh công cụ trên

- [x] Undo/Redo buttons.
- [x] Zoom control (fit / 100% / preset dropdown).
- [x] Export button (JSON). _PNG chưa._
- [~] Thêm element: đã chuyển sang **SidePanel** (mục 3.3), không nằm ở TopBar.

### 3.2 ContextualToolbar — Thanh thuộc tính theo element

- [x] Khi select text: fontSize, bold, italic, underline, strikethrough, color, align, fontFamily, textTransform, listStyle, lineHeight, letterSpacing, textBg.
- [x] Khi select shape/poly: fill (solid+gradient), stroke, strokeW, borderRadius, opacity.
- [x] Khi select image: fit (cover/contain/fill), flipH/flipV, brightness/contrast, borderRadius.
- [x] Khi select line/arrow: stroke color, strokeW, dashStyle (+fine), arrowHead, lineMarkerStart/End.
- [x] Color picker gradient (linear/radial + eyedropper + presets) thay `<input type=color>`.
- [x] Chung: opacity; lock toggle (Ctrl+L / chuột phải); **X/Y/W/H/rotation input số** (single).

### 3.3 SidePanel — Thêm element

- [x] Tab Text (Chữ): tiêu đề lớn/vừa/nhỏ, đoạn văn, chú thích.
- [x] Tab Shapes (Hình): grid shape (rect, tròn, ellipse, viền).
- [x] Tab Lines: line + arrow (nằm trong tab Hình).
- [x] Tab Upload (Ảnh): upload file + paste URL (tự đo kích thước).
- [x] Thư viện shape SVG (poly): 6 nhóm (cơ bản, sao, mũi tên, bong bóng, đặc biệt, lưu đồ).
- [x] Đổi màu nền slide: ColorPicker ở ContextualToolbar khi không chọn element.
- [x] Tab Công cụ: vẽ tay (brush/pencil/eraser + màu/cỡ) + cheatsheet phím tắt.

### 3.4 Inline edit & thao tác nâng cao (port từ /test-slide)

- [x] Inline text editing: double-click ô text → textarea sửa chữ, commit khi blur/Esc (1 bước history).
- [x] Context menu chuột phải (element + nền canvas): copy/duplicate/paste/delete/z-order/lock.
- [x] Copy/Paste qua clipboard store (Ctrl+C / Ctrl+V, offset +20).
- [x] Rubber-band selection: kéo trên nền canvas để chọn nhiều element.
- [x] Lock element: Ctrl+L / chuột phải; locked chặn move/resize/rotate.
- [x] Lock tỉ lệ khi resize (toggle TopBar + giữ Shift); resize text auto-scale fontSize.
- [x] Snap góc xoay 15° khi giữ Shift.
- [x] Sửa endpoint line/arrow (kéo 2 đầu).
- [x] Esc bỏ chọn; nền canvas grid 20×20.

---

## Giai đoạn 4 — Layout & Positioning

- [x] Align elements (left/center/right/top/middle/bottom) khi multi-select.
- [x] Distribute horizontally / vertically (≥3 element).
- [x] Smart Guides (snap khi drag gần edge/giữa của element khác + mép canvas).
- [x] Position panel: X, Y, W, H, Rotation input số (ở ContextualToolbar khi chọn 1 element).
- [x] Layers panel: list layer, eye icon (hide), lock icon, click chọn. _(drag reorder chưa)_
- [x] Group / Ungroup (Ctrl+G / Ctrl+Shift+G + chuột phải; click chọn cả nhóm).

---

## Giai đoạn 5 — Slide Management

- [x] Nút "+" Add blank slide.
- [x] Hover giữa 2 slide → nút "+" chèn slide trống vào giữa.
- [x] Nút duplicate slide.
- [x] Nút delete slide.
- [x] Drag reorder slide trong tray.
- [ ] Pages panel (grid view tất cả slide).
- [x] Đổi background slide.

---

## Giai đoạn 6 — Animation & Present

- [ ] Element animations (fade, rise, bounce, typewriter).
- [ ] Page transitions (dissolve, slide).
- [ ] On-click animation (click → element xuất hiện).
- [ ] Present mode (Ctrl+Alt+P): full screen.
- [ ] Presenter view: notes + timer + slide preview.
- [ ] Draw on slide khi present (annotate).
- [ ] Magic Shortcuts: B (blur), C (confetti), timer.

---

## Giai đoạn 7 — Data & Export

- [x] Export slides → JSON.
- [x] Import slides từ JSON.
- [ ] Export → PNG (từng slide).
- [ ] Export → PDF.
- [x] Auto-save localStorage (key `slide-editor-v1`, debounce qua store.subscribe).
- [x] `lib/factory.ts`: makeText/makeShape/makeLine/makeImage + `makeByType`.

---

## Giai đoạn 8 — BE Integration

- [ ] `lib/be-mapper.ts`: map element nội bộ ⇄ DTO BE.
- [ ] `lib/api/slides.ts`: generate-outline, generate-parts, get deck, regenerate.
- [ ] `lib/ws/slide-client.ts`: subscribe `/topic/slides/{sessionId}`.
- [ ] Khôi phục phiên qua `GET /api/slides/sessions/{sessionId}`.

---

## Quality checklist

- [x] Store chỉ chứa document state; drag tạm/UI panel không vào store.
- [x] Mousemove đi qua ref, không setState/store.
- [x] Commit store 1 lần khi mouseup kèm pushHistory.
- [x] Component đọc store bằng selector hẹp.
- [x] UI cục bộ để useState trong component (activeTab/urlInput ở SidePanel).
- [x] History có giới hạn (50 bước).
- [ ] Element cần serialize đều nằm trong store.
