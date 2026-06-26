"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { suggestions } from "./data";
import { DashboardIcon } from "../ui/DashboardIcon";
import { Dropdown } from "../ui/Dropdown";
import { Pill } from "../ui/Pill";
import { Sidebar } from "../layout/Sidebar";
import {
  fetchTextbookCatalog,
  generateLessonPlan,
  storeGeneratedLessonPlan,
  type CatalogBook,
} from "@/services/lessonPlanService";

export function UserDashboard() {
  const router = useRouter();

  const [books, setBooks] = useState<CatalogBook[]>([]);
  const [catalogError, setCatalogError] = useState<string | null>(null);

  const [bookId, setBookId] = useState<string | null>(null);
  const [chapterId, setChapterId] = useState<string | null>(null);
  const [lessonId, setLessonId] = useState<string | null>(null);
  const [userPrompt, setUserPrompt] = useState("");

  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetchTextbookCatalog()
      .then((catalog) => {
        if (active) setBooks(catalog.books ?? []);
      })
      .catch((error: unknown) => {
        if (active) setCatalogError(error instanceof Error ? error.message : "Không tải được danh mục SGK.");
      });
    return () => {
      active = false;
    };
  }, []);

  const selectedBook = useMemo(() => books.find((book) => book.id === bookId) ?? null, [books, bookId]);
  const selectedChapter = useMemo(
    () => selectedBook?.chapters.find((chapter) => chapter.id === chapterId) ?? null,
    [selectedBook, chapterId],
  );

  const bookOptions = books.map((book) => ({ value: book.id, label: `Lớp ${book.grade}` }));
  const chapterOptions = (selectedBook?.chapters ?? []).map((chapter) => ({
    value: chapter.id,
    label: chapter.name,
  }));
  const lessonOptions = (selectedChapter?.lessons ?? []).map((lesson) => ({
    value: lesson.id,
    label: lesson.name,
  }));

  const canGenerate = Boolean(bookId && chapterId && lessonId) && !generating;

  function handleBookChange(value: string) {
    setBookId(value);
    setChapterId(null);
    setLessonId(null);
  }

  function handleChapterChange(value: string) {
    setChapterId(value);
    setLessonId(null);
  }

  async function handleGenerate() {
    if (!bookId || !chapterId || !lessonId) return;
    setGenerating(true);
    setGenerateError(null);
    try {
      const plan = await generateLessonPlan({
        bookId,
        chapterId,
        lessonId,
        userPrompt: userPrompt.trim() || undefined,
      });
      storeGeneratedLessonPlan(plan);
      router.push("/lesson-edit");
    } catch (error: unknown) {
      setGenerateError(error instanceof Error ? error.message : "Tạo giáo án thất bại.");
      setGenerating(false);
    }
  }

  return (
    <main className="h-screen w-full overflow-hidden bg-[#f5f1ec] text-[#171717]">
      <div className="flex h-full w-full">
        <Sidebar />
        <section className="relative min-w-0 flex-1 overflow-y-auto bg-[#f5f1ec] px-5 py-8 sm:px-8 lg:px-10 lg:py-12">
          <div className="mx-auto w-full max-w-[980px]">
            <div>
              <div className="inline-flex h-[26px] items-center gap-1.5 rounded-full border border-[#eadfd7] bg-[#fff7f1] px-3 text-[11px] font-medium text-[#d97757]">
                <DashboardIcon name="aiBadge" />
                Soạn giáo án bằng AI
              </div>
              <h1 className="font-libertine mt-4 text-[48px] font-normal leading-none text-[#1f1f1f] sm:text-[64px]">
                Tạo giáo án
              </h1>
              <p className="mt-4 max-w-[440px] text-[13px] leading-[23px] text-[#6b6b6b]">
                Chuyển đổi nội dung chương trình học thành giáo án có cấu trúc với hỗ trợ của AI.
              </p>
            </div>

            <div className="mt-10">
              <p className="text-[12px] font-semibold text-[#6b6b6b]">Gợi ý phổ biến</p>
              <div className="mt-2.5 flex flex-wrap gap-2">
                {suggestions.map((suggestion) => (
                  <Pill key={suggestion}>{suggestion}</Pill>
                ))}
              </div>
            </div>

            <div className="mt-9 rounded-[14px] border border-[#d8d1c9] bg-white px-7 py-[22px]">
              <div className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-[#6b6b6b]">
                <DashboardIcon name="formTitle" />
                Chọn nội dung giảng dạy
              </div>

              {catalogError ? (
                <p className="mt-4 rounded-lg border border-[#e8b4a4] bg-[#fdf3ef] px-3 py-2 text-[12px] text-[#c0492b]">
                  {catalogError}
                </p>
              ) : (
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <div className="flex h-[34px] items-center gap-2 rounded-lg border border-[#d8d1c9] bg-[#f3efe9] px-3 text-[12px] font-medium text-[#6b6b6b]">
                    Vật lí
                  </div>
                  <span className="text-[#d8d1c9]">›</span>
                  <Dropdown
                    placeholder="Lớp"
                    value={bookId}
                    options={bookOptions}
                    onChange={handleBookChange}
                  />
                  <span className="text-[#d8d1c9]">›</span>
                  <Dropdown
                    placeholder="Chương học"
                    value={chapterId}
                    options={chapterOptions}
                    onChange={handleChapterChange}
                    disabled={!selectedBook}
                  />
                  <span className="text-[#d8d1c9]">›</span>
                  <Dropdown
                    placeholder="Bài học"
                    value={lessonId}
                    options={lessonOptions}
                    onChange={setLessonId}
                    disabled={!selectedChapter}
                  />
                </div>
              )}

              <div className="my-6 h-px bg-[#d8d1c9]" />

              <label htmlFor="user-prompt" className="text-[12px] font-medium text-[#6b6b6b]">
                Yêu cầu thêm cho mục tiêu (tuỳ chọn)
              </label>
              <textarea
                id="user-prompt"
                value={userPrompt}
                onChange={(event) => setUserPrompt(event.target.value)}
                rows={3}
                placeholder="Ví dụ: Nhấn mạnh năng lực thực nghiệm và liên hệ thực tiễn."
                className="mt-2 w-full resize-none rounded-lg border border-[#d8d1c9] bg-[#faf9f7] px-[15px] py-2.5 text-[13px] text-[#171717] outline-none placeholder:text-[#a8a097] focus:border-[#d97757]"
              />
            </div>

            <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <button
                onClick={handleGenerate}
                disabled={!canGenerate}
                className={`flex h-[46px] w-[168px] items-center justify-center gap-2 rounded-[12px] text-[13px] font-medium text-white shadow-[0_4px_8px_rgba(232,114,74,0.28)] transition ${
                  canGenerate ? "bg-[#e8724a] hover:bg-[#d96a42]" : "cursor-not-allowed bg-[#e8b9a7]"
                }`}
              >
                <DashboardIcon name="generate" />
                {generating ? "Đang tạo..." : "Tạo giáo án"}
              </button>
              <span className="text-center text-[12px] text-[#6b6b6b]">
                {generateError ? (
                  <span className="text-[#c0492b]">{generateError}</span>
                ) : (
                  "Chọn đủ lớp, chương và bài để tiếp tục"
                )}
              </span>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
