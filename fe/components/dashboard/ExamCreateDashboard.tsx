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

  const canSubmit = Boolean(subjectCode && grade && examType);

  function handleSubjectChange(value: string) {
    setSubjectCode(value);
    setGrade(null);
    setExamType(null);
  }

  function handleGradeChange(value: string) {
    setGrade(value);
    setExamType(null);
  }

  function handleSubmit() {
    if (!canSubmit || !selectedSubject || !selectedGrade || !selectedExamType) return;
    storeExamMatrixSession({
      subject: subjectCode!,
      subjectLabel: selectedSubject.label,
      grade: grade!,
      examType: examType!,
      examTypeLabel: selectedExamType.label,
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
