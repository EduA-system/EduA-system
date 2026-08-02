"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { useAuth } from "@/lib/auth/AuthContext";
import { createLibraryContent } from "@/lib/library";
import {
  fetchChapterLessons,
  fetchTextbookChapters,
  fetchTextbookNames,
  type CatalogBookName,
  type CatalogChapterSummary,
  type CatalogLesson,
} from "@/services/lessonPlanService";
import {
  generatePracticeExamQuestions,
  type PracticeExamRequest,
  type PracticeQuestionType,
} from "@/services/practiceExamService";

type TypeKey = "MULTIPLE_CHOICE" | "TRUE_FALSE" | "SHORT_ANSWER" | "ESSAY";
const TYPES: TypeKey[] = [
  "MULTIPLE_CHOICE",
  "TRUE_FALSE",
  "SHORT_ANSWER",
  "ESSAY",
];
const LABELS: Record<TypeKey, string> = {
  MULTIPLE_CHOICE: "TN nhiều lựa chọn",
  TRUE_FALSE: "Đúng – sai",
  SHORT_ANSWER: "Trả lời ngắn",
  ESSAY: "Tự luận",
};
const TIMES: Record<TypeKey, number[]> = {
  MULTIPLE_CHOICE: [0.75, 1, 1.5],
  TRUE_FALSE: [2, 3, 4],
  SHORT_ANSWER: [1.5, 2.5, 4],
  ESSAY: [4, 6, 9],
};
const BATCH_SIZES: Record<TypeKey, number> = {
  MULTIPLE_CHOICE: 5,
  TRUE_FALSE: 2,
  SHORT_ANSWER: 3,
  ESSAY: 1,
};

export function PracticeExamCreateDashboard() {
  const router = useRouter();
  const { authFetch } = useAuth();
  const [subject, setSubject] =
    useState<PracticeExamRequest["subject"]>("PHYSICS");
  const [grade, setGrade] = useState(10);
  const [duration, setDuration] = useState("15");
  const [difficulty, setDifficulty] =
    useState<PracticeExamRequest["difficulty"]>("MEDIUM");
  const [books, setBooks] = useState<CatalogBookName[]>([]);
  const [chapters, setChapters] = useState<CatalogChapterSummary[]>([]);
  const [bookCode, setBookCode] = useState("");
  const [selectedChapters, setSelectedChapters] = useState<string[]>([]);
  const [lessonsByChapter, setLessonsByChapter] = useState<
    Record<string, CatalogLesson[]>
  >({});
  const [selectedLessons, setSelectedLessons] = useState<string[]>([]);
  const [counts, setCounts] = useState<Record<TypeKey, number>>({
    MULTIPLE_CHOICE: 6,
    TRUE_FALSE: 1,
    SHORT_ANSWER: 1,
    ESSAY: 0,
  });
  const [scores, setScores] = useState<Record<TypeKey, number>>({
    MULTIPLE_CHOICE: 700,
    TRUE_FALSE: 200,
    SHORT_ANSWER: 100,
    ESSAY: 0,
  });
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationMessage, setGenerationMessage] = useState("");
  const durationMinutes = Number(duration);
  const totalScore = Object.values(scores).reduce((a, b) => a + b, 0);
  const totalQuestions = Object.values(counts).reduce((a, b) => a + b, 0);
  const estimatedBatchCount = TYPES.reduce(
    (sum, type) => sum + Math.ceil(counts[type] / BATCH_SIZES[type]),
    0,
  );
  useEffect(() => {
    void fetchTextbookNames(subject)
      .then(setBooks)
      .catch(() => setError("Không tải được SGK."));
  }, [subject]);
  useEffect(() => {
    if (bookCode)
      void fetchTextbookChapters(bookCode)
        .then(setChapters)
        .catch(() => setError("Không tải được chương."));
  }, [bookCode]);
  useEffect(() => {
    if (!bookCode || !selectedChapters.length) return;
    void Promise.all(
      selectedChapters.map(
        async (chapter) =>
          [chapter, await fetchChapterLessons(bookCode, chapter)] as const,
      ),
    )
      .then((items) => setLessonsByChapter(Object.fromEntries(items)))
      .catch(() => setError("Không tải được bài học."));
  }, [bookCode, selectedChapters]);
  useEffect(() => {
    if (!loading) return;
    const started = Date.now();
    const timer = window.setInterval(() => {
      const elapsed = Date.now() - started;
      if (elapsed < 8_000) {
        setGenerationProgress(22);
        setGenerationMessage("Đang gửi cấu hình đề tới AI...");
      } else if (elapsed < 45_000) {
        setGenerationProgress(Math.min(68, 30 + Math.floor(elapsed / 2_000)));
        setGenerationMessage(`AI đang tạo khoảng ${estimatedBatchCount} nhóm câu của đề...`);
      } else if (elapsed < 90_000) {
        setGenerationProgress(Math.min(86, 62 + Math.floor(elapsed / 4_000)));
        setGenerationMessage("Đang chờ các nhóm câu dài hoàn thành...");
      } else {
        setGenerationProgress(92);
        setGenerationMessage("Đang kiểm tra đáp án và thang điểm...");
      }
    }, 1_200);
    return () => window.clearInterval(timer);
  }, [loading, estimatedBatchCount]);
  const index = difficulty === "EASY" ? 0 : difficulty === "HARD" ? 2 : 1;
  const estimated = TYPES.reduce(
    (sum, type) => sum + counts[type] * TIMES[type][index],
    0,
  );
  const allowedOverrunMinutes = durationMinutes < 30 ? 5 : 10;
  const maximumEstimatedMinutes = durationMinutes + allowedOverrunMinutes;
  const hasValidDuration = Number.isInteger(durationMinutes) && durationMinutes > 0 && durationMinutes <= 90;
  const status =
    !hasValidDuration || estimated > maximumEstimatedMinutes
      ? "INFEASIBLE"
      : estimated > durationMinutes
        ? "WARNING"
        : "FEASIBLE";
  const hasValidScoreDistribution = TYPES.every(
    (type) => (counts[type] === 0) === (scores[type] === 0),
  );
  const canGenerate =
    hasValidDuration &&
    totalScore === 1000 &&
    totalQuestions > 0 &&
    hasValidScoreDistribution &&
    selectedLessons.length > 0 &&
    status !== "INFEASIBLE" &&
    (status !== "WARNING" || confirmed);
  const currentBook = useMemo(
    () => books.find((book) => book.id === bookCode),
    [books, bookCode],
  );
  function selectBook(value: string) {
    setBookCode(value);
    setSelectedChapters([]);
    setLessonsByChapter({});
    setSelectedLessons([]);
  }
  function toggleChapter(chapter: string) {
    setSelectedChapters((current) => {
      const selected = current.includes(chapter);
      if (selected) {
        setSelectedLessons((lessons) =>
          lessons.filter((lesson) => !lesson.startsWith(`${chapter}:`)),
        );
        return current.filter((value) => value !== chapter);
      }
      return [...current, chapter];
    });
  }
  function toggleLesson(chapter: string, lesson: string) {
    const id = `${chapter}:${lesson}`;
    setSelectedLessons((current) =>
      current.includes(id)
        ? current.filter((value) => value !== id)
        : [...current, id],
    );
  }
  async function generate() {
    if (!canGenerate || !bookCode) return;
    setGenerationProgress(8);
    setGenerationMessage("Đang chuẩn bị dữ liệu SGK...");
    setLoading(true);
    setError(null);
    try {
      const request: PracticeExamRequest = {
        title: `Kiểm tra ${durationMinutes} phút`,
        subject,
        grade,
        durationMinutes,
        difficulty,
        totalQuestionCount: totalQuestions,
        totalScoreCentiPoints: 1000,
        teacherConfirmedWarning: confirmed,
        questionTypes: TYPES.map((type) => ({
          type: type as PracticeQuestionType,
          questionCount: counts[type],
          totalScoreCentiPoints: scores[type],
          itemsPerQuestion: type === "TRUE_FALSE" ? 4 : undefined,
        })),
        knowledgeScope: {
          bookCode,
          lessonRefs: selectedLessons.map((value) => {
            const [chapterCode, lessonCode] = value.split(":");
            return { chapterCode, lessonCode };
          }),
        },
      };
      setGenerationProgress(12);
      setGenerationMessage(`AI đang tạo khoảng ${estimatedBatchCount} nhóm câu...`);
      const exam = await generatePracticeExamQuestions(request, authFetch);
      setGenerationProgress(96);
      setGenerationMessage("Đang lưu bản nháp đề vào thư viện...");
      const saved = await createLibraryContent(authFetch, {
        type: "TEST",
        title: exam.title,
        subject,
        payload: { exam, grade, duration: durationMinutes, difficulty },
      });
      setGenerationProgress(100);
      setGenerationMessage("Đang mở trình chỉnh sửa đề...");
      router.push(`/exam-edit-new?libraryId=${encodeURIComponent(saved.id)}`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không thể tạo đề.");
    } finally {
      setLoading(false);
    }
  }
  return (
    <main className="min-h-screen bg-white text-[#2b2926]">
      <div className="flex min-h-screen">
        <Sidebar activeHref="/exam-create-new" />
        <section className="min-w-0 flex-1 p-6 sm:p-10">
          <div className="mx-auto max-w-5xl">
            <p className="text-xs font-bold uppercase tracking-widest text-[#d97757]">
              AI practice exam
            </p>
            <h1 className="font-libertine mt-3 text-5xl">Tạo đề kiểm tra</h1>
            <p className="mt-3 text-sm text-[#70675f]">
              Đề được lưu tự động vào Thư viện của tôi sau khi AI tạo xong. Tài khoản Teacher hoặc Moderator có thể tạo đề.
            </p>
            {error && (
              <p
                role="alert"
                className="mt-5 rounded-xl bg-[#fff1ed] p-3 text-sm text-[#a54532]"
              >
                {error}
              </p>
            )}
            <div className="mt-8 grid gap-5 lg:grid-cols-[1fr_300px]">
              <div className="space-y-5">
                <Card title="1. Thông tin đề">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <Select
                      value={subject}
                      disabled={loading}
                      onChange={(value) => {
                        setSubject(value as PracticeExamRequest["subject"]);
                        selectBook("");
                      }}
                      options={[
                        ["PHYSICS", "Vật lí"],
                        ["CHEMISTRY", "Hóa học"],
                        ["MATH", "Toán"],
                      ]}
                    />
                    <Select
                      value={String(grade)}
                      disabled={loading}
                      onChange={(value) => {
                        setGrade(Number(value));
                        selectBook("");
                      }}
                      options={[
                        ["10", "Lớp 10"],
                        ["11", "Lớp 11"],
                        ["12", "Lớp 12"],
                      ]}
                    />
                    <label className="text-xs font-semibold">
                      Thời lượng (phút)
                      <input
                        type="number"
                        min="1"
                        max="90"
                        value={duration}
                        disabled={loading}
                        onChange={(event) => setDuration(event.target.value)}
                        className="mt-2 h-10 w-full rounded-lg border border-[#ddd5cc] px-3"
                      />
                    </label>
                  </div>
                  <div className="mt-4 flex gap-2">
                    {(["EASY", "MEDIUM", "HARD"] as const).map((item) => (
                      <button
                        key={item}
                        disabled={loading}
                        onClick={() => setDifficulty(item)}
                        className={`rounded-lg border px-3 py-2 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-60 ${difficulty === item ? "border-[#d97757] bg-[#fff0e9]" : "border-[#ddd5cc] bg-white"}`}
                      >
                        {item === "EASY"
                          ? "Dễ"
                          : item === "MEDIUM"
                            ? "Vừa"
                            : "Khó"}
                      </button>
                    ))}
                  </div>
                </Card>
                <Card title="2. Phạm vi kiến thức SGK">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Select
                      value={bookCode}
                      placeholder="Chọn sách"
                      disabled={loading}
                      onChange={selectBook}
                      options={books
                        .filter((book) => book.grade === grade)
                        .map((book) => [book.id, book.name])}
                    />
                    <div>
                      <p className="text-xs font-semibold">Chọn chương</p>
                      <div className="mt-2 max-h-36 overflow-y-auto rounded-lg border border-[#ddd5cc] bg-white p-2 text-sm">
                        {chapters.length ? chapters.map((chapter) => (
                          <label key={chapter.id} className="flex cursor-pointer items-center gap-2 border-b border-[#eee7df] py-2 last:border-0">
                            <input type="checkbox" disabled={loading} checked={selectedChapters.includes(chapter.id)} onChange={() => toggleChapter(chapter.id)} />
                            {chapter.name}
                          </label>
                        )) : <p className="p-2 text-xs text-[#81776e]">Chọn sách để xem các chương.</p>}
                      </div>
                    </div>
                  </div>
                  <p className="mt-3 text-xs text-[#81776e]">
                    Chọn từng chương bằng ô tích. Có thể chọn bài ở tất cả chương bên dưới.
                  </p>
                  <div className="mt-4 rounded-xl border border-dashed border-[#d8cfc5] bg-[#faf8f5] p-4">
                    {selectedChapters.length === 0 ? (
                      <p className="text-xs text-[#81776e]">
                        Chọn sách và ít nhất một chương.
                      </p>
                    ) : (
                      selectedChapters.map((chapterCode) => (
                        <div key={chapterCode} className="mb-4 last:mb-0">
                          <p className="mb-1 text-xs font-bold text-[#675e56]">
                            {
                              chapters.find(
                                (chapter) => chapter.id === chapterCode,
                              )?.name
                            }
                          </p>
                          {(lessonsByChapter[chapterCode] ?? []).map(
                            (lesson) => (
                              <label
                                key={lesson.id}
                                className="flex gap-2 border-b border-[#eee7df] py-2 text-sm last:border-0"
                              >
                                <input
                                  type="checkbox"
                                  checked={selectedLessons.includes(
                                    `${chapterCode}:${lesson.id}`,
                                  )}
                                  disabled={loading}
                                  onChange={() =>
                                    toggleLesson(chapterCode, lesson.id)
                                  }
                                />
                                {lesson.name}
                              </label>
                            ),
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </Card>
                <Card title="3. Cấu trúc câu hỏi và điểm">
                  <table className="w-full text-sm">
                    <tbody>
                      {TYPES.map((type) => (
                        <tr key={type} className="border-b border-[#eee7df]">
                          <td className="py-3 font-medium">{LABELS[type]}</td>
                          <td>
                            <input
                              type="number"
                              min="0"
                              value={counts[type]}
                              disabled={loading}
                              onChange={(event) =>
                                setCounts((current) => ({
                                  ...current,
                                  [type]: Math.max(
                                    0,
                                    Number(event.target.value) || 0,
                                  ),
                                }))
                              }
                              className="w-16 rounded border p-1 text-center"
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              min="0"
                              max="10"
                              step="0.25"
                              value={scores[type] / 100}
                              disabled={loading}
                              onChange={(event) =>
                                setScores((current) => ({
                                  ...current,
                                  [type]: Math.max(
                                    0,
                                    Math.round((Number(event.target.value) || 0) * 100),
                                  ),
                                }))
                              }
                              className="w-20 rounded border p-1 text-center"
                            />{" "}
                            điểm
                          </td>
                          <td className="text-right">
                            {(counts[type] * TIMES[type][index]).toFixed(1)}{" "}
                            phút
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td className="pt-3 font-bold">Tổng</td>
                        <td className="pt-3">{totalQuestions} câu</td>
                        <td className="pt-3 font-bold">
                          {(totalScore / 100).toFixed(2)} điểm
                        </td>
                        <td className="pt-3 text-right">
                          {estimated.toFixed(1)} phút
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </Card>
              </div>
              <aside className="h-fit rounded-2xl border border-[#e4dcd3] bg-white p-5 lg:sticky lg:top-5">
                <p className="text-xs font-bold uppercase tracking-wider text-[#8b8178]">
                  Kiểm tra khả thi
                </p>
                <p
                  className={`mt-3 text-lg font-semibold ${status === "FEASIBLE" ? "text-[#297548]" : status === "WARNING" ? "text-[#9a6514]" : "text-[#bf5139]"}`}
                >
                  {status === "FEASIBLE"
                    ? "Khả thi"
                    : status === "WARNING"
                      ? "Cần xác nhận"
                      : "Không khả thi"}
                </p>
                <p className="mt-2 text-xs leading-5">
                  {!hasValidDuration
                    ? "Thời lượng phải là số nguyên từ 1 đến 90 phút."
                    : <>Ước tính {estimated.toFixed(1)} phút / đề {duration} phút
                  {durationMinutes > 0 && durationMinutes <= 90
                    ? ` (tối đa ${maximumEstimatedMinutes} phút được phép).`
                    : "."}</>}
                </p>
                {status === "WARNING" && (
                  <label className="mt-4 flex gap-2 text-xs">
                    <input
                      type="checkbox"
                      checked={confirmed}
                      disabled={loading}
                      onChange={(event) => setConfirmed(event.target.checked)}
                    />
                    Tôi xác nhận tiếp tục.
                  </label>
                )}
                <ul className="mt-5 space-y-2 text-xs">
                  <li>
                    {totalScore === 1000
                      ? "✓ Tổng điểm đúng 10"
                      : "! Tổng điểm phải bằng 10"}
                  </li>
                  <li>
                    {selectedLessons.length
                      ? `✓ Đã chọn ${selectedLessons.length} bài từ ${selectedChapters.length} chương`
                      : "! Chưa chọn bài SGK"}
                  </li>
                  <li>
                    {currentBook ? `✓ ${currentBook.name}` : "! Chưa chọn sách"}
                  </li>
                </ul>
                {loading && (
                  <div className="mt-5 rounded-lg border border-[#ead8b2] bg-[#fffaf0] p-3">
                    <div className="h-2 overflow-hidden rounded-full bg-[#f0e0cf]">
                      <div
                        className="h-full rounded-full bg-[#d97757] transition-[width] duration-700"
                        style={{ width: `${generationProgress}%` }}
                      />
                    </div>
                    <p className="mt-2 text-xs font-medium text-[#805f20]">
                      {generationMessage || "AI đang tạo đề..."}
                    </p>
                    <p className="mt-1 text-[11px] leading-4 text-[#8b8178]">
                      Biểu mẫu đã được khóa cho đến khi đề tạo xong.
                    </p>
                  </div>
                )}
                <button
                  disabled={!canGenerate || loading}
                  onClick={() => void generate()}
                  className="mt-6 w-full rounded-lg bg-[#d97757] px-4 py-3 text-sm font-semibold text-white disabled:bg-[#d9d2cb]"
                >
                  {loading ? "AI đang tạo đề..." : "Tạo đề bằng AI →"}
                </button>
              </aside>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-[#e2d9cf] bg-white p-5 sm:p-6">
      <h2 className="font-semibold">{title}</h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}
function Select({
  value,
  options,
  onChange,
  placeholder,
  disabled,
}: {
  value: string;
  options: string[][];
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      disabled={disabled}
      className="h-10 w-full rounded-lg border border-[#ddd5cc] bg-white px-3 text-sm disabled:cursor-not-allowed disabled:bg-[#eee9e3] disabled:text-[#9b9288]"
    >
      <option value="">{placeholder ?? "Chọn"}</option>
      {options.map(([value, label]) => (
        <option key={value} value={value}>
          {label}
        </option>
      ))}
    </select>
  );
}
