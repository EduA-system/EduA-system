"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Sidebar } from "../layout/Sidebar";
import { DashboardIcon } from "../ui/DashboardIcon";
import {
  buildInlinePlan,
  lessons,
  STYLE_OPTIONS,
  type LessonCard,
} from "./slideData";
import { writeSlideCreateSession } from "@/lib/slide-create/session";

type Tab = "library" | "upload";

export function SlideCreateDashboard() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("library");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "Vật lý" | "Hóa học">("all");
  const [selectedId, setSelectedId] = useState<string>("bai-19-toc-do-phan-ung");
  const [slideCount, setSlideCount] = useState(12);
  const [styleHint, setStyleHint] = useState<string>(STYLE_OPTIONS[0]);

  const visible = useMemo<LessonCard[]>(() => {
    return lessons.filter((lesson) => {
      const matchesQuery =
        query.trim() === "" ||
        lesson.title.toLowerCase().includes(query.toLowerCase()) ||
        lesson.description.toLowerCase().includes(query.toLowerCase());
      const matchesFilter = filter === "all" || lesson.subject === filter;
      return matchesQuery && matchesFilter;
    });
  }, [query, filter]);

  const selected =
    lessons.find((lesson) => lesson.id === selectedId) ?? null;

  function handleCreateSlide() {
    if (!selected) return;
    writeSlideCreateSession({
      lessonCardId: selected.id,
      lessonTitle: selected.title,
      lessonSummary: selected.description,
      subject: selected.subject,
      grade: selected.grade,
      styleHint,
      slideCount,
      inlinePlan: buildInlinePlan(selected),
    });
    router.push("/slide-create/outline");
  }

  return (
    <main className="flex h-screen w-full overflow-hidden bg-[#f9f8f3] text-[#1a1a2e]">
      <Sidebar />
      <section className="flex min-w-0 flex-1 flex-col">
        {/* Header / breadcrumb */}
        <header className="flex items-center justify-between border-b border-[rgba(26,26,46,0.07)] px-8 py-4">
          <nav className="flex items-center gap-2 text-[12px] leading-4 text-[#9998be]">
            <span>EDUA</span>
            <ChevronRight />
            <span>Slide Deck</span>
            <ChevronRight />
            <span className="font-medium text-[#1a1a2e]">Mới</span>
          </nav>
        </header>

        {/* Body: cards + right panel */}
        <div className="flex min-h-0 flex-1">
          <div className="min-w-0 flex-1 overflow-y-auto px-8 py-8">
            <div className="mx-auto w-full max-w-[980px]">
              {/* Title */}
              <h1 className="text-[30px] font-medium leading-[37.5px] text-[#1a1a2e]">
                Tạo bộ Slide mới
              </h1>
              <p className="mt-1 text-[14px] leading-5 text-[#9998be]">
                Chọn giáo án và để AI lo phần còn lại cho bạn.
              </p>

              {/* Tab switcher */}
              <div className="mt-8 inline-flex gap-1 rounded-2xl bg-[rgba(26,26,46,0.06)] p-1">
                <TabButton
                  active={tab === "library"}
                  onClick={() => setTab("library")}
                  icon="book"
                  label="Chọn từ thư viện"
                />
                <TabButton
                  active={tab === "upload"}
                  onClick={() => setTab("upload")}
                  icon="upload"
                  label="Tải lên giáo án"
                  hint=".docx, .pdf"
                />
              </div>

              {tab === "library" ? (
                <>
                  {/* Search + filter */}
                  <div className="mt-5 flex items-center gap-3">
                    <div className="flex h-[38px] flex-1 items-center gap-2 rounded-xl border border-[rgba(26,26,46,0.09)] bg-white px-[15px]">
                      <span className="text-[#aeacb8]">
                        <SearchIcon />
                      </span>
                      <input
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="Tìm kiếm giáo án..."
                        className="h-full w-full bg-transparent text-[12px] text-[#1a1a2e] placeholder:text-[rgba(26,26,46,0.5)] focus:outline-none"
                      />
                    </div>
                    <FilterSelect value={filter} onChange={setFilter} />
                  </div>

                  {/* Cards */}
                  <CardGrid
                    lessons={visible}
                    selectedId={selectedId}
                    onSelect={setSelectedId}
                  />
                </>
              ) : (
                <UploadPanel />
              )}
            </div>
          </div>

          {/* Right config panel */}
          <ConfigPanel
            selected={selected}
            slideCount={slideCount}
            styleHint={styleHint}
            onSlideCountChange={setSlideCount}
            onStyleChange={setStyleHint}
            onCreate={handleCreateSlide}
          />
        </div>
      </section>
    </main>
  );
}

/* ---------- Pieces ---------- */

function ChevronRight() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
      <path
        d="M4.5 3L7.5 6L4.5 9"
        stroke="#aeacb8"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
      <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.3" />
      <path
        d="M9.5 9.5L12 12"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </svg>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
  hint,
}: {
  active: boolean;
  onClick: () => void;
  icon: string;
  label: string;
  hint?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 rounded-xl px-4 py-2 text-[12px] font-medium transition ${
        active
          ? "bg-white text-[#1a1a2e] shadow-[0_1px_2px_rgba(26,26,46,0.1)]"
          : "text-[#9998be] hover:text-[#1a1a2e]"
      }`}
    >
      <DashboardIcon name={icon} className="size-[13px]" />
      <span className={active ? "font-medium text-[#1a1a2e]" : "text-[#9998be]"}>
        {label}
      </span>
      {hint ? (
        <span className="text-[10px] font-normal text-[#aeacb8]">{hint}</span>
      ) : null}
    </button>
  );
}

function FilterSelect({
  value,
  onChange,
}: {
  value: "all" | "Vật lý" | "Hóa học";
  onChange: (value: "all" | "Vật lý" | "Hóa học") => void;
}) {
  return (
    <div className="relative h-[38px] w-[150px]">
      <select
        value={value}
        onChange={(event) =>
          onChange(event.target.value as "all" | "Vật lý" | "Hóa học")
        }
        className="h-full w-full cursor-pointer appearance-none rounded-xl border border-[rgba(26,26,46,0.09)] bg-white pl-[15px] pr-8 text-[12px] font-medium text-[#1a1a2e] focus:outline-none"
      >
        <option value="all">Tất cả môn</option>
        <option value="Vật lý">Vật lý</option>
        <option value="Hóa học">Hóa học</option>
      </select>
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#aeacb8]">
        <DashboardIcon name="chevronDown" className="size-3" />
      </span>
    </div>
  );
}

function CardGrid({
  lessons,
  selectedId,
  onSelect,
}: {
  lessons: LessonCard[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  if (lessons.length === 0) {
    return (
      <div className="mt-6 rounded-2xl border border-dashed border-[rgba(26,26,46,0.12)] bg-white/40 px-6 py-12 text-center text-[13px] text-[#aeacb8]">
        Không tìm thấy giáo án phù hợp.
      </div>
    );
  }
  return (
    <div className="mt-5 grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-4">
      {lessons.map((lesson) => (
        <LessonCardItem
          key={lesson.id}
          lesson={lesson}
          active={lesson.id === selectedId}
          onClick={() => onSelect(lesson.id)}
        />
      ))}
    </div>
  );
}

function LessonCardItem({
  lesson,
  active,
  onClick,
}: {
  lesson: LessonCard;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative flex flex-col rounded-2xl border bg-white p-[17px] text-left transition ${
        active
          ? "border-[#1c1b2e] shadow-[0_4px_16px_rgba(26,26,46,0.09)]"
          : "border-[rgba(26,26,46,0.08)] shadow-[0_1px_2px_rgba(26,26,46,0.04)] hover:border-[rgba(26,26,46,0.2)]"
      }`}
    >
      {/* Selected radio */}
      <span
        aria-hidden
        className={`absolute right-3.5 top-3.5 flex size-4 items-center justify-center rounded-full border-2 transition ${
          active
            ? "border-[#1c1b2e] bg-[#1c1b2e]"
            : "border-[rgba(26,26,46,0.2)] bg-white"
        }`}
      >
        {active ? (
          <span className="block size-1.5 rounded-full bg-white" />
        ) : null}
      </span>

      {/* Icon */}
      <div className="flex size-9 items-center justify-center rounded-xl bg-[#f9f8f3] text-[#5c5b6e]">
        <DashboardIcon name={lesson.icon} className="size-4" />
      </div>

      {/* Title + description */}
      <h3 className="mt-3 pr-6 text-[14px] font-medium leading-[19px] text-[#1a1a2e]">
        {lesson.title}
      </h3>
      <p className="mt-1.5 line-clamp-2 text-[11px] font-medium leading-[18px] text-[#9998be]">
        {lesson.description}
      </p>

      {/* Tags */}
      <div className="mt-3 flex items-center gap-2">
        <SubjectBadge subject={lesson.subject} />
        <span className="rounded-full border border-[rgba(26,26,46,0.1)] bg-[#f9f8f3] px-2.5 py-[3px] text-[10px] font-medium text-[#7a7870]">
          {lesson.grade}
        </span>
      </div>

      <p className="mt-2 text-[10px] font-medium text-[#aeacb8]">
        Sửa lần cuối {lesson.updatedAt}
      </p>
    </button>
  );
}

function SubjectBadge({ subject }: { subject: "Vật lý" | "Hóa học" }) {
  // Figma uses the purple pill for both subjects (#faf5ff / #8200db)
  return (
    <span className="flex items-center gap-1 rounded-full border border-[#f3e8ff] bg-[#faf5ff] px-2.5 py-[3px] text-[10px] font-medium text-[#8200db]">
      <span className="block size-1.5 rounded-full bg-[#c27aff]" />
      {subject}
    </span>
  );
}

function UploadPanel() {
  return (
    <div className="mt-5 flex flex-col items-center justify-center rounded-2xl border border-dashed border-[rgba(26,26,46,0.12)] bg-white/50 px-6 py-16 text-center">
      <div className="flex size-12 items-center justify-center rounded-2xl bg-[#f9f8f3] text-[#5c5b6e]">
        <DashboardIcon name="upload" className="size-5" />
      </div>
      <p className="mt-4 text-[14px] font-medium text-[#1a1a2e]">
        Kéo thả giáo án vào đây
      </p>
      <p className="mt-1 text-[12px] text-[#9998be]">
        Hoặc bấm để chọn tệp — hỗ trợ .docx, .pdf (tối đa 20MB)
      </p>
      <button
        type="button"
        className="mt-5 flex h-[40px] items-center gap-2 rounded-xl border border-[rgba(26,26,46,0.1)] bg-white px-5 text-[12px] font-medium text-[#1a1a2e] transition hover:border-[rgba(26,26,46,0.2)]"
      >
        <DashboardIcon name="upload" className="size-[13px]" />
        Chọn tệp từ máy tính
      </button>
    </div>
  );
}

function ConfigPanel({
  selected,
  slideCount,
  styleHint,
  onSlideCountChange,
  onStyleChange,
  onCreate,
}: {
  selected: LessonCard | null;
  slideCount: number;
  styleHint: string;
  onSlideCountChange: (value: number) => void;
  onStyleChange: (value: string) => void;
  onCreate: () => void;
}) {
  return (
    <aside className="hidden w-[340px] shrink-0 flex-col overflow-y-auto border-l border-[rgba(26,26,46,0.07)] bg-[#f9f8f3] xl:flex">
      <div className="flex items-center gap-1.5 px-6 pb-3 pt-6 text-[10px] font-semibold uppercase tracking-[0.04em] text-[#aeacb8]">
        <span className="flex size-4 items-center justify-center rounded-[5px] border border-[#c27aff]/25 bg-[#faf5ff] text-[#8200db]">
          <DashboardIcon name="aiBadge" className="size-[9px]" />
        </span>
        Cấu hình
      </div>

      <div className="flex-1 px-6 pb-6">
        {/* Đã chọn */}
        <FieldLabel>Đã chọn</FieldLabel>
        <div className="mt-2">
          {selected ? (
            <div className="flex items-center gap-3 rounded-xl border border-[rgba(26,26,46,0.08)] bg-white p-3 shadow-[0_1px_2px_rgba(26,26,46,0.04)]">
              <div className="flex size-9 items-center justify-center rounded-xl bg-[#f9f8f3] text-[#5c5b6e]">
                <DashboardIcon name={selected.icon} className="size-4" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-[13px] font-medium text-[#1a1a2e]">
                  {selected.title}
                </p>
                <p className="truncate text-[11px] text-[#9998be]">
                  {selected.subject} · {selected.grade}
                </p>
              </div>
            </div>
          ) : (
            <p className="rounded-xl border border-dashed border-[rgba(26,26,46,0.12)] px-3 py-4 text-center text-[12px] text-[#aeacb8]">
              Chưa chọn giáo án nào
            </p>
          )}
        </div>

        {/* Số slide */}
        <div className="mt-5">
          <FieldLabel>Số slide dự kiến</FieldLabel>
          <div className="mt-2">
            <StepperField value={slideCount} onChange={onSlideCountChange} />
          </div>
        </div>

        {/* Phong cách */}
        <div className="mt-5">
          <FieldLabel>Phong cách thiết kế</FieldLabel>
          <div className="mt-2">
            <ConfigSelect options={[...STYLE_OPTIONS]} value={styleHint} onChange={onStyleChange} />
          </div>
        </div>

        {/* Thêm nhanh */}
        <div className="mt-5">
          <FieldLabel>Thêm nhanh</FieldLabel>
          <div className="mt-2 flex flex-wrap gap-2">
            {["Hình minh họa", "Bài tập", "Câu hỏi", "Tóm tắt"].map((chip) => (
              <button
                key={chip}
                type="button"
                className="flex items-center gap-1.5 rounded-full border border-[rgba(26,26,46,0.1)] bg-white px-3 py-1.5 text-[11px] font-medium text-[#5c5b6e] transition hover:border-[rgba(26,26,46,0.2)]"
              >
                <DashboardIcon name="chipQuestion" className="size-2.5" />
                {chip}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Footer / generate */}
      <div className="border-t border-[rgba(26,26,46,0.07)] px-6 py-5">
        <button
          type="button"
          disabled={!selected}
          onClick={onCreate}
          className="flex h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-[#1c1b2e] text-[13px] font-medium text-[#f9f8f3] transition enabled:hover:bg-[#2a2940] disabled:cursor-not-allowed disabled:bg-[rgba(26,26,46,0.15)] disabled:text-[#aeacb8]"
        >
          <DashboardIcon name="createSlide" className="size-4" />
          Tạo Slide
        </button>
        <p className="mt-2 text-center text-[10px] leading-[15px] text-[#9998be]">
          AI sẽ tạo bộ slide dựa trên giáo án đã chọn
        </p>
      </div>
    </aside>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="text-[12px] font-medium text-[#5c5b6e]">{children}</label>
  );
}

function ConfigSelect({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-[40px] w-full cursor-pointer appearance-none rounded-xl border border-[rgba(26,26,46,0.09)] bg-white px-3 text-[12px] font-medium text-[#1a1a2e] focus:outline-none"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#aeacb8]">
        <DashboardIcon name="chevronDown" className="size-3" />
      </span>
    </div>
  );
}

function StepperField({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="flex h-[40px] items-center justify-between rounded-xl border border-[rgba(26,26,46,0.09)] bg-white px-2">
      <button
        type="button"
        onClick={() => onChange(Math.max(1, value - 1))}
        className="flex size-8 items-center justify-center rounded-lg text-[#5c5b6e] transition hover:bg-[rgba(26,26,46,0.05)]"
        aria-label="Giảm"
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
          <path d="M3 6H9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      </button>
      <span className="text-[13px] font-semibold text-[#1a1a2e]">{value}</span>
      <button
        type="button"
        onClick={() => onChange(Math.min(60, value + 1))}
        className="flex size-8 items-center justify-center rounded-lg text-[#5c5b6e] transition hover:bg-[rgba(26,26,46,0.05)]"
        aria-label="Tăng"
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
          <path d="M6 3V9M3 6H9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}
