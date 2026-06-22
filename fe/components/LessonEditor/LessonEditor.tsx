"use client";

import { useReducer, useState } from "react";
import { lessonMock } from "@/data/lessonMock";
import type { Lesson, LessonSection } from "@/data/lessonMock";
import { saveLesson, generateSlides } from "@/services/lessonService";
import { LessonSection as LessonSectionComponent } from "./LessonSection";
import { Toolbar } from "./Toolbar";
import { EditableText } from "./EditableText";

/* ── Types ── */
type SaveStatus = "idle" | "saving" | "saved";

type Action =
  | { type: "SET_TITLE"; title: string }
  | { type: "SET_SECTION_TITLE"; sectionId: number; title: string }
  | { type: "UPDATE_ITEM"; sectionId: number; itemId: string; text: string }
  | { type: "ADD_ITEM"; sectionId: number; newItemId: string }
  | { type: "DELETE_ITEM"; sectionId: number; itemId: string }
  | { type: "MOVE_UP"; sectionId: number }
  | { type: "MOVE_DOWN"; sectionId: number }
  | { type: "DUPLICATE"; sectionId: number }
  | { type: "DELETE_SECTION"; sectionId: number };

/* ── Reducer ── */
function reducer(state: Lesson, action: Action): Lesson {
  switch (action.type) {
    case "SET_TITLE":
      return { ...state, title: action.title };

    case "SET_SECTION_TITLE":
      return {
        ...state,
        sections: state.sections.map((s) =>
          s.id === action.sectionId ? { ...s, title: action.title } : s,
        ),
      };

    case "UPDATE_ITEM":
      return {
        ...state,
        sections: state.sections.map((s) =>
          s.id === action.sectionId
            ? {
                ...s,
                items: s.items.map((item) =>
                  item.id === action.itemId ? { ...item, text: action.text } : item,
                ),
              }
            : s,
        ),
      };

    case "ADD_ITEM":
      return {
        ...state,
        sections: state.sections.map((s) =>
          s.id === action.sectionId
            ? { ...s, items: [...s.items, { id: action.newItemId, text: "" }] }
            : s,
        ),
      };

    case "DELETE_ITEM":
      return {
        ...state,
        sections: state.sections.map((s) =>
          s.id === action.sectionId
            ? { ...s, items: s.items.filter((item) => item.id !== action.itemId) }
            : s,
        ),
      };

    case "MOVE_UP": {
      const idx = state.sections.findIndex((s) => s.id === action.sectionId);
      if (idx <= 0) return state;
      const sections = [...state.sections];
      [sections[idx - 1], sections[idx]] = [sections[idx], sections[idx - 1]];
      return { ...state, sections };
    }

    case "MOVE_DOWN": {
      const idx = state.sections.findIndex((s) => s.id === action.sectionId);
      if (idx >= state.sections.length - 1) return state;
      const sections = [...state.sections];
      [sections[idx], sections[idx + 1]] = [sections[idx + 1], sections[idx]];
      return { ...state, sections };
    }

    case "DUPLICATE": {
      const idx = state.sections.findIndex((s) => s.id === action.sectionId);
      const orig = state.sections[idx];
      const ts = Date.now();
      const clone: LessonSection = {
        ...orig,
        id: ts,
        title: `${orig.title} (bản sao)`,
        items: orig.items.map((item, i) => ({ ...item, id: `${ts}-${i}` })),
      };
      const sections = [...state.sections];
      sections.splice(idx + 1, 0, clone);
      return { ...state, sections };
    }

    case "DELETE_SECTION":
      return {
        ...state,
        sections: state.sections.filter((s) => s.id !== action.sectionId),
      };

    default:
      return state;
  }
}

/* ── Main Component ── */
export function LessonEditor() {
  const [lesson, dispatch] = useReducer(reducer, lessonMock);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [newItemId, setNewItemId] = useState<string | null>(null);

  /* ── Handlers ── */
  const handleSave = async () => {
    setSaveStatus("saving");
    await saveLesson(lesson);
    setSaveStatus("saved");
    setTimeout(() => setSaveStatus("idle"), 2500);
  };

  const handleGenerateSlides = () => {
    generateSlides(lesson);
  };

  const handleAddItem = (sectionId: number) => {
    const id = `${sectionId}-${Date.now()}`;
    dispatch({ type: "ADD_ITEM", sectionId, newItemId: id });
    setNewItemId(id);
    setTimeout(() => setNewItemId(null), 300);
  };

  /* ── Render ── */
  return (
    <div className="relative pb-12">
      {/* Floating formatting toolbar */}
      <Toolbar />

      {/* ── Page header ── */}
      <div className="mb-8">
        {/* Lesson meta + action bar */}
        <div className="flex items-start justify-between gap-6">
          <div className="min-w-0 flex-1">
            {/* Editable title */}
            <EditableText
              value={lesson.title}
              onChange={(title) => dispatch({ type: "SET_TITLE", title })}
              placeholder="Tiêu đề bài học..."
              className="text-[30px] font-semibold leading-[38px] text-[#1f1f1f] sm:text-[36px]"
            />
            {/* Metadata chips */}
            <div className="mt-3 flex flex-wrap gap-2">
              {[lesson.subject, `Lớp ${lesson.grade}`, lesson.duration].map((chip) => (
                <span
                  key={chip}
                  className="inline-flex h-[24px] items-center rounded-full border border-[#d8d1c9] bg-white px-3 text-[11px] font-medium text-[#6b6b6b]"
                >
                  {chip}
                </span>
              ))}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-shrink-0 items-center gap-2 pt-1">
            {saveStatus === "saved" && (
              <span className="flex items-center gap-1 text-[12px] text-[#6b6b6b]">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Đã lưu
              </span>
            )}
            <button
              type="button"
              onClick={handleGenerateSlides}
              className="flex h-9 items-center gap-2 rounded-[10px] border border-[#d8d1c9] bg-white px-4 text-[12px] font-medium text-[#1f1f1f] shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition hover:border-[#c8beb5] hover:shadow-[0_2px_6px_rgba(0,0,0,0.08)]"
            >
              <SlideIcon />
              Tạo slide
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saveStatus === "saving"}
              className="flex h-9 items-center gap-2 rounded-[10px] bg-[#e8724a] px-5 text-[12px] font-medium text-white shadow-[0_4px_10px_rgba(232,114,74,0.3)] transition hover:bg-[#d96a42] active:bg-[#c85e38] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saveStatus === "saving" ? "Đang lưu..." : "Lưu"}
            </button>
          </div>
        </div>

        {/* Divider */}
        <div className="mt-6 h-px bg-[#e8e2dc]" />
      </div>

      {/* ── Sections ── */}
      <div className="flex flex-col gap-4">
        {lesson.sections.map((section, index) => (
          <LessonSectionComponent
            key={section.id}
            section={section}
            index={index}
            totalSections={lesson.sections.length}
            newItemId={newItemId}
            onUpdateTitle={(title) =>
              dispatch({ type: "SET_SECTION_TITLE", sectionId: section.id, title })
            }
            onUpdateItem={(itemId, text) =>
              dispatch({ type: "UPDATE_ITEM", sectionId: section.id, itemId, text })
            }
            onAddItem={() => handleAddItem(section.id)}
            onDeleteItem={(itemId) =>
              dispatch({ type: "DELETE_ITEM", sectionId: section.id, itemId })
            }
            onMoveUp={() => dispatch({ type: "MOVE_UP", sectionId: section.id })}
            onMoveDown={() => dispatch({ type: "MOVE_DOWN", sectionId: section.id })}
            onDuplicate={() => dispatch({ type: "DUPLICATE", sectionId: section.id })}
            onDelete={() => dispatch({ type: "DELETE_SECTION", sectionId: section.id })}
          />
        ))}
      </div>

      {/* ── Bottom stats bar ── */}
      <div className="mt-8 flex items-center gap-4 rounded-[14px] border border-[#d8d1c9] bg-white px-6 py-4">
        <Stat label="Phần" value={lesson.sections.length} />
        <div className="h-4 w-px bg-[#d8d1c9]" />
        <Stat
          label="Mục"
          value={lesson.sections.reduce((acc, s) => acc + s.items.length, 0)}
        />
        <div className="h-4 w-px bg-[#d8d1c9]" />
        <Stat label="Thời lượng" value={lesson.duration} />
        <div className="h-4 w-px bg-[#d8d1c9]" />
        <Stat label="Môn học" value={lesson.subject} />
      </div>
    </div>
  );
}

/* ── Micro components ── */
function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="text-[20px] font-semibold text-[#e8724a]">{value}</span>
      <span className="text-[11px] text-[#6b6b6b]">{label}</span>
    </div>
  );
}

function SlideIcon() {
  return (
    <svg width={14} height={14} viewBox="0 0 16 16" fill="none">
      <rect x={1} y={2} width={14} height={10} rx={2} stroke="currentColor" strokeWidth={1.4} />
      <path d="M6 14h4" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" />
      <path d="M8 12v2" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" />
    </svg>
  );
}
