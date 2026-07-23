"use client";

import { LEVEL_LABELS, LEVELS, QUESTION_TYPES, emptyAllocation, type AssessmentItem, type AssessmentLevel, type ExamMatrixWorkspace, type KnowledgeUnit, type QuestionTypeKey } from "@/lib/exam-matrix/types";
import { itemLabel } from "@/lib/exam-matrix/validation";

const TYPE_LABELS: Record<QuestionTypeKey, string> = {
  multipleChoice: "Nhiều lựa chọn",
  trueFalse: "Đúng–Sai (ý)",
  shortAnswer: "Trả lời ngắn",
  essay: "Tự luận (ý)",
};

interface Props {
  workspace: ExamMatrixWorkspace;
  onChange: (workspace: ExamMatrixWorkspace) => void;
}

export function ExamMatrixTables({ workspace, onChange }: Props) {
  const itemMap = new Map(workspace.assessmentItems.map((item) => [item.id, item]));

  function mutate(mutator: (next: ExamMatrixWorkspace) => void) {
    const next = structuredClone(workspace);
    mutator(next);
    onChange(next);
  }

  function updateChapter(chapterId: string, name: string) {
    mutate((next) => { const chapter = next.chapters.find((value) => value.id === chapterId); if (chapter) chapter.name = name; });
  }

  function updateUnit(chapterId: string, unitId: string, field: "name" | "content", value: string) {
    mutate((next) => { const unit = findUnit(next, chapterId, unitId); if (unit) unit[field] = value; });
  }

  function updateOutcomes(chapterId: string, unitId: string, level: AssessmentLevel, value: string) {
    mutate((next) => { const unit = findUnit(next, chapterId, unitId); if (unit) unit.learningOutcomes[level] = value.split("\n").map((line) => line.trim()).filter(Boolean); });
  }

  function setAllocationCount(chapterId: string, unitId: string, type: QuestionTypeKey, level: AssessmentLevel, requestedCount: number) {
    mutate((next) => {
      const unit = findUnit(next, chapterId, unitId);
      if (!unit) return;
      const assigned = unit.allocation[type][level];
      const count = Math.max(0, Math.floor(requestedCount));

      if (count < assigned.length) {
        assigned.splice(count);
        return;
      }

      const allocatedIds = new Set(next.chapters.flatMap((chapter) => chapter.knowledgeUnits.flatMap((knowledgeUnit) =>
        QUESTION_TYPES.flatMap((questionType) => LEVELS.flatMap((assessmentLevel) => knowledgeUnit.allocation[questionType][assessmentLevel])),
      )));
      const needed = count - assigned.length;
      const available = next.assessmentItems.filter((item) => item.questionType === type && !allocatedIds.has(item.id)).slice(0, needed);
      for (const item of available) {
        assigned.push(item.id);
        item.level = level;
      }
    });
  }

  function deleteUnit(chapterId: string, unitId: string) {
    const unit = findUnit(workspace, chapterId, unitId);
    if (!unit || !window.confirm(`Xóa đơn vị “${unit.name}”? Các câu/ý của dòng này sẽ chuyển về chưa phân bổ.`)) return;
    mutate((next) => { const chapter = next.chapters.find((value) => value.id === chapterId); if (chapter) chapter.knowledgeUnits = chapter.knowledgeUnits.filter((value) => value.id !== unitId); });
  }

  function deleteChapter(chapterId: string) {
    const chapter = workspace.chapters.find((value) => value.id === chapterId);
    if (!chapter || !window.confirm(`Xóa chương “${chapter.name}”? Các câu/ý sẽ chuyển về chưa phân bổ.`)) return;
    mutate((next) => { next.chapters = next.chapters.filter((value) => value.id !== chapterId); });
  }

  function addChapter(sourceKey: string) {
    if (!sourceKey) return;
    const [bookCode, chapterCode] = sourceKey.split(":");
    const source = workspace.scope.lessons.find((lesson) => lesson.bookCode === bookCode && lesson.chapterCode === chapterCode);
    if (!source) return;
    mutate((next) => next.chapters.push({
      id: `${bookCode}:${chapterCode}`, sourceBookCode: bookCode, sourceChapterCode: chapterCode, name: source.chapterName,
      allocationTrace: { weightSource: "TEACHER_ADDED", rawWeight: 0, normalizedWeight: 0, fallbackUsed: true },
      knowledgeUnits: [{ id: `${bookCode}:${chapterCode}:${source.lessonCode}`, sourceLessonCode: source.lessonCode,
        name: source.lessonName, content: "", learningOutcomes: { recognition: [], comprehension: [], application: [] }, allocation: emptyAllocation() }],
    }));
  }

  function addUnit(chapterId: string, lessonCode: string) {
    if (!lessonCode) return;
    const chapter = workspace.chapters.find((value) => value.id === chapterId);
    const source = workspace.scope.lessons.find((lesson) => lesson.bookCode === chapter?.sourceBookCode && lesson.chapterCode === chapter?.sourceChapterCode && lesson.lessonCode === lessonCode);
    if (!source) return;
    mutate((next) => { const target = next.chapters.find((value) => value.id === chapterId); target?.knowledgeUnits.push({ id: `${chapterId}:${lessonCode}`, sourceLessonCode: lessonCode, name: source.lessonName, content: "", learningOutcomes: { recognition: [], comprehension: [], application: [] }, allocation: emptyAllocation() }); });
  }

  const usedChapters = new Set(workspace.chapters.map((chapter) => `${chapter.sourceBookCode}:${chapter.sourceChapterCode}`));
  const availableChapters = uniqueBy(workspace.scope.lessons.filter((lesson) => !usedChapters.has(`${lesson.bookCode}:${lesson.chapterCode}`)), (lesson) => `${lesson.bookCode}:${lesson.chapterCode}`);

  return <div className="space-y-12">
    <section><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-semibold">1. MA TRẬN ĐỀ KIỂM TRA ĐỊNH KÌ</h2><select defaultValue="" onChange={(event) => { addChapter(event.target.value); event.target.value = ""; }} className="rounded border px-3 py-2 text-xs"><option value="">+ Thêm chương trong phạm vi</option>{availableChapters.map((lesson) => <option key={`${lesson.bookCode}:${lesson.chapterCode}`} value={`${lesson.bookCode}:${lesson.chapterCode}`}>{lesson.chapterName}</option>)}</select></div>
      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-[#e8e2d9] bg-[#faf9f7] px-4 py-3 text-xs text-[#625c55]"><span><b>Nhập số câu/ý</b> trực tiếp vào từng ô như bảng Word.</span><span className="text-[#8a847d]">Để trống nghĩa là 0; chỉ nhận số nguyên.</span></div>
      <div className="overflow-x-auto"><table className="exam-structured-table"><TableHead />
        <tbody>{workspace.chapters.flatMap((chapter, chapterIndex) => chapter.knowledgeUnits.map((unit, unitIndex) => <tr key={unit.id}>
          {unitIndex === 0 && <td rowSpan={Math.max(1, chapter.knowledgeUnits.length)} className="locked-cell align-top">{chapterIndex + 1}</td>}
          {unitIndex === 0 && <td rowSpan={Math.max(1, chapter.knowledgeUnits.length)} className="editable-cell min-w-48 align-top"><input value={chapter.name} onChange={(event) => updateChapter(chapter.id, event.target.value)} /><button type="button" onClick={() => deleteChapter(chapter.id)} className="danger-link">Xóa chương</button></td>}
          <td className="editable-cell min-w-56"><input value={unit.name} onChange={(event) => updateUnit(chapter.id, unit.id, "name", event.target.value)} /><textarea value={unit.content} placeholder="Nội dung chuyên môn" onChange={(event) => updateUnit(chapter.id, unit.id, "content", event.target.value)} /><button type="button" onClick={() => deleteUnit(chapter.id, unit.id)} className="danger-link">Xóa đơn vị</button></td>
          {QUESTION_TYPES.flatMap((type) => LEVELS.map((level) => <AllocationCell key={`${type}:${level}`} count={unit.allocation[type][level].length} availableCount={workspace.assessmentItems.filter((item) => item.questionType === type && !isItemAllocated(workspace, item.id)).length} label={`${unit.name} · ${TYPE_LABELS[type]} · ${LEVEL_LABELS[level]}`} onChange={(count) => setAllocationCount(chapter.id, unit.id, type, level, count)} />))}
          <CalculatedCells unit={unit} itemMap={itemMap} />
        </tr>))}
        {workspace.chapters.map((chapter) => { const used = new Set(chapter.knowledgeUnits.map((unit) => unit.sourceLessonCode)); const lessons = workspace.scope.lessons.filter((lesson) => lesson.bookCode === chapter.sourceBookCode && lesson.chapterCode === chapter.sourceChapterCode && !used.has(lesson.lessonCode)); return <tr key={`${chapter.id}:add`}><td colSpan={18} className="bg-[#faf9f7] p-2 text-left"><select defaultValue="" onChange={(event) => { addUnit(chapter.id, event.target.value); event.target.value = ""; }} className="rounded border px-2 py-1 text-xs"><option value="">+ Thêm đơn vị từ {chapter.name}</option>{lessons.map((lesson) => <option key={lesson.lessonCode} value={lesson.lessonCode}>{lesson.lessonName}</option>)}</select></td></tr>; })}
        <SummaryRows workspace={workspace} itemMap={itemMap} leading={3} /></tbody></table></div>
    </section>

    <section><h2 className="mb-4 text-xl font-semibold">2. BẢN ĐẶC TẢ ĐỀ KIỂM TRA ĐỊNH KÌ</h2><div className="overflow-x-auto"><table className="exam-structured-table"><TableHead specification /><tbody>
      {workspace.chapters.flatMap((chapter, chapterIndex) => chapter.knowledgeUnits.map((unit, unitIndex) => <tr key={`spec:${unit.id}`}>
        {unitIndex === 0 && <td rowSpan={Math.max(1, chapter.knowledgeUnits.length)} className="locked-cell align-top">{chapterIndex + 1}</td>}
        {unitIndex === 0 && <td rowSpan={Math.max(1, chapter.knowledgeUnits.length)} className="locked-cell min-w-48 align-top" title="Dùng chung dữ liệu với Ma trận">{chapter.name}</td>}
        <td className="locked-cell min-w-52" title="Dùng chung dữ liệu với Ma trận"><b>{unit.name}</b><p>{unit.content}</p></td>
        <td className="editable-cell min-w-72">{LEVELS.map((level) => <label key={level} className="mb-2 block"><span className="text-[10px] font-semibold uppercase text-[#6b6b6b]">{LEVEL_LABELS[level]}</span><textarea value={unit.learningOutcomes[level].join("\n")} onChange={(event) => updateOutcomes(chapter.id, unit.id, level, event.target.value)} placeholder={`Mỗi yêu cầu ${LEVEL_LABELS[level]} một dòng`} /></label>)}</td>
        {QUESTION_TYPES.flatMap((type) => LEVELS.map((level) => <td key={`${type}:${level}`} className="locked-cell" title="Phân bổ lấy từ Ma trận">{unit.allocation[type][level].map((id) => itemMap.get(id)).filter(Boolean).map((item) => itemLabel(item!)).join(", ") || "—"}</td>))}
      </tr>))}
      <SummaryRows workspace={workspace} itemMap={itemMap} leading={4} specification /></tbody></table></div>
    </section>
  </div>;
}

function TableHead({ specification = false }: { specification?: boolean }) {
  return <thead><tr><th rowSpan={3}>TT</th><th rowSpan={3}>Chủ đề/Chương</th><th rowSpan={3}>Nội dung/đơn vị kiến thức</th>{specification && <th rowSpan={3}>Yêu cầu cần đạt</th>}<th colSpan={12}>{specification ? "Số câu hỏi ở các mức độ đánh giá" : "Mức độ đánh giá"}</th>{!specification && <><th rowSpan={3}>Tổng item</th><th rowSpan={3}>Điểm</th><th rowSpan={3}>Tỉ lệ</th></>}</tr><tr>{QUESTION_TYPES.map((type) => <th key={type} colSpan={3}>{TYPE_LABELS[type]}</th>)}</tr><tr>{QUESTION_TYPES.flatMap((type) => LEVELS.map((level) => <th key={`${type}:${level}`}>{LEVEL_LABELS[level]}</th>))}</tr></thead>;
}

function AllocationCell({ count, availableCount, label, onChange }: { count: number; availableCount: number; label: string; onChange: (count: number) => void }) {
  const maximum = count + availableCount;
  return <td className="allocation-cell"><input type="text" inputMode="numeric" pattern="[0-9]*" value={count || ""} placeholder="–" aria-label={`${label}, hiện có ${count} câu hoặc ý`} title={`${label} · nhập từ 0 đến ${maximum}`} className={count > 0 ? "allocation-input has-value" : "allocation-input"} onFocus={(event) => event.currentTarget.select()} onChange={(event) => { const value = event.target.value; if (!/^\d*$/.test(value)) return; onChange(Math.min(maximum, value === "" ? 0 : Number(value))); }} /> </td>;
}

function CalculatedCells({ unit, itemMap }: { unit: KnowledgeUnit; itemMap: Map<string, AssessmentItem> }) {
  const ids = QUESTION_TYPES.flatMap((type) => LEVELS.flatMap((level) => unit.allocation[type][level]));
  const score = ids.reduce((sum, id) => sum + (itemMap.get(id)?.scoreCents ?? 0), 0);
  return <><td className="calculated-cell">{ids.length}</td><td className="calculated-cell">{(score / 100).toFixed(2)}</td><td className="calculated-cell">{(score / 10).toFixed(0)}%</td></>;
}

function SummaryRows({ workspace, itemMap, leading, specification = false }: { workspace: ExamMatrixWorkspace; itemMap: Map<string, AssessmentItem>; leading: number; specification?: boolean }) {
  const cells = QUESTION_TYPES.flatMap((type) => LEVELS.map((level) => {
    const ids = workspace.chapters.flatMap((chapter) => chapter.knowledgeUnits.flatMap((unit) => unit.allocation[type][level]));
    return { count: ids.length, score: ids.reduce((sum, id) => sum + (itemMap.get(id)?.scoreCents ?? 0), 0) };
  }));
  return <><tr className="summary-row"><th colSpan={leading}>Tổng số câu/ý</th>{cells.map((cell, index) => <td key={index}>{cell.count || "—"}</td>)}{!specification && <><td>{cells.reduce((sum, cell) => sum + cell.count, 0)}</td><td /><td /></>}</tr><tr className="summary-row"><th colSpan={leading}>Tổng số điểm</th>{cells.map((cell, index) => <td key={index}>{cell.score ? (cell.score / 100).toFixed(2) : "—"}</td>)}{!specification && <><td /><td>10.00</td><td>100%</td></>}</tr></>;
}

function findUnit(workspace: ExamMatrixWorkspace, chapterId: string, unitId: string) { return workspace.chapters.find((chapter) => chapter.id === chapterId)?.knowledgeUnits.find((unit) => unit.id === unitId); }
function isItemAllocated(workspace: ExamMatrixWorkspace, itemId: string) { return workspace.chapters.some((chapter) => chapter.knowledgeUnits.some((unit) => QUESTION_TYPES.some((type) => LEVELS.some((level) => unit.allocation[type][level].includes(itemId))))); }
function uniqueBy<T>(items: T[], key: (item: T) => string) { const seen = new Set<string>(); return items.filter((item) => { const value = key(item); if (seen.has(value)) return false; seen.add(value); return true; }); }
