"use client";

const GRADES = [10, 11, 12] as const;

type GradeSelectProps = {
  value: number | null;
  onChange: (value: number | null) => void;
  /** Cho phép chọn "Tất cả khối" (value = null) — dùng cho filter, không dùng khi bắt buộc chọn khối để thao tác. */
  includeAll?: boolean;
  className?: string;
};

/** Single-select khối 10/11/12 (BR-51) — dùng ở /weekly-schedule (Mod chọn khối để quản lý) và /lesson-plan-approval (filter). */
export function GradeSelect({ value, onChange, includeAll = false, className = "" }: GradeSelectProps) {
  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${className}`} aria-label="Chọn khối">
      {includeAll ? (
        <button
          type="button"
          onClick={() => onChange(null)}
          className={`rounded-lg border px-3 py-1.5 text-sm font-medium ${
            value === null ? "bg-[#1f1f1f] text-white" : "bg-white text-[#4f4943] hover:bg-[#f5f1ec]"
          }`}
        >
          Tất cả khối
        </button>
      ) : null}
      {GRADES.map((g) => (
        <button
          key={g}
          type="button"
          onClick={() => onChange(g)}
          className={`rounded-lg border px-3 py-1.5 text-sm font-medium ${
            value === g ? "bg-[#1f1f1f] text-white" : "bg-white text-[#4f4943] hover:bg-[#f5f1ec]"
          }`}
        >
          Khối {g}
        </button>
      ))}
    </div>
  );
}
