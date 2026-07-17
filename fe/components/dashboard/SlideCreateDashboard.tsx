"use client";

import {
  BookOpen,
  ChevronDown,
  Download,
  FileUp,
  ImageIcon,
  Layers3,
  Minus,
  Plus,
  Search,
  Sparkles,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Sidebar } from "../layout/Sidebar";
import { DashboardIcon } from "../ui/DashboardIcon";
import { STYLE_OPTIONS } from "./slideData";
import { useAuth } from "@/lib/auth/AuthContext";
import { getLibraryContent, listLibrary, type LibraryContent } from "@/lib/library";
import { writeSlideCreateSession } from "@/lib/slide-create/session";
import { getTiptapDocument, tiptapToStructuredText } from "@/lib/tiptap-to-text";

type Tab = "library" | "upload";
type LessonCard = {
  id: string;
  title: string;
  description: string;
  subject: string;
  grade: string;
  updatedAt: string;
};

const subjectLabels: Record<string, string> = {
  PHYSICS: "Vật lý",
  CHEMISTRY: "Hóa học",
  MATH: "Toán học",
};

export function SlideCreateDashboard() {
  const router = useRouter();
  const { authFetch, status: authStatus } = useAuth();
  const [tab, setTab] = useState<Tab>("library");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [items, setItems] = useState<LibraryContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [libraryError, setLibraryError] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [slideCount, setSlideCount] = useState(12);
  const [styleHint, setStyleHint] = useState<string>(STYLE_OPTIONS[0]);

  const loadLibrary = useCallback(async () => {
    if (authStatus === "loading") return;
    if (authStatus !== "authenticated") {
      setLoading(false);
      setLibraryError("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
      return;
    }

    setLoading(true);
    setLibraryError("");
    try {
      const page = await listLibrary(
        authFetch,
        new URLSearchParams({ type: "LESSON_PLAN", size: "100", sort: "updatedAt" }),
      );
      setItems(page.items);
      setSelectedId((current) =>
        current && page.items.some((item) => item.id === current) ? current : "",
      );
    } catch (error) {
      setLibraryError(error instanceof Error ? error.message : "Không thể tải thư viện bài giảng.");
    } finally {
      setLoading(false);
    }
  }, [authFetch, authStatus]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadLibrary(), 0);
    return () => window.clearTimeout(timer);
  }, [loadLibrary]);

  const lessons = useMemo<LessonCard[]>(
    () =>
      items.map((item) => ({
        id: item.id,
        title: item.title,
        description: "Bài giảng đã lưu trong thư viện",
        subject: item.subject ? subjectLabels[item.subject] ?? item.subject : "Chưa phân môn",
        grade: "Bài giảng",
        updatedAt: new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium" }).format(new Date(item.updatedAt)),
      })),
    [items],
  );

  const visibleLessons = useMemo(
    () =>
      lessons.filter((lesson) => {
        const normalizedQuery = query.trim().toLocaleLowerCase("vi");
        const matchesQuery =
          !normalizedQuery ||
          lesson.title.toLocaleLowerCase("vi").includes(normalizedQuery) ||
          lesson.description.toLocaleLowerCase("vi").includes(normalizedQuery);
        return matchesQuery && (filter === "all" || lesson.subject === filter);
      }),
    [filter, lessons, query],
  );

  const selected = lessons.find((lesson) => lesson.id === selectedId) ?? null;

  async function handleCreateSlide() {
    if (!selected) return;
    try {
      const detail = await getLibraryContent(authFetch, selected.id);
      const lessonContent = tiptapToStructuredText(getTiptapDocument(detail.payload));
      writeSlideCreateSession({
        lessonCardId: detail.id,
        libraryContentId: detail.id,
        lessonTitle: detail.title,
        lessonSummary: selected.description,
        subject: detail.subject ? subjectLabels[detail.subject] ?? detail.subject : "",
        grade: selected.grade,
        styleHint,
        slideCount,
        lessonContent,
      });
      router.push("/slide-create/outline");
    } catch (error) {
      setLibraryError(error instanceof Error ? error.message : "Không thể đọc bài giảng đã chọn.");
    }
  }

  return (
    <main className="flex min-h-screen w-full bg-[#f5f1ec] font-sans text-[#1e1e1e]">
      <Sidebar activeHref="/slide-create" />
      <section className="min-w-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-[1440px] px-5 py-8 sm:px-8 sm:py-10 lg:px-10">
          <header className="pb-10">
            <h1 className="font-libertine text-4xl font-normal leading-[1.1] tracking-[-0.022em]">Tạo bộ Slide mới</h1>
            <p className="mt-2 max-w-[520px] text-[15px] leading-6 text-[#6f6b67]">
              Chọn bài giảng có sẵn hoặc tải lên để AI phân tích và tạo slide tự động.
            </p>
          </header>

          <div className="grid items-start gap-8 xl:grid-cols-[minmax(0,1fr)_360px]">
            <section className="min-w-0 space-y-6">
              <div className="inline-flex max-w-full gap-0.5 overflow-x-auto rounded-2xl bg-[#ede8e2] p-1">
                <TabButton active={tab === "library"} onClick={() => setTab("library")} icon={<DashboardIcon name="library" className="size-4" />} label="Chọn từ thư viện" />
                <TabButton active={tab === "upload"} onClick={() => setTab("upload")} icon={<FileUp className="size-4" />} label="Tải lên bài giảng" />
              </div>

              {tab === "library" ? (
                <>
                  <div className="flex flex-col gap-3 md:flex-row">
                    <label className="flex h-[52px] min-w-0 flex-1 items-center gap-3 rounded-2xl border border-[#e8e1d9] bg-white px-4 shadow-[0_1px_2px_rgba(0,0,0,0.06)] focus-within:border-[#e58461]">
                      <Search className="size-4 shrink-0 text-[#a39c95]" />
                      <span className="sr-only">Tìm kiếm bài giảng</span>
                      <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm kiếm bài giảng..." className="min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-[#1e1e1e]/50" />
                    </label>
                    <button type="button" onClick={() => void loadLibrary()} className="inline-flex h-[52px] items-center justify-center gap-2 rounded-2xl border border-[#e8e1d9] bg-white px-5 text-sm font-medium shadow-[0_1px_2px_rgba(0,0,0,0.06)] transition hover:border-[#e58461] hover:bg-[#fff8f5] hover:text-[#c66543]">
                      Tải về bản mới nhất <Download className="size-3.5" />
                    </button>
                  </div>

                  <div className="min-h-[380px] rounded-[20px] bg-white p-5 shadow-[0_2px_6px_rgba(0,0,0,0.06)] sm:min-h-[592px]">
                    {loading ? (
                      <LoadingState />
                    ) : libraryError ? (
                      <ErrorState message={libraryError} onRetry={() => void loadLibrary()} />
                    ) : visibleLessons.length === 0 ? (
                      <EmptyState />
                    ) : (
                      <LessonGrid lessons={visibleLessons} selectedId={selectedId} onSelect={setSelectedId} />
                    )}
                  </div>
                </>
              ) : (
                <UploadPanel />
              )}
            </section>

            <ConfigPanel
              selected={selected}
              slideCount={slideCount}
              styleHint={styleHint}
              filter={filter}
              onFilterChange={setFilter}
              onSlideCountChange={setSlideCount}
              onStyleChange={setStyleHint}
              onCreate={() => void handleCreateSlide()}
            />
          </div>
        </div>
      </section>
    </main>
  );
}

function TabButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button type="button" onClick={onClick} className={`inline-flex items-center gap-2 whitespace-nowrap rounded-[14px] px-5 py-2 text-sm font-medium transition ${active ? "bg-[#e58461] text-white shadow-[0_2px_5px_rgba(229,132,97,0.3)] [&_img]:brightness-0 [&_img]:invert" : "text-[#6f6b67] hover:text-[#1e1e1e]"}`}>
      {icon}{label}
    </button>
  );
}

function LoadingState() {
  return <div className="grid gap-4 sm:grid-cols-2">{[1, 2, 3, 4].map((item) => <div key={item} className="h-36 animate-pulse rounded-2xl bg-[#fbf8f5]" />)}</div>;
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return <div className="flex min-h-[340px] flex-col items-center justify-center text-center"><p className="text-sm text-red-700">{message}</p><button type="button" onClick={onRetry} className="mt-4 rounded-xl bg-[#e58461] px-4 py-2 text-sm font-medium text-white">Thử lại</button></div>;
}

function EmptyState() {
  return (
    <div className="flex min-h-[340px] flex-col items-center justify-center py-16 text-center">
      <div className="flex size-[72px] items-center justify-center rounded-2xl border border-dashed border-[#efb69f] bg-[#fff8f5] text-[#e58461]"><Layers3 className="size-7" strokeWidth={1.5} /></div>
      <h2 className="mt-4 text-base font-semibold">Không có bài giảng nào</h2>
      <p className="mt-2 max-w-[360px] text-sm leading-[22px] text-[#6f6b67]">Chọn bài giảng từ thư viện hoặc tải lên bài giảng mới để tạo slide AI.</p>
    </div>
  );
}

function LessonGrid({ lessons, selectedId, onSelect }: { lessons: LessonCard[]; selectedId: string; onSelect: (id: string) => void }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {lessons.map((lesson) => {
        const active = lesson.id === selectedId;
        return (
          <button key={lesson.id} type="button" onClick={() => onSelect(lesson.id)} className={`relative rounded-2xl border p-4 text-left transition ${active ? "border-[#e58461] bg-[#fff9f6] shadow-[0_4px_14px_rgba(229,132,97,0.12)]" : "border-[#e8e1d9] bg-white hover:border-[#c8c0b8]"}`}>
            <span className={`absolute right-4 top-4 size-4 rounded-full border-2 ${active ? "border-[#e58461] bg-[#e58461] shadow-[inset_0_0_0_3px_white]" : "border-[#c8c0b8]"}`} />
            <div className="flex size-9 items-center justify-center rounded-[10px] bg-[#ede8e2]"><BookOpen className="size-4" /></div>
            <h3 className="mt-3 pr-6 text-sm font-semibold">{lesson.title}</h3>
            <p className="mt-1.5 text-xs text-[#6f6b67]">{lesson.description}</p>
            <div className="mt-3 flex flex-wrap gap-2 text-[11px]"><span className="rounded-full bg-[#fef0ea] px-2.5 py-1 text-[#b75f40]">{lesson.subject}</span><span className="rounded-full bg-[#fbf8f5] px-2.5 py-1 text-[#6f6b67]">{lesson.grade}</span></div>
            <p className="mt-3 text-[11px] text-[#a39c95]">Cập nhật {lesson.updatedAt}</p>
          </button>
        );
      })}
    </div>
  );
}

function UploadPanel() {
  return (
    <div className="flex min-h-[592px] flex-col items-center justify-center rounded-[20px] border border-dashed border-[#c8c0b8] bg-white px-6 py-16 text-center shadow-[0_2px_6px_rgba(0,0,0,0.04)]">
      <div className="flex size-[72px] items-center justify-center rounded-2xl bg-[#fbf8f5]"><FileUp className="size-7 text-[#8b847d]" /></div>
      <h2 className="mt-4 font-semibold">Tải bài giảng từ máy tính</h2>
      <p className="mt-2 text-sm text-[#6f6b67]">Hỗ trợ tệp .docx và .pdf, dung lượng tối đa 20 MB.</p>
      <button type="button" className="mt-5 rounded-[14px] bg-[#e58461] px-5 py-2.5 text-sm font-medium text-white shadow-[0_2px_5px_rgba(229,132,97,0.25)]">Chọn tệp</button>
    </div>
  );
}

function ConfigPanel({ selected, slideCount, styleHint, filter, onFilterChange, onSlideCountChange, onStyleChange, onCreate }: { selected: LessonCard | null; slideCount: number; styleHint: string; filter: string; onFilterChange: (value: string) => void; onSlideCountChange: (value: number) => void; onStyleChange: (value: string) => void; onCreate: () => void }) {
  return (
    <aside className="space-y-4 xl:sticky xl:top-10">
      <div className="overflow-hidden rounded-[20px] bg-white shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
        <PanelSection label="Bài giảng đã chọn">
          {selected ? <div className="flex items-center gap-3 rounded-[14px] border border-[#e8e1d9] bg-[#fbf8f5] p-3"><div className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-[#ede8e2]"><BookOpen className="size-4" /></div><div className="min-w-0"><p className="truncate text-[13px] font-medium">{selected.title}</p><p className="truncate text-[11px] text-[#a39c95]">{selected.subject} · {selected.grade}</p></div></div> : <div className="flex items-center gap-3 rounded-[14px] border border-[#e8e1d9] bg-[#fbf8f5] p-3"><div className="flex size-9 items-center justify-center rounded-[10px] bg-[#ede8e2]"><BookOpen className="size-4 text-[#a39c95]" /></div><p className="text-[13px] italic text-[#a39c95]">Chưa chọn bài giảng</p></div>}
        </PanelSection>
        <Divider />
        <PanelSection label="Số lượng slide"><Stepper value={slideCount} onChange={onSlideCountChange} /></PanelSection>
        <Divider />
        <PanelSection label="Phong cách thiết kế"><SelectBox value={styleHint} options={[...STYLE_OPTIONS]} onChange={onStyleChange} icon={<ImageIcon className="size-4" />} /></PanelSection>
        <Divider />
        <PanelSection label="Thêm nhanh"><div className="flex flex-wrap gap-2">{["Minh họa", "Bài tập", "Câu hỏi", "Tổng kết"].map((chip) => <button key={chip} type="button" className="rounded-full border border-[#e58461] bg-[#e58461] px-4 py-2 text-[13px] font-medium text-white shadow-[0_1px_2px_rgba(229,132,97,0.2)] transition hover:bg-[#dc7958]">{chip}</button>)}</div></PanelSection>
        <div className="px-5 pb-5"><SelectBox value={filter} options={["all", "Vật lý", "Hóa học", "Toán học"]} labels={{ all: "Tất cả môn học" }} onChange={onFilterChange} /></div>
        <Divider />
        <div className="p-5">
          <button type="button" disabled={!selected} onClick={onCreate} className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#e58461] text-[15px] font-semibold text-white shadow-[0_2px_5px_rgba(229,132,97,0.25)] transition enabled:hover:bg-[#dd7957] disabled:cursor-not-allowed disabled:bg-[#e8e1d9] disabled:text-[#a39c95] disabled:shadow-none"><Sparkles className="size-4" />Tạo Slide bằng AI</button>
          <p className="mt-3 text-center text-xs text-[#a39c95]">AI sẽ tạo slide dựa trên bài giảng đã chọn.</p>
        </div>
      </div>
    </aside>
  );
}

function PanelSection({ label, children }: { label: string; children: React.ReactNode }) {
  return <section className="p-5"><h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#a39c95]">{label}</h2>{children}</section>;
}

function Divider() { return <div className="h-px bg-[#f5f1ec]" />; }

function Stepper({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  return <div className="flex h-[65px] items-center justify-between rounded-2xl border border-[#e8e1d9] bg-[#fbf8f5] p-2"><button type="button" onClick={() => onChange(Math.max(1, value - 1))} className="flex size-9 items-center justify-center rounded-[14px] border border-[#e8e1d9] bg-white" aria-label="Giảm số slide"><Minus className="size-3.5" /></button><div className="text-center"><strong className="block text-[28px] leading-7">{value}</strong><span className="text-[11px] text-[#a39c95]">slide</span></div><button type="button" onClick={() => onChange(Math.min(60, value + 1))} className="flex size-9 items-center justify-center rounded-[14px] border border-[#e8e1d9] bg-white" aria-label="Tăng số slide"><Plus className="size-3.5" /></button></div>;
}

function SelectBox({ value, options, labels = {}, onChange, icon }: { value: string; options: string[]; labels?: Record<string, string>; onChange: (value: string) => void; icon?: React.ReactNode }) {
  return <label className="relative flex h-[52px] items-center rounded-2xl border border-[#e8e1d9] bg-[#fbf8f5]"><span className="sr-only">Chọn tùy chọn</span>{icon ? <span className="pointer-events-none absolute left-4">{icon}</span> : null}<select value={value} onChange={(event) => onChange(event.target.value)} className={`h-full w-full appearance-none bg-transparent pr-10 text-sm font-medium outline-none ${icon ? "pl-11" : "pl-4"}`}>{options.map((option) => <option key={option} value={option}>{labels[option] ?? option}</option>)}</select><ChevronDown className="pointer-events-none absolute right-4 size-3.5 text-[#6f6b67]" /></label>;
}
