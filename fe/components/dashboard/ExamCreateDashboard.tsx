"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { generateExamMatrix, previewExamScope } from "@/lib/exam-matrix/api";
import { storeExamWorkspace } from "@/lib/exam-matrix/session";
import type { ExamScope, QuestionTypeKey } from "@/lib/exam-matrix/types";
import { DashboardIcon } from "../ui/DashboardIcon";
import { Dropdown, type DropdownOption } from "../ui/Dropdown";
import { Sidebar } from "../layout/Sidebar";
import { useAuth } from "@/lib/auth/AuthContext";

const SUBJECT_OPTIONS: DropdownOption[] = [
  { value: "PHYSICS", label: "Vật lí" },
  { value: "CHEMISTRY", label: "Hóa học" },
  { value: "MATH", label: "Toán" },
];
const GRADE_OPTIONS: DropdownOption[] = ["10", "11", "12"].map((value) => ({ value, label: `Lớp ${value}` }));
const EXAM_TYPE_OPTIONS: DropdownOption[] = [
  { value: "GIUA_HK1", label: "Giữa HK1" }, { value: "CUOI_HK1", label: "Cuối HK1" },
  { value: "GIUA_HK2", label: "Giữa HK2" }, { value: "CUOI_HK2", label: "Cuối HK2" },
];
const DIFFICULTIES = [
  { value: "EASY", label: "Dễ", description: "Trực tiếp, dữ kiện rõ ràng" },
  { value: "MEDIUM", label: "Vừa", description: "Cân bằng nhận biết và suy luận" },
  { value: "HARD", label: "Khó", description: "Nhiều bước xử lý và liên kết kiến thức" },
] as const;

type Difficulty = (typeof DIFFICULTIES)[number]["value"];
type Draft = { label: string; count: number; pointsCents: number | null; scoreCents: number; itemsPerQuestion: number | null; essayParts: number[][] };
type Drafts = Record<QuestionTypeKey, Draft>;

const STANDARD: Drafts = {
  multipleChoice: { label: "TNKQ nhiều lựa chọn", count: 12, pointsCents: 25, scoreCents: 300, itemsPerQuestion: null, essayParts: [] },
  trueFalse: { label: "Đúng – Sai", count: 2, pointsCents: 100, scoreCents: 200, itemsPerQuestion: 4, essayParts: [] },
  shortAnswer: { label: "Trả lời ngắn", count: 4, pointsCents: 50, scoreCents: 200, itemsPerQuestion: null, essayParts: [] },
  essay: { label: "Tự luận", count: 2, pointsCents: null, scoreCents: 300, itemsPerQuestion: null, essayParts: [[75, 75], [75, 75]] },
};
const GRADE_12: Drafts = {
  multipleChoice: { ...STANDARD.multipleChoice, count: 18, scoreCents: 450 },
  trueFalse: { ...STANDARD.trueFalse, count: 4, scoreCents: 400 },
  shortAnswer: { ...STANDARD.shortAnswer, count: 6, pointsCents: 25, scoreCents: 150 },
  essay: { ...STANDARD.essay, count: 0, scoreCents: 0, essayParts: [] },
};

export function ExamCreateDashboard() {
  const router = useRouter();
  const { authFetch } = useAuth();
  const [subject, setSubject] = useState<string | null>(null);
  const [grade, setGrade] = useState<string | null>(null);
  const [examType, setExamType] = useState<string | null>(null);
  const [difficulty, setDifficulty] = useState<Difficulty>("MEDIUM");
  const [drafts, setDrafts] = useState<Drafts>(() => structuredClone(STANDARD));
  const [ratios, setRatios] = useState({ recognition: 40, comprehension: 30, application: 30 });
  const [allowEssayForGrade12, setAllowEssayForGrade12] = useState(false);
  const [scope, setScope] = useState<ExamScope | null>(null);
  const [scopeConfirmed, setScopeConfirmed] = useState(false);
  const [scopeLoading, setScopeLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalCents = Object.values(drafts).reduce((sum, value) => sum + value.scoreCents, 0);
  const totalRatio = ratios.recognition + ratios.comprehension + ratios.application;
  const essayValid = drafts.essay.essayParts.length === drafts.essay.count
    && drafts.essay.essayParts.every((parts) => parts.length > 0 && parts.every((point) => point > 0));
  const warnings = useMemo(() => {
    const refs: Record<QuestionTypeKey, number> = { multipleChoice: 300, trueFalse: 200, shortAnswer: 200, essay: 300 };
    return (Object.entries(drafts) as [QuestionTypeKey, Draft][]).flatMap(([key, value]) => {
      const difference = value.scoreCents - refs[key];
      return difference === 0 ? [] : [`${value.label} ${difference > 0 ? "vượt" : "thiếu"} ${(Math.abs(difference) / 100).toFixed(2)} điểm`];
    });
  }, [drafts]);
  const configValid = totalCents === 1000 && totalRatio === 100 && essayValid;

  function setGradeValue(value: string) {
    setGrade(value); setExamType(null); setScope(null); setScopeConfirmed(false); setAllowEssayForGrade12(false);
    setDrafts(structuredClone(value === "12" ? GRADE_12 : STANDARD));
  }

  async function setExamTypeValue(value: string) {
    setExamType(value); setScope(null); setScopeConfirmed(false); setError(null);
    if (!subject || !grade) return;
    setScopeLoading(true);
    try { setScope(await previewExamScope(authFetch, subject, Number(grade), value)); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Không tải được phạm vi SGK."); }
    finally { setScopeLoading(false); }
  }

  function updateSimple(key: Exclude<QuestionTypeKey, "essay">, field: "count" | "pointsCents", value: number) {
    setDrafts((current) => {
      const item = { ...current[key], [field]: Math.max(0, value) };
      item.scoreCents = item.count * (item.pointsCents ?? 0);
      return { ...current, [key]: item };
    });
  }

  function resizeEssay(count: number) {
    setDrafts((current) => {
      const essayParts = current.essay.essayParts.map((parts) => [...parts]);
      while (essayParts.length < count) essayParts.push([50]);
      essayParts.length = count;
      return { ...current, essay: essayDraft(essayParts) };
    });
  }

  function updateEssayPart(question: number, part: number, cents: number) {
    setDrafts((current) => {
      const parts = current.essay.essayParts.map((values) => [...values]);
      parts[question][part] = Math.max(0, cents);
      return { ...current, essay: essayDraft(parts) };
    });
  }

  function addEssayPart(question: number) {
    setDrafts((current) => {
      const parts = current.essay.essayParts.map((values) => [...values]); parts[question].push(50);
      return { ...current, essay: essayDraft(parts) };
    });
  }

  function removeEssayPart(question: number, part: number) {
    setDrafts((current) => {
      const parts = current.essay.essayParts.map((values) => [...values]);
      if (parts[question].length > 1) parts[question].splice(part, 1);
      return { ...current, essay: essayDraft(parts) };
    });
  }

  function toggleEssay() {
    const next = !allowEssayForGrade12;
    if (!next && drafts.essay.scoreCents > 0 && !window.confirm("Tắt Tự luận sẽ xóa toàn bộ cấu hình điểm từng ý. Tiếp tục?")) return;
    setAllowEssayForGrade12(next);
    setDrafts((current) => ({ ...current, essay: next ? structuredClone(STANDARD.essay) : essayDraft([]) }));
  }

  async function submit() {
    const selectedSubject = SUBJECT_OPTIONS.find((item) => item.value === subject);
    const selectedType = EXAM_TYPE_OPTIONS.find((item) => item.value === examType);
    if (!subject || !grade || !examType || !selectedSubject || !selectedType || !scope || !scopeConfirmed || !configValid) return;
    setSubmitting(true); setError(null);
    try {
      const questionTypes = Object.fromEntries((Object.entries(drafts) as [QuestionTypeKey, Draft][]).map(([key, value]) => [key, {
        label: value.label, questionCount: value.count, itemsPerQuestion: value.itemsPerQuestion,
        pointsPerQuestionCents: value.pointsCents, scoreCents: value.scoreCents, essayPartPointsCents: value.essayParts,
      }])) as Record<QuestionTypeKey, { label: string; questionCount: number; itemsPerQuestion: number | null; pointsPerQuestionCents: number | null; scoreCents: number; essayPartPointsCents: number[][] }>;
      const workspace = await generateExamMatrix(authFetch, {
        subject, subjectLabel: selectedSubject.label, grade: Number(grade), examType, examTypeLabel: selectedType.label,
        scopeToken: scope.token, scopeConfirmed: true,
        configuration: { mode: "cv7991", difficulty, confirmedByTeacher: true, allowEssayForGrade12, questionTypes, assessmentRatios: ratios },
      });
      storeExamWorkspace(workspace);
      router.push("/exam-matrix");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không tạo được Ma trận và Bản đặc tả.");
    } finally { setSubmitting(false); }
  }

  const canSubmit = configValid && Boolean(scope && scopeConfirmed) && !scopeLoading && !submitting;
  return (
    <main className="h-screen w-full overflow-hidden bg-[#f5f1ec] text-[#171717]">
      <div className="flex h-full"><Sidebar /><section className="min-w-0 flex-1 overflow-y-auto px-5 py-8 sm:px-8 lg:py-12">
        <div className="mx-auto max-w-[980px]">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#eadfd7] bg-[#fff7f1] px-3 py-1 text-[11px] font-medium text-[#d97757]"><DashboardIcon name="aiBadge" />Tạo đề kiểm tra bằng AI</span>
          <h1 className="font-libertine mt-4 text-[48px] leading-none sm:text-[64px]">Tạo đề kiểm tra</h1>
          <p className="mt-4 text-[13px] text-[#6b6b6b]">Chốt cấu trúc đề và xác nhận phạm vi SGK trước khi lập Ma trận.</p>

          <Card title="1. Thông tin kiểm tra">
            <div className="flex flex-wrap items-center gap-2">
              <Dropdown placeholder="Môn học" value={subject} options={SUBJECT_OPTIONS} onChange={(value) => { setSubject(value); setGrade(null); setExamType(null); setScope(null); setScopeConfirmed(false); }} />
              <span>›</span><Dropdown placeholder="Lớp" value={grade} options={GRADE_OPTIONS} onChange={setGradeValue} disabled={!subject} />
              <span>›</span><Dropdown placeholder="Kiểu bài" value={examType} options={EXAM_TYPE_OPTIONS} onChange={(value) => void setExamTypeValue(value)} disabled={!grade} />
            </div>
            <p className="mt-5 text-[12px] font-semibold text-[#4f4943]">Mức độ chung của đề</p>
            <div className="mt-2 grid gap-2 sm:grid-cols-3">{DIFFICULTIES.map((item) => <button key={item.value} type="button" onClick={() => setDifficulty(item.value)} className={`rounded-lg border px-4 py-3 text-left ${difficulty === item.value ? "border-[#e8724a] bg-[#fff7f1]" : "border-[#e0dbd5] bg-[#faf9f7]"}`}><b className="block text-[13px]">{item.label}</b><span className="text-[11px] text-[#6b6b6b]">{item.description}</span></button>)}</div>
          </Card>

          <Card title="2. Cấu trúc đề và tỉ lệ">
            <p className="mb-4 text-[12px] text-[#85807a]">Preset tham khảo CV 7991: 3–2–2–3 điểm và 40–30–30%.</p>
            <div className="overflow-x-auto"><table className="w-full min-w-[620px] text-left text-[12px]"><thead><tr className="border-b"><th className="pb-2">Dạng câu hỏi</th><th>Số câu</th><th>Điểm/câu</th><th>Tổng điểm</th><th className="text-right">Tỉ lệ</th></tr></thead><tbody>
              {(Object.entries(drafts) as [QuestionTypeKey, Draft][]).map(([key, item]) => <tr key={key} className="border-b border-[#f0ece7]"><td className="py-3 font-medium">{item.label}</td><td><NumberBox value={item.count} step={1} disabled={key === "essay" && grade === "12" && !allowEssayForGrade12} onChange={(value) => key === "essay" ? resizeEssay(value) : updateSimple(key, "count", value)} /></td><td>{key === "essay" ? <span className="text-[#aaa39a]">Theo từng ý</span> : <NumberBox value={(item.pointsCents ?? 0) / 100} step={0.05} onChange={(value) => updateSimple(key, "pointsCents", Math.round(value * 100))} />}</td><td>{(item.scoreCents / 100).toFixed(2)}đ</td><td className="text-right">{(item.scoreCents / 10).toFixed(0)}%</td></tr>)}
            </tbody><tfoot><tr className="font-semibold"><td className="pt-3">Tổng</td><td /><td /><td className={totalCents === 1000 ? "pt-3 text-[#27845b]" : "pt-3 text-[#c65a3a]"}>{(totalCents / 100).toFixed(2)} / 10 điểm</td><td /></tr></tfoot></table></div>
            {grade === "12" && <label className="mt-4 flex gap-3 rounded-lg border bg-[#faf9f7] px-4 py-3 text-[12px]"><input type="checkbox" checked={allowEssayForGrade12} onChange={toggleEssay} /><span><b>Cho phép tự luận lớp 12</b> — tùy chọn nâng cao, mặc định tắt.</span></label>}
            {drafts.essay.count > 0 && <div className="mt-5 rounded-lg border border-[#e8e2d9] bg-[#faf9f7] p-4"><p className="text-[12px] font-semibold">Điểm từng ý Tự luận</p>{drafts.essay.essayParts.map((parts, q) => <div key={q} className="mt-3 flex flex-wrap items-center gap-2"><b className="w-14 text-[12px]">Câu {q + 1}</b>{parts.map((point, p) => <span key={p} className="flex items-center gap-1"><span className="text-[11px]">{String.fromCharCode(97 + p)})</span><NumberBox value={point / 100} step={0.05} onChange={(value) => updateEssayPart(q, p, Math.round(value * 100))} /><button type="button" title="Xóa ý" onClick={() => removeEssayPart(q, p)} className="text-[#b85c45]">×</button></span>)}<button type="button" onClick={() => addEssayPart(q)} className="rounded border px-2 py-1 text-[11px]">+ Thêm ý</button></div>)}</div>}
            <div className="mt-6 grid gap-3 sm:grid-cols-3">{(["recognition", "comprehension", "application"] as const).map((level) => <RatioBox key={level} label={level === "recognition" ? "Biết" : level === "comprehension" ? "Hiểu" : "Vận dụng"} value={ratios[level]} onChange={(value) => setRatios((current) => ({ ...current, [level]: value }))} />)}</div>
            {(!configValid || warnings.length > 0) && <Notice error={!configValid}>{totalCents !== 1000 && <p>Tổng điểm phải bằng 10,00.</p>}{totalRatio !== 100 && <p>Tổng tỉ lệ nhận thức đang là {totalRatio}%.</p>}{!essayValid && <p>Mỗi câu Tự luận phải có ít nhất một ý với điểm lớn hơn 0.</p>}{warnings.map((warning) => <p key={warning}>Sai lệch tham khảo: {warning}.</p>)}</Notice>}
          </Card>

          <Card title="3. Xác nhận phạm vi SGK">
            {scopeLoading && <p className="text-[13px] text-[#6b6b6b]">Đang xác định phạm vi...</p>}
            {!scopeLoading && !scope && <p className="text-[13px] text-[#6b6b6b]">Chọn đủ môn, lớp và loại kiểm tra để xem phạm vi.</p>}
            {scope && <><Notice><p><b>Phạm vi ước lượng theo thứ tự bài học.</b> Hệ thống không dùng AI để chọn phạm vi.</p></Notice><div className="mt-3 max-h-64 overflow-y-auto rounded-lg border bg-white p-3 text-[12px]">{groupScope(scope).map(([chapter, lessons]) => <div key={chapter} className="mb-3"><b>{chapter}</b><ul className="mt-1 list-disc pl-5 text-[#6b6b6b]">{lessons.map((lesson) => <li key={`${lesson.bookCode}:${lesson.lessonCode}`}>{lesson.lessonName}</li>)}</ul></div>)}</div><label className="mt-4 flex items-start gap-2 text-[12px]"><input type="checkbox" checked={scopeConfirmed} onChange={(event) => setScopeConfirmed(event.target.checked)} /><span>Tôi đã kiểm tra và xác nhận phạm vi SGK ước lượng này.</span></label></>}
          </Card>

          {error && <Notice error><p>{error}</p></Notice>}
          <div className="my-7 flex justify-center"><button type="button" disabled={!canSubmit} onClick={() => void submit()} className="h-12 rounded-xl bg-[#e8724a] px-8 text-[13px] font-medium text-white disabled:cursor-not-allowed disabled:bg-[#e8b9a7]">{submitting ? "Đang lập Ma trận..." : "Tạo Ma trận & Đặc tả"}</button></div>
        </div>
      </section></div>
    </main>
  );
}

function essayDraft(parts: number[][]): Draft { return { ...STANDARD.essay, count: parts.length, essayParts: parts, scoreCents: parts.flat().reduce((sum, value) => sum + value, 0) }; }
function groupScope(scope: ExamScope) {
  const grouped = new Map<string, ExamScope["lessons"]>();
  for (const lesson of scope.lessons) { const key = `${lesson.bookName} — ${lesson.chapterName}`; grouped.set(key, [...(grouped.get(key) ?? []), lesson]); }
  return [...grouped.entries()];
}
function Card({ title, children }: { title: string; children: React.ReactNode }) { return <section className="mt-6 rounded-[14px] border border-[#d8d1c9] bg-white px-5 py-6 sm:px-7"><h2 className="mb-5 text-[12px] font-semibold uppercase tracking-[0.08em] text-[#6b6b6b]">{title}</h2>{children}</section>; }
function NumberBox({ value, step, onChange, disabled = false }: { value: number; step: number; onChange: (value: number) => void; disabled?: boolean }) { return <input type="number" min="0" step={step} value={value} disabled={disabled} onChange={(event) => onChange(Math.max(0, Number(event.target.value) || 0))} className="h-9 w-20 rounded-lg border border-[#d8d1c9] px-2 outline-none focus:border-[#e8724a] disabled:bg-[#eeeae5]" />; }
function RatioBox({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) { return <label className="rounded-lg border bg-[#faf9f7] p-3 text-[12px]"><span>{label}</span><span className="mt-2 flex items-center gap-2"><NumberBox value={value} step={1} onChange={onChange} />%</span></label>; }
function Notice({ children, error = false }: { children: React.ReactNode; error?: boolean }) { return <div className={`mt-4 rounded-lg border px-4 py-3 text-[12px] leading-5 ${error ? "border-[#efc8ba] bg-[#fff7f3] text-[#a3482e]" : "border-[#ead8b2] bg-[#fffaf0] text-[#805f20]"}`}>{children}</div>; }
