"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { suggestions } from "./data";
import { DashboardIcon } from "../ui/DashboardIcon";
import { Dropdown } from "../ui/Dropdown";
import { Pill } from "../ui/Pill";
import { Sidebar } from "../layout/Sidebar";
import {
  fetchChapterLessons,
  fetchTextbookChapters,
  fetchTextbookNames,
  LessonPlanRequestError,
  startLessonPlanStream,
  storeLessonPlanSession,
  type CatalogBookName,
  type CatalogChapterSummary,
  type CatalogLesson,
} from "@/services/lessonPlanService";
import { useAuth } from "@/lib/auth/AuthContext";
import { canUseSubject, getSubjectRestriction, subjectOptionsForUser, type SubjectCode } from "@/lib/auth/subject-access";

const SUBJECT_OPTIONS = [
  { value: "PHYSICS", label: "Vật lí" },
  { value: "CHEMISTRY", label: "Hóa học" },
  { value: "MATH", label: "Toán" },
];

export function UserDashboard() {
  const router = useRouter();
  const { authFetch, user } = useAuth();
  const subjectRestriction = getSubjectRestriction(user);

  const [books, setBooks] = useState<CatalogBookName[]>([]);
  const [chapters, setChapters] = useState<CatalogChapterSummary[]>([]);
  const [lessons, setLessons] = useState<CatalogLesson[]>([]);
  const [catalogError, setCatalogError] = useState<string | null>(null);

  const [subjectCode, setSubjectCode] = useState<SubjectCode>(() => subjectRestriction ?? "PHYSICS");
  const [bookId, setBookId] = useState<string | null>(null);
  const [chapterId, setChapterId] = useState<string | null>(null);
  const [lessonId, setLessonId] = useState<string | null>(null);
  const [userPrompt, setUserPrompt] = useState("");
  const [additionalRequestError, setAdditionalRequestError] = useState<string | null>(null);

  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const subjectOptions = useMemo(() => subjectOptionsForUser(user, SUBJECT_OPTIONS), [user]);
  const subjectAllowed = canUseSubject(user, subjectCode);

  useEffect(() => {
    if (!subjectRestriction || subjectCode === subjectRestriction) return;
    queueMicrotask(() => {
      setSubjectCode(subjectRestriction);
      setBookId(null);
      setChapterId(null);
      setLessonId(null);
      setBooks([]);
      setChapters([]);
      setLessons([]);
      setCatalogError(null);
    });
  }, [subjectRestriction, subjectCode]);

  useEffect(() => {
    let active = true;
    fetchTextbookNames(subjectCode)
      .then((items) => {
        if (active) setBooks(items);
      })
      .catch((error: unknown) => {
        if (active) setCatalogError(error instanceof Error ? error.message : "Không tải được danh mục SGK.");
      });
    return () => {
      active = false;
    };
  }, [subjectCode]);

  useEffect(() => {
    if (!bookId) {
      return;
    }

    let active = true;
    fetchTextbookChapters(bookId)
      .then((items) => {
        if (active) setChapters(items);
      })
      .catch((error: unknown) => {
        if (active) setCatalogError(error instanceof Error ? error.message : "Khong tai duoc danh sach chuong.");
      });
    return () => {
      active = false;
    };
  }, [bookId]);

  useEffect(() => {
    if (!bookId || !chapterId) {
      return;
    }

    let active = true;
    fetchChapterLessons(bookId, chapterId)
      .then((items) => {
        if (active) setLessons(items);
      })
      .catch((error: unknown) => {
        if (active) setCatalogError(error instanceof Error ? error.message : "Khong tai duoc danh sach bai hoc.");
      });
    return () => {
      active = false;
    };
  }, [bookId, chapterId]);

  const selectedBook = useMemo(() => books.find((book) => book.id === bookId) ?? null, [books, bookId]);
  const selectedChapter = useMemo(() => chapters.find((chapter) => chapter.id === chapterId) ?? null, [chapters, chapterId]);
  const selectedLesson = useMemo(() => lessons.find((lesson) => lesson.id === lessonId) ?? null, [lessons, lessonId]);
  const selectedSubject = useMemo(
    () => SUBJECT_OPTIONS.find((subject) => subject.value === subjectCode) ?? SUBJECT_OPTIONS[0],
    [subjectCode],
  );

  const bookOptions = useMemo(() => {
    const gradeCounts = books.reduce((counts, book) => {
      counts.set(book.grade, (counts.get(book.grade) ?? 0) + 1);
      return counts;
    }, new Map<number, number>());

    return books.map((book) => ({
      value: book.id,
      label: (gradeCounts.get(book.grade) ?? 0) > 1 ? `Lớp ${book.grade} - ${book.name}` : `Lớp ${book.grade}`,
    }));
  }, [books]);
  const chapterOptions = chapters.map((chapter) => ({
    value: chapter.id,
    label: chapter.name,
  }));
  const lessonOptions = lessons.map((lesson) => ({
    value: lesson.id,
    label: lesson.name,
  }));

  const canGenerate = subjectAllowed && Boolean(bookId && chapterId && lessonId) && !generating;

  function handleSubjectChange(value: string) {
    if (!canUseSubject(user, value)) return;
    setSubjectCode(value as SubjectCode);
    setBookId(null);
    setChapterId(null);
    setLessonId(null);
    setBooks([]);
    setChapters([]);
    setLessons([]);
    setCatalogError(null);
  }

  function handleBookChange(value: string) {
    setBookId(value);
    setChapterId(null);
    setLessonId(null);
    setChapters([]);
    setLessons([]);
  }

  function handleChapterChange(value: string) {
    setChapterId(value);
    setLessonId(null);
    setLessons([]);
  }

  async function handleGenerate() {
    if (!bookId || !chapterId || !lessonId) return;
    setGenerating(true);
    setGenerateError(null);
    setAdditionalRequestError(null);
    try {
      // Luồng streaming: chỉ kickoff (BE trả 202 ngay), rồi sang /lesson-edit mở STOMP
      // và fill dần. Không chờ AI ở đây nữa → không còn request đồng bộ dài/timeout.
      const sessionId =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `lp-${Date.now()}-${Math.random().toString(36).slice(2)}`;

      const session = {
        sessionId,
        bookId,
        chapterId,
        lessonId,
        userPrompt: userPrompt.trim() || undefined,
      };
      const displaySession = {
        ...session,
        display: {
          title: selectedLesson?.name ?? "…………………………………..",
          subject: selectedBook?.subjectName ?? selectedSubject.label,
          subjectCode,
          grade: selectedBook ? `lớp: ${selectedBook.grade}` : "lớp: ………",
          duration: "Thời gian thực hiện: (số tiết)",
        },
      };

      console.log(
        "%c[Tạo giáo án] kickoff stream",
        "color:#e8724a;font-weight:bold",
        session,
      );

      await startLessonPlanStream(session, authFetch);
      storeLessonPlanSession(displaySession);
      router.push("/lesson-edit");
    } catch (error: unknown) {
      if (error instanceof LessonPlanRequestError && error.code === "INVALID_LESSON_PLAN_ADDITIONAL_REQUEST") {
        setAdditionalRequestError(error.message);
      } else {
        setGenerateError(error instanceof Error ? error.message : "Tạo giáo án thất bại.");
      }
      setGenerating(false);
    }
  }

  return (
    <main className="h-screen w-full overflow-hidden bg-white text-[#171717]">
      <div className="flex h-full w-full">
        <Sidebar />
        <section className="relative min-w-0 flex-1 overflow-y-auto bg-white px-5 py-8 sm:px-8 lg:px-10 lg:py-12">
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

              {catalogError && (
                <p className="mt-4 rounded-lg border border-[#e8b4a4] bg-[#fdf3ef] px-3 py-2 text-[12px] text-[#c0492b]">
                  {catalogError}
                </p>
              )}

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  {subjectRestriction ? (
                    <div className="flex h-[34px] items-center rounded-lg border border-[#d8d1c9] bg-[#f3efe9] px-3 text-[12px] font-medium text-[#4b453f]">
                      {selectedSubject.label}
                    </div>
                  ) : (
                    <Dropdown
                      placeholder="Môn học"
                      value={subjectCode}
                      options={subjectOptions}
                      onChange={handleSubjectChange}
                    />
                  )}
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

              <div className="my-6 h-px bg-[#d8d1c9]" />

              <label htmlFor="user-prompt" className="text-[12px] font-medium text-[#6b6b6b]">
                Yêu cầu thêm cho mục tiêu (tuỳ chọn)
              </label>
              <textarea
                id="user-prompt"
                value={userPrompt}
                onChange={(event) => {
                  setUserPrompt(event.target.value);
                  setAdditionalRequestError(null);
                }}
                rows={3}
                placeholder="Ví dụ: Nhấn mạnh năng lực thực nghiệm và liên hệ thực tiễn."
                aria-describedby={additionalRequestError ? "user-prompt-error" : undefined}
                className={`mt-2 w-full resize-none rounded-lg border bg-[#faf9f7] px-[15px] py-2.5 text-[13px] text-[#171717] outline-none placeholder:text-[#a8a097] focus:border-[#d97757] ${
                  additionalRequestError ? "border-[#c0492b]" : "border-[#d8d1c9]"
                }`}
              />
              {additionalRequestError && (
                <p id="user-prompt-error" className="mt-2 text-[12px] text-[#c0492b]">{additionalRequestError}</p>
              )}
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
