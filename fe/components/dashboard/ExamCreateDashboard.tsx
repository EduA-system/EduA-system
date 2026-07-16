"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardIcon } from "../ui/DashboardIcon";
import { Dropdown, type DropdownOption } from "../ui/Dropdown";
import { Sidebar } from "../layout/Sidebar";
import { storeExamMatrixSession } from "./ExamMatrixDashboard";

const SUBJECT_OPTIONS: DropdownOption[] = [
  { value: "PHYSICS", label: "Vật lí" },
  { value: "CHEMISTRY", label: "Hóa học" },
  { value: "MATH", label: "Toán" },
];

const GRADE_OPTIONS: DropdownOption[] = [
  { value: "10", label: "Lớp 10" },
  { value: "11", label: "Lớp 11" },
  { value: "12", label: "Lớp 12" },
];

const EXAM_TYPE_OPTIONS: DropdownOption[] = [
  { value: "GIUA_HK1", label: "Giữa HK1" },
  { value: "CUOI_HK1", label: "Cuối HK1" },
  { value: "GIUA_HK2", label: "Giữa HK2" },
  { value: "CUOI_HK2", label: "Cuối HK2" },
];

const DIFFICULTY_OPTIONS = [
  { value: "EASY", label: "Dễ", description: "Trực tiếp, dữ kiện rõ ràng" },
  { value: "MEDIUM", label: "Vừa", description: "Cân bằng nhận biết và suy luận" },
  { value: "HARD", label: "Khó", description: "Nhiều bước xử lý và liên kết kiến thức" },
] as const;

type Difficulty = (typeof DIFFICULTY_OPTIONS)[number]["value"];
type QuestionTypeKey = "multipleChoice" | "trueFalse" | "shortAnswer" | "essay";
type QuestionConfig = Record<QuestionTypeKey, { label: string; count: number; pointsPerQuestion: number | null; score: number; reference: number }>;

const INITIAL_QUESTION_CONFIG: QuestionConfig = {
  multipleChoice: { label: "TNKQ nhiều lựa chọn", count: 12, pointsPerQuestion: 0.25, score: 3, reference: 3 },
  trueFalse: { label: "Đúng – Sai", count: 2, pointsPerQuestion: 1, score: 2, reference: 2 },
  shortAnswer: { label: "Trả lời ngắn", count: 4, pointsPerQuestion: 0.5, score: 2, reference: 2 },
  essay: { label: "Tự luận", count: 2, pointsPerQuestion: null, score: 3, reference: 3 },
};

const SCOPE_INFO: Record<string, { scope: string; detail: string }> = {
  GIUA_HK1: {
    scope: "Khoảng 40–50% nội dung học kỳ I",
    detail: "Đến khoảng tuần 8–9. Kiến thức từ đầu năm đến giữa học kỳ I.",
  },
  CUOI_HK1: {
    scope: "Toàn bộ học kỳ I",
    detail: "Tất cả nội dung từ tuần 1 đến hết học kỳ I. Bao gồm ôn tập tổng hợp.",
  },
  GIUA_HK2: {
    scope: "Khoảng 40–50% nội dung học kỳ II",
    detail: "Đến khoảng tuần 26–27. Kiến thức từ đầu học kỳ II đến giữa kỳ.",
  },
  CUOI_HK2: {
    scope: "Toàn bộ học kỳ II",
    detail: "Tất cả nội dung từ tuần 15/16 đến hết năm học. Bao gồm ôn tập tổng hợp cuối năm.",
  },
};

export function ExamCreateDashboard() {
  const router = useRouter();
  const [subjectCode, setSubjectCode] = useState<string | null>(null);
  const [grade, setGrade] = useState<string | null>(null);
  const [examType, setExamType] = useState<string | null>(null);
  const [difficulty, setDifficulty] = useState<Difficulty>("MEDIUM");
  const [questionConfig, setQuestionConfig] = useState<QuestionConfig>(INITIAL_QUESTION_CONFIG);
  const [ratios, setRatios] = useState({ recognition: 40, comprehension: 30, application: 30 });
  const [allowEssayForGrade12, setAllowEssayForGrade12] = useState(false);

  const selectedSubject = useMemo(
    () => SUBJECT_OPTIONS.find((o) => o.value === subjectCode) ?? null,
    [subjectCode],
  );

  const selectedGrade = useMemo(
    () => GRADE_OPTIONS.find((o) => o.value === grade) ?? null,
    [grade],
  );

  const selectedExamType = useMemo(
    () => EXAM_TYPE_OPTIONS.find((o) => o.value === examType) ?? null,
    [examType],
  );

  const scopeInfo = useMemo(
    () => (examType ? SCOPE_INFO[examType] ?? null : null),
    [examType],
  );

  const totalScore = useMemo(
    () => Object.values(questionConfig).reduce((sum, item) => sum + item.score, 0),
    [questionConfig],
  );
  const totalRatio = ratios.recognition + ratios.comprehension + ratios.application;
  const warnings = useMemo(
    () => Object.values(questionConfig).flatMap((item) => {
      const difference = item.score - item.reference;
      if (Math.abs(difference) < 0.001) return [];
      return [`${item.label} ${difference > 0 ? "vượt" : "thiếu"} ${Math.abs(difference).toFixed(1)} điểm`];
    }),
    [questionConfig],
  );
  const isConfigurationValid = Math.abs(totalScore - 10) < 0.001 && totalRatio === 100;
  const canSubmit = Boolean(subjectCode && grade && examType && isConfigurationValid);

  function handleSubjectChange(value: string) {
    setSubjectCode(value);
    setGrade(null);
    setExamType(null);
  }

  function handleGradeChange(value: string) {
    setGrade(value);
    setExamType(null);
    if (value === "12") {
      setAllowEssayForGrade12(false);
      setQuestionConfig((current) => ({ ...current, essay: { ...current.essay, count: 0, score: 0 } }));
    } else if (grade === "12") {
      setQuestionConfig(INITIAL_QUESTION_CONFIG);
    }
  }

  function updateQuestionConfig(key: QuestionTypeKey, field: "count" | "pointsPerQuestion" | "score", value: string) {
    const parsed = Math.max(0, Number(value) || 0);
    setQuestionConfig((current) => {
      const nextItem = { ...current[key], [field]: parsed };
      if (key !== "essay" && (field === "count" || field === "pointsPerQuestion")) {
        nextItem.score = nextItem.count * (nextItem.pointsPerQuestion ?? 0);
      }
      return { ...current, [key]: nextItem };
    });
  }

  function toggleGrade12Essay() {
    const next = !allowEssayForGrade12;
    setAllowEssayForGrade12(next);
    setQuestionConfig((current) => ({
      ...current,
      essay: { ...current.essay, count: next ? 2 : 0, score: next ? 3 : 0 },
    }));
  }

  function handleSubmit() {
    if (!canSubmit || !selectedSubject || !selectedGrade || !selectedExamType) return;
    storeExamMatrixSession({
      subject: subjectCode!,
      subjectLabel: selectedSubject.label,
      grade: grade!,
      examType: examType!,
      examTypeLabel: selectedExamType.label,
      configuration: {
        mode: "cv7991",
        difficulty,
        confirmedByTeacher: true,
        allowEssayForGrade12,
        complianceStatus: warnings.length === 0 ? "MATCHED" : "DEVIATED",
        warnings,
        questionTypes: Object.fromEntries(
          Object.entries(questionConfig).map(([key, item]) => [key, { questionCount: item.count, pointsPerQuestion: item.pointsPerQuestion, score: item.score }]),
        ),
        assessmentRatios: ratios,
      },
    });
    router.push("/exam-matrix");
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
                Tạo đề kiểm tra bằng AI
              </div>
              <h1 className="font-libertine mt-4 text-[48px] font-normal leading-none text-[#1f1f1f] sm:text-[64px]">
                Tạo đề kiểm tra
              </h1>
              <p className="mt-4 max-w-[440px] text-[13px] leading-[23px] text-[#6b6b6b]">
                Chọn môn học, lớp và kiểu bài kiểm tra để bắt đầu soạn đề với hỗ trợ của AI.
              </p>
            </div>

            <div className="mt-6 rounded-[14px] border border-[#d8d1c9] bg-white px-5 py-[22px] sm:px-7">
              <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start">
                <div>
                  <div className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[#6b6b6b]">
                    Nhập cấu trúc đề và tỉ lệ
                  </div>
                  <p className="mt-1 text-[12px] text-[#85807a]">Preset tham khảo CV 7991: 3–2–2–3 điểm và 40–30–30%.</p>
                </div>
                <span className="w-fit rounded-full bg-[#fff4ed] px-3 py-1 text-[11px] font-medium text-[#d97757]">Theo CV 7991</span>
              </div>

              <div className="mt-5">
                <p className="text-[12px] font-semibold text-[#4f4943]">Mức độ chung của đề</p>
                <div className="mt-2 grid gap-2 sm:grid-cols-3">
                  {DIFFICULTY_OPTIONS.map((option) => (
                    <button key={option.value} type="button" onClick={() => setDifficulty(option.value)} className={`rounded-lg border px-4 py-3 text-left transition ${difficulty === option.value ? "border-[#e8724a] bg-[#fff7f1]" : "border-[#e0dbd5] bg-[#faf9f7] hover:border-[#c9bfb2]"}`}>
                      <span className="block text-[13px] font-semibold text-[#1f1f1f]">{option.label}</span>
                      <span className="mt-1 block text-[11px] leading-[17px] text-[#6b6b6b]">{option.description}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-6 overflow-x-auto">
                <table className="w-full min-w-[600px] text-left text-[12px]">
                  <thead className="border-b border-[#e8e2d9] text-[#6b6b6b]"><tr><th className="pb-2 font-medium">Dạng câu hỏi</th><th className="pb-2 font-medium">Số câu</th><th className="pb-2 font-medium">Điểm / Câu</th><th className="pb-2 font-medium">Tổng điểm</th><th className="pb-2 text-right font-medium">Tỉ lệ</th></tr></thead>
                  <tbody>
                    {(Object.entries(questionConfig) as [QuestionTypeKey, QuestionConfig[QuestionTypeKey]][]).map(([key, item]) => {
                      const essayDisabled = grade === "12" && !allowEssayForGrade12 && key === "essay";
                      return <tr key={key} className="border-b border-[#f0ece7]">
                        <td className="py-3 font-medium text-[#2b2926]">{item.label}</td>
                        <td className="py-3"><NumberInput value={item.count} disabled={essayDisabled} step={1} onChange={(value) => updateQuestionConfig(key, "count", value)} /></td>
                        <td className="py-3">{key === "essay" ? <span className="pl-8 text-[#aaa39a]">—</span> : <NumberInput value={item.pointsPerQuestion ?? 0} disabled={essayDisabled} step={0.05} onChange={(value) => updateQuestionConfig(key, "pointsPerQuestion", value)} />}</td>
                        <td className="py-3">{key === "essay" ? <NumberInput value={item.score} disabled={essayDisabled} step={0.25} onChange={(value) => updateQuestionConfig(key, "score", value)} /> : <span className="inline-flex h-9 w-24 items-center rounded-lg bg-[#f3efe9] px-3 font-medium text-[#4f4943]">{item.score.toFixed(2)}</span>}</td>
                        <td className="py-3 text-right font-medium text-[#6b6b6b]">{(item.score * 10).toFixed(0)}%</td>
                      </tr>;
                    })}
                  </tbody>
                  <tfoot><tr className="font-semibold"><td className="pt-3">Tổng</td><td className="pt-3">{Object.values(questionConfig).reduce((sum, item) => sum + item.count, 0)} câu</td><td className="pt-3 text-[#aaa39a]">—</td><td className={`pt-3 ${Math.abs(totalScore - 10) < 0.001 ? "text-[#27845b]" : "text-[#c65a3a]"}`}>{totalScore.toFixed(2)} / 10 điểm</td><td className="pt-3 text-right">{(totalScore * 10).toFixed(0)}%</td></tr></tfoot>
                </table>
              </div>

              {grade === "12" && <label className="mt-4 flex cursor-pointer items-center gap-3 rounded-lg border border-[#e8e2d9] bg-[#faf9f7] px-4 py-3 text-[12px]"><input type="checkbox" checked={allowEssayForGrade12} onChange={toggleGrade12Essay} className="size-4 accent-[#e8724a]" /><span><span className="font-semibold text-[#2b2926]">Cho phép tự luận lớp 12</span><span className="ml-2 text-[#6b6b6b]">Tùy chọn nâng cao, mặc định tắt.</span></span></label>}

              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <RatioInput label="Biết" value={ratios.recognition} onChange={(value) => setRatios((current) => ({ ...current, recognition: value }))} />
                <RatioInput label="Hiểu" value={ratios.comprehension} onChange={(value) => setRatios((current) => ({ ...current, comprehension: value }))} />
                <RatioInput label="Vận dụng" value={ratios.application} onChange={(value) => setRatios((current) => ({ ...current, application: value }))} />
              </div>

              {(!isConfigurationValid || warnings.length > 0) && <div className={`mt-4 rounded-lg border px-4 py-3 text-[12px] leading-5 ${isConfigurationValid ? "border-[#ead8b2] bg-[#fffaf0] text-[#805f20]" : "border-[#efc8ba] bg-[#fff7f3] text-[#a3482e]"}`}>
                {Math.abs(totalScore - 10) >= 0.001 && <p>Tổng điểm phải bằng 10 (hiện tại {totalScore.toFixed(2)} điểm).</p>}
                {totalRatio !== 100 && <p>Tổng tỉ lệ nhận thức phải bằng 100% (hiện tại {totalRatio}%).</p>}
                {warnings.map((warning) => <p key={warning}>Sai lệch tham khảo: {warning}.</p>)}
              </div>}
            </div>

            <div className="mt-9 rounded-[14px] border border-[#d8d1c9] bg-white px-7 py-[22px]">
              <div className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-[#6b6b6b]">
                <DashboardIcon name="formTitle" />
                Chọn thông tin kiểm tra
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Dropdown
                  placeholder="Môn học"
                  value={subjectCode}
                  options={SUBJECT_OPTIONS}
                  onChange={handleSubjectChange}
                />
                <span className="text-[#d8d1c9]">›</span>
                <Dropdown
                  placeholder="Lớp"
                  value={grade}
                  options={GRADE_OPTIONS}
                  onChange={handleGradeChange}
                  disabled={!subjectCode}
                />
                <span className="text-[#d8d1c9]">›</span>
                <Dropdown
                  placeholder="Kiểu bài"
                  value={examType}
                  options={EXAM_TYPE_OPTIONS}
                  onChange={setExamType}
                  disabled={!grade}
                />
              </div>

              {scopeInfo && (
                <div className="mt-5 rounded-lg border border-[#e0dbd5] bg-[#faf9f7] px-5 py-4">
                  <div className="flex items-center gap-2 text-[12px] font-semibold text-[#6b6b6b]">
                    <svg
                      className="size-4 text-[#d97757]"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    Phạm vi kiến thức — {selectedExamType?.label}
                  </div>
                  <p className="mt-2 text-[13px] font-medium text-[#1f1f1f]">
                    {scopeInfo.scope}
                  </p>
                  <p className="mt-1 text-[12px] leading-[20px] text-[#6b6b6b]">
                    {scopeInfo.detail}
                  </p>
                  {selectedSubject && selectedGrade && (
                    <p className="mt-2 text-[12px] leading-[20px] text-[#6b6b6b]">
                      Môn <span className="font-medium text-[#1f1f1f]">{selectedSubject.label}</span> — Lớp{" "}
                      <span className="font-medium text-[#1f1f1f]">{selectedGrade.label}</span>
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <button
                onClick={handleSubmit}
                disabled={!canSubmit}
                className={`flex h-[46px] w-[168px] items-center justify-center gap-2 rounded-[12px] text-[13px] font-medium text-white shadow-[0_4px_8px_rgba(232,114,74,0.28)] transition ${
                  canSubmit ? "bg-[#e8724a] hover:bg-[#d96a42]" : "cursor-not-allowed bg-[#e8b9a7]"
                }`}
              >
                <DashboardIcon name="generate" />
                Tiếp tục
              </button>
              <span className="text-center text-[12px] text-[#6b6b6b]">
                {canSubmit
                  ? `${selectedSubject?.label} — ${selectedGrade?.label} — ${selectedExamType?.label}`
                  : "Chọn đủ môn, lớp và kiểu bài để tiếp tục"}
              </span>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function NumberInput({ value, onChange, step, disabled = false }: { value: number; onChange: (value: string) => void; step: number; disabled?: boolean }) {
  return <input type="number" min="0" step={step} value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)} className="h-9 w-24 rounded-lg border border-[#d8d1c9] bg-white px-3 text-[12px] outline-none transition focus:border-[#e8724a] disabled:cursor-not-allowed disabled:bg-[#eeeae5] disabled:text-[#aaa39a]" />;
}

function RatioInput({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return <label className="rounded-lg border border-[#e0dbd5] bg-[#faf9f7] px-4 py-3"><span className="block text-[12px] font-medium text-[#4f4943]">{label}</span><span className="mt-2 flex items-center gap-2"><input type="number" min="0" max="100" value={value} onChange={(event) => onChange(Math.max(0, Number(event.target.value) || 0))} className="h-9 min-w-0 flex-1 rounded-lg border border-[#d8d1c9] bg-white px-3 outline-none focus:border-[#e8724a]" /><span className="text-[#6b6b6b]">%</span></span></label>;
}
