import { LEVELS, QUESTION_TYPES, type AssessmentLevel, type ExamMatrixWorkspace, type QuestionTypeKey } from "./types";

export interface WorkspaceValidation {
  valid: boolean;
  errors: string[];
  unassignedItemIds: string[];
}

export function validateWorkspace(workspace: ExamMatrixWorkspace): WorkspaceValidation {
  const errors: string[] = [];
  const knownItems = new Map(workspace.assessmentItems.map((item) => [item.id, item]));
  const occurrences = new Map<string, number>();
  const scoreByType = Object.fromEntries(QUESTION_TYPES.map((type) => [type, 0])) as Record<QuestionTypeKey, number>;
  const scoreByLevel = Object.fromEntries(LEVELS.map((level) => [level, 0])) as Record<AssessmentLevel, number>;
  const allowedSources = new Set(workspace.scope.lessons.map((lesson) => `${lesson.bookCode}:${lesson.chapterCode}:${lesson.lessonCode}`));

  for (const chapter of workspace.chapters) {
    for (const unit of chapter.knowledgeUnits) {
      if (!allowedSources.has(`${chapter.sourceBookCode}:${chapter.sourceChapterCode}:${unit.sourceLessonCode}`)) {
        errors.push(`Đơn vị “${unit.name}” nằm ngoài phạm vi SGK đã xác nhận.`);
      }
      for (const type of QUESTION_TYPES) {
        for (const level of LEVELS) {
          const ids = unit.allocation[type][level];
          if (ids.length > 0 && unit.learningOutcomes[level].filter((value) => value.trim()).length === 0) {
            errors.push(`“${unit.name}” có câu ở mức ${levelLabel(level)} nhưng chưa có Yêu cầu cần đạt.`);
          }
          for (const id of ids) {
            const item = knownItems.get(id);
            if (!item) {
              errors.push(`Phân bổ chứa mã câu/ý không hợp lệ: ${id}.`);
              continue;
            }
            if (item.questionType !== type) errors.push(`${itemLabel(item)} được đặt sai dạng câu hỏi.`);
            occurrences.set(id, (occurrences.get(id) ?? 0) + 1);
            scoreByType[type] += item.scoreCents;
            scoreByLevel[level] += item.scoreCents;
          }
        }
      }
    }
  }

  const unassignedItemIds = workspace.assessmentItems.filter((item) => !occurrences.has(item.id)).map((item) => item.id);
  if (unassignedItemIds.length > 0) errors.push(`Còn ${unassignedItemIds.length} câu/ý chưa được phân bổ.`);
  const duplicated = [...occurrences.entries()].filter(([, count]) => count > 1);
  if (duplicated.length > 0) errors.push(`Có ${duplicated.length} câu/ý đang được phân bổ nhiều hơn một lần.`);

  for (const type of QUESTION_TYPES) {
    const expected = workspace.configuration.questionTypes[type].scoreCents;
    if (scoreByType[type] !== expected) {
      errors.push(`${workspace.configuration.questionTypes[type].label} đang có ${(scoreByType[type] / 100).toFixed(2)}/${(expected / 100).toFixed(2)} điểm.`);
    }
  }
  for (const level of LEVELS) {
    const expected = workspace.configuration.assessmentRatios[level] * 10;
    if (scoreByLevel[level] !== expected) {
      errors.push(`Tỉ lệ ${levelLabel(level)} hiện là ${(scoreByLevel[level] / 10).toFixed(0)}%, khác cấu hình ${workspace.configuration.assessmentRatios[level]}%.`);
    }
  }
  return { valid: errors.length === 0, errors: [...new Set(errors)], unassignedItemIds };
}

export function itemLabel(item: { questionCode: string; itemCode: string }): string {
  return item.itemCode ? `${item.questionCode}${item.itemCode}` : item.questionCode;
}

function levelLabel(level: AssessmentLevel): string {
  return level === "recognition" ? "Biết" : level === "comprehension" ? "Hiểu" : "Vận dụng";
}
