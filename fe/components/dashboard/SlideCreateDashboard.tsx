"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { BookOpen, X } from "lucide-react";
import { Sidebar } from "../layout/Sidebar";
import { DashboardIcon } from "../ui/DashboardIcon";
import { RichView } from "../blog/RichView";
import { STYLE_OPTIONS } from "./slideData";
import { writeSlideCreateSession } from "@/lib/slide-create/session";
import { getLibraryContent, listLibrary, type LibraryContent, type LibrarySubject } from "@/lib/library";
import { getTiptapDocument, tiptapToStructuredText, type TiptapNode } from "@/lib/tiptap-to-text";
import { useAuth } from "@/lib/auth/AuthContext";
import { canUseSubject, getSubjectRestriction } from "@/lib/auth/subject-access";

type LessonCard = { id: string; title: string; description: string; subject: string; subjectCode: LibrarySubject | null; grade: string; updatedAt: string };
const subjectLabel: Record<string, string> = { PHYSICS: "Vật lý", CHEMISTRY: "Hóa học", MATH: "Toán học" };

/** Same "Bài giảng" thumbnail treatment as the personal-library card (`fe/app/library/page.tsx`). */
function formatUpdatedAt(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Vừa cập nhật";
  return `Cập nhật ${new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }).format(date)}`;
}
const DEFAULT_SLIDE_COUNT = 12;
const DEFAULT_STYLE_HINT = STYLE_OPTIONS[0];

export function SlideCreateDashboard() {
  const router = useRouter();
  const { authFetch, status: authStatus, user } = useAuth();
  const subjectRestriction = getSubjectRestriction(user);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<string>("all");
  const [items, setItems] = useState<LibraryContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [libraryError, setLibraryError] = useState("");
  const [selectedId, setSelectedId] = useState<string>("");

  const [previewId, setPreviewId] = useState<string | null>(null);
  const [previewDetail, setPreviewDetail] = useState<LibraryContent | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState("");
  const [creating, setCreating] = useState(false);

  const loadLibrary = useCallback(async () => {
    if (authStatus === "loading") return;
    if (authStatus !== "authenticated") { setLoading(false); setLibraryError("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại."); return; }
    setLoading(true); setLibraryError("");
    try {
      const params = new URLSearchParams({ type: "LESSON_PLAN", size: "100", sort: "updatedAt" });
      if (subjectRestriction) params.set("subject", subjectRestriction);
      const page = await listLibrary(authFetch, params);
      setItems(page.items);
      setSelectedId((id) => id && page.items.some((item) => item.id === id) ? id : (page.items[0]?.id ?? ""));
    } catch (error) { setLibraryError(error instanceof Error ? error.message : "Không thể tải thư viện giáo án."); }
    finally { setLoading(false); }
  }, [authFetch, authStatus, subjectRestriction]);
  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void loadLibrary();
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [loadLibrary]);

  const lessons = useMemo<LessonCard[]>(() => items.map((item) => ({
    id: item.id, title: item.title, description: "Giáo án đã lưu trong thư viện", subject: item.subject ? subjectLabel[item.subject] ?? item.subject : "Chưa phân môn",
    subjectCode: item.subject, grade: "Giáo án", updatedAt: item.updatedAt,
  })), [items]);
  const visible = useMemo<LessonCard[]>(() => {
    return lessons.filter((lesson) => {
      const matchesQuery =
        query.trim() === "" ||
        lesson.title.toLowerCase().includes(query.toLowerCase()) ||
        lesson.description.toLowerCase().includes(query.toLowerCase());
      const matchesFilter = filter === "all" || lesson.subjectCode === filter;
      return matchesQuery && matchesFilter;
    });
  }, [lessons, query, filter]);

  useEffect(() => {
    if (!subjectRestriction) return;
    queueMicrotask(() => setFilter(subjectRestriction));
  }, [subjectRestriction]);

  const previewLesson =
    lessons.find((lesson) => lesson.id === previewId) ?? null;
  const previewDocument = useMemo<TiptapNode | null>(() => {
    if (!previewDetail) return null;
    try { return getTiptapDocument(previewDetail.payload); } catch { return null; }
  }, [previewDetail]);

  const openPreview = useCallback(async (lesson: LessonCard) => {
    setSelectedId(lesson.id);
    setPreviewId(lesson.id);
    setPreviewDetail(null);
    setPreviewError("");
    setPreviewLoading(true);
    try {
      const detail = await getLibraryContent(authFetch, lesson.id);
      setPreviewDetail(detail);
    } catch (error) {
      setPreviewError(error instanceof Error ? error.message : "Không thể tải nội dung giáo án.");
    } finally {
      setPreviewLoading(false);
    }
  }, [authFetch]);
  const closePreview = useCallback(() => setPreviewId(null), []);

  async function createSlideFromDetail(lesson: LessonCard, detail: LibraryContent) {
    if (!canUseSubject(user, detail.subject)) {
      setPreviewError("Tài khoản này chỉ được tạo slide từ giáo án đúng môn được phân công.");
      return;
    }
    setCreating(true);
    try {
      const lessonContent = tiptapToStructuredText(getTiptapDocument(detail.payload));
      writeSlideCreateSession({ lessonCardId: detail.id, libraryContentId: detail.id, lessonTitle: detail.title, lessonSummary: lesson.description,
        subject: detail.subject ? subjectLabel[detail.subject] ?? detail.subject : "", grade: lesson.grade,
        styleHint: DEFAULT_STYLE_HINT, slideCount: DEFAULT_SLIDE_COUNT, lessonContent });
      router.push("/slide-create/outline");
    } catch (error) {
      setPreviewError(error instanceof Error ? error.message : "Không thể đọc giáo án đã chọn.");
      setCreating(false);
    }
  }

  async function handleCreateFromPreview() {
    if (!previewLesson) return;
    if (previewDetail && previewDetail.id === previewLesson.id) {
      await createSlideFromDetail(previewLesson, previewDetail);
      return;
    }
    setCreating(true);
    try {
      const detail = await getLibraryContent(authFetch, previewLesson.id);
      await createSlideFromDetail(previewLesson, detail);
    } catch (error) {
      setPreviewError(error instanceof Error ? error.message : "Không thể đọc giáo án đã chọn.");
      setCreating(false);
    }
  }

  return (
    <main className="flex h-screen w-full overflow-hidden bg-white text-[#171717]">
      <Sidebar />
      <section className="flex min-w-0 flex-1 flex-col">
        {/* Header / breadcrumb */}
        <header className="flex items-center justify-between border-b border-[#eee8e1] bg-[#fbfaf8] px-5 py-3 sm:px-8 lg:px-10">
          <nav className="flex items-center gap-2 text-[12px] leading-4 text-[#8a8178]">
            <span>EDUA</span>
            <ChevronRight />
            <span>Slide Deck</span>
            <ChevronRight />
            <span className="font-medium text-[#1f1f1f]">Mới</span>
          </nav>
        </header>

        {/* Body: cards */}
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-8 sm:px-8 lg:px-10 lg:py-12">
          <div className="mx-auto w-full max-w-[1120px]">
            {/* Title */}
            <div className="inline-flex h-[26px] items-center gap-1.5 rounded-full border border-[#eadfd7] bg-[#fff7f1] px-3 text-[11px] font-medium text-[#d97757]">
              <DashboardIcon name="aiBadge" /> Tạo bài trình chiếu bằng AI
            </div>
            <h1 className="font-libertine mt-4 text-[48px] font-normal leading-none text-[#1f1f1f] sm:text-[64px]">
              Tạo slide
            </h1>
            <p className="mt-4 max-w-[440px] text-[13px] leading-[23px] text-[#6b6b6b]">
              Chọn giáo án và để AI lo phần còn lại cho bạn.
            </p>

            {/* Search + filter */}
            <div className="mt-9 flex items-center gap-3 rounded-[14px] border border-[#d8d1c9] bg-white p-4">
              <div className="flex h-[40px] flex-1 items-center gap-2 rounded-lg border border-[#d8d1c9] bg-[#faf9f7] px-[15px] focus-within:border-[#d97757]">
                <span className="text-[#8a8178]">
                  <SearchIcon />
                </span>
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Tìm kiếm giáo án..."
                  className="h-full w-full bg-transparent text-[12px] text-[#171717] placeholder:text-[#a8a097] focus:outline-none"
                />
              </div>
              <FilterSelect value={filter} onChange={setFilter} lockedSubject={subjectRestriction} />
            </div>

            {/* Cards */}
            {loading ? <p className="mt-6 text-[13px] text-[#6b6b6b]">Đang tải giáo án…</p> : libraryError ? <div className="mt-6 rounded-lg border border-[#e8b4a4] bg-[#fdf3ef] px-4 py-3 text-[12px] text-[#c0492b]">{libraryError} <button type="button" onClick={() => void loadLibrary()} className="underline">Thử lại</button></div> : <CardGrid lessons={visible} selectedId={selectedId} onOpen={(lesson) => void openPreview(lesson)} />}
          </div>
        </div>
      </section>

      {previewId ? (
        <LessonPreviewModal
          title={previewLesson?.title ?? previewDetail?.title ?? "Giáo án"}
          loading={previewLoading}
          error={previewError}
          document={previewDocument}
          creating={creating}
          onClose={closePreview}
          onCreate={() => void handleCreateFromPreview()}
        />
      ) : null}
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

function FilterSelect({
  value,
  onChange,
  lockedSubject,
}: {
  value: string;
  onChange: (value: string) => void;
  lockedSubject: LibrarySubject | null;
}) {
  const options = lockedSubject
    ? [[lockedSubject, subjectLabel[lockedSubject] ?? lockedSubject]]
    : [
        ["all", "Tất cả môn"],
        ["PHYSICS", "Vật lý"],
        ["CHEMISTRY", "Hóa học"],
        ["MATH", "Toán học"],
      ];

  return (
    <div className="relative h-[40px] w-[150px]">
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={Boolean(lockedSubject)}
        className="h-full w-full cursor-pointer appearance-none rounded-lg border border-[#d8d1c9] bg-[#faf9f7] pl-[15px] pr-8 text-[12px] font-medium text-[#171717] outline-none focus:border-[#d97757]"
      >
        {options.map(([optionValue, label]) => (
          <option key={optionValue} value={optionValue}>
            {label}
          </option>
        ))}
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
  onOpen,
}: {
  lessons: LessonCard[];
  selectedId: string;
  onOpen: (lesson: LessonCard) => void;
}) {
  if (lessons.length === 0) {
    return (
      <div className="mt-6 rounded-[14px] border border-dashed border-[#d8d1c9] bg-[#faf9f7] px-6 py-12 text-center text-[13px] text-[#6b6b6b]">
        Không tìm thấy giáo án phù hợp.
      </div>
    );
  }
  return (
    <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {lessons.map((lesson) => (
        <LessonCardItem
          key={lesson.id}
          lesson={lesson}
          active={lesson.id === selectedId}
          onClick={() => onOpen(lesson)}
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
      aria-label={`Xem trước ${lesson.title}`}
      className={`group relative min-w-0 rounded-[14px] border bg-white text-left transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_20px_rgba(43,41,38,0.10)] ${
        active ? "border-[#e8724a] ring-2 ring-[#e8724a]/15" : "border-[#d8d1c9] hover:border-[#d9a48f]"
      }`}
    >
      <div className="flex h-full flex-col overflow-visible rounded-[14px] bg-white p-3">
        <div className="flex items-center gap-2 px-1 pb-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#fff1e9] text-[#d97757]">
            <BookOpen aria-hidden className="size-5" />
          </div>
          <p className="min-w-0 flex-1 truncate text-sm font-bold text-[#363a43]">
            Giáo án {lesson.subject}
          </p>
        </div>

        <div className="relative block aspect-[16/7] overflow-hidden rounded-[10px] border border-[#eadfd7] bg-gradient-to-br from-[#fff7f1] via-[#faf9f7] to-[#f3efe9]">
          <div className="flex h-full flex-col items-center justify-center gap-4 text-[#b65f40]">
            <span className="flex size-16 items-center justify-center rounded-[14px] bg-white/75 shadow-sm">
              <BookOpen aria-hidden className="size-10" />
            </span>
            <span className="text-xs font-bold uppercase tracking-[0.2em]">Bài giảng</span>
          </div>
        </div>

        <div className="px-2 pb-1 pt-2">
          <p className="line-clamp-1 text-base font-semibold leading-5 text-[#1f1f1f]">{lesson.title}</p>
        </div>

        <div className="mt-auto flex items-center gap-2 border-t border-[#eee8e1] p-2 pt-3">
          <div className="min-w-0 flex-1 px-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-400">Cập nhật</p>
            <p className="truncate text-xs font-medium text-stone-600">{formatUpdatedAt(lesson.updatedAt)}</p>
          </div>
          <span className="inline-flex items-center justify-center rounded-[10px] bg-[#e8724a] px-4 py-2.5 text-[13px] font-medium text-white transition group-hover:bg-[#d96a42]">
            Xem trước
          </span>
        </div>
      </div>
    </button>
  );
}

function LessonPreviewModal({
  title,
  loading,
  error,
  document,
  creating,
  onClose,
  onCreate,
}: {
  title: string;
  loading: boolean;
  error: string;
  document: TiptapNode | null;
  creating: boolean;
  onClose: () => void;
  onCreate: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="flex h-[80vh] w-[80vw] max-w-[1400px] flex-col overflow-hidden rounded-[14px] border border-[#d8d1c9] bg-white shadow-2xl">
        <header className="flex items-center justify-between gap-4 border-b border-[#e8e2d9] px-6 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              aria-label="Đóng"
              className="flex size-8 shrink-0 items-center justify-center rounded-lg text-[#6b6b6b] transition hover:bg-[#f5f1ec]"
            >
              <X className="size-4" />
            </button>
            <h2 className="truncate text-[15px] font-semibold text-[#1f1f1f]">{title}</h2>
          </div>
          <button
            type="button"
            onClick={onCreate}
            disabled={loading || creating || !document}
            className="flex h-[38px] shrink-0 items-center gap-2 rounded-[10px] bg-[#e8724a] px-4 text-[13px] font-medium text-white transition enabled:hover:bg-[#d96a42] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <DashboardIcon name="createSlide" className="size-4" />
            {creating ? "Đang xử lý…" : "Tạo Slide"}
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-10 py-8">
          {loading ? (
            <p className="text-[13px] text-[#8a8178]">Đang tải nội dung giáo án…</p>
          ) : error ? (
            <p className="text-[13px] text-red-600">{error}</p>
          ) : document ? (
            <RichView html={document} variant="document" />
          ) : (
            <p className="text-[13px] text-[#8a8178]">Không thể hiển thị nội dung giáo án này.</p>
          )}
        </div>
      </div>
    </div>
  );
}

