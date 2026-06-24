"use client";

// Zustand store cho Slide Editor — document state + actions.
// Bước 1: CHỈ phần điều hướng slide. selectedIds/history/element actions thêm ở Bước 2.

import { create } from "zustand";
import type { Slide } from "@/components/slide-editor/types";
import { seedSlides } from "@/components/slide-editor/seed";

interface EditorState {
  // DOCUMENT
  slides: Slide[];
  currentSlideId: string;

  // selector
  currentSlide: () => Slide | undefined;

  // điều hướng slide
  setCurrentSlide: (id: string) => void;
  nextSlide: () => void;
  prevSlide: () => void;
}

export const useEditorStore = create<EditorState>((set, get) => ({
  slides: seedSlides,
  currentSlideId: seedSlides[0].id,

  currentSlide: () => {
    const { slides, currentSlideId } = get();
    return slides.find((s) => s.id === currentSlideId);
  },

  setCurrentSlide: (id) => set({ currentSlideId: id }),

  nextSlide: () =>
    set((state) => {
      const i = state.slides.findIndex((s) => s.id === state.currentSlideId);
      if (i < 0 || i >= state.slides.length - 1) return state;
      return { currentSlideId: state.slides[i + 1].id };
    }),

  prevSlide: () =>
    set((state) => {
      const i = state.slides.findIndex((s) => s.id === state.currentSlideId);
      if (i <= 0) return state;
      return { currentSlideId: state.slides[i - 1].id };
    }),
}));
