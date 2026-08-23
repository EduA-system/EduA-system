"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { useAuth } from "@/lib/auth/AuthContext";
import { canUseSubject, getSubjectRestriction } from "@/lib/auth/subject-access";
import {
  fetchChapterLessons,
  fetchTextbookChapters,
  fetchTextbookNames,
  type CatalogBookName,
  type CatalogChapterSummary,
  type CatalogLesson,
} from "@/services/lessonPlanService";
import {
  startPracticeExamStream,
  storePracticeExamSession,
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
const SUBJECT_LABELS: Record<PracticeExamRequest["subject"], string> = {
  PHYSICS: "Vật lí",
  CHEMISTRY: "Hóa học",
  MATH: "Toán",
};
const DIFFICULTY_LABELS: Record<PracticeExamRequest["difficulty"], string> = {
  EASY: "Dễ",
  MEDIUM: "Vừa",
  HARD: "Khó",
};
const DIFFICULTY_HINTS: Record<PracticeExamRequest["difficulty"], string> = {
  EASY: "Câu hỏi cơ bản, thời gian làm mỗi câu ngắn hơn.",
  MEDIUM: "Cân bằng giữa lý thuyết và vận dụng.",
  HARD: "Nhiều bước vận dụng, thời gian ước tính mỗi câu dài hơn.",
};
const SUBJECT_OPTIONS: string[][] = Object.entries(SUBJECT_LABELS);
const GRADE_OPTIONS: string[][] = [
  ["10", "Lớp 10"],
  ["11", "Lớp 11"],
  ["12", "Lớp 12"],
];

type Step = 1 | 2 | 3;

export function PracticeExamCreateDashboard() {
  const router = useRouter();
  const { authFetch, user } = useAuth();
  const subjectRestriction = getSubjectRestriction(user);
  const [subject, setSubject] = useState<PracticeExamRequest["subject"]>(() =>
    subjectRestriction ?? "PHYSICS",
  );
  const [grade, setGrade] = useState(10);
  const [duration, setDuration] = useState("15");
  const [difficulty, setDifficulty] =
    useState<PracticeExamRequest["difficulty"]>("MEDIUM");
  const [libraryTitle, setLibraryTitle] = useState("");
  const [objective, setObjective] = useState("");
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
  const [openStep, setOpenStep] = useState<Step>(1);
  const [maxUnlockedStep, setMaxUnlockedStep] = useState<Step>(1);
  const durationMinutes = Number(duration);
  const durationMode: "15" | "45" | "custom" =
    duration === "15" || duration === "45" ? duration : "custom";
  const totalScore = Object.values(scores).reduce((a, b) => a + b, 0);
  const totalQuestions = Object.values(counts).reduce((a, b) => a + b, 0);
  useEffect(() => {
    let stale = false;
    void fetchTextbookNames(subject)
      .then((result) => {
        if (!stale) setBooks(result);
      })
      .catch(() => {
        if (!stale) setError("Không tải được SGK.");
      });
    return () => {
      stale = true;
    };
  }, [subject]);
  const matchingBooks = useMemo(
    () => books.filter((book) => book.grade === grade),
    [books, grade],
  );
  useEffect(() => {
    if (matchingBooks.length === 1 && bookCode !== matchingBooks[0].id) {
      selectBook(matchingBooks[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchingBooks]);
  useEffect(() => {
    if (!bookCode) return;
    let stale = false;
    void fetchTextbookChapters(bookCode)
      .then((result) => {
        if (!stale) setChapters(result);
      })
      .catch(() => {
        if (!stale) setError("Không tải được chương.");
      });
    return () => {
      stale = true;
    };
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
    canUseSubject(user, subject) &&
    hasValidDuration &&
    totalScore === 1000 &&
    totalQuestions > 0 &&
    hasValidScoreDistribution &&
    libraryTitle.trim().length > 0 &&
    selectedLessons.length > 0 &&
    status !== "INFEASIBLE" &&
    (status !== "WARNING" || confirmed);
  const currentBook = useMemo(
    () => books.find((book) => book.id === bookCode),
    [books, bookCode],
  );
  const subjectLocked = Boolean(subjectRestriction);
  const hasLibraryTitle = libraryTitle.trim().length > 0;
  const step1Valid = hasValidDuration && hasLibraryTitle;
  const step2Valid = Boolean(bookCode) && selectedLessons.length > 0;
  useEffect(() => {
    if (!subjectRestriction || subject === subjectRestriction) return;
    queueMicrotask(() => {
      setSubject(subjectRestriction);
      setBookCode("");
      setSelectedChapters([]);
      setLessonsByChapter({});
      setSelectedLessons([]);
    });
  }, [subjectRestriction, subject]);
  function goToStep(step: Step) {
    setOpenStep(step);
  }
  function continueToStep(step: Step) {
    setOpenStep(step);
    setMaxUnlockedStep((current) => (current < step ? step : current));
  }
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
    // Lấy lại môn ngay tại thời điểm submit thay vì tin vào state: effect đồng bộ
    // `subject` theo `subjectRestriction` chạy sau render, nên vẫn có cửa sổ mà state
    // còn giữ môn cũ. Với educator đã gán môn thì chỉ môn đó mới được phép gửi đi.
    const effectiveSubject = subjectRestriction ?? subject;
    setLoading(true);
    setError(null);
    try {
      const request: PracticeExamRequest = {
        // Đây là nhãn kỹ thuật cho luồng tạo AI. Tên giáo viên đặt được giữ
        // riêng trong display.libraryTitle và tuyệt đối không gửi vào API này.
        title: "Bài tập về nhà",
        subject: effectiveSubject,
        grade,
        durationMinutes,
        difficulty,
        totalQuestionCount: totalQuestions,
        totalScoreCentiPoints: 1000,
        teacherConfirmedWarning: confirmed,
        objective: objective.trim() || undefined,
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
      // Luồng streaming: chỉ kickoff (BE trả 202 ngay), rồi sang /exam-edit-new mở STOMP
      // và fill dần. Không chờ AI ở đây nữa → không còn request đồng bộ dài/timeout.
      const sessionId =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `exam-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      await startPracticeExamStream({ sessionId, request }, authFetch);
      storePracticeExamSession({
        sessionId,
        request,
        display: {
          libraryTitle: libraryTitle.trim(),
          subject: effectiveSubject,
          grade: String(grade),
          duration: durationMinutes,
          difficulty,
        },
      });
      router.push("/exam-edit-new");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không thể tạo bài tập về nhà.");
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
              AI homework
            </p>
            <h1 className="font-libertine mt-3 text-5xl">Tạo bài tập về nhà</h1>
            <p className="mt-3 text-sm text-[#70675f]">
              Tạo bài tập về nhà bằng AI, bám sát phạm vi kiến thức SGK bạn chọn.
            </p>
            {error && (
              <p
                role="alert"
                className="mt-5 rounded-xl bg-[#fff1ed] p-3 text-sm text-[#a54532]"
              >
                {error}
              </p>
            )}
            <div className="mt-8 space-y-4">
              {openStep === 1 ? (
                <Card title="1. Thông tin bài tập">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <p className="text-xs font-semibold">Môn học</p>
                      {subjectLocked ? (
                        <div className="mt-2 flex h-10 items-center rounded-lg border border-[#ddd5cc] bg-[#f4f1ec] px-3 text-sm text-[#4b453f]">
                          {SUBJECT_LABELS[subject]}
                        </div>
                      ) : (
                        <>
                          <div className="mt-2">
                            <Select
                              value={subject}
                              disabled={loading}
                              onChange={(value) => {
                                setSubject(value as PracticeExamRequest["subject"]);
                                selectBook("");
                              }}
                              options={SUBJECT_OPTIONS}
                            />
                          </div>
                          <p className="mt-1 text-[11px] text-[#bf5139]">
                            Tài khoản chưa được gán môn học cố định, vui lòng chọn môn.
                          </p>
                        </>
                      )}
                    </div>
                    <label className="text-xs font-semibold">
                      Khối lớp
                      <div className="mt-2">
                        <Select
                          value={String(grade)}
                          disabled={loading}
                          onChange={(value) => {
                            setGrade(Number(value));
                            selectBook("");
                          }}
                          options={GRADE_OPTIONS}
                        />
                      </div>
                    </label>
                  </div>
                  <label className="mt-4 block text-xs font-semibold">
                    Tên bài tập <span className="text-[#bf5139]">*</span>
                    <input
                      type="text"
                      value={libraryTitle}
                      disabled={loading}
                      onChange={(event) => setLibraryTitle(event.target.value)}
                      placeholder="Ví dụ: Bài tập chương 2 - Hàm số bậc hai"
                      required
                      aria-required="true"
                      className="mt-2 h-10 w-full rounded-lg border border-[#ddd5cc] px-3 text-sm"
                    />
                    <span className="mt-1 block font-normal text-[#81776e]">
                      Hãy nhập tiêu đề cho bài tập.
                    </span>
                  </label>
                  <div className="mt-4">
                    <p className="text-xs font-semibold">Thời lượng làm bài</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {(["15", "45"] as const).map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          disabled={loading}
                          onClick={() => setDuration(preset)}
                          className={`rounded-lg border px-3 py-2 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-60 ${durationMode === preset ? "border-[#d97757] bg-[#fff0e9]" : "border-[#ddd5cc] bg-white"}`}
                        >
                          {preset} phút
                        </button>
                      ))}
                      <button
                        type="button"
                        disabled={loading}
                        onClick={() => setDuration("")}
                        className={`rounded-lg border px-3 py-2 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-60 ${durationMode === "custom" ? "border-[#d97757] bg-[#fff0e9]" : "border-[#ddd5cc] bg-white"}`}
                      >
                        Khác
                      </button>
                      {durationMode === "custom" && (
                        <input
                          type="number"
                          min="1"
                          max="90"
                          autoFocus
                          placeholder="Số phút"
                          value={duration}
                          disabled={loading}
                          onChange={(event) => setDuration(event.target.value)}
                          className="h-9 w-28 rounded-lg border border-[#ddd5cc] px-3 text-sm"
                        />
                      )}
                    </div>
                    {!hasValidDuration && (
                      <p className="mt-2 text-xs text-[#bf5139]">
                        Thời lượng phải là số nguyên từ 1 đến 90 phút.
                      </p>
                    )}
                  </div>
                  <div className="mt-4">
                    <p className="text-xs font-semibold">Mức độ bài tập</p>
                    <div className="mt-2 flex gap-2">
                      {(["EASY", "MEDIUM", "HARD"] as const).map((item) => (
                        <button
                          key={item}
                          disabled={loading}
                          onClick={() => setDifficulty(item)}
                          className={`rounded-lg border px-3 py-2 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-60 ${difficulty === item ? "border-[#d97757] bg-[#fff0e9]" : "border-[#ddd5cc] bg-white"}`}
                        >
                          {DIFFICULTY_LABELS[item]}
                        </button>
                      ))}
                    </div>
                    <p className="mt-2 text-xs text-[#81776e]">{DIFFICULTY_HINTS[difficulty]}</p>
                  </div>
                  <label className="mt-4 block text-xs font-semibold">
                    Mục tiêu bài tập (không bắt buộc)
                    <textarea
                      rows={2}
                      placeholder="Bạn muốn học sinh củng cố kiến thức gì?"
                      value={objective}
                      disabled={loading}
                      onChange={(event) => setObjective(event.target.value)}
                      className="mt-2 w-full rounded-lg border border-[#ddd5cc] px-3 py-2 text-sm"
                    />
                  </label>
                  <div className="mt-6 flex justify-end">
                    <button
                      type="button"
                      disabled={!step1Valid}
                      onClick={() => continueToStep(2)}
                      className="rounded-lg bg-[#d97757] px-5 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-[#d9d2cb]"
                    >
                      Tiếp tục →
                    </button>
                  </div>
                </Card>
              ) : (
                <StepSummary
                  title="1. Thông tin bài tập"
                  summary={`${libraryTitle.trim() || "Chưa đặt tên"} · ${SUBJECT_LABELS[subject]} · Lớp ${grade} · ${duration || "?"} phút · ${DIFFICULTY_LABELS[difficulty]}${objective.trim() ? " · Có mục tiêu riêng" : ""}`}
                  onEdit={() => goToStep(1)}
                />
              )}
              {maxUnlockedStep >= 2 &&
                (openStep === 2 ? (
                  <Card title="2. Phạm vi kiến thức SGK">
                    <div>
                      <p className="text-xs font-semibold">Sách giáo khoa</p>
                      <div className="mt-2 max-w-sm">
                        {matchingBooks.length > 1 ? (
                          <Select
                            value={bookCode}
                            placeholder="Chọn sách"
                            disabled={loading}
                            onChange={selectBook}
                            options={matchingBooks.map((book) => [book.id, book.name])}
                          />
                        ) : (
                          <div className="flex h-10 items-center rounded-lg border border-[#ddd5cc] bg-[#f4f1ec] px-3 text-sm text-[#4b453f]">
                            {currentBook ? currentBook.name : "Chưa có SGK phù hợp cho môn/lớp này."}
                          </div>
                        )}
                      </div>
                    </div>
                    <p className="mt-4 text-xs text-[#81776e]">
                      Chọn chương ở cột bên trái trước, sau đó mới chọn được từng bài học (nội dung) trong chương ở cột bên phải.
                    </p>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <div>
                        <p className="text-xs font-semibold">Chọn chương</p>
                        <div className="mt-2 max-h-80 overflow-y-auto rounded-lg border border-[#ddd5cc] bg-white p-2 text-sm">
                          {chapters.length ? chapters.map((chapter) => (
                            <label key={chapter.id} className="flex cursor-pointer items-center gap-2 border-b border-[#eee7df] py-2 last:border-0">
                              <input type="checkbox" disabled={loading} checked={selectedChapters.includes(chapter.id)} onChange={() => toggleChapter(chapter.id)} />
                              {chapter.name}
                            </label>
                          )) : <p className="p-2 text-xs text-[#81776e]">Chọn sách để xem các chương.</p>}
                        </div>
                      </div>
                      <div>
                        <p className="text-xs font-semibold">Chọn nội dung (bài học)</p>
                        <div className="mt-2 max-h-80 overflow-y-auto rounded-xl border border-dashed border-[#d8cfc5] bg-[#faf8f5] p-3">
                          {selectedChapters.length === 0 ? (
                            <p className="text-xs text-[#81776e]">
                              Chọn ít nhất một chương ở cột bên trái để xem danh sách bài học.
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
                      </div>
                    </div>
                    {!step2Valid && (
                      <p className="mt-3 text-xs text-[#bf5139]">
                        Chọn sách, ít nhất một chương và một bài học để tiếp tục.
                      </p>
                    )}
                    <div className="mt-6 flex justify-between">
                      <button
                        type="button"
                        onClick={() => goToStep(1)}
                        className="rounded-lg border border-[#ddd5cc] bg-white px-5 py-2.5 text-sm font-semibold text-[#2b2926]"
                      >
                        ← Quay lại
                      </button>
                      <button
                        type="button"
                        disabled={!step2Valid}
                        onClick={() => continueToStep(3)}
                        className="rounded-lg bg-[#d97757] px-5 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-[#d9d2cb]"
                      >
                        Tiếp tục →
                      </button>
                    </div>
                  </Card>
                ) : (
                  <StepSummary
                    title="2. Phạm vi kiến thức SGK"
                    summary={
                      currentBook
                        ? `${currentBook.name} · ${selectedLessons.length} bài / ${selectedChapters.length} chương`
                        : "Chưa chọn sách."
                    }
                    onEdit={() => goToStep(2)}
                  />
                ))}
              {maxUnlockedStep >= 3 &&
                (openStep === 3 ? (
                  <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
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
                      <div className="mt-6 flex justify-start">
                        <button
                          type="button"
                          onClick={() => goToStep(2)}
                          className="rounded-lg border border-[#ddd5cc] bg-white px-5 py-2.5 text-sm font-semibold text-[#2b2926]"
                        >
                          ← Quay lại
                        </button>
                      </div>
                    </Card>
                    <aside className="h-fit rounded-2xl border border-[#e4dcd3] bg-white p-5 lg:sticky lg:top-5">
                      <p className="text-xs font-bold uppercase tracking-wider text-[#8b8178]">
                        Đánh giá tính khả thi
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
                          : <>Ước tính {estimated.toFixed(1)} phút / thời lượng {duration} phút
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
                      <button
                        disabled={!canGenerate || loading}
                        onClick={() => void generate()}
                        className="mt-6 w-full rounded-lg bg-[#d97757] px-4 py-3 text-sm font-semibold text-white disabled:bg-[#d9d2cb]"
                      >
                        {loading ? "Đang khởi tạo..." : "Tạo bài tập bằng AI →"}
                      </button>
                      {loading && (
                        <p className="mt-2 text-center text-[11px] text-[#8b8178]">
                          Bạn sẽ được chuyển sang trình soạn bài tập để xem AI soạn từng câu.
                        </p>
                      )}
                    </aside>
                  </div>
                ) : (
                  <StepSummary
                    title="3. Cấu trúc câu hỏi và điểm"
                    summary={`${totalQuestions} câu · ${(totalScore / 100).toFixed(2)} điểm`}
                    onEdit={() => goToStep(3)}
                  />
                ))}
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
function StepSummary({
  title,
  summary,
  onEdit,
}: {
  title: string;
  summary: string;
  onEdit: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onEdit}
      className="flex w-full items-center justify-between gap-3 rounded-2xl border border-[#e2d9cf] bg-white px-5 py-4 text-left transition hover:border-[#d97757] sm:px-6"
    >
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-[#2b2926]">{title}</span>
        <span className="mt-1 block truncate text-xs text-[#70675f]">{summary}</span>
      </span>
      <span className="shrink-0 text-xs font-semibold text-[#d97757]">Sửa</span>
    </button>
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
