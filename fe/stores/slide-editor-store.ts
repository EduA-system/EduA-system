"use client";

import { create } from "zustand";
import {
  isSlideLockedForGeneration,
  type Slide,
  type SlideElement,
  type ElementPatch,
  type AlignDir,
} from "@/components/slide-editor/types";
import { computeBoundingBox } from "@/components/slide-editor/lib/geometry";
import { seedSlides } from "@/components/slide-editor/seed";

const MAX_HISTORY = 50;

interface Snapshot {
  slides: Slide[];
  currentSlideId: string;
}

interface EditorState {
  slides: Slide[];
  currentSlideId: string;
  selectedIds: string[];
  clipboard: SlideElement[];
  history: { past: Snapshot[]; future: Snapshot[] };

  currentSlide: () => Slide | undefined;

  setCurrentSlide: (id: string) => void;
  nextSlide: () => void;
  prevSlide: () => void;
  addBlankSlide: (afterId?: string) => void;
  duplicateSlide: (id: string) => void;
  deleteSlide: (id: string) => void;
  reorderSlides: (from: number, to: number) => void;

  select: (ids: string[]) => void;
  toggleSelect: (id: string) => void;
  clearSelection: () => void;

  addElement: (el: Omit<SlideElement, "id"> & { id?: string }) => void;
  updateElement: (id: string, patch: ElementPatch) => void;
  updateMany: (ids: string[], patch: ElementPatch) => void;
  removeElements: (ids: string[]) => void;
  duplicateElements: (ids: string[]) => void;
  bringForward: (id: string) => void;
  sendBackward: (id: string) => void;
  bringToFront: (id: string) => void;
  sendToBack: (id: string) => void;
  batchUpdate: (updates: { id: string; patch: ElementPatch }[]) => void;
  transientUpdate: (updates: { id: string; patch: ElementPatch }[]) => void;
  pushSnapshot: (snap: Snapshot) => void;
  alignElements: (dir: AlignDir) => void;
  distribute: (dir: "h" | "v") => void;
  groupSelected: () => void;
  ungroupSelected: () => void;
  setSlideBackground: (bg: string) => void;
  toggleLock: (ids: string[]) => void;
  copySelected: () => void;
  paste: () => void;
  replaceSlides: (slides: Slide[]) => void;

  undo: () => void;
  redo: () => void;
}

let idCounter = 0;
function uid() {
  return `el-${Date.now()}-${++idCounter}`;
}

function slideId() {
  return `slide-${Date.now()}-${++idCounter}`;
}

function syncElementOrder(elements: SlideElement[]): SlideElement[] {
  return elements.map((el, index) => ({ ...el, zIndex: index + 1 } as SlideElement));
}

function normalizeIncomingElements(elements: SlideElement[]): SlideElement[] {
  return syncElementOrder(
    [...elements].sort((a, b) => {
      const az = Number.isFinite(a.zIndex) ? a.zIndex : Number.MAX_SAFE_INTEGER;
      const bz = Number.isFinite(b.zIndex) ? b.zIndex : Number.MAX_SAFE_INTEGER;
      return az - bz;
    })
  );
}

export function normalizeSlides(slides: Slide[]): Slide[] {
  return slides.map((slide) => ({
    ...slide,
    elements: normalizeIncomingElements(slide.elements ?? []),
  }));
}

const normalizedSeedSlides = normalizeSlides(seedSlides);

function pushHistory(state: EditorState): { past: Snapshot[]; future: Snapshot[] } {
  const snap: Snapshot = {
    slides: structuredClone(state.slides),
    currentSlideId: state.currentSlideId,
  };
  const past = [...state.history.past, snap].slice(-MAX_HISTORY);
  return { past, future: [] };
}

function withCurrentSlide(
  state: EditorState,
  fn: (slide: Slide) => Slide
): Slide[] {
  return state.slides.map((s) => {
    if (s.id !== state.currentSlideId) return s;
    const next = fn(s);
    return { ...next, elements: syncElementOrder(next.elements) };
  });
}

function visibleIds(slide: Slide | undefined): Set<string> {
  return new Set((slide?.elements ?? []).filter((el) => !el.hidden).map((el) => el.id));
}

function filterSelection(state: EditorState, ids: string[]): string[] {
  const allowed = visibleIds(state.slides.find((s) => s.id === state.currentSlideId));
  return ids.filter((id, index) => allowed.has(id) && ids.indexOf(id) === index);
}

function filterSelectionForSlides(slides: Slide[], currentSlideId: string, ids: string[]): string[] {
  const allowed = visibleIds(slides.find((s) => s.id === currentSlideId));
  return ids.filter((id, index) => allowed.has(id) && ids.indexOf(id) === index);
}

function remapGroupIds(elements: SlideElement[]): SlideElement[] {
  const groupIds = new Map<string, string>();
  return elements.map((el) => {
    if (!el.groupId) return el;
    let groupId = groupIds.get(el.groupId);
    if (!groupId) {
      groupId = `grp-${Date.now()}-${++idCounter}`;
      groupIds.set(el.groupId, groupId);
    }
    return { ...el, groupId } as SlideElement;
  });
}

function normalizeSelectedIds(slides: Slide[], currentSlideId: string, ids: string[]): string[] {
  return filterSelectionForSlides(slides, currentSlideId, ids);
}

function reindexSlides(slides: Slide[]): Slide[] {
  return slides.map((slide) => ({
    ...slide,
    elements: syncElementOrder(slide.elements),
  }));
}

function isCurrentSlideLocked(state: EditorState): boolean {
  return isSlideLockedForGeneration(state.slides.find((s) => s.id === state.currentSlideId));
}

function hasLockedGenerationSlide(slides: Slide[]): boolean {
  return slides.some(isSlideLockedForGeneration);
}

export const useEditorStore = create<EditorState>((set, get) => ({
  slides: normalizedSeedSlides,
  currentSlideId: normalizedSeedSlides[0].id,
  selectedIds: [],
  clipboard: [],
  history: { past: [], future: [] },

  currentSlide: () => {
    const { slides, currentSlideId } = get();
    return slides.find((s) => s.id === currentSlideId);
  },

  setCurrentSlide: (id) => set({ currentSlideId: id, selectedIds: [] }),

  nextSlide: () =>
    set((state) => {
      const i = state.slides.findIndex((s) => s.id === state.currentSlideId);
      if (i < 0 || i >= state.slides.length - 1) return state;
      return { currentSlideId: state.slides[i + 1].id, selectedIds: [] };
    }),

  prevSlide: () =>
    set((state) => {
      const i = state.slides.findIndex((s) => s.id === state.currentSlideId);
      if (i <= 0) return state;
      return { currentSlideId: state.slides[i - 1].id, selectedIds: [] };
    }),

  addBlankSlide: (afterId) =>
    set((state) => {
      if (hasLockedGenerationSlide(state.slides)) return state;
      const newSlide: Slide = {
        id: slideId(),
        bg: "#ffffff",
        elements: [],
      };
      const idx = afterId
        ? state.slides.findIndex((s) => s.id === afterId) + 1
        : state.slides.length;
      const slides = [...state.slides];
      slides.splice(idx, 0, newSlide);
      return { ...pushHistory(state), slides, currentSlideId: newSlide.id };
    }),

  duplicateSlide: (id) =>
    set((state) => {
      if (hasLockedGenerationSlide(state.slides)) return state;
      const src = state.slides.find((s) => s.id === id);
      if (!src) return state;
      const newSlide: Slide = {
        ...structuredClone(src),
        id: slideId(),
        elements: remapGroupIds(src.elements.map((el) => ({ ...el, id: uid() }))),
      };
      const idx = state.slides.findIndex((s) => s.id === id) + 1;
      const slides = [...state.slides];
      slides.splice(idx, 0, newSlide);
      return { ...pushHistory(state), slides, currentSlideId: newSlide.id };
    }),

  deleteSlide: (id) =>
    set((state) => {
      if (hasLockedGenerationSlide(state.slides)) return state;
      if (state.slides.length <= 1) return state;
      const idx = state.slides.findIndex((s) => s.id === id);
      const slides = state.slides.filter((s) => s.id !== id);
      const currentSlideId =
        state.currentSlideId === id
          ? slides[Math.min(idx, slides.length - 1)].id
          : state.currentSlideId;
      return { ...pushHistory(state), slides, currentSlideId, selectedIds: [] };
    }),

  reorderSlides: (from, to) =>
    set((state) => {
      if (hasLockedGenerationSlide(state.slides)) return state;
      const slides = [...state.slides];
      const [moved] = slides.splice(from, 1);
      slides.splice(to, 0, moved);
      return { ...pushHistory(state), slides };
    }),

  select: (ids) =>
    set((state) => {
      if (isCurrentSlideLocked(state)) return { selectedIds: [] };
      return { selectedIds: filterSelection(state, ids) };
    }),

  toggleSelect: (id) =>
    set((state) => {
      if (isCurrentSlideLocked(state)) return { selectedIds: [] };
      const allowed = visibleIds(state.slides.find((s) => s.id === state.currentSlideId));
      if (!allowed.has(id)) return state;
      const selected = state.selectedIds.includes(id)
        ? state.selectedIds.filter((i) => i !== id)
        : [...state.selectedIds, id];
      return { selectedIds: selected };
    }),

  clearSelection: () => set({ selectedIds: [] }),

  addElement: (el) =>
    set((state) => {
      if (isCurrentSlideLocked(state)) return state;
      const id = el.id || uid();
      const newElement = { ...el, id, zIndex: 0, hidden: false } as SlideElement;
      return {
        ...pushHistory(state),
        slides: withCurrentSlide(state, (slide) => ({
          ...slide,
          elements: [...slide.elements, newElement],
        })),
        selectedIds: [id],
      };
    }),

  updateElement: (id, patch) =>
    set((state) => {
      if (isCurrentSlideLocked(state)) return state;
      const slides = withCurrentSlide(state, (slide) => ({
        ...slide,
        elements: slide.elements.map((el) =>
          el.id === id ? ({ ...el, ...patch } as SlideElement) : el
        ),
      }));
      return {
        ...pushHistory(state),
        slides,
        selectedIds: filterSelectionForSlides(slides, state.currentSlideId, state.selectedIds),
      };
    }),

  updateMany: (ids, patch) =>
    set((state) => {
      if (isCurrentSlideLocked(state)) return state;
      const slides = withCurrentSlide(state, (slide) => ({
        ...slide,
        elements: slide.elements.map((el) =>
          ids.includes(el.id) ? ({ ...el, ...patch } as SlideElement) : el
        ),
      }));
      return {
        ...pushHistory(state),
        slides,
        selectedIds: filterSelectionForSlides(slides, state.currentSlideId, state.selectedIds),
      };
    }),

  removeElements: (ids) =>
    set((state) => {
      if (isCurrentSlideLocked(state)) return state;
      return {
        ...pushHistory(state),
        slides: withCurrentSlide(state, (slide) => ({
          ...slide,
          elements: slide.elements.filter((el) => !ids.includes(el.id)),
        })),
        selectedIds: state.selectedIds.filter((id) => !ids.includes(id)),
      };
    }),

  duplicateElements: (ids) =>
    set((state) => {
      if (isCurrentSlideLocked(state)) return state;
      const slide = state.slides.find((s) => s.id === state.currentSlideId);
      if (!slide) return state;
      const selected = slide.elements.filter((el) => ids.includes(el.id));
      if (selected.length === 0) return state;
      const groupMap = new Map<string, string>();
      const newEls = selected.map((el) => {
        const copy = structuredClone(el);
        if (copy.groupId) {
          let nextGroup = groupMap.get(copy.groupId);
          if (!nextGroup) {
            nextGroup = `grp-${Date.now()}-${++idCounter}`;
            groupMap.set(copy.groupId, nextGroup);
          }
          copy.groupId = nextGroup;
        }
        return { ...copy, id: uid(), x: el.x + 20, y: el.y + 20 };
      });
      const newIds = newEls.map((el) => el.id);
      return {
        ...pushHistory(state),
        slides: withCurrentSlide(state, (s) => ({
          ...s,
          elements: [...s.elements, ...newEls],
        })),
        selectedIds: newIds,
      };
    }),

  bringForward: (id) =>
    set((state) => {
      if (isCurrentSlideLocked(state)) return state;
      return {
        ...pushHistory(state),
        slides: withCurrentSlide(state, (slide) => {
          const els = [...slide.elements];
          const idx = els.findIndex((el) => el.id === id);
          if (idx < 0 || idx >= els.length - 1) return slide;
          [els[idx], els[idx + 1]] = [els[idx + 1], els[idx]];
          return { ...slide, elements: els };
        }),
      };
    }),

  sendBackward: (id) =>
    set((state) => {
      if (isCurrentSlideLocked(state)) return state;
      return {
        ...pushHistory(state),
        slides: withCurrentSlide(state, (slide) => {
          const els = [...slide.elements];
          const idx = els.findIndex((el) => el.id === id);
          if (idx <= 0) return slide;
          [els[idx - 1], els[idx]] = [els[idx], els[idx - 1]];
          return { ...slide, elements: els };
        }),
      };
    }),

  bringToFront: (id) =>
    set((state) => {
      if (isCurrentSlideLocked(state)) return state;
      return {
        ...pushHistory(state),
        slides: withCurrentSlide(state, (slide) => {
          const idx = slide.elements.findIndex((el) => el.id === id);
          if (idx < 0 || idx === slide.elements.length - 1) return slide;
          const els = [...slide.elements];
          const [moved] = els.splice(idx, 1);
          els.push(moved);
          return { ...slide, elements: els };
        }),
      };
    }),

  sendToBack: (id) =>
    set((state) => {
      if (isCurrentSlideLocked(state)) return state;
      return {
        ...pushHistory(state),
        slides: withCurrentSlide(state, (slide) => {
          const idx = slide.elements.findIndex((el) => el.id === id);
          if (idx <= 0) return slide;
          const els = [...slide.elements];
          const [moved] = els.splice(idx, 1);
          els.unshift(moved);
          return { ...slide, elements: els };
        }),
      };
    }),

  batchUpdate: (updates) =>
    set((state) => {
      if (isCurrentSlideLocked(state)) return state;
      return {
        ...pushHistory(state),
        slides: withCurrentSlide(state, (slide) => ({
          ...slide,
          elements: slide.elements.map((el) => {
            const update = updates.find((u) => u.id === el.id);
            return update ? ({ ...el, ...update.patch } as SlideElement) : el;
          }),
        })),
      };
    }),

  // Cập nhật live khi đang kéo (move/resize/rotate/endpoint) — KHÔNG ghi history.
  transientUpdate: (updates) =>
    set((state) => {
      if (isCurrentSlideLocked(state)) return state;
      return {
        slides: withCurrentSlide(state, (slide) => ({
          ...slide,
          elements: slide.elements.map((el) => {
            const update = updates.find((u) => u.id === el.id);
            return update ? ({ ...el, ...update.patch } as SlideElement) : el;
          }),
        })),
      };
    }),

  // Đẩy snapshot chụp TRƯỚC khi kéo vào history (gọi 1 lần ở mouseup nếu có thay đổi).
  // Trạng thái sau-kéo đã nằm trong store qua transientUpdate, nên undo về đúng vị trí gốc.
  pushSnapshot: (snap) =>
    set((state) => {
      if (isCurrentSlideLocked(state)) return state;
      return {
        history: {
          past: [...state.history.past, snap].slice(-MAX_HISTORY),
          future: [],
        },
      };
    }),

  alignElements: (dir) =>
    set((state) => {
      if (isCurrentSlideLocked(state)) return state;
      const ids = state.selectedIds;
      if (ids.length < 2) return state;
      const slide = state.slides.find((s) => s.id === state.currentSlideId);
      if (!slide) return state;
      const targets = slide.elements.filter((el) => ids.includes(el.id));
      if (targets.length < 2) return state;

      const bbox = computeBoundingBox(targets);
      const minX = bbox.x;
      const maxX = bbox.x + bbox.w;
      const minY = bbox.y;
      const maxY = bbox.y + bbox.h;
      const cx = minX + bbox.w / 2;
      const cy = minY + bbox.h / 2;

      return {
        ...pushHistory(state),
        slides: withCurrentSlide(state, (s) => ({
          ...s,
          elements: s.elements.map((el) => {
            if (!ids.includes(el.id)) return el;
            if (dir === "left") return { ...el, x: minX };
            if (dir === "right") return { ...el, x: maxX - el.w };
            if (dir === "top") return { ...el, y: minY };
            if (dir === "bottom") return { ...el, y: maxY - el.h };
            if (dir === "cx") return { ...el, x: cx - el.w / 2 };
            if (dir === "cy") return { ...el, y: cy - el.h / 2 };
            return el;
          }),
        })),
      };
    }),

  // Phân bố đều khoảng cách giữa các element (giữ nguyên element đầu & cuối).
  distribute: (dir) =>
    set((state) => {
      if (isCurrentSlideLocked(state)) return state;
      const ids = state.selectedIds;
      if (ids.length < 3) return state;
      const slide = state.slides.find((s) => s.id === state.currentSlideId);
      if (!slide) return state;
      const targets = slide.elements
        .filter((el) => ids.includes(el.id))
        .sort((a, b) => (dir === "h" ? a.x - b.x : a.y - b.y));
      const size = (el: SlideElement) => (dir === "h" ? el.w : el.h);
      const first = targets[0];
      const last = targets[targets.length - 1];
      const startPos = dir === "h" ? first.x : first.y;
      const endPos = dir === "h" ? last.x + last.w : last.y + last.h;
      const sumSize = targets.reduce((s, el) => s + size(el), 0);
      const gap = (endPos - startPos - sumSize) / (targets.length - 1);
      const newPos = new Map<string, number>();
      let cursor = startPos;
      for (const el of targets) {
        newPos.set(el.id, cursor);
        cursor += size(el) + gap;
      }
      return {
        ...pushHistory(state),
        slides: withCurrentSlide(state, (s) => ({
          ...s,
          elements: s.elements.map((el) =>
            newPos.has(el.id)
              ? ({ ...el, [dir === "h" ? "x" : "y"]: newPos.get(el.id)! } as SlideElement)
              : el
          ),
        })),
      };
    }),

  groupSelected: () =>
    set((state) => {
      if (isCurrentSlideLocked(state)) return state;
      const ids = state.selectedIds;
      if (ids.length < 2) return state;
      const gid = `grp-${Date.now()}-${++idCounter}`;
      return {
        ...pushHistory(state),
        slides: withCurrentSlide(state, (slide) => ({
          ...slide,
          elements: slide.elements.map((el) =>
            ids.includes(el.id) ? ({ ...el, groupId: gid } as SlideElement) : el
          ),
        })),
      };
    }),

  ungroupSelected: () =>
    set((state) => {
      if (isCurrentSlideLocked(state)) return state;
      const ids = state.selectedIds;
      if (ids.length === 0) return state;
      return {
        ...pushHistory(state),
        slides: withCurrentSlide(state, (slide) => ({
          ...slide,
          elements: slide.elements.map((el) =>
            ids.includes(el.id) ? ({ ...el, groupId: undefined } as SlideElement) : el
          ),
        })),
      };
    }),

  setSlideBackground: (bg) =>
    set((state) => {
      if (isCurrentSlideLocked(state)) return state;
      return {
        ...pushHistory(state),
        slides: withCurrentSlide(state, (slide) => ({ ...slide, bg })),
      };
    }),

  toggleLock: (ids) =>
    set((state) => {
      if (isCurrentSlideLocked(state)) return state;
      return {
        ...pushHistory(state),
        slides: withCurrentSlide(state, (slide) => ({
          ...slide,
          elements: slide.elements.map((el) =>
            ids.includes(el.id) ? ({ ...el, locked: !el.locked } as SlideElement) : el
          ),
        })),
      };
    }),

  copySelected: () =>
    set((state) => {
      if (isCurrentSlideLocked(state)) return state;
      const slide = state.slides.find((s) => s.id === state.currentSlideId);
      if (!slide) return state;
      const clipboard = slide.elements
        .filter((el) => state.selectedIds.includes(el.id))
        .map((el) => structuredClone(el));
      return { clipboard };
    }),

  paste: () =>
    set((state) => {
      if (isCurrentSlideLocked(state)) return state;
      if (state.clipboard.length === 0) return state;
      const slide = state.slides.find((s) => s.id === state.currentSlideId);
      if (!slide) return state;
      const newEls = state.clipboard.map((el, i) => ({
        ...structuredClone(el),
        id: uid(),
        x: el.x + 20,
        y: el.y + 20,
      }));
      const newIds = newEls.map((el) => el.id);
      return {
        ...pushHistory(state),
        slides: withCurrentSlide(state, (s) => ({
          ...s,
          elements: [...s.elements, ...newEls],
        })),
        selectedIds: newIds,
      };
    }),

  replaceSlides: (slides) =>
    set((state) => ({
      ...pushHistory(state),
      slides: normalizeSlides(slides),
      currentSlideId: slides[0]?.id ?? state.currentSlideId,
      selectedIds: [],
    })),

  undo: () =>
    set((state) => {
      if (hasLockedGenerationSlide(state.slides)) return state;
      if (state.history.past.length === 0) return state;
      const prev = state.history.past[state.history.past.length - 1];
      const current: Snapshot = {
        slides: structuredClone(state.slides),
        currentSlideId: state.currentSlideId,
      };
      return {
        slides: normalizeSlides(prev.slides),
        currentSlideId: prev.currentSlideId,
        selectedIds: [],
        history: {
          past: state.history.past.slice(0, -1),
          future: [current, ...state.history.future],
        },
      };
    }),

  redo: () =>
    set((state) => {
      if (hasLockedGenerationSlide(state.slides)) return state;
      if (state.history.future.length === 0) return state;
      const next = state.history.future[0];
      const current: Snapshot = {
        slides: structuredClone(state.slides),
        currentSlideId: state.currentSlideId,
      };
      return {
        slides: normalizeSlides(next.slides),
        currentSlideId: next.currentSlideId,
        selectedIds: [],
        history: {
          past: [...state.history.past, current],
          future: state.history.future.slice(1),
        },
      };
    }),
}));
