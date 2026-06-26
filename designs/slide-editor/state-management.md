# Slide Editor — Chiến lược quản lý State

> Mục tiêu: editor cho user **sửa mạnh** (kéo/thả/resize/rotate, multi-select, undo/redo,
> AI generate, lưu DB) nhưng vẫn **mượt** ở mức thao tác 60fps.
>
> Nguyên tắc cốt lõi: **không gom hết state vào một chỗ**. Chia state theo
> *vòng đời* + *tần suất cập nhật*. Thủ phạm hiệu năng số 1 của canvas editor là
> **re-render lúc kéo thả** — phải cô lập nó.

---

## 1. Phân loại state & nơi lưu

| Loại state | Ví dụ | Lưu ở đâu | Lý do |
|---|---|---|---|
| **Document** (nguồn sự thật) | `slides`, `elements`, `selectedIds` | **Zustand store** | Cần undo/redo, save DB, AI ghi vào, nhiều component đọc → 1 nguồn duy nhất |
| **Tương tác tức thời** (high-freq) | drag đang diễn ra, vị trí chuột, rubber-band, snap guides | **`useRef` + DOM trực tiếp**, commit vào store khi `mouseup` | 60fps — đẩy qua React state = re-render cả cây 60 lần/giây → giật |
| **UI cục bộ** | tab panel đang mở, `urlInput`, ô nhập tạm | **`useState` trong component đó** | Không ai khác cần → để gần nơi dùng, đừng nhét vào store toàn cục |
| **Zoom / viewport** | zoom level, pan offset | store **hoặc** ref tuỳ mức chia sẻ | Nhiều nơi đọc → store; chỉ canvas → ref |
| **Server state** | AI busy, DB loading, lỗi | local `useState` (hoặc react-query nếu phức tạp) | Vòng đời gắn 1 request, không phải document |

**Quy tắc 1 dòng để nhớ:**
- Nhiều nơi đọc + cần undo/save → **store**
- Đổi 60fps lúc kéo → **ref, commit khi thả**
- Chỉ 1 component dùng → **useState cục bộ**

---

## 2. Điểm mấu chốt: drag KHÔNG đi qua store

Vòng đời 1 thao tác kéo:

```
mousedown  → dragRef.current = { kind, ids, startPositions... }   // ref, KHÔNG setState
mousemove  → cập nhật transform / vị trí                          // ref + ghi thẳng DOM (hoặc 1 setState rất hẹp)
mouseup    → commit 1 LẦN vào store + pushHistory                 // chỉ lúc này mới chạm store
```

- Nếu mỗi `mousemove` gọi `store.updateElement()` → mọi subscriber re-render 60 lần/giây.
- Phải gom lại, ghi store **một lần khi thả** → undo/redo cũng sạch (1 bước = 1 thao tác, không phải 60 bước).
- `dragRef` giữ snapshot vị trí ban đầu của các element được chọn để tính delta.

---

## 3. Tối ưu re-render với Zustand: luôn dùng selector hẹp

```ts
// ❌ subscribe TẤT CẢ — re-render mỗi khi bất kỳ thứ gì trong store đổi
const { slides, selectedIds } = useEditorStore();

// ✅ chỉ re-render khi đúng slice này đổi
const selectedIds = useEditorStore((s) => s.selectedIds);
const element = useEditorStore((s) => s.currentSlide()?.elements.find((e) => e.id === id));
```

→ Sửa 1 element thì chỉ component render element đó re-render — không kéo theo tray / panel / toolbar.

Với value tính toán phức tạp, cân nhắc `useShallow` (Zustand v5) để so sánh nông, tránh tạo object mới mỗi render.

---

## 4. Cấu trúc thư mục đề xuất

Lấy **UI/UX edit mạnh** của `/test-slide` (project cũ) + **kiến trúc store** của `components/editor` (project cũ):

```
fe/
├── stores/                       (hoặc lib/stores/)
│   └── slide-editor-store.ts     ← DOCUMENT state: slides, elements, selectedIds, undo/redo
│
├── components/slide-editor/
│   ├── SlideEditor.tsx           ← container: giữ dragRef (ref), UI cục bộ (useState), gắn event
│   ├── Canvas.tsx                ← đọc store qua selector hẹp
│   ├── ContextualToolbar.tsx     ← nhận selected element qua selector
│   ├── SidePanel.tsx
│   ├── SlideTray.tsx
│   ├── SelectionBox.tsx
│   ├── elements/                 ← 1 component / loại element (text, shape, image, line, latex…)
│   ├── types.ts                  ← schema element (mirror BE)
│   └── lib/                      ← hàm thuần: geometry (resize/snap/rotate), factory, html-to-slide
│
└── lib/
    ├── api/                      ← Services: slide-design, slide-store…
    └── ws/                       ← Realtime: slide streaming client
```

Khác biệt chính so với `/test-slide` cũ: **state document chuyển từ `page.tsx` ra `stores/slide-editor-store.ts`** → editor tái dùng được ở nhiều route, test được, và khớp sơ đồ kiến trúc (layer Stores tách riêng).

---

## 5. Khung `slide-editor-store.ts` đề xuất

Schema element gộp các field "sửa mạnh" của editor cũ (`opacity`, `dashStyle`, `arrowHead`,
endpoint `x1..y2` cho line/arrow) vào kiểu union mirror BE.

```ts
"use client";

import { create } from "zustand";

export const CANVAS_W = 960;
export const CANVAS_H = 540;

type ElementType = "text" | "shape" | "image" | "line" | "arrow" | "latex";

interface ElementBase {
  id: string;
  type: ElementType;
  x: number; y: number; w: number; h: number;
  rotation: number;
  zIndex: number;
  opacity: number;          // ← từ editor cũ
  locked: boolean;
}

interface TextElement extends ElementBase {
  type: "text";
  text: string;
  fontSize: number;
  bold: boolean;
  italic: boolean;
  color: string;
  align: "left" | "center" | "right";
}

interface ShapeElement extends ElementBase {
  type: "shape";
  shape: "rect" | "ellipse";
  fill: string;
  stroke: string;
  strokeW: number;
  borderRadius: number;
}

interface ImageElement extends ElementBase {
  type: "image";
  src: string;
  fit: "cover" | "contain" | "fill";
  borderRadius: number;
}

interface LineElement extends ElementBase {
  type: "line" | "arrow";
  stroke: string;
  strokeW: number;
  dashStyle: "solid" | "dashed" | "dotted";   // ← từ editor cũ
  arrowHead: "end" | "both" | "none";          // ← từ editor cũ
  x1: number; y1: number; x2: number; y2: number;
}

interface LatexElement extends ElementBase {
  type: "latex";
  tex: string;
}

type SlideElement =
  | TextElement | ShapeElement | ImageElement | LineElement | LatexElement;

interface Slide {
  id: string;
  bg: string;
  elements: SlideElement[];
  aiPrompt?: string;
}

// ─── State + actions ──────────────────────────────────────────────
interface Snapshot { slides: Slide[]; currentSlideId: string; }

interface EditorState {
  // DOCUMENT
  slides: Slide[];
  currentSlideId: string;
  selectedIds: string[];
  history: { past: Snapshot[]; future: Snapshot[] };

  // selectors / derived
  currentSlide: () => Slide | undefined;

  // slide actions
  setSlides: (s: Slide[]) => void;
  setCurrentSlide: (id: string) => void;
  addBlankSlide: (afterId?: string) => void;
  duplicateSlide: (id: string) => void;
  deleteSlide: (id: string) => void;
  reorderSlides: (from: number, to: number) => void;

  // selection
  select: (ids: string[]) => void;
  toggleSelect: (id: string) => void;
  clearSelection: () => void;

  // element actions  (mỗi action = 1 bước undo)
  addElement: (el: SlideElement) => void;
  updateElement: (id: string, patch: Partial<SlideElement>) => void;
  updateMany: (ids: string[], patch: Partial<SlideElement>) => void;  // commit sau drag
  removeElements: (ids: string[]) => void;
  duplicateElements: (ids: string[]) => void;
  bringForward: (id: string) => void;
  sendBackward: (id: string) => void;
  align: (ids: string[], dir: "left" | "right" | "top" | "bottom" | "cx" | "cy") => void;

  // undo/redo
  undo: () => void;
  redo: () => void;
}
```

**Nguyên tắc thiết kế action:**
- Mỗi action người-dùng = **đúng 1** snapshot history (đừng push history trong vòng lặp `mousemove`).
- Drag/resize/rotate: container tính ở `dragRef`, đến `mouseup` gọi **`updateMany`** một lần.
- `updateElement` (gõ số trong panel, đổi màu…) push history ngay vì là thao tác rời rạc.

---

## 6. Ranh giới rõ ràng giữa các tầng

```
Components (UI "ngu")  ──action──▶  Store (document + undo/redo)
       ▲                                  │
       └── selector hẹp ◀─────────────────┘
                                          │
Container giữ dragRef ──commit khi mouseup─┘
       │
       └──▶ lib/api (save/load, AI)   └──▶ lib/ws (streaming)
```

- **Component** không tự giữ document state — chỉ đọc qua selector + gọi action.
- **Container** giữ `dragRef` + UI cục bộ; là nơi duy nhất gắn `mousemove`/`mouseup`.
- **lib/** là hàm thuần (geometry, factory) — không chạm React, không chạm store.
- **lib/api + lib/ws** đọc/ghi store qua action (vd AI stream → `updateElement`/`upsertSlide`).

---

## 7. Checklist khi implement

- [ ] Store chỉ chứa **document state**, không chứa drag tạm / UI panel.
- [ ] Mọi `mousemove` đi qua **ref**, không `setState`/store.
- [ ] Commit vào store **1 lần** khi `mouseup`, kèm `pushHistory`.
- [ ] Component đọc store bằng **selector hẹp**, không destructure cả store.
- [ ] UI cục bộ (tab, input tạm) để **`useState`** trong component.
- [ ] History giới hạn (vd 50 bước) để khỏi phình bộ nhớ.
- [ ] AI streaming ghi vào store qua action, không bypass.
