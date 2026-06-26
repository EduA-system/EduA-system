# Slide Editor — Store & Cấu trúc Folder

> Sprint design cho **Slide Editor** (canvas 960×540, kiểu Canva, cho giáo viên sửa slide bài giảng).
> Tài liệu này mô tả **cách triển khai state/store** và **cấu trúc folder** của FE.
> Quy ước task: `[ ]` = chưa làm · `[~]` = đang làm · `[x]` = xong.
>
> Liên quan: chiến lược state ở `designs/slide-editor/state-management.md`,
> API BE ở `designs/API_designs/slide-generation.md`.

---

## 0. Nguyên tắc nền

State chia theo **vòng đời + tần suất cập nhật**, KHÔNG gom một chỗ:

| Loại | Ví dụ | Lưu ở đâu |
|---|---|---|
| **Document** (nguồn sự thật) | `slides`, `elements`, `selectedIds` | **Zustand store** |
| **Tương tác 60fps** | drag/resize/rotate đang diễn ra, snap guides | **`useRef`**, commit store khi `mouseup` |
| **UI cục bộ** | tab panel đang mở, input tạm | **`useState`** trong component |
| **Server state** | AI busy, loading | local `useState` |

Phép thử nhanh: *"Field này có cần vào file JSON khi export không?"* → **Có** ⇒ store; **Không** ⇒ ref/useState.

---

## 1. Cấu trúc folder

```
fe/
├── stores/
│   └── slide-editor-store.ts        ← Zustand store: document state + actions
│
├── components/slide-editor/
│   ├── SlideEditor.tsx              ← shell: ghép TopBar + Canvas + SlideTray (+ panel sau)
│   ├── TopBar.tsx                   ← thanh trên (undo/redo, zoom, export… — thêm dần)
│   ├── Canvas.tsx                   ← khung 960×540, render elements, bắt sự kiện chuột (pha sau)
│   ├── ElementView.tsx              ← render 1 element theo type
│   ├── SelectionBox.tsx             ← 8 handle resize + nút xoay (pha sau)
│   ├── ContextualToolbar.tsx        ← chỉnh thuộc tính theo element đang chọn (pha sau)
│   ├── SidePanel.tsx                ← tab thêm Hình/Chữ/Ảnh (pha sau)
│   ├── SlideTray.tsx                ← dải thumbnail + điều hướng slide
│   ├── types.ts                     ← schema element/slide (nội bộ editor)
│   ├── seed.ts                      ← dữ liệu slide mẫu (tạm, cho demo khung)
│   └── lib/                         ← HÀM THUẦN, không React, không store
│       ├── factory.ts              ← makeElement(type), makeSlide()
│       ├── geometry.ts             ← applyResize, computeSnap, rotate (pha sau)
│       └── be-mapper.ts            ← map element nội bộ ⇄ DTO BE (pha tích hợp)
│
├── lib/
│   ├── api/slides.ts                ← Services: gọi REST slide (generate-outline, deck…) (pha sau)
│   └── ws/slide-client.ts           ← Realtime: STOMP streaming slide parts (pha sau)
│
└── app/slide-maker/page.tsx         ← route, render <SlideEditor/>
```

**Quy ước phân tầng:**
- `components/slide-editor/*` = UI "ngu": đọc store qua **selector hẹp**, gọi action; không tự giữ document state.
- `SlideEditor.tsx` (container) = nơi DUY NHẤT giữ `dragRef` + UI cục bộ + gắn `mousemove`/`mouseup`.
- `lib/` (trong slide-editor) = hàm thuần, test được độc lập.
- `@/stores`, `@/components/slide-editor`, `@/lib/api`, `@/lib/ws` qua alias `@/*` = root `fe/`.

---

## 2. Cách triển khai store

### 2.1 Schema (types.ts)

Element **phẳng** (tiện cho toolbar), gộp đủ field "sửa mạnh"; map sang DTO BE ở `lib/be-mapper.ts`.

```ts
export const CANVAS_W = 960;
export const CANVAS_H = 540;

type ElementType = "text" | "shape" | "image" | "line" | "arrow" | "latex";

interface ElementBase {
  id: string; type: ElementType;
  x: number; y: number; w: number; h: number;
  rotation: number; zIndex: number; opacity: number; locked: boolean;
}
// text: text, fontSize, bold, italic, color, align
// shape: shape("rect"|"ellipse"), fill, stroke, strokeW, borderRadius
// image: src, fit("cover"|"contain"|"fill"), borderRadius
// line/arrow: stroke, strokeW, dashStyle, arrowHead, x1,y1,x2,y2
// latex: tex

type SlideElement = /* union các type trên */ ElementBase & Record<string, unknown>;

interface Slide { id: string; bg: string; elements: SlideElement[]; aiPrompt?: string; }
```

### 2.2 Shape của store (slide-editor-store.ts)

```ts
interface Snapshot { slides: Slide[]; currentSlideId: string; }

interface EditorState {
  // DOCUMENT
  slides: Slide[];
  currentSlideId: string;
  selectedIds: string[];
  history: { past: Snapshot[]; future: Snapshot[] };

  // selector
  currentSlide: () => Slide | undefined;

  // điều hướng slide
  setCurrentSlide: (id: string) => void;
  nextSlide: () => void;
  prevSlide: () => void;
  addBlankSlide: (afterId?: string) => void;
  duplicateSlide: (id: string) => void;
  deleteSlide: (id: string) => void;
  reorderSlides: (from: number, to: number) => void;

  // selection
  select: (ids: string[]) => void;
  toggleSelect: (id: string) => void;
  clearSelection: () => void;

  // element (mỗi action = 1 bước undo)
  addElement: (el: SlideElement) => void;
  updateElement: (id: string, patch: Partial<SlideElement>) => void;
  updateMany: (ids: string[], patch: Partial<SlideElement>) => void;  // commit sau drag
  removeElements: (ids: string[]) => void;
  duplicateElements: (ids: string[]) => void;
  align: (ids: string[], dir: "left"|"right"|"top"|"bottom"|"cx"|"cy") => void;
  bringForward: (id: string) => void;
  sendBackward: (id: string) => void;

  // undo/redo
  undo: () => void;
  redo: () => void;
}
```

### 2.3 Quy tắc triển khai action

- **1 thao tác người dùng = đúng 1 snapshot history.** Không push history trong vòng lặp `mousemove`.
- **Drag/resize/rotate:** container tính delta ở `dragRef`, đến `mouseup` mới gọi **`updateMany`** một lần.
- **Sửa rời rạc** (gõ số trong panel, đổi màu): `updateElement` push history ngay.
- **History giới hạn** (vd 50) để khỏi phình bộ nhớ; mỗi snapshot dùng `structuredClone`.
- Helper `withCurrentSlide(state, fn)` + `pushHistory(state)` để tránh lặp code trong action.

### 2.4 Đọc store ở component — luôn selector hẹp

```ts
// ❌ subscribe cả store → re-render thừa
const { slides, selectedIds } = useEditorStore();

// ✅ chỉ re-render khi đúng slice đổi
const selectedIds = useEditorStore((s) => s.selectedIds);
const el = useEditorStore((s) => s.currentSlide()?.elements.find((e) => e.id === id));
```

### 2.5 Drag KHÔNG đi qua store

```
mousedown → dragRef.current = { kind, ids, starts }   // ref, KHÔNG setState
mousemove → cập nhật vị trí qua ref/transform          // không chạm store
mouseup   → updateMany(ids, patch) + pushHistory       // commit 1 lần
```

### 2.6 Export / Import JSON

- Export: `JSON.stringify(useEditorStore.getState().slides)` — **một nguồn duy nhất** là store.
- Ref/useState bị loại khỏi snapshot có chủ đích (không phải nội dung tài liệu).
- Import: `JSON.parse` → `setSlides(parsed)`.

---

## 3. Task list

### 3.1 Bước 1 — Dựng khung (xong)

- [x] Cài `zustand` vào `fe/package.json`.
- [x] `types.ts`: `CANVAS_W/H`, `SlideElement`, `Slide` (tối thiểu: text/shape/image).
- [x] `seed.ts`: 3–4 slide mẫu (bg + element khác nhau) để demo chuyển slide.
- [x] `stores/slide-editor-store.ts`: chỉ phần điều hướng (`slides`, `currentSlideId`,
      `currentSlide`, `setCurrentSlide`, `nextSlide`, `prevSlide`) khởi từ seed.
- [x] `SlideEditor.tsx`: shell dọc TopBar + Canvas + SlideTray + BottomBar.
- [x] `TopBar.tsx`: thanh công cụ trên **để trống** (chừa chỗ tool).
- [x] `Canvas.tsx` + `ElementView.tsx`: render slide hiện tại read-only (canvas bo góc + đổ bóng).
- [x] `SlideTray.tsx`: thumbnail (nền xám, highlight slide đang chọn); điều hướng bằng click thumbnail.
- [x] `BottomBar.tsx`: thanh dưới kiểu Canva — số trang thật; Notes/Timer/zoom/Pages để chrome tĩnh.
- [x] `app/slide-maker/page.tsx`: gắn `<SlideEditor/>` (giữ Sidebar app).
- [x] Verify: `/slide-maker` chuyển qua lại các slide được; `lint` + `typecheck` + `build` pass.

### 3.2 Bước 2 — Sửa element cơ bản

- [ ] Mở rộng schema: opacity, stroke, line/arrow endpoint, dashStyle, arrowHead.
- [ ] Store actions: add/update/updateMany/remove/duplicate/select + undo/redo + history.
- [ ] `Canvas` bắt chuột: select, move (qua `dragRef`, commit khi thả).
- [ ] `SelectionBox`: 8 handle resize + xoay; `lib/geometry.ts`.
- [ ] `ContextualToolbar` + `SidePanel`: thêm element, chỉnh thuộc tính.
- [ ] Phím tắt: Delete, Ctrl+Z/Y/C/V/D/A, nudge, `[`/`]`.
- [ ] Export/Import JSON + lưu localStorage.

### 3.3 Bước 3 — Tích hợp BE

- [ ] `lib/be-mapper.ts`: map element nội bộ ⇄ DTO BE (width/height, style{}, type HOA).
- [ ] `lib/api/slides.ts`: generate-outline, generate-parts, get deck, regenerate.
- [ ] `lib/ws/slide-client.ts`: subscribe `/topic/slides/{sessionId}`, ghi store qua action.
- [ ] Khôi phục phiên qua `GET /api/slides/sessions/{sessionId}`.

---

## 4. Checklist chất lượng

- [ ] Store chỉ chứa **document state**; drag tạm/UI panel KHÔNG vào store.
- [ ] Mọi `mousemove` đi qua **ref**, không setState/store.
- [ ] Commit store **1 lần** khi `mouseup` kèm `pushHistory`.
- [ ] Component đọc store bằng **selector hẹp**.
- [ ] UI cục bộ để **`useState`** trong component.
- [ ] History có giới hạn bước.
- [ ] Element cần serialize đều nằm trong store (qua phép thử mục 0).
